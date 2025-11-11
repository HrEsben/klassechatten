import { UserRole } from './types';

/**
 * Check if a user has the required role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.ADMIN]: 4,
    [UserRole.TEACHER]: 3,
    [UserRole.PARENT]: 2,
    [UserRole.STUDENT]: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if a user can moderate content
 */
export function canModerate(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN || userRole === UserRole.TEACHER;
}

/**
 * Generate a simple auth token placeholder
 * In production, use proper JWT or session tokens
 */
export function generateAuthToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
}

/**
 * Validate auth token placeholder
 * In production, validate JWT or session
 */
export function validateAuthToken(token: string): { userId: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, timestamp] = decoded.split(':');
    
    if (!userId || !timestamp) {
      return null;
    }
    
    return { userId, timestamp: parseInt(timestamp, 10) };
  } catch {
    return null;
  }
}
