# BookHub frontend

React, Vite, and TypeScript storefront for the existing Express/MySQL backend.
The frontend calls the backend at `http://localhost:5000/api` by default. Set
`VITE_API_BASE_URL` at Vite runtime/build time to point at another API base URL;
do not add secrets to frontend configuration.

## Run

```powershell
npm install
npm run dev
```

Check the production bundle and TypeScript types with:

```powershell
npm run typecheck
npm run build
npm run lint
```

The backend must be running at the configured base URL and its MySQL database
must be initialized. The frontend does not seed or substitute catalog data.

## Backend integration

| Feature | Existing endpoint(s) |
| --- | --- |
| Books | `GET /api/books`, `GET /api/books/:id` |
| Book admin | `POST /api/books`, `PUT /api/books/:id`, `DELETE /api/books/:id` |
| Categories | `GET /api/categories`, `GET /api/categories/:id` |
| Category admin | `POST /api/categories`, `PUT /api/categories/:id`, `DELETE /api/categories/:id` |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile` |
| Cart | `GET /api/cart`, `POST /api/cart`, `PUT /api/cart/:bookId`, `DELETE /api/cart/:bookId`, `DELETE /api/cart` |
| Orders | `GET /api/orders`, `POST /api/orders`, `GET /api/orders/:id`, `GET /api/orders/:id/items`, `PUT /api/orders/:id/cancel` |
| Bills | `GET /api/bills/:orderId`, `GET /api/bills/:orderId/download` |
| Payments | `GET /api/payments/config`, `POST /api/orders/:id/payment`, `POST /api/orders/:id/payment/verify`, `POST /api/payments/razorpay/webhook` |

## Delivery, cancellation, and Razorpay payments

Before starting the backend, apply the additive migration once to the existing
database from `Backend`:

```powershell
Get-Content migrations\002_delivery_payments_cancellation.sql | mysql -u root -p online_book_store
```

The migration backfills existing orders' expected dates from their stored order
date, adds the cancellation/restock markers, and creates separate payment
attempt and refund records. It does not delete customer, order, bill, or book
data. Delivery dates are computed and persisted by MySQL as three calendar days
after the order date; the deployed database's current timezone is India
Standard Time. Existing order details also have a deterministic fallback from
their original `order_date`.

COD works without payment credentials. To enable Razorpay Test Mode, create API
keys in the Razorpay Dashboard while in Test Mode and set these variables in the
same PowerShell window used to start `node server.js`:

```powershell
$env:RAZORPAY_KEY_ID = "rzp_test_your_key_id"
$env:RAZORPAY_KEY_SECRET = "your_test_key_secret"
$env:RAZORPAY_WEBHOOK_SECRET = "your_webhook_signing_secret"
node server.js
```

Do not put these values in React, source control, or a committed `.env` file.
The public config endpoint returns only the Key ID and whether the integration
is configured; the secret stays on the backend. The checkout uses Razorpay
Standard Checkout for its supported UPI, card, and net-banking methods. Orders
are not marked paid based on a browser redirect: the backend checks Razorpay's
signature and fetches/captures the payment before confirming the order. Signed
webhooks for `payment.captured`, `payment.failed`, `refund.processed`, and
`refund.failed` reconcile server-side state.

For local webhook testing, configure the Razorpay webhook URL to a secure
publicly reachable tunnel for
`/api/payments/razorpay/webhook`, use the same webhook secret above, and enable
the four events listed above. Without webhook configuration, Checkout's signed
verification still works, but asynchronous refund updates cannot be reconciled
automatically. Refunds are tracked separately and only change to `PROCESSED`
after Razorpay reports completion. Network-ambiguous refund submissions remain
`PENDING` for reconciliation; retrying cancellation does not create another
refund.

To test COD, add books to the cart, check out with Cash on Delivery, and confirm
the three-day date on the order confirmation and order history. For Test Mode,
select Online Payment and complete a Razorpay test payment; verify the order
and bill show `CONFIRMED`/`PAID`. To test cancellation, cancel a pending or
confirmed order from My Orders or its detail page, then verify stock is restored
once. Repeat cancellation and try shipped/delivered or another user's order to
confirm the backend rejects those requests. An online cancellation shows
`PENDING` until Razorpay confirms the refund. Admin order management lists
cancelled orders and payment/refund states.

The backend has no profile-update endpoint or order-status-update endpoint, so
the profile is read-only and order status changes are not offered. The bill
download endpoint returns a JSON attachment, not a PDF; the frontend downloads
the supported JSON response. The orders list returns all orders for an ADMIN
and only the authenticated user's orders for a regular user.

The backend does not expose popularity/rating metrics, customer details in bill
responses, or currency metadata. Therefore, the home page highlights the latest
catalog entries rather than inventing a popularity ranking, and bills show only
the available order/address details. The UI formats prices as INR based on the
approved catalog seed values; confirm that this matches the currency used for
other existing and future records.

## Book catalog seed

`Backend/scripts/seed_books.js` adds four ISBN-verified books to
`online_book_store` using the existing MySQL connection configuration. It
inserts only when no title/author match exists (including inactive rows), uses
a transaction and a named lock to make repeated runs safe, and never updates
or deletes existing books. Run from `Backend`:

```powershell
node scripts\seed_books.js
```

The seed uses the approved INR 500 price and stock 10 for each new book.
Cover URLs reference Open Library cover IDs returned for these ISBNs and were
checked for `200 image/jpeg` responses:

| Title | ISBN used to verify edition | Cover ID |
| --- | --- | --- |
| The Pragmatic Programmer | 9780135957059 | 10143650 |
| Eloquent JavaScript | 9781718504103 | 7082166 |
| Learning SQL | 9781492057611 | 8686154 |
| The Hobbit | 9780547928227 | 14627509 |

Open Library records: <https://openlibrary.org/search.json?isbn=9780135957059>,
<https://openlibrary.org/search.json?isbn=9781718504103>,
<https://openlibrary.org/search.json?isbn=9781492057611>, and
<https://openlibrary.org/search.json?isbn=9780547928227>.

`Backend/scripts/seed_indian_books.js` adds 58 unique Indian titles across
Marathi literature, mythology, Indian literature, self-help/biography, and
history/biography. It reuses the backend MySQL configuration, creates missing
categories without replacing existing category data, and only inserts books
whose normalized title-and-author pair is not already present (including
inactive books). A MySQL named lock and transaction protect the write. Existing
books are never updated or deleted. Prices are sample INR store prices.

Run it safely again from `Backend` with:

```powershell
node scripts\seed_indian_books.js
```

The script uses Open Library search metadata to require a matching title and
author, then checks the cover URL with an HTTP HEAD request and requires an
image content type before saving it. A successful seed added 58 books, of which
34 had covers that passed those checks; the other 24 have an empty `image_url`
rather than a guessed cover. The frontend uses the existing books API and
shows its missing-cover fallback for empty or broken image URLs.

## Authentication storage

The API returns a bearer JWT that expires after one hour and does not issue an
HttpOnly cookie. The frontend stores that token in `localStorage` to preserve
sign-in across reloads and sends it in the `Authorization` header. This is
convenient for this client but is not as secure as an HttpOnly, Secure,
SameSite cookie: any successful script injection in the frontend origin can
read the token. The backend would need cookie-based authentication and CSRF
protection to avoid client-side token storage.

Catalog search, price filters, and sorting are performed on the active book
catalog returned by `GET /api/books`; no server-side filtering parameters are
sent.
