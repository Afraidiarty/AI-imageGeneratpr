<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This project now ships with a complete backend for authentication, Stripe billing, and credit management plus the existing React studio for generating product scenes.

View your app in AI Studio: https://ai.studio/apps/drive/16ZhkP5pLEfqlWZjbUQCh6Rh5UnotfFx8

## Prerequisites

- Node.js 18+
- MySQL 8 (or compatible)
- Stripe test keys (publishable + secret) and at least 1 recurring price + up to 3 credit-pack prices

## Environment Variables

### Frontend (`.env.local`)
```
GEMINI_API_KEY=your_gemini_key
VITE_API_BASE_URL=http://localhost:4000/api
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx
```

### Backend (`server/.env`)
See `server/.env.example` for the full list. Minimum required values:
```
PORT=4000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=change-me
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_DATABASE=eranker_ai
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_MONTHLY_PRICE_ID=price_monthly_200
STRIPE_WEBHOOK_SECRET=whsec_xxx
# Optional credit packs
STRIPE_CREDIT_PACK_SMALL_PRICE_ID=price_pack_small
STRIPE_CREDIT_PACK_MEDIUM_PRICE_ID=price_pack_medium
STRIPE_CREDIT_PACK_LARGE_PRICE_ID=price_pack_large
```

## Database

1. Create the target database (`MYSQL_DATABASE`).
2. Run `server/schema.sql` against that database to create the required tables (`users`, `user_credits`, `credit_transactions`, `subscriptions`).

## Stripe Webhook

Expose the backend (e.g., via `stripe listen --forward-to localhost:4000/api/billing/webhook`) and configure the webhook secret in the backend `.env`. The webhook processes checkout sessions, subscription renewals, and credit-pack purchases.

## Install & Run

```bash
# Install frontend deps
npm install

# Install backend deps
npm --prefix server install

# Start backend (port 4000 by default)
npm run dev:server

# In another terminal start Vite dev server
npm run dev
```

The React app expects the backend on `VITE_API_BASE_URL` and will block studio actions until the user logs in, has an active subscription/credits, and Stripe checkout sessions are configured.

## Key Features

- Email/password authentication with JWT sessions
- Stripe Checkout for monthly subscriptions (200 credits/month) and on-demand credit packs
- MySQL persistence for users, credits, and subscription state
- Credit-aware studio actions (analysis, idea generation, scene creation, edits, variations)
- Dedicated pages: Login, Registration, Subscription management/top-up
- Real-time credit banner + guardrails when balance is low

## Scripts

- `npm run dev` – Vite dev server
- `npm run build` – Production build (frontend only)
- `npm run dev:server` – Express API with Stripe + MySQL

