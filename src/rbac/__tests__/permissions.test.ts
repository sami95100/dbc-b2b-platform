import {
  hasPermission,
  hasAnyPermission,
  canAccessResource,
  canAccessOwnOrAll,
  filterByPermissions,
  getPermissionsForRole,
  requirePermission,
  requirePermissionWithOwnership
} from '../permissions';
import { Role, Permission, User } from '../types';

describe('RBAC Permissions System', () => {
  const adminUser: User = global.testUtils.createTestUser({
    role: Role.ADMIN
  });

  const clientUser: User = global.testUtils.createTestUser({
    role: Role.CLIENT
  });

  const inactiveUser: User = global.testUtils.createTestUser({
    is_active: false
  });

  describe('getPermissionsForRole', () => {
    test('should return admin permissions for admin role', () => {
      const permissions = getPermissionsForRole(Role.ADMIN);
      
      expect(permissions).toContain(Permission.CATALOG_READ);
      expect(permissions).toContain(Permission.CATALOG_WRITE);
      expect(permissions).toContain(Permission.ORDER_READ_ALL);
      expect(permissions).toContain(Permission.USER_CREATE);
      expect(permissions).toContain(Permission.METRICS_READ);
      expect(permissions.length).toBeGreaterThan(10);
    });

    test('should return client permissions for client role', () => {
      const permissions = getPermissionsForRole(Role.CLIENT);
      
      expect(permissions).toContain(Permission.CATALOG_READ);
      expect(permissions).toContain(Permission.ORDER_READ_OWN);
      expect(permissions).toContain(Permission.ORDER_CREATE);
      expect(permissions).not.toContain(Permission.CATALOG_WRITE);
      expect(permissions).not.toContain(Permission.ORDER_READ_ALL);
      expect(permissions).not.toContain(Permission.USER_CREATE);
      expect(permissions.length).toBeLessThan(10);
    });
  });

  describe('hasPermission', () => {
    test('should return true for admin with admin permission', () => {
      expect(hasPermission(adminUser, Permission.CATALOG_WRITE)).toBe(true);
      expect(hasPermission(adminUser, Permission.ORDER_READ_ALL)).toBe(true);
      expect(hasPermission(adminUser, Permission.USER_CREATE)).toBe(true);
    });

    test('should return true for client with client permission', () => {
      expect(hasPermission(clientUser, Permission.CATALOG_READ)).toBe(true);
      expect(hasPermission(clientUser, Permission.ORDER_READ_OWN)).toBe(true);
      expect(hasPermission(clientUser, Permission.ORDER_CREATE)).toBe(true);
    });

    test('should return false for client with admin permission', () => {
      expect(hasPermission(clientUser, Permission.CATALOG_WRITE)).toBe(false);
      expect(hasPermission(clientUser, Permission.ORDER_READ_ALL)).toBe(false);
      expect(hasPermission(clientUser, Permission.USER_CREATE)).toBe(false);
    });

    test('should return false for inactive user', () => {
      expect(hasPermission(inactiveUser, Permission.CATALOG_READ)).toBe(false);
    });

    test('should return false for null user', () => {
      expect(hasPermission(null, Permission.CATALOG_READ)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    test('should return true if user has at least one permission', () => {
      expect(hasAnyPermission(adminUser, [
        Permission.CATALOG_WRITE,
        Permission.ORDER_READ_ALL
      ])).toBe(true);

      expect(hasAnyPermission(clientUser, [
        Permission.CATALOG_READ,
        Permission.ORDER_READ_ALL
      ])).toBe(true);
    });

    test('should return false if user has none of the permissions', () => {
      expect(hasAnyPermission(clientUser, [
        Permission.CATALOG_WRITE,
        Permission.ORDER_READ_ALL
      ])).toBe(false);
    });

    test('should return false for inactive user', () => {
      expect(hasAnyPermission(inactiveUser, [Permission.CATALOG_READ])).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    test('should work with resource:action format', () => {
      expect(canAccessResource(adminUser, 'catalog', 'write')).toBe(true);
      expect(canAccessResource(clientUser, 'catalog', 'read')).toBe(true);
      expect(canAccessResource(clientUser, 'catalog', 'write')).toBe(false);
    });
  });

  describe('canAccessOwnOrAll', () => {
    test('should allow admin to access all resources', () => {
      expect(canAccessOwnOrAll(adminUser, 'order', 'read', false)).toBe(true);
      expect(canAccessOwnOrAll(adminUser, 'order', 'read', true)).toBe(true);
    });

    test('should allow client to access own resources only', () => {
      expect(canAccessOwnOrAll(clientUser, 'order', 'read', true)).toBe(true);
      expect(canAccessOwnOrAll(clientUser, 'order', 'read', false)).toBe(false);
    });
  });

  describe('filterByPermissions', () => {
    const testOrders = [
      { id: '1', user_id: 'admin-id', name: 'Admin Order' },
      { id: '2', user_id: 'client-id', name: 'Client Order' },
      { id: '3', user_id: 'other-id', name: 'Other Order' }
    ];

    test('should return all data for admin', () => {
      const filtered = filterByPermissions(adminUser, testOrders, 'order');
      expect(filtered).toHaveLength(3);
    });

    test('should return only own data for client', () => {
      const clientUserWithId = { ...clientUser, id: 'client-id' };
      const filtered = filterByPermissions(clientUserWithId, testOrders, 'order');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    test('should return empty array for inactive user', () => {
      const filtered = filterByPermissions(inactiveUser, testOrders, 'order');
      expect(filtered).toHaveLength(0);
    });
  });

  describe('requirePermission', () => {
    test('should not throw for user with permission', () => {
      const checkPermission = requirePermission(Permission.CATALOG_READ);
      expect(() => checkPermission(adminUser)).not.toThrow();
      expect(() => checkPermission(clientUser)).not.toThrow();
    });

    test('should throw for user without permission', () => {
      const checkPermission = requirePermission(Permission.CATALOG_WRITE);
      expect(() => checkPermission(clientUser)).toThrow('Permission denied');
    });

    test('should throw for null user', () => {
      const checkPermission = requirePermission(Permission.CATALOG_READ);
      expect(() => checkPermission(null)).toThrow('Permission denied');
    });
  });

  describe('requirePermissionWithOwnership', () => {
    const mockCheckOwnership = jest.fn();

    beforeEach(() => {
      mockCheckOwnership.mockClear();
    });

    test('should allow admin without ownership check', async () => {
      const checkPermission = requirePermissionWithOwnership(
        'order',
        'read',
        mockCheckOwnership
      );

      await expect(checkPermission(adminUser, 'test-id')).resolves.not.toThrow();
      expect(mockCheckOwnership).not.toHaveBeenCalled();
    });

    test('should check ownership for client', async () => {
      mockCheckOwnership.mockResolvedValue(true);
      
      const checkPermission = requirePermissionWithOwnership(
        'order',
        'read',
        mockCheckOwnership
      );

      await expect(checkPermission(clientUser, 'test-id')).resolves.not.toThrow();
      expect(mockCheckOwnership).toHaveBeenCalledWith(clientUser, 'test-id');
    });

    test('should throw if client is not owner', async () => {
      mockCheckOwnership.mockResolvedValue(false);
      
      const checkPermission = requirePermissionWithOwnership(
        'order',
        'read',
        mockCheckOwnership
      );

      await expect(checkPermission(clientUser, 'test-id')).rejects.toThrow('Permission denied');
    });

    test('should throw for unauthenticated user', async () => {
      const checkPermission = requirePermissionWithOwnership(
        'order',
        'read',
        mockCheckOwnership
      );

      await expect(checkPermission(null, 'test-id')).rejects.toThrow('Authentication required');
    });
  });

  describe('Edge cases', () => {
    test('should handle undefined role gracefully', () => {
      const userWithUndefinedRole = { ...clientUser, role: undefined as any };
      expect(hasPermission(userWithUndefinedRole, Permission.CATALOG_READ)).toBe(false);
    });

    test('should handle empty permissions array', () => {
      expect(hasAnyPermission(adminUser, [])).toBe(false);
    });

    test('should handle malformed resource strings', () => {
      expect(canAccessResource(adminUser, '', '')).toBe(false);
      expect(canAccessResource(adminUser, 'invalid', 'invalid')).toBe(false);
    });
  });
}); 