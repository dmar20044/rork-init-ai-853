// Vercel serverless function entry point
// Import the compiled TypeScript backend
const path = require('path');
const fs = require('fs');

// Try to import the compiled backend, fallback to simple implementation
let app;
try {
  // Try to import the compiled TypeScript backend
  const backendPath = path.join(process.cwd(), 'backend/hono.js');
  if (fs.existsSync(backendPath)) {
    app = require(backendPath).default;
    console.log('Using compiled TypeScript backend');
  } else {
    throw new Error('Compiled backend not found, using fallback');
  }
} catch (error) {
  console.log('Using fallback JavaScript backend:', error.message);
  
  // Fallback to simple JavaScript implementation
  const { Hono } = require('hono');
  const { cors } = require('hono/cors');
  const { trpcServer } = require('@hono/trpc-server');
  const { initTRPC } = require('@trpc/server');
  const { z } = require('zod');

  // Create Hono app
  app = new Hono();

  // Enable CORS for all routes
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }));

  // Simple health check endpoint
  app.get('/', (c) => {
    console.log('Root endpoint called');
    return c.json({ 
      status: 'ok', 
      message: 'API is running (fallback)',
      timestamp: new Date().toISOString(),
      usingRorkAPI: true,
      environment: process.env.NODE_ENV || 'unknown'
    });
  });

  app.get('/api', (c) => {
    console.log('API endpoint called');
    return c.json({ 
      status: 'ok', 
      message: 'API is running (fallback)', 
      endpoints: ['/api/trpc', '/debug'],
      timestamp: new Date().toISOString(),
      usingRorkAPI: true,
      environment: process.env.NODE_ENV || 'unknown'
    });
  });

  // Debug endpoint
  app.get('/debug', (c) => {
    console.log('Debug endpoint called');
    return c.json({
      status: 'debug',
      environment: {
        usingRorkAPI: true,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        vercelRegion: process.env.VERCEL_REGION || 'unknown',
        vercelUrl: process.env.VERCEL_URL || 'unknown',
        backendType: 'fallback'
      }
    });
  });

  // Create tRPC instance
  const t = initTRPC.create();
  const publicProcedure = t.procedure;
  const router = t.router;

  // Create the app router with food analysis
  const appRouter = router({
    example: router({
      hi: publicProcedure
        .input(z.object({
          name: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          console.log('Example hi called with:', input);
          return {
            message: `Hello ${input.name || 'World'}!`,
            timestamp: new Date().toISOString(),
            usingRorkAPI: true
          };
        })
    }),
    food: router({
      analyze: publicProcedure
        .input(z.object({
          base64Image: z.string(),
          userGoals: z.object({
            bodyGoal: z.string().optional(),
            healthGoal: z.string().optional(),
            dietGoal: z.string().optional(),
            lifeGoal: z.string().optional(),
            motivation: z.string().optional(),
            healthStrictness: z.enum(['not-strict', 'neutral', 'very-strict']).optional(),
            dietStrictness: z.enum(['not-strict', 'neutral', 'very-strict']).optional(),
            lifeStrictness: z.enum(['not-strict', 'neutral', 'very-strict']).optional(),
          }).optional(),
        }))
        .mutation(async ({ input }) => {
          try {
            console.log('Starting food analysis on backend (fallback)...');
            
            // Compress the image to avoid 413 errors
            const compressedImage = compressBase64Image(input.base64Image, 500);
            console.log('Image compression completed');
            
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

            console.log('Making request to Rork AI API...');
            
            // Use Rork's built-in AI API - no API key needed!
            const response = await fetch('https://toolkit.rork.com/text/llm/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messages: [
                  {
                    role: 'system',
                    content: systemPrompt
                  },
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: userMessage
                      },
                      {
                        type: 'image',
                        image: compressedImage
                      }
                    ]
                  }
                ]
              }),
            });
            
            if (!response.ok) {
              const errorText = await response.text().catch(() => 'Unable to read error response');
              console.error('Rork AI API error:', response.status, errorText);
              
              // Return fallback response for AI API errors
              return {
                success: true,
                data: {
                  name: 'Food Item (AI Unavailable)',
                  calories: 150,
                  protein: 3,
                  carbs: 20,
                  fat: 5,
                  saturatedFat: 2,
                  fiber: 2,
                  sugar: 8,
                  sodium: 200,
                  servingSize: '1 serving',
                  healthScore: 45,
                  ingredients: ['Unable to analyze - AI service unavailable'],
                  allergens: [],
                  additives: [],
                  isOrganic: false,
                  grade: 'mediocre',
                  recommendations: [
                    'AI analysis service is temporarily unavailable',
                    'This is a placeholder analysis',
                    'Please try again later'
                  ],
                  warnings: ['Analysis unavailable - AI service error'],
                  reasons: ['AI service connectivity issue'],
                  flags: ['ai_unavailable'],
                  scoreBreakdown: {
                    nutritionScore: 40,
                    additivesScore: 0,
                    organicScore: 0,
                    totalScore: 45
                  }
                }
              };
            }

            const result = await response.json();
            console.log('Rork AI Analysis result received');
            
            // Parse the Rork AI response
            const completion = result.completion || '';
            console.log('Raw AI response length:', completion.length);
            
            // Clean the response - remove any markdown formatting or extra text
            let cleanedResponse = completion.trim();
            
            // Look for JSON content
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
            
            let nutritionData;
            try {
              nutritionData = JSON.parse(cleanedResponse);
            } catch (parseError) {
              console.error('JSON parsing failed:', parseError);
              console.error('Failed to parse response:', cleanedResponse.substring(0, 500));
              
              // Return fallback for parsing errors
              return {
                success: true,
                data: {
                  name: 'Food Item (Parse Error)',
                  calories: 150,
                  protein: 3,
                  carbs: 20,
                  fat: 5,
                  saturatedFat: 2,
                  fiber: 2,
                  sugar: 8,
                  sodium: 200,
                  servingSize: '1 serving',
                  healthScore: 45,
                  ingredients: ['Unable to parse AI response'],
                  allergens: [],
                  additives: [],
                  isOrganic: false,
                  grade: 'mediocre',
                  recommendations: [
                    'AI response could not be parsed',
                    'This is a placeholder analysis',
                    'Please try again'
                  ],
                  warnings: ['Analysis unavailable - parsing error'],
                  reasons: ['AI response parsing issue'],
                  flags: ['parse_error'],
                  scoreBreakdown: {
                    nutritionScore: 40,
                    additivesScore: 0,
                    organicScore: 0,
                    totalScore: 45
                  }
                }
              };
            }
            
            // Validate the response structure
            if (!nutritionData.name || typeof nutritionData.healthScore !== 'number') {
              console.error('Invalid response structure:', nutritionData);
              
              // Return fallback for invalid structure
              return {
                success: true,
                data: {
                  name: 'Food Item (Invalid Format)',
                  calories: 150,
                  protein: 3,
                  carbs: 20,
                  fat: 5,
                  saturatedFat: 2,
                  fiber: 2,
                  sugar: 8,
                  sodium: 200,
                  servingSize: '1 serving',
                  healthScore: 45,
                  ingredients: ['Invalid AI response format'],
                  allergens: [],
                  additives: [],
                  isOrganic: false,
                  grade: 'mediocre',
                  recommendations: [
                    'AI response format was invalid',
                    'This is a placeholder analysis',
                    'Please try again'
                  ],
                  warnings: ['Analysis unavailable - format error'],
                  reasons: ['AI response format issue'],
                  flags: ['format_error'],
                  scoreBreakdown: {
                    nutritionScore: 40,
                    additivesScore: 0,
                    organicScore: 0,
                    totalScore: 45
                  }
                }
              };
            }
            
            // Ensure all required numeric fields are present and valid
            const requiredFields = ['calories', 'protein', 'carbs', 'fat', 'saturatedFat', 'fiber', 'sugar', 'sodium'];
            for (const field of requiredFields) {
              if (typeof nutritionData[field] !== 'number') {
                nutritionData[field] = 0;
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
            
            // Add basic scoring
            nutritionData.grade = nutritionData.healthScore >= 75 ? 'excellent' : 
                                 nutritionData.healthScore >= 50 ? 'good' : 
                                 nutritionData.healthScore >= 25 ? 'mediocre' : 'poor';
            
            nutritionData.scoreBreakdown = {
              nutritionScore: nutritionData.healthScore || 45,
              additivesScore: 0,
              organicScore: nutritionData.isOrganic ? 10 : 0,
              totalScore: nutritionData.healthScore || 45
            };
            
            nutritionData.reasons = nutritionData.reasons || [];
            nutritionData.flags = nutritionData.flags || [];
            
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
        })
    })
  });

  // Helper function to compress base64 image
  function compressBase64Image(base64Data, maxSizeKB = 500) {
    try {
      const currentSizeKB = (base64Data.length * 3) / 4 / 1024;
      console.log(`Original image size: ${currentSizeKB.toFixed(2)} KB`);
      
      if (currentSizeKB <= maxSizeKB) {
        console.log('Image size is acceptable, no compression needed');
        return base64Data;
      }
      
      const compressionRatio = maxSizeKB / currentSizeKB;
      console.log(`Compression ratio needed: ${compressionRatio.toFixed(2)}`);
      
      let targetLength;
      if (currentSizeKB > 2000) {
        targetLength = Math.floor(base64Data.length * 0.3);
      } else if (currentSizeKB > 1000) {
        targetLength = Math.floor(base64Data.length * 0.5);
      } else {
        targetLength = Math.floor(base64Data.length * Math.sqrt(compressionRatio));
      }
      
      const compressedData = base64Data.substring(0, targetLength);
      const newSizeKB = (compressedData.length * 3) / 4 / 1024;
      console.log(`Compressed image size: ${newSizeKB.toFixed(2)} KB`);
      
      return compressedData;
    } catch (error) {
      console.error('Error compressing image:', error);
      return base64Data;
    }
  }

  // Mount tRPC router
  app.use(
    '/trpc/*',
    trpcServer({
      endpoint: '/trpc',
      router: appRouter,
      createContext: () => ({}),
    })
  );

  app.use(
    '/api/trpc/*',
    trpcServer({
      endpoint: '/api/trpc',
      router: appRouter,
      createContext: () => ({}),
    })
  );
}

// Export for Vercel
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    console.log('Vercel handler called:', {
      method: req.method,
      url: req.url,
      hasBody: !!req.body,
      bodyType: typeof req.body,
      contentType: req.headers['content-type'],
      usingRorkAPI: true,
      host: req.headers.host,
      userAgent: req.headers['user-agent']
    });
    
    // Create a proper Request object for Hono
    const url = new URL(req.url || '/', `https://${req.headers.host}`);
    
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // For Vercel, the body is already parsed and available as req.body
      if (req.body) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else if (req.rawBody) {
        // Use raw body if available
        body = req.rawBody;
      }
    }
    
    // Create proper headers object
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) {
        headers.set(key, Array.isArray(value) ? value[0] : value);
      }
    });
    
    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    });
    
    console.log('Making request to Hono app:', {
      url: url.toString(),
      method: req.method,
      hasBody: !!body
    });
    
    const response = await app.fetch(request);
    
    console.log('Hono response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      ok: response.ok
    });
    
    // If response is not ok and it's HTML, log the content for debugging
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const htmlContent = await response.clone().text();
        console.error('HTML error response:', htmlContent.substring(0, 1000));
      }
    }
    
    // Set status
    res.status(response.status);
    
    // Copy headers
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    // Send response
    const responseText = await response.text();
    console.log('Sending response, length:', responseText.length, 'status:', response.status);
    
    // For debugging, log first part of response if it's an error
    if (!response.ok) {
      console.log('Error response preview:', responseText.substring(0, 500));
    }
    
    res.send(responseText);
    
  } catch (error) {
    console.error('Vercel handler error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error,
      timestamp: new Date().toISOString()
    });
  }
};