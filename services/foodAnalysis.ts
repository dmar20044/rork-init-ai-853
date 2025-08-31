import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserGoals } from '@/contexts/UserContext';

export interface NutritionInfo {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  saturatedFat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  servingSize?: string;
  servingsPerContainer?: number;
  healthScore: number;
  personalScore?: number;
  personalReasons?: string[];
  ingredients?: string[];
  allergens?: string[];
  recommendations?: string[];
  warnings?: string[];
  additives?: string[];
  isOrganic?: boolean;
  grade?: 'poor' | 'mediocre' | 'good' | 'excellent';
  personalGrade?: 'poor' | 'mediocre' | 'good' | 'excellent';
  scoreBreakdown?: ScoreBreakdown;
  reasons?: string[];
  flags?: string[];
  imageUrl?: string;
}

export interface ScoreBreakdown {
  nutritionScore: number;
  additivesScore: number;
  organicScore: number;
  totalScore: number;
  personalAdjustment?: number;
  personalTotal?: number;
}

export interface ScoringResult {
  score: number;
  grade: 'poor' | 'mediocre' | 'good' | 'excellent';
  reasons: string[];
  flags: string[];
  breakdown: ScoreBreakdown;
}

export interface FoodAnalysisResult {
  success: boolean;
  data?: NutritionInfo;
  error?: string;
}

// Note: Using Anthropic's Claude API for food analysis

// API Status Checker
export async function checkAPIStatus(): Promise<{ aiAPI: boolean; openFoodFacts: boolean }> {
  const results = { aiAPI: false, openFoodFacts: false };
  
  // Test Anthropic API
  try {
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'test' }]
      })
    });
    results.aiAPI = aiResponse.ok;
    console.log('Anthropic API Status:', results.aiAPI ? 'Working' : 'Failed');
  } catch (error) {
    console.log('Anthropic API Status: Failed -', error);
  }
  
  // Test OpenFoodFacts API
  try {
    const offResponse = await fetch('https://world.openfoodfacts.org/api/v0/product/3017620422003.json');
    const offData = await offResponse.json();
    results.openFoodFacts = offResponse.ok && offData.status === 1;
    console.log('OpenFoodFacts API Status:', results.openFoodFacts ? 'Working' : 'Failed');
  } catch (error) {
    console.log('OpenFoodFacts API Status: Failed -', error);
  }
  
  return results;
}

// Cache for storing analysis results to ensure consistency
const analysisCache = new Map<string, NutritionInfo>();
const CACHE_STORAGE_KEY = 'food_analysis_cache';

// Load cache from AsyncStorage on app start
let cacheLoaded = false;
async function loadCacheFromStorage() {
  if (cacheLoaded) return;
  
  try {
    const storedCache = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
    if (storedCache) {
      const cacheData = JSON.parse(storedCache);
      Object.entries(cacheData).forEach(([key, value]) => {
        analysisCache.set(key, value as NutritionInfo);
      });
      console.log(`Loaded ${analysisCache.size} cached analysis results`);
    }
  } catch (error) {
    console.error('Error loading analysis cache:', error);
  }
  cacheLoaded = true;
}

// Save cache to AsyncStorage
async function saveCacheToStorage() {
  try {
    const cacheData = Object.fromEntries(analysisCache.entries());
    await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving analysis cache:', error);
  }
}

// Clear the analysis cache (useful for debugging or if cache gets corrupted)
export async function clearAnalysisCache() {
  analysisCache.clear();
  try {
    await AsyncStorage.removeItem(CACHE_STORAGE_KEY);
    console.log('Analysis cache cleared');
  } catch (error) {
    console.error('Error clearing analysis cache:', error);
  }
}

// Generate a more robust hash from image data for caching
async function generateImageHash(base64Image: string): Promise<string> {
  // Use a more comprehensive hash that includes image size and multiple segments
  // to reduce hash collisions between different images
  const imageLength = base64Image.length;
  const segments = [
    base64Image.substring(0, 500),
    base64Image.substring(Math.floor(imageLength * 0.25), Math.floor(imageLength * 0.25) + 500),
    base64Image.substring(Math.floor(imageLength * 0.5), Math.floor(imageLength * 0.5) + 500),
    base64Image.substring(Math.floor(imageLength * 0.75), Math.floor(imageLength * 0.75) + 500),
    base64Image.substring(Math.max(0, imageLength - 500))
  ];
  
  const hashInput = segments.join('') + imageLength.toString();
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export async function analyzeFoodImage(imageUri: string): Promise<FoodAnalysisResult> {
  try {
    console.log('Starting food analysis for image:', imageUri);
    
    // Load cache from storage if not already loaded
    await loadCacheFromStorage();
    
    // Convert image to base64
    const base64Image = await convertImageToBase64(imageUri);
    
    // Generate hash for caching
    const imageHash = await generateImageHash(base64Image);
    console.log('Generated image hash for caching:', imageHash, 'for image size:', base64Image.length);
    
    // Check if we have a cached result for this image
    if (analysisCache.has(imageHash)) {
      console.log('Found cached analysis result for this image');
      const cachedData = analysisCache.get(imageHash)!;
      console.log('Returning cached data for:', cachedData.name);
      return {
        success: true,
        data: cachedData
      };
    }
    
    console.log('No cached result found, proceeding with AI analysis');
    
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

    console.log('Making request to AI API...');
    
    let response;
    try {
      // Add timeout and retry logic with longer timeout for image analysis
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout after 45 seconds');
        controller.abort();
      }, 45000); // 45 second timeout for image analysis
      
      console.log('Making request to Anthropic API for food analysis...');
      
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
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
                    data: base64Image
                  }
                }
              ]
            }
          ]
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('Anthropic API response received - status:', response.status);
      console.log('Anthropic API response ok:', response.ok);
      
    } catch (fetchError) {
      console.error('Network fetch error:', fetchError);
      
      // Check for specific error types
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          console.log('Request was aborted due to timeout');
          throw new Error('Request timed out - please check your internet connection and try again');
        }
        if (fetchError.message.includes('Network request failed') || fetchError.message.includes('fetch')) {
          console.log('Network connection failed');
          throw new Error('Network connection failed - please check your internet connection');
        }
        console.log('Other network error:', fetchError.message);
        throw new Error(`Network request failed: ${fetchError.message}`);
      }
      
      console.log('Unknown network error type:', typeof fetchError);
      throw new Error('Unknown network error occurred');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error('API error response:', errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Anthropic Analysis result:', result);
    
    // Parse the Anthropic response
    try {
      const completion = result.content?.[0]?.text || '';
      console.log('Raw Anthropic response:', completion);
      
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
      
      console.log('Cleaned response for parsing:', cleanedResponse);
      
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
      
      // Cache the result for future scans of the same product
      analysisCache.set(imageHash, nutritionData);
      console.log('Cached analysis result for future use');
      
      // Save cache to persistent storage
      await saveCacheToStorage();
      
      return {
        success: true,
        data: nutritionData
      };
    } catch (parseError) {
      console.error('Error parsing Anthropic response:', parseError);
      console.error('Failed to parse response:', result.content?.[0]?.text || 'No content');
      
      // Try to provide a fallback response if parsing fails
      return {
        success: true,
        data: {
          name: 'Food Item (Analysis Incomplete)',
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          saturatedFat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
          servingSize: '1 serving',
          healthScore: 50,
          ingredients: [],
          allergens: [],
          additives: [],
          isOrganic: false,
          grade: 'mediocre' as const,
          recommendations: ['Unable to analyze nutritional content', 'Please try scanning again with better lighting'],
          warnings: ['Analysis failed - nutritional data unavailable'],
          reasons: ['Analysis incomplete'],
          flags: ['analysis_failed']
        }
      };
    }
    
  } catch (error) {
    console.error('Food analysis error:', error);
    
    // Provide a fallback mock analysis if network fails
    if (error instanceof Error && error.message.includes('Network request failed')) {
      console.log('Network failed, providing fallback analysis');
      
      const fallbackData: NutritionInfo = {
        name: 'Food Item (Network Error)',
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
        ingredients: ['Unable to analyze - network error'],
        allergens: [],
        additives: [],
        isOrganic: false,
        grade: 'mediocre' as const,
        recommendations: [
          'Network connection failed during analysis',
          'Please check your internet connection and try again',
          'This is a placeholder analysis'
        ],
        warnings: ['Analysis unavailable due to network error'],
        reasons: ['Network connectivity issue'],
        flags: ['network_error'],
        scoreBreakdown: {
          nutritionScore: 40,
          additivesScore: 0,
          organicScore: 0,
          totalScore: 45
        }
      };
      
      return {
        success: true,
        data: fallbackData
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function convertImageToBase64(imageUri: string): Promise<string> {
  try {
    // For web, we can use fetch to get the image as blob then convert to base64
    if (imageUri.startsWith('http') || imageUri.startsWith('data:')) {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove the data:image/...;base64, prefix
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    
    // For mobile, we need to read the file
    const { Platform } = require('react-native');
    
    if (Platform.OS !== 'web') {
      const FileSystem = require('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    }
    
    throw new Error('Unsupported platform for image conversion');
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
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

export interface FoodScoringInput {
  nutrition: {
    calories: number;    // per serving
    protein: number;     // grams per serving
    saturatedFat: number; // grams per serving
    sodium: number;      // mg per serving
    sugar: number;       // grams per serving
    fiber: number;       // grams per serving
  };
  ingredients: string[];
  additives: string[];
  isOrganic: boolean;
}

export function calculateFoodScore(input: FoodScoringInput): ScoringResult {
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
  
  const breakdown: ScoreBreakdown = {
    nutritionScore,
    additivesScore,
    organicScore,
    totalScore
  };
  
  console.log('Food scoring result:', {
    score: totalScore,
    grade,
    breakdown,
    reasons,
    flags
  });
  
  return {
    score: totalScore,
    grade,
    reasons,
    flags,
    breakdown
  };
}

// Example usage and test function
export function testFoodScoring() {
  console.log('=== Food Scoring System Test ===');
  
  // Test 1: Excellent organic whole food (per serving)
  const organicApple = {
    nutrition: {
      calories: 95,
      protein: 0.5,
      saturatedFat: 0.1,
      sodium: 2,
      sugar: 19,
      fiber: 4.4
    },
    ingredients: ['organic apples'],
    additives: [],
    isOrganic: true
  };
  
  console.log('\n1. Organic Apple:', calculateFoodScore(organicApple));
  
  // Test 2: Highly processed snack food (per serving)
  const processedSnack = {
    nutrition: {
      calories: 160,
      protein: 2,
      saturatedFat: 3,
      sodium: 230,
      sugar: 8,
      fiber: 0.5
    },
    ingredients: [
      'enriched flour', 'high fructose corn syrup', 'soybean oil', 'salt',
      'artificial flavors', 'preservatives', 'red dye 40', 'yellow dye 5',
      'bht', 'tbhq', 'sodium benzoate', 'monosodium glutamate', 'corn syrup'
    ],
    additives: ['bht', 'tbhq', 'sodium benzoate', 'msg', 'red dye 40', 'yellow dye 5'],
    isOrganic: false
  };
  
  console.log('\n2. Processed Snack:', calculateFoodScore(processedSnack));
  
  // Test 3: Good protein source (per serving - 4oz)
  const chickenBreast = {
    nutrition: {
      calories: 185,
      protein: 35,
      saturatedFat: 1.1,
      sodium: 84,
      sugar: 0,
      fiber: 0
    },
    ingredients: ['chicken breast'],
    additives: [],
    isOrganic: false
  };
  
  console.log('\n3. Chicken Breast:', calculateFoodScore(chickenBreast));
  
  // Test 4: Moderately processed but decent food (per slice)
  const wholeGrainBread = {
    nutrition: {
      calories: 80,
      protein: 4,
      saturatedFat: 0.4,
      sodium: 160,
      sugar: 1.3,
      fiber: 2.3
    },
    ingredients: ['whole wheat flour', 'water', 'yeast', 'salt', 'honey'],
    additives: [],
    isOrganic: false
  };
  
  console.log('\n4. Whole Grain Bread:', calculateFoodScore(wholeGrainBread));
  
  console.log('\n=== Test Complete ===');
}

// PERSONALIZATION SYSTEM
// Based on user goals, adjust the base score to create a personalized score

interface Product {
  name: string;
  brand?: string;
  category: string;
  macros: {
    energyKcal: number;
    protein_g: number;
    carbs_g: number;
    sugar_g: number;
    fat_g: number;
    satFat_g: number;
    fiber_g: number;
    sodium_mg: number;
  };
  ingredientsRaw: string;
  additives: string[];
  flags: string[];
  baseScore: number;
}

interface Profile {
  bodyGoal: 'lose' | 'gain' | 'maintain';
  healthFocus: 'low_sugar' | 'high_protein' | 'low_fat' | 'keto' | 'balanced';
  dietPreference: 'whole_foods' | 'vegan' | 'carnivore' | 'gluten_free' | 'vegetarian' | 'balanced';
  lifeGoal: 'healthier' | 'energy_mood' | 'body_confidence' | 'clear_skin';
  motivation: 'looking_better' | 'feeling_better' | 'more_energy' | 'longevity';
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function deltaHealth(product: Product, focus: Profile['healthFocus']) {
  const m = product.macros;
  let d = 0;
  const why: string[] = [];
  
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
  return { d: Math.round(d), why };
}

function fitsDiet(product: Product, diet: Profile['dietPreference']): { d: number; why: string[]; forceZero?: boolean } {
  const ing = product.ingredientsRaw;
  const f = new Set(product.flags || []);
  const why: string[] = [];
  
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
    // For strict dietary preferences (vegan, vegetarian, carnivore), force score to 0
    if (diet === 'vegan' || diet === 'vegetarian' || diet === 'carnivore') {
      return { 
        d: -100, 
        why: [`This product violates your ${diet.replace('_', ' ')} dietary restriction`],
        forceZero: true
      };
    }
    // For other preferences, apply harsh penalty
    return { d: -40, why: [`Strongly conflicts with your ${diet.replace('_', ' ')} preference`] };
  }

  let bonus = 0;
  if (diet === 'whole_foods' && !f.has('ultra_processed') && !f.has('high_risk_additives')) {
    bonus += 10;
    why.push('Excellent whole-foods choice');
  }
  return { d: bonus, why };
}

function deltaBody(product: Product, body: Profile['bodyGoal']) {
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
  
  if (body === 'gain') {
    d += clamp(m.protein_g / 25, 0, 1) * 10; // Increased protein bonus
    d += clamp((m.energyKcal - 200) / 300, 0, 1) * 8;
    if (m.protein_g >= 20) why.push('High protein supports weight gain goals');
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

function deltaLifeAndMotivation(product: Product, life: Profile['lifeGoal'], motivation: Profile['motivation']) {
  const m = product.macros;
  const f = new Set(product.flags || []);
  let d = 0;
  const why: string[] = [];
  
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
  }
  
  // Motivation-based adjustments (more aggressive)
  if (motivation === 'longevity') {
    if (product.additives.length > 2) {
      d -= product.additives.length * 2; // Escalating penalty
      why.push('Additives may conflict with longevity goals');
    }
    if (f.has('high_risk_additives')) {
      d -= 12;
      why.push('High-risk additives strongly conflict with longevity');
    }
  }
  
  if (motivation === 'looking_better' && m.protein_g >= 15) d += 4;
  if (motivation === 'feeling_better' && f.has('ultra_processed')) {
    d -= 8;
    why.push('Ultra-processed foods may impact how you feel');
  }
  if (motivation === 'more_energy' && m.sugar_g > 10) {
    d -= 12;
    why.push('High sugar can cause energy crashes');
  }
  
  return { d: Math.round(d), why };
}

// Convert UserGoals to Profile format
function convertUserGoalsToProfile(goals: UserGoals): Profile {
  const bodyGoalMap: Record<string, Profile['bodyGoal']> = {
    'lose-weight': 'lose',
    'gain-weight': 'gain',
    'maintain-weight': 'maintain'
  };
  
  const healthGoalMap: Record<string, Profile['healthFocus']> = {
    'low-sugar': 'low_sugar',
    'high-protein': 'high_protein',
    'low-fat': 'low_fat',
    'keto': 'keto',
    'balanced': 'balanced'
  };
  
  const dietGoalMap: Record<string, Profile['dietPreference']> = {
    'whole-foods': 'whole_foods',
    'vegan': 'vegan',
    'carnivore': 'carnivore',
    'gluten-free': 'gluten_free',
    'vegetarian': 'vegetarian',
    'balanced': 'balanced'
  };
  
  const lifeGoalMap: Record<string, Profile['lifeGoal']> = {
    'eat-healthier': 'healthier',
    'boost-energy': 'energy_mood',
    'feel-better': 'body_confidence',
    'clear-skin': 'clear_skin'
  };
  
  const motivationMap: Record<string, Profile['motivation']> = {
    'looking-better': 'looking_better',
    'feeling-better': 'feeling_better',
    'more-energy': 'more_energy',
    'longevity': 'longevity'
  };
  
  return {
    bodyGoal: bodyGoalMap[goals.bodyGoal || ''] || 'maintain',
    healthFocus: healthGoalMap[goals.healthGoal || ''] || 'balanced',
    dietPreference: dietGoalMap[goals.dietGoal || ''] || 'balanced',
    lifeGoal: lifeGoalMap[goals.lifeGoal || ''] || 'healthier',
    motivation: motivationMap[goals.motivation || ''] || 'feeling_better'
  };
}

// Convert NutritionInfo to Product format
function convertNutritionInfoToProduct(nutrition: NutritionInfo): Product {
  return {
    name: nutrition.name,
    brand: undefined,
    category: 'food',
    macros: {
      energyKcal: nutrition.calories,
      protein_g: nutrition.protein,
      carbs_g: nutrition.carbs,
      sugar_g: nutrition.sugar,
      fat_g: nutrition.fat,
      satFat_g: nutrition.saturatedFat,
      fiber_g: nutrition.fiber,
      sodium_mg: nutrition.sodium
    },
    ingredientsRaw: (nutrition.ingredients || []).join(', ').toLowerCase(),
    additives: nutrition.additives || [],
    flags: nutrition.flags || [],
    baseScore: nutrition.healthScore
  };
}

export function personalScore(nutritionInfo: NutritionInfo, userGoals: UserGoals) {
  const product = convertNutritionInfoToProduct(nutritionInfo);
  const profile = convertUserGoalsToProfile(userGoals);
  
  const reasons: string[] = [];

  const { d: h, why: wh } = deltaHealth(product, profile.healthFocus);
  const dietResult = fitsDiet(product, profile.dietPreference);
  const { d: df, why: wf, forceZero } = dietResult;
  const { d: b, why: wb } = deltaBody(product, profile.bodyGoal);
  const { d: lm, why: wl } = deltaLifeAndMotivation(product, profile.lifeGoal, profile.motivation);

  let score = product.baseScore + h + df + b + lm;
  
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

// Enhanced analyze function that includes personalization
export async function analyzeFoodImageWithPersonalization(
  imageUri: string, 
  userGoals?: UserGoals
): Promise<FoodAnalysisResult> {
  const baseResult = await analyzeFoodImage(imageUri);
  
  if (!baseResult.success || !baseResult.data || !userGoals) {
    return baseResult;
  }
  
  // Apply personalization
  const personalResult = personalScore(baseResult.data, userGoals);
  
  // Update the nutrition info with personal scores
  const enhancedData: NutritionInfo = {
    ...baseResult.data,
    personalScore: personalResult.score,
    personalReasons: personalResult.reasons,
    personalGrade: personalResult.personalGrade,
    scoreBreakdown: {
      ...baseResult.data.scoreBreakdown!,
      personalAdjustment: personalResult.personalAdjustment,
      personalTotal: personalResult.score
    }
  };
  
  return {
    success: true,
    data: enhancedData
  };
}