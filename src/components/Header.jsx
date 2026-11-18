import { Zap, WifiOff, Moon, Sun, Radio } from "lucide-react";

export default function Header({
  barangays,
  isOffline,
  darkMode,
  onToggleDarkMode,
  onOpenFeed,
  recentEventsCount,
}) {
  const outageCount = barangays.filter(
    (b) => b.status === "UNSCHEDULED" || b.status === "SCHEDULED"
  ).length;
  const partialCount = barangays.filter((b) => b.status === "PARTIALLY_RESTORED").length;

  return (
    <header className="bg-slate-950 text-white px-4 py-3 border-b border-slate-800 z-30 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="bg-amber-400 text-slate-950 p-1.5 rounded-lg shrink-0 shadow-xs">
          <Zap className="w-5 h-5 fill-current" />
        </div>
        <div className="truncate">
          <h1 className="font-bold text-base sm:text-lg leading-tight truncate">
            PPC Kuryente Watch
          </h1>
          <p className="text-[11px] text-slate-400 truncate">
            Puerto Princesa Live Power &amp; PALECO Map
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isOffline && (
          <span className="inline-flex items-center gap-1 text-xs bg-slate-900 text-amber-300 px-2 py-1 rounded border border-slate-700">
            <WifiOff className="w-3.5 h-3.5" /> Cached
          </span>
        )}

        <div className="hidden sm:flex items-center gap-1.5 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-medium">
            {outageCount} Outages
          </span>
          {partialCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
              {partialCount} Restoring
            </span>
          )}
        </div>

        {/* Live City Activity Feed Button */}
        <button
          onClick={onOpenFeed}
          className="relative inline-flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
          title="Live City Updates"
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Live Feed</span>
          {recentEventsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold">
              {recentEventsCount}
            </span>
          )}
        </button>

        {/* High-Contrast Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 transition"
          title={darkMode ? "Switch to Light Map" : "Switch to Dark Map (Battery Saver)"}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}