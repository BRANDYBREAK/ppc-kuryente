import { useState, useEffect } from "react";
import { Lock, LogOut, ArrowLeft, Sparkles, Check, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase, signInAdmin, signOutAdmin } from "../lib/supabase";
import { parsePalecoAdvisory } from "../lib/advisoryParser";
import { STATUS_CONFIG } from "../data/palecoDirectory";

export default function AdminPage({ barangays, onPublish, onExit }) {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !data.session.user?.is_anonymous) {
        setSession(data.session);
      }
    });
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      const s = await signInAdmin(email, password);
      setSession(s);
    } catch (err) {
      setAuthError(err.message || "Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutAdmin();
    setSession(null);
  };

  const handleParse = () => {
    const result = parsePalecoAdvisory(rawText, barangays);
    setParsed(result);
    setSelectedIds(result.matchedBarangayIds);
  };

  const handleApply = async () => {
    if (!parsed || selectedIds.length === 0) return;
    await onPublish({ ...parsed, matchedBarangayIds: selectedIds });
    showToast(`Updated ${selectedIds.length} barangays on live map.`);
  };

  const handleQuickStatus = async (barangay, nextStatus) => {
    await onPublish({
      status: nextStatus,
      advisoryType: nextStatus,
      title:
        nextStatus === "NORMAL"
          ? "Power Restored"
          : barangay.advisory?.title || "Admin Confirmed Outage",
      reason:
        barangay.advisory?.reason || "Confirmed by PALECO / Kuryente Watch Admin",
      startTime: barangay.advisory?.startTime || "Active",
      estimatedEnd: barangay.advisory?.estimatedEnd || "Pending PALECO update",
      matchedBarangayIds: [barangay.id],
    });
    showToast(`Brgy. ${barangay.name} set to ${STATUS_CONFIG[nextStatus].shortLabel}`);
  };

  // 1. Login Screen if not authenticated as Admin
  if (!session) {
    return (
      <div className="min-h-dvh bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-400 text-slate-950 p-2 rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-base text-slate-900">Admin Console</h1>
                <p className="text-xs text-slate-500">PPC Kuryente Watch</p>
              </div>
            </div>
            <button
              onClick={onExit}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Map
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="admin@kuryentewatch.ph"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In to Admin"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeOutages = barangays.filter((b) => b.status !== "NORMAL");

  // 2. Authenticated Admin Dashboard
  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Public Map
          </button>
          <span className="font-bold text-sm">PALECO &amp; Community Moderation</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </header>

      {toast && (
        <div className="bg-emerald-600 text-white text-xs font-medium text-center py-2">
          {toast}
        </div>
      )}

      <div className="max-w-6xl w-full mx-auto p-4 grid lg:grid-cols-2 gap-6">
        {/* Left: Advisory Parser */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <h2 className="font-bold text-sm text-slate-900">
            1. Parse Official PALECO Advisory
          </h2>
          <textarea
            rows={7}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste PALECO Facebook or paleco.net announcement..."
            className="w-full text-xs p-3 rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={handleParse}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-400" /> Extract Affected Barangays
          </button>

          {parsed && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs">
                <div className="font-bold text-slate-900">{parsed.title}</div>
                <div className="text-slate-600">
                  {parsed.status} • {parsed.startTime} – {parsed.estimatedEnd}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {barangays.map((b) => {
                  const checked = selectedIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        setSelectedIds((prev) =>
                          prev.includes(b.id) ? prev.filter((x) => x !== b.id) : [...prev, b.id]
                        )
                      }
                      className={`text-left text-xs px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
                        checked
                          ? "bg-amber-50 border-amber-400 text-amber-950 font-medium"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      {checked && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleApply}
                disabled={selectedIds.length === 0}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-40"
              >
                Publish to Live Map ({selectedIds.length})
              </button>
            </div>
          )}
        </div>

        {/* Right: Active Outages & Community Consensus Approval */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-900">
              2. Active Outages &amp; Community Reports ({activeOutages.length})
            </h2>
            {activeOutages.length > 0 && (
              <button
                onClick={() =>
                  onPublish({
                    status: "NORMAL",
                    matchedBarangayIds: activeOutages.map((b) => b.id),
                  })
                }
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                Restore All to Normal
              </button>
            )}
          </div>

          {activeOutages.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">
              All 66 barangays are currently Normal.
            </p>
          ) : (
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {activeOutages.map((b) => {
                const cfg = STATUS_CONFIG[b.status];
                const isCommunity = b.advisory?.type === "COMMUNITY_REPORT";
                return (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900">Brgy. {b.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.badgeBg}`}>
                          {cfg.shortLabel}
                        </span>
                        {isCommunity && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Community
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Votes (45m): {b.votes.hasPower} Has Power • {b.votes.noPower} No Power
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCommunity && (
                        <button
                          onClick={() => handleQuickStatus(b, "UNSCHEDULED")}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold"
                        >
                          Confirm Outage
                        </button>
                      )}
                      <button
                        onClick={() => handleQuickStatus(b, "NORMAL")}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Restore
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}