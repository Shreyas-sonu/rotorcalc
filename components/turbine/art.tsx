/** Shared colours and drawing pieces for the plant illustrations. They follow the 3D model: blue machines, clad pipes, yellow guards. */
export const ART = {
  ink: "#0f1b2d",
  mut: "#4a5a70",
  dim: "#6d7b8f",
  line: "#dbe2ea",
  hot: "#e8590c",
  cool: "#0b7ec2",
  ok: "#0a8a57",
  blue: "#2f6f9e",
  blueDark: "#22557c",
  clad: "#dfe4ea",
  edge: "#98a4b1",
  steel: "#c3cbd5",
  steelDark: "#7f8b99",
  cast: "#56606c",
  concrete: "#cfd4d9",
  yellow: "#f2b705",
  red: "#d23c2a",
  cut: "#f26a1b",
  room: "#f4f8fb",
} as const;

/** Gradients and filters, namespaced by `uid` so several drawings can share a page. */
export function ArtDefs({ uid }: { uid: string }) {
  const shade = (id: string, stops: [number, string][], across = false) => (
    <linearGradient id={`${uid}${id}`} x1="0" y1="0" x2={across ? 1 : 0} y2={across ? 0 : 1}>
      {stops.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
    </linearGradient>
  );
  const metal: [number, string][] = [
    [0, "#f6f8fa"],
    [0.32, "#d5dbe2"],
    [0.8, "#8f9aa7"],
    [1, "#aab4bf"],
  ];
  const paint: [number, string][] = [
    [0, "#5f9fcd"],
    [0.45, ART.blue],
    [1, ART.blueDark],
  ];
  const grey: [number, string][] = [
    [0, "#f5f7f9"],
    [0.5, "#d6dce3"],
    [1, "#aeb7c2"],
  ];
  return (
    <>
      {shade("steel", metal)}
      {shade("steelx", metal, true)}
      {shade("blue", paint)}
      {shade("bluex", paint, true)}
      {shade("grey", grey)}
      {shade("greyx", grey, true)}
      {shade("cast", [
        [0, "#7a8591"],
        [1, "#454e59"],
      ])}
      {shade("concrete", [
        [0, "#e1e5e9"],
        [1, "#c3c8cd"],
      ])}
      <linearGradient id={`${uid}fire`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#e8420c" />
        <stop offset=".5" stopColor="#ff9a2f" />
        <stop offset=".88" stopColor="#ffe08a" />
        <stop offset="1" stopColor="#ffe9a8" stopOpacity=".1" />
      </linearGradient>
      <linearGradient id={`${uid}firebox`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#5a2a14" />
        <stop offset=".45" stopColor="#33232a" />
        <stop offset="1" stopColor="#232b38" />
      </linearGradient>
      {/* Section hatching where a painted casting has been cut through */}
      <pattern id={`${uid}cut`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#d3e2ef" />
        <path d="M0 0v6" stroke={ART.blue} strokeWidth="1.8" />
      </pattern>
      <pattern id={`${uid}brick`} width="18" height="10" patternUnits="userSpaceOnUse">
        <rect width="18" height="10" fill="#c9825a" />
        <path d="M0 0h18M0 5h18M9 0v5M0 5v5M18 5v5" stroke="#f0d2bd" strokeWidth="1" />
      </pattern>
      <filter id={`${uid}glow`} x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={ART.hot} floodOpacity=".6" />
      </filter>
      <filter id={`${uid}soft`} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={ART.ink} floodOpacity=".16" />
      </filter>
    </>
  );
}

/**
 * A pipe drawn along a path. With `fluid` it is shown cut open, with the fluid colour inside;
 * without, it is clad pipe with a band at each cladding joint and an optional `stripe` line marker.
 */
export function Pipe({ d, w, fluid, fluidOpacity = 0.3, stripe }: { d: string; w: number; fluid?: string; fluidOpacity?: number; stripe?: string }) {
  return (
    <g fill="none">
      <path d={d} stroke={ART.edge} strokeWidth={w} />
      <path d={d} stroke={ART.clad} strokeWidth={w - 2.6} />
      {fluid ? (
        <>
          <path d={d} stroke="#ffffff" strokeWidth={w * 0.56} />
          <path d={d} stroke={fluid} strokeOpacity={fluidOpacity} strokeWidth={w * 0.56} />
        </>
      ) : (
        <>
          <path d={d} stroke="#ffffff" strokeOpacity=".8" strokeWidth={w * 0.26} />
          <path d={d} stroke={ART.edge} strokeOpacity=".75" strokeWidth={w} strokeDasharray="1.6 34" />
          {stripe && <path d={d} stroke={stripe} strokeOpacity=".85" strokeWidth={Math.max(2.4, w * 0.16)} strokeDasharray="14 20" />}
        </>
      )}
    </g>
  );
}

/** A curl of steam that rises and fades. */
export function Wisp({ x, y, delay = 0, scale = 1, color = "#9db4c8", still = false }: { x: number; y: number; delay?: number; scale?: number; color?: string; still?: boolean }) {
  return (
    <path d="M0 0c-7-9 7-15 0-25s7-15 0-25" transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity={still ? 0.35 : 0}>
      {!still && <animate attributeName="opacity" values="0;.7;0" dur="2.8s" begin={`${delay}s`} repeatCount="indefinite" />}
      {!still && <animateTransform attributeName="transform" type="translate" additive="sum" values="0 6;0 -24" dur="2.8s" begin={`${delay}s`} repeatCount="indefinite" />}
    </path>
  );
}

/** Hand valve seen from the side: body, flanges, bonnet, stem and a red handwheel. `cx, cy` is the centre of the pipe. */
export function Valve({ uid, cx, cy, size = 1, active = false }: { uid: string; cx: number; cy: number; size?: number; active?: boolean }) {
  const s = size;
  const edge = active ? ART.hot : "#3c454f";
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <rect x="-19" y="-17" width="5" height="34" rx="1.2" fill={`url(#${uid}steel)`} stroke={ART.steelDark} strokeWidth=".7" />
      <rect x="14" y="-17" width="5" height="34" rx="1.2" fill={`url(#${uid}steel)`} stroke={ART.steelDark} strokeWidth=".7" />
      <path d="M-14 -13 Q0 -19 14 -13 V13 Q0 19 -14 13Z" fill={`url(#${uid}cast)`} stroke={edge} strokeWidth="1.2" />
      <rect x="-6.5" y="-31" width="13" height="15" rx="2" fill={`url(#${uid}cast)`} stroke={edge} strokeWidth="1" />
      <rect x="-1.6" y="-45" width="3.2" height="15" fill={`url(#${uid}steelx)`} />
      <ellipse cx="0" cy="-46" rx="17" ry="4.6" fill="none" stroke={ART.red} strokeWidth="3" />
      <path d="M-16 -46H16" stroke={ART.red} strokeWidth="2" />
      <circle cx="0" cy="-46" r="2.6" fill={ART.red} />
    </g>
  );
}
