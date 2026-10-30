# Nelvest

AI-assisted crypto trading platform. Investors either fund a **managed account** or connect **their own exchange** with a trade-only API key. One owner admin runs the console and can invite more admins with limited roles.

> **Status: test mode.** SEC Nigeria registration is in progress. Out of the box, trades are simulated (`TRADING_MODE=paper`) and deposits are off (`DEPOSITS_ENABLED=false`). Do not change either until registration is granted.

## What's in here

| Area | Where |
|---|---|
| Public site, sign-up, sign-in | `src/app/page.tsx`, `src/app/signup`, `src/app/login` |
| Investor app (portfolio, KYC, funds, connect exchange, trades) | `src/app/app/*` |
| Admin console (overview, KYC review, bot control, admins, audit) | `src/app/admin/*` |
| API routes | `src/app/api/*` |
| Database schema (Postgres via Prisma) | `prisma/schema.prisma` |
| KYC providers: mock, Dojah, Smile ID | `src/lib/kyc/*` |
| Exchange connections (CCXT): Binance, Bybit, Luno | `src/lib/exchange.ts` |
| Encrypted storage for API keys and 2FA secrets (AES-256-GCM) | `src/lib/vault.ts` |
| Trading engine: signal models, risk limits, execution | `src/lib/engine/*` |
| Admin auth: password + authenticator code, roles | `src/lib/auth.ts`, `src/middleware.ts` |

## Run it locally

```bash
cp .env.example .env          # fill in DATABASE_URL and the three secrets (npm run keygen)
npm install
npm run db:push               # creates the tables
OWNER_EMAIL=you@example.com OWNER_PASSWORD='a-long-password' npm run admin:create
npm run db:seed               # optional: 3 test investors with paper funds
npm run dev                   # http://localhost:3000
```

`admin:create` prints a setup link for Google Authenticator or Authy. You need the 6-digit code to sign in at `/admin/login`.

## Deploy to Vercel (for a test link)

1. Push this repo to GitHub.
2. On vercel.com: **Add New → Project → Import** the `nelvest` repo.
3. In the project, open **Storage → Create Database → Neon (Postgres)** and connect it. This sets `DATABASE_URL`.
4. In **Settings → Environment Variables**, add `SESSION_SECRET`, `KEY_ENCRYPTION_KEY`, `CRON_SECRET` (each from `npm run keygen`), plus `TRADING_MODE=paper`, `DEPOSITS_ENABLED=false`, `KYC_PROVIDER=mock`.
5. Deploy. Then, from your computer with the same `DATABASE_URL` in `.env`, run `npm run db:push` and `npm run admin:create` once.

## Running the trading engine

Vercel can't run a loop, and its free cron runs once a day. For testing, press **Run engine now** in Bot control. For continuous trading, run `npm run engine` on a worker host (Railway, Fly.io, Render or a VPS) with the same environment variables. It ticks every 15 minutes (`ENGINE_INTERVAL_MIN`).

## Going live checklist

- [ ] SEC registration granted
- [ ] `KYC_PROVIDER` set to `dojah` or `smileid` with production keys; field mappings re-checked against current provider docs
- [ ] External security review and penetration test
- [ ] Engine run on testnet (`TRADING_MODE=testnet`) for at least 4 weeks
- [ ] Custody, deposits and withdrawals built and reviewed (see the build plan)
- [ ] `KEY_ENCRYPTION_KEY` moved to a managed secrets store / KMS
- [ ] `TRADING_MODE=live` and `LIVE_TRADING_ACK=I-HAVE-SEC-APPROVAL`, then `DEPOSITS_ENABLED=true`
