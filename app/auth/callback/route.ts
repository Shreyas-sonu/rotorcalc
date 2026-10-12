import { NextResponse, type NextRequest } from "next/server";
import { claimSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Lands here from the links in confirmation and password-reset emails. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app";
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  if (!code) return to("/login?reason=link");
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return to("/login?reason=link");
  const claim = await claimSession(supabase);
  if (claim === "device_limit") return to("/devices");
  if (claim === "error") return to("/auth/ended?reason=error");
  // Only same-site paths are followed.
  return to(next.startsWith("/") && !next.startsWith("//") ? next : "/app");
}
