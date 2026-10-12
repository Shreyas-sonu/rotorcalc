// Unit conversions. Internal units: MPa (absolute), K, kg/s, kW.

export const ATM = 0.101325;
const KGCM2 = 0.0980665;

export const UNITS = {
  pressure: {
    "kg/cm²(a)": { to: (v: number) => v * KGCM2, from: (v: number) => v / KGCM2 },
    "kg/cm²(g)": { to: (v: number) => v * KGCM2 + ATM, from: (v: number) => (v - ATM) / KGCM2 },
    "bar(a)": { to: (v: number) => v / 10, from: (v: number) => v * 10 },
    "bar(g)": { to: (v: number) => v / 10 + ATM, from: (v: number) => (v - ATM) * 10 },
    "MPa(a)": { to: (v: number) => v, from: (v: number) => v },
    "psi(a)": { to: (v: number) => v * 0.00689476, from: (v: number) => v / 0.00689476 },
    "psi(g)": { to: (v: number) => v * 0.00689476 + ATM, from: (v: number) => (v - ATM) / 0.00689476 },
  },
  temperature: {
    "°C": { to: (v: number) => v + 273.15, from: (v: number) => v - 273.15 },
    "°F": { to: (v: number) => (v - 32) / 1.8 + 273.15, from: (v: number) => (v - 273.15) * 1.8 + 32 },
    K: { to: (v: number) => v, from: (v: number) => v },
  },
  flow: {
    TPH: { to: (v: number) => v / 3.6, from: (v: number) => v * 3.6 },
    "kg/h": { to: (v: number) => v / 3600, from: (v: number) => v * 3600 },
    "kg/s": { to: (v: number) => v, from: (v: number) => v },
    "lb/h": { to: (v: number) => (v * 0.45359237) / 3600, from: (v: number) => (v * 3600) / 0.45359237 },
  },
  power: {
    kW: { to: (v: number) => v, from: (v: number) => v },
    MW: { to: (v: number) => v * 1000, from: (v: number) => v / 1000 },
    "hp (metric)": { to: (v: number) => v * 0.7355, from: (v: number) => v / 0.7355 },
  },
} as const;

export type Quantity = keyof typeof UNITS;
export type UnitOf<Q extends Quantity> = keyof (typeof UNITS)[Q];

type Conv = { to: (v: number) => number; from: (v: number) => number };
const table = UNITS as unknown as Record<Quantity, Record<string, Conv>>;

export function unitsOf(q: Quantity): string[] {
  return Object.keys(table[q]);
}

/** Convert a value in the given unit to the internal unit. */
export function toBase(q: Quantity, unit: string, value: number): number {
  return table[q][unit].to(value);
}

/** Convert a value in the internal unit to the given unit. */
export function fromBase(q: Quantity, unit: string, value: number): number {
  return table[q][unit].from(value);
}
