import "server-only";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/**
 * Whether the project has Google sign-in switched on. Supabase answers a switched-off provider with a bare
 * error page, so the button is only offered when it is on. Asked at most once a minute.
 */
export async function googleEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY }, next: { revalidate: 60 } });
    return res.ok && (await res.json())?.external?.google === true;
  } catch {
    return false;
  }
}
