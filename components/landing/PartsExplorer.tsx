"use client";

import { useState } from "react";
import { Cutaway, type Part } from "@/components/turbine/Cutaway";

const PARTS: { id: Part; title: string; text: string; inputs: string }[] = [
  { id: "inlet", title: "Steam inlet", text: "Pressure and temperature here fix how much energy each kilogram of steam carries in.", inputs: "Inlet pressure · inlet temperature · steam flow" },
  { id: "valve", title: "Inlet valve", text: "Throttling costs pressure but not energy. RotorCalc holds enthalpy constant across the valve, as the physics does.", inputs: "Valve pressure drop" },
  { id: "blades", title: "Blade stages", text: "Steam expands and turns the rotor. Isentropic efficiency says how much of the ideal drop the blades capture.", inputs: "Turbine type · isentropic efficiency" },
  { id: "gland", title: "Gland seals", text: "A little steam escapes along the shaft and does no work. Account for it instead of guessing.", inputs: "Gland leakage" },
  { id: "exhaust", title: "Exhaust", text: "Back pressure sets where expansion stops. If the steam turns wet, you see the dryness fraction, not an approximation.", inputs: "Back pressure · measured outlet temperature" },
  { id: "gearbox", title: "Gearbox", text: "Mechanical and gearbox losses come off the shaft power before it reaches the generator.", inputs: "Mechanical efficiency · gearbox efficiency" },
  { id: "generator", title: "Generator", text: "What is left becomes electricity at the terminals: the number you are actually paid for.", inputs: "Generator efficiency · measured output" },
];

/** Hover or tap a part to see what it does and which inputs belong to it. */
export function PartsExplorer() {
  const [active, setActive] = useState<Part>("blades");
  const part = PARTS.find((p) => p.id === active)!;
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
      <ul className="grid gap-1.5">
        {PARTS.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onMouseEnter={() => setActive(p.id)}
              onFocus={() => setActive(p.id)}
              onClick={() => setActive(p.id)}
              aria-pressed={active === p.id}
              className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors ${
                active === p.id ? "border-brand/50 bg-brand/[0.07]" : "border-transparent hover:bg-ink/[0.04]"
              }`}
            >
              <span className={`font-mono text-xs tabular-nums ${active === p.id ? "text-brand" : "text-dim"}`}>0{i + 1}</span>
              <span className={`font-medium ${active === p.id ? "text-ink" : "text-mut"}`}>{p.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="card p-4 sm:p-6">
        <Cutaway active={active} flow={0.6} heat={0.75} load={0.6} className="w-full" />
        <div className="mt-2 border-t border-line pt-5">
          <h3 className="text-lg font-semibold">{part.title}</h3>
          <p className="mt-1.5 leading-relaxed text-mut">{part.text}</p>
          <p className="mt-3 text-sm">
            <span className="text-dim">You enter: </span>
            <span className="text-brand">{part.inputs}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
