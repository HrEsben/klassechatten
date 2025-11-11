/**
 * Simple feature flag system
 * In production, integrate with a proper feature flag service
 */

type FeatureFlags = {
  enableModeration: boolean;
  enableParentDashboard: boolean;
  enableGroupChats: boolean;
  enableFileUploads: boolean;
  enableVideoChat: boolean;
};

const defaultFlags: FeatureFlags = {
  enableModeration: true,
  enableParentDashboard: true,
  enableGroupChats: false,
  enableFileUploads: false,
  enableVideoChat: false,
};

let currentFlags: FeatureFlags = { ...defaultFlags };

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return currentFlags[feature];
}

/**
 * Set feature flags (for testing/development)
 */
export function setFeatureFlags(flags: Partial<FeatureFlags>): void {
  currentFlags = { ...currentFlags, ...flags };
}

/**
 * Get all feature flags
 */
export function getAllFeatureFlags(): FeatureFlags {
  return { ...currentFlags };
}

/**
 * Reset feature flags to defaults
 */
export function resetFeatureFlags(): void {
  currentFlags = { ...defaultFlags };
}
