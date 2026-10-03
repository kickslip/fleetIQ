# FleetIQ — Fleet & Logistics Management (Demo)

A working fleet-management demo for the South African market, built entirely on
zero-cost software: no cloud accounts, no API keys, no credit card. Everything
runs locally.

## What's inside

| Piece | Tech | What it does |
|---|---|---|
| `apps/web` | Next.js + MapLibre + Tailwind | Dispatch portal: live map, jobs board, fuel-fraud report, geofences, trip playback, document expiry, dashboard |
| `apps/mobile` | Expo React Native (SDK 57) | Driver app: job list, accept/arrive/complete flow, photo + signature POD, GPS tracking with offline queue, off-duty toggle |
| `apps/server` | Fastify + node:sqlite + WebSocket | REST API, GPS ingest, geofence detection, fuel-fraud reconciliation, alerts, fleet simulator |
| `scripts` | tsx | `seed.ts` demo data, `simulate.ts` sim toggle, `sample-fuel.csv` rigged for the fraud demo |

## Quick start

```bash
npm install          # install all workspaces
npm run seed         # create demo data (users, vehicles, geofences, jobs)
npm run dev          # start API (:4000) + portal (:3000) together
```

Open **http://localhost:3000** → sign in as `admin@fleet.demo` / `demo123`.

## Sponsor demo walkthrough

1. **Live map** — click **▶ Start demo fleet** in the top bar. Six vehicles start
   driving around Johannesburg on the map (WebSocket live feed, no refresh needed).
2. **Geofence alert** — within ~60 s a vehicle enters the red *Restricted —
   Industrial East* zone → critical alert pops into the dashboard feed.
3. **Dispatch** — Dispatch page → create a job → assign it to a driver → watch
   status move on the board (or run the mobile app for the real flow).
4. **Fuel fraud** — Fuel page → upload `scripts/sample-fuel.csv`:
   - `FC-1002` swiped in Sandton while the truck was in Germiston → **SUSPICIOUS**
   - `FC-1004` swiped with no GPS coverage → **SUSPICIOUS**
   - `FC-1002` second swipe of 140 L > 100 L tank → **SUSPICIOUS**
5. **OBD / maintenance** — Dashboard → *Simulate OBD fault* → a DTC (e.g. P0300
   misfire) appears as a plain-English critical alert.
6. **Trip playback** — Trips page → pick a vehicle → scrub/replay the last 12 h.
7. **Documents** — colour-coded licence disc / roadworthy / PrDP expiry warnings.

## Driver app (phone)

```bash
cd apps/mobile
npx expo start         # then scan QR with Expo Go (Android)
```

- On the login screen set **Server** to your laptop's LAN IP
  (e.g. `http://192.168.1.50:4000`) — phone and laptop must share Wi-Fi.
- Driver logins: `sipho@fleet.demo`, `john@fleet.demo`, `amahle@fleet.demo`,
  `koos@fleet.demo` — all `demo123`.
- Foreground GPS tracking works in Expo Go. **Background tracking needs a dev
  build** (`npx expo run:android` or an EAS dev build) — Expo Go can't run it.
- Toggle *On duty* to start tracking; fixes queue offline and flush on reconnect.
- Job flow: Accept → Start route → Arrived → photo + signature → Complete.

## Production APK (no cloud cost)

```bash
cd apps/mobile
npx expo run:android --variant release   # needs local Android SDK/JDK
# or npx eas-cli build --platform android --profile production --local
```

## Config

See `.env.example`. Key vars:

| Env var | Default | Where |
|---|---|---|
| `PORT` | `4000` | server |
| `JWT_SECRET` | dev secret | server (set in production) |
| `SMTP_*`, `ALERT_EMAIL_TO` | unset | server — email alerts for critical events (optional) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | web portal |
| `API_URL` | `http://localhost:4000` | scripts |

## Notifications

- **In-app alerts (default, free):** every geofence breach, fuel-fraud flag, DTC
  fault and job completion appears live in the portal's alert feed via WebSocket.
- **Email alerts (free tier):** set the `SMTP_*` vars — critical alerts are
  emailed to `ALERT_EMAIL_TO`. Gmail app-password or Brevo free (300/day) both work.
- **SMS (later):** Twilio trial or Clickatell once funded — the `createAlert()`
  hook in `apps/server/src/alerts.ts` is the single integration point.

## Free hosting options

| Setup | Cost | Notes |
|---|---|---|
| Laptop (current) | R0 | Best for the demo — no Wi-Fi needed |
| Vercel + Render free | R0 | Portal on Vercel, API on Render (sleeps ~15 min idle → 30 s cold start) |
| Vercel + Supabase | later | Needs the Postgres migration the schema was designed for |

### Deploy for testing (free)

1. **API → Render:** Dashboard → *New → Blueprint* → select this repo —
   `render.yaml` provisions a free `fleetiq-api` web service
   (URL like `https://fleetiq-api.onrender.com`). `SEED_ON_BOOT=1`
   auto-seeds the demo data on first boot — no shell needed.
2. **Portal → Vercel:** *Add New → Project* → import repo → set
   **Root Directory** to `apps/web` → add env var
   `NEXT_PUBLIC_API_URL=https://fleetiq-api.onrender.com` → deploy.
3. **Driver app:** on the login screen set *Server* to your Render URL.

⚠️ Render free caveats: sleeps after ~15 min idle (~30 s cold start —
keep the tab warm during presentations) and the SQLite DB lives on
ephemeral disk, so data resets on redeploy (demo re-seeds automatically).

## Notes & roadmap (post-funding)

- Swap SQLite → Postgres/PostGIS (schema already mirrors it) and add a managed
  auth layer; the API surface is Supabase-shaped for easy migration.
- Real OBD-II pairing (ELM327 Bluetooth → driver phone gateway) — today DTCs are
  simulated to prove the alert pipeline.
- Roadmap features: driver behaviour scoring, route optimisation, customer
  live-tracking links, SARS mileage logbook, WhatsApp driver messaging,
  real fuel-card API integrations, dedicated telematics hardware support.
- POPIA: driver consent flow + off-duty toggle exist; add retention policies.
