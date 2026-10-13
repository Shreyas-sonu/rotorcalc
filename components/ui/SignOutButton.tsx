"use client";

import { useTransition } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Icon, useConfirm, useIsUnsaved } from "./Confirm";

/** Sign out, after asking. Says so when a calculation would be lost. */
export function SignOutButton({ className = "" }: { className?: string }) {
  const confirm = useConfirm();
  const isUnsaved = useIsUnsaved();
  const [pending, start] = useTransition();
  const ask = async () => {
    const losing = isUnsaved();
    const ok = await confirm({
      title: "Sign out?",
      text: losing
        ? "The calculation on screen has not been saved. Signing out now will lose it."
        : "You will need to sign in again to use your calculators on this device.",
      confirmLabel: losing ? "Sign out without saving" : "Sign out",
      cancelLabel: "Stay signed in",
      tone: losing ? "danger" : "brand",
      icon: "signout",
    });
    if (ok) start(() => signOut());
  };
  return (
    <button type="button" onClick={ask} disabled={pending} className={`inline-flex items-center gap-2 disabled:opacity-60 ${className}`}>
      <Icon name="signout" className="h-[18px] w-[18px]" />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
