import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserGoals } from '@/contexts/UserContext';
import { trpcClient } from '@/lib/trpc';

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

// API Status Checker - now checks backend connectivity
export async function checkAPIStatus(): Promise<{ aiAPI: boolean; openFoodFacts: boolean }> {
  const results = { aiAPI: false, openFoodFacts: false };
  
  // Test backend connectivity
  try {
    const testResult = await trpcClient.example.hi.mutate({ name: 'test' });
    results.aiAPI = !!testResult;
    console.log('Backend API Status:', results.aiAPI ? 'Working' : 'Failed');
  } catch (error) {
    console.log('Backend API Status: Failed -', error);
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
    
    // Convert and compress image to base64
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
    
    console.log('No cached result found, proceeding with backend AI analysis');
    
    // Use backend tRPC for AI analysis (secure)
    try {
      console.log('Making tRPC request to backend...');
      
      const result = await trpcClient.food.analyze.mutate({
        base64Image,
      });
      
      console.log('tRPC response received:', result);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Analysis failed'
        };
      }
      
      const nutritionData = result.data;
      
      if (!nutritionData) {
        return {
          success: false,
          error: 'No data returned from analysis'
        };
      }
      
      // Cache the result for future scans of the same product
      analysisCache.set(imageHash, nutritionData);
      console.log('Cached analysis result for future use');
      
      // Save cache to persistent storage
      await saveCacheToStorage();
      
      return {
        success: true,
        data: nutritionData
      };
    } catch (trpcError) {
      console.error('tRPC request failed:', trpcError);
      
      // Handle AbortError specifically
      if (trpcError instanceof Error && trpcError.name === 'AbortError') {
        console.error('Request was aborted:', trpcError.message);
        return {
          success: false,
          error: 'Analysis request was cancelled or timed out. Please try again.'
        };
      }
      
      // Handle timeout errors
      if (trpcError instanceof Error && (trpcError.message.includes('timeout') || trpcError.message.includes('timed out'))) {
        console.error('Request timed out:', trpcError.message);
        return {
          success: false,
          error: 'Analysis timed out. Please try again with a clearer image.'
        };
      }
      
      // Handle connection errors
      if (trpcError instanceof Error && (trpcError.message.includes('Network') || trpcError.message.includes('fetch') || trpcError.message.includes('connection'))) {
        console.error('Network/connection error:', trpcError.message);
        return {
          success: false,
          error: 'Network connection failed. Please check your internet connection and try again.'
        };
      }
      
      // Check if it's a JSON parsing error
      if (trpcError instanceof Error && trpcError.message.includes('JSON Parse error')) {
        console.error('Backend returned non-JSON response, likely HTML error page');
        return {
          success: false,
          error: 'Failed to process server response. Please try again.'
        };
      }
      
      // Handle tRPC-specific errors
      if (trpcError instanceof Error && trpcError.message.includes('INTERNAL_SERVER_ERROR')) {
        console.error('Internal server error:', trpcError.message);
        return {
          success: false,
          error: 'Server error occurred during analysis. Please try again.'
        };
      }
      
      // For any other tRPC error, return a generic message
      console.error('Unhandled tRPC error:', trpcError);
      return {
        success: false,
        error: 'Analysis service is temporarily unavailable. Please try again.'
      };
    }
    
  } catch (error) {
    console.error('Food analysis error:', error);
    
    // Handle AbortError specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Analysis was aborted:', error.message);
      return {
        success: false,
        error: 'Analysis was cancelled or timed out. Please try again.'
      };
    }
    
    // Handle timeout errors
    if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('timed out'))) {
      console.error('Analysis timed out:', error.message);
      return {
        success: false,
        error: 'Analysis timed out. Please try again with a clearer image.'
      };
    }
    
    // Handle connection/network errors
    if (error instanceof Error && (error.message.includes('Network') || error.message.includes('fetch') || error.message.includes('connection'))) {
      console.error('Network/connection error:', error.message);
      return {
        success: false,
        error: 'Network connection failed. Please check your internet connection and try again.'
      };
    }
    
    // Provide a fallback mock analysis if backend fails
    if (error instanceof Error && (error.message.includes('Network request failed') || error.message.includes('fetch') || error.message.includes('Network connection failed'))) {
      console.log('Backend failed, providing fallback analysis');
      
      const fallbackData: NutritionInfo = {
        name: 'Food Item (Backend Error)',
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
        ingredients: ['Unable to analyze - backend error'],
        allergens: [],
        additives: [],
        isOrganic: false,
        grade: 'mediocre' as const,
        recommendations: [
          'Backend connection failed during analysis',
          'Please check your internet connection and try again',
          'This is a placeholder analysis'
        ],
        warnings: ['Analysis unavailable due to backend error'],
        reasons: ['Backend connectivity issue'],
        flags: ['backend_error'],
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
      error: error instanceof Error ? error.message : 'Unknown error occurred during analysis'
    };
  }
}

// Helper function to compress image on client side
async function compressImage(imageUri: string, maxWidth: number = 800, quality: number = 0.8): Promise<string> {
  const { Platform } = require('react-native');
  
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Remove data:image/jpeg;base64, prefix
        const base64Data = compressedDataUrl.split(',')[1];
        console.log(`Image compressed: ${img.width}x${img.height} -> ${width}x${height}`);
        resolve(base64Data);
      };
      
      img.onerror = reject;
      img.src = imageUri;
    });
  } else {
    // For mobile, use expo-image-manipulator for compression
    try {
      const ImageManipulator = require('expo-image-manipulator');
      
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: maxWidth } }
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true
        }
      );
      
      console.log('Image compressed on mobile');
      return manipulatedImage.base64 || '';
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      // Fallback to original conversion
      return convertImageToBase64Original(imageUri);
    }
  }
}

async function convertImageToBase64Original(imageUri: string): Promise<string> {
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

async function convertImageToBase64(imageUri: string): Promise<string> {
  try {
    console.log('Converting and compressing image:', imageUri);
    
    // First try to compress the image
    const compressedBase64 = await compressImage(imageUri, 800, 0.8);
    
    // Check the size
    const sizeKB = (compressedBase64.length * 3) / 4 / 1024;
    console.log(`Final image size: ${sizeKB.toFixed(2)} KB`);
    
    if (sizeKB > 1000) {
      console.warn('Image is still large after compression, trying higher compression');
      return await compressImage(imageUri, 600, 0.6);
    }
    
    return compressedBase64;
  } catch (error) {
    console.error('Error in image compression, falling back to original:', error);
    return convertImageToBase64Original(imageUri);
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
  
  // console.log('Food scoring result:', {
  //   score: totalScore,
  //   grade,
  //   breakdown,
  //   reasons,
  //   flags
  // });
  
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
  bodyGoal: 'lose' | 'slightly-lose' | 'maintain' | 'slightly-gain' | 'gain';
  healthFocus: 'low_sugar' | 'high_protein' | 'low_fat' | 'keto' | 'balanced';
  healthStrictness?: 'not-strict' | 'neutral' | 'very-strict';
  dietPreference: 'whole_foods' | 'vegan' | 'carnivore' | 'gluten_free' | 'vegetarian' | 'balanced';
  dietStrictness?: 'not-strict' | 'neutral' | 'very-strict';
  lifeGoal: 'healthier' | 'energy_mood' | 'body_confidence' | 'clear_skin';
  lifeStrictness?: 'not-strict' | 'neutral' | 'very-strict';
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function deltaHealth(product: Product, focus: Profile['healthFocus'], strictness: Profile['healthStrictness'] = 'neutral') {
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

function fitsDiet(
  product: Product,
  diet: Profile['dietPreference'],
  strictness: Profile['dietStrictness'] = 'neutral'
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

function deltaLife(product: Product, life: Profile['lifeGoal'], strictness: Profile['lifeStrictness'] = 'neutral') {
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

// Convert UserGoals to Profile format
function convertUserGoalsToProfile(goals: UserGoals): Profile {
  const bodyGoalMap: Record<string, Profile['bodyGoal']> = {
    'lose-weight': 'lose',
    'slightly-lose-weight': 'slightly-lose',
    'maintain-weight': 'maintain',
    'slightly-gain-weight': 'slightly-gain',
    'gain-weight': 'gain'
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
  
  return {
    bodyGoal: bodyGoalMap[goals.bodyGoal || ''] || 'maintain',
    healthFocus: healthGoalMap[goals.healthGoal || ''] || 'balanced',
    healthStrictness: goals.healthStrictness ?? 'neutral',
    dietPreference: dietGoalMap[goals.dietGoal || ''] || 'balanced',
    dietStrictness: (goals as any).dietStrictness ?? 'neutral',
    lifeGoal: lifeGoalMap[goals.lifeGoal || ''] || 'healthier',
    lifeStrictness: (goals as any).lifeStrictness ?? 'neutral',
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

  const { d: h, why: wh } = deltaHealth(product, profile.healthFocus, profile.healthStrictness);
  const dietResult = fitsDiet(product, profile.dietPreference, profile.dietStrictness ?? 'neutral');
  const { d: df, why: wf, forceZero } = dietResult;
  const { d: b, why: wb } = deltaBody(product, profile.bodyGoal);
  const { d: l, why: wl } = deltaLife(product, profile.lifeGoal, profile.lifeStrictness ?? 'neutral');

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

// Enhanced analyze function that includes personalization
export async function analyzeFoodImageWithPersonalization(
  imageUri: string, 
  userGoals?: UserGoals
): Promise<FoodAnalysisResult> {
  try {
    console.log('Starting personalized food analysis for image:', imageUri);
    
    // Load cache from storage if not already loaded
    await loadCacheFromStorage();
    
    // Convert and compress image to base64
    const base64Image = await convertImageToBase64(imageUri);
    
    // Generate hash for caching
    const imageHash = await generateImageHash(base64Image);
    console.log('Generated image hash for caching:', imageHash, 'for image size:', base64Image.length);
    
    // Check if we have a cached result for this image
    if (analysisCache.has(imageHash)) {
      console.log('Found cached analysis result for this image');
      const cachedData = analysisCache.get(imageHash)!;
      console.log('Returning cached data for:', cachedData.name);
      
      // Apply personalization to cached data if user goals provided
      if (userGoals) {
        const personalResult = personalScore(cachedData, userGoals);
        const enhancedData: NutritionInfo = {
          ...cachedData,
          personalScore: personalResult.score,
          personalReasons: personalResult.reasons,
          personalGrade: personalResult.personalGrade,
          scoreBreakdown: {
            ...cachedData.scoreBreakdown!,
            personalAdjustment: personalResult.personalAdjustment,
            personalTotal: personalResult.score
          }
        };
        
        return {
          success: true,
          data: enhancedData
        };
      }
      
      return {
        success: true,
        data: cachedData
      };
    }
    
    console.log('No cached result found, proceeding with backend AI analysis with personalization');
    
    // Use backend tRPC for AI analysis with personalization (secure)
    const result = await trpcClient.food.analyze.mutate({
      base64Image,
      userGoals: userGoals ? {
        bodyGoal: userGoals.bodyGoal || undefined,
        healthGoal: userGoals.healthGoal || undefined,
        dietGoal: userGoals.dietGoal || undefined,
        lifeGoal: userGoals.lifeGoal || undefined,
        healthStrictness: userGoals.healthStrictness || undefined,
        dietStrictness: userGoals.dietStrictness || undefined,
        lifeStrictness: userGoals.lifeStrictness || undefined,
      } : undefined,
    });
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Analysis failed'
      };
    }
    
    const nutritionData = result.data;
    
    if (!nutritionData) {
      return {
        success: false,
        error: 'No data returned from analysis'
      };
    }
    
    // Cache the result for future scans of the same product
    analysisCache.set(imageHash, nutritionData);
    console.log('Cached analysis result for future use');
    
    // Save cache to persistent storage
    await saveCacheToStorage();
    
    return {
      success: true,
      data: nutritionData
    };
    
  } catch (error) {
    console.error('Personalized food analysis error:', error);
    
    // Handle AbortError specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Personalized analysis was aborted:', error.message);
      return {
        success: false,
        error: 'Analysis was cancelled or timed out. Please try again.'
      };
    }
    
    // Handle timeout errors
    if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('timed out'))) {
      console.error('Personalized analysis timed out:', error.message);
      return {
        success: false,
        error: 'Analysis timed out. Please try again with a clearer image.'
      };
    }
    
    // Provide a fallback mock analysis if backend fails
    if (error instanceof Error && (error.message.includes('Network request failed') || error.message.includes('fetch') || error.message.includes('Network connection failed'))) {
      console.log('Backend failed, providing fallback analysis');
      
      const fallbackData: NutritionInfo = {
        name: 'Food Item (Backend Error)',
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
        ingredients: ['Unable to analyze - backend error'],
        allergens: [],
        additives: [],
        isOrganic: false,
        grade: 'mediocre' as const,
        recommendations: [
          'Backend connection failed during analysis',
          'Please check your internet connection and try again',
          'This is a placeholder analysis'
        ],
        warnings: ['Analysis unavailable due to backend error'],
        reasons: ['Backend connectivity issue'],
        flags: ['backend_error'],
        scoreBreakdown: {
          nutritionScore: 40,
          additivesScore: 0,
          organicScore: 0,
          totalScore: 45
        }
      };
      
      // Apply personalization to fallback data if user goals provided
      if (userGoals) {
        const personalResult = personalScore(fallbackData, userGoals);
        fallbackData.personalScore = personalResult.score;
        fallbackData.personalReasons = personalResult.reasons;
        fallbackData.personalGrade = personalResult.personalGrade;
        fallbackData.scoreBreakdown = {
          nutritionScore: fallbackData.scoreBreakdown?.nutritionScore || 40,
          additivesScore: fallbackData.scoreBreakdown?.additivesScore || 0,
          organicScore: fallbackData.scoreBreakdown?.organicScore || 0,
          totalScore: fallbackData.scoreBreakdown?.totalScore || 45,
          personalAdjustment: personalResult.personalAdjustment,
          personalTotal: personalResult.score
        };
      }
      
      return {
        success: true,
        data: fallbackData
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during analysis'
    };
  }
}