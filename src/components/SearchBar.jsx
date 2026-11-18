import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Search, X, MapPin, Zap, Star } from "lucide-react";
import { STATUS_CONFIG } from "../data/palecoDirectory";

export default function SearchBar({
  barangays,
  onSelectBarangay,
  activeFilter,
  onFilterChange,
  pinnedIds,
  highlightedFeeder,
  onClearFeeder,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const fuse = useMemo(
    () =>
      new Fuse(barangays, {
        keys: [
          { name: "name", weight: 0.45 },
          { name: "landmarks", weight: 0.35 },
          { name: "feeders", weight: 0.2 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [barangays]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 7).map((r) => r.item);
  }, [query, fuse]);

  const pinnedBarangays = useMemo(
    () => barangays.filter((b) => pinnedIds.includes(b.id)),
    [barangays, pinnedIds]
  );

  const filters = [
    { id: "ALL", label: `All (${barangays.length})` },
    { id: "UNSCHEDULED", label: "Outage" },
    { id: "SCHEDULED", label: "Scheduled" },
    { id: "PARTIALLY_RESTORED", label: "Restoring" },
    { id: "NORMAL", label: "Normal" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 z-20 space-y-2 transition-colors">
      <div className="relative max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            placeholder="Search barangay, landmark (e.g. Wescom, PSU), or feeder..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-transparent focus:border-slate-400 dark:focus:border-slate-600 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
            {results.map((b) => {
              const cfg = STATUS_CONFIG[b.status];
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    onSelectBarangay(b.id);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-none flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Brgy. {b.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {b.landmarks.slice(0, 3).join(" • ") || b.feeders.join(" • ")}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${cfg.badgeBg}`}
                  >
                    {cfg.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pinned "My Barangays" Quick Bar + Active Feeder Banner */}
      {(pinnedBarangays.length > 0 || highlightedFeeder) && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-2xl mx-auto">
          {highlightedFeeder && (
            <button
              onClick={onClearFeeder}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-semibold shrink-0"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>Feeder: {highlightedFeeder}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {pinnedBarangays.map((b) => {
            const cfg = STATUS_CONFIG[b.status];
            return (
              <button
                key={b.id}
                onClick={() => onSelectBarangay(b.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium shrink-0 border border-slate-200 dark:border-slate-700"
              >
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span>{b.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-2xl mx-auto">
        {filters.map((f) => {
          const active = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                active
                  ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}