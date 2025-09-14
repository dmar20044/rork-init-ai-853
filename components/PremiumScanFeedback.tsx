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
import { NutritionInfo, personalScore } from '@/services/foodAnalysis';
import ParticleEffects from './ParticleEffects';
import BetterSwapsModal from './BetterSwapsModal';
import IngredientListModal from './IngredientListModal';

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

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// Helper functions for personalization breakdown using actual nutritional data
const getHealthGoalRating = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.healthGoal) return 'N/A';
  
  const { healthGoal } = goals;
  let score = 0;
  
  switch (healthGoal) {
    case 'low-sugar':
      // Score based on sugar content (lower is better)
      if (nutrition.sugar <= 2) score = 95;
      else if (nutrition.sugar <= 5) score = 85;
      else if (nutrition.sugar <= 10) score = 70;
      else if (nutrition.sugar <= 15) score = 55;
      else if (nutrition.sugar <= 25) score = 40;
      else score = 25;
      break;
      
    case 'high-protein':
      // Score based on protein content (higher is better)
      if (nutrition.protein >= 20) score = 95;
      else if (nutrition.protein >= 15) score = 85;
      else if (nutrition.protein >= 10) score = 70;
      else if (nutrition.protein >= 5) score = 55;
      else if (nutrition.protein >= 2) score = 40;
      else score = 25;
      break;
      
    case 'low-fat':
      // Score based on total fat content (lower is better)
      if (nutrition.fat <= 1) score = 95;
      else if (nutrition.fat <= 3) score = 85;
      else if (nutrition.fat <= 6) score = 70;
      else if (nutrition.fat <= 10) score = 55;
      else if (nutrition.fat <= 15) score = 40;
      else score = 25;
      break;
      
    case 'keto':
      // Score based on carb content (lower is better) and fat content (higher is better)
      const carbScore = nutrition.carbs <= 2 ? 50 : nutrition.carbs <= 5 ? 40 : nutrition.carbs <= 10 ? 25 : 10;
      const fatScore = nutrition.fat >= 15 ? 45 : nutrition.fat >= 10 ? 35 : nutrition.fat >= 5 ? 25 : 10;
      score = carbScore + fatScore;
      break;
      
    case 'balanced':
    default:
      // Use the base health score for balanced approach
      score = nutrition.healthScore;
      break;
  }
  
  // Convert score to rating
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
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
  if (!goals.healthGoal || !nutrition.personalReasons) return 'No health goal analysis available';
  
  // Use the actual personalized reasons from the scoring system
  const healthReasons = nutrition.personalReasons.filter(reason => 
    reason.toLowerCase().includes('sugar') ||
    reason.toLowerCase().includes('protein') ||
    reason.toLowerCase().includes('fat') ||
    reason.toLowerCase().includes('carb') ||
    reason.toLowerCase().includes('keto') ||
    reason.toLowerCase().includes('balanced')
  );
  
  if (healthReasons.length > 0) {
    return healthReasons[0]; // Return the most relevant health-related reason
  }
  
  // Fallback to basic description
  const goalName = goals.healthGoal.replace('-', ' ').replace('_', ' ');
  return `Analyzed for ${goalName} compatibility based on your personal nutrition goals.`;
};

const getDietGoalRating = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.dietGoal) return 'N/A';
  
  const { dietGoal } = goals;
  let score = 0;
  
  switch (dietGoal) {
    case 'whole-foods':
      // Score based on processing level (fewer additives = better)
      const additiveCount = nutrition.additives?.length || 0;
      const hasArtificialIngredients = nutrition.ingredients?.some(ing => 
        ing.toLowerCase().includes('artificial') || 
        ing.toLowerCase().includes('preservative') ||
        ing.toLowerCase().includes('color') ||
        ing.toLowerCase().includes('flavor')
      ) || false;
      
      if (additiveCount === 0 && !hasArtificialIngredients) score = 95;
      else if (additiveCount <= 2 && !hasArtificialIngredients) score = 80;
      else if (additiveCount <= 5) score = 65;
      else if (additiveCount <= 8) score = 45;
      else score = 25;
      break;
      
    case 'vegan':
      // Check for animal-derived ingredients
      const veganUnfriendly = nutrition.ingredients?.some(ing => {
        const ingredient = ing.toLowerCase();
        return ingredient.includes('milk') || ingredient.includes('egg') || 
               ingredient.includes('meat') || ingredient.includes('fish') ||
               ingredient.includes('dairy') || ingredient.includes('whey') ||
               ingredient.includes('casein') || ingredient.includes('gelatin') ||
               ingredient.includes('honey') || ingredient.includes('butter');
      }) || false;
      
      score = veganUnfriendly ? 15 : 90;
      break;
      
    case 'vegetarian':
      // Check for meat and fish ingredients
      const vegetarianUnfriendly = nutrition.ingredients?.some(ing => {
        const ingredient = ing.toLowerCase();
        return ingredient.includes('meat') || ingredient.includes('fish') ||
               ingredient.includes('chicken') || ingredient.includes('beef') ||
               ingredient.includes('pork') || ingredient.includes('gelatin');
      }) || false;
      
      score = vegetarianUnfriendly ? 15 : 85;
      break;
      
    case 'gluten-free':
      // Check for gluten-containing ingredients
      const glutenIngredients = nutrition.ingredients?.some(ing => {
        const ingredient = ing.toLowerCase();
        return ingredient.includes('wheat') || ingredient.includes('barley') ||
               ingredient.includes('rye') || ingredient.includes('gluten') ||
               ingredient.includes('flour') || ingredient.includes('malt');
      }) || false;
      
      score = glutenIngredients ? 10 : 90;
      break;
      
    case 'carnivore':
      // Score based on animal protein content
      if (nutrition.protein >= 15) score = 90;
      else if (nutrition.protein >= 10) score = 75;
      else if (nutrition.protein >= 5) score = 50;
      else score = 20;
      break;
      
    case 'balanced':
    default:
      // Use base health score for balanced approach
      score = nutrition.healthScore;
      break;
  }
  
  // Convert score to rating
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
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
  if (!goals.dietGoal || !nutrition.personalReasons) return 'No diet preference analysis available';
  
  // Use the actual personalized reasons from the scoring system
  const dietReasons = nutrition.personalReasons.filter(reason => 
    reason.toLowerCase().includes('vegan') ||
    reason.toLowerCase().includes('vegetarian') ||
    reason.toLowerCase().includes('gluten') ||
    reason.toLowerCase().includes('whole') ||
    reason.toLowerCase().includes('processed') ||
    reason.toLowerCase().includes('additive') ||
    reason.toLowerCase().includes('animal') ||
    reason.toLowerCase().includes('plant')
  );
  
  if (dietReasons.length > 0) {
    return dietReasons[0]; // Return the most relevant diet-related reason
  }
  
  // Fallback to basic description
  const goalName = goals.dietGoal.replace('-', ' ');
  return `Analyzed for ${goalName} compatibility based on your dietary preferences.`;
};

const getBodyGoalRating = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.bodyGoal) return 'N/A';
  
  const { bodyGoal } = goals;
  let score = 0;
  
  switch (bodyGoal) {
    case 'lose-weight':
    case 'slightly-lose-weight':
      // Score based on calorie density and satiety factors
      const caloriesPerGram = nutrition.calories / 100; // Assuming per 100g serving
      const fiberScore = nutrition.fiber >= 5 ? 25 : nutrition.fiber >= 3 ? 20 : nutrition.fiber >= 1 ? 15 : 5;
      const proteinScore = nutrition.protein >= 10 ? 25 : nutrition.protein >= 5 ? 20 : nutrition.protein >= 2 ? 15 : 5;
      const sugarPenalty = nutrition.sugar > 15 ? -20 : nutrition.sugar > 10 ? -10 : nutrition.sugar > 5 ? -5 : 0;
      
      if (caloriesPerGram <= 1.5) score = 50 + fiberScore + proteinScore + sugarPenalty;
      else if (caloriesPerGram <= 2.5) score = 40 + fiberScore + proteinScore + sugarPenalty;
      else if (caloriesPerGram <= 3.5) score = 30 + fiberScore + proteinScore + sugarPenalty;
      else score = 20 + fiberScore + proteinScore + sugarPenalty;
      break;
      
    case 'gain-weight':
    case 'slightly-gain-weight':
      // Score based on calorie density and healthy fats/proteins
      const caloriesPerGramGain = nutrition.calories / 100;
      const healthyFatScore = nutrition.fat >= 10 ? 30 : nutrition.fat >= 5 ? 20 : 10;
      const proteinScoreGain = nutrition.protein >= 8 ? 30 : nutrition.protein >= 4 ? 20 : 10;
      
      if (caloriesPerGramGain >= 4) score = 40 + healthyFatScore + proteinScoreGain;
      else if (caloriesPerGramGain >= 3) score = 35 + healthyFatScore + proteinScoreGain;
      else if (caloriesPerGramGain >= 2) score = 25 + healthyFatScore + proteinScoreGain;
      else score = 15 + healthyFatScore + proteinScoreGain;
      break;
      
    case 'maintain-weight':
    default:
      // Balanced approach focusing on overall nutrition quality
      const balancedScore = nutrition.healthScore;
      const proteinBonus = nutrition.protein >= 8 ? 10 : nutrition.protein >= 4 ? 5 : 0;
      const fiberBonus = nutrition.fiber >= 3 ? 10 : nutrition.fiber >= 1 ? 5 : 0;
      score = Math.min(95, balancedScore + proteinBonus + fiberBonus);
      break;
  }
  
  // Ensure score is within bounds
  score = Math.max(10, Math.min(95, score));
  
  // Convert score to rating
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
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
  if (!goals.bodyGoal || !nutrition.personalReasons) return 'No body goal analysis available';
  
  // Use the actual personalized reasons from the scoring system
  const bodyReasons = nutrition.personalReasons.filter(reason => 
    reason.toLowerCase().includes('weight') ||
    reason.toLowerCase().includes('calorie') ||
    reason.toLowerCase().includes('protein') ||
    reason.toLowerCase().includes('gain') ||
    reason.toLowerCase().includes('loss') ||
    reason.toLowerCase().includes('maintain')
  );
  
  if (bodyReasons.length > 0) {
    return bodyReasons[0]; // Return the most relevant body-related reason
  }
  
  // Fallback to basic description
  const goalName = goals.bodyGoal.replace('-', ' ');
  return `Analyzed for ${goalName} compatibility based on your body composition goals.`;
};

const getLifeGoalRating = (nutrition: NutritionInfo, goals: UserGoals): string => {
  if (!goals.lifeGoal) return 'N/A';
  
  const { lifeGoal } = goals;
  let score = 0;
  
  switch (lifeGoal) {
    case 'boost-energy':
      // Score based on factors that affect energy levels
      const complexCarbScore = nutrition.fiber >= 3 ? 25 : nutrition.fiber >= 1 ? 15 : 5;
      const proteinEnergyScore = nutrition.protein >= 8 ? 25 : nutrition.protein >= 4 ? 15 : 5;
      const sugarCrashPenalty = nutrition.sugar > 20 ? -25 : nutrition.sugar > 10 ? -15 : nutrition.sugar > 5 ? -5 : 10;
      const sodiumPenalty = nutrition.sodium > 800 ? -10 : nutrition.sodium > 400 ? -5 : 0;
      
      score = 50 + complexCarbScore + proteinEnergyScore + sugarCrashPenalty + sodiumPenalty;
      break;
      
    case 'clear-skin':
      // Score based on factors that affect skin health
      const antiInflammatoryScore = nutrition.fiber >= 4 ? 20 : nutrition.fiber >= 2 ? 10 : 0;
      const sugarSkinPenalty = nutrition.sugar > 15 ? -30 : nutrition.sugar > 8 ? -20 : nutrition.sugar > 4 ? -10 : 15;
      const processedPenalty = (nutrition.additives?.length || 0) > 5 ? -15 : (nutrition.additives?.length || 0) > 2 ? -10 : 5;
      const saturatedFatPenalty = nutrition.saturatedFat > 8 ? -15 : nutrition.saturatedFat > 4 ? -10 : 0;
      
      score = 60 + antiInflammatoryScore + sugarSkinPenalty + processedPenalty + saturatedFatPenalty;
      break;
      
    case 'feel-better':
      // Score based on overall wellness factors
      const wholeFoodScore = (nutrition.additives?.length || 0) <= 2 ? 25 : (nutrition.additives?.length || 0) <= 5 ? 15 : 5;
      const balancedNutritionScore = (nutrition.protein >= 5 && nutrition.fiber >= 2) ? 20 : 10;
      const lowSugarBonus = nutrition.sugar <= 8 ? 15 : nutrition.sugar <= 15 ? 5 : -10;
      const lowSodiumBonus = nutrition.sodium <= 300 ? 15 : nutrition.sodium <= 600 ? 5 : -5;
      
      score = 25 + wholeFoodScore + balancedNutritionScore + lowSugarBonus + lowSodiumBonus;
      break;
      
    case 'eat-healthier':
    default:
      // Use base health score with bonuses for particularly healthy attributes
      const baseHealthScore = nutrition.healthScore;
      const fiberBonus = nutrition.fiber >= 5 ? 15 : nutrition.fiber >= 3 ? 10 : nutrition.fiber >= 1 ? 5 : 0;
      const proteinBonus = nutrition.protein >= 10 ? 10 : nutrition.protein >= 5 ? 5 : 0;
      const lowProcessingBonus = (nutrition.additives?.length || 0) <= 1 ? 10 : 0;
      
      score = Math.min(95, baseHealthScore + fiberBonus + proteinBonus + lowProcessingBonus);
      break;
  }
  
  // Ensure score is within bounds
  score = Math.max(15, Math.min(95, score));
  
  // Convert score to rating
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
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
  if (!goals.lifeGoal || !nutrition.personalReasons) return 'No life goal analysis available';
  
  // Use the actual personalized reasons from the scoring system
  const lifeReasons = nutrition.personalReasons.filter(reason => 
    reason.toLowerCase().includes('energy') ||
    reason.toLowerCase().includes('health') ||
    reason.toLowerCase().includes('skin') ||
    reason.toLowerCase().includes('feel') ||
    reason.toLowerCase().includes('mood') ||
    reason.toLowerCase().includes('crash') ||
    reason.toLowerCase().includes('additive')
  );
  
  if (lifeReasons.length > 0) {
    return lifeReasons[0]; // Return the most relevant life-related reason
  }
  
  // Fallback to basic description
  const goalName = goals.lifeGoal.replace('-', ' ');
  return `Analyzed for ${goalName} compatibility based on your lifestyle goals.`;
};

// Helper function to get the actual numerical score for each goal
const getGoalRatingScore = (nutrition: NutritionInfo, goals: UserGoals, goalType: 'health' | 'diet' | 'body' | 'life'): number => {
  let rawScore = 0;
  
  switch (goalType) {
    case 'health':
      if (!goals.healthGoal) return 0;
      const { healthGoal } = goals;
      
      switch (healthGoal) {
        case 'low-sugar':
          // More granular scoring based on sugar content
          if (nutrition.sugar <= 1) rawScore = 95;
          else if (nutrition.sugar <= 3) rawScore = 87.5;
          else if (nutrition.sugar <= 6) rawScore = 78;
          else if (nutrition.sugar <= 10) rawScore = 65.5;
          else if (nutrition.sugar <= 15) rawScore = 52;
          else if (nutrition.sugar <= 20) rawScore = 38.5;
          else if (nutrition.sugar <= 30) rawScore = 26;
          else rawScore = 15.5;
          break;
          
        case 'high-protein':
          // Enhanced protein scoring with more precision
          if (nutrition.protein >= 25) rawScore = 95;
          else if (nutrition.protein >= 20) rawScore = 89;
          else if (nutrition.protein >= 15) rawScore = 81.5;
          else if (nutrition.protein >= 12) rawScore = 73;
          else if (nutrition.protein >= 8) rawScore = 62.5;
          else if (nutrition.protein >= 5) rawScore = 49;
          else if (nutrition.protein >= 3) rawScore = 35.5;
          else if (nutrition.protein >= 1) rawScore = 24;
          else rawScore = 12.5;
          break;
          
        case 'low-fat':
          // More precise fat content evaluation
          if (nutrition.fat <= 0.5) rawScore = 95;
          else if (nutrition.fat <= 2) rawScore = 86.5;
          else if (nutrition.fat <= 4) rawScore = 76;
          else if (nutrition.fat <= 7) rawScore = 63.5;
          else if (nutrition.fat <= 12) rawScore = 48;
          else if (nutrition.fat <= 18) rawScore = 32.5;
          else rawScore = 19;
          break;
          
        case 'keto':
          // Refined keto scoring with better balance
          const carbPenalty = nutrition.carbs <= 1 ? 0 : nutrition.carbs <= 3 ? -8 : nutrition.carbs <= 6 ? -18 : nutrition.carbs <= 10 ? -32 : -50;
          const fatBonus = nutrition.fat >= 20 ? 25 : nutrition.fat >= 15 ? 20 : nutrition.fat >= 10 ? 12 : nutrition.fat >= 5 ? 6 : 0;
          const proteinBonus = nutrition.protein >= 15 ? 15 : nutrition.protein >= 10 ? 10 : nutrition.protein >= 5 ? 5 : 0;
          rawScore = Math.max(15, 70 + carbPenalty + fatBonus + proteinBonus);
          break;
          
        case 'balanced':
        default:
          // Use health score with slight variation
          rawScore = nutrition.healthScore + (nutrition.fiber * 0.8) - (nutrition.sugar * 0.3);
          break;
      }
      break;
      
    case 'diet':
      if (!goals.dietGoal) return 0;
      const { dietGoal } = goals;
      
      switch (dietGoal) {
        case 'whole-foods':
          const additiveCount = nutrition.additives?.length || 0;
          const hasArtificialIngredients = nutrition.ingredients?.some(ing => 
            ing.toLowerCase().includes('artificial') || 
            ing.toLowerCase().includes('preservative') ||
            ing.toLowerCase().includes('color') ||
            ing.toLowerCase().includes('flavor')
          ) || false;
          
          // More nuanced whole foods scoring
          if (additiveCount === 0 && !hasArtificialIngredients) rawScore = 94.5;
          else if (additiveCount <= 1 && !hasArtificialIngredients) rawScore = 83;
          else if (additiveCount <= 3 && !hasArtificialIngredients) rawScore = 71.5;
          else if (additiveCount <= 5) rawScore = 58;
          else if (additiveCount <= 8) rawScore = 42.5;
          else if (additiveCount <= 12) rawScore = 29;
          else rawScore = 16.5;
          break;
          
        case 'vegan':
          const veganUnfriendly = nutrition.ingredients?.some(ing => {
            const ingredient = ing.toLowerCase();
            return ingredient.includes('milk') || ingredient.includes('egg') || 
                   ingredient.includes('meat') || ingredient.includes('fish') ||
                   ingredient.includes('dairy') || ingredient.includes('whey') ||
                   ingredient.includes('casein') || ingredient.includes('gelatin') ||
                   ingredient.includes('honey') || ingredient.includes('butter');
          }) || false;
          
          // Add fiber bonus for plant-based foods
          const veganFiberBonus = nutrition.fiber >= 5 ? 5 : nutrition.fiber >= 3 ? 3 : 0;
          rawScore = veganUnfriendly ? 13.5 : (87 + veganFiberBonus);
          break;
          
        case 'vegetarian':
          const vegetarianUnfriendly = nutrition.ingredients?.some(ing => {
            const ingredient = ing.toLowerCase();
            return ingredient.includes('meat') || ingredient.includes('fish') ||
                   ingredient.includes('chicken') || ingredient.includes('beef') ||
                   ingredient.includes('pork') || ingredient.includes('gelatin');
          }) || false;
          
          // Slight variation from vegan scoring
          const vegFiberBonus = nutrition.fiber >= 4 ? 4 : nutrition.fiber >= 2 ? 2 : 0;
          rawScore = vegetarianUnfriendly ? 17 : (82.5 + vegFiberBonus);
          break;
          
        case 'gluten-free':
          const glutenIngredients = nutrition.ingredients?.some(ing => {
            const ingredient = ing.toLowerCase();
            return ingredient.includes('wheat') || ingredient.includes('barley') ||
                   ingredient.includes('rye') || ingredient.includes('gluten') ||
                   ingredient.includes('flour') || ingredient.includes('malt');
          }) || false;
          
          // Account for naturally gluten-free vs processed alternatives
          const naturallyGF = !glutenIngredients && (nutrition.additives?.length || 0) <= 3;
          rawScore = glutenIngredients ? 8.5 : (naturallyGF ? 91.5 : 78);
          break;
          
        case 'carnivore':
          // Enhanced carnivore scoring based on protein density
          if (nutrition.protein >= 25) rawScore = 93;
          else if (nutrition.protein >= 20) rawScore = 84.5;
          else if (nutrition.protein >= 15) rawScore = 74;
          else if (nutrition.protein >= 10) rawScore = 59.5;
          else if (nutrition.protein >= 6) rawScore = 43;
          else if (nutrition.protein >= 3) rawScore = 28.5;
          else rawScore = 16;
          break;
          
        case 'balanced':
        default:
          // Balanced with slight fiber emphasis
          rawScore = nutrition.healthScore + (nutrition.fiber * 0.6) - (nutrition.sodium * 0.002);
          break;
      }
      break;
      
    case 'body':
      if (!goals.bodyGoal) return 0;
      const { bodyGoal } = goals;
      
      switch (bodyGoal) {
        case 'lose-weight':
        case 'slightly-lose-weight':
          // More sophisticated weight loss scoring
          const caloriesPerGram = nutrition.calories / 100;
          const fiberScore = nutrition.fiber >= 8 ? 28 : nutrition.fiber >= 5 ? 22 : nutrition.fiber >= 3 ? 16 : nutrition.fiber >= 1 ? 8 : 2;
          const proteinScore = nutrition.protein >= 15 ? 26 : nutrition.protein >= 10 ? 20 : nutrition.protein >= 6 ? 14 : nutrition.protein >= 3 ? 8 : 2;
          const sugarPenalty = nutrition.sugar > 20 ? -25 : nutrition.sugar > 15 ? -18 : nutrition.sugar > 10 ? -12 : nutrition.sugar > 6 ? -6 : 2;
          const satietyBonus = (fiberScore + proteinScore) > 35 ? 8 : 0;
          
          if (caloriesPerGram <= 1.2) rawScore = 52 + fiberScore + proteinScore + sugarPenalty + satietyBonus;
          else if (caloriesPerGram <= 2.0) rawScore = 44 + fiberScore + proteinScore + sugarPenalty + satietyBonus;
          else if (caloriesPerGram <= 3.0) rawScore = 34 + fiberScore + proteinScore + sugarPenalty + satietyBonus;
          else if (caloriesPerGram <= 4.5) rawScore = 22 + fiberScore + proteinScore + sugarPenalty + satietyBonus;
          else rawScore = 12 + fiberScore + proteinScore + sugarPenalty + satietyBonus;
          break;
          
        case 'gain-weight':
        case 'slightly-gain-weight':
          // Enhanced weight gain scoring
          const caloriesPerGramGain = nutrition.calories / 100;
          const healthyFatScore = nutrition.fat >= 15 ? 32 : nutrition.fat >= 10 ? 24 : nutrition.fat >= 6 ? 16 : nutrition.fat >= 3 ? 8 : 2;
          const proteinScoreGain = nutrition.protein >= 12 ? 28 : nutrition.protein >= 8 ? 22 : nutrition.protein >= 5 ? 16 : nutrition.protein >= 2 ? 8 : 2;
          const densityBonus = caloriesPerGramGain >= 5 ? 12 : caloriesPerGramGain >= 4 ? 8 : caloriesPerGramGain >= 3 ? 4 : 0;
          
          if (caloriesPerGramGain >= 4.5) rawScore = 38 + healthyFatScore + proteinScoreGain + densityBonus;
          else if (caloriesPerGramGain >= 3.5) rawScore = 32 + healthyFatScore + proteinScoreGain + densityBonus;
          else if (caloriesPerGramGain >= 2.5) rawScore = 24 + healthyFatScore + proteinScoreGain + densityBonus;
          else if (caloriesPerGramGain >= 1.8) rawScore = 16 + healthyFatScore + proteinScoreGain + densityBonus;
          else rawScore = 8 + healthyFatScore + proteinScoreGain + densityBonus;
          break;
          
        case 'maintain-weight':
        default:
          // Refined maintenance scoring
          const balancedScore = nutrition.healthScore;
          const proteinBonus = nutrition.protein >= 12 ? 12 : nutrition.protein >= 8 ? 8 : nutrition.protein >= 4 ? 4 : 0;
          const fiberBonus = nutrition.fiber >= 5 ? 10 : nutrition.fiber >= 3 ? 6 : nutrition.fiber >= 1 ? 3 : 0;
          const balanceBonus = (nutrition.protein >= 8 && nutrition.fiber >= 3 && nutrition.sugar <= 12) ? 6 : 0;
          rawScore = Math.min(95, balancedScore + proteinBonus + fiberBonus + balanceBonus - (nutrition.sugar * 0.4));
          break;
      }
      
      rawScore = Math.max(12, Math.min(95, rawScore));
      break;
      
    case 'life':
      if (!goals.lifeGoal) return 0;
      const { lifeGoal } = goals;
      
      switch (lifeGoal) {
        case 'boost-energy':
          // More precise energy scoring
          const complexCarbScore = nutrition.fiber >= 5 ? 24 : nutrition.fiber >= 3 ? 18 : nutrition.fiber >= 1 ? 10 : 3;
          const proteinEnergyScore = nutrition.protein >= 12 ? 22 : nutrition.protein >= 8 ? 17 : nutrition.protein >= 4 ? 11 : nutrition.protein >= 2 ? 6 : 1;
          const sugarCrashPenalty = nutrition.sugar > 25 ? -28 : nutrition.sugar > 18 ? -20 : nutrition.sugar > 12 ? -14 : nutrition.sugar > 8 ? -8 : nutrition.sugar > 4 ? -3 : 4;
          const sodiumPenalty = nutrition.sodium > 1000 ? -12 : nutrition.sodium > 600 ? -8 : nutrition.sodium > 300 ? -4 : 0;
          const ironBonus = nutrition.protein >= 10 ? 3 : 0; // Proxy for iron content
          
          rawScore = 48 + complexCarbScore + proteinEnergyScore + sugarCrashPenalty + sodiumPenalty + ironBonus;
          break;
          
        case 'clear-skin':
          // Enhanced skin health scoring
          const antiInflammatoryScore = nutrition.fiber >= 6 ? 22 : nutrition.fiber >= 4 ? 16 : nutrition.fiber >= 2 ? 10 : nutrition.fiber >= 1 ? 5 : 0;
          const sugarSkinPenalty = nutrition.sugar > 20 ? -32 : nutrition.sugar > 15 ? -24 : nutrition.sugar > 10 ? -16 : nutrition.sugar > 6 ? -8 : nutrition.sugar > 3 ? -3 : 6;
          const processedPenalty = (nutrition.additives?.length || 0) > 8 ? -18 : (nutrition.additives?.length || 0) > 5 ? -14 : (nutrition.additives?.length || 0) > 2 ? -8 : (nutrition.additives?.length || 0) > 0 ? -3 : 8;
          const saturatedFatPenalty = nutrition.saturatedFat > 12 ? -16 : nutrition.saturatedFat > 8 ? -12 : nutrition.saturatedFat > 4 ? -6 : nutrition.saturatedFat > 2 ? -2 : 2;
          const antioxidantBonus = nutrition.fiber >= 4 ? 4 : 0; // Proxy for antioxidants
          
          rawScore = 58 + antiInflammatoryScore + sugarSkinPenalty + processedPenalty + saturatedFatPenalty + antioxidantBonus;
          break;
          
        case 'feel-better':
          // Comprehensive wellness scoring
          const wholeFoodScore = (nutrition.additives?.length || 0) <= 1 ? 26 : (nutrition.additives?.length || 0) <= 3 ? 20 : (nutrition.additives?.length || 0) <= 6 ? 14 : (nutrition.additives?.length || 0) <= 10 ? 8 : 3;
          const balancedNutritionScore = (nutrition.protein >= 6 && nutrition.fiber >= 3) ? 18 : (nutrition.protein >= 3 && nutrition.fiber >= 1) ? 12 : 6;
          const lowSugarBonus = nutrition.sugar <= 6 ? 16 : nutrition.sugar <= 10 ? 10 : nutrition.sugar <= 15 ? 4 : nutrition.sugar <= 20 ? -2 : -8;
          const lowSodiumBonus = nutrition.sodium <= 200 ? 14 : nutrition.sodium <= 400 ? 8 : nutrition.sodium <= 700 ? 3 : nutrition.sodium <= 1000 ? -2 : -6;
          const digestibilityBonus = nutrition.fiber >= 3 && nutrition.fiber <= 8 ? 4 : 0;
          
          rawScore = 22 + wholeFoodScore + balancedNutritionScore + lowSugarBonus + lowSodiumBonus + digestibilityBonus;
          break;
          
        case 'eat-healthier':
        default:
          // Enhanced general health scoring
          const baseHealthScore = nutrition.healthScore;
          const fiberBonus = nutrition.fiber >= 8 ? 14 : nutrition.fiber >= 5 ? 10 : nutrition.fiber >= 3 ? 6 : nutrition.fiber >= 1 ? 3 : 0;
          const proteinBonus = nutrition.protein >= 15 ? 9 : nutrition.protein >= 10 ? 6 : nutrition.protein >= 5 ? 3 : 0;
          const lowProcessingBonus = (nutrition.additives?.length || 0) <= 1 ? 8 : (nutrition.additives?.length || 0) <= 3 ? 4 : 0;
          const micronutrientProxy = (nutrition.fiber + nutrition.protein) >= 12 ? 5 : 0;
          
          rawScore = Math.min(95, baseHealthScore + fiberBonus + proteinBonus + lowProcessingBonus + micronutrientProxy - (nutrition.sugar * 0.5));
          break;
      }
      
      rawScore = Math.max(14, Math.min(95, rawScore));
      break;
  }
  
  // Round to nearest 0.5 for precise but readable scores
  return Math.round(rawScore * 2) / 2;
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
  const [showIngredientListModal, setShowIngredientListModal] = useState<boolean>(false);
  const [forYouAnalysis, setForYouAnalysis] = useState<string>('');
  const [isAnalyzingForYou, setIsAnalyzingForYou] = useState<boolean>(false);
  const [isForYouSectionExpanded, setIsForYouSectionExpanded] = useState<boolean>(false);
  const forYouSectionHeight = useRef(new Animated.Value(0)).current;
  const [allergenWarnings, setAllergenWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const activeTabRef = useRef<number>(0);
  const [categoryScores, setCategoryScores] = useState<{ health?: number; diet?: number; body?: number; life?: number }>({});
  const tabTranslateX = useRef(new Animated.Value(0)).current;
  const [tabHeights, setTabHeights] = useState<number[]>([0, 0]);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  
  const slideUpValue = useRef(new Animated.Value(screenHeight)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  
  const loadingMessages = getLoadingMessages();
  
  // Keep ref in sync with state so gesture handlers always see latest tab
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        return adx > 8 && adx > ady * 1.5 && ady < 14;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        return adx > 8 && adx > ady * 1.5 && ady < 14;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        tabTranslateX.stopAnimation();
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync();
        }
      },
      onPanResponderMove: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        if (ady > adx || ady > 20) {
          return;
        }
        const width = Dimensions.get('window').width;
        const baseTranslation = activeTabRef.current === 0 ? 0 : -width;
        let translationX = baseTranslation + dx;
        if (translationX > 0) {
          translationX = dx * 0.98;
        } else if (translationX < -width) {
          translationX = -width + (dx + width) * 0.98;
        }
        tabTranslateX.setValue(translationX);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const { dx, vx } = gestureState;
        const width = Dimensions.get('window').width;
        const distanceThreshold = 8;
        const velocityThreshold = 0.01;
        const shouldSwitch = Math.abs(dx) > distanceThreshold || Math.abs(vx) > velocityThreshold;
        let targetTab = activeTabRef.current;
        let targetTranslation = activeTabRef.current === 0 ? 0 : -width;
        if (shouldSwitch) {
          if (dx > 0 && activeTabRef.current === 1) {
            targetTab = 0;
            targetTranslation = 0;
          } else if (dx < 0 && activeTabRef.current === 0) {
            targetTab = 1;
            targetTranslation = -width;
          }
        }
        if (targetTab !== activeTabRef.current) {
          setActiveTab(targetTab);
          activeTabRef.current = targetTab;
          const newHeight = tabHeights[targetTab] ?? 0;
          if (newHeight > 0) setContainerHeight(newHeight);
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
        Animated.spring(tabTranslateX, {
          toValue: targetTranslation,
          tension: 110,
          friction: 7,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        const width = Dimensions.get('window').width;
        const targetTranslation = activeTabRef.current === 0 ? 0 : -width;
        Animated.spring(tabTranslateX, {
          toValue: targetTranslation,
          tension: 90,
          friction: 10,
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
  
  useEffect(() => {
    if (!nutrition || !profile?.goals) return;
    try {
      console.log('Computing category scores from personalized engine');
      const neutralGoals = {
        healthGoal: 'balanced' as const,
        dietGoal: 'balanced' as const,
        bodyGoal: 'maintain-weight' as const,
        lifeGoal: 'eat-healthier' as const,
        healthStrictness: 'neutral' as const,
        dietStrictness: 'neutral' as const,
        lifeStrictness: 'neutral' as const,
      };
      const healthGoals = { ...neutralGoals, healthGoal: profile.goals.healthGoal ?? 'balanced', healthStrictness: profile.goals.healthStrictness ?? 'neutral' };
      const dietGoals = { ...neutralGoals, dietGoal: profile.goals.dietGoal ?? 'balanced', dietStrictness: profile.goals.dietStrictness ?? 'neutral' };
      const bodyGoals = { ...neutralGoals, bodyGoal: profile.goals.bodyGoal ?? 'maintain-weight' };
      const lifeGoals = { ...neutralGoals, lifeGoal: profile.goals.lifeGoal ?? 'eat-healthier', lifeStrictness: profile.goals.lifeStrictness ?? 'neutral' };
      const h = Math.round(personalScore(nutrition, healthGoals as any).score * 2) / 2;
      const d = Math.round(personalScore(nutrition, dietGoals as any).score * 2) / 2;
      const b = Math.round(personalScore(nutrition, bodyGoals as any).score * 2) / 2;
      const l = Math.round(personalScore(nutrition, lifeGoals as any).score * 2) / 2;
      console.log('Category scores computed:', { h, d, b, l });
      setCategoryScores({ health: h, diet: d, body: b, life: l });
    } catch (e) {
      console.error('Failed computing category scores', e);
      setCategoryScores({});
    }
  }, [nutrition, profile?.goals]);
  
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

  // Create a simple cache for ingredient analysis
  const ingredientAnalysisCache = useRef<Map<string, IngredientAnalysis[]>>(new Map());

  const analyzeIngredients = useCallback(async (ingredients: string[]) => {
    if (!ingredients || ingredients.length === 0) return;
    
    // Create cache key from ingredients list
    const cacheKey = ingredients.sort().join('|');
    
    // Check cache first
    if (ingredientAnalysisCache.current.has(cacheKey)) {
      console.log('Using cached ingredient analysis');
      setIngredientAnalysis(ingredientAnalysisCache.current.get(cacheKey)!);
      return;
    }
    
    setIsAnalyzingIngredients(true);
    console.log('Analyzing ingredients:', ingredients.length, 'items');
    
    // Check for allergen warnings first (this is fast)
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
      // Limit ingredients to first 8 for faster processing
      const limitedIngredients = ingredients.slice(0, 8);
      
      // Build simplified context based on user goals
      let goalContext = '';
      if (profile.hasCompletedQuiz && profile.goals) {
        const { dietGoal, healthGoal } = profile.goals;
        const goals = [dietGoal, healthGoal].filter(Boolean);
        if (goals.length > 0) {
          goalContext = `User goals: ${goals.join(', ')}. `;
        }
      }
      
      const messages = [
        {
          role: 'system' as const,
          content: `You are a nutrition expert. Analyze ingredients quickly and concisely. ${goalContext}For each ingredient, provide:
- ingredient: exact name
- description: 1-2 sentences on health impact
- isGood: true/false based on general health and user goals
- purpose: brief functional role

Respond with ONLY valid JSON array, no extra text.`
        },
        {
          role: 'user' as const,
          content: `Analyze: ${limitedIngredients.join(', ')}`
        }
      ];

      // Shorter timeout for faster response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
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
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Parse the AI response more efficiently
      let cleanedResponse = result.completion.trim();
      
      // Extract JSON array
      const jsonMatch = cleanedResponse.match(/\[([\s\S]*?)\]/);
      if (jsonMatch) {
        cleanedResponse = '[' + jsonMatch[1] + ']';
      }
      
      let analysisData;
      try {
        analysisData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('JSON parsing failed, using fallback');
        throw new Error('Failed to parse response');
      }
      
      if (Array.isArray(analysisData) && analysisData.length > 0) {
        // Cache the result
        ingredientAnalysisCache.current.set(cacheKey, analysisData);
        setIngredientAnalysis(analysisData);
        console.log('Ingredient analysis completed and cached');
      } else {
        throw new Error('Invalid analysis format');
      }
      
    } catch (error) {
      console.error('Error analyzing ingredients:', error);
      // Fast fallback analysis
      const basicAnalysis = ingredients.slice(0, 8).map(ingredient => ({
        ingredient,
        description: 'Quick analysis: This ingredient is commonly used in food products.',
        isGood: !ingredient.toLowerCase().includes('artificial') && 
                !ingredient.toLowerCase().includes('preservative') &&
                !ingredient.toLowerCase().includes('color') &&
                !ingredient.toLowerCase().includes('flavor'),
        purpose: 'Food ingredient with various functional properties.'
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
            <View style={[styles.swipeableContainer, { height: containerHeight || undefined }]}>

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
                <View
                  style={[styles.tabContent, { width: screenWidth }]}
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    setTabHeights((prev) => {
                      const next = [...prev] as number[];
                      next[0] = h;
                      return next;
                    });
                    if (activeTabRef.current === 0 && (!containerHeight || containerHeight < 10)) {
                      setContainerHeight(h);
                    }
                  }}
                >
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
                    
                    {/* Tab Indicators between Personal Score and Macro Breakdown */}
                    <View style={styles.tabIndicatorBetweenSections}>
                      <View style={styles.tabIndicatorsWithArrows}>
                        <TouchableOpacity
                          style={styles.tabArrow}
                          onPress={() => {
                            if (activeTab !== 0) {
                              setActiveTab(0);
                              Animated.spring(tabTranslateX, {
                                toValue: 0,
                                tension: 90,
                                friction: 10,
                                useNativeDriver: true,
                              }).start();
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.tabArrowText, { color: activeTab === 0 ? Colors.retroNeonTurquoise : colors.textSecondary }]}>‹</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.tabIndicators}>
                          <TouchableOpacity
                            testID="tab-dot-personal-score"
                            style={[
                              styles.tabIndicatorSmall,
                              {
                                backgroundColor: activeTab === 0 ? Colors.retroNeonTurquoise : colors.textSecondary + '30',
                              },
                            ]}
                            onPress={() => {
                              if (activeTab !== 0) {
                                setActiveTab(0);
                                Animated.spring(tabTranslateX, {
                                  toValue: 0,
                                  tension: 90,
                                  friction: 10,
                                  useNativeDriver: true,
                                }).start();
                              }
                            }}
                            activeOpacity={0.7}
                          />
                          <TouchableOpacity
                            testID="tab-dot-ingredient-breakdown"
                            style={[
                              styles.tabIndicatorSmall,
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
                                  tension: 90,
                                  friction: 10,
                                  useNativeDriver: true,
                                }).start();
                              }
                            }}
                            activeOpacity={0.7}
                          />
                        </View>
                        
                        <TouchableOpacity
                          style={styles.tabArrow}
                          onPress={() => {
                            if (activeTab !== 1) {
                              setActiveTab(1);
                              const screenWidth = Dimensions.get('window').width;
                              Animated.spring(tabTranslateX, {
                                toValue: -screenWidth,
                                tension: 90,
                                friction: 10,
                                useNativeDriver: true,
                              }).start();
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.tabArrowText, { color: activeTab === 1 ? Colors.retroNeonTurquoise : colors.textSecondary }]}>›</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.macroInlineContainer}>
                      <View style={styles.macroInlineHeader}>
                        <Zap size={18} color={Colors.retroNeonTurquoise} />
                        <Text style={[styles.macroInlineTitle, { color: colors.textPrimary }]}>Macro Breakdown</Text>
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



                  </View>

                </View>
                
                {/* Tab 2: Ingredient Breakdown */}
                <View
                  style={[styles.tabContent, { width: screenWidth }]}
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    setTabHeights((prev) => {
                      const next = [...prev] as number[];
                      next[1] = h;
                      return next;
                    });
                    if (activeTabRef.current === 1 && (!containerHeight || containerHeight < 10)) {
                      setContainerHeight(h);
                    }
                  }}
                >
                  <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardHeader}>
                      <List size={20} color={Colors.retroNeonTurquoise} />
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Ingredient Breakdown</Text>
                    </View>
                    
                    <View style={styles.ingredientBreakdownContainer}>
                      {isAnalyzingIngredients ? (
                        <View style={styles.loadingIngredients}>
                          <Text style={[styles.loadingIngredientsText, { color: colors.textSecondary }]}>Analyzing ingredients...</Text>
                        </View>
                      ) : (
                        <View style={styles.ingredientSummaryLayout}>
                          {/* Left side - Circular Summary */}
                          <View style={styles.ingredientSummaryLeft}>
                            <Text style={[styles.ingredientSummaryTitle, { color: colors.textPrimary }]}>Ingredients Summary</Text>
                            
                            <View style={styles.ingredientCircleContainer}>
                              {/* Base circle */}
                              <View style={[styles.ingredientCircle, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '20' }]}>
                                <Text style={[styles.ingredientCircleNumber, { color: colors.textPrimary }]}>
                                  {ingredientAnalysis.length}
                                </Text>
                                <Text style={[styles.ingredientCircleLabel, { color: colors.textSecondary }]}>Ingredients</Text>
                              </View>
                              
                              {/* Proportional color rings */}
                              {ingredientAnalysis.length > 0 && (() => {
                                const cleanCount = ingredientAnalysis.filter(i => i.isGood).length;
                                const questionableCount = ingredientAnalysis.filter(i => !i.isGood && !i.ingredient.toLowerCase().includes('artificial') && !i.ingredient.toLowerCase().includes('preservative')).length;
                                const stayAwayCount = ingredientAnalysis.filter(i => i.ingredient.toLowerCase().includes('artificial') || i.ingredient.toLowerCase().includes('preservative')).length;
                                const total = ingredientAnalysis.length;
                                
                                const cleanPercentage = (cleanCount / total) * 100;
                                const questionablePercentage = (questionableCount / total) * 100;
                                const stayAwayPercentage = (stayAwayCount / total) * 100;
                                
                                // Create segments for the ring
                                const segments = [];
                                let currentAngle = 0;
                                
                                // Clean segment (green)
                                if (cleanCount > 0) {
                                  const segmentAngle = (cleanPercentage / 100) * 360;
                                  segments.push({
                                    color: Colors.success,
                                    startAngle: currentAngle,
                                    endAngle: currentAngle + segmentAngle,
                                  });
                                  currentAngle += segmentAngle;
                                }
                                
                                // Questionable segment (orange)
                                if (questionableCount > 0) {
                                  const segmentAngle = (questionablePercentage / 100) * 360;
                                  segments.push({
                                    color: Colors.warning,
                                    startAngle: currentAngle,
                                    endAngle: currentAngle + segmentAngle,
                                  });
                                  currentAngle += segmentAngle;
                                }
                                
                                // Stay away segment (red)
                                if (stayAwayCount > 0) {
                                  const segmentAngle = (stayAwayPercentage / 100) * 360;
                                  segments.push({
                                    color: Colors.error,
                                    startAngle: currentAngle,
                                    endAngle: currentAngle + segmentAngle,
                                  });
                                }
                                
                                return (
                                  <>
                                    {segments.map((segment, index) => {
                                      // Create multiple small segments to approximate the arc
                                      const segmentElements = [];
                                      const angleStep = 3; // degrees per segment
                                      const numSteps = Math.ceil((segment.endAngle - segment.startAngle) / angleStep);
                                      
                                      for (let i = 0; i < numSteps; i++) {
                                        const stepStartAngle = segment.startAngle + (i * angleStep);
                                        const stepEndAngle = Math.min(segment.startAngle + ((i + 1) * angleStep), segment.endAngle);
                                        const midAngle = (stepStartAngle + stepEndAngle) / 2;
                                        
                                        // Convert to radians and position the segment
                                        const radians = (midAngle - 90) * (Math.PI / 180); // -90 to start from top
                                        const radius = 54; // Distance from center
                                        const x = Math.cos(radians) * radius;
                                        const y = Math.sin(radians) * radius;
                                        
                                        segmentElements.push(
                                          <View
                                            key={`${index}-${i}`}
                                            style={[
                                              styles.ingredientRingSegment,
                                              {
                                                backgroundColor: segment.color,
                                                left: 60 + x - 2, // 60 is half of circle width (120/2)
                                                top: 60 + y - 2,  // 60 is half of circle height (120/2)
                                                transform: [{ rotate: `${midAngle}deg` }],
                                              },
                                            ]}
                                          />
                                        );
                                      }
                                      
                                      return segmentElements;
                                    })}
                                  </>
                                );
                              })()}
                            </View>
                          </View>
                          
                          {/* Right side - Category Breakdown */}
                          <View style={styles.ingredientSummaryRight}>
                            <TouchableOpacity 
                              style={styles.ingredientListHeader}
                              onPress={() => {
                                setShowIngredientListModal(true);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.ingredientListTitle, { color: Colors.retroNeonTurquoise }]}>Ingredient List</Text>
                              <ChevronRight size={16} color={Colors.retroNeonTurquoise} />
                            </TouchableOpacity>
                            
                            {ingredientAnalysis.length > 0 ? (
                              <View style={styles.ingredientCategoryList}>
                                {/* Clean Ingredients */}
                                <View style={styles.ingredientCategoryItem}>
                                  <View style={styles.ingredientCategoryBar}>
                                    <View style={[styles.ingredientCategoryProgress, { 
                                      backgroundColor: Colors.success,
                                      width: `${Math.max(10, (ingredientAnalysis.filter(i => {
                                        const name = i.ingredient.toLowerCase();
                                        if (name.includes('artificial') || name.includes('preservative') || name.includes('color') || name.includes('flavor')) return false;
                                        return i.isGood;
                                      }).length / Math.max(1, ingredientAnalysis.length)) * 100)}%`
                                    }]} />
                                  </View>
                                  <Text style={[styles.ingredientCategoryLabel, { color: colors.textPrimary }]}>
                                    Clean ({ingredientAnalysis.filter(i => {
                                      const name = i.ingredient.toLowerCase();
                                      if (name.includes('artificial') || name.includes('preservative') || name.includes('color') || name.includes('flavor')) return false;
                                      return i.isGood;
                                    }).length})
                                  </Text>
                                </View>
                                
                                {/* Questionable Ingredients */}
                                <View style={styles.ingredientCategoryItem}>
                                  <View style={styles.ingredientCategoryBar}>
                                    <View style={[styles.ingredientCategoryProgress, { 
                                      backgroundColor: Colors.warning,
                                      width: `${Math.max(10, (ingredientAnalysis.filter(i => {
                                        const name = i.ingredient.toLowerCase();
                                        if (name.includes('artificial') || name.includes('preservative') || name.includes('color') || name.includes('flavor')) return false;
                                        return !i.isGood;
                                      }).length / Math.max(1, ingredientAnalysis.length)) * 100)}%`
                                    }]} />
                                  </View>
                                  <Text style={[styles.ingredientCategoryLabel, { color: colors.textPrimary }]}>
                                    Questionable ({ingredientAnalysis.filter(i => {
                                      const name = i.ingredient.toLowerCase();
                                      if (name.includes('artificial') || name.includes('preservative') || name.includes('color') || name.includes('flavor')) return false;
                                      return !i.isGood;
                                    }).length})
                                  </Text>
                                </View>
                                
                                {/* Processed Ingredients */}
                                <View style={styles.ingredientCategoryItem}>
                                  <View style={styles.ingredientCategoryBar}>
                                    <View style={[styles.ingredientCategoryProgress, { 
                                      backgroundColor: Colors.error,
                                      width: `${Math.max(10, (ingredientAnalysis.filter(i => {
                                        const name = i.ingredient.toLowerCase();
                                        return name.includes('artificial') || name.includes('preservative') || name.includes('color') || name.includes('flavor');
                                      }).length / Math.max(1, ingredientAnalysis.length)) * 100)}%`
                                    }]} />
                                  </View>
                                  <Text style={[styles.ingredientCategoryLabel, { color: colors.textPrimary }]}>
                                    Be Cautious ({ingredientAnalysis.filter(i => {
                                      const name = i.ingredient.toLowerCase();
                                      return name.includes('artificial') || name.includes('preservative') || name.includes('color') || name.includes('flavor');
                                    }).length})
                                  </Text>
                                </View>
                                
                                {/* Not Rated */}
                                <View style={styles.ingredientCategoryItem}>
                                  <View style={styles.ingredientCategoryBar}>
                                    <View style={[styles.ingredientCategoryProgress, { 
                                      backgroundColor: colors.textSecondary + '40',
                                      width: '5%'
                                    }]} />
                                  </View>
                                  <Text style={[styles.ingredientCategoryLabel, { color: colors.textPrimary }]}>
                                    Not Rated (0)
                                  </Text>
                                </View>
                              </View>
                            ) : (
                              <Text style={[styles.noIngredientsText, { color: colors.textSecondary }]}>
                                No ingredient analysis available
                              </Text>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {/* Tab Indicators between Ingredient Summary and Micro Breakdown */}
                  <View style={styles.tabIndicatorBetweenSections}>
                    <View style={styles.tabIndicatorsWithArrows}>
                      <TouchableOpacity
                        style={styles.tabArrow}
                        onPress={() => {
                          if (activeTab !== 0) {
                            setActiveTab(0);
                            Animated.spring(tabTranslateX, {
                              toValue: 0,
                              tension: 90,
                              friction: 10,
                              useNativeDriver: true,
                            }).start();
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tabArrowText, { color: activeTab === 0 ? Colors.retroNeonTurquoise : colors.textSecondary }]}>‹</Text>
                      </TouchableOpacity>
                      
                      <View style={styles.tabIndicators}>
                        <TouchableOpacity
                          testID="tab-dot-ingredient-personal"
                          style={[
                            styles.tabIndicatorSmall,
                            {
                              backgroundColor: activeTab === 0 ? Colors.retroNeonTurquoise : colors.textSecondary + '30',
                            },
                          ]}
                          onPress={() => {
                            if (activeTab !== 0) {
                              setActiveTab(0);
                              Animated.spring(tabTranslateX, {
                                toValue: 0,
                                tension: 90,
                                friction: 10,
                                useNativeDriver: true,
                              }).start();
                            }
                          }}
                          activeOpacity={0.7}
                        />
                        <TouchableOpacity
                          testID="tab-dot-ingredient-breakdown"
                          style={[
                            styles.tabIndicatorSmall,
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
                                tension: 90,
                                friction: 10,
                                useNativeDriver: true,
                              }).start();
                            }
                          }}
                          activeOpacity={0.7}
                        />
                      </View>
                      
                      <TouchableOpacity
                        style={styles.tabArrow}
                        onPress={() => {
                          if (activeTab !== 1) {
                            setActiveTab(1);
                            const screenWidth = Dimensions.get('window').width;
                            Animated.spring(tabTranslateX, {
                              toValue: -screenWidth,
                              tension: 90,
                              friction: 10,
                              useNativeDriver: true,
                            }).start();
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tabArrowText, { color: activeTab === 1 ? Colors.retroNeonTurquoise : colors.textSecondary }]}>›</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* Micro Breakdown Section */}
                  <View style={styles.microBreakdownContainer}>
                    <View style={styles.microBreakdownHeader}>
                      <Target size={18} color={Colors.retroPink} />
                      <Text style={[styles.microBreakdownTitle, { color: colors.textPrimary }]}>Micro Breakdown</Text>
                    </View>
                    {(() => {
                      type Micro = { key: string; label: string; valueMg?: number; valueMcg?: number; valueG?: number; dv: number; unit: 'mg' | 'mcg' | 'g'; };
                      const toPct = (num: number | undefined, dv: number) => {
                        const v = typeof num === 'number' ? num : 0;
                        const pct = Math.max(0, Math.min(300, (v / dv) * 100));
                        return Math.round(pct);
                      };
                      const micros: Micro[] = [
                        { key: 'vitamin_c', label: 'Vitamin C', valueMg: nutrition.vitamin_c_mg, dv: 90, unit: 'mg' },
                        { key: 'iron', label: 'Iron', valueMg: nutrition.iron_mg, dv: 18, unit: 'mg' },
                        { key: 'b12', label: 'B12 (Cobalamin)', valueMcg: nutrition.vitamin_b12_mcg, dv: 2.4, unit: 'mcg' },
                        { key: 'calcium', label: 'Calcium', valueMg: nutrition.calcium_mg, dv: 1300, unit: 'mg' },
                        { key: 'folate', label: 'Folate', valueMcg: nutrition.folate_mcg, dv: 400, unit: 'mcg' },
                        { key: 'vitamin_a', label: 'Vitamin A', valueMcg: nutrition.vitamin_a_mcg, dv: 900, unit: 'mcg' },
                        { key: 'potassium', label: 'Potassium', valueMg: nutrition.potassium_mg, dv: 4700, unit: 'mg' },
                        { key: 'magnesium', label: 'Magnesium', valueMg: nutrition.magnesium_mg, dv: 420, unit: 'mg' },
                        { key: 'zinc', label: 'Zinc', valueMg: nutrition.zinc_mg, dv: 11, unit: 'mg' },
                      ];
                      const rows = micros.map((m) => {
                        const raw = m.unit === 'g' ? (m.valueG ?? 0) : m.unit === 'mg' ? (m.valueMg ?? 0) : (m.valueMcg ?? 0);
                        const pct = toPct(raw, m.dv);
                        return { ...m, pct, raw };
                      });
                      const left = rows.filter((_r, i) => i % 2 === 0);
                      const right = rows.filter((_r, i) => i % 2 === 1);
                      const renderCol = (col: typeof rows, testPrefix: string) => (
                        <View style={styles.microCol}>
                          {col.map((r) => (
                            <View key={r.key} style={styles.microRow} testID={`micro-row-${testPrefix}-${r.key}`}>
                              <View style={styles.microRowHeader}>
                                <Text style={[styles.microLabelText, { color: colors.textPrimary }]}>{r.label}</Text>
                                <Text style={[styles.microPctText, { color: colors.textSecondary }]}>{r.pct}%</Text>
                              </View>
                              <View style={[styles.microBarTrack, { backgroundColor: colors.textSecondary + '25' }]}>
                                <View style={[styles.microBarFill, { width: `${Math.min(100, r.pct)}%`, backgroundColor: Colors.retroNeonTurquoise }]} />
                              </View>
                            </View>
                          ))}
                        </View>
                      );
                      return (
                        <View style={styles.microBarsGrid}>
                          {renderCol(left, 'left')}
                          {renderCol(right, 'right')}
                        </View>
                      );
                    })()}
                  </View>
                </View>
              </Animated.View>
              {/* Persistent Tab Indicators */}
              <View style={styles.tabIndicatorContainer}>
                <View style={styles.tabIndicatorsWithArrows}>
                  <TouchableOpacity
                    style={styles.tabArrow}
                    onPress={() => {
                      if (activeTab !== 0) {
                        setActiveTab(0);
                        Animated.spring(tabTranslateX, {
                          toValue: 0,
                          tension: 90,
                          friction: 10,
                          useNativeDriver: true,
                        }).start();
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabArrowText, { color: activeTab === 0 ? Colors.retroNeonTurquoise : colors.textSecondary }]}>‹</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.tabIndicators}>
                    <TouchableOpacity
                      testID="tab-dot-base-personal"
                      style={[
                        styles.tabIndicatorSmall,
                        {
                          backgroundColor: activeTab === 0 ? Colors.retroNeonTurquoise : colors.textSecondary + '30',
                        },
                      ]}
                      onPress={() => {
                        if (activeTab !== 0) {
                          setActiveTab(0);
                          Animated.spring(tabTranslateX, {
                            toValue: 0,
                            tension: 90,
                            friction: 10,
                            useNativeDriver: true,
                          }).start();
                        }
                      }}
                      activeOpacity={0.7}
                    />
                    <TouchableOpacity
                      testID="tab-dot-goal"
                      style={[
                        styles.tabIndicatorSmall,
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
                            tension: 90,
                            friction: 10,
                            useNativeDriver: true,
                          }).start();
                        }
                      }}
                      activeOpacity={0.7}
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={styles.tabArrow}
                    onPress={() => {
                      if (activeTab !== 1) {
                        setActiveTab(1);
                        const screenWidth = Dimensions.get('window').width;
                        Animated.spring(tabTranslateX, {
                          toValue: -screenWidth,
                          tension: 90,
                          friction: 10,
                          useNativeDriver: true,
                        }).start();
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabArrowText, { color: activeTab === 1 ? Colors.retroNeonTurquoise : colors.textSecondary }]}>›</Text>
                  </TouchableOpacity>
                </View>
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
                    outputRange: [0, 420],
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
                        <View style={styles.inlineActions}>
                          <TouchableOpacity
                            testID="for-you-add-to-grocery"
                            style={[styles.inlineActionButton, { borderColor: Colors.retroNeonTurquoise }]}
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
                                console.log('Added to grocery list from For You:', nutrition.name);
                              } catch (error) {
                                console.error('Error adding to grocery list:', error);
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <ShoppingCart size={16} color={Colors.retroNeonTurquoise} />
                            <Text style={[styles.inlineActionText, { color: Colors.retroNeonTurquoise }]}>Add to list</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            testID="for-you-better-bites"
                            style={[styles.inlineActionButtonFilled, { backgroundColor: Colors.retroNeonTurquoise }]}
                            onPress={async () => {
                              if (Platform.OS !== 'web') {
                                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }
                              setShowBetterSwapsModal(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.inlineActionTextFilled, { color: colors.white }]}>Better Bites</Text>
                            <ArrowRight size={16} color={colors.white} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            testID="for-you-saved"
                            style={[styles.inlineActionButton, { borderColor: Colors.success }]}
                            onPress={onSaveToHistory}
                            activeOpacity={0.8}
                          >
                            <CheckCircle size={16} color={Colors.success} />
                            <Text style={[styles.inlineActionText, { color: Colors.success }]}>Saved</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            testID="for-you-scan-another"
                            style={[styles.inlineActionButton, { borderColor: Colors.retroPink }]}
                            onPress={onScanAnother}
                            activeOpacity={0.8}
                          >
                            <Sparkles size={16} color={Colors.retroPink} />
                            <Text style={[styles.inlineActionText, { color: Colors.retroPink }]}>Scan another</Text>
                          </TouchableOpacity>
                        </View>
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
      
      {/* Ingredient List Modal */}
      <IngredientListModal
        visible={showIngredientListModal}
        onClose={() => setShowIngredientListModal(false)}
        ingredients={ingredientAnalysis}
        isLoading={isAnalyzingIngredients}
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
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
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
    maxHeight: 800,
    flex: 1,
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
  
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  inlineActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  inlineActionButtonFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  inlineActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inlineActionTextFilled: {
    fontSize: 13,
    fontWeight: '700',
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
    padding: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  
  vibeCheckContainer: {
    paddingHorizontal: 4,
  },
  
  vibeCheckCard: {
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 8,
    gap: 8,
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
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0.1,
    textAlign: 'left',
    color: Colors.retroCharcoalBlack,
    marginBottom: 8,
  },
  
  // Inline Macro containers (no gaps)
  macroInlineContainer: {
    marginTop: 0,
    paddingTop: 8,
  },
  macroInlineContainerGoal: {
    marginTop: 16,
    paddingTop: 8,
    marginHorizontal: 16,
  },
  macroInlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  macroInlineTitle: {
    fontSize: 16,
    fontWeight: '700',
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
  
  // Micro Breakdown Styles
  microInlineContainer: {
    marginTop: 16,
    paddingTop: 8,
  },
  
  microInlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  
  microInlineTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  
  microGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.retroPink + '10',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 8,
  },
  
  microItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  microValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: Colors.retroPink,
  },
  
  microLabel: {
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
    marginTop: 8,
    marginBottom: 0,
  },
  
  tabIndicatorBetweenSections: {
    alignItems: 'center',
    marginVertical: 16,
  },
  
  tabIndicatorsWithArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  
  tabArrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  tabArrowText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  tabIndicators: {
    flexDirection: 'row',
    gap: 8,
  },
  
  tabIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  
  tabIndicatorSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  
  // Tab Content Styles
  tabContentContainer: {
    flexDirection: 'row',
    marginHorizontal: 0,
    marginBottom: 8,
  },
  
  tabContent: {
    marginRight: 0,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  
  // Ingredient Breakdown Container
  ingredientBreakdownContainer: {
    paddingVertical: 8,
    minHeight: 300,
    maxHeight: 600,
  },
  
  goalRatingItem: {
    paddingHorizontal: 4,
    width: '100%',
    maxWidth: 300,
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
    overflow: 'hidden',
    marginBottom: 0,
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
  
  // Overall Score Circle Styles
  overallScoreContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 8,
  },
  
  overallScoreCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  
  overallScoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    position: 'relative',
  },
  
  overallScoreInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  overallScoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  
  overallScoreRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  
  overallScoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Colors.retroCharcoalBlack,
  },
  
  // New Ingredient Summary Layout Styles
  ingredientSummaryLayout: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 20,
  },
  
  ingredientSummaryLeft: {
    flex: 1,
    alignItems: 'center',
  },
  
  ingredientSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.retroCharcoalBlack,
  },
  
  ingredientCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  ingredientCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  
  ingredientRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderStyle: 'solid',
  },
  
  ingredientRingSegment: {
    position: 'absolute',
    width: 4,
    height: 8,
    borderRadius: 2,
  },
  
  ingredientCircleNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.retroCharcoalBlack,
  },
  
  ingredientCircleLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    color: Colors.retroSlateGray,
  },
  
  ingredientSummaryRight: {
    flex: 1.2,
  },
  
  ingredientListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  
  ingredientListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.retroNeonTurquoise,
  },
  
  ingredientCategoryList: {
    gap: 12,
  },
  
  ingredientCategoryItem: {
    gap: 8,
  },
  
  ingredientCategoryBar: {
    height: 8,
    backgroundColor: Colors.retroSoftGray + '30',
    borderRadius: 4,
    overflow: 'hidden',
  },
  
  ingredientCategoryProgress: {
    height: '100%',
    borderRadius: 4,
    minWidth: 8,
  },
  
  ingredientCategoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.retroCharcoalBlack,
  },
  
  // Micro Breakdown Styles for Tab 2
  microBreakdownContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.retroPink + '05',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  
  microBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  
  microBreakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  microBarsGrid: {
    flexDirection: 'row',
    gap: 16,
  },

  microCol: {
    flex: 1,
  },

  microRow: {
    marginBottom: 12,
  },

  microRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  microLabelText: {
    fontSize: 14,
    fontWeight: '700',
  },

  microPctText: {
    fontSize: 12,
    fontWeight: '600',
  },

  microBarTrack: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },

  microBarFill: {
    height: '100%',
    backgroundColor: Colors.retroCharcoalBlack,
    borderRadius: 6,
  },
  
  microBreakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  microBreakdownValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  
  microBreakdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  microBreakdownSecondaryGrid: {
    display: 'none',
  },
  
  microBreakdownSecondaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  microBreakdownSecondaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  
  microBreakdownSecondaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

});