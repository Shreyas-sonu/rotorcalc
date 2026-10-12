# RotorCalc

Steam turbine calculation SaaS: a public landing page with a live 3D turbine, real accounts, plans with a
mock payment step, and four calculators (power, efficiency, steam flow, boiler) whose forms are tied to an
animated diagram of the machine.

The original single-page calculator is kept in `legacy/`.

## Run it

```bash
npm install
npm run db:migrate   # applies supabase/migrations/*.sql (needs DATABASE_URL)
npm run dev          # http://localhost:3000
```

`.env.local` (never committed):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
DATABASE_URL=postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres   # migrations only
```

Checks: `npm test` (steam engine), `npm run typecheck`, `npm run lint`, `npm run build`.

## Supabase setup

- **Email confirmation.** With "Confirm email" on (Authentication > Sign In / Providers > Email), new users
  must click a link before they can sign in, and Supabase's built-in mailer only sends a few emails an hour.
  For a demo, turn "Confirm email" off, or connect your own SMTP. The app handles both settings.
- **Redirect URLs.** Add the site address (and `http://localhost:3000` for development) under
  Authentication > URL Configuration, so confirmation and password-reset links come back to the app.

## How it is put together

| Area | Where |
|---|---|
| Steam properties (IAPWS-IF97 regions 1, 2 and saturation) | `lib/steam/if97.ts` |
| Turbine and boiler calculations, unit conversions | `lib/steam/turbine.ts`, `boiler.ts`, `units.ts` |
| Tests against published check values | `lib/steam/steam.test.ts` |
| Product name | `lib/brand.ts` |
| Plans, prices, what each plan unlocks | `lib/plans.ts` |
| Device limit | `lib/limits.ts` and `claim_session()` in the database |
| Database schema and rules | `supabase/migrations/` |
| Signed-in checks (session, device, plan) | `lib/access.ts`, `lib/session.ts`, `proxy.ts` |
| Payment gateway | `lib/billing/provider.ts` (mock in `lib/billing/mock.ts`) |
| 3D turbine (landing) and 2D cutaway (forms) | `components/turbine/` |
| Calculator screens | `components/calc/` |

### Session rules

- **One session per user.** Signing in ends every other login of that account at once.
- **Two devices per user.** A third device is refused until one of the two is removed.

Both are enforced inside the database (`claim_session`, `remove_device`, `session_check`, and
`is_active_session()` on every table's row-level-security policy), so they cannot be bypassed from a browser.

### Payments

Checkout runs in test mode: no money is taken and card details are never sent to the server. To go live,
implement `PaymentProvider` for the real gateway (for example Razorpay), point `payments` in
`lib/billing/provider.ts` at it, write subscriptions from the gateway's server-side confirmation, and drop the
`activate_mock_subscription` database function.

## Limits

Single-expansion turbines with superheated inlet steam up to 800 °C; exhaust pressure up to about 165 bar.
Extraction and reheat machines are not modelled. Results are engineering estimates: confirm with the
manufacturer before design or contractual use.
