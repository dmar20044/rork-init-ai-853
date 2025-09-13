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
  return c.json({
    status: "debug",
    environment: {
      usingRorkAPI: true,
      rorkAPIEndpoint: 'https://toolkit.rork.com/text/llm/',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      platform: 'vercel'
    },
    timestamp: new Date().toISOString()
  });
});

// Test Rork AI API endpoint
app.post("/test-rork-ai", async (c) => {
  try {
    const { message } = await c.req.json();
    
    console.log('Testing Rork AI API with message:', message);
    
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: message || 'Hello, this is a test message from backend'
          }
        ]
      }),
    });
    
    console.log('Rork AI API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Rork AI API error:', errorText);
      return c.json({ 
        success: false, 
        error: `API request failed: ${response.status}`,
        details: errorText
      }, 500);
    }
    
    const result = await response.json();
    console.log('Rork AI API success');
    
    return c.json({ 
      success: true, 
      data: result,
      usingRorkAPI: true
    });
    
  } catch (error) {
    console.error('Test Rork AI API error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      usingRorkAPI: true
    }, 500);
  }
});

export default app;