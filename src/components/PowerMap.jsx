import { useEffect, useRef, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, useMap } from "react-leaflet";
import { Crosshair, RotateCcw } from "lucide-react";
import { STATUS_CONFIG } from "../data/palecoDirectory";
import { findBarangayByCoords } from "../lib/geoUtils";

const CITY_CENTER = [9.78, 118.75];
const CITY_ZOOM = 12;

function MapController({ barangay, resetTrigger, userCoords }) {
  const map = useMap();

  useEffect(() => {
    if (!barangay?.center) return;
    map.flyTo(barangay.center, 13, { duration: 0.6 });
  }, [barangay, map]);

  useEffect(() => {
    if (resetTrigger === 0) return;
    map.flyTo(CITY_CENTER, CITY_ZOOM, { duration: 0.6 });
  }, [resetTrigger, map]);

  useEffect(() => {
    if (!userCoords) return;
    map.flyTo([userCoords.lat, userCoords.lng], 14, { duration: 0.7 });
  }, [userCoords, map]);

  return null;
}

export default function PowerMap({
  barangays,
  selectedId,
  onSelectBarangay,
  activeFilter,
  darkMode,
  highlightedFeeder,
}) {
  const geoJsonLayerRef = useRef(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);

  const selectedBarangay = barangays.find((b) => b.id === selectedId);

  const featureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features: barangays.map((b) => ({
        ...b.feature,
        properties: {
          ...b.feature.properties,
          _id: b.id,
          _name: b.name,
        },
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [barangays.length]
  );

  useEffect(() => {
    const layerGroup = geoJsonLayerRef.current;
    if (!layerGroup) return;

    const byId = new Map(barangays.map((b) => [b.id, b]));

    layerGroup.eachLayer((layer) => {
      const id = layer.feature?.properties?._id;
      const b = byId.get(id);
      if (!b) return;

      const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.NORMAL;
      const isSelected = id === selectedId;
      const matchesFeeder = highlightedFeeder
        ? b.feeders.includes(highlightedFeeder)
        : true;
      const matchesStatus =
        activeFilter === "ALL" ? true : b.status === activeFilter;

      const isDimmed = !matchesStatus || !matchesFeeder;

      layer.setStyle({
        color: isSelected
          ? darkMode
            ? "#f8fafc"
            : "#0f172a"
          : highlightedFeeder && matchesFeeder
          ? "#f59e0b"
          : cfg.color,
        weight: isSelected ? 3 : highlightedFeeder && matchesFeeder ? 2.2 : 1.2,
        fillColor: cfg.fillColor,
        fillOpacity: isDimmed ? 0.06 : isSelected ? 0.58 : darkMode ? 0.42 : 0.34,
      });

      layer.unbindTooltip();
      layer.bindTooltip(`Brgy. ${b.name} — ${cfg.shortLabel}`, {
        sticky: true,
        direction: "top",
        className: "text-xs font-semibold",
      });
    });
  }, [barangays, selectedId, activeFilter, darkMode, highlightedFeeder]);

  const onEachFeature = (feature, layer) => {
    layer.on({
      click: () => onSelectBarangay(feature.properties._id),
    });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setLocating(false);

        const matched = findBarangayByCoords(coords.lat, coords.lng, barangays);
        if (matched) {
          onSelectBarangay(matched.id);
        }
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div className="relative flex-1 w-full h-full z-10">
 <MapContainer
        center={CITY_CENTER}
        zoom={CITY_ZOOM}
        zoomControl={false}
        className={`w-full h-full ${darkMode ? "map-dark-tiles" : ""}`}
      >
        <TileLayer attribution={tileAttribution} url={tileUrl} />

        <MapController
          barangay={selectedBarangay}
          resetTrigger={resetTrigger}
          userCoords={userCoords}
        />

        {featureCollection.features.length > 0 && (
          <GeoJSON
            key="ppc-66-barangays"
            ref={geoJsonLayerRef}
            data={featureCollection}
            onEachFeature={onEachFeature}
          />
        )}

        {userCoords && (
          <CircleMarker
            center={[userCoords.lat, userCoords.lng]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#3b82f6",
              fillOpacity: 1,
            }}
          />
        )}
      </MapContainer>

      {/* Floating GPS Locate & Reset View Controls */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          title="Find My Barangay (GPS)"
        >
          <Crosshair className={`w-4 h-4 ${locating ? "animate-spin text-amber-500" : ""}`} />
        </button>
        <button
          onClick={() => {
            onSelectBarangay(null);
            setResetTrigger((n) => n + 1);
          }}
          className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          title="Reset City View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Compact Floating Legend */}
      <div className="absolute bottom-4 left-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl shadow-md px-3 py-2 text-xs space-y-1">
        <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
          Power Status
        </div>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <span>{cfg.shortLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}