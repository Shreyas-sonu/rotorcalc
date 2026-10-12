"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";

/** A curl of steam that rises and fades. */
export function Wisp({ x, y, delay = 0, scale = 1, color = "#cfe9ff", still = false }: { x: number; y: number; delay?: number; scale?: number; color?: string; still?: boolean }) {
  return (
    <path d="M0 0c-7-9 7-15 0-25s7-15 0-25" transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity={still ? 0.3 : 0}>
      {!still && <animate attributeName="opacity" values="0;.6;0" dur="2.8s" begin={`${delay}s`} repeatCount="indefinite" />}
      {!still && <animateTransform attributeName="transform" type="translate" additive="sum" values="0 6;0 -24" dur="2.8s" begin={`${delay}s`} repeatCount="indefinite" />}
    </path>
  );
}

const STEAM_MAIN = "M252 92 H470 Q500 92 500 122 V150";
const EXHAUST = "M640 250 V318 Q640 338 660 338 H742";
const RETURN = "M830 372 H470 Q250 372 190 372 Q120 372 120 330 V120 Q120 92 150 92 H168";
const POWER = "M820 196 H900";

/** The whole steam side in one picture: fuel and boiler, steam main, turbine and generator, process steam, feed water back. */
export function PlantFlow({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const still = useReducedMotion() ?? false;

  const dots = (path: string, count: number, dur: number, colors: string, r = 3) =>
    !still &&
    Array.from({ length: count }, (_, i) => (
      <circle key={i} r={r}>
        <animateMotion dur={`${dur}s`} begin={`${(-i * dur) / count}s`} repeatCount="indefinite" path={path} />
        <animate attributeName="fill" values={colors} dur={`${dur}s`} begin={`${(-i * dur) / count}s`} repeatCount="indefinite" />
      </circle>
    ));

  const label = (x: number, y: number, title: string, sub: string, anchor: "start" | "middle" | "end" = "middle") => (
    <g>
      <text x={x} y={y} textAnchor={anchor} fontSize="12" letterSpacing=".1em" fill="#ffb347" style={{ textTransform: "uppercase" }}>
        {title}
      </text>
      <text x={x} y={y + 16} textAnchor={anchor} fontSize="12" fill="#8a9ab0">
        {sub}
      </text>
    </g>
  );

  return (
    <svg viewBox="0 0 1000 440" className={className} role="img" aria-label="Animated steam plant: fuel burns in the boiler, steam flows to the turbine, the turbine drives the generator, exhaust steam goes to the process, and condensate returns to the boiler as feed water.">
      <defs>
        <linearGradient id={`${uid}steel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4a60" />
          <stop offset=".5" stopColor="#1c2737" />
          <stop offset="1" stopColor="#2a3749" />
        </linearGradient>
        <linearGradient id={`${uid}fire`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff5a10" />
          <stop offset=".6" stopColor="#ffb347" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity=".15" />
        </linearGradient>
        <linearGradient id={`${uid}expand`} x1="0" x2="1">
          <stop offset="0" stopColor="#ff8a3d" stopOpacity=".4" />
          <stop offset="1" stopColor="#45cfff" stopOpacity=".3" />
        </linearGradient>
        <pattern id={`${uid}blade`} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#22303f" />
          <path d="M0 -3h10M0 2h10M0 7h10" stroke="#c9d6e6" strokeWidth="1.8" opacity=".85">
            {!still && <animateTransform attributeName="transform" type="translate" from="0 0" to="0 5" dur=".35s" repeatCount="indefinite" />}
          </path>
        </pattern>
        <filter id={`${uid}glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground line */}
      <path d="M40 400 H960" stroke="#1e2a3c" strokeWidth="2" />

      {/* Stack, drawn first so the steam main passes in front of it */}
      <g>
        <path d="M286 400 V150 H316 V400" fill={`url(#${uid}steel)`} stroke="#4a5b73" />
        <path d="M290 150 V40 H312 V150Z" fill={`url(#${uid}steel)`} stroke="#4a5b73" />
        <Wisp x={301} y={36} still={still} color="#9aa9bd" scale={1.2} />
        <Wisp x={296} y={30} delay={0.9} still={still} color="#9aa9bd" />
        <Wisp x={306} y={32} delay={1.8} still={still} color="#9aa9bd" scale={0.9} />
      </g>

      {/* Pipes: casing first, then the coloured flow inside */}
      <path d={RETURN} fill="none" stroke={`url(#${uid}steel)`} strokeWidth="18" />
      <path d={RETURN} fill="none" stroke="#45cfff" strokeOpacity=".35" strokeWidth="8" />
      <path d={STEAM_MAIN} fill="none" stroke={`url(#${uid}steel)`} strokeWidth="22" />
      <path d={STEAM_MAIN} fill="none" stroke="#ff8a3d" strokeOpacity=".45" strokeWidth="11" />
      <path d={EXHAUST} fill="none" stroke={`url(#${uid}steel)`} strokeWidth="22" />
      <path d={EXHAUST} fill="none" stroke="#7fd9ff" strokeOpacity=".4" strokeWidth="11" />

      {/* Boiler */}
      <g>
        <path d="M150 150 H280 V400 H150Z" fill="#0a1019" stroke="#4a5b73" strokeWidth="2" />
        {[172, 197, 222, 247].map((x) => (
          <path key={x} d={`M${x} 128V352`} stroke="#45cfff" strokeOpacity=".45" strokeWidth="6" strokeLinecap="round" />
        ))}
        <g filter={`url(#${uid}glow)`}>
          {[176, 215, 254].map((x, i) => (
            <path key={x} d={`M${x - 16} 396 Q${x - 22} ${330 - i * 10} ${x} ${286 - (i % 2) * 22} Q${x + 22} ${330 - i * 10} ${x + 16} 396Z`} fill={`url(#${uid}fire)`}>
              {!still && <animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 3;0 0" dur={`${0.7 + i * 0.17}s`} repeatCount="indefinite" />}
            </path>
          ))}
        </g>
        <rect x="160" y="64" width="110" height="58" rx="29" fill={`url(#${uid}steel)`} stroke="#5d6f88" strokeWidth="1.6" />
        <path d="M170 96 H260 A24 24 0 0 1 246 118 H184 A24 24 0 0 1 170 96Z" fill="#45cfff" fillOpacity=".3" />
        {/* Fuel conveyor */}
        <path d="M40 330 L150 372 V392 L40 350Z" fill={`url(#${uid}steel)`} stroke="#4a5b73" />
        {!still &&
          [0, 1, 2, 3].map((i) => (
            <rect key={i} width="9" height="6" rx="1.5" fill="#c79a5b">
              <animateMotion dur="2.8s" begin={`${-i * 0.7}s`} repeatCount="indefinite" path="M44 328 L146 366" />
            </rect>
          ))}
      </g>

      {/* Turbine */}
      <g>
        <path d="M470 150 L650 108 V292 L470 250Z" fill={`url(#${uid}steel)`} stroke="#5d6f88" strokeWidth="1.6" />
        <path d="M480 160 L640 122 V278 L480 240Z" fill="#070c14" />
        <path d="M480 160 L640 122 V278 L480 240Z" fill={`url(#${uid}expand)`} />
        {[500, 536, 572, 608].map((x, i) => {
          const h = 36 + i * 11;
          return (
            <g key={x}>
              <rect x={x} y={200 - h} width="7" height={h - 12} fill="#3d4d63" stroke="#5d6f88" strokeWidth=".7" />
              <rect x={x} y={212} width="7" height={h - 12} fill="#3d4d63" stroke="#5d6f88" strokeWidth=".7" />
              <rect x={x + 14} y={200 - h - 4} width="9" height={h - 8} fill={`url(#${uid}blade)`} />
              <rect x={x + 14} y={212} width="9" height={h - 8} fill={`url(#${uid}blade)`} />
            </g>
          );
        })}
        <rect x="440" y="193" width="330" height="14" rx="3" fill="#7b8ca3" />
      </g>

      {/* Generator and power out */}
      <g>
        <rect x="720" y="140" width="100" height="112" rx="14" fill={`url(#${uid}steel)`} stroke="#5d6f88" strokeWidth="1.6" />
        <circle cx="770" cy="196" r="24" fill="#0c131e" stroke="#3ddc97" strokeWidth="1.6" />
        <path d="M774 182l-11 16h8l-5 12 12-17h-8z" fill="#3ddc97" style={still ? undefined : { animation: "pulse-glow 1.6s ease-in-out infinite" }} />
        <path d={POWER} stroke="#3ddc97" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M900 400 L920 130 L940 400 M905 330 H935 M909 270 H931 M896 160 H944 M900 196 H940" fill="none" stroke="#51627a" strokeWidth="2" />
        <path d="M944 160 Q975 176 990 168 M940 196 Q972 212 990 204" fill="none" stroke="#3ddc97" strokeOpacity=".7" strokeWidth="1.6" />
      </g>

      {/* Process / condenser */}
      <g>
        <rect x="742" y="304" width="100" height="84" rx="10" fill={`url(#${uid}steel)`} stroke="#5d6f88" strokeWidth="1.6" />
        <path d="M756 326 h72 M756 346 h72 M756 366 h72" stroke="#45cfff" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round" />
        <Wisp x={770} y={300} still={still} />
        <Wisp x={792} y={296} delay={0.7} still={still} scale={1.2} />
        <Wisp x={814} y={300} delay={1.5} still={still} />
      </g>

      {/* Feed pump */}
      <g>
        <circle cx="400" cy="372" r="20" fill="#0c131e" stroke="#8fa1b8" strokeWidth="1.8" />
        <path d="M410 372 h-18 M398 365 l-7 7 7 7" fill="none" stroke="#45cfff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Flow */}
      {dots(STEAM_MAIN, 7, 2.6, "#ffb347;#ff7a2f", 3.4)}
      {dots(EXHAUST, 4, 2.2, "#bfe9ff;#45cfff")}
      {dots(RETURN, 10, 6, "#45cfff;#45cfff", 2.8)}
      {dots(POWER, 2, 0.9, "#3ddc97;#3ddc97", 3)}

      {label(215, 424, "Boiler", "fuel in, steam out")}
      {label(400, 46, "Steam main", "high pressure, superheated")}
      {label(600, 76, "Turbine", "steam expands, rotor turns")}
      {label(770, 108, "Generator", "power to the bus")}
      {label(792, 424, "Process", "low-pressure steam")}
      {label(400, 424, "Feed water", "condensate returns")}
    </svg>
  );
}
