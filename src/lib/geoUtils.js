// Ray-casting point-in-polygon check for GeoJSON Polygon & MultiPolygon
function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findBarangayByCoords(lat, lng, barangays) {
  for (const b of barangays) {
    const geom = b.feature?.geometry;
    if (!geom) continue;

    if (geom.type === "Polygon") {
      if (pointInRing(lng, lat, geom.coordinates[0])) return b;
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        if (pointInRing(lng, lat, poly[0])) return b;
      }
    }
  }
  return null;
}

// Parse times like "05:00 PM" or "5:30 PM" into today's Date to show a live countdown
export function getRestorationCountdown(estimatedEnd) {
  if (!estimatedEnd) return null;
  const match = estimatedEnd.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  const absMins = Math.round(Math.abs(diffMs) / 60000);
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
  const formatted = h > 0 ? `${h}h ${m}m` : `${m}m`;

  if (diffMs > 0) {
    return { label: `Est. back in ${formatted}`, overdue: false };
  }
  if (absMins <= 360) {
    return { label: `Overdue by ${formatted}`, overdue: true };
  }
  return null;
}