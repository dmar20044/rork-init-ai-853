import { Alert } from 'react-native';
import { NutritionInfo } from './foodAnalysis';

// Barcode scanning service using external API
export interface BarcodeResult {
  success: boolean;
  data?: {
    productName: string;
    brand?: string;
    barcode: string;
    nutritionInfo?: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      saturatedFat?: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
      // Additional micronutrients
      calcium?: number;
      iron?: number;
      vitaminC?: number;
      vitaminA?: number;
      potassium?: number;
      magnesium?: number;
      zinc?: number;
      transFat?: number;
      cholesterol?: number;
    };
    // Additional product information
    ingredients?: string[];
    allergens?: string[];
    nutriScore?: string;
    novaGroup?: number;
    servingSize?: string;
    imageUrl?: string;
    categories?: string[];
  };
  error?: string;
}

// Barcode scanning function using AI vision API
export async function scanBarcodeFromImage(imageUri: string): Promise<BarcodeResult> {
  try {
    console.log('Scanning barcode from image:', imageUri);
    
    // Convert image to base64 for AI processing
    let base64Image: string;
    
    if (imageUri.startsWith('data:')) {
      // Already base64
      base64Image = imageUri;
    } else {
      // Convert file URI to base64
      try {
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        
        // Check if blob is valid
        if (!blob || blob.size === 0) {
          throw new Error('Invalid or empty image file');
        }
        
        base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            if (!result || !result.startsWith('data:')) {
              reject(new Error('Failed to convert image to base64'));
            } else {
              resolve(result);
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(blob);
        });
      } catch (fetchError) {
        console.error('Error converting image to base64:', fetchError);
        throw new Error('Failed to process image. Please try a different image.');
      }
    }
    
    // Test API connectivity first
    console.log('Testing AI API connectivity for barcode detection...');
    try {
      const testResponse = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: 'test'
          }]
        })
      });
      
      if (!testResponse.ok) {
        console.error('AI API test failed for barcode detection:', testResponse.status);
        throw new Error(`AI API is currently unavailable for barcode detection (${testResponse.status})`);
      }
      
      console.log('AI API test successful for barcode detection');
    } catch (testError) {
      console.error('AI API connectivity test failed:', testError);
      return {
        success: false,
        error: 'AI service is currently unavailable. Please try again later or scan the barcode manually.'
      };
    }
    
    // Use AI to detect and read barcode from image
    const aiResponse = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a barcode detection system. Analyze the image and extract any barcodes you can find. If you find a barcode, return ONLY the barcode number as plain text with no additional formatting or explanation. If no barcode is found, respond with "NO_BARCODE_FOUND".'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please detect and read any barcodes in this image. Return only the barcode number.'
              },
              {
                type: 'image',
                image: base64Image
              }
            ]
          }
        ]
      })
    });
    
    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }
    
    const aiResult = await aiResponse.json();
    const detectedBarcode = aiResult.completion?.trim();
    
    if (!detectedBarcode || detectedBarcode === 'NO_BARCODE_FOUND') {
      return {
        success: false,
        error: 'No barcode detected in the image. Please ensure the barcode is clearly visible and try again.'
      };
    }
    
    console.log('Barcode detected by AI:', detectedBarcode);
    
    // Look up the detected barcode in the product database
    return await lookupProductByBarcode(detectedBarcode);
    
  } catch (error) {
    console.error('Error scanning barcode:', error);
    return {
      success: false,
      error: 'Failed to scan barcode. Please ensure the barcode is clearly visible and try again.'
    };
  }
}

// Function to look up product by barcode using OpenFoodFacts API with fallback endpoints
export async function lookupProductByBarcode(barcode: string): Promise<BarcodeResult> {
  try {
    console.log('Looking up product by barcode:', barcode);
    
    // Validate barcode format
    if (!barcode || barcode.trim().length === 0) {
      throw new Error('Invalid barcode format');
    }
    
    const cleanBarcode = barcode.trim();
    
    // Validate barcode is numeric and reasonable length
    if (!/^\d{8,14}$/.test(cleanBarcode)) {
      console.error('Invalid barcode format:', cleanBarcode);
      return {
        success: false,
        error: 'Invalid barcode format. Barcode must be 8-14 digits.'
      };
    }
    
    console.log('Making request to OpenFoodFacts API for barcode:', cleanBarcode);
    
    // Try multiple endpoints with retry logic, prioritizing English-language endpoints
    const endpoints = [
      `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json?lc=en&cc=us&fields=product_name,brands,nutriments,ingredients_text,allergens_tags,traces_tags,categories_tags,nutriscore_grade,nova_group,serving_size,image_front_small_url,image_small_url`,
      `https://us.openfoodfacts.org/api/v0/product/${cleanBarcode}.json?lc=en&fields=product_name,brands,nutriments,ingredients_text,allergens_tags,traces_tags,categories_tags,nutriscore_grade,nova_group,serving_size,image_front_small_url,image_small_url`,
      `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json?lc=en&fields=product_name,brands,nutriments,ingredients_text,allergens_tags,traces_tags,categories_tags,nutriscore_grade,nova_group,serving_size,image_front_small_url,image_small_url`,
      `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json?fields=product_name,brands,nutriments,ingredients_text,allergens_tags,traces_tags,categories_tags,nutriscore_grade,nova_group,serving_size,image_front_small_url,image_small_url`
    ];
    
    let lastError: Error | null = null;
    
    for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex++) {
      const apiUrl = endpoints[endpointIndex];
      console.log(`Trying endpoint ${endpointIndex + 1}/${endpoints.length}:`, apiUrl);
      
      // Try each endpoint up to 2 times
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Attempt ${attempt}/2 for endpoint ${endpointIndex + 1}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log('OpenFoodFacts request timeout after 10 seconds');
            controller.abort();
          }, 10000); // 10 second timeout
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
              'User-Agent': 'NutritionScanner/1.0 (https://nutrition-scanner.app)',
              'Cache-Control': 'no-cache',
              'X-Requested-With': 'XMLHttpRequest'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          console.log(`Response status for endpoint ${endpointIndex + 1}, attempt ${attempt}:`, response.status);
          
          if (response.ok) {
            // Success! Process the response
            return await processOpenFoodFactsResponse(response, cleanBarcode);
          } else if (response.status === 404) {
            // Product not found - this is definitive, don't retry other endpoints
            console.log('Product not found (404) - stopping retries');
            return {
              success: false,
              error: 'Product not found in OpenFoodFacts database'
            };
          } else if (response.status >= 500) {
            // Server error - try next attempt or endpoint
            console.log(`Server error ${response.status} - will retry`);
            lastError = new Error(`OpenFoodFacts API returned ${response.status}: ${response.statusText}`);
            
            if (attempt < 2) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
            continue;
          } else {
            // Other client errors - try next endpoint
            console.log(`Client error ${response.status} - trying next endpoint`);
            lastError = new Error(`OpenFoodFacts API returned ${response.status}: ${response.statusText}`);
            break; // Break inner loop, try next endpoint
          }
          
        } catch (fetchError) {
          console.error(`Network error on endpoint ${endpointIndex + 1}, attempt ${attempt}:`, fetchError);
          lastError = fetchError instanceof Error ? fetchError : new Error('Network request failed');
          
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            console.log('OpenFoodFacts request timed out - trying next attempt/endpoint');
          }
          
          if (attempt < 2) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    }
    
    // All endpoints failed
    console.error('All OpenFoodFacts endpoints failed. Last error:', lastError);
    
    if (lastError) {
      if (lastError.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. Please check your internet connection and try again.'
        };
      }
      
      if (lastError.message.includes('Network request failed')) {
        return {
          success: false,
          error: 'Network connection failed. Please check your internet connection.'
        };
      }
      
      if (lastError.message.includes('502') || lastError.message.includes('503') || lastError.message.includes('504')) {
        return {
          success: false,
          error: 'OpenFoodFacts service is temporarily unavailable. Please try again in a few minutes.'
        };
      }
    }
    
    return {
      success: false,
      error: 'Unable to connect to OpenFoodFacts database. Please try again later.'
    };
    
  } catch (error) {
    console.error('Error looking up product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to look up product information'
    };
  }
}

// Helper function to process OpenFoodFacts API response
async function processOpenFoodFactsResponse(response: Response, cleanBarcode: string): Promise<BarcodeResult> {
  try {
      
    // Check content type
    const contentType = response.headers.get('content-type');
    console.log('Response content type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid content type received:', contentType);
      const textResponse = await response.text();
      console.error('Response body preview:', textResponse.substring(0, 500));
      throw new Error('OpenFoodFacts API returned invalid response format');
    }
    
    const data = await response.json();
    console.log('OpenFoodFacts API response data status:', data.status);
      
    if (data.status === 1 && data.product) {
      const product = data.product;
      console.log('Product found:', product.product_name || 'Unnamed product');
      console.log('Product brands:', product.brands);
      console.log('Product nutriments available:', !!product.nutriments);
      
      // Extract serving size and calculate conversion factor
      const servingSize = product.serving_size || '100g';
      const servingWeight = parseServingSize(servingSize);
      const conversionFactor = servingWeight / 100; // Convert from per-100g to per-serving
      
      console.log('Serving size:', servingSize, 'Weight:', servingWeight + 'g', 'Conversion factor:', conversionFactor);
      
      // Extract comprehensive nutrition information with proper fallbacks and convert to per-serving
      const nutritionInfoPer100g = {
        calories: extractNutrientValue(product.nutriments, ['energy-kcal_100g', 'energy-kcal', 'energy_100g']),
        protein: extractNutrientValue(product.nutriments, ['proteins_100g', 'proteins']),
        carbs: extractNutrientValue(product.nutriments, ['carbohydrates_100g', 'carbohydrates']),
        fat: extractNutrientValue(product.nutriments, ['fat_100g', 'fat']),
        saturatedFat: extractNutrientValue(product.nutriments, ['saturated-fat_100g', 'saturated-fat']),
        fiber: extractNutrientValue(product.nutriments, ['fiber_100g', 'fiber']),
        sugar: extractNutrientValue(product.nutriments, ['sugars_100g', 'sugars']),
        sodium: extractNutrientValue(product.nutriments, ['sodium_100g', 'sodium']),
        // Additional micronutrients
        calcium: extractNutrientValue(product.nutriments, ['calcium_100g', 'calcium']),
        iron: extractNutrientValue(product.nutriments, ['iron_100g', 'iron']),
        vitaminC: extractNutrientValue(product.nutriments, ['vitamin-c_100g', 'vitamin-c']),
        vitaminA: extractNutrientValue(product.nutriments, ['vitamin-a_100g', 'vitamin-a']),
        potassium: extractNutrientValue(product.nutriments, ['potassium_100g', 'potassium']),
        magnesium: extractNutrientValue(product.nutriments, ['magnesium_100g', 'magnesium']),
        zinc: extractNutrientValue(product.nutriments, ['zinc_100g', 'zinc']),
        // Trans fat and cholesterol
        transFat: extractNutrientValue(product.nutriments, ['trans-fat_100g', 'trans-fat']),
        cholesterol: extractNutrientValue(product.nutriments, ['cholesterol_100g', 'cholesterol'])
      };
      
      // Convert all nutrition values from per-100g to per-serving
      const nutritionInfo = convertNutritionToPerServing(nutritionInfoPer100g, conversionFactor);
      
      console.log('Extracted nutrition info:', nutritionInfo);
      
      // Extract additional product information
      const ingredients = extractIngredientsList(product);
      const allergens = extractAllergens(product);
      const categories = extractCategories(product);
      
      // Try to get English product name, fallback to other languages if needed
      let productName = product.product_name;
      if (!productName && product.product_name_en) {
        productName = product.product_name_en;
      } else if (!productName && product.generic_name) {
        productName = product.generic_name;
      } else if (!productName && product.generic_name_en) {
        productName = product.generic_name_en;
      }
      
      return {
        success: true,
        data: {
          productName: productName || 'Unknown Product',
          brand: product.brands || undefined,
          barcode: cleanBarcode,
          nutritionInfo,
          ingredients,
          allergens,
          nutriScore: product.nutriscore_grade || undefined,
          novaGroup: product.nova_group || undefined,
          servingSize: servingSize,
          imageUrl: product.image_front_small_url || product.image_small_url || undefined,
          categories
        }
      };
    } else if (data.status === 0) {
      console.log('Product not found in OpenFoodFacts database');
      return {
        success: false,
        error: 'Product not found in OpenFoodFacts database. This product may not be in their system yet.'
      };
    } else {
      console.error('Unexpected OpenFoodFacts API response:', data);
      return {
        success: false,
        error: 'Unexpected response from OpenFoodFacts API'
      };
    }
    
  } catch (error) {
    console.error('Error processing OpenFoodFacts response:', error);
    throw error;
  }
}

// Helper function to extract nutrient values with fallbacks
function extractNutrientValue(nutriments: any, keys: string[]): number | undefined {
  if (!nutriments) return undefined;
  
  for (const key of keys) {
    const value = nutriments[key];
    if (typeof value === 'number' && !isNaN(value) && value >= 0) {
      return value;
    }
  }
  
  return undefined;
}

// Helper function to extract ingredients list
function extractIngredientsList(product: any): string[] {
  const ingredients: string[] = [];
  
  // Try different ingredient fields
  if (product.ingredients_text) {
    // Split by common separators and clean up
    const rawIngredients = product.ingredients_text
      .split(/[,;]|\band\b/i)
      .map((ing: string) => ing.trim())
      .filter((ing: string) => ing.length > 0);
    ingredients.push(...rawIngredients);
  } else if (product.ingredients && Array.isArray(product.ingredients)) {
    // Use structured ingredients if available
    product.ingredients.forEach((ing: any) => {
      if (ing.text) ingredients.push(ing.text.trim());
      else if (typeof ing === 'string') ingredients.push(ing.trim());
    });
  }
  
  return ingredients;
}

// Helper function to extract allergens
function extractAllergens(product: any): string[] {
  const allergens: string[] = [];
  
  if (product.allergens_tags && Array.isArray(product.allergens_tags)) {
    product.allergens_tags.forEach((allergen: string) => {
      // Remove 'en:' prefix and format nicely
      const cleanAllergen = allergen.replace(/^en:/, '').replace(/-/g, ' ');
      allergens.push(cleanAllergen);
    });
  }
  
  if (product.traces_tags && Array.isArray(product.traces_tags)) {
    product.traces_tags.forEach((trace: string) => {
      const cleanTrace = trace.replace(/^en:/, '').replace(/-/g, ' ');
      if (!allergens.includes(cleanTrace)) {
        allergens.push(`may contain ${cleanTrace}`);
      }
    });
  }
  
  return allergens;
}

// Helper function to extract categories
function extractCategories(product: any): string[] {
  const categories: string[] = [];
  
  if (product.categories_tags && Array.isArray(product.categories_tags)) {
    product.categories_tags.forEach((category: string) => {
      // Remove 'en:' prefix and format nicely
      const cleanCategory = category.replace(/^en:/, '').replace(/-/g, ' ');
      categories.push(cleanCategory);
    });
  }
  
  return categories.slice(0, 5); // Limit to top 5 categories
}

// Search products using OpenFoodFacts v2 API
export interface ProductSearchResult {
  success: boolean;
  data?: {
    products: {
      productName: string;
      brand?: string;
      barcode: string;
      imageUrl?: string;
      nutritionInfo?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        fiber?: number;
        sugar?: number;
      };
      nutriScore?: string;
    }[];
    totalResults: number;
  };
  error?: string;
}

export async function searchProducts(
  query: string,
  options: {
    category?: string;
    pageSize?: number;
    page?: number;
  } = {}
): Promise<ProductSearchResult> {
  try {
    console.log('Searching products with query:', query);
    
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: 'Search query cannot be empty'
      };
    }
    
    const { category, pageSize = 20, page = 1 } = options;
    
    // Build search URL with parameters, forcing English language
    const searchParams = new URLSearchParams({
      search_terms: query.trim(),
      fields: 'product_name,brands,code,nutriscore_grade,nutriments,image_small_url',
      page_size: pageSize.toString(),
      page: page.toString(),
      json: '1',
      lc: 'en',
      cc: 'us'
    });
    
    if (category) {
      searchParams.append('categories_tags_en', category);
    }
    
    const apiUrl = `https://world.openfoodfacts.org/api/v2/search?${searchParams.toString()}`;
    console.log('Search API URL:', apiUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'NutritionScanner/1.0 (https://nutrition-scanner.app)'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('OpenFoodFacts search API error:', response.status, response.statusText);
      throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Search API response:', {
      count: data.count,
      page: data.page,
      page_count: data.page_count,
      products_count: data.products?.length || 0
    });
    
    if (!data.products || !Array.isArray(data.products)) {
      return {
        success: true,
        data: {
          products: [],
          totalResults: 0
        }
      };
    }
    
    // Process and format the products
    const products = data.products.map((product: any) => {
      // Extract serving size and calculate conversion factor for search results too
      const servingSize = product.serving_size || '100g';
      const servingWeight = parseServingSize(servingSize);
      const conversionFactor = servingWeight / 100;
      
      const nutritionInfoPer100g = {
        calories: extractNutrientValue(product.nutriments, ['energy-kcal_100g', 'energy-kcal', 'energy_100g']),
        protein: extractNutrientValue(product.nutriments, ['proteins_100g', 'proteins']),
        carbs: extractNutrientValue(product.nutriments, ['carbohydrates_100g', 'carbohydrates']),
        fat: extractNutrientValue(product.nutriments, ['fat_100g', 'fat']),
        saturatedFat: extractNutrientValue(product.nutriments, ['saturated-fat_100g', 'saturated-fat']),
        fiber: extractNutrientValue(product.nutriments, ['fiber_100g', 'fiber']),
        sugar: extractNutrientValue(product.nutriments, ['sugars_100g', 'sugars']),
        sodium: extractNutrientValue(product.nutriments, ['sodium_100g', 'sodium']),
        // Additional micronutrients
        calcium: extractNutrientValue(product.nutriments, ['calcium_100g', 'calcium']),
        iron: extractNutrientValue(product.nutriments, ['iron_100g', 'iron']),
        vitaminC: extractNutrientValue(product.nutriments, ['vitamin-c_100g', 'vitamin-c']),
        vitaminA: extractNutrientValue(product.nutriments, ['vitamin-a_100g', 'vitamin-a']),
        potassium: extractNutrientValue(product.nutriments, ['potassium_100g', 'potassium']),
        magnesium: extractNutrientValue(product.nutriments, ['magnesium_100g', 'magnesium']),
        zinc: extractNutrientValue(product.nutriments, ['zinc_100g', 'zinc']),
        transFat: extractNutrientValue(product.nutriments, ['trans-fat_100g', 'trans-fat']),
        cholesterol: extractNutrientValue(product.nutriments, ['cholesterol_100g', 'cholesterol'])
      };
      
      // Convert to per-serving values
      const nutritionInfo = convertNutritionToPerServing(nutritionInfoPer100g, conversionFactor);
      
      const ingredients = extractIngredientsList(product);
      const allergens = extractAllergens(product);
      const categories = extractCategories(product);
      
      return {
        productName: product.product_name || product.generic_name || 'Unknown Product',
        brand: product.brands || undefined,
        barcode: product.code || '',
        imageUrl: product.image_small_url || undefined,
        nutritionInfo,
        ingredients,
        allergens,
        nutriScore: product.nutriscore_grade || undefined,
        novaGroup: product.nova_group || undefined,
        servingSize: product.serving_size || '100g',
        categories
      };
    }).filter((product: any) => product.productName !== 'Unknown Product' || product.barcode);
    
    return {
      success: true,
      data: {
        products,
        totalResults: data.count || 0
      }
    };
    
  } catch (error) {
    console.error('Error searching products:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Search request timed out. Please try again.'
        };
      }
      
      if (error.message.includes('Network request failed')) {
        return {
          success: false,
          error: 'Network connection failed. Please check your internet connection.'
        };
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search products'
    };
  }
}

// Test function to verify OpenFoodFacts API connectivity
export async function testOpenFoodFactsAPI(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Testing OpenFoodFacts API connectivity...');
    
    // Test with a known product (Nutella)
    const testBarcode = '3017620422003';
    const result = await lookupProductByBarcode(testBarcode);
    
    if (result.success) {
      console.log('OpenFoodFacts API test successful:', result.data?.productName);
      return {
        success: true,
        message: `API working correctly. Test product: ${result.data?.productName}`
      };
    } else {
      console.log('OpenFoodFacts API test failed:', result.error);
      return {
        success: false,
        message: result.error || 'API test failed'
      };
    }
    
  } catch (error) {
    console.error('OpenFoodFacts API test error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'API test failed with unknown error'
    };
  }
}

// Function to convert barcode result to nutrition info format
export function convertBarcodeToNutrition(
  barcodeData: BarcodeResult['data'], 
  userGoals?: {
    dietGoal?: string | null;
    healthGoal?: string | null;
    bodyGoal?: string | null;
  }
): NutritionInfo | null {
  if (!barcodeData) return null;
  
  const nutrition = barcodeData.nutritionInfo;
  
  // Calculate a basic health score based on available nutrition data
  let healthScore = 50; // Start with neutral score
  
  if (nutrition) {
    // Positive factors
    if (nutrition.protein && nutrition.protein > 10) healthScore += 15;
    if (nutrition.fiber && nutrition.fiber > 3) healthScore += 10;
    
    // Negative factors
    if (nutrition.sugar && nutrition.sugar > 15) healthScore -= 15;
    if (nutrition.calories && nutrition.calories > 200) healthScore -= 10;
    if (nutrition.fat && nutrition.fat > 10) healthScore -= 10;
  }
  
  // Ensure score is within bounds
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  // Calculate personalized score if user goals are provided
  let personalScore: number | undefined = undefined;
  if (userGoals && nutrition) {
    personalScore = calculatePersonalizedScore(nutrition, userGoals, healthScore);
  }
  
  return {
    name: `${barcodeData.productName}${barcodeData.brand ? ` (${barcodeData.brand})` : ''}`,
    healthScore: healthScore,
    personalScore: personalScore,
    calories: nutrition?.calories || 0,
    protein: nutrition?.protein || 0,
    carbs: nutrition?.carbs || 0,
    fat: nutrition?.fat || 0,
    saturatedFat: nutrition?.saturatedFat || 0,
    fiber: nutrition?.fiber || 0,
    sugar: nutrition?.sugar || 0,
    sodium: nutrition?.sodium || 0,
    ingredients: barcodeData.ingredients || [`Barcode: ${barcodeData.barcode}`, ...(barcodeData.brand ? [`Brand: ${barcodeData.brand}`] : [])],
    allergens: barcodeData.allergens || [],
    servingSize: barcodeData.servingSize || '100g',
    servingsPerContainer: 1,
    grade: (personalScore !== undefined ? personalScore : healthScore) >= 70 ? 'excellent' : (personalScore !== undefined ? personalScore : healthScore) >= 50 ? 'good' : (personalScore !== undefined ? personalScore : healthScore) >= 30 ? 'mediocre' : 'poor',
    reasons: [
      ...(nutrition?.protein && nutrition.protein > 5 ? ['Good protein content'] : []),
      ...(nutrition?.fiber && nutrition.fiber > 2 ? ['Contains fiber'] : []),
      ...(nutrition?.calories && nutrition.calories < 150 ? ['Moderate calories'] : []),
      ...(nutrition?.sugar && nutrition.sugar > 10 ? ['High sugar content'] : []),
      ...(nutrition?.fat && nutrition.fat > 8 ? ['High fat content'] : []),
      ...(nutrition?.calories && nutrition.calories > 250 ? ['High calorie content'] : []),
      ...(barcodeData.nutriScore ? [`Nutri-Score: ${barcodeData.nutriScore.toUpperCase()}`] : []),
      ...(barcodeData.novaGroup ? [`NOVA Group: ${barcodeData.novaGroup} (${getNOVADescription(barcodeData.novaGroup)})`] : [])
    ],
    recommendations: [
      'Verify nutrition information on product packaging',
      'Consider portion size when consuming',
      ...(barcodeData.allergens && barcodeData.allergens.length > 0 ? ['Check allergen information carefully'] : ['Check for any allergens not listed in barcode data']),
      ...(barcodeData.novaGroup && barcodeData.novaGroup >= 3 ? ['Consider choosing less processed alternatives'] : [])
    ],
    flags: ['barcode-scanned', ...(barcodeData.novaGroup ? [`nova-${barcodeData.novaGroup}`] : [])],
    imageUrl: barcodeData.imageUrl
  };
}

// Helper function to calculate personalized score for barcode scans
function calculatePersonalizedScore(
  nutrition: any,
  userGoals: {
    dietGoal?: string | null;
    healthGoal?: string | null;
    bodyGoal?: string | null;
  },
  baseScore: number
): number {
  let personalScore = baseScore;
  const { dietGoal, healthGoal, bodyGoal } = userGoals;
  
  // Diet goal adjustments
  if (dietGoal === 'whole-foods') {
    // Penalize processed foods more heavily
    personalScore -= 20; // Assume barcode products are processed
  }
  
  if (dietGoal === 'vegan' || dietGoal === 'vegetarian') {
    // Check ingredients for animal products (basic check)
    // This would need more sophisticated ingredient analysis
    // For now, assume neutral impact
  }
  
  if (dietGoal === 'gluten-free') {
    // Check for gluten-containing ingredients
    // This would need ingredient analysis - assume neutral for now
  }
  
  // Health goal adjustments
  if (healthGoal === 'keto') {
    if (nutrition.carbs > 5) personalScore -= 25;
    if (nutrition.fat > 10) personalScore += 15;
  }
  
  if (healthGoal === 'low-sugar') {
    if (nutrition.sugar > 5) personalScore -= 20;
    if (nutrition.sugar > 15) personalScore -= 30;
  }
  
  if (healthGoal === 'low-fat') {
    if (nutrition.fat > 5) personalScore -= 15;
    if (nutrition.fat > 10) personalScore -= 25;
  }
  
  if (healthGoal === 'high-protein') {
    if (nutrition.protein > 15) personalScore += 20;
    if (nutrition.protein < 5) personalScore -= 15;
  }
  
  // Body goal adjustments
  if (bodyGoal === 'lose-weight') {
    if (nutrition.calories > 150) personalScore -= 15;
    if (nutrition.calories > 250) personalScore -= 25;
  }
  
  if (bodyGoal === 'gain-muscle') {
    if (nutrition.protein > 10) personalScore += 15;
    if (nutrition.protein < 5) personalScore -= 20;
  }
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(100, personalScore));
}

// Function to show barcode scanning instructions
export function showBarcodeScanningInstructions() {
  Alert.alert(
    'Barcode Scanning',
    'Position the barcode within the camera frame and take a photo. The app will automatically detect and look up the product information.',
    [
      { text: 'Got it', style: 'default' }
    ]
  );
}

// Common product categories for search filtering
export const PRODUCT_CATEGORIES = {
  'breakfast-cereals': 'Breakfast Cereals',
  'yogurts': 'Yogurts',
  'breads': 'Breads',
  'cheeses': 'Cheeses',
  'chocolates': 'Chocolates',
  'cookies': 'Cookies',
  'crackers': 'Crackers',
  'dairy-drinks': 'Dairy Drinks',
  'frozen-meals': 'Frozen Meals',
  'ice-creams': 'Ice Creams',
  'jams': 'Jams',
  'pasta': 'Pasta',
  'pizza': 'Pizza',
  'snacks': 'Snacks',
  'sodas': 'Sodas',
  'waters': 'Waters'
} as const;

export type ProductCategory = keyof typeof PRODUCT_CATEGORIES;

// Helper function to get NOVA group description
function getNOVADescription(novaGroup: number): string {
  switch (novaGroup) {
    case 1: return 'Unprocessed or minimally processed foods';
    case 2: return 'Processed culinary ingredients';
    case 3: return 'Processed foods';
    case 4: return 'Ultra-processed foods';
    default: return 'Unknown processing level';
  }
}

// Enhanced function to get detailed product information by barcode
export async function getDetailedProductInfo(barcode: string): Promise<{
  success: boolean;
  data?: {
    basicInfo: BarcodeResult['data'];
    detailedNutrition: Record<string, number>;
    additives: string[];
    palmOil: boolean;
    ecoscore?: string;
    packagingInfo?: string[];
  };
  error?: string;
}> {
  try {
    const result = await lookupProductByBarcode(barcode);
    
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }
    
    // Get the full product data for additional details, forcing English
    const apiUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json?lc=en&cc=us`;
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'NutritionScanner/1.0 (https://nutrition-scanner.app)'
      }
    });
    const data = await response.json();
    
    if (data.status !== 1 || !data.product) {
      return { success: false, error: 'Product details not available' };
    }
    
    const product = data.product;
    
    // Extract serving size and calculate conversion factor for detailed nutrition
    const servingSize = product.serving_size || '100g';
    const servingWeight = parseServingSize(servingSize);
    const conversionFactor = servingWeight / 100;
    
    // Extract detailed nutrition (all available nutrients) and convert to per-serving
    const detailedNutrition: Record<string, number> = {};
    if (product.nutriments) {
      Object.keys(product.nutriments).forEach(key => {
        if (key.endsWith('_100g') && typeof product.nutriments[key] === 'number') {
          const nutrientName = key.replace('_100g', '').replace(/-/g, '_');
          const per100gValue = product.nutriments[key];
          // Convert to per-serving value
          if (nutrientName.includes('energy') || nutrientName.includes('kcal')) {
            detailedNutrition[nutrientName] = Math.round(per100gValue * conversionFactor);
          } else if (nutrientName.includes('sodium') || nutrientName.includes('mg')) {
            detailedNutrition[nutrientName] = Math.round(per100gValue * conversionFactor);
          } else {
            // For grams, round to 1 decimal place
            detailedNutrition[nutrientName] = Math.round(per100gValue * conversionFactor * 10) / 10;
          }
        }
      });
    }
    
    // Extract additives
    const additives: string[] = [];
    if (product.additives_tags && Array.isArray(product.additives_tags)) {
      product.additives_tags.forEach((additive: string) => {
        const cleanAdditive = additive.replace(/^en:/, '').replace(/-/g, ' ');
        additives.push(cleanAdditive);
      });
    }
    
    // Check for palm oil
    const palmOil = !!(product.ingredients_analysis_tags && 
      product.ingredients_analysis_tags.some((tag: string) => 
        tag.includes('palm-oil')));
    
    // Extract packaging info
    const packagingInfo: string[] = [];
    if (product.packaging_tags && Array.isArray(product.packaging_tags)) {
      product.packaging_tags.forEach((pkg: string) => {
        const cleanPkg = pkg.replace(/^en:/, '').replace(/-/g, ' ');
        packagingInfo.push(cleanPkg);
      });
    }
    
    return {
      success: true,
      data: {
        basicInfo: result.data,
        detailedNutrition,
        additives,
        palmOil,
        ecoscore: product.ecoscore_grade || undefined,
        packagingInfo: packagingInfo.length > 0 ? packagingInfo : undefined
      }
    };
    
  } catch (error) {
    console.error('Error getting detailed product info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get detailed product information'
    };
  }
}

// Helper function to parse serving size and extract weight in grams
function parseServingSize(servingSize: string): number {
  if (!servingSize) return 100;
  
  // Remove extra whitespace and convert to lowercase
  const cleaned = servingSize.toLowerCase().trim();
  
  // Look for patterns like "30g", "1 cup (240g)", "2 slices (57g)", etc.
  const patterns = [
    /\((\d+(?:\.\d+)?)\s*g\)/,  // Extract from parentheses like "(30g)"
    /(\d+(?:\.\d+)?)\s*g/,      // Direct grams like "30g"
    /(\d+(?:\.\d+)?)\s*ml/,     // Convert ml to g (assume 1ml = 1g for most foods)
    /(\d+(?:\.\d+)?)\s*oz/      // Convert oz to g (1 oz ≈ 28.35g)
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (pattern.source.includes('oz')) {
        return Math.round(value * 28.35); // Convert oz to grams
      }
      return Math.round(value); // Already in grams or ml
    }
  }
  
  // If no weight found, try to estimate based on common serving descriptions
  const estimations: Record<string, number> = {
    'slice': 28,
    'piece': 30,
    'cup': 240,
    'tablespoon': 15,
    'teaspoon': 5,
    'serving': 100,
    'portion': 100,
    'container': 150,
    'bottle': 500,
    'can': 355
  };
  
  for (const [key, weight] of Object.entries(estimations)) {
    if (cleaned.includes(key)) {
      // Look for a number before the unit
      const numberMatch = cleaned.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${key}`));
      if (numberMatch) {
        return Math.round(parseFloat(numberMatch[1]) * weight);
      }
      return weight;
    }
  }
  
  console.log('Could not parse serving size:', servingSize, 'defaulting to 100g');
  return 100; // Default to 100g if we can't parse
}

// Helper function to convert nutrition values from per-100g to per-serving
function convertNutritionToPerServing(
  nutritionPer100g: Record<string, number | undefined>, 
  conversionFactor: number
): Record<string, number | undefined> {
  const converted: Record<string, number | undefined> = {};
  
  for (const [key, value] of Object.entries(nutritionPer100g)) {
    if (typeof value === 'number') {
      // Round to appropriate decimal places based on the nutrient
      if (key === 'calories') {
        converted[key] = Math.round(value * conversionFactor);
      } else if (key === 'sodium') {
        converted[key] = Math.round(value * conversionFactor); // Keep as whole numbers for mg
      } else {
        // For grams, round to 1 decimal place
        converted[key] = Math.round(value * conversionFactor * 10) / 10;
      }
    } else {
      converted[key] = value;
    }
  }
  
  return converted;
}