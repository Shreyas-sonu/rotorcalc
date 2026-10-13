"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type IconName = "signout" | "leave" | "trash" | "device";

export type ConfirmOptions = {
  title: string;
  text?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** danger: the action throws something away. */
  tone?: "brand" | "danger";
  icon?: IconName;
};

const ICONS: Record<IconName, string> = {
  signout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  leave: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6",
  device: "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 21h8M12 16v5M9.5 7.5l5 4M14.5 7.5l-5 4",
};

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

const Ctx = createContext<{ confirm: (o: ConfirmOptions) => Promise<boolean>; setUnsaved: (dirty: boolean) => void; isUnsaved: () => boolean } | null>(null);

/** The one confirmation dialog of the app. Mounted once at the root; ask it a question with useConfirm(). */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [ask, setAsk] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const unsaved = useRef(false);
  const setUnsaved = useCallback((dirty: boolean) => {
    unsaved.current = dirty;
  }, []);
  const isUnsaved = useCallback(() => unsaved.current, []);

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setAsk(o);
      }),
    [],
  );
  const answer = (ok: boolean) => {
    dialog.current?.close();
    resolver.current?.(ok);
    resolver.current = null;
    setAsk(null);
  };
  useEffect(() => {
    if (ask && !dialog.current?.open) dialog.current?.showModal();
  }, [ask]);

  const danger = ask?.tone === "danger";
  return (
    <Ctx.Provider value={{ confirm, setUnsaved, isUnsaved }}>
      {children}
      {ask && (
        <dialog
          ref={dialog}
          aria-labelledby="confirm-title"
          aria-describedby={ask.text ? "confirm-text" : undefined}
          onCancel={(e) => {
            e.preventDefault();
            answer(false);
          }}
          onClick={(e) => e.target === e.currentTarget && answer(false)}
          className="rise m-auto w-[calc(100vw-2.5rem)] max-w-md rounded-[22px] border-[1.5px] border-ink bg-panel p-0 text-ink shadow-[6px_6px_0_var(--color-ink)] backdrop:bg-ink/45 backdrop:backdrop-blur-[3px]"
        >
          <div className="p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${danger ? "bg-bad/10 text-bad" : "bg-brand/10 text-brand"}`}>
                <Icon name={ask.icon ?? (danger ? "leave" : "signout")} />
              </span>
              <div className="min-w-0 pt-0.5">
                <h2 id="confirm-title" className="text-lg font-semibold tracking-tight">
                  {ask.title}
                </h2>
                {ask.text && (
                  <p id="confirm-text" className="mt-1.5 text-[15px] leading-relaxed text-mut">
                    {ask.text}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button type="button" autoFocus onClick={() => answer(false)} className="btn-ghost h-11 rounded-xl px-5 text-sm font-medium">
                {ask.cancelLabel ?? "Cancel"}
              </button>
              <button type="button" onClick={() => answer(true)} className={`${danger ? "btn-danger" : "btn-spark"} h-11 rounded-xl px-5 text-sm`}>
                {ask.confirmLabel}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </Ctx.Provider>
  );
}

function useDialogs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("ConfirmProvider is missing");
  return ctx;
}

/** `if (await confirm({ ... })) doIt()` */
export function useConfirm() {
  return useDialogs().confirm;
}

/** Marks the page as holding work that has not been saved. Leaving then asks first, inside the app and when the browser tab is closed. */
export function useUnsaved(dirty: boolean) {
  const { setUnsaved } = useDialogs();
  useEffect(() => {
    setUnsaved(dirty);
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => {
      setUnsaved(false);
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty, setUnsaved]);
}

/** Asks, at the moment of a click, whether the page holds unsaved work. */
export function useIsUnsaved() {
  return useDialogs().isUnsaved;
}

/** Resolves true when it is fine to leave the page: nothing unsaved, or the user chose to leave. */
export function useLeaveGuard() {
  const { confirm, isUnsaved } = useDialogs();
  return async () =>
    !isUnsaved() ||
    (await confirm({
      title: "Leave this calculation?",
      text: "The numbers you entered have not been saved. If you leave now they will be lost.",
      confirmLabel: "Leave without saving",
      cancelLabel: "Stay here",
      tone: "danger",
      icon: "leave",
    }));
}

/** A link that asks before leaving unsaved work. */
export function GuardedLink({ href, onClick, ...rest }: React.ComponentProps<typeof Link>) {
  const isUnsaved = useIsUnsaved();
  const mayLeave = useLeaveGuard();
  const router = useRouter();
  return (
    <Link
      href={href}
      {...rest}
      onClick={async (e) => {
        onClick?.(e);
        // New-tab clicks keep this page open, so nothing is lost.
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !isUnsaved()) return;
        e.preventDefault();
        if (await mayLeave()) router.push(String(href));
      }}
    />
  );
}

/** Submit button for a server-action form that asks first. */
export function ConfirmSubmit({ ask, className, children, ...rest }: { ask: ConfirmOptions } & Omit<React.ComponentProps<"button">, "type" | "onClick">) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      className={className}
      {...rest}
      onClick={async (e) => {
        const form = e.currentTarget.form;
        if (await confirm(ask)) form?.requestSubmit();
      }}
    >
      {children}
    </button>
  );
}
