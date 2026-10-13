"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPlan } from "@/lib/plans";
import { claimSession, origin } from "@/lib/session";
import { googleEnabled } from "@/lib/supabase/providers";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; fields?: Record<string, string>; values?: Record<string, string>; done?: boolean };

const email = z.email("Enter a valid email address.").max(200);
const password = z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters.");

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Where a new or returning user goes next, carrying a plan they picked on the landing page. */
function afterAuth(plan: string, cycle: string): string {
  if (getPlan(plan)) return `/checkout?plan=${plan}&cycle=${cycle === "monthly" ? "monthly" : "yearly"}`;
  return "/app";
}

async function finishSignIn(supabase: Awaited<ReturnType<typeof createClient>>, next: string): Promise<never> {
  const claim = await claimSession(supabase);
  if (claim === "device_limit") redirect("/devices");
  if (claim === "error") redirect("/auth/ended?reason=error");
  redirect(next);
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const values = { email: String(form.get("email") ?? "").trim() };
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.") }).safeParse({ ...values, password: form.get("password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const unconfirmed = /confirm/i.test(error.message);
    return { error: unconfirmed ? "Confirm your email first. Check your inbox for the link we sent." : "Email or password is not right.", values };
  }
  return finishSignIn(supabase, afterAuth(String(form.get("plan") ?? ""), String(form.get("cycle") ?? "")));
}

/** Sends the browser to Google. New and returning users take the same road; it comes back through /auth/callback. */
export async function continueWithGoogle(form: FormData): Promise<never> {
  if (!(await googleEnabled())) redirect("/login?reason=google_off");
  const next = afterAuth(String(form.get("plan") ?? ""), String(form.get("cycle") ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/login?reason=google");
  redirect(data.url);
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const values = {
    name: String(form.get("name") ?? "").trim(),
    company: String(form.get("company") ?? "").trim(),
    email: String(form.get("email") ?? "").trim(),
  };
  const parsed = z
    .object({
      name: z.string().min(2, "Enter your name.").max(120),
      company: z.string().max(120),
      email,
      password,
    })
    .safeParse({ ...values, password: form.get("password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  const plan = String(form.get("plan") ?? "");
  const cycle = String(form.get("cycle") ?? "");
  const next = getPlan(plan) ? afterAuth(plan, cycle) : "/plans";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name, company: parsed.data.company },
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    const code = error.code ?? "";
    if (code === "user_already_exists" || /registered|exists/i.test(error.message)) return { fields: { email: "An account with this email already exists. Sign in instead." }, values };
    if (code === "email_address_invalid") return { fields: { email: "This email address is not accepted. Use your work email." }, values };
    if (code === "weak_password") return { fields: { password: "Choose a stronger password." }, values };
    if (code === "over_email_send_rate_limit" || error.status === 429)
      return { error: "We cannot send more confirmation emails right now. Wait a few minutes and try again.", values };
    return { error: "Could not create the account. Try again.", values };
  }
  // With email confirmation on, Supabase answers an existing address with a user that has no identities.
  if (data.user && data.user.identities?.length === 0) return { fields: { email: "An account with this email already exists. Sign in instead." }, values };
  if (!data.session) redirect(`/register/check-email?email=${encodeURIComponent(parsed.data.email)}`);
  return finishSignIn(supabase, next);
}

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const values = { email: String(form.get("email") ?? "").trim() };
  const parsed = z.object({ email }).safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${await origin()}/auth/callback?next=/reset-password` });
  // Same answer whether or not the address has an account.
  return { done: true, values };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ password }).safeParse({ password: form.get("password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "This reset link has expired. Ask for a new one." };
  redirect("/app");
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.rpc("release_session");
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function removeDevice(form: FormData): Promise<never> {
  const id = z.uuid().safeParse(form.get("id"));
  const supabase = await createClient();
  if (id.success) await supabase.rpc("remove_device", { p_id: id.data });
  redirect(String(form.get("next") ?? "") === "account" ? "/app/account" : "/auth/claim");
}
