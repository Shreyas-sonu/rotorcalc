"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";

export type BoilerPart = "fuel" | "furnace" | "steam" | "feed";

/** Animated section of a water-tube boiler: fuel in, flame, feed water in, steam out. */
export function BoilerDiagram({
  active = null,
  fire = 0.5,
  steam = 0.5,
  labels = {},
  className,
}: {
  active?: BoilerPart | null;
  /** 0..1 firing rate. */
  fire?: number;
  /** 0..1 steam output. */
  steam?: number;
  labels?: Partial<Record<BoilerPart, string>>;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const still = useReducedMotion();
  const dim = (p: BoilerPart) => (!active || active === p ? 1 : 0.32);
  const on = (p: BoilerPart) => active === p;
  const flames = 3 + Math.round(fire * 4);
  const bubbles = 4 + Math.round(steam * 8);

  const tag = (part: BoilerPart, name: string, x: number, y: number, anchor: "start" | "middle" | "end" = "start") => (
    <g opacity={dim(part)} style={{ transition: "opacity .3s" }}>
      <text x={x} y={y} textAnchor={anchor} fontSize="10.5" letterSpacing=".08em" fill={on(part) ? "#ffb347" : "#8a9ab0"} style={{ textTransform: "uppercase" }}>
        {name}
      </text>
      {labels[part] && (
        <text x={x} y={y + 15} textAnchor={anchor} fontSize="12.5" fontWeight="600" fill="#e9eff7" fontFamily="var(--font-geist-mono)">
          {labels[part]}
        </text>
      )}
    </g>
  );

  return (
    <svg viewBox="0 0 780 400" className={className} role="img" aria-label="Animated section of a boiler: fuel burns in the furnace, feed water enters the drum, and steam leaves at the top.">
      <defs>
        <linearGradient id={`${uid}steel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4a60" />
          <stop offset=".5" stopColor="#1c2737" />
          <stop offset="1" stopColor="#2a3749" />
        </linearGradient>
        <linearGradient id={`${uid}fire`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff5a10" />
          <stop offset=".6" stopColor="#ffb347" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity=".2" />
        </linearGradient>
        <filter id={`${uid}glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Furnace walls */}
      <g opacity={dim("furnace")} style={{ transition: "opacity .3s" }}>
        <path d="M230 120 H550 V350 H230Z" fill="#0a1019" stroke={on("furnace") ? "#ffb347" : "#4a5b73"} strokeWidth="2" />
        <path d="M230 120 L290 80 H490 L550 120" fill={`url(#${uid}steel)`} stroke="#4a5b73" strokeWidth="1.5" />
        {/* Water tubes */}
        {[262, 310, 358, 406, 454, 502].map((x) => (
          <path key={x} d={`M${x} 96V318`} stroke="#45cfff" strokeOpacity=".5" strokeWidth="7" strokeLinecap="round" />
        ))}
        {/* Flames */}
        <g filter={`url(#${uid}glow)`}>
          {Array.from({ length: flames }, (_, i) => {
            const x = 262 + (i * 256) / Math.max(1, flames - 1);
            const h = 70 + fire * 90 + (i % 2) * 22;
            return (
              <path key={`${flames}-${i}`} d={`M${x - 20} 344 Q${x - 26} ${344 - h * 0.5} ${x} ${344 - h} Q${x + 26} ${344 - h * 0.5} ${x + 20} 344Z`} fill={`url(#${uid}fire)`} opacity=".9">
                {!still && (
                  <animateTransform attributeName="transform" type="scale" values="1 1;1 1.12;1 .94;1 1" dur={`${0.7 + (i % 3) * 0.18}s`} repeatCount="indefinite" additive="sum" />
                )}
              </path>
            );
          })}
        </g>
      </g>

      {/* Steam drum */}
      <g opacity={dim("steam")} style={{ transition: "opacity .3s" }} filter={on("steam") ? `url(#${uid}glow)` : undefined}>
        <rect x="270" y="38" width="240" height="58" rx="29" fill={`url(#${uid}steel)`} stroke={on("steam") ? "#ffb347" : "#4a5b73"} strokeWidth="1.8" />
        <path d="M282 70 H498 A26 26 0 0 1 482 92 H298 A26 26 0 0 1 282 70Z" fill="#45cfff" fillOpacity=".28" />
        <path d="M510 56 H660 V20" fill="none" stroke={`url(#${uid}steel)`} strokeWidth="20" />
        <path d="M510 56 H660 V20" fill="none" stroke="#ff9a52" strokeOpacity=".4" strokeWidth="10" />
        {!still &&
          Array.from({ length: bubbles }, (_, i) => (
            <circle key={`${bubbles}-${i}`} r="2.6" fill="#ffb347">
              <animateMotion dur="2.4s" begin={`${(-i * 2.4) / bubbles}s`} repeatCount="indefinite" path="M400 62 H660 V8" />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="2.4s" begin={`${(-i * 2.4) / bubbles}s`} repeatCount="indefinite" />
            </circle>
          ))}
      </g>

      {/* Feed water */}
      <g opacity={dim("feed")} style={{ transition: "opacity .3s" }} filter={on("feed") ? `url(#${uid}glow)` : undefined}>
        <path d="M20 66 H270" fill="none" stroke={`url(#${uid}steel)`} strokeWidth="18" />
        <path d="M20 66 H270" fill="none" stroke="#45cfff" strokeOpacity={on("feed") ? 0.7 : 0.4} strokeWidth="8" />
        <circle cx="110" cy="66" r="19" fill="#0c131e" stroke={on("feed") ? "#45cfff" : "#8fa1b8"} strokeWidth="1.8" />
        <path d="M101 66h18M113 59l7 7-7 7" fill="none" stroke={on("feed") ? "#45cfff" : "#8fa1b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {!still &&
          [0, 1, 2, 3].map((i) => (
            <circle key={i} r="2.4" fill="#45cfff">
              <animateMotion dur="2s" begin={`${-i * 0.5}s`} repeatCount="indefinite" path="M24 66 H280" />
            </circle>
          ))}
      </g>

      {/* Fuel feed */}
      <g opacity={dim("fuel")} style={{ transition: "opacity .3s" }} filter={on("fuel") ? `url(#${uid}glow)` : undefined}>
        <path d="M40 250 H120 L150 300 H230 V330 H140 L110 280 H40Z" fill={`url(#${uid}steel)`} stroke={on("fuel") ? "#ffb347" : "#4a5b73"} strokeWidth="1.6" />
        <path d="M52 250 L64 222 H108 L120 250Z" fill="#141d2a" stroke={on("fuel") ? "#ffb347" : "#4a5b73"} />
        {!still &&
          [0, 1, 2, 3, 4].map((i) => (
            <rect key={i} width="7" height="5" rx="1" fill="#c79a5b">
              <animateMotion dur="2.6s" begin={`${-i * 0.52}s`} repeatCount="indefinite" path="M82 240 V262 L128 262 L152 312 H236" />
            </rect>
          ))}
      </g>

      {/* Flue gas */}
      <path d="M550 150 H640 V60" fill="none" stroke="#1e2a3c" strokeWidth="22" opacity=".8" />
      <path d="M150 352 H640" stroke="#1e2a3c" strokeWidth="2" />

      {tag("feed", "Feed water", 20, 106)}
      {tag("fuel", "Fuel", 40, 356)}
      {tag("furnace", "Furnace", 566, 230)}
      {tag("steam", "Steam out", 680, 40)}
    </svg>
  );
}
