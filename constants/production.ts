// Production configuration
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Only disable console logs in web production, keep them for mobile debugging
if (IS_PRODUCTION && typeof window !== 'undefined') {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  // Keep console.error for critical issues
}

export const DEBUG_ENABLED = !IS_PRODUCTION || typeof window === 'undefined';