# Requirements Document

## Introduction

This feature adds a Role-Based Access Control (RBAC) system to the existing NestJS inventory API. The system introduces three roles — **Admin**, **Support**, and **Customer** — each with a defined set of permissions that control which API endpoints and operations a user may perform. RBAC integrates with the existing JWT authentication layer, meaning every authenticated request is also subject to role and permission checks. Admin users have full access. Support users have partial management access to assist when Admin is unavailable. Customers can browse the product catalog and manage their own orders. Permissions are granular, resource-scoped strings (e.g. `users:read`, `products:write`) that are assigned to roles and are enforced at the route level via a dedicated guard.

---

## Glossary

- **RBAC_System**: The role-based access control subsystem being introduced by this feature.
- **Role**: A named collection of permissions assigned to a user (Admin, Support, or Customer).
- **Permission**: A granular, resource-scoped string that authorizes a specific action (e.g. `users:read`, `products:write`).
- **RolePermission**: The many-to-many join between a Role and its assigned Permissions.
- **UserRole**: The association that links a User to exactly one Role.
- **Permission_Guard**: The NestJS guard that runs after JWT authentication and checks whether the authenticated user holds the required permission for the requested endpoint.
- **JWT_Payload**: The decoded access token payload, currently containing `sub` (user ID) and `email`.
- **Admin**: The role with full access to every endpoint and operation.
- **Support**: The role with partial management access — can read and update most resources but cannot delete users, change user roles, or manage permissions.
- **Customer**: The role with access limited to browsing the public product catalog and managing their own orders.
- **Seeder**: A Prisma seed script that populates the database with the default roles and their permission assignments.

---

## Requirements

### Requirement 1: Role and Permission Data Model

**User Story:** As a system architect, I want roles and permissions stored in the database, so that the access control configuration is persistent, auditable, and extensible.

#### Acceptance Criteria

1. THE RBAC_System SHALL maintain a `roles` table with fields: `id` (UUID), `name` (unique string), `description` (optional string), `createdAt`, and `updatedAt`.
2. THE RBAC_System SHALL maintain a `permissions` table with fields: `id` (UUID), `name` (unique string following the pattern `resource:action`), `description` (optional string), `createdAt`, and `updatedAt`.
3. THE RBAC_System SHALL maintain a `role_permissions` join table that records which permissions are assigned to which role, with composite unique key on `(roleId, permissionId)`.
4. THE RBAC_System SHALL add a `roleId` foreign key column to the `users` table that references the `roles` table, defaulting to the Customer role.
5. WHEN the application is seeded, THE Seeder SHALL create exactly three roles: `Admin`, `Support`, and `Customer`.
6. WHEN the application is seeded, THE Seeder SHALL create the following permissions:

   | Permission name         | Description                              |
   |-------------------------|------------------------------------------|
   | `users:read`            | List and view user records               |
   | `users:write`           | Create and update user records           |
   | `users:delete`          | Delete user records                      |
   | `users:manage-roles`    | Assign or change user roles              |
   | `categories:read`       | List and view categories                 |
   | `categories:write`      | Create and update categories             |
   | `categories:delete`     | Delete categories                        |
   | `products:read`         | List and view products                   |
   | `products:write`        | Create and update products               |
   | `products:delete`       | Delete products                          |
   | `variants:read`         | List and view product variants           |
   | `variants:write`        | Create and update product variants       |
   | `variants:delete`       | Delete product variants                  |
   | `orders:read`           | List and view any order                  |
   | `orders:write`          | Create and update any order              |
   | `orders:delete`         | Cancel or delete any order               |
   | `orders:read-own`       | Read only the caller's own orders        |
   | `orders:write-own`      | Create or update only the caller's own orders |

7. WHEN the application is seeded, THE Seeder SHALL assign permissions to roles according to the following matrix:

   | Permission              | Admin | Support | Customer |
   |-------------------------|-------|---------|----------|
   | `users:read`            | ✓     | ✓       |          |
   | `users:write`           | ✓     | ✓       |          |
   | `users:delete`          | ✓     |         |          |
   | `users:manage-roles`    | ✓     |         |          |
   | `categories:read`       | ✓     | ✓       | ✓        |
   | `categories:write`      | ✓     | ✓       |          |
   | `categories:delete`     | ✓     |         |          |
   | `products:read`         | ✓     | ✓       | ✓        |
   | `products:write`        | ✓     | ✓       |          |
   | `products:delete`       | ✓     |         |          |
   | `variants:read`         | ✓     | ✓       | ✓        |
   | `variants:write`        | ✓     | ✓       |          |
   | `variants:delete`       | ✓     |         |          |
   | `orders:read`           | ✓     | ✓       |          |
   | `orders:write`          | ✓     | ✓       |          |
   | `orders:delete`         | ✓     |         |          |
   | `orders:read-own`       | ✓     | ✓       | ✓        |
   | `orders:write-own`      | ✓     | ✓       | ✓        |

---

### Requirement 2: Default Role Assignment on Registration

**User Story:** As a new user registering through the public API, I want to be automatically assigned the Customer role, so that I can browse products and place orders immediately without manual role assignment.

#### Acceptance Criteria

1. WHEN a user registers via `POST /api/auth/register`, THE RBAC_System SHALL assign the `Customer` role to the newly created user.
2. IF the `Customer` role does not exist in the database at registration time, THEN THE RBAC_System SHALL return HTTP 500 and log the error.
3. THE RBAC_System SHALL include the user's `role` name in the response of `GET /api/auth/me`.

---

### Requirement 3: JWT Payload Role Inclusion

**User Story:** As the system, I want the user's role to be embedded in the JWT access token, so that the Permission_Guard can enforce access control without an extra database query on every request.

#### Acceptance Criteria

1. WHEN an access token is issued (on register, login, or token refresh), THE RBAC_System SHALL include the user's `role` name and the list of `permissions` strings in the JWT payload.
2. THE JWT_Payload SHALL contain the fields: `sub` (user UUID), `email`, `role` (role name string), and `permissions` (array of permission name strings).
3. WHEN a refresh token is rotated, THE RBAC_System SHALL re-read the user's current role and permissions from the database and embed the updated values in the new access token.

---

### Requirement 4: Permission Guard

**User Story:** As a system architect, I want a reusable NestJS guard that enforces permission checks on every protected route, so that access control is consistent and centrally managed.

#### Acceptance Criteria

1. THE RBAC_System SHALL provide a `Permission_Guard` that can be applied globally or per-route.
2. WHEN a route is decorated with the `@RequirePermissions(...permissions)` decorator, THE Permission_Guard SHALL verify that the authenticated user's JWT payload contains every listed permission.
3. IF the authenticated user's JWT payload is missing one or more required permissions, THEN THE Permission_Guard SHALL return HTTP 403 Forbidden with message `"Insufficient permissions"`.
4. WHEN a route has no `@RequirePermissions` decorator but requires JWT authentication, THE Permission_Guard SHALL allow the request through (authentication alone is sufficient).
5. WHEN a route is decorated with `@Public()`, THE Permission_Guard SHALL allow the request through without any permission check.
6. THE Permission_Guard SHALL run after the `JwtAuthGuard` in the NestJS guard execution chain.

---

### Requirement 5: Endpoint Access Control per Role

**User Story:** As a system administrator, I want each API endpoint protected by the correct permission, so that Admin, Support, and Customer users can only perform the actions their role allows.

#### Acceptance Criteria

1. THE RBAC_System SHALL protect the Users endpoints with the following permissions:

   | Method | Endpoint              | Required permission  |
   |--------|-----------------------|----------------------|
   | POST   | `/api/users`          | `users:write`        |
   | GET    | `/api/users`          | `users:read`         |
   | GET    | `/api/users/:id`      | `users:read`         |
   | PATCH  | `/api/users/:id`      | `users:write`        |
   | DELETE | `/api/users/:id`      | `users:delete`       |

2. THE RBAC_System SHALL protect the Categories endpoints with the following permissions:

   | Method | Endpoint                  | Required permission    |
   |--------|---------------------------|------------------------|
   | POST   | `/api/categories`         | `categories:write`     |
   | GET    | `/api/categories`         | `categories:read`      |
   | GET    | `/api/categories/:id`     | `categories:read`      |
   | PATCH  | `/api/categories/:id`     | `categories:write`     |
   | DELETE | `/api/categories/:id`     | `categories:delete`    |

3. THE RBAC_System SHALL protect the Products endpoints with the following permissions:

   | Method | Endpoint              | Required permission |
   |--------|-----------------------|---------------------|
   | POST   | `/api/products`       | `products:write`    |
   | GET    | `/api/products`       | `products:read`     |
   | GET    | `/api/products/:id`   | `products:read`     |
   | PATCH  | `/api/products/:id`   | `products:write`    |
   | DELETE | `/api/products/:id`   | `products:delete`   |

4. THE RBAC_System SHALL protect the Product Variants endpoints with the following permissions:

   | Method | Endpoint                      | Required permission |
   |--------|-------------------------------|---------------------|
   | POST   | `/api/product-variants`       | `variants:write`    |
   | GET    | `/api/product-variants`       | `variants:read`     |
   | GET    | `/api/product-variants/:id`   | `variants:read`     |
   | PATCH  | `/api/product-variants/:id`   | `variants:write`    |
   | DELETE | `/api/product-variants/:id`   | `variants:delete`   |

5. THE RBAC_System SHALL protect the Orders endpoints with the following permissions:

   | Method | Endpoint            | Required permission            |
   |--------|---------------------|--------------------------------|
   | POST   | `/api/orders`       | `orders:write-own`             |
   | GET    | `/api/orders`       | `orders:read`                  |
   | GET    | `/api/orders/:id`   | `orders:read` OR `orders:read-own` (own order) |
   | PATCH  | `/api/orders/:id`   | `orders:write`                 |
   | DELETE | `/api/orders/:id`   | `orders:delete`                |

6. WHEN a Customer calls `GET /api/orders/:id`, THE RBAC_System SHALL allow the request only if the order's `userId` matches the authenticated user's `sub`, or if the user holds the `orders:read` permission.
7. WHEN a Customer calls `POST /api/orders`, THE RBAC_System SHALL automatically set the order's `userId` to the authenticated user's `sub`.

---

### Requirement 6: Admin Role Management Endpoint

**User Story:** As an Admin, I want to change any user's role through a dedicated API endpoint, so that I can promote, demote, or reassign users without accessing the database directly.

#### Acceptance Criteria

1. THE RBAC_System SHALL expose `PATCH /api/users/:id/role` for updating a user's role.
2. WHEN a request is made to `PATCH /api/users/:id/role`, THE Permission_Guard SHALL require the `users:manage-roles` permission.
3. WHEN the role name provided in the request body does not match any existing role, THEN THE RBAC_System SHALL return HTTP 404 with message `"Role not found"`.
4. WHEN the target user does not exist, THEN THE RBAC_System SHALL return HTTP 404 with message `"User not found"`.
5. WHEN a valid role is assigned, THE RBAC_System SHALL persist the new `roleId` on the user record and return the updated user with the new role name.

---

### Requirement 7: Support Role Capabilities

**User Story:** As a Support user, I want to be able to manage categories, products, variants, and orders so that I can keep the store operational when the Admin is unavailable.

#### Acceptance Criteria

1. WHILE a user holds the `Support` role, THE RBAC_System SHALL permit read and write access to categories, products, product variants, and orders.
2. WHILE a user holds the `Support` role, THE RBAC_System SHALL deny delete operations on categories, products, and product variants.
3. WHILE a user holds the `Support` role, THE RBAC_System SHALL deny `orders:delete`, `users:delete`, and `users:manage-roles` operations.
4. WHILE a user holds the `Support` role, THE RBAC_System SHALL permit read and write access to user records (`users:read`, `users:write`) to allow Support to update customer information.

---

### Requirement 8: Customer Role Capabilities

**User Story:** As a Customer, I want to browse the product catalog and manage my own orders, so that I can shop without access to administrative functions.

#### Acceptance Criteria

1. WHILE a user holds the `Customer` role, THE RBAC_System SHALL permit `categories:read`, `products:read`, and `variants:read`.
2. WHILE a user holds the `Customer` role, THE RBAC_System SHALL permit `orders:read-own` and `orders:write-own`.
3. WHILE a user holds the `Customer` role, THE RBAC_System SHALL deny all write and delete operations on categories, products, and variants.
4. WHILE a user holds the `Customer` role, THE RBAC_System SHALL deny access to the user management endpoints (`/api/users`).
5. WHEN a Customer attempts to access an endpoint for which they lack permission, THE Permission_Guard SHALL return HTTP 403 Forbidden with message `"Insufficient permissions"`.

---

### Requirement 9: Permission Guard Integration with Existing Auth

**User Story:** As a developer, I want the RBAC system to layer on top of the existing JWT guard without breaking current behavior, so that all existing endpoints continue to work after the RBAC feature is deployed.

#### Acceptance Criteria

1. THE RBAC_System SHALL not alter the behavior of the `@Public()` decorator — public routes SHALL remain accessible without a token.
2. THE RBAC_System SHALL not remove or replace the existing `JwtAuthGuard`; the `Permission_Guard` SHALL be added as a second guard that runs after JWT validation succeeds.
3. WHEN the `JwtAuthGuard` rejects a request (missing or expired token), THE Permission_Guard SHALL not execute.
4. THE RBAC_System SHALL update the `JwtStrategy.validate()` method to attach `role` and `permissions` from the decoded token to the request user object, making them available to the `Permission_Guard`.

---

### Requirement 10: Roles Listing Endpoint

**User Story:** As an Admin, I want to retrieve the list of all roles and their assigned permissions, so that I can understand the current access configuration and make informed role assignment decisions.

#### Acceptance Criteria

1. THE RBAC_System SHALL expose `GET /api/roles` that returns all roles with their associated permissions.
2. WHEN a request is made to `GET /api/roles`, THE Permission_Guard SHALL require the `users:manage-roles` permission.
3. THE RBAC_System SHALL expose `GET /api/roles/:id` that returns a single role with its permissions.
4. WHEN a request is made to `GET /api/roles/:id` and the role does not exist, THEN THE RBAC_System SHALL return HTTP 404 with message `"Role not found"`.
