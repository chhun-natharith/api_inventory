# Design Document: Role-Permission RBAC

## Overview

This document describes the technical design for layering a Role-Based Access Control (RBAC) system on top of the existing JWT authentication in the NestJS inventory API.

The approach is additive: the existing `JwtAuthGuard` and `@Public()` decorator remain untouched. A second guard (`PermissionsGuard`) and a companion decorator (`@RequirePermissions()`) are introduced to enforce granular permission checks after JWT authentication succeeds. Role and permission data is stored in three new Prisma models (`Role`, `Permission`, `RolePermission`) and is embedded in every JWT access token at issuance time, so the guard can make decisions without an extra database query on the hot path.

Three roles ship with the system via a seed script: **Admin** (full access), **Support** (partial management), and **Customer** (catalog browsing + own orders). Every new registrant receives the Customer role automatically.

---

## Architecture

### Guard Execution Chain

NestJS applies guards in the order they are registered. `JwtAuthGuard` is already registered globally via `APP_GUARD` in `AppModule`. `PermissionsGuard` will be registered immediately after it as a second `APP_GUARD` entry.

```
Incoming Request
       │
       ▼
  JwtAuthGuard  (existing, unchanged)
  ┌─────────────────────────────────┐
  │ @Public()? → pass through       │
  │ Invalid/missing token? → 401    │
  │ Valid token → attach payload    │
  │   to request.user               │
  └─────────────────────────────────┘
       │ (only reaches here if JWT valid or Public)
       ▼
  PermissionsGuard  (new)
  ┌─────────────────────────────────┐
  │ @Public()? → pass through       │
  │ No @RequirePermissions? → pass  │
  │ Check user.permissions ⊇        │
  │   required permissions          │
  │   Yes → pass                    │
  │   No  → 403 Forbidden           │
  └─────────────────────────────────┘
       │
       ▼
  Route Handler
```

Because `JwtAuthGuard` returns `false` (throwing 401) before the chain continues, `PermissionsGuard` is only ever invoked on authenticated requests. Public routes are skipped by both guards via the `IS_PUBLIC_KEY` metadata.

### Module Dependency Graph

```
AppModule
  ├── AuthModule          (updated: JwtStrategy.validate, issueTokens)
  ├── UsersModule         (updated: create assigns Customer role; new assignRole method)
  ├── RolesModule  (new)  (GET /api/roles, GET /api/roles/:id)
  ├── OrdersModule        (updated: owner-scoped access for Customer)
  └── CommonModule guards (PermissionsGuard, @RequirePermissions decorator)
```

---

## Components and Interfaces

### 1. Updated `JwtPayload` Interface

```typescript
// src/common/interfaces/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;           // role name, e.g. 'Admin'
  permissions: string[];  // e.g. ['users:read', 'orders:write']
}
```

### 2. `@RequirePermissions()` Decorator

```typescript
// src/common/decorators/require-permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

### 3. `PermissionsGuard`

```typescript
// src/common/guards/permissions.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../constants';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user: JwtPayload = context.switchToHttp().getRequest().user;
    const hasAll = required.every((p) => user?.permissions?.includes(p));

    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
```

### 4. Updated `JwtStrategy`

`validate()` currently returns the raw payload. After this change it passes the full payload through (which now includes `role` and `permissions`), making them available as `request.user.*` throughout the request lifecycle.

```typescript
// src/auth/strategies/jwt.strategy.ts
validate(payload: JwtPayload): JwtPayload {
  // role and permissions are already in the payload from token issuance
  return payload;
}
```

No additional DB query is needed here because the payload already carries the enriched data.

### 5. Updated `AuthService.issueTokens()`

The private `issueTokens` method is widened to accept `role` and `permissions` alongside `sub` and `email`.

```typescript
// src/auth/auth.service.ts  (relevant section)
private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
  // payload now includes role and permissions
  const accessToken = this.jwtService.sign(payload, { ... });
  const refreshToken = this.jwtService.sign(payload, { ... });
  // store refresh token hash as before ...
  return { accessToken, refreshToken };
}
```

The callers (`register`, `login`, `refresh`) must each look up the user's role + permissions before calling `issueTokens`. The `refresh` path re-fetches from the DB to ensure the new token reflects any role changes made since the original login.

### 6. Updated `UsersService.create()`

On user creation, look up the Customer role ID and include it in the Prisma create call:

```typescript
async create(dto: CreateUserDto): Promise<UserEntity> {
  // ... existing duplicate email check ...
  const customerRole = await this.rolesRepository.findByName('Customer');
  if (!customerRole) {
    throw new InternalServerErrorException('Customer role not found');
  }
  const user = await this.usersRepository.create({
    ...createData,
    roleId: customerRole.id,
  });
  return new UserEntity(user);
}
```

### 7. New `RolesModule`

**Files:**
- `src/roles/roles.module.ts`
- `src/roles/roles.controller.ts`
- `src/roles/roles.service.ts`
- `src/roles/roles.repository.ts`
- `src/roles/entities/role.entity.ts`

**Controller surface:**

| Method | Path             | Guard                                         |
|--------|------------------|-----------------------------------------------|
| GET    | `/api/roles`     | `@RequirePermissions('users:manage-roles')`   |
| GET    | `/api/roles/:id` | `@RequirePermissions('users:manage-roles')`   |

`RolesRepository` exposes `findAll()` (with permissions eagerly loaded) and `findById()`. The service wraps these and throws `NotFoundException` for missing IDs.

### 8. `PATCH /api/users/:id/role` Endpoint

Added to `UsersController`. Accepts a body `{ roleName: string }`, resolves it to a `roleId`, and updates the user record.

```typescript
// src/users/dto/assign-role.dto.ts
export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleName: string;
}
```

The handler:

```typescript
@Patch(':id/role')
@RequirePermissions('users:manage-roles')
assignRole(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: AssignRoleDto,
) {
  return this.usersService.assignRole(id, dto.roleName);
}
```

`UsersService.assignRole()` looks up the role by name (404 if missing), looks up the user (404 if missing), and calls `usersRepository.update(id, { roleId })`.

### 9. Owner-Scoped Order Access

The orders controller needs access to `request.user` for two purposes:

1. `POST /api/orders` — force `userId` to `request.user.sub`.
2. `GET /api/orders/:id` — if user lacks `orders:read` but holds `orders:read-own`, allow only if `order.userId === request.user.sub`.

This ownership logic lives in `OrdersService`, which receives the caller context:

```typescript
// GET /api/orders/:id
async findOne(id: string, caller: JwtPayload): Promise<OrderEntity> {
  const order = await this.mustFindById(id);
  const hasGlobal = caller.permissions.includes('orders:read');
  const hasOwn = caller.permissions.includes('orders:read-own');
  if (!hasGlobal && !(hasOwn && order.userId === caller.sub)) {
    throw new ForbiddenException('Insufficient permissions');
  }
  return new OrderEntity(order);
}
```

The guard at the controller level uses `@RequirePermissions('orders:read-own')` (the minimum permission a caller must hold to even reach the handler). The ownership check inside the service provides the fine-grained filter.

---

## Data Models

### Prisma Schema Additions

```prisma
model Role {
  id          String           @id @default(uuid())
  name        String           @unique
  description String?
  users       User[]
  permissions RolePermission[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@map("roles")
}

model Permission {
  id          String           @id @default(uuid())
  name        String           @unique   // e.g. "users:read"
  description String?
  roles       RolePermission[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@map("permissions")
}

model RolePermission {
  roleId       String
  role         Role       @relation(fields: [roleId], references: [id])
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id])
  createdAt    DateTime   @default(now())

  @@id([roleId, permissionId])
  @@map("role_permissions")
}
```

**Changes to the existing `User` model:**

```prisma
model User {
  // ... existing fields ...
  roleId    String?
  role      Role?    @relation(fields: [roleId], references: [id])
  // ...
}
```

`roleId` is nullable in the schema to allow existing rows (and the seed script's own execution order) to work without errors. Application logic treats a missing role as Customer for any legacy records, and the seed script back-fills all existing users.

### Seed Script (`prisma/seed.ts`)

The seed script runs idempotently using `upsert`:

1. Upsert three roles: Admin, Support, Customer.
2. Upsert 18 permissions per the requirements matrix.
3. Upsert `RolePermission` join rows per the matrix.
4. Update all existing users with no `roleId` to the Customer role.

```typescript
// prisma/seed.ts  (abbreviated)
const adminRole  = await prisma.role.upsert({ where: { name: 'Admin' },    ... });
const supportRole = await prisma.role.upsert({ where: { name: 'Support' }, ... });
const customerRole = await prisma.role.upsert({ where: { name: 'Customer' }, ... });

const permissions = [
  { name: 'users:read',         description: 'List and view user records' },
  { name: 'users:write',        description: 'Create and update user records' },
  { name: 'users:delete',       description: 'Delete user records' },
  { name: 'users:manage-roles', description: 'Assign or change user roles' },
  { name: 'categories:read',    description: 'List and view categories' },
  { name: 'categories:write',   description: 'Create and update categories' },
  { name: 'categories:delete',  description: 'Delete categories' },
  { name: 'products:read',      description: 'List and view products' },
  { name: 'products:write',     description: 'Create and update products' },
  { name: 'products:delete',    description: 'Delete products' },
  { name: 'variants:read',      description: 'List and view product variants' },
  { name: 'variants:write',     description: 'Create and update product variants' },
  { name: 'variants:delete',    description: 'Delete product variants' },
  { name: 'orders:read',        description: 'List and view any order' },
  { name: 'orders:write',       description: 'Create and update any order' },
  { name: 'orders:delete',      description: 'Cancel or delete any order' },
  { name: 'orders:read-own',    description: 'Read only the caller\'s own orders' },
  { name: 'orders:write-own',   description: 'Create or update only the caller\'s own orders' },
];

// upsert each permission, then upsert RolePermission rows per the matrix
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Registration always assigns the Customer role

*For any* valid registration input (any name, any email, any password), the user created by `AuthService.register()` SHALL have a `role` of `'Customer'` in the returned JWT payload and in the database record.

**Validates: Requirements 2.1**

---

### Property 2: JWT token round-trip preserves role and permissions

*For any* user who holds any of the three valid roles, when `AuthService.issueTokens()` produces an access token and that token is decoded by `JwtStrategy.validate()`, the resulting `request.user` object SHALL contain a `role` string that matches the user's current role name and a `permissions` array that matches the current permission set assigned to that role.

**Validates: Requirements 3.1, 3.2, 9.4**

---

### Property 3: Permission guard allows if and only if all required permissions are held

*For any* combination of user permission set `U` and required permission set `R`, `PermissionsGuard.canActivate()` SHALL return `true` if and only if every element of `R` is also an element of `U` (i.e., `R ⊆ U`). For any element in `R` not present in `U`, it SHALL throw `ForbiddenException` with message `"Insufficient permissions"`.

**Validates: Requirements 4.2, 4.3**

---

### Property 4: Owner-scoped order access is granted if and only if the caller owns the order or holds `orders:read`

*For any* order record with owner `O`, and any authenticated caller with sub `C` and permission set `U`, `OrdersService.findOne()` SHALL grant access if and only if `'orders:read' ∈ U` OR (`'orders:read-own' ∈ U` AND `C == O`). Any other combination SHALL throw `ForbiddenException`.

**Validates: Requirements 5.6**

---

### Property 5: Order creation always sets `userId` to the caller's sub

*For any* valid `CreateOrderDto` submitted by any authenticated caller with sub `C`, the persisted order record SHALL have `userId == C`, regardless of whether the DTO includes a `userId` field.

**Validates: Requirements 5.7**

---

### Property 6: Role assignment always persists the requested role

*For any* existing user and any valid role name from `{Admin, Support, Customer}`, calling `UsersService.assignRole(userId, roleName)` SHALL result in the user record having a `role.name` equal to the requested `roleName`, and the returned user object SHALL reflect this new role.

**Validates: Requirements 6.5**

---

## Error Handling

| Scenario | HTTP Status | Message |
|---|---|---|
| JWT missing or expired | 401 | `"Unauthorized"` (existing JwtAuthGuard behavior) |
| Permission missing | 403 | `"Insufficient permissions"` |
| Role name not found in assign-role | 404 | `"Role not found"` |
| Role ID not found in GET /api/roles/:id | 404 | `"Role not found"` |
| Target user not found in assign-role | 404 | `"User not found"` |
| Customer role missing at registration | 500 | `"Customer role not found"` (logged as error) |
| Duplicate email on registration | 409 | `"Email already exists"` (existing behavior) |

All exceptions flow through the existing `HttpExceptionFilter`, so the response envelope format is unchanged.

---

## Testing Strategy

### Unit Tests

Focus on specific examples, edge cases, and the pure logic of the permission guard:

- `PermissionsGuard` with no metadata → passes
- `PermissionsGuard` with `@Public()` → passes
- `PermissionsGuard` with required permission present in user.permissions → passes
- `PermissionsGuard` with required permission absent → throws 403
- `UsersService.create()` when Customer role is missing → throws 500
- `UsersService.assignRole()` with nonexistent role name → throws 404
- `UsersService.assignRole()` with nonexistent user → throws 404
- `OrdersService.findOne()` — caller is owner with `orders:read-own` → passes
- `OrdersService.findOne()` — caller is not owner, has `orders:read` → passes
- `OrdersService.findOne()` — caller is not owner, has only `orders:read-own` → throws 403

### Property-Based Tests

Use [fast-check](https://github.com/dubzzz/fast-check) (the standard PBT library for TypeScript/Node.js). Each test runs a minimum of 100 iterations.

**Property 1 — Registration assigns Customer role**
```
// Feature: role-permission-rbac, Property 1: Registration always assigns Customer role
fc.assert(fc.asyncProperty(
  fc.record({ name: fc.string(), email: fc.emailAddress(), password: fc.string({ minLength: 8 }) }),
  async (dto) => {
    const tokens = await authService.register(dto);
    const payload = jwtService.decode(tokens.accessToken) as JwtPayload;
    return payload.role === 'Customer';
  }
));
```

**Property 2 — JWT round-trip preserves role and permissions**
```
// Feature: role-permission-rbac, Property 2: JWT token round-trip preserves role and permissions
fc.assert(fc.asyncProperty(
  fc.constantFrom('Admin', 'Support', 'Customer'),
  async (roleName) => {
    const user = await createTestUserWithRole(roleName);
    const tokens = await authService.login({ email: user.email, password: RAW_PASSWORD });
    const decoded = jwtStrategy.validate(jwtService.decode(tokens.accessToken));
    return decoded.role === roleName &&
           Array.isArray(decoded.permissions) &&
           decoded.permissions.length > 0;
  }
));
```

**Property 3 — PermissionsGuard allows IFF all required permissions held**
```
// Feature: role-permission-rbac, Property 3: Permission guard allows IFF user holds all required permissions
fc.assert(fc.property(
  fc.array(fc.constantFrom(...ALL_PERMISSIONS), { maxLength: 18 }),  // user permissions
  fc.array(fc.constantFrom(...ALL_PERMISSIONS), { minLength: 1, maxLength: 5 }), // required
  (userPerms, required) => {
    const shouldAllow = required.every((p) => userPerms.includes(p));
    const mockContext = buildMockContext(userPerms, required);
    if (shouldAllow) {
      return guard.canActivate(mockContext) === true;
    } else {
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      return true;
    }
  }
));
```

**Property 4 — Owner-scoped order access**
```
// Feature: role-permission-rbac, Property 4: Owner-scoped order access granted IFF caller owns order or holds orders:read
fc.assert(fc.asyncProperty(
  fc.uuid(),          // order owner userId
  fc.uuid(),          // caller userId
  fc.boolean(),       // caller has orders:read
  fc.boolean(),       // caller has orders:read-own
  async (ownerSub, callerSub, hasGlobal, hasOwn) => {
    const perms = [
      ...(hasGlobal ? ['orders:read'] : []),
      ...(hasOwn   ? ['orders:read-own'] : []),
    ];
    const order = await createTestOrder(ownerSub);
    const caller = buildCaller(callerSub, perms);
    const isOwner = callerSub === ownerSub;
    const shouldAllow = hasGlobal || (hasOwn && isOwner);
    if (shouldAllow) {
      const result = await ordersService.findOne(order.id, caller);
      return result.id === order.id;
    } else {
      await expect(ordersService.findOne(order.id, caller)).rejects.toThrow(ForbiddenException);
      return true;
    }
  }
));
```

**Property 5 — Order creation sets userId to caller's sub**
```
// Feature: role-permission-rbac, Property 5: Order creation always sets userId to caller's sub
fc.assert(fc.asyncProperty(
  fc.uuid(),   // any caller sub
  fc.record({ /* valid CreateOrderDto fields */ }),
  async (callerSub, dto) => {
    const caller = buildCaller(callerSub, ['orders:write-own']);
    const order = await ordersService.create(dto, caller);
    return order.userId === callerSub;
  }
));
```

**Property 6 — Role assignment persists the requested role**
```
// Feature: role-permission-rbac, Property 6: Role assignment always persists the requested role
fc.assert(fc.asyncProperty(
  fc.constantFrom('Admin', 'Support', 'Customer'),
  async (roleName) => {
    const user = await createTestUser();
    const updated = await usersService.assignRole(user.id, roleName);
    return updated.role === roleName;
  }
));
```

### Integration Tests

A dedicated integration test suite (using a real test database) verifies:

- Seeder creates exactly 3 roles and 18 permissions
- Seeder assigns permissions matching the requirements matrix
- All 6 endpoint groups reject requests with wrong/missing permissions (HTTP 403)
- `GET /api/roles` returns roles with their permissions
- `PATCH /api/users/:id/role` promotes/demotes users correctly
- Refresh token rotation re-embeds the latest role + permissions

### Test Configuration

```json
// package.json (additions)
"scripts": {
  "test:unit": "jest --testPathPattern=spec --runInBand",
  "test:pbt": "jest --testPathPattern=pbt --runInBand",
  "test:integration": "jest --testPathPattern=integration --runInBand"
}
```

PBT tests are in `*.pbt.spec.ts` files. Each property test uses `fc.assert()` with `{ numRuns: 100 }` (fast-check default is 100).
