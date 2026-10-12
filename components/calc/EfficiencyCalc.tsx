"use client";

import { useMemo, useState } from "react";
import { Cutaway, type Part } from "@/components/turbine/Cutaway";
import { region2 } from "@/lib/steam/if97";
import { efficiency } from "@/lib/steam/turbine";
import { HsChart } from "./HsChart";
import { Blocked, Chain, Figures, Headline, PropTable, Warnings, fmt } from "./Results";
import { Workspace, type Saved } from "./Workspace";
import { QuantityField, Step, base, errorsOf, q, type Q } from "./fields";

type Inputs = { flow: Q; p1: Q; t1: Q; p2: Q; t2: Q; measured: Q };

const DEFAULTS: Inputs = {
  flow: q(50, "TPH"),
  p1: q(66, "kg/cm²(a)"),
  t1: q(485, "°C"),
  p2: q(3.5, "kg/cm²(a)"),
  t2: q(175, "°C"),
  measured: q("", "kW"),
};

export function EfficiencyCalc({ saved }: { saved: Saved }) {
  const [v, setV] = useState<Inputs>(() => ({ ...DEFAULTS, ...((saved?.inputs as Partial<Inputs>) ?? {}) }));
  const [part, setPart] = useState<Part | null>(null);
  const [step, setStep] = useState(0);
  const set = <K extends keyof Inputs>(k: K, value: Inputs[K]) => setV((p) => ({ ...p, [k]: value }));
  const at = (s: number, p: Part) => () => {
    setStep(s);
    setPart(p);
  };

  const result = useMemo(() => {
    const measured = base("power", v.measured);
    return efficiency({
      flow: base("flow", v.flow),
      p1: base("pressure", v.p1),
      T1: base("temperature", v.t1),
      p2: base("pressure", v.p2),
      T2: base("temperature", v.t2),
      measuredPower: Number.isFinite(measured) ? measured : undefined,
    });
  }, [v]);
  const err = errorsOf(result);
  const flowKg = base("flow", v.flow);
  const T1 = base("temperature", v.t1);
  const measured = base("power", v.measured);

  return (
    <Workspace
      kind="efficiency"
      title="Efficiency"
      lead="Isentropic and overall efficiency from the readings you already log."
      saved={saved}
      inputs={v}
      summary={result.ok ? `${fmt(result.etaIsentropic * 100, 1)} % isentropic` : ""}
      canSave={result.ok}
      form={
        <>
          <Step n={1} title="Steam inlet" note="Readings at the turbine stop valve" active={step === 1}>
            <QuantityField label="Steam flow" quantity="flow" value={v.flow} onChange={(x) => set("flow", x)} onFocus={at(1, "inlet")} error={err.flow} range={[1, 40]} />
            <QuantityField label="Inlet pressure" quantity="pressure" value={v.p1} onChange={(x) => set("p1", x)} onFocus={at(1, "inlet")} error={err.p1} range={[1, 12]} />
            <QuantityField label="Inlet temperature" quantity="temperature" value={v.t1} onChange={(x) => set("t1", x)} onFocus={at(1, "inlet")} error={err.t1} range={[473.15, 838.15]} />
          </Step>
          <Step n={2} title="Exhaust" note="Readings at the turbine outlet" active={step === 2}>
            <QuantityField label="Exhaust pressure" quantity="pressure" value={v.p2} onChange={(x) => set("p2", x)} onFocus={at(2, "exhaust")} error={err.p2} range={[0.05, 1.5]} />
            <QuantityField
              label="Exhaust temperature"
              quantity="temperature"
              value={v.t2}
              onChange={(x) => set("t2", x)}
              onFocus={at(2, "exhaust")}
              error={err.t2}
              hint="Must be above the boiling point at exhaust pressure"
              range={[373.15, 673.15]}
            />
          </Step>
          <Step n={3} title="Generator" note="Optional: adds overall and drive-train efficiency" active={step === 3}>
            <QuantityField label="Measured output" quantity="power" value={v.measured} onChange={(x) => set("measured", x)} onFocus={at(3, "generator")} error={err.measuredPower} hint="Leave empty if you only want blade efficiency" />
          </Step>
        </>
      }
      diagram={
        <Cutaway
          className="w-full"
          active={part}
          flow={Number.isFinite(flowKg) ? Math.min(1, flowKg / 35) : 0.3}
          heat={Number.isFinite(T1) ? Math.min(1, Math.max(0, (T1 - 523) / 300)) : 0.5}
          load={result.ok ? Math.min(1, result.steamPower / 15000) : 0.3}
          labels={{
            inlet: `${v.p1.v} ${v.p1.u} · ${v.t1.v} ${v.t1.u}`,
            exhaust: `${v.p2.v} ${v.p2.u} · ${v.t2.v} ${v.t2.u}`,
            blades: result.ok ? `η ${fmt(result.etaIsentropic * 100, 1)} %` : undefined,
            generator: Number.isFinite(measured) && measured > 0 ? `${fmt(measured / 1000, 2)} MW` : undefined,
          }}
        />
      }
      results={
        result.ok ? (
          <>
            <Headline label="Isentropic efficiency" value={fmt(result.etaIsentropic * 100, 1)} unit="%" sub={`${fmt(result.dhActual, 1)} of ${fmt(result.expansion.dh, 1)} kJ/kg captured by the blades`} />
            <Figures
              items={[
                { label: "Actual drop", value: `${fmt(result.dhActual, 1)} kJ/kg` },
                { label: "Ideal drop", value: `${fmt(result.expansion.dh, 1)} kJ/kg` },
                { label: "Overall efficiency", value: result.etaOverall === null ? "–" : `${fmt(result.etaOverall * 100, 1)} %` },
                { label: "Exhaust superheat", value: `${fmt(result.superheat, 1)} °C` },
              ]}
            />
            <Warnings items={result.warnings} />
            <Chain
              steps={[
                { label: "Ideal steam power", value: result.idealPower, note: "flow × isentropic drop" },
                { label: "Given to the rotor", value: result.steamPower, note: "flow × actual drop" },
                ...(Number.isFinite(measured) && measured > 0 ? [{ label: "Generator output", value: measured, note: "as measured" }] : []),
              ]}
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <PropTable
                title="Steam properties"
                rows={[
                  ["Inlet enthalpy h₁", `${fmt(result.expansion.h1, 1)} kJ/kg`],
                  ["Ideal exhaust enthalpy h₂ₛ", `${fmt(result.expansion.ideal.h, 1)} kJ/kg`],
                  ["Actual exhaust enthalpy h₂", `${fmt(result.h2, 1)} kJ/kg`],
                  ["Boiling point at exhaust", `${fmt(result.expansion.tsat2 - 273.15, 1)} °C`],
                  ["Bearings, gearbox and generator", result.etaDriveTrain === null ? "–" : `${fmt(result.etaDriveTrain * 100, 1)} %`],
                ]}
              />
              <div>
                <h3 className="mb-2 text-sm font-semibold">Expansion on the h-s chart</h3>
                <HsChart
                  p1={base("pressure", v.p1)}
                  p2={base("pressure", v.p2)}
                  inlet={{ h: result.expansion.h1, s: result.expansion.s1 }}
                  ideal={result.expansion.ideal}
                  actual={{ h: result.h2, s: region2(base("pressure", v.p2), base("temperature", v.t2)).s }}
                />
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
