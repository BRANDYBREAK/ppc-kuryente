import { useState, useEffect, useCallback } from "react";
import rawGeoJson from "./data/ppc_barangays.json";
import { hydrateBarangaysFromGeoJSON } from "./data/palecoDirectory";
import {
  supabase,
  isSupabaseConfigured,
  ensureAnonymousSession,
  fetchLiveStatuses,
  submitKuryenteVote,
  publishAdvisoryUpdate,
} from "./lib/supabase";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import PowerMap from "./components/PowerMap";
import BarangayDrawer from "./components/BarangayDrawer";
import LiveFeedModal from "./components/LiveFeedModal";
import AdminPage from "./pages/AdminPage";

const STORAGE_KEY = "ppc_kuryente_watch_66_v1";
const VOTE_LIMIT_KEY = "ppc_kuryente_votes_v1";
const PINNED_KEY = "ppc_kuryente_pinned_v1";
const DARK_MODE_KEY = "ppc_kuryente_dark_v1";
const COOLDOWN_MS = 15 * 60 * 1000;

const HYDRATED_INITIAL = hydrateBarangaysFromGeoJSON(rawGeoJson);

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(
    () => window.location.pathname === "/admin"
  );
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved !== null) return saved === "true";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PINNED_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [barangays, setBarangays] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    return HYDRATED_INITIAL;
  });

  const [selectedId, setSelectedId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [highlightedFeeder, setHighlightedFeeder] = useState(null);
  const [isFeedOpen, setIsFeedOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [voteTimestamps, setVoteTimestamps] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(VOTE_LIMIT_KEY) || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem(DARK_MODE_KEY, String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  const togglePin = (barangayId) => {
    setPinnedIds((prev) =>
      prev.includes(barangayId)
        ? prev.filter((id) => id !== barangayId)
        : [...prev, barangayId]
    );
  };

  const navigateTo = (path) => {
    window.history.pushState({}, "", path);
    setIsAdminRoute(path === "/admin");
  };

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminRoute(window.location.pathname === "/admin");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const syncFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const liveRows = await fetchLiveStatuses();
      if (!liveRows.length) return;

      const liveMap = new Map(liveRows.map((row) => [row.id, row]));
      setBarangays((prev) =>
        prev.map((b) => {
          const live = liveMap.get(b.id);
          if (!live) return b;
          return {
            ...b,
            status: live.status,
            advisory: live.advisory,
            votes: {
              hasPower: live.votes?.hasPower ?? 0,
              noPower: live.votes?.noPower ?? 0,
              lastUpdated: "Live synced",
            },
          };
        })
      );
    } catch (err) {
      console.warn("Supabase sync failed, using cached state:", err.message);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(barangays));
  }, [barangays]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    ensureAnonymousSession().then(() => syncFromSupabase());

    const channel = supabase
      .channel("ppc-live-power")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "barangays" },
        () => syncFromSupabase()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "kuryente_reports" },
        () => syncFromSupabase()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncFromSupabase]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncFromSupabase();
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncFromSupabase]);

  const handleVote = async (barangayId, hasPower) => {
    const now = Date.now();
    const lastVote = voteTimestamps[barangayId] || 0;
    if (now - lastVote < COOLDOWN_MS) return;

    const nextTimestamps = { ...voteTimestamps, [barangayId]: now };
    setVoteTimestamps(nextTimestamps);
    localStorage.setItem(VOTE_LIMIT_KEY, JSON.stringify(nextTimestamps));

    setBarangays((prev) =>
      prev.map((b) => {
        if (b.id !== barangayId) return b;
        return {
          ...b,
          votes: {
            hasPower: b.votes.hasPower + (hasPower ? 1 : 0),
            noPower: b.votes.noPower + (hasPower ? 0 : 1),
            lastUpdated: "Updated just now",
          },
        };
      })
    );

    if (isSupabaseConfigured) {
      try {
        await submitKuryenteVote(barangayId, hasPower);
        await syncFromSupabase();
      } catch (err) {
        console.warn("Vote rejected by server rate-limit:", err.message);
      }
    }
  };

  const handlePublishAdvisory = async (parsedData) => {
    const isRestored = parsedData.status === "NORMAL";
    const advisoryPayload = isRestored
      ? null
      : {
          type: parsedData.advisoryType,
          title: parsedData.title,
          reason: parsedData.reason,
          startTime: parsedData.startTime,
          estimatedEnd: parsedData.estimatedEnd,
          source: "PALECO Advisory (Admin Verified)",
        };

    setBarangays((prev) =>
      prev.map((b) =>
        parsedData.matchedBarangayIds.includes(b.id)
          ? { ...b, status: parsedData.status, advisory: advisoryPayload }
          : b
      )
    );

    if (isSupabaseConfigured) {
      try {
        await publishAdvisoryUpdate(
          parsedData.matchedBarangayIds,
          parsedData.status,
          advisoryPayload
        );
        await syncFromSupabase();
      } catch (err) {
        console.error("Failed to publish advisory to Supabase:", err.message);
      }
    }
  };

  if (isAdminRoute) {
    return (
      <AdminPage
        barangays={barangays}
        onPublish={handlePublishAdvisory}
        onExit={() => navigateTo("/")}
      />
    );
  }

  const selectedBarangay = barangays.find((b) => b.id === selectedId) || null;
  const cooldownRemaining = selectedBarangay
    ? Math.max(
        0,
        Math.ceil(
          (COOLDOWN_MS - (Date.now() - (voteTimestamps[selectedBarangay.id] || 0))) /
            60000
        )
      )
    : 0;

  const recentEventsCount = barangays.filter(
    (b) => b.status !== "NORMAL" || b.votes.hasPower + b.votes.noPower > 0
  ).length;

  return (
    <div className="h-dvh flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
      <Header
        barangays={barangays}
        isOffline={isOffline}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onOpenFeed={() => setIsFeedOpen(true)}
        recentEventsCount={recentEventsCount}
      />
      <SearchBar
        barangays={barangays}
        onSelectBarangay={setSelectedId}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        pinnedIds={pinnedIds}
        highlightedFeeder={highlightedFeeder}
        onClearFeeder={() => setHighlightedFeeder(null)}
      />
      <main className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        <PowerMap
          barangays={barangays}
          selectedId={selectedId}
          onSelectBarangay={setSelectedId}
          activeFilter={activeFilter}
          darkMode={darkMode}
          highlightedFeeder={highlightedFeeder}
        />
        <BarangayDrawer
          barangay={selectedBarangay}
          onClose={() => setSelectedId(null)}
          onVote={handleVote}
          cooldownRemaining={cooldownRemaining}
          isPinned={selectedBarangay ? pinnedIds.includes(selectedBarangay.id) : false}
          onTogglePin={togglePin}
          highlightedFeeder={highlightedFeeder}
          onSelectFeeder={setHighlightedFeeder}
        />
      </main>

      <LiveFeedModal
        isOpen={isFeedOpen}
        onClose={() => setIsFeedOpen(false)}
        barangays={barangays}
        onSelectBarangay={setSelectedId}
      />
    </div>
  );
}