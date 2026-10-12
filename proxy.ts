import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const PROTECTED = ["/app", "/plans", "/checkout", "/devices"];
const GUEST_ONLY = ["/login", "/register", "/forgot-password"];

/**
 * Keeps the Supabase session cookie fresh and does the quick signed-in / signed-out redirects.
 * The strict rules (one live session, two devices, active plan) are checked on the page itself
 * in lib/access.ts, against the database.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Checks the session token locally (and refreshes it when it has expired), without a network call per request.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const path = request.nextUrl.pathname;
  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) return redirect("/login");
  if (user && GUEST_ONLY.some((p) => path === p || path.startsWith(p + "/"))) return redirect("/app");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
