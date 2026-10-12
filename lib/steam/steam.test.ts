import { describe, expect, it } from "vitest";
import { b23, psat, region1, region2, saturation, stateFromPH, tsat } from "./if97";
import { efficiency, expand, power, requiredFlow } from "./turbine";
import { FUELS, boiler } from "./boiler";
import { toBase } from "./units";

const P = (v: number, u = "kg/cm²(a)") => toBase("pressure", u, v);
const C = (v: number) => v + 273.15;

describe("IAPWS-IF97 published check values", () => {
  it("region 2 (steam)", () => {
    const rows = [
      [300, 0.0035, 2549.91145, 8.52238967, 39.4913866],
      [700, 0.0035, 3335.68375, 10.1749996, 92.3015898],
      [700, 30, 2631.49474, 5.17540298, 0.00542946619],
    ];
    for (const [T, p, h, s, v] of rows) {
      const r = region2(p, T);
      expect(r.h).toBeCloseTo(h, 4);
      expect(r.s).toBeCloseTo(s, 7);
      expect(r.v / v).toBeCloseTo(1, 7);
    }
  });

  it("region 1 (water)", () => {
    const rows = [
      [300, 3, 115.331273, 0.392294792, 0.00100215168],
      [300, 80, 184.142828, 0.368563852, 0.000971180894],
      [500, 3, 975.542239, 2.58041912, 0.0012024180],
    ];
    for (const [T, p, h, s, v] of rows) {
      const r = region1(p, T);
      expect(r.h).toBeCloseTo(h, 4);
      expect(r.s).toBeCloseTo(s, 7);
      expect(r.v / v).toBeCloseTo(1, 6);
    }
  });

  it("saturation line", () => {
    expect(tsat(0.1)).toBeCloseTo(372.755919, 5);
    expect(tsat(1)).toBeCloseTo(453.035632, 5);
    expect(tsat(10)).toBeCloseTo(584.149488, 5);
    expect(psat(300)).toBeCloseTo(0.00353658941, 9);
    expect(psat(500)).toBeCloseTo(2.63889776, 6);
    expect(psat(600)).toBeCloseTo(12.3443146, 5);
    expect(b23(623.15)).toBeCloseTo(16.5291643, 5);
  });

  it("saturated states agree with steam tables at 1 bar", () => {
    const s = saturation(0.1);
    expect(s.hf).toBeCloseTo(417.44, 1);
    expect(s.hg).toBeCloseTo(2674.95, 1);
    expect(s.sf).toBeCloseTo(1.3026, 3);
    expect(s.sg).toBeCloseTo(7.3588, 3);
    // h_fg = T x s_fg must hold on the saturation line.
    expect((s.hg - s.hf) / (s.ts * (s.sg - s.sf))).toBeCloseTo(1, 3);
  });
});

describe("isentropic expansion", () => {
  it("wet exhaust: 66 ata, 485 C to 3.5 ata", () => {
    const e = expand(P(66), C(485), P(3.5));
    expect(e.ideal.phase).toBe("wet");
    expect(e.dh).toBeCloseTo(712.7, 0);
    expect(e.ideal.x).toBeGreaterThan(0.95);
  });

  it("wet exhaust: 32 kg/cm2g, 380 C to 1.5 kg/cm2g", () => {
    const e = expand(P(32, "kg/cm²(g)"), C(380), P(1.5, "kg/cm²(g)"));
    expect(e.dh).toBeCloseTo(561.6, 0);
  });

  it("deeply wet exhaust: 66 ata, 485 C to 0.1 ata", () => {
    const e = expand(P(66), C(485), P(0.1));
    expect(e.dh).toBeCloseTo(1231.7, 0);
    expect(e.ideal.x).toBeGreaterThan(0.78);
    expect(e.ideal.x).toBeLessThan(0.86);
  });

  it("superheated exhaust: 45 ata, 440 C to 8 ata", () => {
    const e = expand(P(45), C(440), P(8));
    expect(e.ideal.phase).toBe("superheated");
    expect(e.dh).toBeCloseTo(448.69, 1);
    expect(e.ideal.T - 273.15).toBeCloseTo(205.5, 0);
  });

  it("round trip through enthalpy", () => {
    const r = region2(1, C(300));
    expect(stateFromPH(1, r.h).T).toBeCloseTo(C(300), 4);
  });
});

describe("power", () => {
  const steam = { flow: 50 / 3.6, p1: P(66), T1: C(485), p2: P(3.5) };

  it("basic mode", () => {
    const r = power({ ...steam, mode: "basic", etaOverall: 0.6 });
    if (!r.ok) throw new Error(r.issues[0].message);
    expect(r.electricalPower).toBeCloseTo((50 / 3.6) * r.expansion.dh * 0.6, 6);
    expect(r.electricalPower).toBeGreaterThan(5900);
    expect(r.electricalPower).toBeLessThan(5980);
  });

  it("advanced mode chains the losses", () => {
    const r = power({
      ...steam,
      mode: "advanced",
      etaIsentropic: 0.7,
      etaMechanical: 0.98,
      etaGearbox: 0.97,
      etaGenerator: 0.96,
      valveDrop: 0.03,
      glandLeak: 0.005,
    });
    if (!r.ok) throw new Error(r.issues[0].message);
    expect(r.etaOverall).toBeCloseTo(0.6388, 3);
    expect(r.afterValve!.T).toBeLessThan(steam.T1);
    expect(r.afterValve!.T).toBeGreaterThan(steam.T1 - 3);
    expect(r.steamPower! > r.shaftPower! && r.shaftPower! > r.electricalPower).toBe(true);
    expect(r.exhaust!.phase).toBe("superheated");
    // Throttling keeps enthalpy: the expansion starts from the same h1.
    expect(r.expansion.h1).toBeCloseTo(region2(steam.p1, steam.T1).h, 3);
  });

  it("no valve drop and no leak matches basic mode with the same overall efficiency", () => {
    const a = power({ ...steam, mode: "advanced", etaIsentropic: 0.8, etaMechanical: 1, etaGearbox: 1, etaGenerator: 1, valveDrop: 0, glandLeak: 0 });
    const b = power({ ...steam, mode: "basic", etaOverall: 0.8 });
    if (!a.ok || !b.ok) throw new Error("expected ok");
    expect(a.electricalPower).toBeCloseTo(b.electricalPower, 6);
  });

  it("rejects bad inputs with a field", () => {
    const r = power({ ...steam, p2: P(80), mode: "basic", etaOverall: 0.6 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].field).toBe("p2");
    const wet = power({ ...steam, T1: C(200), mode: "basic", etaOverall: 0.6 });
    expect(wet.ok).toBe(false);
    if (!wet.ok) expect(wet.issues[0].field).toBe("t1");
  });
});

describe("efficiency and flow", () => {
  it("efficiency from a superheated exhaust reading", () => {
    const r = efficiency({ flow: 50 / 3.6, p1: P(66), T1: C(485), p2: P(3.5), T2: C(150), measuredPower: 7800 });
    if (!r.ok) throw new Error(r.issues[0].message);
    expect(r.dhActual).toBeCloseTo(623.7, 0);
    expect(r.etaIsentropic).toBeCloseTo(0.875, 2);
    expect(r.etaOverall!).toBeCloseTo(7800 / r.idealPower, 9);
  });

  it("refuses a saturated exhaust reading", () => {
    const r = efficiency({ flow: 10, p1: P(66), T1: C(485), p2: P(3.5), T2: C(138) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].field).toBe("t2");
  });

  it("flow is the inverse of power", () => {
    const steam = { p1: P(66), T1: C(485), p2: P(3.5) };
    const f = requiredFlow({ ...steam, power: 5000, etaOverall: 0.6 });
    if (!f.ok) throw new Error("expected ok");
    const p = power({ ...steam, flow: f.flow, mode: "basic", etaOverall: 0.6 });
    if (!p.ok) throw new Error("expected ok");
    expect(p.electricalPower).toBeCloseTo(5000, 6);
  });
});

describe("boiler", () => {
  it("default bagasse case", () => {
    const r = boiler({ fuels: FUELS, fuelRate: 10 / 3.6, efficiency: 0.7, p: P(67, "kg/cm²(g)"), T: C(485), Tfw: C(105) });
    if (!r.ok) throw new Error(r.issues[0].message);
    expect(r.cv).toBe(10032);
    expect(r.heatInput / 1000).toBeCloseTo(27.87, 2);
    expect(r.steam * 3.6).toBeGreaterThan(23.7);
    expect(r.steam * 3.6).toBeLessThan(24.1);
  });

  it("normalises a mix that does not add to 100", () => {
    const fuels = [
      { name: "A", share: 30, cv: 10000 },
      { name: "B", share: 30, cv: 14000 },
    ];
    const r = boiler({ fuels, fuelRate: 1, efficiency: 0.7, p: 4, T: C(400), Tfw: C(105) });
    if (!r.ok) throw new Error("expected ok");
    expect(r.cv).toBe(12000);
    expect(r.warnings.length).toBe(1);
  });
});
