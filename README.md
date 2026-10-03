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

| Env var | Default | Where |
|---|---|---|
| `PORT` | `4000` | server |
| `JWT_SECRET` | dev secret | server (set in production) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | web portal |
| `API_URL` | `http://localhost:4000` | scripts |

## Notes & roadmap (post-funding)

- Swap SQLite → Postgres/PostGIS (schema already mirrors it) and add a managed
  auth layer; the API surface is Supabase-shaped for easy migration.
- Real OBD-II pairing (ELM327 Bluetooth → driver phone gateway) — today DTCs are
  simulated to prove the alert pipeline.
- Roadmap features: driver behaviour scoring, route optimisation, customer
  live-tracking links, SARS mileage logbook, WhatsApp driver messaging,
  real fuel-card API integrations, dedicated telematics hardware support.
- POPIA: driver consent flow + off-duty toggle exist; add retention policies.
