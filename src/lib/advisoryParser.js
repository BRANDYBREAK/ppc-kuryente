export function parsePalecoAdvisory(rawText, barangays) {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  let advisoryType = "UNSCHEDULED";
  if (lower.includes("scheduled") || lower.includes("maintenance") || lower.includes("apmt")) {
    advisoryType = "SCHEDULED";
  }

  let status = advisoryType;
  if (
    lower.includes("power has been restored") ||
    lower.includes("oras na naibalik") ||
    lower.includes("restored at")
  ) {
    status = "NORMAL";
  }

  const timeMatch = text.match(
    /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\s*(?:-|to|until|hanggang)\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i
  );
  const singleTimeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i);

  const startTime = timeMatch
    ? timeMatch[1].toUpperCase()
    : singleTimeMatch
    ? singleTimeMatch[1].toUpperCase()
    : "Just now";
  const estimatedEnd = timeMatch ? timeMatch[2].toUpperCase() : "Pending field check";

  const reasonMatch = text.match(/(?:reason|dahilan|cause)\s*[:\-]\s*([^\n]+)/i);
  const reason = reasonMatch
    ? reasonMatch[1].trim()
    : advisoryType === "SCHEDULED"
    ? "Scheduled line maintenance and clearing"
    : "Unscheduled line tripping / emergency repair";

  const matchedIds = new Set();
  const mentionsPoblacion = lower.includes("poblacion") || lower.includes("bayan");

  barangays.forEach((b) => {
    const cleanName = b.name.replace(/\s*\(pob\.\)/i, "").toLowerCase();
    const isPob = b.name.toLowerCase().includes("(pob.)");

    const nameMatch = lower.includes(b.name.toLowerCase()) || lower.includes(cleanName);
    const landmarkMatch = b.landmarks.some((lm) => lower.includes(lm.toLowerCase()));
    const feederMatch = b.feeders.some((fd) => lower.includes(fd.toLowerCase()));

    if (nameMatch || landmarkMatch || feederMatch || (mentionsPoblacion && isPob)) {
      matchedIds.add(b.id);
    }
  });

  const feederMatches = text.match(/([A-Za-z0-9\s]+(?:Feeder\s*\d+|Recloser))/gi) || [];

  return {
    advisoryType,
    status,
    title:
      feederMatches.length > 0
        ? `${advisoryType === "SCHEDULED" ? "Scheduled Work" : "Outage"}: ${feederMatches[0].trim()}`
        : `${advisoryType === "SCHEDULED" ? "Scheduled Maintenance" : "Power Interruption"}`,
    reason,
    startTime,
    estimatedEnd,
    matchedBarangayIds: Array.from(matchedIds),
    detectedFeeders: [...new Set(feederMatches.map((f) => f.trim()))],
  };
}