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
- **Browsing**: venue search with keyword, location, capacity, budget, event type, amenities, verification,
  server sorting and pagination, all kept in the URL.
- **Booking**: future start times, 30-minute durations and a 14-day maximum, with live availability checks and
  server quotes for cleaning fees, venue deposits, event type, attendee limits and cancellation terms.
  `Idempotency-Key` on create protects retries and double-clicks before Stripe Checkout.
- **My bookings**: hold countdown, pay now, cancel (with refund notice), payment history, status polling after payment.
- **Reviews**: paginated venue ratings and reviews from guests with completed bookings.
- **Owners**: create / edit / delete venues with amenities, event types, fees and policies; confirm availability
  and view bookings per venue. **Admins**: user directory, venue verification, support cases and staff management.
- Loading skeletons, empty and error states, field-level validation errors from the API, toasts, accessible
  modals, keyboard/skip-link support, responsive layout, code-split routes.

## Notes

- Tokens are kept in `localStorage`. Pair with a strict CSP in production; moving the refresh token to an
  httpOnly cookie would need a backend change.
- Booking confirmation is asynchronous (Stripe webhook). The success page polls the booking until it is confirmed.
