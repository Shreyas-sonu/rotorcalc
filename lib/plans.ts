// Plans, placeholder prices and what each plan unlocks. Edit here; every screen reads from this file.

export type PlanId = "trial" | "pro" | "plant";
export type Cycle = "monthly" | "yearly";
export type CalculatorId = "power" | "efficiency" | "flow" | "boiler";

export type Plan = {
  id: PlanId;
  name: string;
  blurb: string;
  /** Rupees per month when billed monthly. 0 for the trial. */
  monthly: number;
  /** Rupees per year when billed yearly. */
  yearly: number;
  calculators: CalculatorId[];
  advancedMode: boolean;
  /** Saved calculations allowed. null means unlimited. */
  savedLimit: number | null;
  features: string[];
  highlight?: boolean;
};

export const TRIAL_DAYS = 14;

export const PLANS: Plan[] = [
  {
    id: "trial",
    name: "Trial",
    blurb: `Free for ${TRIAL_DAYS} days. No card needed.`,
    monthly: 0,
    yearly: 0,
    calculators: ["power"],
    advancedMode: false,
    savedLimit: 5,
    features: [
      "Turbine power calculator",
      "All pressure, temperature and flow units",
      "Live turbine diagram",
      "5 saved calculations",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "For engineers who size and check turbines every week.",
    monthly: 1499,
    yearly: 14990,
    calculators: ["power", "efficiency", "flow"],
    advancedMode: true,
    savedLimit: 200,
    features: [
      "Power, efficiency and steam flow calculators",
      "Advanced mode: stage, gearbox and generator losses",
      "Exhaust dryness and expansion chart",
      "200 saved calculations",
      "Printable reports",
    ],
    highlight: true,
  },
  {
    id: "plant",
    name: "Plant",
    blurb: "The whole steam side of the plant, boiler to busbar.",
    monthly: 4999,
    yearly: 49990,
    calculators: ["power", "efficiency", "flow", "boiler"],
    advancedMode: true,
    savedLimit: null,
    features: [
      "Everything in Pro",
      "Boiler steam generation with fuel blending",
      "Unlimited saved calculations",
      "Priority support",
    ],
  },
];

export const CALCULATORS: { id: CalculatorId; name: string; short: string; href: string }[] = [
  { id: "power", name: "Power output", short: "Generator output from steam conditions", href: "/app" },
  { id: "efficiency", name: "Efficiency", short: "Isentropic and overall efficiency from readings", href: "/app/efficiency" },
  { id: "flow", name: "Steam flow", short: "Steam needed for a power target", href: "/app/flow" },
  { id: "boiler", name: "Boiler", short: "Steam generation from a fuel mix", href: "/app/boiler" },
];

export function getPlan(id: string | null | undefined): Plan | null {
  return PLANS.find((p) => p.id === id) ?? null;
}

export function priceOf(plan: Plan, cycle: Cycle): number {
  return cycle === "yearly" ? plan.yearly : plan.monthly;
}

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
