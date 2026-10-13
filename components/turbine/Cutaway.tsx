"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import { ART, ArtDefs, Pipe, Valve, Wisp } from "./art";

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
const WALL = 16;
const FLOOR = 340;
/** Centre line of the exhaust branch through the bottom of the casing. */
const EX = 433;

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
  const hot = `hsl(${32 - heat * 20} 96% ${53 - heat * 5}%)`;
  const dim = (p: Part | Part[]) => {
    if (!active) return 1;
    return (Array.isArray(p) ? p.includes(active) : p === active) ? 1 : 0.4;
  };
  const on = (p: Part) => active === p;
  const fade = { transition: "opacity .3s" };
  const glow = (p: Part) => (on(p) ? `url(#${uid}glow)` : undefined);
  const top = (x: number) => CY - half(x);
  const bot = (x: number) => CY + half(x);
  const paths = [-0.8, -0.45, -0.1, 0.25, 0.6, 0.9].map((k, i) => {
    const y1 = CY + k * 40;
    const y2 = CY + k * 96;
    return {
      id: `${uid}p${i}`,
      d: `M18 70 H118 Q150 70 158 104 L184 ${CY + k * 26} C 250 ${y1} 350 ${y2} 412 ${CY + 56 + Math.abs(k) * 26} L${EX} 322 V396`,
    };
  });
  const inside = `M180 ${top(180)} L454 ${top(454)} V${bot(454)} L180 ${bot(180)}Z`;
  const shell = `M172 ${top(172) - WALL} L462 ${top(462) - WALL} V${bot(462) + WALL} L172 ${bot(172) + WALL}Z ${inside}`;
  const inlet = "M0 70 H118 Q150 70 158 104 L166 140";

  const tag = (part: Part, x: number, y: number, anchor: "start" | "middle" | "end" = "start") => (
    <g opacity={dim(part)} style={fade}>
      <text x={x} y={y} textAnchor={anchor} fontSize="10.5" fontWeight="600" letterSpacing=".08em" fill={on(part) ? ART.hot : ART.dim} style={{ textTransform: "uppercase" }}>
        {NAMES[part]}
      </text>
      {labels[part] && (
        <text x={x} y={y + 15} textAnchor={anchor} fontSize="12" fontWeight="600" fill={ART.ink} fontFamily="var(--font-geist-mono)">
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
        <ArtDefs uid={uid} />
        <linearGradient id={`${uid}steam`} x1="0" x2="1">
          <stop offset="0" stopColor={hot} stopOpacity=".34" />
          <stop offset=".55" stopColor="#f6a65c" stopOpacity=".14" />
          <stop offset="1" stopColor={ART.cool} stopOpacity=".2" />
        </linearGradient>
        <pattern id={`${uid}blade`} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#e9edf2" />
          <path d="M0 -4h12M0 2h12M0 8h12" stroke={ART.steelDark} strokeWidth="2.2">
            {!still && <animateTransform attributeName="transform" type="translate" from="0 0" to="0 6" dur={`${(spin / 2).toFixed(2)}s`} repeatCount="indefinite" />}
          </path>
        </pattern>
        {paths.map((p) => (
          <path key={p.id} id={p.id} d={p.d} />
        ))}
      </defs>

      {/* Operating floor, plinth and the steel that carries the machine */}
      <g>
        <rect x="110" y={FLOOR} width="298" height="12" fill={`url(#${uid}concrete)`} stroke="#b3bac2" strokeWidth=".8" />
        <rect x="458" y={FLOOR} width="312" height="12" fill={`url(#${uid}concrete)`} stroke="#b3bac2" strokeWidth=".8" />
        <rect x="520" y="258" width="222" height={FLOOR - 258} fill={`url(#${uid}concrete)`} stroke="#b3bac2" strokeWidth=".8" />
        {[137, 497].map((x) => (
          <rect key={x} x={x} y={CY + 15} width="14" height={FLOOR - CY - 15} fill={`url(#${uid}cast)`} />
        ))}
        {[270, 390].map((x) => (
          <path key={x} d={`M${x - 12} ${bot(x - 12) + WALL} L${x + 12} ${bot(x + 12) + WALL} L${x + 16} ${FLOOR} H${x - 16}Z`} fill={`url(#${uid}cast)`} />
        ))}
      </g>

      {/* Inlet pipe, cut open */}
      <g opacity={dim(["inlet", "valve"])} style={fade} filter={glow("inlet")}>
        <Pipe d={inlet} w={26} fluid={hot} fluidOpacity={0.34} />
      </g>

      {/* Casing, sectioned, and the steam path inside it */}
      <g opacity={dim(["blades", "exhaust", "gland", "inlet"])} style={fade}>
        <path d={shell} fillRule="evenodd" fill={`url(#${uid}cut)`} stroke={ART.blueDark} strokeWidth="1.4" strokeLinejoin="round" />
        <path d={inside} fill={ART.room} />
        <path d={inside} fill={`url(#${uid}steam)`} />
      </g>

      {/* Exhaust branch */}
      <g opacity={dim("exhaust")} style={fade} filter={glow("exhaust")}>
        <Pipe d={`M${EX} ${bot(EX) + WALL - 1} V400`} w={46} fluid={ART.cool} fluidOpacity={on("exhaust") ? 0.34 : 0.2} />
        <rect x={EX - 13} y={bot(EX) - 4} width="26" height={WALL + 6} fill="#ffffff" />
        <rect x={EX - 13} y={bot(EX) - 4} width="26" height={WALL + 6} fill={ART.cool} fillOpacity={on("exhaust") ? 0.34 : 0.2} />
      </g>

      {/* Shaft */}
      <rect x="120" y={CY - 8} width="610" height="16" rx="3" fill={`url(#${uid}steel)`} stroke={ART.steelDark} strokeWidth=".6" />

      {/* Blade stages: fixed nozzles on the casing, moving blades on the rotor */}
      <g opacity={dim("blades")} style={fade} filter={glow("blades")}>
        {STAGES.map((x, i) => {
          const hs = half(x);
          const hr = half(x + 22);
          const edge = on("blades") ? ART.hot : "#5f6b78";
          return (
            <g key={x}>
              <rect x={x - 4} y={CY - hs} width="8" height={hs - 14} fill="#8793a1" stroke={edge} strokeWidth=".8" />
              <rect x={x - 4} y={CY + 14} width="8" height={hs - 14} fill="#8793a1" stroke={edge} strokeWidth=".8" />
              <rect x={x + 15} y={CY - hr * 0.42} width="14" height={hr * 0.84} rx="2" fill={`url(#${uid}steel)`} stroke={ART.steelDark} strokeWidth=".8" />
              <rect x={x + 17} y={CY - hr + 5} width="10" height={hr * 0.58 - 5} fill={`url(#${uid}blade)`} stroke={ART.steelDark} strokeWidth=".5" />
              <rect x={x + 17} y={CY + hr * 0.42} width="10" height={hr * 0.58 - 5} fill={`url(#${uid}blade)`} stroke={ART.steelDark} strokeWidth=".5" />
              <text x={x + 9} y={CY - half(x) - 24} fontSize="9" textAnchor="middle" fill={ART.dim}>
                {i + 1}
              </text>
            </g>
          );
        })}
      </g>

      {/* Gland seals where the shaft leaves the casing */}
      <g opacity={dim("gland")} style={fade} filter={glow("gland")}>
        {[162, 454].map((x) => (
          <g key={x}>
            {[CY - 22, CY + 8].map((y) => (
              <g key={y}>
                <rect x={x} y={y} width="18" height="14" fill={`url(#${uid}cast)`} stroke={on("gland") ? ART.hot : "#3c454f"} />
                <path d={`M${x + 4.5} ${y + 2}v10M${x + 9} ${y + 2}v10M${x + 13.5} ${y + 2}v10`} stroke="#c9d1da" strokeWidth="1.1" />
              </g>
            ))}
          </g>
        ))}
      </g>

      {/* A little steam always escapes past the glands */}
      <g opacity={dim("gland") * (on("gland") ? 1 : 0.7)} style={fade}>
        <Wisp x={171} y={CY - 26} scale={0.55} still={!!still} />
        <Wisp x={463} y={CY - 26} scale={0.55} delay={1.3} still={!!still} />
      </g>

      {/* Bearings */}
      {[134, 494].map((x) => (
        <g key={x}>
          <rect x={x} y={CY - 17} width="20" height="34" rx="3" fill={`url(#${uid}blue)`} stroke={ART.blueDark} />
          <path d={`M${x} ${CY}h20`} stroke={ART.blueDark} strokeWidth="1" />
        </g>
      ))}

      {/* Gearbox */}
      {showGearbox && (
        <g opacity={dim("gearbox")} style={fade} filter={glow("gearbox")}>
          <rect x="530" y={CY + 46} width="52" height={258 - CY - 46} fill={`url(#${uid}cast)`} />
          <rect x="528" y={CY - 46} width="56" height="92" rx="6" fill={`url(#${uid}blue)`} stroke={on("gearbox") ? ART.hot : ART.blueDark} strokeWidth="1.5" />
          <rect x="535" y={CY - 39} width="42" height="78" rx="4" fill={ART.room} stroke={ART.blueDark} strokeWidth=".8" />
          <g fill="#c9d1da" stroke={ART.steelDark} strokeWidth="5" strokeDasharray="3.14 3.14">
            <circle cx="556" cy={CY - 12} r="17">
              {!still && <animateTransform attributeName="transform" type="rotate" from={`0 556 ${CY - 12}`} to={`360 556 ${CY - 12}`} dur={`${(spin * 3).toFixed(2)}s`} repeatCount="indefinite" />}
            </circle>
            <circle cx="556" cy={CY + 20} r="11">
              {!still && <animateTransform attributeName="transform" type="rotate" from={`360 556 ${CY + 20}`} to={`0 556 ${CY + 20}`} dur={`${(spin * 1.94).toFixed(2)}s`} repeatCount="indefinite" />}
            </circle>
          </g>
          <circle cx="556" cy={CY - 12} r="4" fill={ART.steelDark} />
          <circle cx="556" cy={CY + 20} r="3" fill={ART.steelDark} />
        </g>
      )}
      {[517, 595].map((x) => (
        <rect key={x} x={x} y={CY - 13} width="6" height="26" rx="1.5" fill={ART.yellow} stroke="#b88a00" strokeWidth=".7" />
      ))}

      {/* Generator */}
      <g opacity={dim("generator")} style={fade} filter={glow("generator")}>
        {[614, 696].map((x) => (
          <rect key={x} x={x} y={CY + 62} width="26" height={258 - CY - 62} fill={`url(#${uid}cast)`} />
        ))}
        <rect x="626" y={CY - 76} width="84" height="16" rx="3" fill={`url(#${uid}grey)`} stroke={ART.edge} />
        <path d={`M634 ${CY - 71}h68M634 ${CY - 66}h68`} stroke={ART.edge} strokeWidth="1.4" />
        <rect x="606" y={CY - 62} width="124" height="124" rx="12" fill={`url(#${uid}grey)`} stroke={on("generator") ? ART.ok : ART.edge} strokeWidth="1.5" />
        <path d={Array.from({ length: 8 }, (_, i) => `M${626 + i * 12} ${CY - 60}v120`).join("")} stroke="#b4bdc8" strokeWidth="1.6" />
        <rect x="606" y={CY - 62} width="13" height="124" rx="5" fill={`url(#${uid}blue)`} stroke={ART.blueDark} strokeWidth=".8" />
        <rect x="717" y={CY - 62} width="13" height="124" rx="5" fill={`url(#${uid}blue)`} stroke={ART.blueDark} strokeWidth=".8" />
        <rect x="644" y={CY - 24} width="48" height="48" rx="6" fill="#ffffff" stroke={on("generator") ? ART.ok : ART.edge} strokeWidth="1.4" />
        <path d={`M672 ${CY - 15}l-12 17h9l-5 13 13-18h-9z`} fill={ART.ok} style={still ? undefined : { animation: "pulse-glow 1.6s ease-in-out infinite" }} />
        {[-26, 0, 26].map((dy) => (
          <g key={dy}>
            <path d={`M730 ${CY + dy}h30`} stroke="#3c454f" strokeWidth="3" strokeLinecap="round" />
            <circle cx="763" cy={CY + dy} r="3.6" fill={ART.ok} />
          </g>
        ))}
      </g>

      {/* Steam particles */}
      {!still && (
        <g opacity={active && !["inlet", "valve", "blades", "exhaust"].includes(active) ? 0.35 : 1} style={fade}>
          {Array.from({ length: particles }, (_, i) => {
            const p = paths[i % paths.length];
            const begin = `${(-((i * travel) / particles + (i % 3) * 0.21)).toFixed(2)}s`;
            const dur = `${travel}s`;
            return (
              <circle key={`${particles}-${i}`} r={i % 4 === 0 ? 3.2 : 2.3} fill={hot}>
                <animateMotion dur={dur} begin={begin} repeatCount="indefinite">
                  <mpath href={`#${p.id}`} />
                </animateMotion>
                <animate attributeName="fill" values={`${hot};#f08a3c;#4aa8e0;${ART.cool}`} keyTimes="0;.35;.75;1" dur={dur} begin={begin} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;.8;0" keyTimes="0;.06;.7;.93;1" dur={dur} begin={begin} repeatCount="indefinite" />
              </circle>
            );
          })}
        </g>
      )}

      {/* Droplets when the exhaust is wet */}
      {wet &&
        [EX - 9, EX - 3, EX + 4, EX + 10].map((x, i) => (
          <path key={x} d={`M${x} 330c-3 5-3 8 0 8s3-3 0-8z`} fill={ART.cool}>
            {!still && <animateTransform attributeName="transform" type="translate" values="0 -12;0 62" dur="1.3s" begin={`${i * 0.31}s`} repeatCount="indefinite" />}
            {!still && <animate attributeName="opacity" values="0;1;0" dur="1.3s" begin={`${i * 0.31}s`} repeatCount="indefinite" />}
          </path>
        ))}

      {/* Steam chest and inlet valve, drawn over the steam so it passes through them */}
      <g opacity={dim(["inlet", "valve", "blades"])} style={fade}>
        <rect x="150" y="124" width="32" height="26" rx="5" fill={`url(#${uid}blue)`} stroke={ART.blueDark} strokeWidth="1.2" />
      </g>
      <g opacity={dim("valve")} style={fade} filter={glow("valve")}>
        <Valve uid={uid} cx={77} cy={70} active={on("valve")} />
      </g>

      {/* Labels */}
      {tag("inlet", 148, 112, "end")}
      {tag("valve", 104, 22)}
      {tag("blades", 318, 44, "middle")}
      {tag("exhaust", 466, 374)}
      {tag("gland", 160, 296)}
      {showGearbox && tag("gearbox", 556, CY - 76, "middle")}
      {tag("generator", 668, CY - 104, "middle")}
    </svg>
  );
}
