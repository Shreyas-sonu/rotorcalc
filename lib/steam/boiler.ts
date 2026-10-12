// Boiler steam generation from a fuel mix. Internal units: MPa (absolute), K, kg/s, kJ/kg, fractions 0..1.

import { P_SAT_MAX, isSuperheated, region1, region2, saturation, tsat } from "./if97";
import type { Issue, Result } from "./turbine";

export type Fuel = { name: string; share: number; cv: number };

export const FUELS: Fuel[] = [
  { name: "Bagasse", share: 100, cv: 10032 },
  { name: "Rice husk", share: 0, cv: 13376 },
  { name: "Paddy straw", share: 0, cv: 13376 },
  { name: "Wood chips", share: 0, cv: 12560 },
  { name: "Indian coal", share: 0, cv: 16750 },
];

export type BoilerInput = {
  /** Fuels in the mix. Shares are relative and are normalised to 100 %. */
  fuels: Fuel[];
  /** Fuel firing rate, kg/s. */
  fuelRate: number;
  efficiency: number;
  /** Boiler exit pressure, MPa absolute. */
  p: number;
  /** Boiler exit temperature, K. */
  T: number;
  /** Feed water temperature, K. */
  Tfw: number;
};

export type BoilerOutput = {
  /** Blended calorific value, kJ/kg. */
  cv: number;
  /** Sum of the shares as entered, %. */
  shareTotal: number;
  /** Heat released by the fuel, kW. */
  heatInput: number;
  /** Heat absorbed by the steam, kW. */
  heatToSteam: number;
  hSteam: number;
  hFeed: number;
  /** Steam generated, kg/s. */
  steam: number;
  /** kg of steam per kg of fuel. */
  steamToFuel: number;
};

export function boiler(input: BoilerInput): Result<BoilerOutput> {
  const issues: Issue[] = [];
  const used = input.fuels.filter((f) => f.share > 0);
  const shareTotal = used.reduce((a, f) => a + f.share, 0);
  if (!used.length) issues.push({ field: "fuels", message: "Give at least one fuel a share above 0 %." });
  if (used.some((f) => !(f.cv > 0))) issues.push({ field: "fuels", message: "Every fuel in the mix needs a calorific value above 0." });
  if (!(input.fuelRate > 0)) issues.push({ field: "fuelRate", message: "Enter the fuel firing rate." });
  if (!(input.efficiency > 0 && input.efficiency <= 1))
    issues.push({ field: "efficiency", message: "Boiler efficiency must be between 0 and 100 %." });
  if (!(input.p > 0)) issues.push({ field: "p", message: "Enter the boiler exit pressure." });
  else if (input.p > P_SAT_MAX) issues.push({ field: "p", message: "Boiler pressure is too high for this calculator (limit about 165 bar)." });
  if (!(input.T > 0)) issues.push({ field: "T", message: "Enter the boiler exit temperature." });
  if (!(input.Tfw > 273.15)) issues.push({ field: "Tfw", message: "Feed water temperature must be above 0 °C." });
  if (issues.length) return { ok: false, issues };

  const ts = tsat(input.p);
  if (input.Tfw >= ts)
    return { ok: false, issues: [{ field: "Tfw", message: `Feed water must be cooler than the boiling point at boiler pressure (${(ts - 273.15).toFixed(1)} °C).` }] };

  const warnings: string[] = [];
  let hSteam: number;
  if (isSuperheated(input.p, input.T)) hSteam = region2(input.p, input.T).h;
  else if (input.T > ts - 0.5) {
    hSteam = saturation(input.p).hg;
    warnings.push("Exit temperature is at saturation, so dry saturated steam is assumed.");
  } else {
    return { ok: false, issues: [{ field: "T", message: `Exit temperature is below the boiling point at this pressure (${(ts - 273.15).toFixed(1)} °C).` }] };
  }

  const cv = used.reduce((a, f) => a + f.share * f.cv, 0) / shareTotal;
  const hFeed = region1(input.p, input.Tfw).h;
  const heatInput = input.fuelRate * cv;
  const heatToSteam = heatInput * input.efficiency;
  const steam = heatToSteam / (hSteam - hFeed);
  if (Math.abs(shareTotal - 100) > 0.01) warnings.push(`Shares add up to ${shareTotal.toFixed(1)} %, so the mix is scaled to 100 %.`);
  return { ok: true, warnings, cv, shareTotal, heatInput, heatToSteam, hSteam, hFeed, steam, steamToFuel: steam / input.fuelRate };
}
