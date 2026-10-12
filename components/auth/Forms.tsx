"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, requestReset, updatePassword, type FormState } from "@/app/(auth)/actions";
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
      <p className="text-xs leading-relaxed text-dim">One person per account: you can sign in on up to 2 devices, one at a time.</p>
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
