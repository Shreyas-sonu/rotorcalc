import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Signs this browser out after another sign-in took over the account, then explains why on the login page. */
export async function GET(request: NextRequest) {
  const given = request.nextUrl.searchParams.get("reason");
  const reason = given === "error" || given === "signin" ? given : "replaced";
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL(reason === "signin" ? "/login" : `/login?reason=${reason}`, request.nextUrl.origin));
}
