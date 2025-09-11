// Production configuration
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Keep console methods available for debugging in production
// Only disable in very specific cases where performance is critical
if (IS_PRODUCTION && process.env.EXPO_PUBLIC_DISABLE_LOGS === 'true') {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  // Always keep console.error for critical issues
}

export const DEBUG_ENABLED = !IS_PRODUCTION || process.env.EXPO_PUBLIC_DEBUG === 'true';