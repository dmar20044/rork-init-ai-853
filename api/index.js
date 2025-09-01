// Vercel serverless function entry point
const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { trpcServer } = require('@hono/trpc-server');
const { z } = require('zod');
const superjson = require('superjson');

// Create tRPC router
const { initTRPC } = require('@trpc/server');
const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Food analysis procedure
const analyzeFoodProcedure = publicProcedure
  .input(z.object({
    base64Image: z.string(),
    userGoals: z.object({
      bodyGoal: z.string().optional(),
      healthGoal: z.string().optional(),
      dietGoal: z.string().optional(),
      lifeGoal: z.string().optional(),
      motivation: z.string().optional(),
    }).optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      console.log('Starting food analysis on backend...');
      
      const systemPrompt = `You are a nutrition expert AI that analyzes food images with high accuracy. Your goal is to provide precise nutritional information by:

1. FIRST: Identify if this is a packaged food with a nutrition label visible
2. If nutrition label is visible: Read the exact values from the label
3. If no label: Use your knowledge of the specific food item
4. Always specify realistic serving sizes based on the actual food shown
5. CRITICAL: Provide a COMPLETE and ACCURATE ingredient list - this is essential for user health
6. LANGUAGE: Always respond in English, regardless of the language on the product packaging

You MUST respond with ONLY a valid JSON object, no additional text or formatting. The JSON should contain:
- name: string (specific food item name, include brand if visible)
- calories: number (per serving as defined below)
- protein: number (grams per serving)
- carbs: number (grams per serving)
- fat: number (grams per serving)
- saturatedFat: number (grams per serving)
- fiber: number (grams per serving)
- sugar: number (grams per serving)
- sodium: number (milligrams per serving)
- servingSize: string (be specific: "1 medium apple (182g)", "2 slices (57g)", "1 cup cooked (195g)")
- servingsPerContainer: number (only for packaged foods, omit for fresh foods)
- healthScore: number (1-100, be realistic - most processed foods should be 30-60)
- ingredients: string[] (COMPLETE list - every single ingredient visible or commonly found)
- allergens: string[] (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans)
- additives: string[] (preservatives, artificial colors, flavors, emulsifiers, etc.)
- isOrganic: boolean (only true if "USDA Organic" or "Certified Organic" is clearly visible)
- recommendations: string[] (specific, actionable health tips)
- warnings: string[] (specific health concerns for this food)`;

      const userMessage = 'Please analyze this food image and provide detailed nutritional information in English. CRITICAL: Pay special attention to the ingredient list - read every single ingredient visible on the package. If you can see an ingredient list, include ALL ingredients but translate them to English if they are in another language. This is essential for accurate health analysis. Always respond in English regardless of the product packaging language.';

      console.log('Making request to Anthropic API...');
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: userMessage
                },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: input.base64Image
                  }
                }
              ]
            }
          ]
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('Anthropic API error:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Anthropic Analysis result received');
      
      // Parse the Anthropic response
      const completion = result.content?.[0]?.text || '';
      console.log('Raw Anthropic response length:', completion.length);
      
      // Clean the response - remove any markdown formatting or extra text
      let cleanedResponse = completion.trim();
      
      // Look for JSON content between ```json and ``` or just find the JSON object
      const jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       cleanedResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                       cleanedResponse.match(/({[\s\S]*})/);
      
      if (jsonMatch) {
        cleanedResponse = jsonMatch[1].trim();
      }
      
      // If it doesn't start with {, try to find the JSON object
      if (!cleanedResponse.startsWith('{')) {
        const startIndex = cleanedResponse.indexOf('{');
        const endIndex = cleanedResponse.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          cleanedResponse = cleanedResponse.substring(startIndex, endIndex + 1);
        }
      }
      
      console.log('Cleaned response for parsing');
      
      const nutritionData = JSON.parse(cleanedResponse);
      
      // Validate the response structure
      if (!nutritionData.name || typeof nutritionData.healthScore !== 'number') {
        console.error('Invalid response structure:', nutritionData);
        throw new Error('Invalid response format from AI');
      }
      
      // Ensure all required numeric fields are present and valid
      const requiredFields = ['calories', 'protein', 'carbs', 'fat', 'saturatedFat', 'fiber', 'sugar', 'sodium'];
      for (const field of requiredFields) {
        if (typeof nutritionData[field] !== 'number') {
          nutritionData[field] = 0; // Default to 0 if missing or invalid
        }
      }
      
      // Ensure arrays are present
      nutritionData.ingredients = nutritionData.ingredients || [];
      nutritionData.additives = nutritionData.additives || [];
      nutritionData.allergens = nutritionData.allergens || [];
      nutritionData.recommendations = nutritionData.recommendations || [];
      nutritionData.warnings = nutritionData.warnings || [];
      
      // Ensure boolean fields
      nutritionData.isOrganic = nutritionData.isOrganic || false;
      
      // Ensure serving size is present
      nutritionData.servingSize = nutritionData.servingSize || '1 serving';
      nutritionData.servingsPerContainer = nutritionData.servingsPerContainer;
      
      return {
        success: true,
        data: nutritionData
      };
      
    } catch (error) {
      console.error('Food analysis error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });

// Example procedure
const hiProcedure = publicProcedure
  .input(z.object({ name: z.string() }))
  .mutation(({ input }) => {
    return `Hello ${input.name}!`;
  });

// Create app router
const appRouter = router({
  example: router({
    hi: hiProcedure,
  }),
  food: router({
    analyze: analyzeFoodProcedure,
  }),
});

// Create Hono app
const app = new Hono();

// Enable CORS for all routes
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Add tRPC middleware
app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: () => ({}),
  })
);

// Simple health check endpoint
app.get('/', (c) => {
  return c.json({ 
    status: 'ok', 
    message: 'API is running with tRPC',
    timestamp: new Date().toISOString(),
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    keyLength: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0
  });
});

app.get('/api', (c) => {
  return c.json({ 
    status: 'ok', 
    message: 'tRPC API is running', 
    endpoints: ['/api/trpc'],
    timestamp: new Date().toISOString(),
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY
  });
});

// Debug endpoint
app.get('/debug', (c) => {
  return c.json({
    status: 'debug',
    environment: {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      keyLength: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  });
});

// Export for Vercel
module.exports = app;