import { X, Radio, MapPin } from "lucide-react";
import { STATUS_CONFIG } from "../data/palecoDirectory";

export default function LiveFeedModal({ isOpen, onClose, barangays, onSelectBarangay }) {
  if (!isOpen) return null;

  const activeItems = barangays.filter(
    (b) => b.status !== "NORMAL" || b.votes.hasPower + b.votes.noPower > 0
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[82vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              Puerto Princesa Live Power Activity ({activeItems.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-2.5">
          {activeItems.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">
              All 66 barangays are currently reporting normal power.
            </p>
          ) : (
            activeItems.map((b) => {
              const cfg = STATUS_CONFIG[b.status];
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    onSelectBarangay(b.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Brgy. {b.name}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                      {b.advisory?.title || "Active neighbor kuryente reports"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {b.votes.hasPower} May Kuryente • {b.votes.noPower} Walang Kuryente
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cfg.badgeBg}`}
                  >
                    {cfg.shortLabel}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}