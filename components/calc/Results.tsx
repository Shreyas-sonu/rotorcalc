/** Formats a number the Indian way, or a dash when it is not a number. */
export const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }) : "–");

export function Headline({ label, value, unit, sub, tone = "warm" }: { label: string; value: string; unit: string; sub?: string; tone?: "warm" | "cool" | "ok" }) {
  const color = tone === "cool" ? "text-cool" : tone === "ok" ? "text-ok" : "steam-text";
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.14em] text-dim">{label}</div>
      <div className="mt-1 flex items-baseline gap-2.5">
        <span className={`font-mono text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl ${color}`}>{value}</span>
        <span className="text-xl text-mut">{unit}</span>
      </div>
      {sub && <div className="mt-1.5 font-mono text-sm tabular-nums text-mut">{sub}</div>}
    </div>
  );
}

export function Figures({ items }: { items: { label: string; value: string; tone?: "cool" | "bad" }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="bg-panel px-4 py-3.5">
          <dt className="text-xs text-dim">{i.label}</dt>
          <dd className={`mt-1 font-mono text-[15px] font-semibold tabular-nums ${i.tone === "cool" ? "text-cool" : i.tone === "bad" ? "text-bad" : ""}`}>{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Where the power goes: each bar is what is left after the loss before it. */
export function Chain({ title = "Where the power goes", steps }: { title?: string; steps: { label: string; value: number; note?: string }[] }) {
  const top = Math.max(...steps.map((s) => s.value), 1e-9);
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="grid gap-3">
        {steps.map((s, i) => (
          <div key={s.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-mut">
                {s.label}
                {s.note && <span className="ml-2 text-xs text-dim">{s.note}</span>}
              </span>
              <span className="font-mono tabular-nums">
                {fmt(s.value, 0)} kW<span className="ml-2 text-xs text-dim">{fmt((s.value / top) * 100, 1)} %</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${i === steps.length - 1 ? "bg-ok" : "steam-line"}`}
                style={{ width: `${Math.max(0, Math.min(100, (s.value / top) * 100))}%`, opacity: i === steps.length - 1 ? 1 : 0.55 + (0.45 * i) / steps.length }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PropTable({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <dl className="text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line/70 py-2 last:border-0">
            <dt className="text-mut">{k}</dt>
            <dd className="text-right font-mono tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="grid gap-2">
      {items.map((w) => (
        <li key={w} className="flex gap-3 rounded-xl border border-warm/35 bg-warm/[0.08] px-4 py-3 text-sm leading-relaxed text-warm">
          <span aria-hidden="true">⚠</span>
          {w}
        </li>
      ))}
    </ul>
  );
}

/** Shown in place of results while the inputs cannot be calculated. */
export function Blocked({ issues }: { issues: { field: string; message: string }[] }) {
  return (
    <div className="rounded-xl border border-line bg-ink/[0.02] p-5">
      <div className="text-sm font-semibold">Fix {issues.length === 1 ? "one thing" : `${issues.length} things`} to see the result</div>
      <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-mut">
        {issues.map((i) => (
          <li key={i.field + i.message} className="flex gap-2.5">
            <span className="text-bad">•</span>
            {i.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
