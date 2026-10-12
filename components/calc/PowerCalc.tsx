"use client";

import { useMemo, useState } from "react";
import { Cutaway, type Part } from "@/components/turbine/Cutaway";
import { power } from "@/lib/steam/turbine";
import { fromBase } from "@/lib/steam/units";
import { HsChart } from "./HsChart";
import { Blocked, Chain, Figures, Headline, PropTable, Warnings, fmt } from "./Results";
import { Workspace, type Saved } from "./Workspace";
import { PercentField, QuantityField, Segmented, Step, base, errorsOf, pct, q, type Q } from "./fields";

type Inputs = {
  mode: "basic" | "advanced";
  flow: Q;
  p1: Q;
  t1: Q;
  p2: Q;
  type: "impulse" | "reaction" | "custom";
  etaOverall: string;
  etaIsentropic: string;
  etaMechanical: string;
  etaGearbox: string;
  etaGenerator: string;
  valveDrop: string;
  glandLeak: string;
};

const DEFAULTS: Inputs = {
  mode: "basic",
  flow: q(50, "TPH"),
  p1: q(66, "kg/cm²(a)"),
  t1: q(485, "°C"),
  p2: q(3.5, "kg/cm²(a)"),
  type: "impulse",
  etaOverall: "60",
  etaIsentropic: "70",
  etaMechanical: "98",
  etaGearbox: "97",
  etaGenerator: "96",
  valveDrop: "3",
  glandLeak: "0.5",
};

const TYPICAL = { impulse: "60", reaction: "70" } as const;
const C = (k: number) => k - 273.15;

export function PowerCalc({ saved, advancedAllowed }: { saved: Saved; advancedAllowed: boolean }) {
  const [v, setV] = useState<Inputs>(() => {
    const merged = { ...DEFAULTS, ...((saved?.inputs as Partial<Inputs>) ?? {}) };
    return advancedAllowed ? merged : { ...merged, mode: "basic" };
  });
  const [part, setPart] = useState<Part | null>(null);
  const [step, setStep] = useState(0);
  const set = <K extends keyof Inputs>(k: K, value: Inputs[K]) => setV((p) => ({ ...p, [k]: value }));
  const at = (s: number, p: Part) => () => {
    setStep(s);
    setPart(p);
  };

  const result = useMemo(() => {
    const steam = { flow: base("flow", v.flow), p1: base("pressure", v.p1), T1: base("temperature", v.t1), p2: base("pressure", v.p2) };
    return v.mode === "basic"
      ? power({ ...steam, mode: "basic", etaOverall: pct(v.etaOverall) })
      : power({
          ...steam,
          mode: "advanced",
          etaIsentropic: pct(v.etaIsentropic),
          etaMechanical: pct(v.etaMechanical),
          etaGearbox: pct(v.etaGearbox),
          etaGenerator: pct(v.etaGenerator),
          valveDrop: pct(v.valveDrop),
          glandLeak: pct(v.glandLeak),
        });
  }, [v]);
  const err = errorsOf(result);
  const kw = result.ok ? result.electricalPower : 0;
  const wet = result.ok && (result.exhaust ?? result.expansion.ideal).phase === "wet";
  const flowKg = base("flow", v.flow);
  const T1 = base("temperature", v.t1);

  const exhaustText = (s: { phase: string; T: number; x: number }) => (s.phase === "wet" ? `${fmt(s.x * 100, 1)} % dry` : `${fmt(C(s.T), 1)} °C`);

  return (
    <Workspace
      kind="power"
      title="Power output"
      lead="Generator output from steam flow, inlet conditions and back pressure."
      saved={saved}
      inputs={v}
      summary={result.ok ? `${fmt(kw / 1000, 2)} MW from ${v.flow.v} ${v.flow.u}` : ""}
      canSave={result.ok}
      toolbar={
        <Segmented
          label="Calculation mode"
          value={v.mode}
          onChange={(m) => (m === "advanced" && !advancedAllowed ? undefined : set("mode", m))}
          options={[
            { id: "basic", label: "Basic" },
            { id: "advanced", label: "Advanced", locked: !advancedAllowed },
          ]}
        />
      }
      form={
        <>
          {!advancedAllowed && (
            <p className="rounded-xl border border-line bg-white/[0.02] px-4 py-3 text-sm text-mut">
              Advanced mode sets each loss separately (blades, gearbox, generator, valve, glands). It is part of the Pro plan.{" "}
              <a href="/plans" className="font-medium text-warm hover:underline">
                See plans
              </a>
            </p>
          )}
          <Step n={1} title="Steam inlet" note="What arrives at the turbine stop valve" active={step === 1}>
            <QuantityField label="Steam flow" quantity="flow" value={v.flow} onChange={(x) => set("flow", x)} onFocus={at(1, "inlet")} error={err.flow} range={[1, 40]} />
            <QuantityField label="Inlet pressure" quantity="pressure" value={v.p1} onChange={(x) => set("p1", x)} onFocus={at(1, "inlet")} error={err.p1} range={[1, 12]} />
            <QuantityField label="Inlet temperature" quantity="temperature" value={v.t1} onChange={(x) => set("t1", x)} onFocus={at(1, "inlet")} error={err.t1} range={[473.15, 838.15]} />
            {v.mode === "advanced" && (
              <PercentField label="Inlet valve pressure drop" value={v.valveDrop} onChange={(x) => set("valveDrop", x)} onFocus={at(1, "valve")} error={err.valveDrop} hint="Typical 2 to 5 %" range={[0, 15]} />
            )}
          </Step>
          <Step n={2} title="Exhaust" note="Where the expansion ends" active={step === 2}>
            <QuantityField label="Back pressure" quantity="pressure" value={v.p2} onChange={(x) => set("p2", x)} onFocus={at(2, "exhaust")} error={err.p2} range={[0.005, 1.5]} />
            {v.mode === "advanced" && (
              <PercentField label="Gland leakage" value={v.glandLeak} onChange={(x) => set("glandLeak", x)} onFocus={at(2, "gland")} error={err.glandLeak} hint="Share of steam flow that bypasses the blades" range={[0, 5]} />
            )}
          </Step>
          <Step n={3} title="Machine" note={v.mode === "basic" ? "One overall efficiency, steam to generator terminals" : "Each loss on its own"} active={step === 3}>
            {v.mode === "basic" ? (
              <>
                <div>
                  <label htmlFor="turbine-type" className="mb-1.5 block text-sm text-mut">
                    Turbine type
                  </label>
                  <select
                    id="turbine-type"
                    value={v.type}
                    onFocus={at(3, "blades")}
                    onChange={(e) => {
                      const t = e.target.value as Inputs["type"];
                      setV((p) => ({ ...p, type: t, etaOverall: t === "custom" ? p.etaOverall : TYPICAL[t] }));
                    }}
                    className="h-11 w-full rounded-xl border border-line bg-panel-2 px-3 text-[15px] outline-none focus:border-warm"
                  >
                    <option value="impulse">Impulse (typical 60 %)</option>
                    <option value="reaction">Reaction (typical 70 %)</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <PercentField
                  label="Overall efficiency"
                  value={v.etaOverall}
                  onChange={(x) => setV((p) => ({ ...p, etaOverall: x, type: "custom" }))}
                  onFocus={at(3, "blades")}
                  error={err.etaOverall}
                  hint="Use the maker's figure if you have it"
                  range={[30, 90]}
                />
              </>
            ) : (
              <>
                <PercentField label="Isentropic efficiency" value={v.etaIsentropic} onChange={(x) => set("etaIsentropic", x)} onFocus={at(3, "blades")} error={err.etaIsentropic} hint="Blades and nozzles" range={[40, 95]} />
                <PercentField label="Mechanical efficiency" value={v.etaMechanical} onChange={(x) => set("etaMechanical", x)} onFocus={at(3, "gland")} error={err.etaMechanical} hint="Bearings and seals" range={[90, 100]} />
                <PercentField label="Gearbox efficiency" value={v.etaGearbox} onChange={(x) => set("etaGearbox", x)} onFocus={at(3, "gearbox")} error={err.etaGearbox} hint="100 if direct drive" range={[90, 100]} />
                <PercentField label="Generator efficiency" value={v.etaGenerator} onChange={(x) => set("etaGenerator", x)} onFocus={at(3, "generator")} error={err.etaGenerator} range={[90, 100]} />
              </>
            )}
          </Step>
        </>
      }
      diagram={
        <Cutaway
          className="w-full"
          active={part}
          flow={Number.isFinite(flowKg) ? Math.min(1, flowKg / 35) : 0.3}
          heat={Number.isFinite(T1) ? Math.min(1, Math.max(0, (T1 - 523) / 300)) : 0.5}
          load={Math.min(1, kw / 15000)}
          wet={wet}
          showGearbox={v.mode === "advanced" ? pct(v.etaGearbox) < 1 : true}
          labels={{
            inlet: `${v.p1.v} ${v.p1.u} · ${v.t1.v} ${v.t1.u}`,
            exhaust: `${v.p2.v} ${v.p2.u}`,
            generator: result.ok ? `${fmt(kw / 1000, 2)} MW` : undefined,
            blades: result.ok ? `Δh ${fmt(result.expansion.dh, 0)} kJ/kg` : undefined,
          }}
        />
      }
      results={
        result.ok ? (
          <>
            <Headline label="Generator output" value={fmt(kw / 1000, 3)} unit="MW" sub={`${fmt(kw, 0)} kW  ·  ${fmt(fromBase("power", "hp (metric)", kw), 0)} hp`} />
            <Figures
              items={[
                { label: "Isentropic drop", value: `${fmt(result.expansion.dh, 1)} kJ/kg` },
                { label: "Steam rate", value: `${fmt(result.steamRate, 2)} kg/kWh` },
                { label: "Overall efficiency", value: `${fmt(result.etaOverall * 100, 1)} %` },
                result.exhaust
                  ? { label: "Exhaust", value: exhaustText(result.exhaust), tone: result.exhaust.phase === "wet" ? "cool" : undefined }
                  : { label: "Ideal exhaust", value: exhaustText(result.expansion.ideal), tone: result.expansion.ideal.phase === "wet" ? "cool" : undefined },
              ]}
            />
            <Warnings items={result.warnings} />
            <Chain
              steps={
                result.steamPower !== null && result.shaftPower !== null
                  ? [
                      { label: "Ideal steam power", value: result.idealPower, note: "flow × isentropic drop" },
                      { label: "Given to the rotor", value: result.steamPower, note: "after blade losses" },
                      { label: "At the coupling", value: result.shaftPower, note: "after bearings" },
                      { label: "Generator output", value: result.electricalPower, note: "after gearbox and generator" },
                    ]
                  : [
                      { label: "Ideal steam power", value: result.idealPower, note: "flow × isentropic drop" },
                      { label: "Generator output", value: result.electricalPower, note: "after all losses" },
                    ]
              }
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <PropTable
                title="Steam properties"
                rows={[
                  ["Inlet enthalpy h₁", `${fmt(result.expansion.h1, 1)} kJ/kg`],
                  ["Inlet entropy s₁", `${fmt(result.expansion.s1, 4)} kJ/(kg·K)`],
                  ...(result.afterValve ? ([["After the inlet valve", `${fmt(result.afterValve.p * 10, 2)} bar(a) · ${fmt(C(result.afterValve.T), 1)} °C`]] as [string, string][]) : []),
                  ["Ideal exhaust enthalpy h₂ₛ", `${fmt(result.expansion.ideal.h, 1)} kJ/kg`],
                  ["Ideal exhaust", exhaustText(result.expansion.ideal)],
                  ["Boiling point at exhaust", `${fmt(C(result.expansion.tsat2), 1)} °C`],
                  ...(result.exhaust ? ([["Actual exhaust enthalpy h₂", `${fmt(result.exhaust.h, 1)} kJ/kg`]] as [string, string][]) : []),
                ]}
              />
              <div>
                <h3 className="mb-2 text-sm font-semibold">Expansion on the h-s chart</h3>
                <HsChart p1={result.afterValve?.p ?? base("pressure", v.p1)} p2={base("pressure", v.p2)} inlet={{ h: result.expansion.h1, s: result.expansion.s1 }} ideal={result.expansion.ideal} actual={result.exhaust} />
              </div>
            </div>
          </>
        ) : (
          <Blocked issues={result.issues} />
        )
      }
    />
  );
}
