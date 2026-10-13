"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Cutaway } from "@/components/turbine/Cutaway";
import type { TurbineLive } from "@/components/turbine/Turbine3D";
import { power } from "@/lib/steam/turbine";
import { toBase } from "@/lib/steam/units";

const Turbine3D = dynamic(() => import("@/components/turbine/Turbine3D"), { ssr: false });

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const DEMO_EFFICIENCY = 0.68;

const SLIDERS = [
  { key: "flow", label: "Steam flow", unit: "TPH", min: 5, max: 120, step: 1 },
  { key: "p1", label: "Inlet pressure", unit: "kg/cm²(a)", min: 20, max: 110, step: 1 },
  { key: "t1", label: "Inlet temperature", unit: "°C", min: 320, max: 540, step: 5 },
  { key: "p2", label: "Back pressure", unit: "kg/cm²(a)", min: 0.5, max: 12, step: 0.5 },
] as const;

type Key = (typeof SLIDERS)[number]["key"];

export function Hero() {
  const [v, setV] = useState<Record<Key, number>>({ flow: 50, p1: 66, t1: 485, p2: 3.5 });
  const [use3d, setUse3d] = useState(false);
  const live = useRef<TurbineLive>({ flow: 0.5, heat: 0.7, load: 0.5, open: 0 });

  const result = useMemo(
    () =>
      power({
        mode: "basic",
        flow: toBase("flow", "TPH", v.flow),
        p1: toBase("pressure", "kg/cm²(a)", v.p1),
        T1: toBase("temperature", "°C", v.t1),
        p2: toBase("pressure", "kg/cm²(a)", v.p2),
        etaOverall: DEMO_EFFICIENCY,
      }),
    [v],
  );

  const kw = result.ok ? result.electricalPower : 0;
  const flow = (v.flow - 5) / 115;
  const heat = (v.t1 - 320) / 220;
  const load = Math.min(1, kw / 14000);
  const wet = result.ok && result.expansion.ideal.phase === "wet";

  useEffect(() => {
    live.current.flow = flow;
    live.current.heat = heat;
    live.current.load = load;
  }, [flow, heat, load]);

  useEffect(() => {
    // 3D only where it will run well: a real pointer, a wide screen, WebGL, and no reduced-motion preference.
    const wide = window.matchMedia("(min-width: 900px)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      webgl = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      webgl = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- capability is only known in the browser
    setUse3d(wide && !calm && webgl);
    const onScroll = () => {
      live.current.open = Math.min(1, Math.max(0, (window.scrollY - 40) / 420));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const flat = <Cutaway flow={flow} heat={heat} load={load} wet={wet} className="h-full w-full" />;

  return (
    <section className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" />
      <div className="pointer-events-none absolute -left-40 top-10 h-[520px] w-[520px] rounded-full bg-brand/15 blur-[140px]" />
      <div className="pointer-events-none absolute -right-40 top-40 h-[520px] w-[520px] rounded-full bg-cool/10 blur-[140px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-5 pb-6 pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pt-20">
        <div className="rise">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-mut shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            IAPWS-IF97 steam properties, checked against published values
          </div>
          <h1 className="text-[2.6rem] font-semibold leading-[1.04] tracking-tight sm:text-6xl">
            Know what your turbine <span className="marker">should</span> make.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-mut">
            Enter steam conditions. Get power output, efficiency and steam demand in seconds, with wet exhaust handled exactly and every part of
            the machine shown as you type.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-spark rounded-xl px-6 py-3.5 text-[15px]">
              Start free for 14 days
            </Link>
            <a href="#live" className="btn-ghost rounded-xl px-6 py-3.5 text-[15px] font-medium">
              Try it right here ↓
            </a>
          </div>
          <p className="mt-4 text-sm text-dim">No card needed. Works in any pressure, temperature and flow unit.</p>
        </div>

        <div className="relative h-[340px] sm:h-[440px] lg:h-[600px]">
          {/* A patch of sky behind the plant, so white steam shows against the page */}
          <div className="pointer-events-none absolute -inset-x-10 -top-6 h-[86%] bg-[radial-gradient(closest-side,#d6cffa,#e8e4fb_55%,transparent)]" />
          {use3d ? (
            <Fallback fallback={flat}>
              <Turbine3D live={live} className="!absolute inset-y-0 !w-auto -left-10 -right-5 xl:-right-20 cursor-grab active:cursor-grabbing" />
            </Fallback>
          ) : (
            <div className="flex h-full items-center">{flat}</div>
          )}
          {use3d && <div className="pointer-events-none absolute bottom-3 right-4 text-xs text-dim">Drag to rotate · scroll to lift the casing</div>}
        </div>
      </div>

      {/* Live console: the sliders drive the turbine above. */}
      <div id="live" className="relative mx-auto max-w-7xl scroll-mt-24 px-5 pb-20">
        <div className="card overflow-hidden backdrop-blur">
          <div className="steam-line h-[2px] w-full opacity-80" />
          <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:p-8">
            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {SLIDERS.map((s) => (
                <label key={s.key} className="block">
                  <span className="flex items-baseline justify-between">
                    <span className="text-sm text-mut">{s.label}</span>
                    <span className="font-mono text-base font-semibold tabular-nums">
                      {v[s.key]} <span className="text-xs font-normal text-dim">{s.unit}</span>
                    </span>
                  </span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={v[s.key]}
                    onChange={(e) => setV((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                    className="mt-3 w-full"
                    aria-label={`${s.label} in ${s.unit}`}
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-col justify-between border-line lg:border-l lg:pl-8">
              {result.ok ? (
                <>
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-dim">Generator output</div>
                    <div className="mt-1 font-mono text-5xl font-semibold tabular-nums tracking-tight">
                      {(kw / 1000).toFixed(2)}
                      <span className="ml-2 text-xl font-normal text-mut">MW</span>
                    </div>
                  </div>
                  <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-dim">Enthalpy drop</dt>
                      <dd className="font-mono tabular-nums">{result.expansion.dh.toFixed(0)} kJ/kg</dd>
                    </div>
                    <div>
                      <dt className="text-dim">Steam rate</dt>
                      <dd className="font-mono tabular-nums">{result.steamRate.toFixed(2)} kg/kWh</dd>
                    </div>
                    <div>
                      <dt className="text-dim">Ideal exhaust</dt>
                      <dd className={`font-mono tabular-nums ${wet ? "text-cool" : ""}`}>
                        {wet ? `${(result.expansion.ideal.x * 100).toFixed(1)} % dry` : `${(result.expansion.ideal.T - 273.15).toFixed(0)} °C`}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="text-sm leading-relaxed text-brand">{result.issues[0].message}</p>
              )}
              <p className="mt-5 text-xs text-dim">Live demo at {DEMO_EFFICIENCY * 100} % overall efficiency. The full calculator lets you set every loss.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
