import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { hydrateBarangaysFromGeoJSON } from "../src/data/palecoDirectory.js";
import { parsePalecoAdvisory } from "../src/lib/advisoryParser.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Optional, falls back to local regex parser

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const rawGeoJson = JSON.parse(fs.readFileSync("./src/data/ppc_barangays.json", "utf8"));
const BARANGAYS = hydrateBarangaysFromGeoJSON(rawGeoJson);

function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Use Gemini 2.5 Flash Structured Outputs for high-accuracy Puerto Princesa barangay extraction
async function parseWithGemini(title, bodyText) {
  const barangayCatalog = BARANGAYS.map((b) => ({
    id: b.id,
    name: b.name,
    landmarks: b.landmarks,
  }));

  const prompt = `You are a power outage parser for PALECO in Puerto Princesa City, Palawan, Philippines.
Analyze this PALECO post and determine if it is an active power interruption, scheduled maintenance, or power restoration notice affecting Puerto Princesa City (ignore advisories that ONLY affect southern/northern municipalities like Brooke's Point, Roxas, Narra, Taytay, El Nido, etc. unless Puerto Princesa barangays are explicitly listed).

Available Puerto Princesa Barangays (use ONLY exact IDs from this list):
${JSON.stringify(barangayCatalog)}

Post Title: ${title}
Post Content: ${bodyText}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              is_ppc_advisory: { type: "BOOLEAN" },
              status: {
                type: "STRING",
                enum: ["UNSCHEDULED", "SCHEDULED", "NORMAL"],
              },
              title: { type: "STRING" },
              reason: { type: "STRING" },
              startTime: { type: "STRING" },
              estimatedEnd: { type: "STRING" },
              matchedBarangayIds: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
            },
            required: [
              "is_ppc_advisory",
              "status",
              "title",
              "reason",
              "startTime",
              "estimatedEnd",
              "matchedBarangayIds",
            ],
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(rawJson);
}

async function fetchLatestPalecoPosts() {
  const endpoints = [
    "https://paleco.net/wp-json/wp/v2/posts?per_page=6&_fields=id,date,link,title,content",
    "https://www.paleco.net/wp-json/wp/v2/posts?per_page=6&_fields=id,date,link,title,content",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "PPC-Kuryente-Watch-Bot/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn(`Fetch attempt failed for ${url}:`, err.message);
    }
  }
  throw new Error("Could not reach paleco.net WordPress REST API");
}

async function run() {
  console.log("Fetching latest advisories from paleco.net...");
  const posts = await fetchLatestPalecoPosts();

  // Only examine posts from the last 48 hours
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recentPosts = posts.filter((p) => new Date(p.date).getTime() >= cutoff);

  console.log(`Found ${recentPosts.length} recent post(s) in the last 48 hours.`);

  for (const post of recentPosts) {
    const sourceUrl = post.link;
    const title = stripHtml(post.title?.rendered);
    const bodyText = stripHtml(post.content?.rendered);

    // 1. Skip if already ingested
    const { data: existing } = await supabase
      .from("ingested_advisories")
      .select("source_url")
      .eq("source_url", sourceUrl)
      .maybeSingle();

    if (existing) {
      console.log(`Skipping already processed: ${title}`);
      continue;
    }

    // 2. Filter for power interruption / restoration keywords
    const combined = `${title} ${bodyText}`.toLowerCase();
    const isPowerNotice =
      combined.includes("interruption") ||
      combined.includes("advisory") ||
      combined.includes("scheduled") ||
      combined.includes("unscheduled") ||
      combined.includes("restored") ||
      combined.includes("brownout") ||
      combined.includes("feeder") ||
      combined.includes("recloser");

    if (!isPowerNotice) {
      console.log(`Ignoring non-outage post: ${title}`);
      await supabase.from("ingested_advisories").insert({
        source_url: sourceUrl,
        title,
        status: "IGNORED",
        affected_barangays: [],
      });
      continue;
    }

    // 3. Parse with Gemini 2.5 Flash (or fallback to regex parser)
    let parsed;
    if (GEMINI_API_KEY) {
      try {
        parsed = await parseWithGemini(title, bodyText);
      } catch (err) {
        console.warn("Gemini parsing failed, using regex fallback:", err.message);
      }
    }

    if (!parsed) {
      const local = parsePalecoAdvisory(`${title}\n${bodyText}`, BARANGAYS);
      parsed = {
        is_ppc_advisory: local.matchedBarangayIds.length > 0,
        status: local.status,
        title: local.title,
        reason: local.reason,
        startTime: local.startTime,
        estimatedEnd: local.estimatedEnd,
        matchedBarangayIds: local.matchedBarangayIds,
      };
    }

    // Validate IDs against real 66 barangays
    const validIds = new Set(BARANGAYS.map((b) => b.id));
    const targetIds = (parsed.matchedBarangayIds || []).filter((id) => validIds.has(id));

    if (parsed.is_ppc_advisory && targetIds.length > 0) {
      const isRestored = parsed.status === "NORMAL";
      const advisoryPayload = isRestored
        ? null
        : {
            type: parsed.status,
            title: parsed.title || title,
            reason: parsed.reason,
            startTime: parsed.startTime,
            estimatedEnd: parsed.estimatedEnd,
            source: "paleco.net (Auto-Synced)",
            sourceUrl,
          };

      const { error: updateErr } = await supabase
        .from("barangays")
        .update({
          status: parsed.status,
          advisory: advisoryPayload,
          updated_at: new Date().toISOString(),
        })
        .in("id", targetIds);

      if (updateErr) {
        console.error("Failed to update barangays:", updateErr.message);
        continue;
      }

      console.log(`Updated ${targetIds.length} barangay(s) -> ${parsed.status} (${title})`);
    } else {
      console.log(`No Puerto Princesa barangays matched for: ${title}`);
    }

    // 4. Record as ingested so it won't run twice
    await supabase.from("ingested_advisories").insert({
      source_url: sourceUrl,
      title,
      status: parsed.status || "UNMATCHED",
      affected_barangays: targetIds,
    });
  }
}

run().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});