"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import { ART, ArtDefs, Pipe, Valve, Wisp } from "./art";

const STEAM_MAIN = "M252 92 H470 Q500 92 500 122 V132";
const EXHAUST = "M640 286 V318 Q640 338 660 338 H744";
const RETURN = "M812 366 V376 Q812 386 802 386 H352 Q336 386 336 370 V134 Q336 116 318 116 H262";
const POWER = "M838 196 H902";

const GROUND = 400;
const DECK = 296;
const SHAFT = 200;
const STRUCT = "#4f6a85";
const FUEL = "#a8743a";
/** Half-height of the turbine casing at x: it widens towards the low-pressure end. */
const casing = (x: number) => 48 + (x - 474) * (40 / 172);
/** Top edge of the window cut into the casing. */
const windowTop = (x: number) => SHAFT - casing(x) + 9;
const STAGES = [500, 534, 568, 602];

/** The whole steam side in one picture: fuel and boiler, steam main, turbine and generator, process steam, feed water back. */
export function PlantFlow({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const still = useReducedMotion() ?? false;

  const dots = (path: string, count: number, dur: number, color: string, r = 3) =>
    !still &&
    Array.from({ length: count }, (_, i) => (
      <circle key={i} r={r} fill={color} stroke="#ffffff" strokeWidth=".9">
        <animateMotion dur={`${dur}s`} begin={`${(-i * dur) / count}s`} repeatCount="indefinite" path={path} />
      </circle>
    ));

  const label = (x: number, y: number, title: string, sub: string) => (
    <g>
      <text x={x} y={y} textAnchor="middle" fontSize="12" fontWeight="600" letterSpacing=".1em" fill={ART.hot} style={{ textTransform: "uppercase" }}>
        {title}
      </text>
      <text x={x} y={y + 16} textAnchor="middle" fontSize="12" fill={ART.mut}>
        {sub}
      </text>
    </g>
  );

  return (
    <svg viewBox="0 0 1000 452" className={className} role="img" aria-label="Animated steam plant: fuel burns in the boiler, steam flows to the turbine, the turbine drives the generator, exhaust steam goes to the process, and condensate returns to the boiler as feed water.">
      <defs>
        <ArtDefs uid={uid} />
        <linearGradient id={`${uid}expand`} x1="0" x2="1">
          <stop offset="0" stopColor={ART.hot} stopOpacity=".3" />
          <stop offset="1" stopColor={ART.cool} stopOpacity=".22" />
        </linearGradient>
        <pattern id={`${uid}blade`} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#e9edf2" />
          <path d="M0 -3h10M0 2h10M0 7h10" stroke={ART.steelDark} strokeWidth="1.8">
            {!still && <animateTransform attributeName="transform" type="translate" from="0 0" to="0 5" dur=".35s" repeatCount="indefinite" />}
          </path>
        </pattern>
        <filter id={`${uid}flame`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground */}
      <rect x="0" y={GROUND} width="1000" height="7" fill={`url(#${uid}concrete)`} />
      <path d={`M0 ${GROUND}H1000`} stroke="#b3bac2" strokeWidth="1" />

      {/* Grid connection */}
      <g fill="none">
        <path d="M900 400 L920 130 L940 400 M905 330 H935 M909 270 H931 M896 160 H944 M900 196 H940 M905 330 L931 270 M935 330 L909 270 M909 270 L928 196 M931 270 L912 196" stroke={ART.steelDark} strokeWidth="1.8" />
        <path d="M944 160 Q975 176 1000 168 M940 196 Q972 212 1000 204" stroke="#3c454f" strokeWidth="1.4" />
        <path d={POWER} stroke="#3c454f" strokeWidth="3.4" strokeLinecap="round" />
      </g>

      {/* Stack */}
      <g>
        <path d={`M285 ${GROUND} L291 44 H311 L317 ${GROUND}Z`} fill={`url(#${uid}greyx)`} stroke={ART.edge} strokeWidth="1.2" />
        <path d="M290.6 52 H311.4 L311.9 78 H290.2Z M289.8 104 H312.2 L312.7 130 H289.4Z" fill={ART.red} />
        <rect x="288.5" y="40" width="25" height="5" rx="1.5" fill={ART.cast} />
        <path d="M288 220H314M287 310H315" stroke={ART.edge} strokeWidth="1.6" />
        <rect x="278" y="168" width="12" height="22" fill={ART.clad} stroke={ART.edge} />
        <Wisp x={301} y={36} still={still} scale={1.2} />
        <Wisp x={296} y={30} delay={0.9} still={still} />
        <Wisp x={306} y={32} delay={1.8} still={still} scale={0.9} />
      </g>

      {/* Columns under the turbine floor */}
      {[458, 690, 846].map((x) => (
        <rect key={x} x={x} y={DECK + 8} width="12" height={GROUND - DECK - 8} fill={`url(#${uid}concrete)`} stroke="#b3bac2" strokeWidth=".8" />
      ))}

      {/* Feed water line */}
      <Pipe d={RETURN} w={13} stripe={ART.cool} />

      {/* Fuel yard and conveyor */}
      <g>
        <path d={`M8 ${GROUND} Q36 352 70 ${GROUND}Z`} fill={FUEL} />
        <path d={`M24 ${GROUND} Q44 372 66 ${GROUND}Z`} fill="#bf8a4c" />
        <path d={`M76 ${GROUND} L92 356 M110 ${GROUND} L92 356 M122 ${GROUND} L132 330`} stroke={STRUCT} strokeWidth="3" />
        <path d="M40 386 L148 316" stroke="#3c454f" strokeWidth="8" strokeLinecap="round" />
        <path d="M40 386 L148 316" stroke="#8f9aa7" strokeWidth="1.4" strokeDasharray="5 6" strokeLinecap="round" />
        <circle cx="40" cy="386" r="6.5" fill={`url(#${uid}steel)`} stroke="#3c454f" strokeWidth="1.4" />
        {!still &&
          [0, 1, 2, 3].map((i) => (
            <rect key={i} width="9" height="6" rx="1.5" fill={FUEL} stroke="#7a5226" strokeWidth=".6">
              <animateMotion dur="2.8s" begin={`${-i * 0.7}s`} repeatCount="indefinite" path="M40 372 L144 304" />
            </rect>
          ))}
      </g>

      {/* Steam main, drawn before the drum so it leaves from behind it */}
      <Pipe d={STEAM_MAIN} w={20} stripe={ART.hot} />

      {/* Boiler */}
      <g>
        <path d="M150 144V130H280V144M172 130v14M258 130v14M215 130v14" fill="none" stroke={ART.yellow} strokeWidth="1.8" />
        <rect x="150" y="150" width="130" height={GROUND - 150} fill="#e4e8ed" stroke={ART.edge} strokeWidth="1.2" />
        <path d={Array.from({ length: 12 }, (_, i) => `M${160 + i * 10} 152V${GROUND}`).join("")} stroke="#c7ced7" strokeWidth="1.4" />
        <rect x="262" y="150" width="18" height={GROUND - 150} fill={ART.ink} fillOpacity=".05" />
        {[190, 258].map((y) => (
          <rect key={y} x="145" y={y} width="140" height="9" fill={STRUCT} />
        ))}
        <rect x="145" y="150" width="7" height={GROUND - 150} fill={STRUCT} />
        <rect x="278" y="150" width="7" height={GROUND - 150} fill={STRUCT} />
        <rect x="143" y="144" width="144" height="8" rx="1" fill={STRUCT} />
        <path d="M138 300 H152 V332 L138 324Z" fill={ART.clad} stroke={ART.edge} />
        {/* Window into the furnace */}
        <rect x="168" y="288" width="94" height="104" rx="6" fill={`url(#${uid}firebox)`} stroke={ART.cut} strokeWidth="2.2" />
        <path d="M182 292V388M198 292V388M232 292V388M248 292V388" stroke="#aeb7c2" strokeOpacity=".55" strokeWidth="3" />
        <g filter={`url(#${uid}flame)`}>
          {[190, 215, 240].map((x, i) => (
            <path key={x} d={`M${x - 13} 390 Q${x - 18} ${350 - i * 6} ${x} ${322 - (i % 2) * 16} Q${x + 18} ${350 - i * 6} ${x + 13} 390Z`} fill={`url(#${uid}fire)`}>
              {!still && <animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 3;0 0" dur={`${0.7 + i * 0.17}s`} repeatCount="indefinite" />}
            </path>
          ))}
        </g>
        {/* Steam drum on its saddles */}
        {[182, 240].map((x) => (
          <rect key={x} x={x} y="120" width="8" height="26" fill={STRUCT} />
        ))}
        <rect x="160" y="66" width="110" height="56" rx="27" fill={`url(#${uid}grey)`} stroke={ART.edge} strokeWidth="1.4" />
        <path d="M188 67V121M215 66V122M242 67V121" stroke={ART.edge} strokeWidth="1.3" />
        <rect x="193" y="54" width="6" height="13" fill={`url(#${uid}steelx)`} stroke={ART.steelDark} strokeWidth=".5" />
        <rect x="189" y="47" width="14" height="8" rx="2" fill={ART.red} />
      </g>
      <Valve uid={uid} cx={384} cy={92} size={0.8} />

      {/* Exhaust to the process, through the turbine floor */}
      <Pipe d={EXHAUST} w={22} stripe={ART.cool} />
      <rect x="446" y={DECK} width="418" height="10" fill={`url(#${uid}concrete)`} stroke="#b3bac2" strokeWidth=".8" />

      {/* Turbine */}
      <g>
        {[453, 669].map((x) => (
          <rect key={x} x={x - 7} y={SHAFT + 14} width="14" height={DECK - SHAFT - 14} fill={`url(#${uid}cast)`} />
        ))}
        {[500, 600].map((x) => (
          <rect key={x} x={x - 6} y={SHAFT + casing(x) - 2} width="12" height={DECK - SHAFT - casing(x) + 2} fill={`url(#${uid}cast)`} />
        ))}
        <rect x="436" y={SHAFT - 6} width="290" height="12" rx="3" fill={`url(#${uid}steel)`} stroke={ART.steelDark} strokeWidth=".6" />
        <rect x="485" y="124" width="30" height="28" rx="5" fill={`url(#${uid}blue)`} stroke={ART.blueDark} strokeWidth="1.2" />
        <path
          d={`M474 ${SHAFT - 48} L646 ${SHAFT - 88} Q654 ${SHAFT - 88} 654 ${SHAFT - 78} V${SHAFT + 78} Q654 ${SHAFT + 88} 646 ${SHAFT + 88} L474 ${SHAFT + 48} Q468 ${SHAFT + 48} 468 ${SHAFT + 40} V${SHAFT - 40} Q468 ${SHAFT - 48} 474 ${SHAFT - 48}Z`}
          fill={`url(#${uid}blue)`}
          stroke={ART.blueDark}
          strokeWidth="1.4"
        />
        {/* Window cut into the upper casing: rotor, nozzles and blade rows */}
        <path d={`M488 ${windowTop(488)} L636 ${windowTop(636)} V${SHAFT - 5} H488Z`} fill={ART.room} />
        <path d={`M488 ${windowTop(488)} L636 ${windowTop(636)} V${SHAFT - 5} H488Z`} fill={`url(#${uid}expand)`} />
        <rect x="488" y={SHAFT - 13} width="148" height="8" fill={`url(#${uid}steel)`} />
        {STAGES.map((x) => (
          <g key={x}>
            <rect x={x - 6} y={windowTop(x - 3) + 1} width="5" height={SHAFT - 15 - windowTop(x - 3)} fill="#8793a1" stroke="#5f6b78" strokeWidth=".6" />
            <rect x={x + 7} y={SHAFT - 26} width="11" height="21" rx="1.5" fill={`url(#${uid}steel)`} stroke={ART.steelDark} strokeWidth=".6" />
            <rect x={x + 8.5} y={windowTop(x + 17) + 4} width="8" height={SHAFT - 30 - windowTop(x + 17)} fill={`url(#${uid}blade)`} stroke={ART.steelDark} strokeWidth=".5" />
          </g>
        ))}
        <path d={`M488 ${windowTop(488)} L636 ${windowTop(636)} V${SHAFT - 5} H488Z`} fill="none" stroke={ART.cut} strokeWidth="2.2" strokeLinejoin="round" />
        {/* Horizontal joint flange and its bolts */}
        <rect x="466" y={SHAFT - 5} width="190" height="10" rx="2" fill="#3d7fae" stroke={ART.blueDark} strokeWidth=".8" />
        <path d={`M474 ${SHAFT}H650`} stroke="#d5dbe2" strokeWidth="3.2" strokeDasharray="3.2 9" strokeLinecap="round" />
        {[453, 669].map((x) => (
          <rect key={x} x={x - 9} y={SHAFT - 16} width="18" height="32" rx="3" fill={`url(#${uid}blue)`} stroke={ART.blueDark} />
        ))}
        <rect x="684" y={SHAFT - 16} width="30" height="32" rx="5" fill={ART.yellow} stroke="#b88a00" strokeWidth=".8" />
      </g>

      {/* Generator on its plinth */}
      <g>
        <rect x="714" y="250" width="128" height={DECK - 250} fill={`url(#${uid}concrete)`} stroke="#b3bac2" strokeWidth=".8" />
        <rect x="820" y="176" width="18" height="40" rx="3" fill="#51606f" />
        <rect x="736" y="124" width="68" height="19" rx="3" fill={`url(#${uid}grey)`} stroke={ART.edge} />
        <path d="M743 130h54M743 136h54" stroke={ART.edge} strokeWidth="1.4" />
        <rect x="720" y="142" width="100" height="108" rx="12" fill={`url(#${uid}grey)`} stroke={ART.edge} strokeWidth="1.4" />
        <path d={Array.from({ length: 7 }, (_, i) => `M${737 + i * 11} 144V248`).join("")} stroke="#b4bdc8" strokeWidth="1.5" />
        <rect x="720" y="142" width="11" height="108" rx="5" fill={`url(#${uid}blue)`} stroke={ART.blueDark} strokeWidth=".8" />
        <rect x="809" y="142" width="11" height="108" rx="5" fill={`url(#${uid}blue)`} stroke={ART.blueDark} strokeWidth=".8" />
        <rect x="750" y="176" width="40" height="40" rx="6" fill="#ffffff" stroke={ART.edge} strokeWidth="1.2" />
        <path d="M774 184l-11 15h8l-5 12 12-16h-8z" fill={ART.ok} style={still ? undefined : { animation: "pulse-glow 1.6s ease-in-out infinite" }} />
      </g>

      {/* Process heat exchanger */}
      <g>
        {[764, 820].map((x) => (
          <path key={x} d={`M${x - 8} 362 H${x + 8} L${x + 11} ${GROUND} H${x - 11}Z`} fill={`url(#${uid}cast)`} />
        ))}
        <rect x="742" y="318" width="102" height="48" rx="24" fill={`url(#${uid}grey)`} stroke={ART.edge} strokeWidth="1.4" />
        <path d="M768 319V365M818 319V365" stroke={ART.edge} strokeWidth="1.3" />
        <path d="M776 330h34M776 342h34M776 354h34" stroke={ART.cool} strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Feed pump and motor */}
      <g>
        <rect x="386" y="396" width="66" height="4" fill={ART.cast} />
        <rect x="416" y="374" width="32" height="22" rx="4" fill={`url(#${uid}grey)`} stroke={ART.edge} />
        <path d="M424 376v18M431 376v18M438 376v18" stroke="#b4bdc8" strokeWidth="1.3" />
        <rect x="410" y="382" width="7" height="8" fill={`url(#${uid}steel)`} />
        <circle cx="400" cy="386" r="13" fill={`url(#${uid}blue)`} stroke={ART.blueDark} strokeWidth="1.2" />
        <circle cx="400" cy="386" r="6" fill="#d3e2ef" stroke={ART.blueDark} strokeWidth=".8" />
        <path d="M400 380v12M394 386h12" stroke={ART.blueDark} strokeWidth="1.6" strokeLinecap="round">
          {!still && <animateTransform attributeName="transform" type="rotate" from="0 400 386" to="360 400 386" dur="1.2s" repeatCount="indefinite" />}
        </path>
      </g>

      {/* Flow */}
      {dots(STEAM_MAIN, 7, 2.6, ART.hot, 3.4)}
      {dots(EXHAUST, 4, 2.2, ART.cool)}
      {dots(RETURN, 10, 6, ART.cool, 2.8)}
      {dots(POWER, 2, 0.9, ART.ok, 3)}

      {label(215, 426, "Boiler", "fuel in, steam out")}
      {label(432, 22, "Steam main", "high pressure, superheated")}
      {label(604, 80, "Turbine", "steam expands, rotor turns")}
      {label(770, 92, "Generator", "power to the bus")}
      {label(793, 426, "Process", "low-pressure steam")}
      {label(400, 426, "Feed water", "condensate returns")}
    </svg>
  );
}
