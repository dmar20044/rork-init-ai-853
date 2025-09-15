import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  X,
  TrendingUp,
  AlertTriangle,
  Plus,
  Dumbbell,
  Flame,
  Zap,
  ArrowRight,
  DollarSign,
  MapPin,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';

import { NutritionInfo } from '@/services/foodAnalysis';
import { useUser } from '@/contexts/UserContext';
import { useGroceryList } from '@/contexts/GroceryListContext';
import { ToastNotification } from '@/components/ToastNotification';

interface BetterSwap {
  name: string;
  brand?: string;
  score: number;
  personalScore?: number;
  grade: 'poor' | 'mediocre' | 'good' | 'excellent';
  personalGrade?: 'poor' | 'mediocre' | 'good' | 'excellent';
  reasons: string[];
  keyBenefits: string[];
  imageUrl?: string;
  price?: string;
  availability?: string;
}

interface BetterSwapsModalProps {
  visible: boolean;
  onClose: () => void;
  currentProduct: NutritionInfo;
}

const getScoreColor = (score: number) => {
  if (score <= 40) return Colors.error; // Red
  if (score <= 65) return '#FFA500'; // Orange/Yellow
  if (score <= 85) return Colors.success; // Green
  return '#00FF00'; // Bright green
};

const getScoreIcon = (improvement: number) => {
  if (improvement > 0) {
    return <TrendingUp size={12} color={Colors.success} />;
  }
  return null;
};

const getBenefitIcon = (benefit: string, textSecondaryColor: string) => {
  const lowerBenefit = benefit.toLowerCase();
  if (lowerBenefit.includes('protein') || lowerBenefit.includes('muscle')) {
    return <Dumbbell size={12} color={textSecondaryColor} />;
  }
  if (lowerBenefit.includes('calorie') || lowerBenefit.includes('energy') || lowerBenefit.includes('burn')) {
    return <Flame size={12} color={textSecondaryColor} />;
  }
  if (lowerBenefit.includes('sugar') || lowerBenefit.includes('sweet')) {
    return <Zap size={12} color={textSecondaryColor} />;
  }
  return <Zap size={12} color={textSecondaryColor} />;
};

export default function BetterSwapsModal({ visible, onClose, currentProduct }: BetterSwapsModalProps) {
  const { profile } = useUser();
  const { addItem } = useGroceryList();
  // const { colors } = useTheme(); // Removed since we're using gradient colors
  const [swaps, setSwaps] = useState<BetterSwap[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const showPersonalized = profile.hasCompletedQuiz && currentProduct.personalScore !== undefined;
  const currentScore = showPersonalized ? currentProduct.personalScore! : currentProduct.healthScore;

  // Memoize product data to prevent unnecessary re-renders
  const productData = useMemo(() => ({
    name: currentProduct.name,
    healthScore: currentProduct.healthScore,
    personalScore: currentProduct.personalScore,
    calories: currentProduct.calories,
    protein: currentProduct.protein,
    sugar: currentProduct.sugar,
    sodium: currentProduct.sodium,
    ingredients: currentProduct.ingredients
  }), [currentProduct]);

  // Memoize user goals to prevent unnecessary re-renders
  const userGoals = useMemo(() => ({
    hasCompletedQuiz: profile.hasCompletedQuiz,
    goals: profile.goals
  }), [profile.hasCompletedQuiz, profile.goals]);

  const findBetterSwaps = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Finding better swaps for:', productData.name);
      console.log('User goals:', userGoals.goals);
      
      // Build personalized context based on user goals
      let personalizedContext = '';
      
      if (userGoals.hasCompletedQuiz && userGoals.goals) {
        const { dietGoal, healthGoal, bodyGoal, lifeGoal } = userGoals.goals;
        
        personalizedContext = `\n\nIMPORTANT: This user has specific goals that must be considered when recommending swaps:\n`;
        
        if (dietGoal === 'whole-foods') {
          personalizedContext += `- WHOLE FOODS DIET: Prioritize products with minimal processing, natural ingredients, no artificial additives.\n`;
        }
        if (dietGoal === 'vegan') {
          personalizedContext += `- VEGAN DIET: Only recommend plant-based products, no animal-derived ingredients.\n`;
        }
        if (dietGoal === 'vegetarian') {
          personalizedContext += `- VEGETARIAN DIET: No meat or fish products.\n`;
        }
        if (healthGoal === 'keto') {
          personalizedContext += `- KETO DIET: Prioritize very low-carb, high-fat alternatives.\n`;
        }
        if (dietGoal === 'gluten-free') {
          personalizedContext += `- GLUTEN-FREE DIET: Only gluten-free alternatives.\n`;
        }
        if (healthGoal === 'low-sugar') {
          personalizedContext += `- LOW SUGAR GOAL: Prioritize products with minimal sugar content.\n`;
        }
        if (healthGoal === 'high-protein') {
          personalizedContext += `- HIGH PROTEIN GOAL: Prioritize protein-rich alternatives.\n`;
        }
        if (bodyGoal === 'lose-weight') {
          personalizedContext += `- WEIGHT LOSS GOAL: Prioritize lower-calorie, more filling alternatives.\n`;
        }
        if (lifeGoal === 'clear-skin') {
          personalizedContext += `- CLEAR SKIN GOAL: Avoid processed foods, prioritize whole foods.\n`;
        }
        
        personalizedContext += `\nBe STRICT about these preferences. Only recommend products that align with their goals.`;
      }
      
      const messages = [
        {
          role: 'system' as const,
          content: `You are a nutrition expert AI that finds better product alternatives. Your goal is to recommend 3 healthier swaps for the given product that are:

1. In the SAME CATEGORY (if it's a protein bar, find better protein bars; if it's chips, find better chips)
2. ACTUALLY AVAILABLE in most grocery stores
3. SIGNIFICANTLY BETTER for the user's health goals
4. REALISTIC alternatives people would actually buy

${personalizedContext}

You MUST respond with ONLY a valid JSON array of exactly 3 products, no additional text. Each object should have:
- name: string (specific product name with brand if known)
- brand: string (brand name if known, otherwise "Various")
- score: number (estimated health score 1-100)
- personalScore: number (adjusted score based on user goals, can be different from base score)
- grade: string ("poor", "mediocre", "good", or "excellent")
- personalGrade: string (grade based on personal score)
- reasons: string[] (2-3 specific reasons why this is better)
- keyBenefits: string[] (2-3 key benefits for the user's goals)
- price: string (estimated price range like "$3-4" or "Similar price")
- availability: string (where to find it like "Most grocery stores" or "Whole Foods, Target")

Example format:
[
  {
    "name": "KIND Dark Chocolate Nuts & Sea Salt Bar",
    "brand": "KIND",
    "score": 78,
    "personalScore": 85,
    "grade": "good",
    "personalGrade": "excellent",
    "reasons": ["No artificial ingredients", "Higher protein content", "Lower sugar than current choice"],
    "keyBenefits": ["Supports your high-protein goal", "Whole food ingredients align with your preferences", "Better sustained energy"],
    "price": "$2-3",
    "availability": "Most grocery stores"
  }
]

Focus on products that are genuinely better, not just different. Make sure the personalScore reflects how well it fits their specific goals.`
        },
        {
          role: 'user' as const,
          content: `Please find 3 better alternatives for this product: "${productData.name}"

Current product details:
- Health Score: ${productData.healthScore}
- Personal Score: ${productData.personalScore || 'N/A'}
- Calories: ${productData.calories}
- Protein: ${productData.protein}g
- Sugar: ${productData.sugar}g
- Sodium: ${productData.sodium}mg
- Ingredients: ${(productData.ingredients || []).slice(0, 5).join(', ')}${(productData.ingredients || []).length > 5 ? '...' : ''}

Find products in the same category that would be significantly better for this user's goals.`
        }
      ];

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Better swaps AI result:', result);
      
      // Parse the AI response
      let cleanedResponse = result.completion.trim();
      
      // Look for JSON content
      const jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       cleanedResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                       cleanedResponse.match(/(\[[\s\S]*\])/);
      
      if (jsonMatch) {
        cleanedResponse = jsonMatch[1].trim();
      }
      
      // If it doesn't start with [, try to find the JSON array
      if (!cleanedResponse.startsWith('[')) {
        const startIndex = cleanedResponse.indexOf('[');
        const endIndex = cleanedResponse.lastIndexOf(']');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          cleanedResponse = cleanedResponse.substring(startIndex, endIndex + 1);
        }
      }
      
      console.log('Cleaned better swaps response:', cleanedResponse);
      
      const swapsData = JSON.parse(cleanedResponse);
      
      if (Array.isArray(swapsData) && swapsData.length > 0) {
        setSwaps(swapsData.slice(0, 3)); // Ensure we only show 3 swaps
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (error) {
      console.error('Error finding better swaps:', error);
      setError('Unable to find better alternatives right now. Please try again later.');
      
      // Fallback swaps based on product category
      const fallbackSwaps: BetterSwap[] = [
        {
          name: 'Whole Food Alternative',
          brand: 'Various',
          score: Math.min(100, currentScore + 20),
          personalScore: Math.min(100, currentScore + 25),
          grade: 'good',
          personalGrade: 'excellent',
          reasons: ['Less processed ingredients', 'Better nutritional profile', 'Fewer additives'],
          keyBenefits: ['Supports your health goals', 'More natural ingredients', 'Better long-term health'],
          price: 'Similar price',
          availability: 'Most grocery stores'
        },
        {
          name: 'Organic Option',
          brand: 'Various',
          score: Math.min(100, currentScore + 15),
          personalScore: Math.min(100, currentScore + 20),
          grade: 'good',
          personalGrade: 'good',
          reasons: ['Organic certification', 'No synthetic pesticides', 'Higher quality ingredients'],
          keyBenefits: ['Cleaner ingredients', 'Environmental benefits', 'Potentially better nutrition'],
          price: '$1-2 more',
          availability: 'Whole Foods, most supermarkets'
        },
        {
          name: 'Homemade Version',
          brand: 'DIY',
          score: Math.min(100, currentScore + 30),
          personalScore: Math.min(100, currentScore + 35),
          grade: 'excellent',
          personalGrade: 'excellent',
          reasons: ['Complete control over ingredients', 'No preservatives', 'Customizable to your needs'],
          keyBenefits: ['Perfect for your dietary goals', 'Cost effective', 'Freshest option'],
          price: 'Often cheaper',
          availability: 'Make at home'
        }
      ];
      
      setSwaps(fallbackSwaps);
    } finally {
      setIsLoading(false);
    }
  }, [productData, userGoals, currentScore]);

  const handleAddToGroceryList = useCallback(async (swapName: string, swapBrand: string, swap: BetterSwap) => {
    try {
      // Light haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.selectionAsync();
      }
      
      setAddingToList(swapName);
      const itemName = swapBrand && swapBrand !== 'Various' ? `${swapName} (${swapBrand})` : swapName;
      
      // Include score analysis data when adding to grocery list
      const productDetails = {
        healthScore: swap.score,
        personalScore: swap.personalScore,
        // Use current product's nutritional data as base since swap data might not have detailed nutrition
        calories: currentProduct.calories,
        protein: currentProduct.protein,
        // Store reference to the original scan for potential future use
        scanHistoryId: undefined, // This would be set if we had scan history integration
      };
      
      await addItem(itemName, productDetails);
      console.log('Added to grocery list with score analysis:', itemName, productDetails);
      
      // Show toast notification
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error('Error adding to grocery list:', error);
    } finally {
      setAddingToList(null);
    }
  }, [addItem, currentProduct]);

  useEffect(() => {
    if (visible) {
      findBetterSwaps();
    }
  }, [visible, findBetterSwaps]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#4EC9F5', '#7ED9CF', '#F9BFC9', '#FF9E57']}
        locations={[0, 0.33, 0.66, 1]}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderBottomColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Better Bites</Text>
            <Text style={[styles.headerSubtitle, { color: 'rgba(255, 255, 255, 0.8)' }]}>AI-powered alternatives for your goals</Text>
          </View>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>



        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={[styles.loadingText, { color: '#FFFFFF' }]}>Finding better alternatives...</Text>
              <Text style={[styles.loadingSubtext, { color: 'rgba(255, 255, 255, 0.8)' }]}>Analyzing products that match your goals</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertTriangle size={48} color="#FFFFFF" />
              <Text style={[styles.errorTitle, { color: '#FFFFFF' }]}>Couldn&apos;t Find Swaps</Text>
              <Text style={[styles.errorText, { color: 'rgba(255, 255, 255, 0.8)' }]}>{error}</Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
                onPress={findBetterSwaps}
                activeOpacity={0.7}
              >
                <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.swapsContainer}>
              <Text style={[styles.swapsTitle, { color: '#FFFFFF' }]}>Recommended for You</Text>
              
              {swaps.map((swap, index) => {
                const displayScore = showPersonalized ? swap.personalScore || swap.score : swap.score;
                const improvement = displayScore - currentScore;
                
                return (
                  <View key={index} style={[styles.swapCard, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                    {/* Comparison Layout */}
                    <View style={styles.comparisonContainer}>
                      {/* Current Choice */}
                      <View style={styles.comparisonSide}>
                        <Text style={[styles.comparisonLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>Current</Text>
                        <Text style={[styles.comparisonProductName, { color: '#FFFFFF' }]} numberOfLines={2}>
                          {currentProduct.name}
                        </Text>
                        <View style={styles.scoreRing}>
                          <View style={[styles.scoreRingInner, { borderColor: getScoreColor(currentScore), backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                            <Text style={[styles.scoreNumber, { color: getScoreColor(currentScore) }]}>
                              {Math.round(currentScore)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Arrow & Improvement */}
                      <View style={styles.comparisonArrow}>
                        <ArrowRight size={20} color="rgba(255, 255, 255, 0.8)" />
                        {improvement > 0 && (
                          <View style={styles.improvementIndicator}>
                            {getScoreIcon(improvement)}
                            <Text style={styles.improvementValue}>+{Math.round(improvement)}</Text>
                          </View>
                        )}
                      </View>

                      {/* Recommended Choice */}
                      <View style={styles.comparisonSide}>
                        <Text style={[styles.comparisonLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>Swap</Text>
                        <Text style={[styles.comparisonProductName, { color: '#FFFFFF' }]} numberOfLines={2}>
                          {swap.name}
                        </Text>
                        <View style={styles.scoreRing}>
                          <View style={[styles.scoreRingInner, { borderColor: getScoreColor(displayScore), backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                            <Text style={[styles.scoreNumber, { color: getScoreColor(displayScore) }]}>
                              {Math.round(displayScore)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Why It's Better - Condensed */}
                    <View style={styles.benefitsCondensed}>
                      <Text style={[styles.benefitsCondensedTitle, { color: '#FFFFFF' }]}>Better for you:</Text>
                      <View style={styles.benefitsList}>
                        {swap.reasons.slice(0, 3).map((reason, reasonIndex) => (
                          <View key={reasonIndex} style={styles.benefitItemCondensed}>
                            {getBenefitIcon(reason, 'rgba(255, 255, 255, 0.8)')}
                            <Text style={[styles.benefitTextCondensed, { color: 'rgba(255, 255, 255, 0.8)' }]}>{reason}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Add to Grocery List Button */}
                    <TouchableOpacity 
                      style={[styles.addToListButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
                      onPress={() => handleAddToGroceryList(swap.name, swap.brand || '', swap)}
                      disabled={addingToList === swap.name}
                      activeOpacity={0.7}
                    >
                      {addingToList === swap.name ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Plus size={16} color="#FFFFFF" />
                      )}
                      <Text style={[styles.addToListButtonText, { color: '#FFFFFF' }]}>
                        {addingToList === swap.name ? 'Adding...' : 'Save Swap'}
                      </Text>
                    </TouchableOpacity>

                    {/* Price & Availability - Footer Strip */}
                    <View style={[styles.footerStrip, { borderTopColor: 'rgba(255, 255, 255, 0.2)' }]}>
                      <View style={styles.footerItem}>
                        <DollarSign size={14} color="rgba(255, 255, 255, 0.8)" />
                        <Text style={[styles.footerText, { color: 'rgba(255, 255, 255, 0.8)' }]}>{swap.price}</Text>
                      </View>
                      <View style={[styles.footerSeparator, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]} />
                      <View style={styles.footerItem}>
                        <MapPin size={14} color="rgba(255, 255, 255, 0.8)" />
                        <Text style={[styles.footerText, { color: 'rgba(255, 255, 255, 0.8)' }]}>{swap.availability}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderTopColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <TouchableOpacity 
            style={[styles.doneButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.doneButtonText, { color: '#FFFFFF' }]}>Continue</Text>
          </TouchableOpacity>
        </View>
        
        {/* Toast Notification */}
        <ToastNotification 
          visible={showToast} 
          message="Added to your grocery list" 
        />
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backdropFilter: 'blur(10px)',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },

  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000', // Will be overridden by theme
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#333333', // Will be overridden by theme
    marginTop: 4,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000', // Will be overridden by theme
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#333333', // Will be overridden by theme
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#FF0040', // Will be overridden by theme
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF', // Will be overridden by theme
    fontSize: 16,
    fontWeight: 'bold',
  },
  swapsContainer: {
    padding: 16,
  },
  swapsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000', // Will be overridden by theme
    marginBottom: 24,
    textAlign: 'center',
  },
  swapCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  comparisonSide: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333', // Will be overridden by theme
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  comparisonProductName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000', // Will be overridden by theme
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  scoreRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF', // Will be overridden by theme
  },
  scoreNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  comparisonArrow: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  improvementIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  improvementValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
    marginLeft: 4,
  },
  benefitsCondensed: {
    marginBottom: 20,
  },
  benefitsCondensedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000', // Will be overridden by theme
    marginBottom: 12,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItemCondensed: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitTextCondensed: {
    fontSize: 14,
    color: '#333333', // Will be overridden by theme
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  footerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#333333', // Will be overridden by theme
    marginLeft: 4,
  },
  footerSeparator: {
    width: 1,
    height: 12,
    backgroundColor: '#E0E0E0', // Will be overridden by theme
    marginHorizontal: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    backdropFilter: 'blur(10px)',
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  doneButtonText: {
    color: '#000000', // Will be overridden by theme
    fontSize: 16,
    fontWeight: '600',
  },
  addToListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addToListButtonText: {
    color: '#FFFFFF', // Will be overridden by theme
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
});