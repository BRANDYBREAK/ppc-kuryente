import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;

export async function ensureAnonymousSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  // Keep existing admin OR anonymous session intact
  if (data.session) return data.session;
  const { data: anonData } = await supabase.auth.signInAnonymously();
  return anonData?.session || null;
}

export async function signInAdmin(email, password) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  if (!supabase) return;
  await supabase.auth.signOut();
  // Re-establish anonymous session for public voting
  await supabase.auth.signInAnonymously();
}

export async function fetchLiveStatuses() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_city_power_status");
  if (error) throw error;
  return data || [];
}

export async function submitKuryenteVote(barangayId, hasPower) {
  if (!supabase) return;
  await ensureAnonymousSession();
  const { error } = await supabase
    .from("kuryente_reports")
    .insert({ barangay_id: barangayId, has_power: hasPower });
  if (error) throw error;
}

export async function publishAdvisoryUpdate(barangayIds, status, advisoryPayload) {
  if (!supabase) return;
  const { error } = await supabase
    .from("barangays")
    .update({
      status,
      advisory: advisoryPayload,
      updated_at: new Date().toISOString(),
    })
    .in("id", barangayIds);
  if (error) throw error;
}