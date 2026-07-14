import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Permission catalog. Names follow the `resource:action` pattern.
 */
const PERMISSIONS: Array<{ name: string; description: string }> = [
  { name: 'users:read', description: 'List and view user records' },
  { name: 'users:write', description: 'Create and update user records' },
  { name: 'users:delete', description: 'Delete user records' },
  { name: 'users:manage-roles', description: 'Assign or change user roles' },
  { name: 'categories:read', description: 'List and view categories' },
  { name: 'categories:write', description: 'Create and update categories' },
  { name: 'categories:delete', description: 'Delete categories' },
  { name: 'products:read', description: 'List and view products' },
  { name: 'products:write', description: 'Create and update products' },
  { name: 'products:delete', description: 'Delete products' },
  { name: 'variants:read', description: 'List and view product variants' },
  { name: 'variants:write', description: 'Create and update product variants' },
  { name: 'variants:delete', description: 'Delete product variants' },
  { name: 'orders:read', description: 'List and view any order' },
  { name: 'orders:write', description: 'Create and update any order' },
  { name: 'orders:delete', description: 'Cancel or delete any order' },
  { name: 'orders:read-own', description: "Read only the caller's own orders" },
  {
    name: 'orders:write-own',
    description: "Create or update only the caller's own orders",
  },
];

/**
 * Role catalog with the permission names assigned to each role.
 */
const ROLES: Array<{
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    name: 'Admin',
    description: 'Full access to every endpoint and operation',
    permissions: PERMISSIONS.map((p) => p.name),
  },
  {
    name: 'Support',
    description: 'Partial management access to assist when Admin is unavailable',
    permissions: [
      'users:read',
      'users:write',
      'categories:read',
      'categories:write',
      'products:read',
      'products:write',
      'variants:read',
      'variants:write',
      'orders:read',
      'orders:write',
      'orders:read-own',
      'orders:write-own',
    ],
  },
  {
    name: 'Customer',
    description: 'Browse the catalog and manage own orders',
    permissions: [
      'categories:read',
      'products:read',
      'variants:read',
      'orders:read-own',
      'orders:write-own',
    ],
  },
];

async function main(): Promise<void> {
  // 1. Upsert permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions`);

  // 2. Upsert roles + refresh their permission assignments
  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: { name: roleDef.name, description: roleDef.description },
    });

    // Fetch permission IDs for this role
    const perms = await prisma.permission.findMany({
      where: { name: { in: roleDef.permissions } },
      select: { id: true },
    });

    // Reset then assign — keeps the matrix authoritative on each seed run
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });

    console.log(`Seeded role "${role.name}" with ${perms.length} permissions`);
  }

  // 3. Backfill any users missing a role (defaults to Customer)
  const customer = await prisma.role.findUniqueOrThrow({
    where: { name: 'Customer' },
  });
  const backfilled = await prisma.user.updateMany({
    where: { roleId: null },
    data: { roleId: customer.id },
  });
  if (backfilled.count > 0) {
    console.log(`Backfilled ${backfilled.count} users to Customer role`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
