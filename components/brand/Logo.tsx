/** A six-blade rotor: hot on one side, cool on the other. */
export function LogoMark({ size = 28, spin = false }: { size?: number; spin?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="lm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3167b" />
          <stop offset=".5" stopColor="#4a26e8" />
          <stop offset="1" stopColor="#0b86a8" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22.5" fill="none" stroke="url(#lm)" strokeWidth="1.5" opacity=".55" />
      <g style={spin ? { transformOrigin: "24px 24px", animation: "spin-slow 9s linear infinite" } : undefined}>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <path key={a} d="M24 24 C27 17 31 11 28 5 C22 8 20 15 24 24Z" fill="url(#lm)" transform={`rotate(${a} 24 24)`} />
        ))}
      </g>
      <circle cx="24" cy="24" r="4.2" fill="#c9f31d" stroke="#150f33" strokeWidth="1.6" />
    </svg>
  );
}

export function Logo({ size = 28, spin = false }: { size?: number; spin?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-ink">
      <LogoMark size={size} spin={spin} />
      <span style={{ fontSize: size * 0.66 }}>
        Rotor<span className="text-brand">Calc</span>
      </span>
    </span>
  );
}
