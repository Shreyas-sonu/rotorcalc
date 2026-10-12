"use client";

import { useId } from "react";
import { fromBase, toBase, unitsOf, type Quantity } from "@/lib/steam/units";

/** A typed value with its unit, exactly as the user sees it. */
export type Q = { v: string; u: string };

export const q = (v: number | string, u: string): Q => ({ v: String(v), u });

/** Value in internal units (MPa, K, kg/s, kW). NaN while the box is empty or invalid. */
export function base(quantity: Quantity, value: Q): number {
  const n = Number.parseFloat(value.v);
  return Number.isFinite(n) ? toBase(quantity, value.u, n) : Number.NaN;
}

/** Percent box to a fraction. */
export const pct = (v: string) => Number.parseFloat(v) / 100;

const tidy = (n: number) => String(Number(n.toPrecision(5)));

const inputBox =
  "h-11 w-full min-w-0 rounded-l-xl border border-r-0 bg-white/[0.03] px-3.5 font-mono text-[15px] tabular-nums outline-none transition-colors focus:border-warm focus:bg-white/[0.06]";

function Shell({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-mut">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="mt-1.5 text-sm leading-snug text-bad">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="mt-1.5 text-xs leading-snug text-dim">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Number box with a unit picker and an optional slider. Changing the unit converts the number. */
export function QuantityField({
  label,
  quantity,
  value,
  onChange,
  onFocus,
  error,
  hint,
  range,
}: {
  label: string;
  quantity: Quantity;
  value: Q;
  onChange: (next: Q) => void;
  /** Called when the field gains focus, so the diagram can light up its part. */
  onFocus?: () => void;
  error?: string;
  hint?: string;
  /** Slider limits in internal units. */
  range?: [number, number];
}) {
  const id = useId();
  const current = base(quantity, value);
  const switchUnit = (u: string) => onChange({ u, v: Number.isFinite(current) ? tidy(fromBase(quantity, u, current)) : value.v });
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <div className="flex">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="any"
          value={value.v}
          onChange={(e) => onChange({ ...value, v: e.target.value })}
          onFocus={onFocus}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          className={`${inputBox} ${error ? "border-bad" : "border-line"}`}
        />
        <select
          value={value.u}
          onChange={(e) => switchUnit(e.target.value)}
          onFocus={onFocus}
          aria-label={`${label} unit`}
          className={`h-11 shrink-0 rounded-r-xl border bg-panel-2 px-2.5 text-sm text-mut outline-none focus:border-warm ${error ? "border-bad" : "border-line"}`}
        >
          {unitsOf(quantity).map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </div>
      {range && (
        <input
          type="range"
          tabIndex={-1}
          aria-hidden="true"
          min={range[0]}
          max={range[1]}
          step={(range[1] - range[0]) / 400}
          value={Number.isFinite(current) ? Math.min(range[1], Math.max(range[0], current)) : range[0]}
          onChange={(e) => onChange({ ...value, v: tidy(fromBase(quantity, value.u, Number(e.target.value))) })}
          onPointerDown={onFocus}
          className="mt-3 w-full"
        />
      )}
    </Shell>
  );
}

/** Percentage box with an optional slider. */
export function PercentField({
  label,
  value,
  onChange,
  onFocus,
  error,
  hint,
  range,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onFocus?: () => void;
  error?: string;
  hint?: string;
  range?: [number, number];
}) {
  const id = useId();
  const n = Number.parseFloat(value);
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <div className="flex">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          className={`${inputBox} ${error ? "border-bad" : "border-line"}`}
        />
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-r-xl border bg-panel-2 text-sm text-mut ${error ? "border-bad" : "border-line"}`}>%</span>
      </div>
      {range && (
        <input
          type="range"
          tabIndex={-1}
          aria-hidden="true"
          min={range[0]}
          max={range[1]}
          step={0.5}
          value={Number.isFinite(n) ? Math.min(range[1], Math.max(range[0], n)) : range[0]}
          onChange={(e) => onChange(e.target.value)}
          onPointerDown={onFocus}
          className="mt-3 w-full"
        />
      )}
    </Shell>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; locked?: boolean }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl border border-line bg-white/[0.02] p-1 text-sm">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-lg px-4 py-1.5 transition-colors ${value === o.id ? "bg-ink font-medium text-bg" : "text-mut hover:text-ink"}`}
        >
          {o.label}
          {o.locked && <span className="ml-1.5 text-xs opacity-70">🔒</span>}
        </button>
      ))}
    </div>
  );
}

/** A numbered step of the form. Lights up while one of its fields has focus. */
export function Step({ n, title, note, active, children }: { n: number; title: string; note?: string; active?: boolean; children: React.ReactNode }) {
  return (
    <section className={`card p-5 transition-colors sm:p-6 ${active ? "border-warm/50" : ""}`}>
      <header className="mb-5 flex items-center gap-3">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-xs ${active ? "border-warm text-warm" : "border-line text-dim"}`}>{n}</span>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {note && <p className="text-xs text-dim">{note}</p>}
        </div>
      </header>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** First message per field from the engine's issue list. */
export function errorsOf(result: { ok: boolean; issues?: { field: string; message: string }[] }): Record<string, string> {
  const out: Record<string, string> = {};
  if (!result.ok && result.issues) for (const i of result.issues) if (!out[i.field]) out[i.field] = i.message;
  return out;
}
