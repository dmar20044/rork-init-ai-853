import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

// Simple health check endpoint
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

// Debug endpoint to check environment variables
app.get("/debug", (c) => {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const keyLength = process.env.ANTHROPIC_API_KEY?.length || 0;
  const keyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 10) || 'none';
  
  return c.json({
    status: "debug",
    environment: {
      hasAnthropicKey,
      keyLength,
      keyPrefix: keyPrefix === 'none' ? 'none' : keyPrefix + '...',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    },
    timestamp: new Date().toISOString()
  });
});

// Test Anthropic API endpoint
app.post("/test-anthropic", async (c) => {
  try {
    const { message } = await c.req.json();
    
    console.log('Testing Anthropic API with message:', message);
    console.log('API Key available:', !!process.env.ANTHROPIC_API_KEY);
    console.log('API Key length:', process.env.ANTHROPIC_API_KEY?.length || 0);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: message || 'Hello, this is a test message'
          }
        ]
      }),
    });
    
    console.log('Anthropic API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return c.json({ 
        success: false, 
        error: `API request failed: ${response.status}`,
        details: errorText
      }, 500);
    }
    
    const result = await response.json();
    console.log('Anthropic API success');
    
    return c.json({ 
      success: true, 
      data: result,
      apiKeyPresent: !!process.env.ANTHROPIC_API_KEY
    });
    
  } catch (error) {
    console.error('Test Anthropic API error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      apiKeyPresent: !!process.env.ANTHROPIC_API_KEY
    }, 500);
  }
});

export default app;