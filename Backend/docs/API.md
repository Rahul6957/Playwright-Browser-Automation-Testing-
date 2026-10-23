# BookHub Backend API

Base URL: `http://localhost:5000`

Protected endpoints require `Authorization: Bearer <JWT>`. Registration and
login are public. Registration always creates a `USER`; it ignores any
client-supplied role.

## Start the backend

In PowerShell, set credentials in the current terminal session (do not commit
them), then start the existing entry point:

```powershell
$env:DB_HOST = "localhost"
$env:DB_PORT = "3306"
$env:DB_USER = "root"
$env:DB_PASSWORD = "<your MySQL password>"
$env:DB_NAME = "online_book_store"
$env:JWT_SECRET = "<a long random secret>"
node server.js
```

The server checks its MySQL connection before listening. No `.env` file is
needed or created.

## First-time cart database migration

The inspected `online_book_store` schema has no `carts` or `cart_items` tables.
Apply [`001_create_carts.sql`](../migrations/001_create_carts.sql) once before
using cart or order creation:

1. Open MySQL Workbench and connect to the same MySQL server/database.
2. Open the migration file (or paste its contents into a new SQL tab).
3. Select `online_book_store` as the default schema.
4. Execute the complete script with the lightning-bolt button.
5. Confirm `carts` and `cart_items` appear under **Tables**.

The migration only adds those two tables, uses foreign keys and a unique
`(cart_id, book_id)` key, and is safe to re-run. Existing tables/data are not
altered. Cart rows are removed when their user/cart is deleted; books referenced
by cart items cannot be physically deleted.

## Authentication and permissions

| Operation | Public | USER | ADMIN |
|---|---:|---:|---:|
| Browse books/categories | Yes | Yes | Yes |
| Register/login | Yes | — | — |
| Profile, cart, own orders/bills | No | Yes | Yes |
| Create/update/delete books/categories | No | No | Yes |
| List/read/cancel orders and read bills | No | Own records | All records |

The token is signed with `JWT_SECRET` and expires after one hour. Each
authenticated request reloads the user from MySQL so a changed role takes
effect without waiting for token expiry. Create an initial administrator by
registering a normal user and then assigning `ADMIN` to that user's `role`
through a trusted database administrator; never accept a role from registration.

## Endpoints

| Method | Path | Access | Request body / result |
|---|---|---|---|
| GET | `/` | Public | API health response |
| POST | `/api/auth/register` | Public | `{ "full_name": "Reader", "email": "reader@example.com", "password": "at-least-8-chars", "phone": "5551234" }` |
| POST | `/api/auth/login` | Public | `{ "email": "reader@example.com", "password": "at-least-8-chars" }`; returns user and token |
| GET | `/api/auth/profile` | Authenticated | Logged-in user's safe profile |
| GET | `/api/books` | Public | Active books |
| GET | `/api/books/:id` | Public | One active book |
| POST | `/api/books` | ADMIN | `{ "category_id": 1, "title": "Book", "author": "Author", "price": 12.50, "stock": 5 }` |
| PUT | `/api/books/:id` | ADMIN | Full book fields as in create |
| DELETE | `/api/books/:id` | ADMIN | Soft-deletes the book |
| GET | `/api/categories` | Public | Categories |
| GET | `/api/categories/:id` | Public | One category |
| POST | `/api/categories` | ADMIN | `{ "category_name": "Fiction", "description": "Stories" }` |
| PUT | `/api/categories/:id` | ADMIN | `{ "category_name": "Fiction", "description": "Stories" }` |
| DELETE | `/api/categories/:id` | ADMIN | Permanent deletion; returns 409 if books reference it |
| POST | `/api/cart` | Authenticated | `{ "book_id": 1, "quantity": 2 }`; adding an existing book merges quantities |
| GET | `/api/cart` | Authenticated | Cart lines and server-calculated total |
| PUT | `/api/cart/:bookId` | Authenticated | `{ "quantity": 3 }`; sets the quantity |
| DELETE | `/api/cart/:bookId` | Authenticated | Removes one line |
| DELETE | `/api/cart` | Authenticated | Clears the logged-in user's cart |
| POST | `/api/orders` | Authenticated | `{ "delivery_address": "12 Main Street" }`; creates from cart |
| GET | `/api/orders` | Authenticated | Own orders; ADMIN sees all |
| GET | `/api/orders/:id` | Authenticated | One own order; ADMIN may read any |
| GET | `/api/orders/:id/items` | Authenticated | Order lines and stored prices |
| PUT | `/api/orders/:id/cancel` | Authenticated | Cancels `PENDING` or `CONFIRMED`; restocks books |
| GET | `/api/bills/:orderId` | Authenticated | Creates-on-first-read or returns the order's COD bill |
| GET | `/api/bills/:orderId/download` | Authenticated | Downloads the same bill as a JSON attachment |

Cart/order monetary values use MySQL book prices, not request data. Cart prices
and totals are returned as decimal strings to avoid floating-point rounding.
Order creation locks the user's cart and book rows, verifies stock, inserts the
order and items, decrements stock, and clears the cart in one transaction.
Generated `order_items.subtotal` is not explicitly inserted. A second checkout
cannot create a duplicate from the same cart because the cart is locked and
emptied on successful commit.

Orders begin as `PENDING`. Cancellation is allowed only in `PENDING` or
`CONFIRMED`; it restores the recorded quantities in the same transaction that
marks the order `CANCELLED`. A bill is generated from stored order items with
`COD`, `PENDING`, and a `0.00` delivery charge (no delivery-fee policy exists in
the current schema). Bill generation is unique per order.

PDF output is not implemented. The `/download` endpoint intentionally serves a
valid JSON file instead; add a PDF library and format requirements if PDF bills
are needed.

## Response and status conventions

Successful responses use `{ "success": true, "data": ... }` (some list endpoints
also include `count` and mutation endpoints include `message`). Errors use
`{ "success": false, "message": "..." }`.

| Status | Meaning |
|---:|---|
| 200 | Successful read/update/delete |
| 201 | Resource created |
| 400 | Malformed JSON or invalid/missing input |
| 401 | Missing, invalid, or expired token; invalid login |
| 403 | Authenticated user lacks ADMIN permission |
| 404 | Resource not found (including another user's private order) |
| 409 | Duplicate value, insufficient stock, invalid state transition, or referenced category |
| 413 | JSON request body exceeds the parser limit |
| 500 | Unexpected server/database failure; internal details are logged, not returned |

## Postman

Import [`BookHub.postman_collection.json`](../postman/BookHub.postman_collection.json)
into Postman. Set `baseUrl` (default is localhost), then register/login and copy
the returned token into `userToken`. For book/category mutations, set
`adminToken` to a JWT belonging to a user whose database `role` is `ADMIN`.
Apply the cart migration before running cart and order requests.

Suggested sequence: register → login → add a cart item → inspect cart → create
order → inspect order/items → retrieve/download bill. Run the ADMIN requests
separately; a normal account should receive 403.

## Automated and manual test checklist

Run dependency-free automated checks from `Backend`:

```powershell
node --test
```

The automated tests cover validation helpers, health/missing routes, malformed
JSON, and authentication-required responses without mutating the database.
Use the Postman collection against a development database for the following
DB-backed cases:

- Register with valid, malformed, duplicate email, short password, and an
  attempted `role: "ADMIN"`; confirm the returned user has no password fields.
- Login with valid/invalid credentials; verify token, then try missing,
  malformed, and expired tokens on profile/cart.
- Read book/category lists and IDs; test malformed/nonexistent IDs.
- Try book/category create/update/delete as USER (403) and ADMIN; test invalid
  prices, stock, duplicate category names, and category deletion when books
  refer to it.
- Add active books, merge the same book, set quantities at/over stock, try
  inactive/nonexistent books, remove an item, clear cart, and ensure accounts
  cannot see each other's cart.
- Place an order with an empty cart, invalid address, insufficient stock, and a
  populated cart; confirm stock, generated subtotals, and cart state before and
  after. Try concurrent checkouts and verify only one order is created.
- Check user/admin order visibility, other-user access, order items, permitted
  cancellation/restock, and cancellation after `SHIPPED`/`DELIVERED`.
- Retrieve/download a bill twice; verify one COD/PENDING bill, unique bill
  number, line prices/subtotals and the JSON attachment headers.
- Send invalid JSON and an unknown route; verify JSON 400/404 responses.
