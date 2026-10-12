import "server-only";
import { cookies, headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEVICE_COOKIE } from "./limits";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "Chrome on Windows" from a user-agent string. */
export function deviceLabel(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "unknown system";
  return `${browser} on ${os}`;
}

/** This browser's device id, created on first use. Only callable where cookies can be written. */
async function deviceId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  if (existing && UUID.test(existing)) return existing;
  const id = crypto.randomUUID();
  store.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return id;
}

export type ClaimResult = "ok" | "device_limit" | "error";

/**
 * Makes this browser's session the only live one for the account, if the device limit allows.
 * On success the database ends every other login of the account.
 * Call from a Server Action or Route Handler (it may set the device cookie).
 */
export async function claimSession(supabase: SupabaseClient): Promise<ClaimResult> {
  const id = await deviceId();
  const ua = (await headers()).get("user-agent") ?? "";
  const { data, error } = await supabase.rpc("claim_session", { p_device_id: id, p_label: deviceLabel(ua) });
  if (error) return "error";
  if (!data?.ok) return data?.reason === "device_limit" ? "device_limit" : "error";
  return "ok";
}

/** Site origin for links in emails. */
export async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
