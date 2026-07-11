# MVP Database Design

A minimal but realistic e-commerce schema covering **Users, Categories, Products, Product Variants, Orders,** and **Order Items** — sized to practice core NestJS concepts (relationships, DTOs, auth, pagination, transactions) without enterprise-level overhead.

## Entity Relationship Diagram

```mermaider 
    Diagram
    CATEGORIES ||--o{ PRODUCTS : contains
    PRODUCTS ||--o{ PRODUCT_VARIANTS : has
    USERS ||--o{ ORDERS : places
    ORDERS ||--o{ ORDER_ITEMS : contains
    PRODUCT_VARIANTS ||--o{ ORDER_ITEMS : "ordered as"

    USERS {
        uuid id PK
        string name
        string email UK
        string password
        enum status
        datetime createdAt
        datetime updatedAt
    }

    CATEGORIES {
        uuid id PK
        string name
        text description
        datetime createdAt
        datetime updatedAt
    }

    PRODUCTS {
        uuid id PK
        uuid categoryId FK
        string name
        text description
        string image
        enum status
        datetime createdAt
        datetime updatedAt
    }

    PRODUCT_VARIANTS {
        uuid id PK
        uuid productId FK
        string sku
        string barcode
        string color
        string size
        decimal price
        decimal cost
        integer quantity
        datetime createdAt
        datetime updatedAt
    }

    ORDERS {
        uuid id PK
        uuid userId FK
        string orderNumber
        decimal total
        enum status
        datetime createdAt
        datetime updatedAt
    }

    ORDER_ITEMS {
        uuid id PK
        uuid orderId FK
        uuid productVariantId FK
        integer quantity
        decimal price
        decimal subtotal
        datetime createdAt
        datetime updatedAt
    }
```

**Relationship chain:** `Category → Product → Product Variant → Order Item ← Order ← User`

---

## 1. Users

Stores the people who can log into your system.

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | string | User's full name |
| email | string | Login email (unique) |
| password | string | Hashed password |
| status | enum | `ACTIVE`, `INACTIVE` |
| createdAt | datetime | Created timestamp |
| updatedAt | datetime | Updated timestamp |

---

## 2. Categories

Groups products together (e.g. Electronics, Fashion, Accessories, Beauty).

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | string | Category name |
| description | text | Optional description |
| createdAt | datetime | Created timestamp |
| updatedAt | datetime | Updated timestamp |

---

## 3. Products

Represents the product itself, not individual stock (e.g. "iPhone 16 Pro").

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| categoryId | UUID | FK → Categories |
| name | string | Product name |
| description | text | Product description |
| image | string | Main image URL |
| status | enum | `ACTIVE`, `INACTIVE` |
| createdAt | datetime | Created timestamp |
| updatedAt | datetime | Updated timestamp |

---

## 4. Product Variants (Product Items)

Represents sellable variations of a product (e.g. iPhone 16 Pro / Black / 128GB vs. iPhone 16 Pro / White / 256GB).

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| productId | UUID | FK → Products |
| sku | string | Stock Keeping Unit |
| barcode | string | Barcode (optional) |
| color | string | Product color |
| size | string | Size (optional) |
| price | decimal | Selling price |
| cost | decimal | Purchase cost |
| quantity | integer | Current stock quantity |
| createdAt | datetime | Created timestamp |
| updatedAt | datetime | Updated timestamp |

> For v1, keeping `quantity` directly on the variant is fine. As the app grows, move stock management into a dedicated inventory module (see Future Expansion).

---

## 5. Orders

Represents a customer's order.

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → Users |
| orderNumber | string | Human-readable order number |
| total | decimal | Total order amount |
| status | enum | `PENDING`, `PAID`, `SHIPPED`, `COMPLETED`, `CANCELLED` |
| createdAt | datetime | Created timestamp |
| updatedAt | datetime | Updated timestamp |

---

## 6. Order Items

Stores the products included in an order.

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| orderId | UUID | FK → Orders |
| productVariantId | UUID | FK → Product Variants |
| quantity | integer | Quantity ordered |
| price | decimal | Price at the time of purchase |
| subtotal | decimal | `price × quantity` |
| createdAt | datetime | Created timestamp |
| updatedAt | datetime | Updated timestamp |

> `price` is snapshotted here on purpose — if a product's selling price changes later, historical orders still reflect what the customer actually paid.

---

## Future Expansion

Once comfortable with the MVP, these can be added without redesigning existing tables:

- Suppliers
- Purchase Orders
- Warehouses
- Inventory Movements
- Payments
- Coupons
- Reviews
- Addresses
- Wishlists
- Audit Logs

---

## Why This Scope Works for Learning NestJS

This schema is sized to give practice with:

- One-to-Many relationships: Category → Products, Product → Product Variants, Order → Order Items
- Many-to-One relationships from child tables back to parents
- CRUD operations
- Validation with DTOs
- Authentication with JWT
- Pagination and filtering
- Transaction handling (e.g. creating an order + decrementing variant stock atomically)

Enough complexity to learn the framework properly, without tipping into enterprise-scale overhead.