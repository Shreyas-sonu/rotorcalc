// IAPWS-IF97 steam properties: Region 1 (liquid), Region 2 (vapour) and the saturation line.
// Pressures in MPa (absolute), temperatures in K, enthalpy in kJ/kg, entropy in kJ/(kg K), volume in m3/kg.

const R = 0.461526;

export type Props = { h: number; s: number; v: number };

// ── Region 2 (superheated steam) ────────────────────────────────────────────
const J0 = [0, 1, -5, -4, -3, -2, -1, 2, 3];
const N0 = [
  -9.6927686500217, 10.086655968018, -0.005608791128302, 0.071452738081455, -0.40710498223928, 1.4240819171444,
  -4.383951131945, -0.28408632460772, 0.021268463753307,
];
const I2 = [
  1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 5, 6, 6, 6, 7, 7, 7, 8, 8, 9, 10, 10, 10, 16, 16, 18, 20, 20,
  20, 21, 22, 23, 24, 24, 24,
];
const J2 = [
  0, 1, 2, 3, 6, 1, 2, 4, 7, 36, 0, 1, 3, 6, 35, 1, 2, 3, 7, 3, 16, 35, 0, 11, 25, 8, 36, 13, 4, 10, 14, 29, 50, 57,
  20, 35, 48, 21, 53, 39, 26, 40, 58,
];
const N2 = [
  -1.7731742473213e-3, -1.7834862292358e-2, -4.5996013696365e-2, -5.7581259083432e-2, -5.032527872793e-2,
  -3.3032641670203e-5, -1.8948987516315e-4, -3.9392777243355e-3, -4.3797295650573e-2, -2.6674547914087e-5,
  2.0481737692309e-8, 4.3870667284435e-7, -3.227767723857e-5, -1.5033924542148e-3, -4.0668253562649e-2,
  -7.8847309559367e-10, 1.2790717852285e-8, 4.8225372718507e-7, 2.2922076337661e-6, -1.6714766451061e-11,
  -2.1171472321355e-3, -2.3895741934104e1, -5.905956432427e-18, -1.2621808899101e-6, -3.8946842435739e-2,
  1.1256211360459e-11, -8.2311340897998, 1.9809712802088e-8, 1.0406965210174e-19, -1.0234747095929e-13,
  -1.0018179379511e-9, -8.0882908646985e-11, 1.0693031879409e-1, -3.3662250574171e-1, 8.9185845355421e-25,
  3.0629316876232e-13, -4.2002467698208e-6, -5.9056029685639e-26, 3.7826947613457e-6, -1.2768608934681e-15,
  7.3087610595061e-29, 5.5414715350778e-17, -9.436970724121e-7,
];

export function region2(p: number, T: number): Props {
  const tau = 540 / T;
  let g = Math.log(p);
  let gt = 0;
  let gp = 1 / p;
  for (let i = 0; i < J0.length; i++) {
    g += N0[i] * tau ** J0[i];
    gt += N0[i] * J0[i] * tau ** (J0[i] - 1);
  }
  const x = tau - 0.5;
  for (let i = 0; i < N2.length; i++) {
    const pi = p ** I2[i];
    g += N2[i] * pi * x ** J2[i];
    gt += N2[i] * pi * J2[i] * x ** (J2[i] - 1);
    gp += N2[i] * I2[i] * p ** (I2[i] - 1) * x ** J2[i];
  }
  return { h: R * T * tau * gt, s: R * (tau * gt - g), v: (R * T * gp) / 1000 };
}

// ── Region 1 (compressed and saturated liquid) ──────────────────────────────
const I1 = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 8, 8, 21, 23, 29, 30, 31, 32,
];
const J1 = [
  -2, -1, 0, 1, 2, 3, 4, 5, -9, -7, -1, 0, 1, 3, -3, 0, 1, 3, 17, -4, 0, 6, -5, -2, 10, -8, -11, -6, -29, -31, -38,
  -39, -40, -41,
];
const N1 = [
  0.14632971213167, -0.84548187169114, -3.756360367204, 3.3855169168385, -0.95791963387872, 0.15772038513228,
  -0.016616417199501, 8.1214629983568e-4, 2.8319080123804e-4, -6.0706301565874e-4, -0.018990068218419,
  -0.032529748770505, -0.021841717175414, -5.283835796993e-5, -4.7184321073267e-4, -3.0001780793026e-4,
  4.7661393906987e-5, -4.4141845330846e-6, -7.2694996297594e-16, -3.1679644845054e-5, -2.8270797985312e-6,
  -8.5205128120103e-10, -2.2425281908e-6, -6.5171222895601e-7, -1.4341729937924e-13, -4.0516996860117e-7,
  -1.2734301741641e-9, -1.7424871230634e-10, -6.8762131295531e-19, 1.4478307828521e-20, 2.6335781662795e-23,
  -1.1947622640071e-23, 1.8228094581404e-24, -9.3537087292458e-26,
];

export function region1(p: number, T: number): Props {
  const pi = p / 16.53;
  const tau = 1386 / T;
  const a = 7.1 - pi;
  const b = tau - 1.222;
  let g = 0;
  let gt = 0;
  let gp = 0;
  for (let i = 0; i < N1.length; i++) {
    g += N1[i] * a ** I1[i] * b ** J1[i];
    gt += N1[i] * a ** I1[i] * J1[i] * b ** (J1[i] - 1);
    gp -= N1[i] * I1[i] * a ** (I1[i] - 1) * b ** J1[i];
  }
  return { h: R * T * tau * gt, s: R * (tau * gt - g), v: (R * T * pi * gp) / (p * 1000) };
}

// ── Saturation line (Region 4) ──────────────────────────────────────────────
const N4 = [
  1167.0521452767, -724213.16703206, -17.073846940092, 12020.82470247, -3232555.0322333, 14.91510861353,
  -4823.2657361591, 405113.40542057, -0.23855557567849, 650.17534844798,
];

/** Saturation temperature (K) for a pressure in MPa. Valid from 611 Pa to the critical pressure. */
export function tsat(p: number): number {
  const b = p ** 0.25;
  const E = b * b + N4[2] * b + N4[5];
  const F = N4[0] * b * b + N4[3] * b + N4[6];
  const G = N4[1] * b * b + N4[4] * b + N4[7];
  const D = (2 * G) / (-F - Math.sqrt(F * F - 4 * E * G));
  return (N4[9] + D - Math.sqrt((N4[9] + D) ** 2 - 4 * (N4[8] + N4[9] * D))) / 2;
}

/** Saturation pressure (MPa) for a temperature in K. */
export function psat(T: number): number {
  const th = T + N4[8] / (T - N4[9]);
  const A = th * th + N4[0] * th + N4[1];
  const B = N4[2] * th * th + N4[3] * th + N4[4];
  const C = N4[5] * th * th + N4[6] * th + N4[7];
  return ((2 * C) / (-B + Math.sqrt(B * B - 4 * A * C))) ** 4;
}

/** Upper pressure limit of Region 2 above 350 C (the boundary with the near-critical region). */
export function b23(T: number): number {
  return 348.05185628969 - 1.1671859879975 * T + 1.0192970039326e-3 * T * T;
}

export const P_MIN = 0.000611657;
export const P_CRIT = 22.064;
export const T_MAX = 1073.15;
/** Above this pressure the saturated states sit outside Regions 1 and 2. */
export const P_SAT_MAX = 16.529;

export type Saturation = { ts: number; hf: number; sf: number; hg: number; sg: number; vg: number };

export function saturation(p: number): Saturation {
  const ts = tsat(p);
  const f = region1(p, ts);
  const g = region2(p, ts);
  return { ts, hf: f.h, sf: f.s, hg: g.h, sg: g.s, vg: g.v };
}

/** True when (p, T) is superheated steam that Region 2 covers. */
export function isSuperheated(p: number, T: number): boolean {
  if (!(p > 0) || !(T > 0) || T > T_MAX || p > 100) return false;
  if (T <= 623.15) return p < psat(T);
  if (T <= 863.15) return p <= b23(T);
  return true;
}

/** Temperature (K) of superheated steam with the given property value at pressure p. */
export function solveT(p: number, target: number, key: "h" | "s"): number {
  let lo = tsat(p);
  let hi = T_MAX;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (region2(p, mid)[key] < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export type SteamState = {
  phase: "superheated" | "wet" | "liquid";
  T: number;
  h: number;
  s: number;
  /** Dryness fraction, 0 to 1. 1 for superheated steam. */
  x: number;
};

/** Steam condition at pressure p for a known enthalpy (kJ/kg). */
export function stateFromPH(p: number, h: number): SteamState {
  const sat = saturation(p);
  if (h >= sat.hg) {
    const T = solveT(p, h, "h");
    return { phase: "superheated", T, h, s: region2(p, T).s, x: 1 };
  }
  const x = (h - sat.hf) / (sat.hg - sat.hf);
  if (x < 0) return { phase: "liquid", T: sat.ts, h, s: sat.sf, x: 0 };
  return { phase: "wet", T: sat.ts, h, s: sat.sf + x * (sat.sg - sat.sf), x };
}

/** Steam condition at pressure p for a known entropy (kJ/(kg K)). */
export function stateFromPS(p: number, s: number): SteamState {
  const sat = saturation(p);
  if (s >= sat.sg) {
    const T = solveT(p, s, "s");
    return { phase: "superheated", T, h: region2(p, T).h, s, x: 1 };
  }
  const x = (s - sat.sf) / (sat.sg - sat.sf);
  if (x < 0) return { phase: "liquid", T: sat.ts, h: sat.hf, s, x: 0 };
  return { phase: "wet", T: sat.ts, h: sat.hf + x * (sat.hg - sat.hf), s, x };
}
