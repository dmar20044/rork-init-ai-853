// Production configuration
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Keep some logging in production for debugging backend issues
// Only disable verbose logs, keep errors and important info
if (IS_PRODUCTION) {
  // Keep console.log for backend debugging
  // console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  // Keep console.error for critical issues
}

export const DEBUG_ENABLED = !IS_PRODUCTION;