import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { hydrateBarangaysFromGeoJSON } from "../src/data/palecoDirectory.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const rawGeoJson = JSON.parse(fs.readFileSync("./src/data/ppc_barangays.json", "utf8"));
const hydrated = hydrateBarangaysFromGeoJSON(rawGeoJson);

const rows = hydrated.map((b) => ({
  id: b.id,
  name: b.name,
  district: b.district,
  feeders: b.feeders,
  landmarks: b.landmarks,
  status: "NORMAL",
  advisory: null,
}));

const { error } = await supabase.from("barangays").upsert(rows, { onConflict: "id" });

if (error) {
  console.error("Seed failed:", error);
} else {
  console.log(`Successfully seeded ${rows.length} Puerto Princesa barangays into Supabase!`);
}