// Vercel serverless function entry point
const { Hono } = require('hono');
const { cors } = require('hono/cors');

// For now, create a simple app until we can properly import TypeScript
const app = new Hono();

// Enable CORS for all routes
app.use('*', cors());

// Simple health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'API is running' });
});

// Export for Vercel
module.exports = app;