"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function TextField({
  name,
  label,
  type = "text",
  autoComplete,
  defaultValue,
  error,
  hint,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="mb-1.5 flex justify-between text-sm text-mut">
        {label}
        {!required && <span className="text-dim">Optional</span>}
      </span>
      <span className="relative block">
        <input
          name={name}
          type={isPassword && show ? "text" : type}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`h-12 w-full rounded-xl border bg-ink/[0.03] px-4 text-[15px] outline-none transition-colors placeholder:text-dim focus:border-brand focus:bg-panel ${
            error ? "border-bad" : "border-line"
          } ${isPassword ? "pr-16" : ""}`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-xs text-mut hover:text-ink">
            {show ? "Hide" : "Show"}
          </button>
        )}
      </span>
      {error ? (
        <span id={`${name}-error`} className="mt-1.5 block text-sm text-bad">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-dim">{hint}</span>
      )}
    </label>
  );
}

export function Submit({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn-spark h-12 w-full rounded-xl text-[15px] ${className}`}>
      {pending ? "One moment…" : children}
    </button>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "bad" | "ok"; children: React.ReactNode }) {
  const style = tone === "bad" ? "border-bad/40 bg-bad/10 text-bad" : tone === "ok" ? "border-ok/40 bg-ok/10 text-ok" : "border-brand/40 bg-brand/10 text-brand";
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${style}`}>
      {children}
    </div>
  );
}
