import { projectId, publicAnonKey } from "/utils/supabase/info.tsx";

/**
 * Client API layer.
 *
 * All game operations go through the Supabase Edge Function which uses
 * SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 *
 * URL: https://<project>.supabase.co/functions/v1/make-server-b59f8b43/<route>
 */

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b59f8b43`;

/**
 * Makes a request to the edge function.
 *
 * @param path  e.g. "/game/create"
 * @param init  standard RequestInit overrides
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
    ...(init?.headers as Record<string, string> | undefined),
  };

  try {
    const res = await fetch(url, {
      ...init,
      headers,
    });
    return res;
  } catch (err: any) {
    console.error(`apiFetch error for ${url}:`, err);
    throw new Error(
      `Edge function unreachable at ${url}. Error: ${err?.message || err}`,
    );
  }
}
