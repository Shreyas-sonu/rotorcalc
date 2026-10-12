import { NextResponse, type NextRequest } from "next/server";
import { claimSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Registers this browser as the account's live session, or sends the user to free a device slot. */
export async function GET(request: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl.origin));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return to("/login");
  const claim = await claimSession(supabase);
  if (claim === "device_limit") return to("/devices");
  if (claim === "error") return to("/auth/ended?reason=error");
  return to("/app");
}
