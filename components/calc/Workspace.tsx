"use client";

import { useState, useTransition } from "react";
import { saveCalculation } from "@/app/app/actions";
import type { CalculatorId } from "@/lib/plans";

export type Saved = { id: string; name: string; inputs: Record<string, unknown> } | null;

/** Name box and Save button. Saving again updates the same record. */
function SaveBar({ kind, saved, inputs, summary, canSave }: { kind: CalculatorId; saved: Saved; inputs: Record<string, unknown>; summary: string; canSave: boolean }) {
  const [name, setName] = useState(saved?.name ?? "");
  const [id, setId] = useState(saved?.id);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const result = await saveCalculation({ id, kind, name, summary, inputs });
      if (result.ok) {
        setId(result.id);
        setNote({ tone: "ok", text: "Saved" });
      } else setNote({ tone: "bad", text: result.error ?? "Could not save." });
    });
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setNote(null);
        }}
        placeholder="Name this calculation, e.g. TG-2 at full load"
        aria-label="Calculation name"
        maxLength={120}
        className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-ink/[0.03] px-3.5 text-sm outline-none placeholder:text-dim focus:border-warm"
      />
      <button type="button" onClick={save} disabled={pending || !canSave || !name.trim()} className="btn-hot h-10 rounded-xl px-4 text-sm">
        {pending ? "Saving…" : id ? "Save changes" : "Save"}
      </button>
      <button type="button" onClick={() => window.print()} className="btn-ghost h-10 rounded-xl px-4 text-sm text-mut">
        Print
      </button>
      {note && (
        <span role="status" className={`w-full text-sm ${note.tone === "ok" ? "text-ok" : "text-bad"}`}>
          {note.text}
        </span>
      )}
    </div>
  );
}

/** Calculator page frame: the form on the left, the live diagram and results beside it. */
export function Workspace({
  kind,
  title,
  lead,
  toolbar,
  form,
  diagram,
  results,
  saved,
  inputs,
  summary,
  canSave,
}: {
  kind: CalculatorId;
  title: string;
  lead: string;
  toolbar?: React.ReactNode;
  form: React.ReactNode;
  diagram: React.ReactNode;
  results: React.ReactNode;
  saved: Saved;
  inputs: Record<string, unknown>;
  summary: string;
  canSave: boolean;
}) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-mut">{lead}</p>
        </div>
        {toolbar}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="order-2 grid gap-4 xl:order-1">{form}</div>
        {/* On wide screens this column fills the window: the diagram stays in view and the results scroll under it. */}
        <div className="order-1 grid gap-4 xl:sticky xl:top-[76px] xl:order-2 xl:flex xl:h-[calc(100vh-92px)] xl:flex-col">
          <div className="card shrink-0 overflow-hidden">
            <div className="steam-line h-[2px] opacity-70" />
            <div className="p-3 sm:px-5 sm:py-3 [&>svg]:mx-auto [&>svg]:xl:max-h-[36vh]">{diagram}</div>
          </div>
          <div className="card xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
            <div className="grid gap-6 p-5 sm:p-7">
              {results}
              <SaveBar kind={kind} saved={saved} inputs={inputs} summary={summary} canSave={canSave} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
