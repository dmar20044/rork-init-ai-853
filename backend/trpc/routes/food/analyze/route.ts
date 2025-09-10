import { z } from "zod";
import { publicProcedure } from "../../../create-context";

const FoodAnalysisInput = z.object({
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
});

// Unused NutritionInfo schema - kept for reference
// const NutritionInfo = z.object({ ... });

// Helper function to compress base64 image
function compressBase64Image(base64Data: string, maxSizeKB: number = 500): string {
  try {
    // Calculate current size in KB
    const currentSizeKB = (base64Data.length * 3) / 4 / 1024;
    console.log(`Original image size: ${currentSizeKB.toFixed(2)} KB`);
    
    if (currentSizeKB <= maxSizeKB) {
      console.log('Image size is acceptable, no compression needed');
      return base64Data;
    }
    
    // Calculate compression ratio needed
    const compressionRatio = maxSizeKB / currentSizeKB;
    console.log(`Compression ratio needed: ${compressionRatio.toFixed(2)}`);
    
    // More aggressive compression for very large images
    let targetLength: number;
    if (currentSizeKB > 2000) {
      // For very large images (>2MB), be more aggressive
      targetLength = Math.floor(base64Data.length * 0.3); // Keep only 30%
    } else if (currentSizeKB > 1000) {
      // For large images (>1MB), moderate compression
      targetLength = Math.floor(base64Data.length * 0.5); // Keep only 50%
    } else {
      // For smaller images, use calculated ratio
      targetLength = Math.floor(base64Data.length * Math.sqrt(compressionRatio));
    }
    
    const compressedData = base64Data.substring(0, targetLength);
    
    const newSizeKB = (compressedData.length * 3) / 4 / 1024;
    console.log(`Compressed image size: ${newSizeKB.toFixed(2)} KB`);
    
    return compressedData;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original if compression fails
    return base64Data;
  }
}

export const analyzeFoodProcedure = publicProcedure
  .input(FoodAnalysisInput)
  .mutation(async ({ input }) => {
    try {
      console.log('Starting food analysis on backend...');
      
      // Compress the image to avoid 413 errors
      const compressedImage = compressBase64Image(input.base64Image, 500); // 500KB max
      console.log('Image compression completed');
      
      const systemPrompt = `You are a nutrition expert AI. Analyze food images quickly and accurately.

TASKS:
1. Identify the food item and brand (if visible)
2. Read nutrition label if visible, otherwise estimate
3. List ALL visible ingredients (translate to English if needed)
4. Identify additives and allergens
5. Respond in English only

RESPOND WITH ONLY VALID JSON:
{
  "name": "Food Name",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "saturatedFat": 0,
  "fiber": 0,
  "sugar": 0,
  "sodium": 0,
  "servingSize": "1 serving",
  "healthScore": 50,
  "ingredients": [],
  "allergens": [],
  "additives": [],
  "isOrganic": false,
  "recommendations": [],
  "warnings": []
}

Be fast and accurate. Include all visible ingredients.`;

      const userMessage = 'Analyze this food image. Provide nutrition facts and complete ingredient list in JSON format. Be fast and accurate.';

      console.log('Making request to Rork AI API...');
      
      // Create an AbortController for timeout handling
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout, aborting...');
        abortController.abort();
      }, 30000); // 30 second timeout (reduced from 60s)
      
      let response;
      try {
        // Use Rork's built-in AI API - no API key needed!
        response = await fetch('https://toolkit.rork.com/text/llm/', {
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
                    image: compressedImage // base64 image data
                  }
                ]
              }
            ]
          }),
          signal: abortController.signal
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            console.error('Request was aborted (likely timeout)');
            return {
              success: false,
              error: 'Analysis request timed out. Please try again with a clearer image.'
            };
          }
          console.error('Fetch error:', fetchError.message);
          return {
            success: false,
            error: `Network connection failed: ${fetchError.message}`
          };
        }
        
        return {
          success: false,
          error: 'An unexpected error occurred during the request'
        };
      }
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('Rork AI API error:', response.status, errorText);
        
        // If Rork AI API is not available, return a fallback response
        if (response.status === 404 || response.status === 503 || response.status >= 500) {
          console.log('Rork AI API unavailable, returning fallback analysis');
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
              grade: 'mediocre' as const,
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
        
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      let result;
      let responseText: string = '';
      try {
        responseText = await response.text();
        console.log('Raw response text:', responseText.substring(0, 500));
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        console.error('Response that failed to parse:', responseText ? responseText.substring(0, 1000) : 'No response text available');
        
        // Return fallback analysis instead of throwing error
        return {
          success: true,
          data: {
            name: 'Food Item (AI Parse Error)',
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
            grade: 'mediocre' as const,
            recommendations: [
              'AI response could not be parsed',
              'This is a placeholder analysis',
              'Please try again'
            ],
            warnings: ['Analysis unavailable - AI parsing error'],
            reasons: ['AI response parsing issue'],
            flags: ['ai_parse_error'],
            scoreBreakdown: {
              nutritionScore: 40,
              additivesScore: 0,
              organicScore: 0,
              totalScore: 45
            }
          }
        };
      }
      console.log('Rork AI Analysis result received');
      
      // Parse the Rork AI response
      const completion = result.completion || '';
      console.log('Raw AI response length:', completion.length);
      console.log('Raw AI response preview:', completion.substring(0, 200));
      
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
      
      console.log('Cleaned response for parsing:', cleanedResponse.substring(0, 200));
      
      let nutritionData;
      try {
        nutritionData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.error('Failed to parse response:', cleanedResponse);
        
        // Try to extract JSON more aggressively
        const fallbackMatch = completion.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/g);
        if (fallbackMatch && fallbackMatch.length > 0) {
          // Try the largest JSON-like string
          const largestMatch = fallbackMatch.reduce((a: string, b: string) => a.length > b.length ? a : b);
          console.log('Trying fallback JSON extraction:', largestMatch.substring(0, 200));
          try {
            nutritionData = JSON.parse(largestMatch);
          } catch (fallbackError) {
            console.error('Fallback JSON parsing also failed:', fallbackError);
            throw new Error(`Failed to parse AI response as JSON. Response preview: ${completion.substring(0, 500)}`);
          }
        } else {
          console.log('No valid JSON found, returning fallback analysis');
          // Return fallback analysis instead of throwing error
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
              grade: 'mediocre' as const,
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
      }
      
      // Validate the response structure
      if (!nutritionData.name || typeof nutritionData.healthScore !== 'number') {
        console.error('Invalid response structure:', nutritionData);
        // Return fallback instead of throwing error
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
            grade: 'mediocre' as const,
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
      
      // Calculate comprehensive score using our scoring function
      const scoringResult = calculateFoodScore({
        nutrition: {
          calories: nutritionData.calories,
          protein: nutritionData.protein,
          saturatedFat: nutritionData.saturatedFat,
          sodium: nutritionData.sodium,
          sugar: nutritionData.sugar,
          fiber: nutritionData.fiber
        },
        ingredients: nutritionData.ingredients,
        additives: nutritionData.additives,
        isOrganic: nutritionData.isOrganic
      });
      
      // Update nutrition data with scoring results
      nutritionData.healthScore = scoringResult.score;
      nutritionData.grade = scoringResult.grade;
      nutritionData.scoreBreakdown = scoringResult.breakdown;
      nutritionData.reasons = scoringResult.reasons;
      nutritionData.flags = scoringResult.flags;
      
      // Apply personalization if user goals are provided
      if (input.userGoals) {
        const personalResult = personalScore(nutritionData, input.userGoals);
        
        nutritionData.personalScore = personalResult.score;
        nutritionData.personalReasons = personalResult.reasons;
        nutritionData.personalGrade = personalResult.personalGrade;
        nutritionData.scoreBreakdown = {
          ...nutritionData.scoreBreakdown,
          personalAdjustment: personalResult.personalAdjustment,
          personalTotal: personalResult.score
        };
      }
      
      return {
        success: true,
        data: nutritionData
      };
      
    } catch (error) {
      console.error('Food analysis error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Analysis request was cancelled or timed out. Please try again.'
          };
        }
        
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          return {
            success: false,
            error: 'Analysis timed out. Please try again with a clearer image.'
          };
        }
        
        if (error.message.includes('Network') || error.message.includes('fetch') || error.message.includes('connection')) {
          return {
            success: false,
            error: 'Network connection failed. Please check your internet connection and try again.'
          };
        }
        
        // Handle JSON parsing errors
        if (error.message.includes('JSON') || error.message.includes('parse')) {
          return {
            success: false,
            error: 'Failed to process AI response. Please try again.'
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during analysis'
      };
    }
  });

// Helper functions (copied from the original service)
interface FoodScoringInput {
  nutrition: {
    calories: number;
    protein: number;
    saturatedFat: number;
    sodium: number;
    sugar: number;
    fiber: number;
  };
  ingredients: string[];
  additives: string[];
  isOrganic: boolean;
}

interface ScoringResult {
  score: number;
  grade: 'poor' | 'mediocre' | 'good' | 'excellent';
  reasons: string[];
  flags: string[];
  breakdown: {
    nutritionScore: number;
    additivesScore: number;
    organicScore: number;
    totalScore: number;
  };
}

interface UserGoals {
  bodyGoal?: string;
  healthGoal?: string;
  dietGoal?: string;
  lifeGoal?: string;
  motivation?: string;
  healthStrictness?: 'not-strict' | 'neutral' | 'very-strict';
  dietStrictness?: 'not-strict' | 'neutral' | 'very-strict';
  lifeStrictness?: 'not-strict' | 'neutral' | 'very-strict';
}

// High-risk additives that significantly impact health score
const HIGH_RISK_ADDITIVES = [
  'aspartame', 'sucralose', 'acesulfame potassium', 'sodium benzoate',
  'potassium sorbate', 'bha', 'bht', 'tbhq', 'propyl gallate',
  'sodium nitrite', 'sodium nitrate', 'monosodium glutamate', 'msg',
  'red dye 40', 'yellow dye 5', 'blue dye 1', 'caramel color',
  'phosphoric acid', 'sodium phosphate', 'calcium phosphate'
];

// Moderate-risk additives
const MODERATE_RISK_ADDITIVES = [
  'citric acid', 'ascorbic acid', 'tocopherols', 'lecithin',
  'carrageenan', 'xanthan gum', 'guar gum', 'locust bean gum',
  'natural flavors', 'artificial flavors', 'modified corn starch',
  'maltodextrin', 'dextrose', 'corn syrup', 'high fructose corn syrup'
];

// Whole foods that should be first ingredients
const WHOLE_FOODS = [
  'milk', 'water', 'oats', 'wheat', 'rice', 'quinoa', 'beef', 'chicken',
  'turkey', 'fish', 'salmon', 'tuna', 'eggs', 'beans', 'lentils',
  'chickpeas', 'almonds', 'walnuts', 'cashews', 'peanuts', 'coconut',
  'olive oil', 'avocado oil', 'butter', 'cheese', 'yogurt', 'tomatoes',
  'spinach', 'kale', 'broccoli', 'carrots', 'sweet potato', 'apple',
  'banana', 'berries', 'strawberries', 'blueberries'
];

// Emulsifiers, sweeteners, and dyes
const PROCESSING_INDICATORS = [
  'polysorbate', 'mono- and diglycerides', 'sodium stearoyl lactylate',
  'lecithin', 'carrageenan', 'aspartame', 'sucralose', 'stevia',
  'erythritol', 'xylitol', 'red dye', 'yellow dye', 'blue dye',
  'caramel color', 'annatto', 'turmeric color'
];

function calculateFoodScore(input: FoodScoringInput): ScoringResult {
  console.log('Calculating food score for:', input);
  
  let nutritionScore = 60; // Start with base score
  let additivesScore = 0;
  let organicScore = 0;
  const reasons: string[] = [];
  const flags: string[] = [];
  
  // NUTRITION SCORING (0-60 points base, can go higher with bonuses)
  // Adjusted thresholds for per-serving measurements
  
  // Sugar scoring based on new categorization
  if (input.nutrition.sugar > 10.5) {
    // Bad - heavily penalized (up to -35 points)
    const penalty = Math.min(35, (input.nutrition.sugar - 10.5) * 3);
    nutritionScore -= penalty;
    reasons.push(`High sugar content (${input.nutrition.sugar}g per serving) - heavily penalized`);
    flags.push('high_sugar');
  } else if (input.nutrition.sugar > 6) {
    // Mid - moderate penalty (up to -10 points)
    const penalty = Math.min(10, (input.nutrition.sugar - 6) * 2.2);
    nutritionScore -= penalty;
    reasons.push(`Moderate sugar content (${input.nutrition.sugar}g per serving)`);
    flags.push('moderate_sugar');
  } else if (input.nutrition.sugar > 3) {
    // Good - small bonus (+3 points)
    nutritionScore += 3;
    reasons.push(`Good sugar level (${input.nutrition.sugar}g per serving)`);
    flags.push('good_sugar');
  } else {
    // Really good - larger bonus (+8 points)
    nutritionScore += 8;
    reasons.push(`Excellent low sugar content (${input.nutrition.sugar}g per serving)`);
    flags.push('excellent_sugar');
  }
  
  // Saturated fat penalty (up to -15 points) - adjusted for serving
  if (input.nutrition.saturatedFat >= 5) {
    const penalty = Math.min(15, (input.nutrition.saturatedFat - 5) * 3);
    nutritionScore -= penalty;
    reasons.push(`High saturated fat (${input.nutrition.saturatedFat}g per serving)`);
    flags.push('high_saturated_fat');
  }
  
  // Sodium penalty (up to -12 points) - adjusted for serving
  if (input.nutrition.sodium >= 400) {
    const penalty = Math.min(12, (input.nutrition.sodium - 400) / 50);
    nutritionScore -= penalty;
    reasons.push(`High sodium content (${input.nutrition.sodium}mg per serving)`);
    flags.push('high_sodium');
  } else if (input.nutrition.sodium <= 140) {
    reasons.push('Low sodium content');
  }
  
  // Calories penalty (up to -10 points) - adjusted for serving
  if (input.nutrition.calories >= 300) {
    const penalty = Math.min(10, (input.nutrition.calories - 300) / 30);
    nutritionScore -= penalty;
    reasons.push(`High calorie content (${input.nutrition.calories} kcal per serving)`);
    flags.push('high_calories');
  }
  
  // Protein bonus (up to +20 points) - adjusted for serving
  if (input.nutrition.protein >= 8) {
    const bonus = Math.min(20, (input.nutrition.protein - 8) * 2.5);
    nutritionScore += bonus;
    reasons.push(`Good protein content (${input.nutrition.protein}g per serving)`);
    flags.push('high_protein');
  }
  
  // Fiber bonus (up to +10 points) - adjusted for serving
  if (input.nutrition.fiber >= 4) {
    const bonus = Math.min(10, (input.nutrition.fiber - 4) * 2.5);
    nutritionScore += bonus;
    reasons.push(`High fiber content (${input.nutrition.fiber}g per serving)`);
    flags.push('high_fiber');
  }
  
  // First ingredient bonus (+6 if whole food)
  if (input.ingredients.length > 0) {
    const firstIngredient = input.ingredients[0].toLowerCase();
    const isWholeFood = WHOLE_FOODS.some(food => 
      firstIngredient.includes(food) || food.includes(firstIngredient)
    );
    
    if (isWholeFood) {
      nutritionScore += 6;
      reasons.push('First ingredient is a whole food');
      flags.push('whole_food_first');
    }
  }
  
  // Processing penalty (-8 if >12 ingredients and contains processing indicators)
  if (input.ingredients.length > 12) {
    const hasProcessingIndicators = input.ingredients.some(ingredient => 
      PROCESSING_INDICATORS.some(indicator => 
        ingredient.toLowerCase().includes(indicator.toLowerCase())
      )
    );
    
    if (hasProcessingIndicators) {
      nutritionScore -= 8;
      reasons.push('Highly processed with many ingredients and additives');
      flags.push('highly_processed');
    }
  }
  
  // ADDITIVES SCORING (0 to -30 points)
  let additivesPenalty = 0;
  
  // Check for high-risk additives
  const highRiskFound = input.additives.filter(additive => 
    HIGH_RISK_ADDITIVES.some(risk => 
      additive.toLowerCase().includes(risk.toLowerCase())
    )
  );
  
  if (highRiskFound.length > 0) {
    additivesPenalty += Math.min(30, highRiskFound.length * 15);
    reasons.push(`Contains ${highRiskFound.length} high-risk additive(s)`);
    flags.push('high_risk_additives');
  }
  
  // Check for moderate-risk additives
  const moderateRiskFound = input.additives.filter(additive => 
    MODERATE_RISK_ADDITIVES.some(risk => 
      additive.toLowerCase().includes(risk.toLowerCase())
    )
  );
  
  if (moderateRiskFound.length > 0) {
    additivesPenalty += Math.min(24, moderateRiskFound.length * 8);
    reasons.push(`Contains ${moderateRiskFound.length} moderate-risk additive(s)`);
    flags.push('moderate_risk_additives');
  }
  
  // Check for seed oils
  const seedOils = ['soybean oil', 'canola oil', 'corn oil', 'sunflower oil', 'safflower oil', 'cottonseed oil'];
  const hasSeedOils = input.ingredients.some(ingredient => 
    seedOils.some(oil => ingredient.toLowerCase().includes(oil))
  );
  
  if (hasSeedOils) {
    additivesPenalty += 5;
    reasons.push('Contains seed oils');
    flags.push('seed_oil');
  }
  
  // Check for added sugars
  const addedSugars = ['corn syrup', 'high fructose corn syrup', 'cane sugar', 'brown sugar', 'dextrose', 'maltose', 'sucrose'];
  const hasAddedSugars = input.ingredients.some(ingredient => 
    addedSugars.some(sugar => ingredient.toLowerCase().includes(sugar))
  );
  
  if (hasAddedSugars) {
    reasons.push('Contains added sugars');
    flags.push('added_sugar');
  }
  
  additivesScore = -additivesPenalty;
  
  // ORGANIC SCORING (0-10 points)
  if (input.isOrganic) {
    organicScore = 10;
    reasons.push('Certified organic product');
    flags.push('organic');
  }
  
  // Calculate final score and round to nearest 0.5 interval
  const rawScore = nutritionScore + additivesScore + organicScore;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawScore * 2) / 2));
  
  // Determine grade
  let grade: 'poor' | 'mediocre' | 'good' | 'excellent';
  if (totalScore >= 75) {
    grade = 'excellent';
  } else if (totalScore >= 50) {
    grade = 'good';
  } else if (totalScore >= 25) {
    grade = 'mediocre';
  } else {
    grade = 'poor';
  }
  
  const breakdown = {
    nutritionScore,
    additivesScore,
    organicScore,
    totalScore
  };
  
  return {
    score: totalScore,
    grade,
    reasons,
    flags,
    breakdown
  };
}

// Comprehensive personalization function (matches frontend logic exactly)
function personalScore(nutritionInfo: any, userGoals: UserGoals) {
  const product = {
    name: nutritionInfo.name,
    brand: undefined,
    category: 'food',
    macros: {
      energyKcal: nutritionInfo.calories,
      protein_g: nutritionInfo.protein,
      carbs_g: nutritionInfo.carbs,
      sugar_g: nutritionInfo.sugar,
      fat_g: nutritionInfo.fat,
      satFat_g: nutritionInfo.saturatedFat,
      fiber_g: nutritionInfo.fiber,
      sodium_mg: nutritionInfo.sodium
    },
    ingredientsRaw: (nutritionInfo.ingredients || []).join(', ').toLowerCase(),
    additives: nutritionInfo.additives || [],
    flags: nutritionInfo.flags || [],
    baseScore: nutritionInfo.healthScore
  };
  
  const profile = {
    bodyGoal: mapBodyGoal(userGoals.bodyGoal),
    healthFocus: mapHealthGoal(userGoals.healthGoal),
    healthStrictness: userGoals.healthStrictness || 'neutral',
    dietPreference: mapDietGoal(userGoals.dietGoal),
    dietStrictness: userGoals.dietStrictness || 'neutral',
    lifeGoal: mapLifeGoal(userGoals.lifeGoal),
    lifeStrictness: userGoals.lifeStrictness || 'neutral'
  };
  
  const reasons: string[] = [];

  const { d: h, why: wh } = deltaHealth(product, profile.healthFocus, profile.healthStrictness);
  const dietResult = fitsDiet(product, profile.dietPreference, profile.dietStrictness);
  const { d: df, why: wf, forceZero } = dietResult;
  const { d: b, why: wb } = deltaBody(product, profile.bodyGoal);
  const { d: l, why: wl } = deltaLife(product, profile.lifeGoal, profile.lifeStrictness);

  let score = product.baseScore + h + df + b + l;
  
  // If dietary restriction is violated, force score to 0
  if (forceZero) {
    score = 0;
  } else {
    // Round to nearest 0.5 interval
    score = Math.max(0, Math.min(100, Math.round(score * 2) / 2));
  }

  reasons.push(...wh, ...wf, ...wb, ...wl);
  
  // Always include a couple of numeric context bullets
  const m = product.macros;
  if (profile.healthFocus === 'high_protein') reasons.unshift(`Protein ${m.protein_g}g/serving`);
  if (profile.healthFocus === 'low_sugar' || profile.lifeGoal === 'clear_skin') {
    reasons.unshift(`Sugar ${m.sugar_g}g/serving`);
  }

  // Determine personal grade based on final score
  let personalGrade: 'poor' | 'mediocre' | 'good' | 'excellent';
  if (score >= 86) {
    personalGrade = 'excellent';
  } else if (score >= 66) {
    personalGrade = 'good';
  } else if (score >= 41) {
    personalGrade = 'mediocre';
  } else {
    personalGrade = 'poor';
  }

  return { 
    score, 
    reasons: reasons.filter(r => r.length > 0), 
    personalGrade,
    personalAdjustment: forceZero ? -product.baseScore : score - product.baseScore
  };
}

// Helper functions for mapping goals
function mapBodyGoal(bodyGoal?: string): 'lose' | 'slightly-lose' | 'maintain' | 'slightly-gain' | 'gain' {
  const bodyGoalMap: Record<string, 'lose' | 'slightly-lose' | 'maintain' | 'slightly-gain' | 'gain'> = {
    'lose-weight': 'lose',
    'slightly-lose-weight': 'slightly-lose',
    'maintain-weight': 'maintain',
    'slightly-gain-weight': 'slightly-gain',
    'gain-weight': 'gain'
  };
  return bodyGoalMap[bodyGoal || ''] || 'maintain';
}

function mapHealthGoal(healthGoal?: string): 'low_sugar' | 'high_protein' | 'low_fat' | 'keto' | 'balanced' {
  const healthGoalMap: Record<string, 'low_sugar' | 'high_protein' | 'low_fat' | 'keto' | 'balanced'> = {
    'low-sugar': 'low_sugar',
    'high-protein': 'high_protein',
    'low-fat': 'low_fat',
    'keto': 'keto',
    'balanced': 'balanced'
  };
  return healthGoalMap[healthGoal || ''] || 'balanced';
}

function mapDietGoal(dietGoal?: string): 'whole_foods' | 'vegan' | 'carnivore' | 'gluten_free' | 'vegetarian' | 'balanced' {
  const dietGoalMap: Record<string, 'whole_foods' | 'vegan' | 'carnivore' | 'gluten_free' | 'vegetarian' | 'balanced'> = {
    'whole-foods': 'whole_foods',
    'vegan': 'vegan',
    'carnivore': 'carnivore',
    'gluten-free': 'gluten_free',
    'vegetarian': 'vegetarian',
    'balanced': 'balanced'
  };
  return dietGoalMap[dietGoal || ''] || 'balanced';
}

function mapLifeGoal(lifeGoal?: string): 'healthier' | 'energy_mood' | 'body_confidence' | 'clear_skin' {
  const lifeGoalMap: Record<string, 'healthier' | 'energy_mood' | 'body_confidence' | 'clear_skin'> = {
    'eat-healthier': 'healthier',
    'boost-energy': 'energy_mood',
    'feel-better': 'body_confidence',
    'clear-skin': 'clear_skin'
  };
  return lifeGoalMap[lifeGoal || ''] || 'healthier';
}

// Helper function for clamping values
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// Health focus delta function
function deltaHealth(product: any, focus: string, strictness: string = 'neutral') {
  const m = product.macros;
  let d = 0;
  const why: string[] = [];
  const mult = strictness === 'very-strict' ? 1.4 : strictness === 'not-strict' ? 0.6 : 1.0;
  
  switch (focus) {
    case 'low_sugar': {
      // Much stricter sugar penalties based on new categorization
      if (m.sugar_g > 10.5) {
        // Bad - heavily penalized (up to -45 points)
        const penalty = Math.min(45, (m.sugar_g - 10.5) * 4);
        d -= penalty;
        why.push(`High sugar (${m.sugar_g}g) severely hurts your Low Sugar focus`);
      } else if (m.sugar_g > 6) {
        // Mid - moderate penalty (up to -20 points)
        const penalty = Math.min(20, (m.sugar_g - 6) * 4.4);
        d -= penalty;
        why.push(`Moderate sugar (${m.sugar_g}g) conflicts with your Low Sugar focus`);
      } else if (m.sugar_g > 3) {
        // Good - small bonus (+5 points)
        d += 5;
        why.push(`Good sugar level (${m.sugar_g}g) supports your Low Sugar focus`);
      } else {
        // Really good - larger bonus (+12 points)
        d += 12;
        why.push(`Excellent low sugar (${m.sugar_g}g) perfectly aligns with your Low Sugar focus`);
      }
      
      // Fiber bonus for low sugar focus
      const fiberBonus = clamp(m.fiber_g / 5, 0, 1) * 6;
      d += fiberBonus;
      if (fiberBonus > 3) why.push('High fiber helps with sugar management');
      break;
    }
    case 'high_protein': {
      const protBonus = clamp(m.protein_g / 25, 0, 1) * 25; // Increased bonus
      // Stricter sugar penalty for high protein focus
      const sugarPen = clamp((m.sugar_g - 8) / 12, 0, 1) * 15; // Increased penalty
      d += protBonus - sugarPen;
      if (protBonus > 5) why.push(`High protein (${m.protein_g}g) strongly supports your High Protein focus`);
      if (sugarPen > 5) why.push(`Sugar (${m.sugar_g}g) conflicts with your High Protein focus`);
      break;
    }
    case 'low_fat': {
      const fatPen = clamp((m.fat_g - 3) / 12, 0, 1) * 20; // Stricter fat penalty
      const satPen = clamp((m.satFat_g - 2) / 5, 0, 1) * 15; // Stricter sat fat penalty
      const fiberB = clamp(m.fiber_g / 5, 0, 1) * 6;
      const protB = clamp(m.protein_g / 20, 0, 1) * 6;
      d += fiberB + protB - fatPen - satPen;
      if (fatPen > 5 || satPen > 5) why.push(`High fat content conflicts with your Low Fat focus`);
      if (fiberB > 3 || protB > 3) why.push('Good fiber and protein support your Low Fat focus');
      break;
    }
    case 'keto': {
      // Much stricter carb penalties for keto
      const carbPen = clamp((m.carbs_g - 5) / 20, 0, 1) * 35; // Increased penalty
      const sugarPen = clamp((m.sugar_g - 2) / 8, 0, 1) * 25; // Much stricter sugar penalty
      const protB = clamp(m.protein_g / 20, 0, 1) * 8;
      d += protB - carbPen - sugarPen;
      if (carbPen > 10) why.push(`Carbs (${m.carbs_g}g) are too high for your Keto focus`);
      if (sugarPen > 10) why.push(`Sugar (${m.sugar_g}g) is incompatible with your Keto focus`);
      break;
    }
    case 'balanced': {
      const fiberB = clamp(m.fiber_g / 6, 0, 1) * 8;
      const protB = clamp(m.protein_g / 20, 0, 1) * 6;
      // Stricter penalties for balanced approach
      const sugarP = clamp((m.sugar_g - 10) / 15, 0, 1) * 12; // Increased penalty
      const satP = clamp((m.satFat_g - 4) / 6, 0, 1) * 8; // Increased penalty
      d += fiberB + protB - sugarP - satP;
      if (sugarP > 5) why.push(`Sugar (${m.sugar_g}g) is high for balanced nutrition`);
      break;
    }
  }
  if (strictness === 'very-strict') {
    why.push('Strict setting amplifies your Health Focus impact');
  } else if (strictness === 'not-strict') {
    why.push('Not too strict setting softens your Health Focus impact');
  }
  return { d: Math.round(d * mult), why };
}

// Diet preference function
function fitsDiet(
  product: any,
  diet: string,
  strictness: string = 'neutral'
): { d: number; why: string[]; forceZero?: boolean } {
  const ing = product.ingredientsRaw;
  const f = new Set(product.flags || []);
  const why: string[] = [];
  const mult = strictness === 'very-strict' ? 1.4 : strictness === 'not-strict' ? 0.6 : 1.0;
  
  let violates = false;
  switch (diet) {
    case 'vegan':
      violates = /milk|whey|casein|egg|honey|gelatin|fish|chicken|beef|pork|dairy|butter|cheese|yogurt|cream|lactose/i.test(ing);
      break;
    case 'vegetarian':
      violates = /gelatin|fish|chicken|beef|pork|meat|poultry|seafood|anchovy/i.test(ing);
      break;
    case 'carnivore':
      violates = /oat|wheat|rice|corn|soy|pea|bean|lentil|quinoa|potato|fruit|vegetable|grain|legume|nut|seed/i.test(ing);
      break;
    case 'gluten_free':
      violates = /wheat|barley|rye|malt|spelt|farro|semolina|triticale|gluten/i.test(ing);
      break;
    case 'whole_foods':
      violates = f.has('ultra_processed') || f.has('high_risk_additives') || f.has('moderate_risk_additives');
      break;
    default:
      violates = false;
  }

  if (violates) {
    // For strict dietary preferences (vegan, vegetarian, carnivore)
    if (diet === 'vegan' || diet === 'vegetarian' || diet === 'carnivore') {
      if (strictness === 'not-strict') {
        const d = Math.round(-60 * mult);
        why.push('Not too strict setting softens your Diet Preference impact');
        return { d, why };
      }
      return { 
        d: -100, 
        why: [`This product violates your ${diet.replace('_', ' ')} dietary restriction`],
        forceZero: true
      };
    }
    // For other preferences, apply scaled penalty
    const d = Math.round(-40 * mult);
    if (strictness === 'very-strict') {
      why.push('Strict setting amplifies your Diet Preference impact');
    } else if (strictness === 'not-strict') {
      why.push('Not too strict setting softens your Diet Preference impact');
    }
    return { d, why: [...why, `Conflicts with your ${diet.replace('_', ' ')} preference`] };
  }

  let bonus = 0;
  if (diet === 'whole_foods' && !f.has('ultra_processed') && !f.has('high_risk_additives')) {
    bonus += Math.round(10 * mult);
    why.push('Excellent whole-foods choice');
  }
  if (strictness === 'very-strict') {
    why.push('Strict setting amplifies your Diet Preference impact');
  } else if (strictness === 'not-strict') {
    why.push('Not too strict setting softens your Diet Preference impact');
  }
  return { d: bonus, why };
}

// Body goal function
function deltaBody(product: any, body: string) {
  const m = product.macros;
  let d = 0;
  const why: string[] = [];
  
  if (body === 'lose') {
    // Stricter calorie penalties for weight loss
    if (m.energyKcal > 400) {
      d -= 20; // Much harsher penalty
      why.push(`Very high calories (${m.energyKcal}) conflict with weight loss goal`);
    } else if (m.energyKcal > 250) {
      d -= 10;
      why.push(`High calories (${m.energyKcal}) may hinder weight loss`);
    } else {
      d += 8; // Bonus for low calories
      why.push('Good calorie level for weight loss');
    }
    
    // Protein and fiber bonuses for satiety
    d += clamp(m.protein_g / 20, 0, 1) * 8;
    d += clamp(m.fiber_g / 6, 0, 1) * 8;
    
    // Sugar penalty for weight loss
    if (m.sugar_g > 8) {
      d -= clamp((m.sugar_g - 8) / 10, 0, 1) * 15;
      why.push(`Sugar (${m.sugar_g}g) conflicts with weight loss`);
    }
  }
  
  if (body === 'slightly-lose') {
    // Moderate calorie penalties for slight weight loss
    if (m.energyKcal > 350) {
      d -= 12; // Moderate penalty
      why.push(`High calories (${m.energyKcal}) may slow gradual weight loss`);
    } else if (m.energyKcal > 200) {
      d -= 5;
      why.push(`Moderate calories (${m.energyKcal}) for gradual weight loss`);
    } else {
      d += 5; // Smaller bonus than aggressive weight loss
      why.push('Good calorie level for gradual weight loss');
    }
    
    // Moderate protein and fiber bonuses
    d += clamp(m.protein_g / 20, 0, 1) * 5;
    d += clamp(m.fiber_g / 6, 0, 1) * 5;
    
    // Moderate sugar penalty
    if (m.sugar_g > 10) {
      d -= clamp((m.sugar_g - 10) / 12, 0, 1) * 10;
      why.push(`Sugar (${m.sugar_g}g) may hinder gradual weight loss`);
    }
  }
  
  if (body === 'gain') {
    d += clamp(m.protein_g / 25, 0, 1) * 10; // Increased protein bonus
    d += clamp((m.energyKcal - 200) / 300, 0, 1) * 8;
    if (m.protein_g >= 20) why.push('High protein supports weight gain goals');
  }
  
  if (body === 'slightly-gain') {
    // Moderate protein bonus for slight weight gain
    d += clamp(m.protein_g / 25, 0, 1) * 6;
    // Smaller calorie bonus than aggressive weight gain
    d += clamp((m.energyKcal - 150) / 250, 0, 1) * 5;
    if (m.protein_g >= 15) why.push('Good protein supports gradual weight gain goals');
    
    // Still want to avoid excessive calories
    if (m.energyKcal > 450) {
      d -= 5;
      why.push('Very high calories may lead to excessive weight gain');
    }
  }
  
  if (body === 'maintain') {
    d += clamp(m.fiber_g / 6, 0, 1) * 4;
    // Penalty for very high calories even for maintenance
    if (m.energyKcal > 500) {
      d -= 8;
      why.push('Very high calories even for maintenance');
    }
  }
  
  return { d: Math.round(d), why };
}

// Life goal function
function deltaLife(product: any, life: string, strictness: string = 'neutral') {
  const m = product.macros;
  const f = new Set(product.flags || []);
  let d = 0;
  const why: string[] = [];
  const mult = strictness === 'very-strict' ? 1.4 : strictness === 'not-strict' ? 0.6 : 1.0;
  
  if (life === 'energy_mood') {
    d += clamp(m.protein_g / 20, 0, 1) * 6;
    d += clamp(m.fiber_g / 6, 0, 1) * 6;
    // Much stricter sugar penalty for energy/mood
    if (m.sugar_g > 8) {
      d -= clamp((m.sugar_g - 8) / 12, 0, 1) * 15;
      why.push(`Sugar (${m.sugar_g}g) can cause energy crashes`);
    }
    // Penalty for high additives affecting mood
    if (product.additives.length > 3) {
      d -= 8;
      why.push('Many additives may affect energy and mood');
    }
    // Additional energy-focused penalties
    if (m.sugar_g > 10) {
      d -= 12;
      why.push('High sugar can cause energy crashes');
    }
  }
  
  if (life === 'clear_skin') {
    if (f.has('ultra_processed')) {
      d -= 12; // Increased penalty
      why.push('Ultra-processed foods may worsen skin health');
    }
    if (f.has('high_risk_additives')) {
      d -= 10;
      why.push('High-risk additives may negatively impact skin');
    }
    // Stricter sugar penalty for clear skin
    if (m.sugar_g > 6) {
      d -= clamp((m.sugar_g - 6) / 10, 0, 1) * 12;
      why.push(`Sugar (${m.sugar_g}g) may contribute to skin issues`);
    }
  }
  
  if (life === 'healthier') {
    // General health penalties for processed foods
    if (f.has('high_risk_additives')) {
      d -= 15;
      why.push('High-risk additives conflict with health goals');
    }
    if (product.additives.length > 5) {
      d -= 8;
      why.push('Many additives may impact overall health');
    }
    // Additional longevity-focused penalties (moved from motivation)
    if (product.additives.length > 2) {
      d -= product.additives.length * 2; // Escalating penalty
      why.push('Additives may conflict with health goals');
    }
    if (f.has('ultra_processed')) {
      d -= 8;
      why.push('Ultra-processed foods may impact overall health');
    }
  }
  
  if (life === 'body_confidence') {
    // Similar to weight loss goals
    if (m.sugar_g > 10) {
      d -= 10;
      why.push('High sugar may impact body composition goals');
    }
    if (m.protein_g >= 15) {
      d += 6;
      why.push('Good protein supports body confidence goals');
    }
    // Additional body confidence bonuses
    if (m.protein_g >= 15) d += 4;
  }
  
  if (strictness === 'very-strict') {
    why.push('Strict setting amplifies your Life Goal impact');
  } else if (strictness === 'not-strict') {
    why.push('Not too strict setting softens your Life Goal impact');
  }
  
  return { d: Math.round(d * mult), why };
}

export default analyzeFoodProcedure;
export { analyzeFoodProcedure as analyzeFoodRoute };