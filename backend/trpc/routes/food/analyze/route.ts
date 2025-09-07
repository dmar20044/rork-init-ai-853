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
      
      const systemPrompt = `You are a nutrition expert AI that analyzes food images with high accuracy. Your goal is to provide precise nutritional information by:

1. FIRST: Identify if this is a packaged food with a nutrition label visible
2. If nutrition label is visible: Read the exact values from the label
3. If no label: Use your knowledge of the specific food item
4. Always specify realistic serving sizes based on the actual food shown
5. CRITICAL: Provide a COMPLETE and ACCURATE ingredient list - this is essential for user health
6. LANGUAGE: Always respond in English, regardless of the language on the product packaging

IMPORTANT GUIDELINES:
- For packaged foods: Read nutrition facts panel exactly as printed
- For fresh foods: Use USDA standard serving sizes (1 medium apple = 182g, 1 cup rice = 195g, etc.)
- For restaurant/prepared foods: Estimate based on portion size visible
- Be conservative with health claims - only mark as organic if clearly labeled
- Include ALL visible ingredients from ingredient lists - READ EVERY SINGLE INGREDIENT
- If ingredient list is partially visible, include what you can see and note "partial list"
- For fresh foods, list the main components (e.g., apple = ["apples"])
- Distinguish between natural sugars (fruit) vs added sugars (processed foods)
- Identify ALL additives, preservatives, artificial colors, flavors, emulsifiers, stabilizers
- TRANSLATE: If ingredients are in another language, translate them to English

INGREDIENT ANALYSIS REQUIREMENTS:
- Read ingredient lists character by character if visible
- Include every single ingredient, even trace amounts
- Separate ingredients properly (comma-separated typically)
- Note if ingredients contain sub-ingredients (e.g., "enriched flour (wheat flour, niacin, iron)")
- Identify all forms of sugar, oils, preservatives, and additives
- For processed foods, expect 5-20+ ingredients typically

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
- warnings: string[] (specific health concerns for this food)

Example response format:
{
  "name": "Apple",
  "calories": 95,
  "protein": 0.5,
  "carbs": 25,
  "fat": 0.3,
  "saturatedFat": 0.1,
  "fiber": 4.4,
  "sugar": 19,
  "sodium": 2,
  "servingSize": "1 medium apple (182g)",
  "healthScore": 85,
  "ingredients": [],
  "allergens": [],
  "additives": [],
  "isOrganic": false,
  "recommendations": ["Great source of fiber", "Natural antioxidants"],
  "warnings": []
}

If you cannot identify the food clearly, respond with:
{
  "name": "Unknown Food Item",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "saturatedFat": 0,
  "fiber": 0,
  "sugar": 0,
  "sodium": 0,
  "servingSize": "1 serving",
  "healthScore": 0,
  "ingredients": [],
  "allergens": [],
  "additives": [],
  "isOrganic": false,
  "recommendations": [],
  "warnings": ["Could not identify food item from image"]
}`;

      const userMessage = 'Please analyze this food image and provide detailed nutritional information in English. CRITICAL: Pay special attention to the ingredient list - read every single ingredient visible on the package. If you can see an ingredient list, include ALL ingredients but translate them to English if they are in another language. This is essential for accurate health analysis. Always respond in English regardless of the product packaging language.';

      console.log('Making request to Rork AI API...');
      
      // Create an AbortController for timeout handling
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout, aborting...');
        abortController.abort();
      }, 60000); // 60 second timeout
      
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
            throw new Error('Analysis request timed out. Please try again.');
          }
          console.error('Fetch error:', fetchError.message);
          throw new Error(`Network error: ${fetchError.message}`);
        }
        throw fetchError;
      }
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('Rork AI API error:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
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
          throw new Error(`No valid JSON found in AI response. Response preview: ${completion.substring(0, 500)}`);
        }
      }
      
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
        
        if (error.message.includes('Network error') || error.message.includes('fetch')) {
          return {
            success: false,
            error: 'Network connection failed. Please check your internet connection and try again.'
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

// Comprehensive personalization function (matches barcode scanner logic)
function personalScore(nutritionInfo: any, userGoals: UserGoals) {
  let personalScore = nutritionInfo.healthScore;
  const reasons: string[] = [];
  
  // Diet-based adjustments
  if (userGoals.dietGoal === 'whole-foods') {
    // Penalize processed foods more heavily
    if (nutritionInfo.ingredients && nutritionInfo.ingredients.length > 8) {
      personalScore -= 20;
      reasons.push('Many ingredients conflict with whole foods diet');
    }
    if (nutritionInfo.additives && nutritionInfo.additives.length > 0) {
      personalScore -= 15;
      reasons.push('Additives conflict with whole foods diet');
    }
  }
  
  if (userGoals.dietGoal === 'vegan') {
    // Check for animal products in ingredients
    const animalIngredients = ['milk', 'egg', 'meat', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'cheese', 'butter', 'yogurt', 'whey', 'casein', 'gelatin', 'honey'];
    const hasAnimalProducts = nutritionInfo.ingredients?.some((ingredient: string) => 
      animalIngredients.some(animal => ingredient.toLowerCase().includes(animal))
    );
    if (hasAnimalProducts) {
      personalScore -= 40;
      reasons.push('Contains animal products - conflicts with vegan diet');
    }
  }
  
  if (userGoals.dietGoal === 'vegetarian') {
    // Check for meat products
    const meatIngredients = ['meat', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'turkey', 'lamb'];
    const hasMeat = nutritionInfo.ingredients?.some((ingredient: string) => 
      meatIngredients.some(meat => ingredient.toLowerCase().includes(meat))
    );
    if (hasMeat) {
      personalScore -= 35;
      reasons.push('Contains meat - conflicts with vegetarian diet');
    }
  }
  
  if (userGoals.dietGoal === 'gluten-free') {
    // Check for gluten-containing ingredients
    const glutenIngredients = ['wheat', 'barley', 'rye', 'flour', 'gluten'];
    const hasGluten = nutritionInfo.ingredients?.some((ingredient: string) => 
      glutenIngredients.some(gluten => ingredient.toLowerCase().includes(gluten))
    );
    if (hasGluten) {
      personalScore -= 30;
      reasons.push('Contains gluten - conflicts with gluten-free diet');
    }
  }
  
  // Health goal adjustments
  if (userGoals.healthGoal === 'keto') {
    if (nutritionInfo.carbs > 5) personalScore -= 25;
    if (nutritionInfo.fat > 10) personalScore += 15;
    reasons.push('Adjusted for keto diet goals');
  }
  
  if (userGoals.healthGoal === 'low-sugar') {
    if (nutritionInfo.sugar > 5) personalScore -= 20;
    if (nutritionInfo.sugar > 15) personalScore -= 30;
    reasons.push('Adjusted for low-sugar goal');
  }
  
  if (userGoals.healthGoal === 'low-fat') {
    if (nutritionInfo.fat > 5) personalScore -= 15;
    if (nutritionInfo.fat > 10) personalScore -= 25;
    reasons.push('Adjusted for low-fat goal');
  }
  
  if (userGoals.healthGoal === 'high-protein') {
    if (nutritionInfo.protein > 15) personalScore += 20;
    if (nutritionInfo.protein < 5) personalScore -= 15;
    reasons.push('Adjusted for high-protein goal');
  }
  
  // Body goal adjustments
  if (userGoals.bodyGoal === 'lose-weight') {
    if (nutritionInfo.calories > 150) personalScore -= 15;
    if (nutritionInfo.calories > 250) personalScore -= 25;
    reasons.push('Adjusted for weight loss goal');
  }
  
  if (userGoals.bodyGoal === 'gain-muscle') {
    if (nutritionInfo.protein > 10) personalScore += 15;
    if (nutritionInfo.protein < 5) personalScore -= 20;
    reasons.push('Adjusted for muscle gain goal');
  }
  
  const finalScore = Math.max(0, Math.min(100, personalScore));
  const personalAdjustment = finalScore - nutritionInfo.healthScore;
  
  let personalGrade: 'poor' | 'mediocre' | 'good' | 'excellent';
  if (finalScore >= 75) {
    personalGrade = 'excellent';
  } else if (finalScore >= 50) {
    personalGrade = 'good';
  } else if (finalScore >= 25) {
    personalGrade = 'mediocre';
  } else {
    personalGrade = 'poor';
  }
  
  return {
    score: finalScore,
    reasons,
    personalGrade,
    personalAdjustment
  };
}

export default analyzeFoodProcedure;
export { analyzeFoodProcedure as analyzeFoodRoute };