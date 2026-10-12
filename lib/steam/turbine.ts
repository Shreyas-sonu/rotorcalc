// Turbine calculations. All inputs are in internal units: MPa (absolute), K, kg/s, kW, fractions 0..1.

import {
  P_MIN,
  P_SAT_MAX,
  isSuperheated,
  region2,
  saturation,
  solveT,
  stateFromPH,
  stateFromPS,
  tsat,
  type SteamState,
} from "./if97";

export type Issue = { field: string; message: string };
export type Result<T> = ({ ok: true; warnings: string[] } & T) | { ok: false; issues: Issue[] };

export type Expansion = {
  h1: number;
  s1: number;
  /** Ideal (isentropic) exhaust condition. */
  ideal: SteamState;
  /** Isentropic enthalpy drop, kJ/kg. */
  dh: number;
  /** Saturation temperature at the exhaust pressure, K. */
  tsat2: number;
};

function num(issues: Issue[], field: string, v: number, label: string, min = 0): boolean {
  if (!Number.isFinite(v)) {
    issues.push({ field, message: `Enter ${label}.` });
    return false;
  }
  if (v <= min) {
    issues.push({ field, message: `${label[0].toUpperCase()}${label.slice(1)} must be above ${min}.` });
    return false;
  }
  return true;
}

function fraction(issues: Issue[], field: string, v: number, label: string): boolean {
  if (!Number.isFinite(v) || v <= 0 || v > 1) {
    issues.push({ field, message: `${label} must be between 0 and 100 %.` });
    return false;
  }
  return true;
}

/** Checks the steam conditions shared by every turbine calculator. */
export function checkSteam(p1: number, T1: number, p2: number): Issue[] {
  const issues: Issue[] = [];
  const okP1 = num(issues, "p1", p1, "the inlet pressure");
  const okT1 = num(issues, "t1", T1, "the inlet temperature");
  const okP2 = num(issues, "p2", p2, "the exhaust pressure");
  if (okP1 && okT1 && !isSuperheated(p1, T1)) {
    const wet = p1 < 22.064 && T1 <= tsat(Math.max(p1, P_MIN)) + 0.01;
    issues.push({
      field: "t1",
      message: wet
        ? `Inlet steam is not superheated: at this pressure steam saturates at ${(tsat(p1) - 273.15).toFixed(1)} °C. Raise the temperature or lower the pressure.`
        : "These inlet conditions are outside the supported range (up to 800 °C; very high pressures need a higher temperature).",
    });
  }
  if (okP2 && p2 < P_MIN) issues.push({ field: "p2", message: "Exhaust pressure is below the range of the steam tables." });
  if (okP2 && p2 > P_SAT_MAX)
    issues.push({ field: "p2", message: "Exhaust pressure is too high for this calculator (limit about 165 bar)." });
  if (okP1 && okP2 && p2 >= p1)
    issues.push({ field: "p2", message: "Exhaust pressure must be lower than the inlet pressure." });
  return issues;
}

/** Isentropic expansion from superheated (p1, T1) down to p2. Exact for wet exhaust. */
export function expand(p1: number, T1: number, p2: number): Expansion {
  const inlet = region2(p1, T1);
  const ideal = stateFromPS(p2, inlet.s);
  return { h1: inlet.h, s1: inlet.s, ideal, dh: inlet.h - ideal.h, tsat2: tsat(p2) };
}

function wetNote(state: SteamState, what: string): string | null {
  if (state.phase !== "wet") return null;
  const pct = (state.x * 100).toFixed(1);
  return state.x < 0.88
    ? `${what} is wet steam at ${pct} % dryness. Below about 88 % blade erosion becomes a concern.`
    : `${what} is wet steam at ${pct} % dryness.`;
}

// ── Power ───────────────────────────────────────────────────────────────────
export type PowerInput = {
  flow: number;
  p1: number;
  T1: number;
  p2: number;
} & (
  | { mode: "basic"; etaOverall: number }
  | {
      mode: "advanced";
      etaIsentropic: number;
      etaMechanical: number;
      etaGearbox: number;
      etaGenerator: number;
      /** Inlet valve pressure drop as a fraction of inlet pressure. */
      valveDrop: number;
      /** Gland leakage as a fraction of steam flow. */
      glandLeak: number;
    }
);

export type PowerOutput = {
  expansion: Expansion;
  /** Efficiency from ideal steam power to generator terminals. */
  etaOverall: number;
  /** flow x isentropic drop, kW. */
  idealPower: number;
  /** Power the steam gives to the rotor, kW (advanced mode only). */
  steamPower: number | null;
  /** Power at the turbine coupling, kW (advanced mode only). */
  shaftPower: number | null;
  /** Generator output, kW. */
  electricalPower: number;
  /** kg of steam per kWh generated. */
  steamRate: number;
  /** Real exhaust condition (advanced mode only). */
  exhaust: SteamState | null;
  /** Pressure and temperature after the inlet valve (advanced mode only). */
  afterValve: { p: number; T: number } | null;
};

export function power(input: PowerInput): Result<PowerOutput> {
  const issues = checkSteam(input.p1, input.T1, input.p2);
  num(issues, "flow", input.flow, "the steam flow");
  if (input.mode === "basic") {
    fraction(issues, "etaOverall", input.etaOverall, "Overall efficiency");
  } else {
    fraction(issues, "etaIsentropic", input.etaIsentropic, "Isentropic efficiency");
    fraction(issues, "etaMechanical", input.etaMechanical, "Mechanical efficiency");
    fraction(issues, "etaGearbox", input.etaGearbox, "Gearbox efficiency");
    fraction(issues, "etaGenerator", input.etaGenerator, "Generator efficiency");
    if (!(input.valveDrop >= 0 && input.valveDrop < 0.5))
      issues.push({ field: "valveDrop", message: "Valve pressure drop must be between 0 and 50 %." });
    if (!(input.glandLeak >= 0 && input.glandLeak < 0.5))
      issues.push({ field: "glandLeak", message: "Gland leakage must be between 0 and 50 %." });
  }
  if (issues.length) return { ok: false, issues };

  const warnings: string[] = [];
  if (input.mode === "basic") {
    const expansion = expand(input.p1, input.T1, input.p2);
    const idealPower = input.flow * expansion.dh;
    const electricalPower = idealPower * input.etaOverall;
    const note = wetNote(expansion.ideal, "The ideal exhaust");
    if (note) warnings.push(note);
    return {
      ok: true,
      warnings,
      expansion,
      etaOverall: input.etaOverall,
      idealPower,
      steamPower: null,
      shaftPower: null,
      electricalPower,
      steamRate: (input.flow * 3600) / electricalPower,
      exhaust: null,
      afterValve: null,
    };
  }

  // The inlet valve throttles at constant enthalpy, so the steam cools slightly as it loses pressure.
  const h1 = region2(input.p1, input.T1).h;
  const pv = input.p1 * (1 - input.valveDrop);
  if (pv <= input.p2)
    return { ok: false, issues: [{ field: "valveDrop", message: "After the valve drop the pressure is not above the exhaust pressure." }] };
  const Tv = input.valveDrop > 0 ? solveT(pv, h1, "h") : input.T1;
  const expansion = expand(pv, Tv, input.p2);
  const flow = input.flow * (1 - input.glandLeak);
  const idealPower = flow * expansion.dh;
  const steamPower = idealPower * input.etaIsentropic;
  const shaftPower = steamPower * input.etaMechanical;
  const electricalPower = shaftPower * input.etaGearbox * input.etaGenerator;
  const exhaust = stateFromPH(input.p2, expansion.h1 - expansion.dh * input.etaIsentropic);
  const note = wetNote(exhaust, "The exhaust");
  if (note) warnings.push(note);
  return {
    ok: true,
    warnings,
    expansion,
    etaOverall: input.etaIsentropic * input.etaMechanical * input.etaGearbox * input.etaGenerator,
    idealPower,
    steamPower,
    shaftPower,
    electricalPower,
    steamRate: (input.flow * 3600) / electricalPower,
    exhaust,
    afterValve: { p: pv, T: Tv },
  };
}

// ── Efficiency from measured outlet conditions ──────────────────────────────
export type EfficiencyInput = {
  flow: number;
  p1: number;
  T1: number;
  p2: number;
  /** Measured exhaust temperature, K. */
  T2: number;
  /** Measured generator output, kW. Leave undefined if not known. */
  measuredPower?: number;
};

export type EfficiencyOutput = {
  expansion: Expansion;
  h2: number;
  /** Actual enthalpy drop, kJ/kg. */
  dhActual: number;
  etaIsentropic: number;
  /** flow x actual drop: power the steam gave to the rotor, kW. */
  steamPower: number;
  idealPower: number;
  /** Generator output / ideal steam power, when a measured output is given. */
  etaOverall: number | null;
  /** Generator output / steam power: mechanical, gearbox and generator combined. */
  etaDriveTrain: number | null;
  /** Exhaust superheat above saturation, K. */
  superheat: number;
};

export function efficiency(input: EfficiencyInput): Result<EfficiencyOutput> {
  const issues = checkSteam(input.p1, input.T1, input.p2);
  num(issues, "flow", input.flow, "the steam flow");
  const okT2 = num(issues, "t2", input.T2, "the exhaust temperature");
  if (okT2 && !issues.some((i) => i.field === "p2")) {
    const ts = tsat(input.p2);
    if (input.T2 < ts + 0.5)
      issues.push({
        field: "t2",
        message: `At this exhaust pressure steam saturates at ${(ts - 273.15).toFixed(1)} °C. A reading at or below that means wet steam, and pressure with temperature cannot tell how wet. Efficiency needs a superheated exhaust reading.`,
      });
    else if (input.T2 >= input.T1) issues.push({ field: "t2", message: "Exhaust temperature must be below the inlet temperature." });
  }
  if (input.measuredPower !== undefined && !(input.measuredPower >= 0))
    issues.push({ field: "measuredPower", message: "Measured output cannot be negative." });
  if (issues.length) return { ok: false, issues };

  const expansion = expand(input.p1, input.T1, input.p2);
  const h2 = region2(input.p2, input.T2).h;
  const dhActual = expansion.h1 - h2;
  const etaIsentropic = dhActual / expansion.dh;
  const steamPower = input.flow * dhActual;
  const idealPower = input.flow * expansion.dh;
  const measured = input.measuredPower && input.measuredPower > 0 ? input.measuredPower : null;
  const warnings: string[] = [];
  if (etaIsentropic > 1)
    warnings.push("Isentropic efficiency above 100 % is not physically possible. Check the exhaust temperature and pressure readings.");
  else if (etaIsentropic < 0.3) warnings.push("Isentropic efficiency is unusually low. Check the exhaust temperature reading.");
  if (measured && measured > steamPower)
    warnings.push("Measured output is higher than the power the steam gave up. Check the flow and power readings.");
  return {
    ok: true,
    warnings,
    expansion,
    h2,
    dhActual,
    etaIsentropic,
    steamPower,
    idealPower,
    etaOverall: measured ? measured / idealPower : null,
    etaDriveTrain: measured ? measured / steamPower : null,
    superheat: input.T2 - expansion.tsat2,
  };
}

// ── Steam flow needed for a power target ────────────────────────────────────
export type FlowInput = { power: number; p1: number; T1: number; p2: number; etaOverall: number };
export type FlowOutput = { expansion: Expansion; flow: number; steamRate: number; idealPower: number };

export function requiredFlow(input: FlowInput): Result<FlowOutput> {
  const issues = checkSteam(input.p1, input.T1, input.p2);
  num(issues, "power", input.power, "the required output");
  fraction(issues, "etaOverall", input.etaOverall, "Overall efficiency");
  if (issues.length) return { ok: false, issues };
  const expansion = expand(input.p1, input.T1, input.p2);
  const flow = input.power / (expansion.dh * input.etaOverall);
  const warnings: string[] = [];
  const note = wetNote(expansion.ideal, "The ideal exhaust");
  if (note) warnings.push(note);
  return { ok: true, warnings, expansion, flow, steamRate: (flow * 3600) / input.power, idealPower: flow * expansion.dh };
}

export { saturation };
