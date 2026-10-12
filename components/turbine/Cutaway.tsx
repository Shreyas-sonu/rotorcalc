"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import { Wisp } from "./PlantFlow";

export type Part = "inlet" | "valve" | "blades" | "exhaust" | "gland" | "gearbox" | "generator";

export type CutawayProps = {
  /** The part the user is working on. Everything else dims. */
  active?: Part | null;
  /** 0..1, how much steam is flowing. Drives particle count and speed. */
  flow?: number;
  /** 0..1, how hot the inlet steam is. Drives the inlet colour. */
  heat?: number;
  /** 0..1, how hard the machine is working. Drives rotor speed. */
  load?: number;
  /** Exhaust steam is wet: show droplets. */
  wet?: boolean;
  /** Small live read-outs drawn beside each part. */
  labels?: Partial<Record<Part, string>>;
  showGearbox?: boolean;
  className?: string;
};

const CY = 190;
const STAGES = [212, 262, 312, 362, 412];
/** Half-height of the steam path inside the casing at x. */
const half = (x: number) => 46 + (x - 180) * 0.25;

const NAMES: Record<Part, string> = {
  inlet: "Steam inlet",
  valve: "Inlet valve",
  blades: "Blade stages",
  exhaust: "Exhaust",
  gland: "Gland seals",
  gearbox: "Gearbox",
  generator: "Generator",
};

/** Animated cross-section of a back-pressure steam turbine driving a generator. */
export function Cutaway({ active = null, flow = 0.5, heat = 0.7, load = 0.5, wet = false, labels = {}, showGearbox = true, className }: CutawayProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const still = useReducedMotion();
  const level = Math.round(Math.min(1, Math.max(0, flow)) * 4);
  const particles = 10 + level * 6;
  const travel = 4.4 - level * 0.6;
  const spin = 1.5 - Math.min(1, Math.max(0, load)) * 1.15;
  const hot = `hsl(${38 - heat * 22} 100% ${62 - heat * 6}%)`;
  const dim = (p: Part | Part[]) => {
    if (!active) return 1;
    return (Array.isArray(p) ? p.includes(active) : p === active) ? 1 : 0.32;
  };
  const on = (p: Part) => active === p;
  const paths = [-0.8, -0.45, -0.1, 0.25, 0.6, 0.9].map((k, i) => {
    const y1 = CY + k * 40;
    const y2 = CY + k * 96;
    return {
      id: `${uid}p${i}`,
      d: `M18 70 H118 Q150 70 158 104 L172 ${CY + k * 26} C 250 ${y1} 350 ${y2} 438 ${CY + 60 + Math.abs(k) * 28} L452 318 V372`,
    };
  });

  const tag = (part: Part, x: number, y: number, anchor: "start" | "middle" | "end" = "start") => (
    <g opacity={dim(part)} style={{ transition: "opacity .3s" }}>
      <text x={x} y={y} textAnchor={anchor} fontSize="10.5" letterSpacing=".08em" fill={on(part) ? "#ffb347" : "#8a9ab0"} style={{ textTransform: "uppercase" }}>
        {NAMES[part]}
      </text>
      {labels[part] && (
        <text x={x} y={y + 15} textAnchor={anchor} fontSize="12.5" fontWeight="600" fill="#e9eff7" fontFamily="var(--font-geist-mono)">
          {labels[part]}
        </text>
      )}
    </g>
  );

  return (
    <svg
      viewBox="0 0 780 400"
      className={className}
      role="img"
      aria-label="Animated cross-section of a steam turbine: steam enters at the inlet valve, expands through the blade stages, leaves at the exhaust, and the shaft drives a generator."
    >
      <defs>
        <linearGradient id={`${uid}steam`} x1="0" x2="1">
          <stop offset="0" stopColor={hot} stopOpacity=".34" />
          <stop offset=".55" stopColor="#ff9a52" stopOpacity=".16" />
          <stop offset="1" stopColor="#45cfff" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={`${uid}steel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4a60" />
          <stop offset=".5" stopColor="#1c2737" />
          <stop offset="1" stopColor="#2a3749" />
        </linearGradient>
        <linearGradient id={`${uid}shaft`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fb0c6" />
          <stop offset=".5" stopColor="#56677d" />
          <stop offset="1" stopColor="#2f3d50" />
        </linearGradient>
        <pattern id={`${uid}blade`} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#22303f" />
          <path d="M0 -4h12M0 2h12M0 8h12" stroke="#c9d6e6" strokeWidth="2.2" opacity=".85">
            {!still && <animateTransform attributeName="transform" type="translate" from="0 0" to="0 6" dur={`${(spin / 2).toFixed(2)}s`} repeatCount="indefinite" />}
          </path>
        </pattern>
        <pattern id={`${uid}hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#141d2a" />
          <path d="M0 0v6" stroke="#3b4b61" strokeWidth="2" />
        </pattern>
        <filter id={`${uid}glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {paths.map((p) => (
          <path key={p.id} id={p.id} d={p.d} />
        ))}
      </defs>

      {/* Foundation */}
      <path d="M150 352h370M560 352h200" stroke="#1e2a3c" strokeWidth="2" />
      <path d="M190 300v52M600 292v60M730 292v60" stroke="#1e2a3c" strokeWidth="6" />

      {/* Inlet pipe and valve */}
      <g opacity={dim(["inlet", "valve"])} style={{ transition: "opacity .3s" }}>
        <path d="M0 70 H118 Q150 70 158 104 L166 142" fill="none" stroke={`url(#${uid}steel)`} strokeWidth="26" />
        <path d="M0 70 H118 Q150 70 158 104 L166 142" fill="none" stroke={hot} strokeOpacity=".3" strokeWidth="14" />
      </g>
      {on("inlet") && <path d="M0 70 H118 Q150 70 158 104 L166 142" fill="none" stroke="#ffb347" strokeWidth="30" strokeOpacity=".2" filter={`url(#${uid}glow)`} />}
      <g opacity={dim("valve")} style={{ transition: "opacity .3s" }} filter={on("valve") ? `url(#${uid}glow)` : undefined}>
        <path d="M62 54 L92 86 V54 L62 86Z" fill="#0c131e" stroke={on("valve") ? "#ffb347" : "#8fa1b8"} strokeWidth="1.8" />
        <path d="M77 70V34M64 34h26" stroke={on("valve") ? "#ffb347" : "#8fa1b8"} strokeWidth="2.4" strokeLinecap="round" />
      </g>

      {/* Shaft */}
      <rect x="120" y={CY - 8} width="610" height="16" rx="3" fill={`url(#${uid}shaft)`} />

      {/* Casing and steam path */}
      <g opacity={dim(["blades", "exhaust", "gland", "inlet"])} style={{ transition: "opacity .3s" }}>
        <path
          d={`M172 ${CY - half(172) - 16} L462 ${CY - half(462) - 16} L462 ${CY + half(462) + 16} L172 ${CY + half(172) + 16}Z`}
          fill={`url(#${uid}steel)`}
          stroke="#4a5b73"
          strokeWidth="1.5"
        />
        <path d={`M180 ${CY - half(180)} L454 ${CY - half(454)} L454 ${CY + half(454)} L180 ${CY + half(180)}Z`} fill="#070c14" />
        <path d={`M180 ${CY - half(180)} L454 ${CY - half(454)} L454 ${CY + half(454)} L180 ${CY + half(180)}Z`} fill={`url(#${uid}steam)`} />
      </g>

      {/* Exhaust pipe */}
      <g opacity={dim("exhaust")} style={{ transition: "opacity .3s" }} filter={on("exhaust") ? `url(#${uid}glow)` : undefined}>
        <path d="M426 318 H478 V400 H426Z" fill={`url(#${uid}steel)`} stroke={on("exhaust") ? "#45cfff" : "#4a5b73"} strokeWidth="1.5" />
        <path d="M434 300 H470 V400 H434Z" fill="#45cfff" fillOpacity={on("exhaust") ? 0.3 : 0.16} />
      </g>

      {/* Blade stages: fixed nozzles on the casing, moving blades on the rotor */}
      <g opacity={dim("blades")} style={{ transition: "opacity .3s" }} filter={on("blades") ? `url(#${uid}glow)` : undefined}>
        {STAGES.map((x, i) => {
          const hs = half(x);
          const hr = half(x + 22);
          const edge = on("blades") ? "#ffb347" : "#5d6f88";
          return (
            <g key={x}>
              <rect x={x - 4} y={CY - hs} width="8" height={hs - 16} fill="#3d4d63" stroke={edge} strokeWidth=".8" />
              <rect x={x - 4} y={CY + 16} width="8" height={hs - 16} fill="#3d4d63" stroke={edge} strokeWidth=".8" />
              <rect x={x + 16} y={CY - hr * 0.42} width="12" height={hr * 0.84} rx="2" fill="#2b394b" stroke="#6c7f99" strokeWidth=".8" />
              <rect x={x + 17} y={CY - hr + 5} width="10" height={hr * 0.58 - 5} fill={`url(#${uid}blade)`} />
              <rect x={x + 17} y={CY + hr * 0.42} width="10" height={hr * 0.58 - 5} fill={`url(#${uid}blade)`} />
              <text x={x + 9} y={CY - half(x) - 24} fontSize="9" textAnchor="middle" fill="#5b6b80">
                {i + 1}
              </text>
            </g>
          );
        })}
      </g>

      {/* Gland seals where the shaft leaves the casing */}
      <g opacity={dim("gland")} style={{ transition: "opacity .3s" }} filter={on("gland") ? `url(#${uid}glow)` : undefined}>
        {[162, 454].map((x) => (
          <g key={x}>
            <rect x={x} y={CY - 22} width="18" height="14" fill={`url(#${uid}hatch)`} stroke={on("gland") ? "#ffb347" : "#5d6f88"} />
            <rect x={x} y={CY + 8} width="18" height="14" fill={`url(#${uid}hatch)`} stroke={on("gland") ? "#ffb347" : "#5d6f88"} />
          </g>
        ))}
      </g>

      {/* A little steam always escapes past the glands */}
      <g opacity={dim("gland") * (on("gland") ? 1 : 0.55)} style={{ transition: "opacity .3s" }}>
        <Wisp x={171} y={CY - 26} scale={0.55} still={!!still} />
        <Wisp x={463} y={CY - 26} scale={0.55} delay={1.3} still={!!still} />
      </g>

      {/* Bearings */}
      {[134, 494].map((x) => (
        <path key={x} d={`M${x} ${CY - 15}h20v30h-20z`} fill="#1a2533" stroke="#4a5b73" />
      ))}

      {/* Gearbox */}
      {showGearbox && (
        <g opacity={dim("gearbox")} style={{ transition: "opacity .3s" }} filter={on("gearbox") ? `url(#${uid}glow)` : undefined}>
          <rect x="528" y={CY - 46} width="56" height="92" rx="6" fill={`url(#${uid}steel)`} stroke={on("gearbox") ? "#ffb347" : "#4a5b73"} strokeWidth="1.5" />
          <g fill="none" stroke="#9fb0c6" strokeWidth="1.6">
            <circle cx="556" cy={CY - 14} r="16" strokeDasharray="4 3">
              {!still && (
                <animateTransform attributeName="transform" type="rotate" from={`0 556 ${CY - 14}`} to={`360 556 ${CY - 14}`} dur={`${(spin * 3).toFixed(2)}s`} repeatCount="indefinite" />
              )}
            </circle>
            <circle cx="556" cy={CY + 22} r="10" strokeDasharray="3 2.4">
              {!still && (
                <animateTransform attributeName="transform" type="rotate" from={`360 556 ${CY + 22}`} to={`0 556 ${CY + 22}`} dur={`${(spin * 1.9).toFixed(2)}s`} repeatCount="indefinite" />
              )}
            </circle>
          </g>
        </g>
      )}

      {/* Generator */}
      <g opacity={dim("generator")} style={{ transition: "opacity .3s" }} filter={on("generator") ? `url(#${uid}glow)` : undefined}>
        <rect x="606" y={CY - 62} width="124" height="124" rx="14" fill={`url(#${uid}steel)`} stroke={on("generator") ? "#3ddc97" : "#4a5b73"} strokeWidth="1.5" />
        <path d={`M626 ${CY - 62}v124M646 ${CY - 62}v124M690 ${CY - 62}v124M710 ${CY - 62}v124`} stroke="#0c131e" strokeWidth="3" opacity=".7" />
        <circle cx="668" cy={CY} r="26" fill="#0c131e" stroke="#3ddc97" strokeWidth="1.6" />
        <path d={`M672 ${CY - 15}l-12 17h9l-5 13 13-18h-9z`} fill="#3ddc97" style={still ? undefined : { animation: "pulse-glow 1.6s ease-in-out infinite" }} />
        <path d={`M730 ${CY - 26}h34M730 ${CY}h34M730 ${CY + 26}h34`} stroke="#3ddc97" strokeWidth="2" strokeLinecap="round" opacity=".8" />
      </g>

      {/* Steam particles */}
      {!still && (
        <g opacity={active && !["inlet", "valve", "blades", "exhaust"].includes(active) ? 0.35 : 1} style={{ transition: "opacity .3s" }}>
          {Array.from({ length: particles }, (_, i) => {
            const p = paths[i % paths.length];
            const begin = `${(-((i * travel) / particles + (i % 3) * 0.21)).toFixed(2)}s`;
            const dur = `${travel}s`;
            return (
              <circle key={`${particles}-${i}`} r={i % 4 === 0 ? 3 : 2.1} fill={hot}>
                <animateMotion dur={dur} begin={begin} repeatCount="indefinite">
                  <mpath href={`#${p.id}`} />
                </animateMotion>
                <animate attributeName="fill" values={`${hot};#ff9a52;#9fdcff;#45cfff`} keyTimes="0;.35;.75;1" dur={dur} begin={begin} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;.75;0" keyTimes="0;.06;.7;.93;1" dur={dur} begin={begin} repeatCount="indefinite" />
              </circle>
            );
          })}
        </g>
      )}

      {/* Droplets when the exhaust is wet */}
      {wet &&
        [440, 449, 458, 466].map((x, i) => (
          <path key={x} d={`M${x} 330c-3 5-3 8 0 8s3-3 0-8z`} fill="#45cfff">
            {!still && <animateTransform attributeName="transform" type="translate" values="0 -12;0 62" dur="1.3s" begin={`${i * 0.31}s`} repeatCount="indefinite" />}
            {!still && <animate attributeName="opacity" values="0;1;0" dur="1.3s" begin={`${i * 0.31}s`} repeatCount="indefinite" />}
          </path>
        ))}

      {/* Labels */}
      {tag("inlet", 8, 112)}
      {tag("valve", 100, 28)}
      {tag("blades", 318, 44, "middle")}
      {tag("exhaust", 490, 366)}
      {tag("gland", 171, CY + 96, "middle")}
      {showGearbox && tag("gearbox", 556, CY - 76, "middle")}
      {tag("generator", 668, CY - 92, "middle")}
    </svg>
  );
}
