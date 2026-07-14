export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Static catalog of role names — mirrors the seed.
 * Use these constants when referring to roles in code to avoid stringly-typed bugs.
 */
export const ROLES = {
  ADMIN: 'Admin',
  SUPPORT: 'Support',
  CUSTOMER: 'Customer',
} as const;

/**
 * Static catalog of permission names — mirrors the seed.
 * Import these in controllers via the `@RequirePermissions()` decorator.
 */
export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage-roles',
  CATEGORIES_READ: 'categories:read',
  CATEGORIES_WRITE: 'categories:write',
  CATEGORIES_DELETE: 'categories:delete',
  PRODUCTS_READ: 'products:read',
  PRODUCTS_WRITE: 'products:write',
  PRODUCTS_DELETE: 'products:delete',
  VARIANTS_READ: 'variants:read',
  VARIANTS_WRITE: 'variants:write',
  VARIANTS_DELETE: 'variants:delete',
  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',
  ORDERS_DELETE: 'orders:delete',
  ORDERS_READ_OWN: 'orders:read-own',
  ORDERS_WRITE_OWN: 'orders:write-own',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
