import { serve } from '@hono/node-server';
import app from './hono';

const port = process.env.PORT || 3000;

console.log(`🚀 Backend server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port: Number(port),
});

console.log(`✅ Backend server running at http://localhost:${port}`);
console.log(`📡 tRPC endpoint: http://localhost:${port}/api/trpc`);
console.log(`🏥 Health check: http://localhost:${port}/api`);