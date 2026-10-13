import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Hero } from "@/components/landing/Hero";
import { PartsExplorer } from "@/components/landing/PartsExplorer";
import { Pricing } from "@/components/landing/Pricing";
import { PlantFlow } from "@/components/turbine/PlantFlow";
import { BRAND } from "@/lib/brand";

const CALCS = [
  { title: "Power output", text: "Generator output from steam flow, inlet conditions and back pressure. Basic mode for a quick answer, advanced mode for every loss.", icon: "M13 2L4 14h7l-1 8 9-12h-7z" },
  { title: "Efficiency", text: "Isentropic and overall efficiency from the readings you already log: outlet temperature and generator kW.", icon: "M12 3a9 9 0 1 0 9 9M12 7v5l4 2" },
  { title: "Steam flow", text: "The steam you need to hit a power target, and the specific steam consumption that goes with it.", icon: "M3 8c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0" },
  { title: "Boiler", text: "Steam generation from bagasse, rice husk, coal or any blend, on the fuel's calorific value and boiler efficiency.", icon: "M12 22c4 0 7-3 7-7 0-5-4-6-4-11-3 2-4 5-4 7-2-1-3-3-3-5-2 3-3 5-3 9 0 4 3 7 7 7z" },
];

const SHORTCUT = [
  { case: "66 ata, 485 °C → 3.5 ata", error: 0.3 },
  { case: "32 kg/cm²g, 380 °C → 1.5 kg/cm²g", error: 6 },
  { case: "66 ata, 485 °C → 0.5 ata", error: 23 },
  { case: "66 ata, 485 °C → 0.1 ata", error: 31 },
];

const STEPS = [
  { n: "01", title: "Enter what you know", text: "Flow, pressures and temperatures in the units on your gauges. No steam tables to look up." },
  { n: "02", title: "Watch the machine respond", text: "The turbine diagram lights up the part each number belongs to, so nothing goes in the wrong box." },
  { n: "03", title: "Use the result", text: "Power, efficiency, steam rate and exhaust condition. Save it, reopen it, print it for the file." },
];

const FAQ = [
  { q: "Which steam properties does it use?", a: "The IAPWS-IF97 industrial formulation, the standard behind modern steam tables. Our implementation is tested against the published check values on every change." },
  { q: "Does it handle wet exhaust?", a: "Yes. When the expansion ends inside the wet region the enthalpy drop is calculated exactly, and you see the dryness fraction. Many spreadsheets extrapolate superheated-steam equations here and understate power." },
  { q: "Which turbines is it for?", a: "Single-expansion back-pressure and condensing machines up to 800 °C inlet. Extraction and reheat machines are on the roadmap." },
  { q: "Can I use gauge pressure?", a: "Yes. Pick kg/cm²(g), bar(g) or psi(g) and the conversion to absolute pressure is done for you. Absolute units, MPa, °F, kg/h and lb/h are there too." },
  { q: "Is the payment real?", a: "Not yet. During the preview, checkout runs in test mode and no money is taken." },
  { q: "How many devices can I sign in on?", a: "Two devices per account, one signed in at a time. Signing in on one signs the other out." },
];

function Section({ id, eyebrow, title, lead, children }: { id?: string; eyebrow: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20">
      <div className="mb-12 max-w-2xl">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">{eyebrow}</div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        {lead && <p className="mt-4 text-lg leading-relaxed text-mut">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

export default function Landing() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/" aria-label={`${BRAND.name} home`}>
            <Logo spin />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-mut md:flex">
            <a href="#calculators" className="hover:text-ink">Calculators</a>
            <a href="#plant" className="hover:text-ink">The plant</a>
            <a href="#machine" className="hover:text-ink">The machine</a>
            <a href="#accuracy" className="hover:text-ink">Accuracy</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/login" className="rounded-lg px-3 py-2 text-mut hover:text-ink">Sign in</Link>
            <Link href="/register" className="btn-spark rounded-lg px-4 py-2">Start free</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Hero />

        <div className="border-y border-line bg-panel">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-5 py-10 lg:grid-cols-4">
            {[
              ["IF97", "industrial steam standard"],
              ["6 digits", "agreement with published check values"],
              ["18", "automated checks on every change"],
              ["17", "pressure, temperature, flow and power units"],
            ].map(([big, small]) => (
              <div key={small}>
                <dt className="font-mono text-3xl font-semibold tracking-tight">{big}</dt>
                <dd className="mt-1 text-sm text-mut">{small}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Section id="calculators" eyebrow="Calculators" title="Four answers plant engineers ask for every week." lead="Each one shares the same verified steam properties, the same units and the same live diagram.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CALCS.map((c) => (
              <div key={c.title} className="card group p-6 transition-colors hover:border-brand/40">
                <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl border border-line bg-ink/[0.04] text-brand transition-colors group-hover:border-brand/50">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={c.icon} />
                  </svg>
                </div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mut">{c.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="plant" eyebrow="The plant" title="From fuel to power, the whole steam side." lead="Boiler, steam main, turbine, generator, process steam and feed water. Every calculator works on one part of this loop, with the same steam properties throughout.">
          <div className="card overflow-hidden">
            <div className="steam-line h-[2px] opacity-70" />
            <div className="p-4 sm:p-8">
              <PlantFlow className="w-full" />
            </div>
            <dl className="grid gap-px border-t border-line bg-line sm:grid-cols-4">
              {[
                ["Boiler", "Steam generated from your fuel mix"],
                ["Steam flow", "Steam the turbine needs for a target"],
                ["Power output", "What the generator should deliver"],
                ["Efficiency", "How well the machine is really doing"],
              ].map(([name, text]) => (
                <div key={name} className="bg-panel px-5 py-4">
                  <dt className="text-sm font-semibold">{name}</dt>
                  <dd className="mt-1 text-sm text-mut">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        <Section id="machine" eyebrow="The machine" title="Every input has a place on the turbine." lead="Point at a part to see what it does and which numbers belong to it. The calculator form works the same way.">
          <PartsExplorer />
        </Section>

        <Section id="accuracy" eyebrow="Accuracy" title="Wet exhaust is where shortcuts go wrong." lead="A common spreadsheet shortcut treats wet exhaust steam as if it were superheated. This is how much power it hides, on four real operating points.">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
            <div className="card p-6 sm:p-8">
              <div className="grid gap-6">
                {SHORTCUT.map((s) => (
                  <div key={s.case}>
                    <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
                      <span className="text-mut">{s.case}</span>
                      <span className="font-mono font-semibold tabular-nums text-bad">−{s.error} %</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand to-hot" style={{ width: `${Math.max(2, (s.error / 31) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-7 text-sm text-dim">Shortfall in isentropic enthalpy drop from the superheated-only shortcut, against the exact wet-steam calculation {BRAND.name} uses.</p>
            </div>
            <div className="card flex flex-col justify-between p-6 sm:p-8">
              <div>
                <div className="font-mono text-5xl font-semibold tracking-tight text-ok">0 %</div>
                <p className="mt-3 leading-relaxed text-mut">
                  {BRAND.name} uses the exact relation on the saturation line and reports the dryness fraction, so the answer holds from back-pressure sets down to condensing vacuum.
                </p>
              </div>
              <ul className="mt-6 grid gap-2.5 text-sm text-mut">
                <li>• Inlet valve throttling at constant enthalpy</li>
                <li>• Clear refusal when a reading cannot be right</li>
                <li>• Blade erosion warning below 88 % dryness</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section eyebrow="How it works" title="From gauge readings to a number you can defend.">
          <div className="grid gap-5 lg:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card p-7">
                <div className="steam-text font-mono text-sm font-semibold">{s.n}</div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-mut">{s.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="pricing" eyebrow="Pricing" title="Start free. Upgrade when it earns its keep.">
          <Pricing />
        </Section>

        <Section id="faq" eyebrow="FAQ" title="Questions engineers ask first.">
          <div className="grid gap-3 lg:grid-cols-2">
            {FAQ.map((f) => (
              <details key={f.q} className="card group p-5 open:border-brand/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span className="text-brand transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-mut">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>

        <section className="mx-auto max-w-7xl px-5 pb-24">
          <div className="card relative overflow-hidden px-6 py-16 text-center sm:px-12">
            <div className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-64 w-2/3 rounded-full bg-brand/20 blur-[110px]" />
            <h2 className="relative mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
              Run your first calculation in <span className="marker">under a minute.</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-mut">Free for 14 days. No card, no steam tables, no spreadsheet.</p>
            <Link href="/register" className="btn-spark relative mt-8 inline-block rounded-xl px-8 py-4 text-base">
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-dim">
          <Logo size={22} />
          <p>Engineering estimates. Confirm with the manufacturer before design or contractual use.</p>
          <p className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <span>© 2026 {BRAND.name}</span>
          </p>
        </div>
      </footer>
    </>
  );
}
