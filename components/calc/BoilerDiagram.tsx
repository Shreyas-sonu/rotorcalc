"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import { ART, ArtDefs, Pipe, Valve } from "@/components/turbine/art";

export type BoilerPart = "fuel" | "furnace" | "steam" | "feed";

const GROUND = 346;
const TUBES = [262, 310, 358, 406, 454, 502];
const STRUCT = "#4f6a85";
const FUEL = "#a8743a";

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
  const dim = (p: BoilerPart) => (!active || active === p ? 1 : 0.4);
  const on = (p: BoilerPart) => active === p;
  const fade = { transition: "opacity .3s" };
  const glow = (p: BoilerPart) => (on(p) ? `url(#${uid}glow)` : undefined);
  const flames = 3 + Math.round(fire * 4);
  const bubbles = 4 + Math.round(steam * 8);

  const tag = (part: BoilerPart, name: string, x: number, y: number, anchor: "start" | "middle" | "end" = "start") => (
    <g opacity={dim(part)} style={fade}>
      <text x={x} y={y} textAnchor={anchor} fontSize="10.5" fontWeight="600" letterSpacing=".08em" fill={on(part) ? ART.hot : ART.dim} style={{ textTransform: "uppercase" }}>
        {name}
      </text>
      {labels[part] && (
        <text x={x} y={y + 15} textAnchor={anchor} fontSize="12.5" fontWeight="600" fill={ART.ink} fontFamily="var(--font-geist-mono)">
          {labels[part]}
        </text>
      )}
    </g>
  );

  return (
    <svg viewBox="0 0 780 400" className={className} role="img" aria-label="Animated section of a boiler: fuel burns in the furnace, feed water enters the drum, and steam leaves at the top.">
      <defs>
        <ArtDefs uid={uid} />
        <filter id={`${uid}flame`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground slab and pipe supports */}
      <rect x="14" y={GROUND} width="752" height="9" fill={`url(#${uid}concrete)`} stroke="#b3bac2" strokeWidth=".8" />
      {[184].map((x) => (
        <g key={x} fill={STRUCT}>
          <rect x={x - 3} y="76" width="6" height={GROUND - 76} />
          <rect x={x - 12} y="75" width="24" height="4" rx="1" />
        </g>
      ))}

      {/* Flue gas duct to the stack */}
      <g>
        <path d="M546 180 H780" stroke={ART.edge} strokeWidth="26" />
        <path d="M546 180 H780" stroke={`url(#${uid}grey)`} strokeWidth="23.4" />
        <path d="M600 167v26M660 167v26M720 167v26" stroke={ART.edge} strokeWidth="1.4" />
        {!still &&
          [0, 1, 2, 3].map((i) => (
            <circle key={i} r="4.5" fill="#8f9aa7" opacity=".5">
              <animateMotion dur="3.2s" begin={`${-i * 0.8}s`} repeatCount="indefinite" path="M556 180 H776" />
            </circle>
          ))}
        <text x="664" y="212" textAnchor="middle" fontSize="9.5" letterSpacing=".08em" fill={ART.dim} style={{ textTransform: "uppercase" }}>
          Flue gas to stack
        </text>
      </g>

      {/* Furnace: cladding, refractory lining, firebox */}
      <g opacity={dim("furnace")} style={fade} filter={glow("furnace")}>
        <rect x="230" y="120" width="320" height={GROUND - 120} fill={`url(#${uid}greyx)`} stroke={on("furnace") ? ART.hot : ART.edge} strokeWidth="1.6" />
        <rect x="236" y="126" width="308" height={GROUND - 126} fill={`url(#${uid}brick)`} />
        <rect x="248" y="138" width="284" height="200" fill={`url(#${uid}firebox)`} />
        <rect x="532" y="166" width="18" height="28" fill={`url(#${uid}firebox)`} />
        {[170, 240, 310].map((y) => (
          <g key={y} fill={STRUCT}>
            <rect x="222" y={y} width="10" height="12" rx="1.5" />
            <rect x="548" y={y === 170 ? 206 : y} width="10" height="12" rx="1.5" />
          </g>
        ))}
        {/* Water tubes and bottom header */}
        {TUBES.map((x) => (
          <g key={x} fill="none" strokeLinecap="round">
            <path d={`M${x} 96V314`} stroke="#6f7b88" strokeWidth="9" />
            <path d={`M${x} 96V314`} stroke={`url(#${uid}steelx)`} strokeWidth="7" />
            <path d={`M${x} 96V314`} stroke={ART.cool} strokeOpacity=".55" strokeWidth="3" />
          </g>
        ))}
        <path d="M256 314H508" stroke="#6f7b88" strokeWidth="11" strokeLinecap="round" />
        <path d="M256 314H508" stroke="#c9d1da" strokeWidth="8" strokeLinecap="round" />
        {/* Grate */}
        <path d="M252 332H528" stroke="#1b2028" strokeWidth="6" strokeDasharray="12 4" />
        {/* Flames */}
        <g filter={`url(#${uid}flame)`}>
          {Array.from({ length: flames }, (_, i) => {
            const x = 268 + (i * 244) / Math.max(1, flames - 1);
            const h = 60 + fire * 85 + (i % 2) * 20;
            return (
              <path key={`${flames}-${i}`} d={`M${x - 20} 330 Q${x - 26} ${330 - h * 0.5} ${x} ${330 - h} Q${x + 26} ${330 - h * 0.5} ${x + 20} 330Z`} fill={`url(#${uid}fire)`} opacity=".92">
                {!still && (
                  <animateTransform attributeName="transform" type="scale" values="1 1;1 1.12;1 .94;1 1" dur={`${0.7 + (i % 3) * 0.18}s`} repeatCount="indefinite" additive="sum" />
                )}
              </path>
            );
          })}
        </g>
        {/* Roof */}
        <path d="M230 120 L290 80 H490 L550 120Z" fill={`url(#${uid}grey)`} stroke={ART.edge} strokeWidth="1.5" strokeLinejoin="round" />
      </g>

      {/* Steam drum, cut open: water below, steam above */}
      <g opacity={dim("steam")} style={fade} filter={glow("steam")}>
        <Pipe d="M506 56 H660 V20" w={20} fluid={ART.hot} fluidOpacity={0.36} />
        <rect x="270" y="38" width="240" height="58" rx="29" fill={`url(#${uid}grey)`} stroke={on("steam") ? ART.hot : ART.edge} strokeWidth="1.8" />
        <rect x="276" y="44" width="228" height="46" rx="23" fill="#fff5ec" />
        <path d="M277 68 H503 A23 23 0 0 1 481 90 H299 A23 23 0 0 1 277 68Z" fill="#bfe0f5" />
        <path d="M277 68 H503" stroke={ART.cool} strokeOpacity=".6" strokeWidth="1.2" />
        {/* Safety valve */}
        <rect x="326" y="24" width="8" height="15" fill={`url(#${uid}steelx)`} stroke={ART.steelDark} strokeWidth=".6" />
        <rect x="322" y="16" width="16" height="9" rx="2" fill={ART.red} />
        <Valve uid={uid} cx={588} cy={56} size={0.72} />
        {!still &&
          Array.from({ length: bubbles }, (_, i) => (
            <circle key={`${bubbles}-${i}`} r="2.8" fill={ART.hot}>
              <animateMotion dur="2.4s" begin={`${(-i * 2.4) / bubbles}s`} repeatCount="indefinite" path="M400 56 H660 V8" />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="2.4s" begin={`${(-i * 2.4) / bubbles}s`} repeatCount="indefinite" />
            </circle>
          ))}
      </g>

      {/* Feed water */}
      <g opacity={dim("feed")} style={fade} filter={glow("feed")}>
        <Pipe d="M14 66 H274" w={18} fluid={ART.cool} fluidOpacity={on("feed") ? 0.5 : 0.3} />
        {!still &&
          [0, 1, 2, 3].map((i) => (
            <circle key={i} r="2.6" fill={ART.cool}>
              <animateMotion dur="2s" begin={`${-i * 0.5}s`} repeatCount="indefinite" path="M20 66 H282" />
            </circle>
          ))}
        <Valve uid={uid} cx={112} cy={66} size={0.72} active={on("feed")} />
      </g>

      {/* Fuel feed: hopper, chute into the furnace */}
      <g opacity={dim("fuel")} style={fade} filter={glow("fuel")}>
        {[50, 122].map((x) => (
          <rect key={x} x={x - 2.5} y="212" width="5" height={GROUND - 212} fill={STRUCT} />
        ))}
        <path d="M60 250 H112 L166 296 H240 V322 H150Z" fill={`url(#${uid}grey)`} stroke={on("fuel") ? ART.hot : ART.edge} strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="230" y="298" width="18" height="22" fill={`url(#${uid}firebox)`} />
        <path d="M54 204 Q86 184 118 204Z" fill={FUEL} />
        <path d="M46 200 H126 L112 250 H60Z" fill={`url(#${uid}blue)`} stroke={on("fuel") ? ART.hot : ART.blueDark} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M46 200 H126" stroke="#8fbfe0" strokeWidth="2" />
        {!still &&
          [0, 1, 2, 3, 4].map((i) => (
            <rect key={i} width="8" height="6" rx="1.5" fill={FUEL} stroke="#7a5226" strokeWidth=".6">
              <animateMotion dur="2.6s" begin={`${-i * 0.52}s`} repeatCount="indefinite" path="M82 252 L150 306 H262" />
            </rect>
          ))}
      </g>

      {tag("feed", "Feed water", 20, 106)}
      {tag("fuel", "Fuel", 40, 374)}
      {tag("furnace", "Furnace", 566, 268)}
      {tag("steam", "Steam out", 680, 40)}
    </svg>
  );
}
