import { useState } from "react";
import {
  X,
  Zap,
  ZapOff,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Star,
  Share2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { STATUS_CONFIG } from "../data/palecoDirectory";
import { getRestorationCountdown } from "../lib/geoUtils";

export default function BarangayDrawer({
  barangay,
  onClose,
  onVote,
  cooldownRemaining,
  isPinned,
  onTogglePin,
  highlightedFeeder,
  onSelectFeeder,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!barangay) return null;

  const cfg = STATUS_CONFIG[barangay.status];
  const totalVotes = barangay.votes.hasPower + barangay.votes.noPower;
  const hasPowerPct =
    totalVotes > 0 ? Math.round((barangay.votes.hasPower / totalVotes) * 100) : 50;
  const countdown = barangay.advisory
    ? getRestorationCountdown(barangay.advisory.estimatedEnd)
    : null;

  const handleShare = async () => {
    const statusLine = barangay.advisory
      ? `${cfg.label} (${barangay.advisory.title}) — Est. restoration: ${barangay.advisory.estimatedEnd}`
      : `${cfg.label} — No active outage reported.`;

    const shareText = `⚡ Brgy. ${barangay.name}, Puerto Princesa\nStatus: ${statusLine}\nNeighbor Check: ${barangay.votes.hasPower} May Kuryente | ${barangay.votes.noPower} Walang Kuryente\nLive map: ${window.location.origin}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `PPC Kuryente Watch — Brgy. ${barangay.name}`,
          text: shareText,
        });
        return;
      } catch {}
    }

    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <aside
      className={`fixed md:static bottom-0 left-0 right-0 z-30 md:w-96 bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 shadow-2xl md:shadow-none rounded-t-2xl md:rounded-none flex flex-col transition-all duration-200 ${
        collapsed ? "max-h-24 overflow-hidden md:max-h-full" : "max-h-[78vh] md:max-h-full"
      }`}
    >
      {/* Mobile Peek Drag Handle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="md:hidden w-full pt-2 pb-1 flex items-center justify-center text-slate-400"
        aria-label="Toggle drawer height"
      >
        {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Drawer Header */}
      <div className="px-4 pb-3 pt-1 md:pt-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.badgeBg}`}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>

            {countdown && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  countdown.overdue
                    ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {countdown.label}
              </span>
            )}
          </div>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
            Brgy. {barangay.name}
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onTogglePin(barangay.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isPinned ? "Unpin My Barangay" : "Pin as My Barangay"}
          >
            <Star
              className={`w-4 h-4 ${isPinned ? "text-amber-400 fill-amber-400" : ""}`}
            />
          </button>
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Share Barangay Status"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {copied && (
        <div className="bg-emerald-600 text-white text-xs text-center py-1 font-medium">
          Copied status summary to clipboard!
        </div>
      )}

      {/* Drawer Body */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1">
        {/* Clickable PALECO Feeders (Highlights all barangays on same feeder) */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            PALECO Feeder (Tap to highlight line)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {barangay.feeders.map((feeder) => {
              const active = highlightedFeeder === feeder;
              return (
                <button
                  key={feeder}
                  onClick={() => onSelectFeeder(active ? null : feeder)}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                    active
                      ? "bg-amber-400 text-slate-950 border-amber-500"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  {feeder}
                </button>
              );
            })}
          </div>
        </div>

        {/* Official PALECO Advisory Card */}
        {barangay.advisory ? (
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                {barangay.advisory.source}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono">
                {barangay.advisory.type}
              </span>
            </div>

            <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{barangay.advisory.title}</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {barangay.advisory.reason}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block">Outage Start</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {barangay.advisory.startTime}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Est. Restoration</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  {barangay.advisory.estimatedEnd}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>No active PALECO outage advisories reported for this barangay.</span>
          </div>
        )}

        {/* Crowdsourced "May Kuryente Na Ba?" Voting */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Neighbor Kuryente Check
            </span>
            <span className="text-[11px] text-slate-400">{barangay.votes.lastUpdated}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-emerald-600 dark:text-emerald-400">
                May Kuryente ({barangay.votes.hasPower})
              </span>
              <span className="text-red-600 dark:text-red-400">
                Walang Kuryente ({barangay.votes.noPower})
              </span>
            </div>
            <div className="w-full h-2.5 bg-red-500 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${hasPowerPct}%` }}
              />
            </div>
          </div>

          {cooldownRemaining > 0 ? (
            <div className="text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 py-2 rounded-lg">
              Thanks for reporting! Next check available in {cooldownRemaining}m.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onVote(barangay.id, true)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-semibold transition"
              >
                <Zap className="w-4 h-4 fill-current" />
                May Kuryente Na
              </button>
              <button
                onClick={() => onVote(barangay.id, false)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white text-xs font-semibold transition"
              >
                <ZapOff className="w-4 h-4" />
                Walang Kuryente
              </button>
            </div>
          )}
        </div>

        {/* Covered Landmarks */}
        {barangay.landmarks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Covered Landmarks &amp; Sitios
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {barangay.landmarks.map((lm) => (
                <span
                  key={lm}
                  className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md border border-slate-200/70 dark:border-slate-700"
                >
                  {lm}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}