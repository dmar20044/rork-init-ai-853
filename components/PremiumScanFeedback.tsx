import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Platform,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Zap,
  Star,
  Heart,
  ArrowRight,
  List,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  TrendingDown,
  TrendingUp,

  Award,
  Shield,
  Target,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { NutritionInfo } from '@/services/foodAnalysis';
import ParticleEffects from './ParticleEffects';
import BetterSwapsModal from './BetterSwapsModal';

import { getParticleEffect, getLoadingMessages } from '@/utils/toneOfVoice';
import { useUser, UserGoals } from '@/contexts/UserContext';
import { useGroceryList } from '@/contexts/GroceryListContext';

interface IngredientAnalysis {
  ingredient: string;
  description: string;
  isGood: boolean;
  purpose: string;
}

interface PremiumScanFeedbackProps {
  nutrition: NutritionInfo;
  imageUri?: string;
  onScanAnother: () => void;
  onSaveToHistory: () => void;
  isLoading?: boolean;
  onBack?: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

// Helper functions for personalization breakdown
const getHealthGoalRating = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.healthGoal) return 'N/A';
  
  const sugar = nutrition.sugar;
  const protein = nutrition.protein;
  const fat = nutrition.fat;
  const carbs = nutrition.carbs;
  
  switch (goals.healthGoal) {
    case 'low-sugar':
      if (sugar <= 3) return 'Excellent';
      if (sugar <= 6) return 'Good';
      if (sugar <= 10.5) return 'Fair';
      return 'Poor';
    case 'high-protein':
      if (protein >= 20) return 'Excellent';
      if (protein >= 15) return 'Good';
      if (protein >= 8) return 'Fair';
      return 'Poor';
    case 'low-fat':
      if (fat <= 3) return 'Excellent';
      if (fat <= 8) return 'Good';
      if (fat <= 15) return 'Fair';
      return 'Poor';
    case 'keto':
      if (carbs <= 5) return 'Excellent';
      if (carbs <= 10) return 'Good';
      if (carbs <= 20) return 'Fair';
      return 'Poor';
    case 'balanced':
      const score = nutrition.personalScore || nutrition.healthScore;
      if (score >= 75) return 'Excellent';
      if (score >= 60) return 'Good';
      if (score >= 45) return 'Fair';
      return 'Poor';
    default:
      return 'N/A';
  }
};

const getHealthGoalRatingColor = (nutrition: NutritionInfo, goals: UserGoals): string => {
  const rating = getHealthGoalRating(nutrition, goals);
  switch (rating) {
    case 'Excellent': return Colors.scoreExcellent;
    case 'Good': return Colors.scoreGood;
    case 'Fair': return Colors.scoreMediocre;
    case 'Poor': return Colors.error;
    default: return Colors.retroSlateGray;
  }
};

const getHealthGoalDescription = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.healthGoal) return 'No health goal set';
  
  const sugar = nutrition.sugar;
  const protein = nutrition.protein;
  const fat = nutrition.fat;
  const carbs = nutrition.carbs;
  
  switch (goals.healthGoal) {
    case 'low-sugar':
      return `Contains ${sugar}g sugar per serving. ${sugar <= 6 ? 'Aligns well with your low-sugar goal.' : 'May conflict with your low-sugar goal.'}`;
    case 'high-protein':
      return `Provides ${protein}g protein per serving. ${protein >= 15 ? 'Great protein source for your goals.' : 'Could use more protein for your goals.'}`;
    case 'low-fat':
      return `Contains ${fat}g fat per serving. ${fat <= 8 ? 'Fits your low-fat preference.' : 'Higher fat content than ideal for your goals.'}`;
    case 'keto':
      return `Has ${carbs}g carbs per serving. ${carbs <= 10 ? 'Keto-friendly carb level.' : 'Too many carbs for strict keto.'}`;
    case 'balanced':
      return 'Evaluated for overall nutritional balance and quality.';
    default:
      return 'Health goal evaluation not available.';
  }
};

const getDietGoalRating = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.dietGoal) return 'N/A';
  
  const ingredients = (nutrition.ingredients || []).join(' ').toLowerCase();
  const additives = nutrition.additives || [];
  
  switch (goals.dietGoal) {
    case 'whole-foods':
      if (additives.length === 0 && !ingredients.includes('artificial')) return 'Excellent';
      if (additives.length <= 2) return 'Good';
      if (additives.length <= 5) return 'Fair';
      return 'Poor';
    case 'vegan':
      const hasAnimal = /milk|whey|casein|egg|honey|gelatin|fish|chicken|beef|pork|dairy|butter|cheese|yogurt|cream|lactose/.test(ingredients);
      return hasAnimal ? 'Poor' : 'Excellent';
    case 'vegetarian':
      const hasMeat = /gelatin|fish|chicken|beef|pork|meat|poultry|seafood|anchovy/.test(ingredients);
      return hasMeat ? 'Poor' : 'Excellent';
    case 'gluten-free':
      const hasGluten = /wheat|barley|rye|malt|spelt|farro|semolina|triticale|gluten/.test(ingredients);
      return hasGluten ? 'Poor' : 'Excellent';
    case 'balanced':
      const score = nutrition.personalScore || nutrition.healthScore;
      if (score >= 75) return 'Excellent';
      if (score >= 60) return 'Good';
      if (score >= 45) return 'Fair';
      return 'Poor';
    default:
      return 'N/A';
  }
};

const getDietGoalRatingColor = (nutrition: NutritionInfo, goals: UserGoals): string => {
  const rating = getDietGoalRating(nutrition, goals);
  switch (rating) {
    case 'Excellent': return Colors.scoreExcellent;
    case 'Good': return Colors.scoreGood;
    case 'Fair': return Colors.scoreMediocre;
    case 'Poor': return Colors.error;
    default: return Colors.retroSlateGray;
  }
};

const getDietGoalDescription = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.dietGoal) return 'No diet preference set';
  
  const ingredients = (nutrition.ingredients || []).join(' ').toLowerCase();
  const additives = nutrition.additives || [];
  
  switch (goals.dietGoal) {
    case 'whole-foods':
      return `Contains ${additives.length} additives. ${additives.length <= 2 ? 'Minimal processing aligns with whole foods.' : 'More processed than ideal for whole foods.'}`;
    case 'vegan':
      const hasAnimal = /milk|whey|casein|egg|honey|gelatin|fish|chicken|beef|pork|dairy|butter|cheese|yogurt|cream|lactose/.test(ingredients);
      return hasAnimal ? 'Contains animal-derived ingredients.' : 'Plant-based and vegan-friendly.';
    case 'vegetarian':
      const hasMeat = /gelatin|fish|chicken|beef|pork|meat|poultry|seafood|anchovy/.test(ingredients);
      return hasMeat ? 'Contains meat or fish ingredients.' : 'Vegetarian-friendly ingredients.';
    case 'gluten-free':
      const hasGluten = /wheat|barley|rye|malt|spelt|farro|semolina|triticale|gluten/.test(ingredients);
      return hasGluten ? 'Contains gluten-containing ingredients.' : 'Gluten-free ingredients.';
    case 'balanced':
      return 'Evaluated for overall dietary balance and variety.';
    default:
      return 'Diet preference evaluation not available.';
  }
};

const getBodyGoalRating = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.bodyGoal) return 'N/A';
  
  const calories = nutrition.calories;
  const protein = nutrition.protein;
  const sugar = nutrition.sugar;
  
  switch (goals.bodyGoal) {
    case 'lose-weight':
      if (calories <= 150 && sugar <= 5) return 'Excellent';
      if (calories <= 250 && sugar <= 8) return 'Good';
      if (calories <= 350) return 'Fair';
      return 'Poor';
    case 'slightly-lose-weight':
      if (calories <= 200 && sugar <= 8) return 'Excellent';
      if (calories <= 300 && sugar <= 10) return 'Good';
      if (calories <= 400) return 'Fair';
      return 'Poor';
    case 'maintain-weight':
      if (calories <= 300 && protein >= 8) return 'Excellent';
      if (calories <= 400) return 'Good';
      if (calories <= 500) return 'Fair';
      return 'Poor';
    case 'slightly-gain-weight':
      if (protein >= 15 && calories >= 200) return 'Excellent';
      if (protein >= 10 && calories >= 150) return 'Good';
      if (calories >= 100) return 'Fair';
      return 'Poor';
    case 'gain-weight':
      if (protein >= 20 && calories >= 300) return 'Excellent';
      if (protein >= 15 && calories >= 200) return 'Good';
      if (calories >= 150) return 'Fair';
      return 'Poor';
    default:
      return 'N/A';
  }
};

const getBodyGoalRatingColor = (nutrition: NutritionInfo, goals: UserGoals): string => {
  const rating = getBodyGoalRating(nutrition, goals);
  switch (rating) {
    case 'Excellent': return Colors.scoreExcellent;
    case 'Good': return Colors.scoreGood;
    case 'Fair': return Colors.scoreMediocre;
    case 'Poor': return Colors.error;
    default: return Colors.retroSlateGray;
  }
};

const getBodyGoalDescription = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.bodyGoal) return 'No body goal set';
  
  const calories = nutrition.calories;
  const protein = nutrition.protein;
  
  switch (goals.bodyGoal) {
    case 'lose-weight':
      return `${calories} calories per serving. ${calories <= 250 ? 'Good for weight loss.' : 'Higher calories may slow weight loss.'}`;
    case 'slightly-lose-weight':
      return `${calories} calories per serving. ${calories <= 300 ? 'Suitable for gradual weight loss.' : 'Moderate calories for slow weight loss.'}`;
    case 'maintain-weight':
      return `${calories} calories with ${protein}g protein. ${protein >= 8 ? 'Good balance for maintenance.' : 'Could use more protein for maintenance.'}`;
    case 'slightly-gain-weight':
      return `${calories} calories with ${protein}g protein. ${protein >= 10 ? 'Good for gradual weight gain.' : 'More protein would help weight gain goals.'}`;
    case 'gain-weight':
      return `${calories} calories with ${protein}g protein. ${protein >= 15 ? 'Excellent for weight gain.' : 'Higher protein would better support weight gain.'}`;
    default:
      return 'Body goal evaluation not available.';
  }
};

const getLifeGoalRating = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.lifeGoal) return 'N/A';
  
  const sugar = nutrition.sugar;
  const additives = nutrition.additives || [];
  const protein = nutrition.protein;
  
  switch (goals.lifeGoal) {
    case 'eat-healthier':
      if (additives.length <= 2 && sugar <= 6) return 'Excellent';
      if (additives.length <= 5 && sugar <= 10) return 'Good';
      if (additives.length <= 8) return 'Fair';
      return 'Poor';
    case 'boost-energy':
      if (protein >= 10 && sugar <= 8 && additives.length <= 3) return 'Excellent';
      if (protein >= 5 && sugar <= 12) return 'Good';
      if (sugar <= 15) return 'Fair';
      return 'Poor';
    case 'feel-better':
      if (protein >= 8 && sugar <= 10) return 'Excellent';
      if (protein >= 5 && sugar <= 15) return 'Good';
      if (sugar <= 20) return 'Fair';
      return 'Poor';
    case 'clear-skin':
      if (additives.length <= 1 && sugar <= 5) return 'Excellent';
      if (additives.length <= 3 && sugar <= 8) return 'Good';
      if (sugar <= 12) return 'Fair';
      return 'Poor';
    default:
      return 'N/A';
  }
};

const getLifeGoalRatingColor = (nutrition: NutritionInfo, goals: UserGoals): string => {
  const rating = getLifeGoalRating(nutrition, goals);
  switch (rating) {
    case 'Excellent': return Colors.scoreExcellent;
    case 'Good': return Colors.scoreGood;
    case 'Fair': return Colors.scoreMediocre;
    case 'Poor': return Colors.error;
    default: return Colors.retroSlateGray;
  }
};

const getLifeGoalDescription = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.lifeGoal) return 'No life goal set';
  
  const sugar = nutrition.sugar;
  const additives = nutrition.additives || [];
  
  switch (goals.lifeGoal) {
    case 'eat-healthier':
      return `${additives.length} additives, ${sugar}g sugar. ${additives.length <= 5 && sugar <= 10 ? 'Supports healthier eating.' : 'More processed than ideal for health goals.'}`;
    case 'boost-energy':
      return `${sugar}g sugar per serving. ${sugar <= 8 ? 'Won\'t cause energy crashes.' : 'High sugar may lead to energy crashes.'}`;
    case 'feel-better':
      return `Balanced nutrition profile. ${sugar <= 10 ? 'Should support feeling better.' : 'High sugar may affect how you feel.'}`;
    case 'clear-skin':
      return `${additives.length} additives, ${sugar}g sugar. ${additives.length <= 3 && sugar <= 8 ? 'Skin-friendly ingredients.' : 'May not be ideal for clear skin goals.'}`;
    default:
      return 'Life goal evaluation not available.';
  }
};

// Helper function to convert rating to numerical score for bar display
const getGoalRatingScore = (rating: string): number => {
  switch (rating) {
    case 'Excellent': return 85;
    case 'Good': return 70;
    case 'Fair': return 50;
    case 'Poor': return 25;
    default: return 0;
  }
};

export default function PremiumScanFeedback({
  nutrition,
  imageUri,
  onScanAnother,
  onSaveToHistory,
  isLoading = false,
  onBack,
}: PremiumScanFeedbackProps) {
  const { profile } = useUser();
  const { addItem } = useGroceryList();
  const { colors } = useTheme();
  const showPersonalized = profile.hasCompletedQuiz && nutrition.personalScore !== undefined;
  const [showParticles, setShowParticles] = useState<boolean>(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState<number>(0);
  const [loadingAnimations, setLoadingAnimations] = useState<Animated.Value[]>([]);
  const [fireworksActive, setFireworksActive] = useState<boolean>(false);
  const [sparklePositions, setSparklePositions] = useState<{x: number, y: number, scale: Animated.Value, opacity: Animated.Value}[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const progressBarWidth = useRef(new Animated.Value(0)).current;
  const [ingredientAnalysis, setIngredientAnalysis] = useState<IngredientAnalysis[]>([]);
  const [isAnalyzingIngredients, setIsAnalyzingIngredients] = useState<boolean>(false);
  const [expandedIngredients, setExpandedIngredients] = useState<Set<number>>(new Set());
  const [isIngredientSectionExpanded, setIsIngredientSectionExpanded] = useState<boolean>(false);
  const ingredientSectionHeight = useRef(new Animated.Value(0)).current;
  const [showBetterSwapsModal, setShowBetterSwapsModal] = useState<boolean>(false);
  const [forYouAnalysis, setForYouAnalysis] = useState<string>('');
  const [isAnalyzingForYou, setIsAnalyzingForYou] = useState<boolean>(false);
  const [isForYouSectionExpanded, setIsForYouSectionExpanded] = useState<boolean>(false);
  const forYouSectionHeight = useRef(new Animated.Value(0)).current;
  const [allergenWarnings, setAllergenWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const tabTranslateX = useRef(new Animated.Value(0)).current;
  
  const slideUpValue = useRef(new Animated.Value(screenHeight)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  
  const loadingMessages = getLoadingMessages();
  
  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Much more sensitive horizontal detection
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy) * 0.8;
      },
      onPanResponderGrant: () => {
        // Stop any ongoing animations when user starts panning
        tabTranslateX.stopAnimation();
        // Add haptic feedback on start
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync();
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx } = gestureState;
        const screenWidth = Dimensions.get('window').width;
        
        // Calculate the base translation based on current active tab
        const baseTranslation = activeTab === 0 ? 0 : -screenWidth;
        let translationX = baseTranslation + dx;
        
        // Add resistance when trying to swipe beyond available tabs
        if (translationX > 0) {
          // Resistance when swiping right beyond first tab
          translationX = dx * 0.3;
        } else if (translationX < -screenWidth) {
          // Resistance when swiping left beyond last tab
          translationX = -screenWidth + (dx + screenWidth) * 0.3;
        }
        
        tabTranslateX.setValue(translationX);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, vx } = gestureState;
        const screenWidth = Dimensions.get('window').width;
        
        // Much more sensitive thresholds
        const distanceThreshold = screenWidth * 0.25; // 25% of screen width
        const velocityThreshold = 0.3;
        
        // Determine if we should switch tabs
        const shouldSwitchByDistance = Math.abs(dx) > distanceThreshold;
        const shouldSwitchByVelocity = Math.abs(vx) > velocityThreshold;
        const shouldSwitch = shouldSwitchByDistance || shouldSwitchByVelocity;
        
        let targetTab = activeTab;
        let targetTranslation = activeTab === 0 ? 0 : -screenWidth;
        
        if (shouldSwitch) {
          if (dx > 0 && activeTab === 1) {
            // Swipe right - go to tab 0
            targetTab = 0;
            targetTranslation = 0;
          } else if (dx < 0 && activeTab === 0) {
            // Swipe left - go to tab 1
            targetTab = 1;
            targetTranslation = -screenWidth;
          }
        }
        
        if (targetTab !== activeTab) {
          setActiveTab(targetTab);
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
        
        Animated.spring(tabTranslateX, {
          toValue: targetTranslation,
          tension: 120,
          friction: 9,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        // Handle termination with smooth snap back
        const screenWidth = Dimensions.get('window').width;
        const targetTranslation = activeTab === 0 ? 0 : -screenWidth;
        Animated.spring(tabTranslateX, {
          toValue: targetTranslation,
          tension: 120,
          friction: 9,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;
  
  useEffect(() => {
    if (isLoading) {
      // Initialize loading animations
      const animations = Array.from({ length: 8 }, () => new Animated.Value(0));
      setLoadingAnimations(animations);
      
      // Start continuous loading animations
      const startLoadingAnimations = () => {
        animations.forEach((anim, index) => {
          Animated.loop(
            Animated.sequence([
              Animated.delay(index * 200),
              Animated.timing(anim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
              }),
            ])
          ).start();
        });
      };
      
      startLoadingAnimations();
      
      // Create sparkle effects
      const createSparkles = () => {
        const newSparkles = Array.from({ length: 12 }, (_, i) => ({
          x: Math.random() * 300,
          y: Math.random() * 400,
          scale: new Animated.Value(0),
          opacity: new Animated.Value(0),
        }));
        
        setSparklePositions(newSparkles);
        
        newSparkles.forEach((sparkle, index) => {
          Animated.loop(
            Animated.sequence([
              Animated.delay(index * 150),
              Animated.parallel([
                Animated.timing(sparkle.scale, {
                  toValue: 1,
                  duration: 600,
                  useNativeDriver: true,
                }),
                Animated.timing(sparkle.opacity, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }),
              ]),
              Animated.parallel([
                Animated.timing(sparkle.scale, {
                  toValue: 0,
                  duration: 600,
                  useNativeDriver: true,
                }),
                Animated.timing(sparkle.opacity, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: true,
                }),
              ]),
            ])
          ).start();
        });
      };
      
      createSparkles();
      
      // Activate fireworks periodically
      const fireworksInterval = setInterval(() => {
        setFireworksActive(true);
        setTimeout(() => setFireworksActive(false), 1000);
      }, 2000);
      
      // Change loading messages and update progress
      const messageInterval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 800);
      
      // Simulate progress bar filling up
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          const newProgress = Math.min(prev + Math.random() * 15 + 5, 95); // Random increment between 5-20%
          
          Animated.timing(progressBarWidth, {
            toValue: newProgress,
            duration: 300,
            useNativeDriver: false,
          }).start();
          
          return newProgress;
        });
      }, 600);
      
      return () => {
        clearInterval(fireworksInterval);
        clearInterval(messageInterval);
        clearInterval(progressInterval);
      };
    }
  }, [isLoading, loadingMessages.length, progressBarWidth]);
  
  useEffect(() => {
    if (!isLoading && nutrition) {
      Animated.parallel([
        Animated.spring(slideUpValue, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading, nutrition, slideUpValue, cardScale, cardOpacity]);
  
  const getScoreColor = (score: number) => {
    if (score >= 86) return Colors.scoreExcellent; // Bright green for excellent (86-100)
    if (score >= 75) return Colors.scoreGood;      // Green for good (75-85)
    if (score >= 55) return Colors.scoreMediocre;  // Yellow for mediocre (55-74)
    if (score >= 41) return Colors.scorePoor;      // Orange for bad (41-54)
    return Colors.error;                           // Red for be aware (0-40)
  };

  const getScoreStatus = (score: number) => {
    if (score >= 86) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 55) return 'Mediocre';
    if (score >= 41) return 'Poor';
    return 'Caution';
  };
  
  const handleScoreAnimationComplete = () => {
    const particleType = getParticleEffect(nutrition.healthScore);
    if (particleType !== 'none') {
      setShowParticles(true);
    }
  };

  const toggleIngredientExpansion = (index: number) => {
    setExpandedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleIngredientSection = () => {
    const toValue = isIngredientSectionExpanded ? 0 : 1;
    setIsIngredientSectionExpanded(!isIngredientSectionExpanded);
    
    Animated.timing(ingredientSectionHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const toggleForYouSection = () => {
    const toValue = isForYouSectionExpanded ? 0 : 1;
    setIsForYouSectionExpanded(!isForYouSectionExpanded);
    
    Animated.timing(forYouSectionHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const analyzeIngredients = useCallback(async (ingredients: string[]) => {
    if (!ingredients || ingredients.length === 0) return;
    
    setIsAnalyzingIngredients(true);
    console.log('Analyzing ingredients:', ingredients);
    console.log('User goals:', profile.goals);
    console.log('User dietary restrictions:', profile.dietaryRestrictions);
    
    // Check for allergen warnings first
    const warnings: string[] = [];
    if (profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0) {
      profile.dietaryRestrictions.forEach(restriction => {
        const restrictionLower = restriction.toLowerCase();
        const hasRestriction = ingredients.some(ingredient => {
          const ingredientLower = ingredient.toLowerCase();
          
          // Check for common allergen patterns
          if (restrictionLower.includes('dairy') || restrictionLower.includes('milk')) {
            return ingredientLower.includes('milk') || ingredientLower.includes('cheese') || 
                   ingredientLower.includes('butter') || ingredientLower.includes('cream') ||
                   ingredientLower.includes('whey') || ingredientLower.includes('casein') ||
                   ingredientLower.includes('lactose') || ingredientLower.includes('yogurt');
          }
          if (restrictionLower.includes('gluten') || restrictionLower.includes('wheat')) {
            return ingredientLower.includes('wheat') || ingredientLower.includes('barley') ||
                   ingredientLower.includes('rye') || ingredientLower.includes('gluten') ||
                   ingredientLower.includes('flour') || ingredientLower.includes('malt');
          }
          if (restrictionLower.includes('soy')) {
            return ingredientLower.includes('soy') || ingredientLower.includes('soybean') ||
                   ingredientLower.includes('lecithin') || ingredientLower.includes('tofu');
          }
          if (restrictionLower.includes('nut') || restrictionLower.includes('tree nut')) {
            return ingredientLower.includes('almond') || ingredientLower.includes('walnut') ||
                   ingredientLower.includes('cashew') || ingredientLower.includes('pecan') ||
                   ingredientLower.includes('hazelnut') || ingredientLower.includes('pistachio');
          }
          if (restrictionLower.includes('peanut')) {
            return ingredientLower.includes('peanut');
          }
          if (restrictionLower.includes('egg')) {
            return ingredientLower.includes('egg') || ingredientLower.includes('albumin');
          }
          if (restrictionLower.includes('fish') || restrictionLower.includes('seafood')) {
            return ingredientLower.includes('fish') || ingredientLower.includes('salmon') ||
                   ingredientLower.includes('tuna') || ingredientLower.includes('anchovy') ||
                   ingredientLower.includes('shrimp') || ingredientLower.includes('crab');
          }
          
          // Generic check for exact matches
          return ingredientLower.includes(restrictionLower) || restrictionLower.includes(ingredientLower);
        });
        
        if (hasRestriction) {
          warnings.push(`Contains ${restriction} - This product may not be suitable for your dietary restrictions`);
        }
      });
    }
    
    setAllergenWarnings(warnings);
    
    try {
      // Build personalized context based on user goals
      let personalizedContext = '';
      
      if (profile.hasCompletedQuiz && profile.goals) {
        const { dietGoal, healthGoal, bodyGoal } = profile.goals;
        
        personalizedContext = `\n\nIMPORTANT: This user has specific dietary goals that must be considered when evaluating ingredients:\n`;
        
        if (dietGoal === 'whole-foods') {
          personalizedContext += `- WHOLE FOODS DIET: Mark ANY processed ingredients, artificial additives, preservatives, emulsifiers, stabilizers, artificial colors, artificial flavors, or refined ingredients as BAD (isGood: false). Only natural, unprocessed ingredients should be marked as good.\n`;
        }
        if (dietGoal === 'vegan') {
          personalizedContext += `- VEGAN DIET: Mark ANY animal-derived ingredients (dairy, eggs, meat, gelatin, etc.) as BAD (isGood: false).\n`;
        }
        if (dietGoal === 'vegetarian') {
          personalizedContext += `- VEGETARIAN DIET: Mark meat and fish ingredients as BAD (isGood: false).\n`;
        }
        if (healthGoal === 'keto') {
          personalizedContext += `- KETO DIET: Mark high-carb ingredients (sugar, flour, starch, grains) as BAD (isGood: false).\n`;
        }
        if (dietGoal === 'gluten-free') {
          personalizedContext += `- GLUTEN-FREE DIET: Mark gluten-containing ingredients (wheat, barley, rye) as BAD (isGood: false).\n`;
        }
        if (healthGoal === 'low-sugar') {
          personalizedContext += `- LOW SUGAR GOAL: Mark ALL forms of sugar and sweeteners as BAD (isGood: false) - including sugar, high fructose corn syrup, cane sugar, honey, agave, etc.\n`;
        }
        if (healthGoal === 'low-fat') {
          personalizedContext += `- LOW FAT GOAL: Mark high-fat ingredients (oils, butter, nuts in large quantities) as BAD (isGood: false).\n`;
        }
        if (healthGoal === 'high-protein') {
          personalizedContext += `- HIGH PROTEIN GOAL: Mark protein sources as GOOD (isGood: true) and low-protein fillers as less favorable.\n`;
        }
        if (bodyGoal === 'lose-weight') {
          personalizedContext += `- WEIGHT LOSS GOAL: Be extra strict on high-calorie, processed ingredients. Mark calorie-dense additives as BAD (isGood: false).\n`;
        }
        
        personalizedContext += `\nBe STRICT and PERSONALIZED. If an ingredient conflicts with their goals, mark it as BAD even if it might be okay for others.`;
      }
      
      const messages = [
        {
          role: 'system' as const,
          content: `You are a nutrition expert AI that analyzes food ingredients with a focus on personalized dietary goals and comprehensive health education. For each ingredient provided, give a detailed analysis including:

1. Whether it's good or bad for health (considering the user's specific goals)
2. What it does to the body (physiological effects)
3. Its purpose in the food product (functional role)
4. Specific health impacts and mechanisms

${personalizedContext}

IMPORTANT ANALYSIS REQUIREMENTS:
- Provide ACCURATE and DETAILED health information for each ingredient
- Explain the biological mechanisms and effects on the body
- Consider both immediate and long-term health impacts
- Be specific about why an ingredient is good or bad for the user's goals
- Include information about absorption, metabolism, and cellular effects
- Mention any potential interactions or cumulative effects

Respond with ONLY a valid JSON array, no additional text. Each object should have:
- ingredient: string (the ingredient name exactly as provided)
- description: string (detailed health impact considering user goals, 2-3 sentences explaining mechanisms)
- isGood: boolean (true if aligns with user goals, false if conflicts)
- purpose: string (detailed explanation of why it's in the product and its functional role)

Example format:
[
  {
    "ingredient": "High Fructose Corn Syrup",
    "description": "Conflicts with your low-sugar goal. This processed sweetener bypasses normal glucose metabolism, going directly to the liver where it's converted to fat, promoting insulin resistance and inflammation. Unlike glucose, it doesn't trigger satiety hormones, leading to overconsumption.",
    "isGood": false,
    "purpose": "Used as a cheap sweetener and preservative that extends shelf life while providing intense sweetness that enhances palatability and food addiction potential."
  }
]`
        },
        {
          role: 'user' as const,
          content: `Please analyze these ingredients with detailed health information: ${ingredients.join(', ')}

For each ingredient, I need to understand:
1. How it affects my body at the cellular level
2. Whether it supports or hinders my specific health goals
3. What role it plays in this food product
4. Any potential long-term health implications

Be thorough and educational - this information helps me make informed food choices.`
        }
      ];

      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Ingredient analysis result:', result);
      
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
      
      console.log('Cleaned ingredient analysis response:', cleanedResponse);
      
      const analysisData = JSON.parse(cleanedResponse);
      
      if (Array.isArray(analysisData)) {
        setIngredientAnalysis(analysisData);
      } else {
        console.error('Invalid ingredient analysis format:', analysisData);
      }
      
    } catch (error) {
      console.error('Error analyzing ingredients:', error);
      // Fallback to basic analysis
      const basicAnalysis = ingredients.map(ingredient => ({
        ingredient,
        description: 'Analysis unavailable - please try again.',
        isGood: true,
        purpose: 'Ingredient in product.'
      }));
      setIngredientAnalysis(basicAnalysis);
    } finally {
      setIsAnalyzingIngredients(false);
    }
  }, [profile.hasCompletedQuiz, profile.goals, profile.dietaryRestrictions]);

  const generateForYouAnalysis = useCallback(async () => {
    if (!profile.hasCompletedQuiz || !profile.goals) return;
    
    setIsAnalyzingForYou(true);
    console.log('Generating For You analysis for:', nutrition.name);
    console.log('User goals:', profile.goals);
    
    try {
      const { dietGoal, healthGoal, bodyGoal } = profile.goals;
      const score = nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore;
      
      let goalsContext = '';
      if (dietGoal) goalsContext += `Diet: ${dietGoal}, `;
      if (healthGoal) goalsContext += `Health: ${healthGoal}, `;
      if (bodyGoal) goalsContext += `Body: ${bodyGoal}`;
      
      const messages = [
        {
          role: 'system' as const,
          content: `You are a professional nutrition expert providing personalized food analysis. Write 2-3 clear, informative sentences (max 40 words total) explaining how this product aligns with their health goals. Be direct, professional, and focus on the key nutritional impact for their specific objectives.`
        },
        {
          role: 'user' as const,
          content: `Product: ${nutrition.name}
Score: ${score}/100
Goals: ${goalsContext}

Provide a concise analysis of ${score >= 66 ? 'how this product supports my health goals' : 'why this product may not align with my health goals'}. Focus on the most relevant nutritional factors.`
        }
      ];

      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('For You analysis result:', result);
      
      setForYouAnalysis(result.completion.trim());
      
    } catch (error) {
      console.error('Error generating For You analysis:', error);
      setForYouAnalysis('Analysis unavailable - please try again.');
    } finally {
      setIsAnalyzingForYou(false);
    }
  }, [nutrition, profile.hasCompletedQuiz, profile.goals]);

  useEffect(() => {
    if (!isLoading && nutrition && nutrition.ingredients && nutrition.ingredients.length > 0) {
      analyzeIngredients(nutrition.ingredients);
    }
  }, [isLoading, nutrition, analyzeIngredients]);
  
  useEffect(() => {
    if (!isLoading && nutrition && profile.hasCompletedQuiz) {
      generateForYouAnalysis();
    }
  }, [isLoading, nutrition, profile.hasCompletedQuiz, generateForYouAnalysis]);
  

  
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        {/* Animated Background Elements */}
        <View style={styles.backgroundAnimations}>
          {loadingAnimations.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.floatingElement,
                {
                  left: (index % 4) * 80 + 20,
                  top: Math.floor(index / 4) * 150 + 100,
                  opacity: anim,
                  transform: [
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1.2],
                      }),
                    },
                    {
                      rotate: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              {index % 3 === 0 ? (
                <Sparkles size={20} color={Colors.retroNeonTurquoise} />
              ) : index % 3 === 1 ? (
                <Zap size={18} color={Colors.retroPink} />
              ) : (
                <Star size={16} color={Colors.retroDeepIndigo} />
              )}
            </Animated.View>
          ))}
          
          {/* Sparkle Effects */}
          {sparklePositions.map((sparkle, index) => (
            <Animated.View
              key={`sparkle-${index}`}
              style={[
                styles.sparkleEffect,
                {
                  left: sparkle.x,
                  top: sparkle.y,
                  opacity: sparkle.opacity,
                  transform: [{ scale: sparkle.scale }],
                },
              ]}
            >
              <Heart size={12} color={Colors.retroPink} />
            </Animated.View>
          ))}
          
          {/* Fireworks Effect */}
          {fireworksActive && (
            <View style={styles.fireworksContainer}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Animated.View
                  key={`firework-${i}`}
                  style={[
                    styles.fireworkParticle,
                    {
                      left: 150 + Math.cos((i * 60) * Math.PI / 180) * 80,
                      top: 200 + Math.sin((i * 60) * Math.PI / 180) * 80,
                    },
                  ]}
                >
                  <View style={[styles.fireworkDot, { backgroundColor: i % 2 === 0 ? Colors.retroNeonTurquoise : Colors.retroPink }]} />
                </Animated.View>
              ))}
            </View>
          )}
        </View>
        
        {/* Main Loading Card */}
        <Animated.View style={[
          styles.shimmerCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.textSecondary + '20',
            transform: [{
              scale: loadingAnimations[0]?.interpolate({
                inputRange: [0, 1],
                outputRange: [0.98, 1.02],
              }) || 1,
            }],
          },
        ]}>
          {/* Pulsing Circle */}
          <Animated.View style={[
            styles.shimmerCircle,
            {
              backgroundColor: colors.textSecondary + '20',
              transform: [{
                scale: loadingAnimations[1]?.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1],
                }) || 1,
              }],
            },
          ]}>
            <Animated.View style={[
              styles.innerPulse,
              {
                opacity: loadingAnimations[2] || 0,
              },
            ]} />
          </Animated.View>
          
          {/* Dynamic Loading Text */}
          <Animated.Text style={[
            styles.loadingText,
            {
              color: colors.textSecondary,
              opacity: loadingAnimations[3]?.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              }) || 1,
            },
          ]}>
            {loadingMessages[loadingMessageIndex]}
          </Animated.Text>
          
          {/* Progress Bar with Percentage */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBarBackground, { backgroundColor: colors.textSecondary + '20' }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressBarWidth.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: Colors.retroNeonTurquoise }]}>{Math.round(loadingProgress)}%</Text>
          </View>
          
          {/* Animated Progress Bars */}
          <View style={styles.shimmerBars}>
            {[80, 60, 90].map((width, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.shimmerBar,
                  {
                    backgroundColor: colors.textSecondary + '20',
                    width: `${width}%`,
                    opacity: loadingAnimations[index + 4] || 0.3,
                  },
                ]}
              />
            ))}
          </View>
          
          {/* Fun Loading Icons */}
          <View style={styles.loadingIcons}>
            {[Sparkles, Zap, Star].map((Icon, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.loadingIcon,
                  {
                    opacity: loadingAnimations[index + 5] || 0.5,
                    transform: [{
                      rotate: loadingAnimations[index + 5]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg'],
                      }) || '0deg',
                    }],
                  },
                ]}
              >
                <Icon size={16} color={Colors.retroNeonTurquoise} />
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </View>
    );
  }
  

  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with back arrow and title */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.textSecondary + '20' }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.textSecondary + '10' }]}
          onPress={onBack || onScanAnother}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>InIt AI</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ParticleEffects
        type={getParticleEffect(nutrition.healthScore)}
        trigger={showParticles}
        onComplete={() => setShowParticles(false)}
      />
      
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [
              { translateY: slideUpValue },
              { scale: cardScale },
            ],
            opacity: cardOpacity,
          },
        ]}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Swipeable Tab Content */}
          {showPersonalized && nutrition.personalScore !== undefined && (
            <View style={styles.swipeableContainer}>
              <Animated.View
                style={[
                  styles.tabContentContainer,
                  {
                    transform: [{ translateX: tabTranslateX }],
                  },
                ]}
                {...panResponder.panHandlers}
              >
                {/* Tab 1: Product and Score Comparison */}
                <View style={[styles.tabContent, { width: Dimensions.get('window').width - 32 }]}>
                  <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
                    {/* Product Header */}
                    <View style={styles.productHeader}>
                      <View style={styles.productImageContainer}>
                        {(nutrition.imageUrl || imageUri) ? (
                          <Image source={{ uri: nutrition.imageUrl || imageUri }} style={styles.productImage} />
                        ) : (
                          <View style={[styles.productImagePlaceholder, { backgroundColor: colors.textSecondary + '10' }]}>
                            <Sparkles size={32} color={colors.textSecondary} />
                          </View>
                        )}
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={[styles.productName, { color: colors.textPrimary }]}>
                          {nutrition.name || 'Food Item'}
                        </Text>
                        <Text style={[styles.servingSize, { color: colors.textSecondary }]}>
                          Serving: {nutrition.servingSize || '1 portion'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Main Score Ring */}
                    <View style={styles.scoreSection}>
                      <View style={styles.scoreRingContainer}>
                        <View style={[styles.scoreRing, { backgroundColor: colors.surface, shadowColor: getScoreColor(nutrition.personalScore) }]}>
                          <View style={styles.scoreRingInner}>
                            <Text style={[styles.scoreNumber, { color: getScoreColor(nutrition.personalScore) }]}>
                              {nutrition.personalScore}
                            </Text>
                            <Text style={[styles.scoreOutOf, { color: colors.textSecondary }]}>/100</Text>
                          </View>
                        </View>
                        <View style={[styles.scoreRingProgress, { borderColor: getScoreColor(nutrition.personalScore) }]} />
                      </View>
                      
                      <Text style={[styles.personalScoreSubtitle, { color: colors.textSecondary }]}>
                        Personal Score
                      </Text>
                      
                      {/* Score Comparison Row */}
                      <View style={styles.comparisonContainer}>
                        <View style={styles.comparisonRow}>
                          <View style={[styles.baseScoreChip, { backgroundColor: colors.textSecondary + '10' }]}>
                            <Text style={[styles.baseScoreLabel, { color: colors.textSecondary }]}>Base Score</Text>
                            <Text style={[styles.baseScoreValue, { color: colors.textPrimary }]}>{nutrition.healthScore}</Text>
                          </View>
                          
                          {nutrition.personalScore !== nutrition.healthScore && (
                            <View style={styles.deltaContainer}>
                              <View style={styles.deltaIconContainer}>
                                {nutrition.personalScore > nutrition.healthScore ? (
                                  <TrendingUp size={16} color={Colors.success} />
                                ) : (
                                  <TrendingDown size={16} color={Colors.error} />
                                )}
                                <Text style={[styles.deltaValue, {
                                  color: nutrition.personalScore > nutrition.healthScore ? Colors.success : Colors.error
                                }]}>
                                  {nutrition.personalScore > nutrition.healthScore ? '+' : ''}{nutrition.personalScore - nutrition.healthScore}
                                </Text>
                              </View>
                            </View>
                          )}
                          
                          <View style={[styles.personalScoreChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                            <Text style={[styles.personalScoreLabel, { color: colors.primary }]}>Your Score</Text>
                            <Text style={[styles.personalScoreValue, { color: colors.primary }]}>{nutrition.personalScore}</Text>
                          </View>
                        </View>
                        
                        {/* Allergen/Dietary Restriction Warnings */}
                        {allergenWarnings.length > 0 && (
                          <View style={styles.warningContainer}>
                            <View style={styles.warningHeader}>
                              <AlertCircle size={16} color={Colors.warning} />
                              <Text style={[styles.warningTitle, { color: Colors.warning }]}>Dietary Alert</Text>
                            </View>
                            {allergenWarnings.map((warning, index) => (
                              <View key={index} style={[styles.warningItem, { backgroundColor: Colors.warning + '10', borderLeftColor: Colors.warning }]}>
                                <Text style={[styles.warningText, { color: colors.textPrimary }]}>{warning}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
                
                {/* Tab 2: Goal Rating Bars */}
                <View style={[styles.tabContent, { width: Dimensions.get('window').width - 32 }]}>
                  <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardHeader}>
                      <Target size={20} color={Colors.retroPink} />
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Goal Ratings</Text>
                    </View>
                    
                    <View style={styles.goalRatingsContainer}>
                      {/* Health Goal Bar */}
                      {profile.goals.healthGoal && (
                        <View style={styles.goalRatingItem}>
                          <View style={styles.goalRatingHeader}>
                            <Text style={[styles.goalRatingTitle, { color: colors.textPrimary }]}>Health Goal</Text>
                            <Text style={[styles.goalRatingScore, { color: getHealthGoalRatingColor(nutrition, profile.goals) }]}>
                              {getGoalRatingScore(getHealthGoalRating(nutrition, profile.goals))}
                            </Text>
                          </View>
                          <View style={[styles.goalRatingBarContainer, { backgroundColor: colors.textSecondary + '20' }]}>
                            <View 
                              style={[
                                styles.goalRatingBar,
                                {
                                  width: `${getGoalRatingScore(getHealthGoalRating(nutrition, profile.goals))}%`,
                                  backgroundColor: getHealthGoalRatingColor(nutrition, profile.goals),
                                }
                              ]}
                            />
                          </View>
                          <Text style={[styles.goalRatingSubtitle, { color: colors.textSecondary }]}>
                            {profile.goals.healthGoal.replace('-', ' ').replace('_', ' ')}
                          </Text>
                        </View>
                      )}
                      
                      {/* Diet Goal Bar */}
                      {profile.goals.dietGoal && (
                        <View style={styles.goalRatingItem}>
                          <View style={styles.goalRatingHeader}>
                            <Text style={[styles.goalRatingTitle, { color: colors.textPrimary }]}>Diet Goal</Text>
                            <Text style={[styles.goalRatingScore, { color: getDietGoalRatingColor(nutrition, profile.goals) }]}>
                              {getGoalRatingScore(getDietGoalRating(nutrition, profile.goals))}
                            </Text>
                          </View>
                          <View style={[styles.goalRatingBarContainer, { backgroundColor: colors.textSecondary + '20' }]}>
                            <View 
                              style={[
                                styles.goalRatingBar,
                                {
                                  width: `${getGoalRatingScore(getDietGoalRating(nutrition, profile.goals))}%`,
                                  backgroundColor: getDietGoalRatingColor(nutrition, profile.goals),
                                }
                              ]}
                            />
                          </View>
                          <Text style={[styles.goalRatingSubtitle, { color: colors.textSecondary }]}>
                            {profile.goals.dietGoal.replace('-', ' ')}
                          </Text>
                        </View>
                      )}
                      
                      {/* Body Goal Bar */}
                      {profile.goals.bodyGoal && (
                        <View style={styles.goalRatingItem}>
                          <View style={styles.goalRatingHeader}>
                            <Text style={[styles.goalRatingTitle, { color: colors.textPrimary }]}>Body Goal</Text>
                            <Text style={[styles.goalRatingScore, { color: getBodyGoalRatingColor(nutrition, profile.goals) }]}>
                              {getGoalRatingScore(getBodyGoalRating(nutrition, profile.goals))}
                            </Text>
                          </View>
                          <View style={[styles.goalRatingBarContainer, { backgroundColor: colors.textSecondary + '20' }]}>
                            <View 
                              style={[
                                styles.goalRatingBar,
                                {
                                  width: `${getGoalRatingScore(getBodyGoalRating(nutrition, profile.goals))}%`,
                                  backgroundColor: getBodyGoalRatingColor(nutrition, profile.goals),
                                }
                              ]}
                            />
                          </View>
                          <Text style={[styles.goalRatingSubtitle, { color: colors.textSecondary }]}>
                            {profile.goals.bodyGoal.replace('-', ' ')}
                          </Text>
                        </View>
                      )}
                      
                      {/* Life Goal Bar */}
                      {profile.goals.lifeGoal && (
                        <View style={styles.goalRatingItem}>
                          <View style={styles.goalRatingHeader}>
                            <Text style={[styles.goalRatingTitle, { color: colors.textPrimary }]}>Life Goal</Text>
                            <Text style={[styles.goalRatingScore, { color: getLifeGoalRatingColor(nutrition, profile.goals) }]}>
                              {getGoalRatingScore(getLifeGoalRating(nutrition, profile.goals))}
                            </Text>
                          </View>
                          <View style={[styles.goalRatingBarContainer, { backgroundColor: colors.textSecondary + '20' }]}>
                            <View 
                              style={[
                                styles.goalRatingBar,
                                {
                                  width: `${getGoalRatingScore(getLifeGoalRating(nutrition, profile.goals))}%`,
                                  backgroundColor: getLifeGoalRatingColor(nutrition, profile.goals),
                                }
                              ]}
                            />
                          </View>
                          <Text style={[styles.goalRatingSubtitle, { color: colors.textSecondary }]}>
                            {profile.goals.lifeGoal.replace('-', ' ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </Animated.View>
              
              {/* Visual swipe indicator */}
              <View style={styles.swipeIndicator}>
                <View style={[styles.swipeHint, { opacity: 0.3 }]}>
                  <Text style={[styles.swipeHintText, { color: colors.textSecondary }]}>← Swipe →</Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Tab Indicators - Show above swipeable content */}
          {showPersonalized && nutrition.personalScore !== undefined && (
            <View style={styles.tabIndicatorContainer}>
              <View style={styles.tabIndicators}>
                <TouchableOpacity
                  style={[
                    styles.tabIndicator,
                    {
                      backgroundColor: activeTab === 0 ? Colors.retroNeonTurquoise : colors.textSecondary + '30',
                    },
                  ]}
                  onPress={() => {
                    if (activeTab !== 0) {
                      setActiveTab(0);
                      Animated.spring(tabTranslateX, {
                        toValue: 0,
                        tension: 100,
                        friction: 8,
                        useNativeDriver: true,
                      }).start();
                    }
                  }}
                  activeOpacity={0.7}
                />
                <TouchableOpacity
                  style={[
                    styles.tabIndicator,
                    {
                      backgroundColor: activeTab === 1 ? Colors.retroNeonTurquoise : colors.textSecondary + '30',
                    },
                  ]}
                  onPress={() => {
                    if (activeTab !== 1) {
                      setActiveTab(1);
                      const screenWidth = Dimensions.get('window').width;
                      Animated.spring(tabTranslateX, {
                        toValue: -screenWidth,
                        tension: 100,
                        friction: 8,
                        useNativeDriver: true,
                      }).start();
                    }
                  }}
                  activeOpacity={0.7}
                />
              </View>
            </View>
          )}
          
          {/* Non-personalized Hero Score Section - Only show when no personalization */}
          {!showPersonalized && (
            <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
              {/* Always show product header for consistency */}
              <View style={styles.productHeader}>
                <View style={styles.productImageContainer}>
                  {(nutrition.imageUrl || imageUri) ? (
                    <Image source={{ uri: nutrition.imageUrl || imageUri }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImagePlaceholder, { backgroundColor: colors.textSecondary + '10' }]}>
                      <Sparkles size={32} color={colors.textSecondary} />
                    </View>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: colors.textPrimary }]}>
                    {nutrition.name || 'Food Item'}
                  </Text>
                  <Text style={[styles.servingSize, { color: colors.textSecondary }]}>
                    Serving: {nutrition.servingSize || '1 portion'}
                  </Text>
                </View>
              </View>
              
              {/* Main Score Ring */}
              <View style={styles.scoreSection}>
                <View style={styles.scoreRingContainer}>
                  <View style={[styles.scoreRing, { backgroundColor: colors.surface, shadowColor: getScoreColor(nutrition.healthScore) }]}>
                    <View style={styles.scoreRingInner}>
                      <Text style={[styles.scoreNumber, { color: getScoreColor(nutrition.healthScore) }]}>
                        {nutrition.healthScore}
                      </Text>
                      <Text style={[styles.scoreOutOf, { color: colors.textSecondary }]}>/100</Text>
                    </View>
                  </View>
                  <View style={[styles.scoreRingProgress, { borderColor: getScoreColor(nutrition.healthScore) }]} />
                </View>
                
                <Text style={[styles.personalScoreSubtitle, { color: colors.textSecondary }]}>
                  Health Score
                </Text>
              </View>
            </View>
          )}



          {/* Macro Breakdown Section */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <Zap size={20} color={Colors.retroNeonTurquoise} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Macro Breakdown</Text>
            </View>
            
            <View style={styles.macroGrid}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.retroNeonTurquoise }]}>{nutrition.calories}</Text>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Calories</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.retroNeonTurquoise }]}>{nutrition.protein}g</Text>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.retroNeonTurquoise }]}>{nutrition.carbs}g</Text>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: Colors.retroNeonTurquoise }]}>{nutrition.fat}g</Text>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Fat</Text>
              </View>
            </View>
            
            <View style={[styles.macroSecondaryGrid, { backgroundColor: colors.textSecondary + '05' }]}>
              <View style={styles.macroSecondaryItem}>
                <Text style={[styles.macroSecondaryValue, { color: colors.textPrimary }]}>{nutrition.fiber}g</Text>
                <Text style={[styles.macroSecondaryLabel, { color: colors.textSecondary }]}>Fiber</Text>
              </View>
              <View style={styles.macroSecondaryItem}>
                <Text style={[styles.macroSecondaryValue, { color: colors.textPrimary }]}>{nutrition.sugar}g</Text>
                <Text style={[styles.macroSecondaryLabel, { color: colors.textSecondary }]}>Sugar</Text>
              </View>
              <View style={styles.macroSecondaryItem}>
                <Text style={[styles.macroSecondaryValue, { color: colors.textPrimary }]}>{nutrition.saturatedFat}g</Text>
                <Text style={[styles.macroSecondaryLabel, { color: colors.textSecondary }]}>Sat Fat</Text>
              </View>
              <View style={styles.macroSecondaryItem}>
                <Text style={[styles.macroSecondaryValue, { color: colors.textPrimary }]}>{nutrition.sodium}mg</Text>
                <Text style={[styles.macroSecondaryLabel, { color: colors.textSecondary }]}>Sodium</Text>
              </View>
            </View>
          </View>

          {/* Ingredient Breakdown Section */}
          {nutrition.ingredients && nutrition.ingredients.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <TouchableOpacity 
                style={styles.cardHeader}
                onPress={toggleIngredientSection}
                activeOpacity={0.7}
              >
                <List size={20} color={Colors.retroNeonTurquoise} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Ingredient Breakdown</Text>
                {isIngredientSectionExpanded ? (
                  <ChevronDown size={20} color={colors.textSecondary} style={styles.sectionChevron} />
                ) : (
                  <ChevronRight size={20} color={colors.textSecondary} style={styles.sectionChevron} />
                )}
              </TouchableOpacity>
              
              <Animated.View style={[
                styles.collapsibleContent,
                {
                  maxHeight: ingredientSectionHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 400], // Fixed max height for scrollable area
                  }),
                  opacity: ingredientSectionHeight.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 0, 1],
                  }),
                }
              ]}>
                {isAnalyzingIngredients ? (
                  <View style={styles.loadingIngredients}>
                    <Text style={[styles.loadingIngredientsText, { color: colors.textSecondary }]}>Analyzing ingredients...</Text>
                  </View>
                ) : (
                  <ScrollView 
                    style={styles.ingredientsScrollView}
                    contentContainerStyle={styles.ingredientsContent}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {ingredientAnalysis.length > 0 ? (
                      ingredientAnalysis.map((analysis, index) => {
                        const isExpanded = expandedIngredients.has(index);
                        return (
                          <View key={index} style={[styles.ingredientItem, { backgroundColor: colors.textSecondary + '05', borderLeftColor: Colors.retroNeonTurquoise }]}>
                            <TouchableOpacity 
                              style={styles.ingredientHeader}
                              onPress={() => toggleIngredientExpansion(index)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.ingredientIcon}>
                                {analysis.isGood ? (
                                  <CheckCircle size={16} color={Colors.success} />
                                ) : (
                                  <AlertTriangle size={16} color={Colors.warning} />
                                )}
                              </View>
                              <Text style={[styles.ingredientName, { color: colors.textPrimary }]}>{analysis.ingredient}</Text>
                              {isExpanded ? (
                                <ChevronDown size={20} color={colors.textSecondary} />
                              ) : (
                                <ChevronRight size={20} color={colors.textSecondary} />
                              )}
                            </TouchableOpacity>
                            
                            {isExpanded && (
                              <View style={[styles.ingredientDetails, { borderTopColor: colors.textSecondary + '20' }]}>
                                <Text style={[styles.ingredientDescription, {
                                  color: analysis.isGood ? colors.textSecondary : colors.error
                                }]}>
                                  {analysis.description}
                                </Text>
                                <Text style={[styles.ingredientPurpose, { color: colors.textSecondary }]}>
                                  Purpose: {analysis.purpose}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      <Text style={[styles.noIngredientsText, { color: colors.textSecondary }]}>
                        No ingredient analysis available
                      </Text>
                    )}
                  </ScrollView>
                )}
              </Animated.View>
            </View>
          )}

          {/* For You Analysis Section */}
          {showPersonalized && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <TouchableOpacity 
                style={styles.cardHeader}
                onPress={toggleForYouSection}
                activeOpacity={0.7}
              >
                <Sparkles size={20} color={Colors.retroPink} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>For You Analysis</Text>
                {isForYouSectionExpanded ? (
                  <ChevronDown size={20} color={colors.textSecondary} style={styles.sectionChevron} />
                ) : (
                  <ChevronRight size={20} color={colors.textSecondary} style={styles.sectionChevron} />
                )}
              </TouchableOpacity>
              
              <Animated.View style={[
                styles.collapsibleContent,
                {
                  maxHeight: forYouSectionHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 300], // Increased max height to prevent cutoff
                  }),
                  opacity: forYouSectionHeight.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 0, 1],
                  }),
                }
              ]}>
                {isAnalyzingForYou ? (
                  <View style={styles.loadingAnalysis}>
                    <Text style={[styles.loadingAnalysisText, { color: colors.textSecondary }]}>Generating personalized analysis...</Text>
                  </View>
                ) : (
                  <ScrollView 
                    style={styles.analysisScrollView}
                    contentContainerStyle={styles.analysisContent}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    <View style={styles.vibeCheckContainer}>
                      <View style={[styles.vibeCheckCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.vibeCheckHeader}>
                          <View style={[styles.vibeCheckIcon, { backgroundColor: Colors.retroPink + '15' }]}>
                            <Sparkles size={16} color={Colors.retroPink} />
                          </View>
                          <Text style={[styles.vibeCheckTitle, { color: colors.textPrimary }]}>Personalized Insights</Text>
                        </View>
                        <Text style={[styles.vibeCheckText, { color: colors.textPrimary }]}>{forYouAnalysis}</Text>
                      </View>
                    </View>
                  </ScrollView>
                )}
              </Animated.View>
            </View>
          )}

          {/* Call-to-Action Buttons */}
          <View style={styles.ctaSection}>
            <TouchableOpacity 
              style={[styles.addToGroceryButton, { backgroundColor: colors.surface, borderColor: Colors.retroNeonTurquoise }]}
              onPress={async () => {
                if (Platform.OS !== 'web') {
                  await Haptics.selectionAsync();
                }
                try {
                  const productDetails = {
                    imageUri: nutrition.imageUrl || imageUri,
                    healthScore: nutrition.healthScore,
                    personalScore: nutrition.personalScore,
                    calories: nutrition.calories,
                    protein: nutrition.protein,
                  };
                  await addItem(nutrition.name, productDetails);
                  console.log('Added to grocery list:', nutrition.name);
                } catch (error) {
                  console.error('Error adding to grocery list:', error);
                }
              }}
              activeOpacity={0.7}
            >
              <ShoppingCart size={20} color={Colors.retroNeonTurquoise} />
              <Text style={[styles.addToGroceryButtonText, { color: Colors.retroNeonTurquoise }]}>Add to Grocery List</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.ctaButton, { backgroundColor: Colors.retroNeonTurquoise, shadowColor: Colors.retroNeonTurquoise }]}
              onPress={async () => {
                if (Platform.OS !== 'web') {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }
                setShowBetterSwapsModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.ctaButtonText, { color: colors.white }]}>Better Bites</Text>
              <ArrowRight size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, styles.savedButton]}
              onPress={onSaveToHistory}
            >
              <View style={styles.buttonContent}>
                <CheckCircle size={16} color={Colors.success} />
                <Text style={[styles.secondaryButtonText, { color: Colors.success, marginLeft: 6 }]}>Saved to History</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: Colors.retroNeonTurquoise }]}
              onPress={onScanAnother}
            >
              <Text style={[styles.primaryButtonText, { color: colors.white }]}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
      
      {/* Better Swaps Modal */}
      <BetterSwapsModal
        visible={showBetterSwapsModal}
        onClose={() => setShowBetterSwapsModal(false)}
        currentProduct={nutrition}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.retroCreamWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: Colors.retroCreamWhite,
    borderBottomColor: Colors.retroSoftGray,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.retroSoftGray + '30',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.retroCharcoalBlack,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backgroundAnimations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  floatingElement: {
    position: 'absolute',
    zIndex: 2,
  },
  sparkleEffect: {
    position: 'absolute',
    zIndex: 3,
  },
  fireworksContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4,
  },
  fireworkParticle: {
    position: 'absolute',
    zIndex: 5,
  },
  fireworkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shimmerCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    shadowColor: Colors.retroSoftGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
    borderWidth: 1,
  },
  shimmerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.retroNeonTurquoise,
  },
  loadingText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  shimmerBars: {
    width: '100%',
    gap: 12,
  },
  shimmerBar: {
    height: 12,
    borderRadius: 6,
  },
  loadingIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 16,
  },
  loadingIcon: {
    padding: 8,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.retroNeonTurquoise,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardContainer: {
    flex: 1,
  },
  // Hero Card Styles
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    backgroundColor: Colors.retroCreamWhite,
    shadowColor: Colors.retroSoftGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.retroDeepIndigo + '15',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productImageContainer: {
    marginRight: 16,
  },
  productImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 24,
    color: Colors.retroCharcoalBlack,
  },
  servingSize: {
    fontSize: 14,
    marginBottom: 12,
    fontStyle: 'italic',
    color: Colors.retroSlateGray,
  },
  scoreSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  
  scoreRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  scoreRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  
  scoreRingInner: {
    alignItems: 'center',
  },
  
  scoreNumber: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  
  scoreOutOf: {
    fontSize: 14,
    color: Colors.retroSlateGray,
    marginTop: -4,
  },
  
  scoreRingProgress: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderStyle: 'solid',
  },
  
  personalScoreSubtitle: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
    color: Colors.retroSlateGray,
  },
  
  comparisonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  
  baseScoreChip: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  
  baseScoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  
  baseScoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.retroCharcoalBlack,
  },
  
  personalScoreChip: {
    backgroundColor: Colors.retroNeonTurquoise + '15',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: Colors.retroNeonTurquoise + '30',
  },
  
  personalScoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    color: Colors.retroNeonTurquoise,
  },
  
  personalScoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.retroNeonTurquoise,
  },
  
  deltaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  deltaIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  deltaValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  

  
  resultSection: {
    alignItems: 'center',
  },
  
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  
  resultBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  
  resultMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    maxWidth: '90%',
  },
  
  resultMessage: {
    fontSize: 16,
    color: Colors.retroSlateGray,
    textAlign: 'center',
    lineHeight: 22,
    flex: 1,
  },
  // Card Styles
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    backgroundColor: Colors.retroCreamWhite,
    shadowColor: Colors.retroSoftGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.retroDeepIndigo + '15',
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  sectionChevron: {
    marginLeft: 'auto',
  },
  
  collapsibleContent: {
    overflow: 'hidden',
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: Colors.retroCharcoalBlack,
  },
  

  
  // CTA Section
  ctaSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  
  addToGroceryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  addToGroceryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  ctaButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  expandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  expandText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailsContainer: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  detailsScroll: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 16,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  nutritionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  flagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flagChip: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  flagText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.retroNeonTurquoise,
  },
  secondaryButton: {
    backgroundColor: Colors.retroCreamWhite,
    borderWidth: 2,
    borderColor: Colors.retroNeonTurquoise,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.retroCreamWhite,
  },
  secondaryButtonText: {
    color: Colors.retroNeonTurquoise,
    fontSize: 16,
    fontWeight: '600',
  },
  savedButton: {
    borderColor: Colors.success + '40',
    backgroundColor: Colors.success + '10',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalScoreIndicator: {
    marginTop: 12,
    padding: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    alignItems: 'center',
  },
  personalScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  personalScoreChange: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  
  // Ingredient Breakdown Styles
  loadingIngredients: {
    padding: 20,
    alignItems: 'center',
  },
  
  loadingIngredientsText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.retroSlateGray,
  },
  
  ingredientsScrollView: {
    maxHeight: 400,
  },
  
  ingredientsContent: {
    gap: 16,
    paddingBottom: 8,
  },
  
  ingredientItem: {
    backgroundColor: Colors.retroSoftGray + '20',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.retroNeonTurquoise,
  },
  
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  
  ingredientIcon: {
    marginRight: 12,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  ingredientName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textTransform: 'capitalize',
    color: Colors.retroCharcoalBlack,
  },
  
  ingredientDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.retroSoftGray,
  },
  
  ingredientDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  
  ingredientPurpose: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    color: Colors.retroSlateGray,
  },
  
  noIngredientsText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
    color: Colors.retroSlateGray,
  },
  
  // For You Analysis Styles
  loadingAnalysis: {
    padding: 16,
    alignItems: 'center',
  },
  
  loadingAnalysisText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.retroSlateGray,
  },
  
  analysisScrollView: {
    maxHeight: 280,
  },
  
  analysisContent: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  
  vibeCheckContainer: {
    paddingHorizontal: 4,
  },
  
  vibeCheckCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.retroPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.retroPink + '20',
  },
  
  vibeCheckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  
  vibeCheckIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  vibeCheckTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  vibeCheckText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0.1,
    textAlign: 'left',
    color: Colors.retroCharcoalBlack,
  },
  
  // Macro Breakdown Styles
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: Colors.retroNeonTurquoise,
  },
  
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.retroSlateGray,
  },
  
  macroSecondaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.retroSoftGray + '30',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 8,
  },
  
  macroSecondaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  macroSecondaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: Colors.retroCharcoalBlack,
  },
  
  macroSecondaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    color: Colors.retroSlateGray,
  },
  personalReasonsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  personalReasonsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  personalReasonBullet: {
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Warning styles for allergens/dietary restrictions
  warningContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.warning + '05',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warning + '20',
  },
  
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
  },
  
  warningItem: {
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    marginBottom: 4,
  },
  
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  
  // Tab Indicator Styles
  tabIndicatorContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  
  tabIndicators: {
    flexDirection: 'row',
    gap: 12,
  },
  
  tabIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  
  // Tab Content Styles
  tabContentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  
  tabContent: {
    marginRight: 16,
  },
  
  tabPlaceholder: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.retroSoftGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.retroDeepIndigo + '15',
  },
  
  tabPlaceholderText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Goal Rating Bars Styles
  goalRatingsContainer: {
    paddingVertical: 8,
    gap: 24,
  },
  
  goalRatingItem: {
    paddingHorizontal: 4,
  },
  
  goalRatingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  goalRatingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.retroCharcoalBlack,
  },
  
  goalRatingScore: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  
  goalRatingBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
  },
  
  goalRatingBar: {
    height: '100%',
    borderRadius: 6,
    minWidth: 2,
  },
  
  goalRatingSubtitle: {
    fontSize: 14,
    textTransform: 'capitalize',
    color: Colors.retroSlateGray,
  },
  
  // Legacy Personalization Breakdown Styles (kept for compatibility)
  personalizationScrollView: {
    maxHeight: 400,
  },
  
  personalizationCategory: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.retroNeonTurquoise,
  },
  
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  categoryInfo: {
    flex: 1,
  },
  
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  
  categorySubtitle: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  
  categoryRating: {
    alignItems: 'center',
  },
  
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  categoryDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  
  // Swipe Container Styles
  swipeableContainer: {
    position: 'relative',
  },
  
  swipeIndicator: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  
  swipeHint: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.retroSoftGray + '20',
  },
  
  swipeHintText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: Colors.retroSlateGray,
  },

});