# Implementation Plan: Role-Permission RBAC

## Overview

Layer a Role-Based Access Control system on top of the existing JWT authentication. The Prisma schema, seed script, `JwtPayload` interface, `@RequirePermissions()` decorator, and `PermissionsGuard` are already scaffolded. The remaining work is: running the migration, wiring the guard into `AppModule`, updating `AuthService` to embed role + permissions in JWTs, updating `UsersService` to auto-assign the Customer role, building the `RolesModule`, adding the role-assignment endpoint, applying `@RequirePermissions` to all controllers, adding owner-scoped logic to the Orders domain, and writing the test suite.

## Tasks

- [ ] 1. Run Prisma migration and regenerate the client
  - Run `prisma migrate dev --name add-rbac-models` to apply the `Role`, `Permission`, `RolePermission` models and the `roleId` FK already in `schema.prisma`
  - Run `prisma generate` to regenerate `@prisma/client` with the new types
  - Verify the generated `UserInclude` type now includes the `role` relation so that the existing type errors in `users.repository.ts` resolve
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Register `PermissionsGuard` as a global guard in `AppModule`
  - In `src/app.module.ts` add a second `APP_GUARD` provider pointing to `PermissionsGuard` (after `JwtAuthGuard`)
  - Import `PermissionsGuard` from `src/common/guards/permissions.guard.ts`
  - _Requirements: 4.1, 4.6, 9.2_

- [ ] 3. Update `AuthService` to embed role and permissions in JWTs
  - [ ] 3.1 Update `register()` — after `usersService.create()`, call `usersRepository.findByIdWithPermissions(user.id)` to load role + permissions, then pass them into `issueTokens()`
    - The `issueTokens` signature already accepts the full `JwtPayload`; only the callers need updating
    - _Requirements: 3.1, 3.2_
  - [ ] 3.2 Update `login()` — replace `usersRepository.findByEmail()` with `usersRepository.findByEmailWithPermissions()` so `role` and `permissions` are available; build the full `JwtPayload` before calling `issueTokens()`
    - _Requirements: 3.1, 3.2_
  - [ ] 3.3 Update `refresh()` — after verifying the refresh token, call `usersRepository.findByIdWithPermissions(payload.sub)` to re-read the latest role + permissions; embed them in the new token pair
    - This fulfils the requirement that a role change is reflected on the next token rotation
    - _Requirements: 3.3_
  - [ ]* 3.4 Write unit tests for `AuthService` token issuance
    - Test that `register()` produces an access token whose decoded payload contains `role: 'Customer'`
    - Test that `login()` produces a payload with correct `role` and non-empty `permissions`
    - Test that `refresh()` re-fetches and embeds current role + permissions
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Update `UsersService.create()` to auto-assign the Customer role
  - [ ] 4.1 Inject a `RolesRepository` (or use `PrismaService` directly) into `UsersService` to look up the Customer role by name
    - Call `prisma.role.findUnique({ where: { name: 'Customer' } })` before creating the user
    - If the Customer role is not found, throw `InternalServerErrorException('Customer role not found')`
    - Pass `roleId: customerRole.id` in the `usersRepository.create()` call
    - _Requirements: 2.1, 2.2_
  - [ ]* 4.2 Write unit test for `UsersService.create()` when Customer role is missing
    - Mock the role lookup to return `null`; assert that `InternalServerErrorException` is thrown
    - _Requirements: 2.2_

- [ ] 5. Build the `RolesModule`
  - [ ] 5.1 Create `src/roles/roles.repository.ts`
    - Implement `findAll()`: returns all roles with their permissions eagerly loaded via `include: { permissions: { include: { permission: true } } }`
    - Implement `findById(id: string)`: same include shape; returns `null` if not found
    - Implement `findByName(name: string)`: used by `UsersService` for the Customer role lookup
    - _Requirements: 10.1, 10.3_
  - [ ] 5.2 Create `src/roles/entities/role.entity.ts`
    - Map the Prisma `Role` row + its permission list to a plain class with `id`, `name`, `description`, `permissions` (array of `{ id, name, description }`)
    - _Requirements: 10.1, 10.3_
  - [ ] 5.3 Create `src/roles/roles.service.ts`
    - `findAll()`: delegates to `rolesRepository.findAll()`; returns mapped `RoleEntity[]`
    - `findOne(id: string)`: delegates to `rolesRepository.findById(id)`; throws `NotFoundException('Role not found')` if null
    - _Requirements: 10.1, 10.3, 10.4_
  - [ ] 5.4 Create `src/roles/roles.controller.ts`
    - `GET /roles` decorated with `@RequirePermissions(PERMISSIONS.USERS_MANAGE_ROLES)` → calls `rolesService.findAll()`
    - `GET /roles/:id` decorated with `@RequirePermissions(PERMISSIONS.USERS_MANAGE_ROLES)` → calls `rolesService.findOne(id)`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [ ] 5.5 Create `src/roles/roles.module.ts` and register it in `AppModule`
    - Declare `RolesController`, `RolesService`, `RolesRepository`; import `PrismaModule`
    - Add `RolesModule` to `AppModule.imports`
    - Export `RolesRepository` so `UsersModule` can import it
    - _Requirements: 10.1_

- [ ] 6. Add `PATCH /api/users/:id/role` endpoint
  - [ ] 6.1 Create `src/users/dto/assign-role.dto.ts`
    - Single field: `roleName: string` with `@IsString()` and `@IsNotEmpty()` validators
    - _Requirements: 6.1_
  - [ ] 6.2 Add `assignRole(userId: string, roleName: string)` to `UsersService`
    - Look up role by name (via `RolesRepository.findByName()`); throw `NotFoundException('Role not found')` if absent
    - Look up user by id (via `mustFindById()`); throw `NotFoundException('User not found')` if absent
    - Call `usersRepository.update(userId, { role: { connect: { name: roleName } } })` and return `new UserEntity(user)`
    - _Requirements: 6.3, 6.4, 6.5_
  - [ ] 6.3 Add the `PATCH :id/role` handler to `UsersController`
    - Decorate with `@RequirePermissions(PERMISSIONS.USERS_MANAGE_ROLES)`
    - Use `@Param('id', ParseUUIDPipe)` and `@Body() dto: AssignRoleDto`
    - _Requirements: 6.1, 6.2_
  - [ ]* 6.4 Write unit tests for `UsersService.assignRole()`
    - Test: role name not found → `NotFoundException('Role not found')`
    - Test: user not found → `NotFoundException('User not found')`
    - Test: valid call → updated user returned with new role name
    - _Requirements: 6.3, 6.4, 6.5_

- [ ] 7. Checkpoint — build and seed
  - Ensure the project compiles without errors (`npm run build`)
  - Run `npx prisma db seed` against the dev database and confirm 3 roles and 18 permissions are created
  - Ask the user if anything needs clarification before proceeding to controller decoration

- [ ] 8. Apply `@RequirePermissions` to existing controllers
  - [ ] 8.1 Decorate `UsersController` routes
    - `POST /users` → `@RequirePermissions(PERMISSIONS.USERS_WRITE)`
    - `GET /users` → `@RequirePermissions(PERMISSIONS.USERS_READ)`
    - `GET /users/:id` → `@RequirePermissions(PERMISSIONS.USERS_READ)`
    - `PATCH /users/:id` → `@RequirePermissions(PERMISSIONS.USERS_WRITE)`
    - `DELETE /users/:id` → `@RequirePermissions(PERMISSIONS.USERS_DELETE)`
    - _Requirements: 5.1_
  - [ ] 8.2 Decorate `CategoriesController` routes
    - `POST /categories` → `@RequirePermissions(PERMISSIONS.CATEGORIES_WRITE)`
    - `GET /categories` → `@RequirePermissions(PERMISSIONS.CATEGORIES_READ)`
    - `GET /categories/:id` → `@RequirePermissions(PERMISSIONS.CATEGORIES_READ)`
    - `PATCH /categories/:id` → `@RequirePermissions(PERMISSIONS.CATEGORIES_WRITE)`
    - `DELETE /categories/:id` → `@RequirePermissions(PERMISSIONS.CATEGORIES_DELETE)`
    - _Requirements: 5.2_
  - [ ] 8.3 Decorate `ProductsController` routes
    - `POST /products` → `@RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)`
    - `GET /products` → `@RequirePermissions(PERMISSIONS.PRODUCTS_READ)`
    - `GET /products/:id` → `@RequirePermissions(PERMISSIONS.PRODUCTS_READ)`
    - `PATCH /products/:id` → `@RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)`
    - `DELETE /products/:id` → `@RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)`
    - _Requirements: 5.3_
  - [ ] 8.4 Decorate `ProductVariantsController` routes
    - `POST /product-variants` → `@RequirePermissions(PERMISSIONS.VARIANTS_WRITE)`
    - `GET /product-variants` → `@RequirePermissions(PERMISSIONS.VARIANTS_READ)`
    - `GET /product-variants/:id` → `@RequirePermissions(PERMISSIONS.VARIANTS_READ)`
    - `PATCH /product-variants/:id` → `@RequirePermissions(PERMISSIONS.VARIANTS_WRITE)`
    - `DELETE /product-variants/:id` → `@RequirePermissions(PERMISSIONS.VARIANTS_DELETE)`
    - _Requirements: 5.4_

- [ ] 9. Update `OrdersController` and `OrdersService` with RBAC and owner-scoped logic
  - [ ] 9.1 Decorate `OrdersController` routes with permissions
    - `POST /orders` → `@RequirePermissions(PERMISSIONS.ORDERS_WRITE_OWN)`
    - `GET /orders` → `@RequirePermissions(PERMISSIONS.ORDERS_READ)`
    - `GET /orders/:id` → `@RequirePermissions(PERMISSIONS.ORDERS_READ_OWN)` (minimum; fine-grained check is in the service)
    - `PATCH /orders/:id` → `@RequirePermissions(PERMISSIONS.ORDERS_WRITE)`
    - `DELETE /orders/:id` → `@RequirePermissions(PERMISSIONS.ORDERS_DELETE)`
    - _Requirements: 5.5_
  - [ ] 9.2 Pass `@CurrentUser()` caller into `OrdersController` handlers
    - Inject `JwtPayload` caller into `create()` and `findOne()` handlers using the `@CurrentUser()` decorator
    - Pass `caller` through to the corresponding service methods
    - _Requirements: 5.6, 5.7_
  - [ ] 9.3 Update `OrdersService.create()` to force `userId` to `caller.sub`
    - Change the method signature to `create(dto: CreateOrderDto, caller: JwtPayload)`
    - Override `dto.userId` with `caller.sub` before calling `ordersRepository.createWithItems()`
    - `userId` should become optional in `CreateOrderDto` (add `@IsOptional()`)
    - _Requirements: 5.7_
  - [ ] 9.4 Update `OrdersService.findOne()` for owner-scoped access
    - Change signature to `findOne(id: string, caller: JwtPayload)`
    - After fetching the order, check: `hasGlobal = caller.permissions.includes('orders:read')`, `hasOwn = caller.permissions.includes('orders:read-own')`
    - Allow if `hasGlobal || (hasOwn && order.userId === caller.sub)`; otherwise throw `ForbiddenException('Insufficient permissions')`
    - _Requirements: 5.6_
  - [ ]* 9.5 Write unit tests for `OrdersService` owner-scoped logic
    - Test: caller is owner with `orders:read-own` only → access granted
    - Test: caller is not owner, has `orders:read` → access granted
    - Test: caller is not owner, has only `orders:read-own` → `ForbiddenException`
    - Test: `create()` ignores any `userId` in dto and uses `caller.sub`
    - _Requirements: 5.6, 5.7_

- [ ] 10. Install `fast-check` and write property-based tests
  - [ ] 10.1 Install `fast-check` as a dev dependency
    - Run `npm install --save-dev fast-check`
    - _Requirements: (test infrastructure)_
  - [ ]* 10.2 Write property test for Property 3 — `PermissionsGuard` allows IFF all required permissions held
    - File: `src/common/guards/permissions.guard.pbt.spec.ts`
    - **Property 3: Permission guard allows if and only if all required permissions are held**
    - **Validates: Requirements 4.2, 4.3**
    - Generate arbitrary subsets of `ALL_PERMISSIONS` for `userPerms` and `required`; build a mock `ExecutionContext`; assert `canActivate()` returns `true` when `required ⊆ userPerms`, throws `ForbiddenException` otherwise
  - [ ]* 10.3 Write property test for Property 4 — owner-scoped order access
    - File: `src/orders/orders.service.pbt.spec.ts`
    - **Property 4: Owner-scoped order access is granted if and only if the caller owns the order or holds `orders:read`**
    - **Validates: Requirements 5.6**
    - Use `fc.uuid()` for `ownerSub` and `callerSub`, `fc.boolean()` for `hasGlobal` and `hasOwn`; mock `ordersRepository.findById()` to return an order with the given `ownerSub`; assert access is granted if and only if `hasGlobal || (hasOwn && callerSub === ownerSub)`
  - [ ]* 10.4 Write property test for Property 5 — order creation sets `userId` to caller's sub
    - File: `src/orders/orders.service.pbt.spec.ts` (same file as 10.3)
    - **Property 5: Order creation always sets `userId` to the caller's sub**
    - **Validates: Requirements 5.7**
    - Use `fc.uuid()` for any `callerSub`; mock `ordersRepository.createWithItems()` to capture arguments; assert `userId` arg equals `callerSub` regardless of what `dto.userId` contains
  - [ ]* 10.5 Write property test for Property 6 — role assignment persists the requested role
    - File: `src/users/users.service.pbt.spec.ts`
    - **Property 6: Role assignment always persists the requested role**
    - **Validates: Requirements 6.5**
    - Use `fc.constantFrom('Admin', 'Support', 'Customer')` for `roleName`; mock `rolesRepository.findByName()` and `usersRepository.update()`; assert the returned `UserEntity.role` matches the requested `roleName`

- [ ] 11. Write unit tests for `PermissionsGuard` and `UsersService`
  - [ ]* 11.1 Write unit tests for `PermissionsGuard`
    - File: `src/common/guards/permissions.guard.spec.ts`
    - Test: no `@RequirePermissions` metadata → returns `true`
    - Test: `@Public()` metadata → returns `true`
    - Test: required permission present in `user.permissions` → returns `true`
    - Test: required permission absent → throws `ForbiddenException('Insufficient permissions')`
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  - [ ]* 11.2 Write unit tests for `UsersService.create()` role assignment
    - File: `src/users/users.service.spec.ts`
    - Test: Customer role not found → throws `InternalServerErrorException('Customer role not found')`
    - Test: successful create → returned `UserEntity` has `role === 'Customer'`
    - _Requirements: 2.1, 2.2_

- [ ] 12. Final checkpoint — compile and test
  - Run `npm run build` and confirm zero TypeScript errors
  - Run `npm test -- --testPathPattern=spec` to execute all unit and PBT tests
  - Ensure all tests pass; ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for an MVP build
- Tasks 1–2 must be done first; they unblock all type-checker issues in `users.repository.ts` and `auth.service.ts`
- Task 5 (`RolesModule`) and Task 4 (`UsersService.create`) are independent after Task 1 and can be worked in parallel
- The `PERMISSIONS` constants object in `src/common/constants/index.ts` is already complete — use it everywhere instead of raw strings
- The seed script (`prisma/seed.ts`) is already written and idempotent; Task 7 just runs it
- `fast-check` is not yet in `package.json`; Task 10.1 installs it before the PBT tests are written
- Property-based tests run with Jest because the Jest config already matches `*.spec.ts`; naming the files `*.pbt.spec.ts` makes them easy to run in isolation with `--testPathPattern=pbt`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "5.1", "5.2", "6.1", "10.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "4.1", "5.3", "5.4"] },
    { "id": 3, "tasks": ["5.5", "6.2", "9.1", "9.2"] },
    { "id": 4, "tasks": ["6.3", "8.1", "8.2", "8.3", "8.4", "9.3", "9.4"] },
    { "id": 5, "tasks": ["3.4", "4.2", "6.4", "9.5", "11.1", "11.2"] },
    { "id": 6, "tasks": ["10.2", "10.3", "10.4", "10.5"] }
  ]
}
```
