"use client";

import { useMemo } from "react";
import { P_SAT_MAX, isSuperheated, region2, saturation, tsat } from "@/lib/steam/if97";

type Point = { h: number; s: number };

const W = 520;
const H = 300;
const PAD = { l: 46, r: 14, t: 14, b: 34 };

/** Constant-pressure line across the wet region and up into superheat. */
function isobar(p: number): Point[] {
  if (p > P_SAT_MAX) {
    // Above the range of the saturation model only the superheated part is drawn.
    const hot: Point[] = [];
    for (let T = 640; T <= 1073; T += 20) if (isSuperheated(p, T)) hot.push(region2(p, T));
    return hot;
  }
  const sat = saturation(p);
  const pts: Point[] = [{ h: sat.hg - sat.ts * (sat.sg - 5.4), s: 5.4 }, { h: sat.hg, s: sat.sg }];
  for (let T = sat.ts + 10; T <= 1073; T += 20) {
    const r = region2(p, T);
    pts.push({ h: r.h, s: r.s });
  }
  return pts;
}

/**
 * Enthalpy-entropy (Mollier) chart of the expansion: the dashed vertical line is the ideal drop,
 * the solid line the real one. Below the dome line the steam is wet.
 */
export function HsChart({ p1, p2, inlet, ideal, actual }: { p1: number; p2: number; inlet: Point; ideal: Point; actual?: Point | null }) {
  const data = useMemo(() => {
    const dome: Point[] = [];
    for (let i = 0; i <= 60; i++) {
      const p = 0.002 * (P_SAT_MAX / 0.002) ** (i / 60);
      const sat = saturation(Math.min(p, P_SAT_MAX));
      dome.push({ h: sat.hg, s: sat.sg });
    }
    return { dome, hi: isobar(p1), lo: isobar(p2) };
  }, [p1, p2]);

  const all = [inlet, ideal, ...(actual ? [actual] : [])];
  const sMin = Math.min(5.6, ...all.map((p) => p.s)) - 0.15;
  const sMax = Math.max(8.2, ...all.map((p) => p.s)) + 0.25;
  const hMin = Math.min(2100, ...all.map((p) => p.h)) - 80;
  const hMax = Math.max(3500, ...all.map((p) => p.h)) + 120;
  const x = (s: number) => PAD.l + ((s - sMin) / (sMax - sMin)) * (W - PAD.l - PAD.r);
  const y = (h: number) => H - PAD.b - ((h - hMin) / (hMax - hMin)) * (H - PAD.t - PAD.b);
  const line = (pts: Point[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.s).toFixed(1)} ${y(p.h).toFixed(1)}`).join(" ");
  const hTicks = [2200, 2600, 3000, 3400].filter((h) => h > hMin && h < hMax);
  const sTicks = [6, 6.5, 7, 7.5, 8].filter((s) => s > sMin && s < sMax);
  const tsC = (tsat(p2) - 273.15).toFixed(0);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Enthalpy-entropy chart showing the steam expansion from inlet to exhaust">
        <defs>
          <clipPath id="hs-clip">
            <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
          </clipPath>
        </defs>
        {hTicks.map((h) => (
          <g key={h}>
            <path d={`M${PAD.l} ${y(h)}H${W - PAD.r}`} stroke="#dfdbf0" />
            <text x={PAD.l - 8} y={y(h) + 4} textAnchor="end" fontSize="10" fill="#726c8f">
              {h}
            </text>
          </g>
        ))}
        {sTicks.map((s) => (
          <g key={s}>
            <path d={`M${x(s)} ${PAD.t}V${H - PAD.b}`} stroke="#dfdbf0" />
            <text x={x(s)} y={H - PAD.b + 15} textAnchor="middle" fontSize="10" fill="#726c8f">
              {s}
            </text>
          </g>
        ))}
        <text x={W - PAD.r} y={H - 4} textAnchor="end" fontSize="10" fill="#4b4568">
          entropy s, kJ/(kg·K)
        </text>
        <text x={PAD.l + 6} y={PAD.t + 12} fontSize="10" fill="#4b4568">
          enthalpy h, kJ/kg
        </text>

        <g clipPath="url(#hs-clip)">
          <path d={`${line(data.dome)} L${x(data.dome[data.dome.length - 1].s)} ${H} L${x(data.dome[0].s)} ${H}Z`} fill="#0b86a8" fillOpacity=".06" />
          <path d={line(data.dome)} fill="none" stroke="#0b86a8" strokeOpacity=".7" strokeWidth="1.4" />
          <path d={line(data.hi)} fill="none" stroke="#e3167b" strokeOpacity=".65" strokeWidth="1.2" />
          <path d={line(data.lo)} fill="none" stroke="#0b86a8" strokeOpacity=".65" strokeWidth="1.2" />
          <path d={`M${x(inlet.s)} ${y(inlet.h)}L${x(ideal.s)} ${y(ideal.h)}`} stroke="#150f33" strokeWidth="1.4" strokeDasharray="5 4" />
          {actual && <path d={`M${x(inlet.s)} ${y(inlet.h)}L${x(actual.s)} ${y(actual.h)}`} stroke="#4a26e8" strokeWidth="2.4" strokeLinecap="round" />}
          <circle cx={x(ideal.s)} cy={y(ideal.h)} r="4" fill="#ffffff" stroke="#150f33" strokeWidth="1.5" />
          {actual && <circle cx={x(actual.s)} cy={y(actual.h)} r="4.5" fill="#0b86a8" />}
          <circle cx={x(inlet.s)} cy={y(inlet.h)} r="5" fill="#e3167b" />
        </g>
        <text x={x(inlet.s) + 9} y={y(inlet.h) - 6} fontSize="11" fill="#150f33">
          Inlet
        </text>
        <text x={W - PAD.r - 6} y={y(data.dome[0].h) + 16} textAnchor="end" fontSize="10" fill="#0b86a8" opacity=".8">
          wet steam below this line
        </text>
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-dim">
        <span>
          <span className="mr-1.5 inline-block h-0.5 w-4 translate-y-[-3px] bg-hot" />
          inlet pressure
        </span>
        <span>
          <span className="mr-1.5 inline-block h-0.5 w-4 translate-y-[-3px] bg-cool" />
          exhaust pressure (boils at {tsC} °C)
        </span>
        <span>
          <span className="mr-1.5 inline-block w-4 translate-y-[-3px] border-t border-dashed border-ink" />
          ideal
        </span>
        {actual && (
          <span>
            <span className="mr-1.5 inline-block h-0.5 w-4 translate-y-[-3px] bg-brand" />
            actual
          </span>
        )}
      </figcaption>
    </figure>
  );
}
