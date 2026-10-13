"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { continueWithGoogle, login, register, requestReset, updatePassword, type FormState } from "@/app/(auth)/actions";
import { Notice, Submit, TextField } from "./Form";

const START: FormState = {};

function PlanFields({ plan, cycle }: { plan?: string; cycle?: string }) {
  return (
    <>
      <input type="hidden" name="plan" value={plan ?? ""} />
      <input type="hidden" name="cycle" value={cycle ?? ""} />
    </>
  );
}

function GoogleSubmit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-ghost flex h-12 w-full items-center justify-center gap-3 rounded-xl text-[15px] font-medium disabled:opacity-60">
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      {pending ? "Opening Google…" : children}
    </button>
  );
}

/** Google sign-in above the email form. A form of its own, so it posts without the email fields. */
export function GoogleButton({ plan, cycle, children }: { plan?: string; cycle?: string; children: React.ReactNode }) {
  return (
    <form action={continueWithGoogle}>
      <PlanFields plan={plan} cycle={cycle} />
      <GoogleSubmit>{children}</GoogleSubmit>
      <div className="my-5 flex items-center gap-3 text-xs text-dim">
        <span className="h-px flex-1 bg-line" />
        or with email
        <span className="h-px flex-1 bg-line" />
      </div>
    </form>
  );
}

export function LoginForm({ plan, cycle }: { plan?: string; cycle?: string }) {
  const [state, action] = useActionState(login, START);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      <PlanFields plan={plan} cycle={cycle} />
      <TextField name="email" label="Work email" type="email" autoComplete="email" defaultValue={state.values?.email} error={state.fields?.email} />
      <TextField name="password" label="Password" type="password" autoComplete="current-password" error={state.fields?.password} />
      <div className="-mt-1 text-right text-sm">
        <Link href="/forgot-password" className="text-mut hover:text-ink">
          Forgot password?
        </Link>
      </div>
      <Submit>Sign in</Submit>
    </form>
  );
}

export function RegisterForm({ plan, cycle }: { plan?: string; cycle?: string }) {
  const [state, action] = useActionState(register, START);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      <PlanFields plan={plan} cycle={cycle} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Your name" autoComplete="name" defaultValue={state.values?.name} error={state.fields?.name} />
        <TextField name="company" label="Company" autoComplete="organization" required={false} defaultValue={state.values?.company} error={state.fields?.company} />
      </div>
      <TextField name="email" label="Work email" type="email" autoComplete="email" defaultValue={state.values?.email} error={state.fields?.email} />
      <TextField name="password" label="Password" type="password" autoComplete="new-password" error={state.fields?.password} hint="At least 8 characters." />
      <Submit>Create account</Submit>
      <p className="text-xs leading-relaxed text-dim">
        One person per account: you can sign in on up to 2 devices, one at a time. By creating an account you agree to the{" "}
        <Link href="/terms" className="underline hover:text-ink">
          terms
        </Link>{" "}
        and the{" "}
        <Link href="/privacy" className="underline hover:text-ink">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestReset, START);
  if (state.done)
    return <Notice tone="ok">If {state.values?.email} has an account, a reset link is on its way. The link works for one hour.</Notice>;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <TextField name="email" label="Work email" type="email" autoComplete="email" defaultValue={state.values?.email} error={state.fields?.email} />
      <Submit>Send reset link</Submit>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(updatePassword, START);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      <TextField name="password" label="New password" type="password" autoComplete="new-password" error={state.fields?.password} hint="At least 8 characters." />
      <Submit>Save new password</Submit>
    </form>
  );
}
