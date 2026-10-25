# Tokri — Quick Commerce (Shared Carts + AI Kits)

A working implementation of the Tokri PRD: a 10–20 minute quick-commerce app differentiated by
**Tokri Together** (live shared carts) and **Kit Bana Do** (AI goal-to-shopping-list assistant).

This is a full-stack scaffold with real architecture end to end, but external paid/regulated
integrations (SMS/DLT, Razorpay, a live LLM key) run in **mock mode** by default so the whole
product works locally with zero third-party accounts.

## Stack

- **apps/web** — Next.js 16 (App Router) + React 19, Tailwind v4, Zustand, TanStack Query,
  Socket.IO client, React Three Fiber + drei + Rapier, GSAP + Lenis, Radix UI primitives.
- **apps/api** — NestJS 12 (ESM) + Socket.IO gateway, Prisma + PostgreSQL, Redis (OTP/rate
  limits), BullMQ-ready, Razorpay/MSG91/Claude integration points.
- **packages/shared** — Zod schemas shared between client and server (socket payloads, kit
  result shape) so the two never drift.

## Running it locally

Prerequisites: Node 20+, PostgreSQL (with `pg_trgm` enabled), Redis.

```bash
npm install
npm run build:shared

# apps/api
cd apps/api
cp .env.example .env        # edit DATABASE_URL to match your Postgres instance
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run start:dev           # http://localhost:4000

# apps/web (new terminal)
cd apps/web
cp .env.example .env.local
npm run dev                 # http://localhost:3000
```

Open http://localhost:3000, log in with any `+91` number starting 6–9 — the OTP is mocked and
returned directly in the API response (shown on screen as "dev otp: ######") since no SMS
provider is configured.

## What's mocked, and how to go live

| Piece | Mock behavior today | To go live |
|---|---|---|
| OTP / SMS | OTP returned in the `/auth/otp/send` response and logged server-side; no SMS sent | Register on MSG91 (or similar) after DLT approval, set `MOCK_OTP=false`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` in `apps/api/.env` |
| Payments | Razorpay calls are stubbed — a fake `razorpayRef` is generated and payments are marked `paid` instantly | Set `MOCK_PAYMENTS=false`, add `RAZORPAY_KEY_ID`/`SECRET`/`WEBHOOK_SECRET`, wire the real Razorpay SDK calls where `orders.service.ts` currently fakes `razorpayRef` |
| AI Kit "Understand" step | Deterministic mock covering the PRD's three worked examples (aloo ki sabzi, laptop repair, volcano project) plus a generic keyword-split fallback for anything else | Set `ANTHROPIC_API_KEY` in `apps/api/.env` — `kit-ai.service.ts` automatically switches to the real Claude call (`claude-understand.ts`) and falls back to mock only if the API errors |
| Search | Postgres `pg_trgm` trigram similarity + an alias table (no separate search service to run) | Swap in Typesense/Meilisearch behind the same `CatalogService.search()` interface if you need sub-150ms search at catalog scale |
| Maps | No Mapbox/Google Maps key used anywhere — location picking uses the browser Geolocation API with a fallback to the pilot store's coordinates, and order tracking uses a custom stylized 3D scene (matches the PRD's own "stylised low-poly neighbourhood map" intent) | Add a real geocoded address picker (Leaflet + OSM tiles, already a dependency) if street-level address entry is needed |
| 3D mascot & scenes | Procedural low-poly meshes built in code (primitive geometries + a hand-rolled animation state machine), not sculpted/Blender-rigged character art — there's no 3D artist in this pass | Replace `components/three/aloo-mascot.tsx`'s primitive geometry with an imported rigged GLB once art exists; the state machine (idle/lean/cover/peek/shake/jump) is already the right shape to drive real animation clips |
| Admin panel | Not built — out of scope for this pass (PRD treats it as a separate app) | Build a separate internal app against the same NestJS API (most read/write endpoints already exist) |
| Order status progression | A fixed-interval in-process timer advances `confirmed → packing → out_for_delivery → delivered` (no real rider app) | Replace the timer in `orders.service.ts` with real BullMQ jobs driven by rider-app webhooks |

## What's genuinely real and working

- Phone+OTP auth with JWT access tokens + rotated, hashed refresh tokens in an httpOnly cookie,
  rate limiting, and the exact `/auth/otp/send` / `/auth/otp/verify` / `/auth/refresh` / `/auth/logout`
  contract from the PRD.
- Shared carts: create/join-by-link/roles/realtime sync over Socket.IO (every mutation hits
  Postgres first, then broadcasts with a version number — verified with two independent browser
  sessions seeing each other's additions live), split modes, budget cap, reactions, host transfer,
  member removal, lock → checkout.
- AI Kit Assistant: Understand → Match (alias + trigram + substitute-aware confidence scoring) →
  Bucket (in stock / swap / not on Tokri / probably at home) → SSE-streamed results, verified
  against all three of the PRD's own worked examples including the "jeera → swap to jeera powder"
  case.
- Full order lifecycle: lock cart → mock payment → live status progression broadcast over the
  same socket room → a stylized 3D tracking scene → delivery celebration.
- The "kirana print shop" design system: self-hosted Clash Display / General Sans / Instrument
  Serif / JetBrains Mono / Tiro Devanagari Hindi, the exact color tokens, hard-ink borders and
  offset print-shadows, rubber-stamp badges, a physics-based 3D basket hero with GSAP
  scroll-driven rotation and Lenis smooth scroll, and a procedurally-animated Aloo mascot with a
  full interaction state machine (idle → lean/track-caret → valid/invalid nod-or-tilt →
  cover-eyes → peek → wrong-OTP shake → jump + confetti).

## Known gaps vs. the PRD (by design, to keep this pass shippable)

- No real QR code image for shared-cart invites — copy-link and WhatsApp share are implemented;
  QR is a quick follow-up (`qrcode` npm package) once this is worth the extra dependency.
- Delivery instructions and rider tip are present as UI affordances on checkout but aren't
  persisted anywhere yet (no backend field for either).
- Duplicate-item-merge suggestions and "needs 2 votes for items over ₹300" are not implemented
  (both are explicitly "pick for v1 or v2" extras in the PRD).
- Kit → cart quantity is always 1 pack of the matched variant, not a unit-converted amount (e.g.
  a recipe calling for "750 g potato" adds one 500 g pack, not 1.5) — true unit conversion across
  arbitrary recipe units and arbitrary pack sizes is a bigger problem than this pass scopes to;
  the shopper adjusts quantity with the existing stepper.
- No automated test suite (unit/e2e) — verification for this pass was done via live curl/socket
  scripts and real-browser Playwright smoke tests across every screen and both multi-user flows.
