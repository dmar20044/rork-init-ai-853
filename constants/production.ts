// Production configuration
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Override console methods in production
if (IS_PRODUCTION) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  // Keep console.error for critical issues
}

export const DEBUG_ENABLED = !IS_PRODUCTION;