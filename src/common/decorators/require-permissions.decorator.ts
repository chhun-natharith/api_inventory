import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY, PermissionName } from '../constants';

/**
 * Attaches one or more permission requirements to a route handler.
 * The `PermissionsGuard` reads this metadata and rejects requests
 * whose JWT payload is missing any of the listed permissions.
 *
 * @example
 * @RequirePermissions(PERMISSIONS.USERS_READ)
 * findAll() {...}
 */
export const RequirePermissions = (...permissions: PermissionName[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
