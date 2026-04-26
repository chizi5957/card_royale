import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info.tsx";

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
);

const LOCAL_KEY = "cardBattle_playerId";

export async function getOrCreatePlayerId(): Promise<string> {
  try {
    // Check for existing Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;

    // Attempt anonymous sign-in
    const { data, error } = await supabase.auth.signInAnonymously();
    if (!error && data.user?.id) return data.user.id;
  } catch {
    // fall through to localStorage
  }

  // localStorage UUID fallback
  try {
    const existing = localStorage.getItem(LOCAL_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(LOCAL_KEY, id);
    return id;
  } catch {
    return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export { supabase };
