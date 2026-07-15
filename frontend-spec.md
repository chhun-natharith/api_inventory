# Frontend Applications Specification

Two separate Next.js (TypeScript) applications consuming the `inventory-api`.
Both use **Next.js 15 App Router + TypeScript + Tailwind CSS + shadcn/ui**.

---

## Projects Overview

| | Admin Dashboard | Customer Storefront |
|---|---|---|
| **Project name** | `inventory-admin` | `inventory-store` |
| **Users** | Admin, Support | Customer |
| **Auth** | Role-based (Admin/Support JWT) | Customer JWT |
| **API permissions used** | All 18 permissions | `categories:read`, `products:read`, `variants:read`, `orders:read-own`, `orders:write-own` |
| **Rendering** | CSR-heavy (dashboard) | SSR/SSG for catalog pages, CSR for cart/orders |

---

## Shared API Contract

Base URL: `http://localhost:8200/api`

All protected requests send:
```
Authorization: Bearer <accessToken>
```

Token storage strategy (both apps):
- `accessToken` → memory (React state or Zustand store)
- `refreshToken` → `httpOnly` cookie (set server-side via Next.js route handler)

Auto-refresh flow:
1. API call returns `401`
2. Silently call `POST /api/auth/refresh`
3. Swap new `accessToken` in memory, rotate cookie
4. Retry original request once

---

## Shared Tech Stack (Both Projects)

```
Next.js 15 (App Router)
TypeScript
Tailwind CSS
shadcn/ui
Zustand (client state)
TanStack Query v5 (server state / caching)
Axios (HTTP client with interceptors)
React Hook Form + Zod (forms + validation)
next-themes (dark mode)
```

---

## Project 1 — Admin Dashboard (`inventory-admin`)

### Purpose

Internal tool for Admin and Support staff to manage the entire catalog, orders, and user base.

---

### Folder Structure

```
inventory-admin/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx               ← sidebar + topbar shell
│   │   ├── page.tsx                 ← dashboard home / stats
│   │   ├── users/
│   │   │   ├── page.tsx             ← users list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx         ← user detail / edit
│   │   │   └── new/
│   │   │       └── page.tsx         ← create user form
│   │   ├── roles/
│   │   │   └── page.tsx             ← roles + permissions viewer
│   │   ├── categories/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── variants/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   └── orders/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   ├── api/
│   │   └── auth/
│   │       └── refresh/route.ts     ← Next.js route handler for cookie rotation
│   └── layout.tsx
├── components/
│   ├── ui/                          ← shadcn generated components
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── breadcrumb.tsx
│   ├── data-table/
│   │   ├── data-table.tsx           ← reusable TanStack Table wrapper
│   │   ├── columns/
│   │   │   ├── user-columns.tsx
│   │   │   ├── product-columns.tsx
│   │   │   ├── order-columns.tsx
│   │   │   └── ...
│   │   └── toolbar.tsx              ← search + filter bar
│   ├── forms/
│   │   ├── user-form.tsx
│   │   ├── category-form.tsx
│   │   ├── product-form.tsx
│   │   ├── variant-form.tsx
│   │   └── order-status-form.tsx
│   └── shared/
│       ├── status-badge.tsx
│       ├── confirm-dialog.tsx
│       └── pagination.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts                ← axios instance + interceptors
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── roles.ts
│   │   ├── categories.ts
│   │   ├── products.ts
│   │   ├── variants.ts
│   │   └── orders.ts
│   └── utils.ts
├── store/
│   └── auth.store.ts                ← Zustand: accessToken, user, role, permissions
├── hooks/
│   ├── use-auth.ts
│   ├── use-permissions.ts           ← hook: hasPermission('products:write')
│   └── use-pagination.ts
└── types/
    └── api.types.ts                 ← mirrored from API DTOs
```

---

### Features

#### Auth

| Feature | API Endpoint | Notes |
|---|---|---|
| Login page | `POST /api/auth/login` | Email + password form |
| Auto token refresh | `POST /api/auth/refresh` | Via Axios interceptor on 401 |
| Logout | `POST /api/auth/logout` | Clears store + cookie |
| Protected route guard | `GET /api/auth/me` | Redirect to login if no valid token |

**Flow:**
```
/login
  → POST /api/auth/login
  → store accessToken in Zustand
  → store refreshToken in httpOnly cookie (via /api/auth/refresh route handler)
  → redirect to /dashboard
```

Only Admin and Support roles are allowed in. Customer role → reject at login.

---

#### Dashboard Home

- Summary cards: total users, total products, total orders, pending orders
- Recent orders table (last 10)
- Low stock variants list (quantity < threshold)

API calls:
- `GET /api/users?page=1&limit=1` → total count
- `GET /api/products?page=1&limit=1` → total count
- `GET /api/orders?page=1&limit=10` → recent orders
- `GET /api/product-variants?page=1&limit=100` → filter client-side for low stock

---

#### Users Management

| Feature | API Endpoint | Permission |
|---|---|---|
| List users (paginated + search) | `GET /api/users` | `users:read` |
| View user detail | `GET /api/users/:id` | `users:read` |
| Create user | `POST /api/users` | `users:write` |
| Edit user (name, email, status) | `PATCH /api/users/:id` | `users:write` |
| Change user role | `PATCH /api/users/:id/role` | `users:manage-roles` |
| Delete user | `DELETE /api/users/:id` | `users:delete` |

**UI components:** Data table with search, status badge (ACTIVE/INACTIVE), role badge, confirm delete dialog.

---

#### Roles Viewer

| Feature | API Endpoint | Permission |
|---|---|---|
| List roles with permissions | `GET /api/roles` | `users:manage-roles` |
| View single role | `GET /api/roles/:id` | `users:manage-roles` |

**UI:** Read-only. Shows each role as a card with its permission list displayed as badges. No create/edit (roles are seeded and managed in code).

---

#### Categories Management

| Feature | API Endpoint | Permission |
|---|---|---|
| List categories (paginated) | `GET /api/categories` | `categories:read` |
| View category | `GET /api/categories/:id` | `categories:read` |
| Create category | `POST /api/categories` | `categories:write` |
| Edit category | `PATCH /api/categories/:id` | `categories:write` |
| Delete category | `DELETE /api/categories/:id` | `categories:delete` |

**Form fields:** name (required), description (optional textarea).

---

#### Products Management

| Feature | API Endpoint | Permission |
|---|---|---|
| List products (paginated) | `GET /api/products` | `products:read` |
| View product | `GET /api/products/:id` | `products:read` |
| Create product | `POST /api/products` | `products:write` |
| Edit product | `PATCH /api/products/:id` | `products:write` |
| Delete product | `DELETE /api/products/:id` | `products:delete` |

**Form fields:** name, description (textarea), image URL, status (select: ACTIVE/INACTIVE), category (select populated from `GET /api/categories`).

**Table columns:** name, category, status badge, variant count (link to variants filtered by productId), created date, actions.

---

#### Product Variants Management

| Feature | API Endpoint | Permission |
|---|---|---|
| List variants (paginated) | `GET /api/product-variants` | `variants:read` |
| View variant | `GET /api/product-variants/:id` | `variants:read` |
| Create variant | `POST /api/product-variants` | `variants:write` |
| Edit variant | `PATCH /api/product-variants/:id` | `variants:write` |
| Delete variant | `DELETE /api/product-variants/:id` | `variants:delete` |

**Form fields:** product (select), SKU (required unique), barcode (optional), color (optional), size (optional), price, cost, quantity.

**Table columns:** SKU, product name, color, size, price, cost, stock quantity (with low-stock highlight), actions.

---

#### Orders Management

| Feature | API Endpoint | Permission |
|---|---|---|
| List all orders (paginated) | `GET /api/orders` | `orders:read` (Admin/Support see all) |
| View order detail + items | `GET /api/orders/:id` | `orders:read` |
| Update order status | `PATCH /api/orders/:id` | `orders:write` |
| Cancel / delete order | `DELETE /api/orders/:id` | `orders:delete` |

**Filters:** by status (PENDING/PAID/SHIPPED/COMPLETED/CANCELLED), date range, search by order number.

**Order detail page:** order info header, customer info, line items table (variant, qty, price, subtotal), total, status update dropdown.

**Status flow:**
```
PENDING → PAID → SHIPPED → COMPLETED
       ↘ CANCELLED (any stage)
```

---

### Permission-Aware UI

The `usePermissions()` hook reads permissions from the Zustand store (populated from the JWT payload on login).

```ts
const { hasPermission } = usePermissions()

// In component:
{hasPermission('products:write') && <Button>Add Product</Button>}
{hasPermission('users:delete') && <Button variant="destructive">Delete</Button>}
```

Support role: delete buttons are hidden. Admin role: full access.

---

### Page Flow Diagram

```
/login
  └─ POST /auth/login → success
       └─ /                       ← dashboard home (stats)
            ├─ /users             ← list → /users/new | /users/[id]
            ├─ /roles             ← read-only roles viewer
            ├─ /categories        ← list → /categories/new | /categories/[id]
            ├─ /products          ← list → /products/new | /products/[id]
            ├─ /variants          ← list → /variants/new | /variants/[id]
            └─ /orders            ← list → /orders/[id]
```

---

## Project 2 — Customer Storefront (`inventory-store`)

### Purpose

Public-facing e-commerce site where customers browse products, register/login, and place orders.

---

### Folder Structure

```
inventory-store/
├── app/
│   ├── (public)/
│   │   ├── layout.tsx               ← navbar + footer shell
│   │   ├── page.tsx                 ← homepage (hero + featured products)
│   │   ├── products/
│   │   │   ├── page.tsx             ← product listing / catalog
│   │   │   └── [id]/
│   │   │       └── page.tsx         ← product detail + variant selector
│   │   ├── categories/
│   │   │   └── [id]/
│   │   │       └── page.tsx         ← products filtered by category
│   │   ├── cart/
│   │   │   └── page.tsx             ← cart review
│   │   ├── checkout/
│   │   │   └── page.tsx             ← checkout → place order
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (account)/
│   │   ├── layout.tsx               ← account sidebar shell
│   │   ├── orders/
│   │   │   ├── page.tsx             ← my orders list
│   │   │   └── [id]/
│   │   │       └── page.tsx         ← order detail
│   │   └── profile/
│   │       └── page.tsx             ← view profile (GET /auth/me)
│   ├── api/
│   │   └── auth/
│   │       └── refresh/route.ts     ← cookie rotation route handler
│   └── layout.tsx
├── components/
│   ├── ui/                          ← shadcn generated components
│   ├── layout/
│   │   ├── navbar.tsx               ← logo, category nav, cart icon, login button
│   │   └── footer.tsx
│   ├── catalog/
│   │   ├── product-card.tsx         ← card with image, name, price, add to cart
│   │   ├── product-grid.tsx
│   │   ├── category-filter.tsx      ← sidebar / horizontal filter bar
│   │   ├── variant-selector.tsx     ← color + size picker buttons
│   │   └── stock-badge.tsx          ← "In Stock" / "Out of Stock"
│   ├── cart/
│   │   ├── cart-drawer.tsx          ← slide-out cart (Sheet component)
│   │   ├── cart-item.tsx
│   │   └── cart-summary.tsx
│   ├── checkout/
│   │   └── order-summary.tsx
│   └── orders/
│       ├── order-card.tsx
│       └── order-status-badge.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── categories.ts
│   │   ├── products.ts
│   │   ├── variants.ts
│   │   └── orders.ts
│   └── utils.ts
├── store/
│   ├── auth.store.ts                ← Zustand: accessToken, user
│   └── cart.store.ts                ← Zustand + localStorage: cart items
├── hooks/
│   ├── use-auth.ts
│   └── use-cart.ts
└── types/
    └── api.types.ts
```

---

### Features

#### Auth

| Feature | API Endpoint | Notes |
|---|---|---|
| Register | `POST /api/auth/register` | Auto-assigned Customer role |
| Login | `POST /api/auth/login` | Returns token pair |
| Auto token refresh | `POST /api/auth/refresh` | Via Axios interceptor on 401 |
| Logout | `POST /api/auth/logout` | Clears store + cookie |
| View profile | `GET /api/auth/me` | Name, email, role |

**Flow:**
```
/register or /login
  → POST /api/auth/register or /login
  → store accessToken in Zustand
  → store refreshToken in httpOnly cookie
  → redirect to / or previous page
```

Guest users can browse catalog and add to cart. Login is required only at checkout.

---

#### Homepage

- Hero banner section
- Featured categories row (populated from `GET /api/categories`)
- Featured products grid (first page of `GET /api/products`)

---

#### Product Catalog (`/products`)

| Feature | API Endpoint | Notes |
|---|---|---|
| List all products | `GET /api/products?page=&limit=` | Paginated grid |
| Filter by category | `GET /api/categories` for sidebar | Client-side filter by categoryId |
| Pagination controls | `PaginationDto` (page + limit) | |

**UI:** Product grid, category filter sidebar (or top bar on mobile), pagination.

> Note: The current API `GET /api/products` returns all products — category filtering happens client-side. If the API adds a `categoryId` query param in future, this upgrades automatically.

---

#### Category Page (`/categories/[id]`)

- Fetches `GET /api/categories/:id` for name/description
- Lists products with that `categoryId` from `GET /api/products`
- Same grid + pagination layout as catalog

---

#### Product Detail (`/products/[id]`)

| Feature | API Endpoint | Notes |
|---|---|---|
| Product info | `GET /api/products/:id` | Name, description, image, category |
| Variants | `GET /api/product-variants` filtered by `productId` | Color + size selector |
| Add to cart | Local (cart store) | No API call until checkout |

**Variant selector flow:**
```
Load product page
  → fetch product details
  → fetch variants for this product (filter client-side by productId)
  → display color buttons + size buttons
  → selected combination = one ProductVariant
  → "Add to Cart" stores { variantId, sku, name, color, size, price, quantity: 1 }
```

**Stock display:** If `variant.quantity === 0` → "Out of Stock" badge, button disabled.

---

#### Cart (`/cart`)

Cart lives in Zustand + `localStorage` (persists on refresh). No API involved until checkout.

| Feature | Notes |
|---|---|
| View cart items | Name, variant (color/size), price, quantity, subtotal |
| Update quantity | Increment / decrement (max = `variant.quantity` from last fetch) |
| Remove item | Remove from store |
| Cart total | Sum of all subtotals |
| Proceed to checkout | Navigate to `/checkout` (requires login) |

Cart drawer (Sheet) accessible from navbar icon on any page.

---

#### Checkout (`/checkout`)

Requires auth. Redirects to `/login?redirect=/checkout` if not logged in.

| Feature | API Endpoint | Notes |
|---|---|---|
| Review order summary | — | Read from cart store |
| Place order | `POST /api/orders` | Sends `{ items: [{ productVariantId, quantity }] }` |
| Success → view order | `GET /api/orders/:id` | Redirect to `/orders/[id]` |

**Request shape:**
```json
{
  "items": [
    { "productVariantId": "uuid", "quantity": 2 },
    { "productVariantId": "uuid", "quantity": 1 }
  ]
}
```

**On success:** Clear cart store, redirect to order confirmation page.

**On failure:** Show error message (insufficient stock, server error).

---

#### My Orders (`/orders`)

Requires auth.

| Feature | API Endpoint | Notes |
|---|---|---|
| List own orders | `GET /api/orders` | Customer JWT → returns own orders only (scoped by API) |
| View order detail | `GET /api/orders/:id` | Items, quantities, prices, status |

**Order status badge colors:**

| Status | Color |
|---|---|
| PENDING | Yellow |
| PAID | Blue |
| SHIPPED | Purple |
| COMPLETED | Green |
| CANCELLED | Red |

---

#### Profile (`/profile`)

| Feature | API Endpoint | Notes |
|---|---|---|
| View profile | `GET /api/auth/me` | Name, email, role, status |

Read-only for now. (Update profile would need `PATCH /api/users/:id` with `users:write` — not in Customer role, so intentionally omitted.)

---

### Page Flow Diagram

```
/ (homepage)
  ├─ /products              ← catalog grid
  │    └─ /products/[id]    ← detail + variant selector → add to cart
  ├─ /categories/[id]       ← filtered catalog
  ├─ /cart                  ← cart review → /checkout
  │                              └─ POST /orders → /orders/[id]
  ├─ /login                 ← form → redirect back
  ├─ /register              ← form → auto login → redirect
  └─ /orders                ← (auth required)
       └─ /orders/[id]      ← order detail
```

---

## Rendering Strategy

| Page | Strategy | Reason |
|---|---|---|
| Homepage | ISR (revalidate: 60s) | SEO + fresh featured products |
| `/products` | ISR | SEO for product listing |
| `/products/[id]` | ISR | SEO for product pages |
| `/categories/[id]` | ISR | SEO for category pages |
| `/cart` | CSR | User-specific, no SEO value |
| `/checkout` | CSR | Dynamic, auth-required |
| `/orders` | CSR | Auth-required, real-time |
| Admin (all pages) | CSR | Auth-gated, no SEO needed |

---

## API Client Pattern (Both Apps)

```ts
// lib/api/client.ts
import axios from 'axios'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL })

// Request: attach accessToken
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response: auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      const { accessToken } = await refreshTokens()   // POST /api/auth/refresh via route handler
      useAuthStore.getState().setAccessToken(accessToken)
      error.config.headers.Authorization = `Bearer ${accessToken}`
      return api(error.config)
    }
    return Promise.reject(error)
  }
)
```

---

## Environment Variables

**`inventory-admin` (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:8200/api
```

**`inventory-store` (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:8200/api
```

---

## Summary

| | `inventory-admin` | `inventory-store` |
|---|---|---|
| **Main users** | Admin, Support | Customer (guest + registered) |
| **Key pages** | Dashboard, Users, Roles, Categories, Products, Variants, Orders | Home, Catalog, Product Detail, Cart, Checkout, My Orders, Profile |
| **Forms** | CRUD for every entity | Register, Login, Checkout |
| **State** | Zustand (auth + permissions) | Zustand (auth + cart with localStorage) |
| **Data fetching** | TanStack Query (CSR) | TanStack Query (CSR + ISR for public pages) |
| **Auth guard** | Reject non Admin/Support at login | Guest browse allowed; auth required at checkout |
