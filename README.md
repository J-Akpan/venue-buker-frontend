# VenBuk – Frontend

React 18 + Vite client for the [venue_booker](../venue_booker) API (`/api/v1`).

## Run

```bash
npm install
npm run dev        # http://localhost:3000, proxies /api to http://localhost:4000
npm run build      # production bundle in dist/
```

The backend must be running (`npm run dev` in `venue_booker`). Port 3000 matches the backend's default
`CORS_ORIGINS` and Stripe `CHECKOUT_SUCCESS_URL` / `CHECKOUT_CANCEL_URL` (`/payment/success`, `/payment/cancel`).

### Configuration (`.env`, see `.env.example`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Public API origin in production (empty in dev). Must be in the backend's `CORS_ORIGINS`. |
| `VITE_PROXY_TARGET` | Dev proxy target, default `http://localhost:4000`. |

For production, serve `dist/` with an SPA fallback (all paths → `index.html`), or put it behind the same
origin as the API (e.g. the backend's nginx) and leave `VITE_API_URL` empty.

## What it covers

- **Auth**: sign up (User / Venue Owner), sign in with email or username, silent access-token refresh
  (single-flight, so rotated refresh tokens are never reused), sign out, forgot/reset password with emailed code,
  change password (signs out everywhere, as the API does).
- **Browsing**: venue search with keyword, location, capacity, budget, sort and pagination, all kept in the URL.
- **Booking**: date/time picker mirroring server rules (future, 30-min steps, max 14 days), live price estimate,
  `Idempotency-Key` on create so retries/double-clicks never double-book, then Stripe Checkout redirect.
- **My bookings**: hold countdown, pay now, cancel (with refund notice), payment history, status polling after payment.
- **Owners**: create / edit / delete venues, view bookings per venue. **Admins**: user directory.
- Loading skeletons, empty and error states, field-level validation errors from the API, toasts, accessible
  modals, keyboard/skip-link support, responsive layout, code-split routes.

## Notes

- Tokens are kept in `localStorage`. Pair with a strict CSP in production; moving the refresh token to an
  httpOnly cookie would need a backend change.
- Booking confirmation is asynchronous (Stripe webhook). The success page polls the booking until it is confirmed.
