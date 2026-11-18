export const STATUS_CONFIG = {
  NORMAL: {
    label: "Normal Power",
    shortLabel: "Normal",
    color: "#16a34a",
    fillColor: "#22c55e",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  UNSCHEDULED: {
    label: "Unscheduled Outage",
    shortLabel: "Outage",
    color: "#dc2626",
    fillColor: "#ef4444",
    badgeBg: "bg-red-100 text-red-800 border-red-200",
    dot: "bg-red-500",
  },
  SCHEDULED: {
    label: "Scheduled Maintenance",
    shortLabel: "Scheduled",
    color: "#d97706",
    fillColor: "#f59e0b",
    badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  PARTIALLY_RESTORED: {
    label: "Partially Restored",
    shortLabel: "Partial",
    color: "#2563eb",
    fillColor: "#3b82f6",
    badgeBg: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
  },
};

export const PALECO_METADATA = {
  "san pedro": {
    district: "Urban",
    feeders: ["Lucbuan Feeder 2", "Nadayao Recloser"],
    landmarks: ["Wescom Rd", "Libis Rd", "Baltan St", "BM Road", "NCCC Choice"],
  },
  "san manuel": {
    district: "Urban",
    feeders: ["Lucbuan Feeder 2", "Chariot Recloser"],
    landmarks: ["Robinsons Place Palawan", "National Highway", "Abueg Rd", "Purok Masagana"],
  },
  "santa monica": {
    district: "Urban",
    feeders: ["Irawan Feeder 1", "Monica Recloser"],
    landmarks: ["Mitra Rd", "Baker's Hill", "Sta. Monica Heights", "Purok Bagong Silang"],
  },
  "tiniguiban": {
    district: "Urban",
    feeders: ["Lucbuan Feeder 1", "PSU Recloser"],
    landmarks: ["Palawan State University", "Manalo Extension", "Gaisano Capital", "Junction 1"],
  },
  "bancao-bancao": {
    district: "Urban",
    feeders: ["Lucbuan Feeder 3", "Airport Recloser"],
    landmarks: ["Puerto Princesa International Airport", "Gabinete Rd", "Jacana", "Hartmann"],
  },
  "san jose": {
    district: "Urban",
    feeders: ["Irawan Feeder 2", "New Market Recloser"],
    landmarks: ["San Jose New Market", "Terminal", "Hagedorn Rd", "Purok Matahimik"],
  },
  "san miguel": {
    district: "Urban",
    feeders: ["Lucbuan Feeder 1", "Paleco Compound Recloser"],
    landmarks: ["PALECO Main Office", "SM City Puerto Princesa", "Malvar St", "San Miguel"],
  },
  "sicsican": {
    district: "Peri-Urban",
    feeders: ["Irawan Feeder 1"],
    landmarks: ["National Highway North", "Sicsican Elementary", "Purok Pagkakaisa"],
  },
  "irawan": {
    district: "Peri-Urban",
    feeders: ["Irawan Substation Main", "Irawan Recloser"],
    landmarks: ["Irawan Eco-Park", "PALECO Irawan Substation", "Sitio Maligaya"],
  },
  "tagburos": {
    district: "Rural North",
    feeders: ["Irawan Feeder 2", "Magarwak Recloser"],
    landmarks: ["Tagburos Bridge", "North National Highway"],
  },
  "santa lourdes": {
    district: "Rural North",
    feeders: ["Irawan Feeder 2", "Magarwak Recloser"],
    landmarks: ["Honda Bay Wharf", "Sta. Lourdes National High School"],
  },
  "bacungan": {
    district: "Rural North",
    feeders: ["North Line Feeder", "Magarwak Recloser"],
    landmarks: ["Sitio Magarwak", "Nagtabon Junction"],
  },
  "iwahig": {
    district: "Rural South",
    feeders: ["South Line Feeder", "Iwahig Recloser"],
    landmarks: ["Iwahig Prison and Penal Farm", "Balsahan"],
  },
  "luzviminda": {
    district: "Rural South",
    feeders: ["South Line Feeder"],
    landmarks: ["South National Highway", "Luzviminda Proper"],
  },
  "mangingisda": {
    district: "Rural South",
    feeders: ["South Line Feeder"],
    landmarks: ["Mangingisda Port", "Binunsalian"],
  },
};

export function hydrateBarangaysFromGeoJSON(raw) {
  const geoJson = raw?.default || raw;

  // Handle FeatureCollection, GeometryCollection, or a direct array of features
  const features = Array.isArray(geoJson)
    ? geoJson
    : Array.isArray(geoJson?.features)
    ? geoJson.features
    : Array.isArray(geoJson?.geometries)
    ? geoJson.geometries.map((g) => ({
        type: "Feature",
        properties: g.properties || {},
        geometry: g,
      }))
    : [];

  return features
    .map((feature, idx) => {
      const props = feature.properties || {};
      const rawName = props.adm4_name || `Barangay ${idx + 1}`;
      const key = rawName.toLowerCase().trim();
      const meta = PALECO_METADATA[key] || {};

      const isPoblacion = rawName.toLowerCase().includes("(pob.)");
      const defaultFeeders = isPoblacion
        ? ["Lucbuan Feeder 1", "Paleco Compound Recloser"]
        : (props.center_lat || 0) > 9.8
        ? ["North Line Feeder"]
        : ["South Line Feeder"];

      return {
        id: props.adm4_pcode || `ppc-${idx}`,
        name: rawName,
        district: meta.district || (isPoblacion ? "Poblacion" : "Rural"),
        feeders: meta.feeders || defaultFeeders,
        landmarks: meta.landmarks || (isPoblacion ? ["Bayan Area", "Rizal Avenue"] : [rawName]),
        center:
          props.center_lat && props.center_lon
            ? [props.center_lat, props.center_lon]
            : [9.78, 118.75],
        status: "NORMAL",
        advisory: null,
        votes: { hasPower: 0, noPower: 0, lastUpdated: "No recent reports" },
        feature,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}