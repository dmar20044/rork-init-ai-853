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
} from 'react-native';
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
  Info,
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
import { useUser } from '@/contexts/UserContext';
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
  
  const slideUpValue = useRef(new Animated.Value(screenHeight)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  
  const loadingMessages = getLoadingMessages();
  
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
    if (score >= 41) return 'Bad';
    return 'Be Aware!';
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
  }, [profile.hasCompletedQuiz, profile.goals]);

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
          content: `You are a nutrition expert providing personalized food analysis. Write a concise 2-3 sentence explanation of why this product is or isn't a good choice for the user's specific goals. Be encouraging but honest. Focus on how it aligns or conflicts with their goals.`
        },
        {
          role: 'user' as const,
          content: `Product: ${nutrition.name}
Personalized Score: ${score}/100
User Goals: ${goalsContext}
Ingredients: ${nutrition.ingredients?.join(', ') || 'Not available'}

Explain why this product ${score >= 66 ? 'is' : 'isn\'t'} a good choice for my goals.`
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
      <View style={styles.loadingContainer}>
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
                <Sparkles size={20} color="#4ECDC4" />
              ) : index % 3 === 1 ? (
                <Zap size={18} color="#FF6B81" />
              ) : (
                <Star size={16} color="#2E294E" />
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
              <Heart size={12} color="#FF6B81" />
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
                  <View style={[styles.fireworkDot, { backgroundColor: i % 2 === 0 ? '#4ECDC4' : '#FF6B81' }]} />
                </Animated.View>
              ))}
            </View>
          )}
        </View>
        
        {/* Main Loading Card */}
        <Animated.View style={[
          styles.shimmerCard,
          {
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
            <View style={styles.progressBarBackground}>
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
            <Text style={styles.progressText}>{Math.round(loadingProgress)}%</Text>
          </View>
          
          {/* Animated Progress Bars */}
          <View style={styles.shimmerBars}>
            {[80, 60, 90].map((width, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.shimmerBar,
                  {
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
                <Icon size={16} color="#4ECDC4" />
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
          {/* Hero Score Section */}
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
                <View style={[styles.scoreRing, { backgroundColor: colors.surface, shadowColor: getScoreColor(showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore) }]}>
                  <View style={styles.scoreRingInner}>
                    <Text style={[styles.scoreNumber, { color: getScoreColor(showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore) }]}>
                      {showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore}
                    </Text>
                    <Text style={[styles.scoreOutOf, { color: colors.textSecondary }]}>/100</Text>
                  </View>
                </View>
                <View style={[styles.scoreRingProgress, { borderColor: getScoreColor(showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore) }]} />
              </View>
              
              <Text style={[styles.personalScoreSubtitle, { color: colors.textSecondary }]}>Personal Score</Text>
              
              {/* Score Comparison Row */}
              {showPersonalized && nutrition.personalScore !== undefined && nutrition.personalScore !== nutrition.healthScore && (
                <View style={styles.comparisonContainer}>
                  <View style={styles.comparisonRow}>
                    <View style={[styles.baseScoreChip, { backgroundColor: colors.textSecondary + '10' }]}>
                      <Text style={[styles.baseScoreLabel, { color: colors.textSecondary }]}>Base Score</Text>
                      <Text style={[styles.baseScoreValue, { color: colors.textPrimary }]}>{nutrition.healthScore}</Text>
                    </View>
                    
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
                    
                    <View style={[styles.personalScoreChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                      <Text style={[styles.personalScoreLabel, { color: colors.primary }]}>Your Score</Text>
                      <Text style={[styles.personalScoreValue, { color: colors.primary }]}>{nutrition.personalScore}</Text>
                    </View>
                  </View>
                  

                </View>
              )}
            </View>
            
            {/* Result Label */}
            <View style={styles.resultSection}>
              <View style={[styles.resultBadge, { 
                backgroundColor: getScoreColor(showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore) + '20',
                borderColor: getScoreColor(showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore)
              }]}>
                <AlertTriangle size={16} color={getScoreColor(showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore)} />
                <Text style={[styles.resultBadgeText, { 
                  color: getScoreColor(showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore)
                }]}>
                  {getScoreStatus(showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore)}
                </Text>
              </View>
              <View style={styles.resultMessageContainer}>
                {(() => {
                  const score = showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore;
                  if (score >= 86) return (
                    <>
                      <Award size={16} color={Colors.scoreExcellent} />
                      <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>Excellent choice! This aligns perfectly with your goals.</Text>
                    </>
                  );
                  if (score >= 75) return (
                    <>
                      <CheckCircle size={16} color={Colors.scoreGood} />
                      <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>Good pick! This works well for your health goals.</Text>
                    </>
                  );
                  if (score >= 55) return (
                    <>
                      <AlertCircle size={16} color={Colors.scoreMediocre} />
                      <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>This could work better for your goals — consider alternatives.</Text>
                    </>
                  );
                  if (score >= 41) return (
                    <>
                      <Target size={16} color={Colors.scorePoor} />
                      <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>This doesn&apos;t align well with your goals — try a better swap?</Text>
                    </>
                  );
                  return (
                    <>
                      <Shield size={16} color={Colors.error} />
                      <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>Be aware! This product may not support your health goals.</Text>
                    </>
                  );
                })()}
              </View>
            </View>
          </View>



          {/* Macro Breakdown Section */}
          <View style={[styles.card, { backgroundColor: '#FDFDFD' }]}>
            <View style={styles.cardHeader}>
              <Zap size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Macro Breakdown</Text>
            </View>
            
            <View style={styles.macroGrid}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: colors.primary }]}>{nutrition.calories}</Text>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Calories</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: colors.primary }]}>{nutrition.protein}g</Text>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: colors.primary }]}>{nutrition.carbs}g</Text>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: colors.primary }]}>{nutrition.fat}g</Text>
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
            <View style={[styles.card, { backgroundColor: '#FDFDFD' }]}>
              <TouchableOpacity 
                style={styles.cardHeader}
                onPress={toggleIngredientSection}
                activeOpacity={0.7}
              >
                <List size={20} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Ingredient Breakdown</Text>
                {isIngredientSectionExpanded ? (
                  <ChevronDown size={20} color="#5F5F5F" style={styles.sectionChevron} />
                ) : (
                  <ChevronRight size={20} color="#5F5F5F" style={styles.sectionChevron} />
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
                          <View key={index} style={[styles.ingredientItem, { backgroundColor: colors.textSecondary + '05', borderLeftColor: colors.primary }]}>
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
                                <ChevronDown size={20} color="#5F5F5F" />
                              ) : (
                                <ChevronRight size={20} color="#5F5F5F" />
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
            <View style={[styles.card, { backgroundColor: '#FDFDFD' }]}>
              <TouchableOpacity 
                style={styles.cardHeader}
                onPress={toggleForYouSection}
                activeOpacity={0.7}
              >
                <Heart size={20} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>For You Analysis</Text>
                {isForYouSectionExpanded ? (
                  <ChevronDown size={20} color="#5F5F5F" style={styles.sectionChevron} />
                ) : (
                  <ChevronRight size={20} color="#5F5F5F" style={styles.sectionChevron} />
                )}
              </TouchableOpacity>
              
              <Animated.View style={[
                styles.collapsibleContent,
                {
                  maxHeight: forYouSectionHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 200], // Fixed max height for analysis content
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
                  <View style={styles.analysisContent}>
                    <Text style={[styles.analysisText, { color: colors.textPrimary }]}>{forYouAnalysis}</Text>
                  </View>
                )}
              </Animated.View>
            </View>
          )}

          {/* Call-to-Action Buttons */}
          <View style={styles.ctaSection}>
            <TouchableOpacity 
              style={[styles.addToGroceryButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={async () => {
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
              <ShoppingCart size={20} color={colors.primary} />
              <Text style={[styles.addToGroceryButtonText, { color: colors.primary }]}>Add to Grocery List</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.ctaButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              onPress={() => setShowBetterSwapsModal(true)}
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
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
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
    backgroundColor: '#FDFDFD', // Cream White
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
    backgroundColor: '#FDFDFD', // Cream White
    borderBottomColor: '#D9D9D9', // Soft Gray
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D9D9D9' + '30', // Soft Gray with opacity
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E1E1E', // Charcoal Black
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FDFDFD', // Cream White
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
    backgroundColor: '#FDFDFD', // Cream White
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    shadowColor: '#D9D9D9', // Soft Gray
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#2E294E20', // Deep Indigo with opacity
  },
  shimmerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#D9D9D9', // Soft Gray
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4ECDC4', // Neon Turquoise
  },
  loadingText: {
    fontSize: 16,
    color: '#5F5F5F', // Slate Gray
    marginBottom: 24,
    textAlign: 'center',
  },
  shimmerBars: {
    width: '100%',
    gap: 12,
  },
  shimmerBar: {
    height: 12,
    backgroundColor: '#D9D9D9', // Soft Gray
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
    backgroundColor: '#D9D9D9', // Soft Gray
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4ECDC4', // Neon Turquoise
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ECDC4', // Neon Turquoise
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
    backgroundColor: '#FDFDFD', // Cream White
    shadowColor: '#D9D9D9', // Soft Gray
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#2E294E15', // Deep Indigo with opacity
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
    color: '#1E1E1E', // Charcoal Black
  },
  servingSize: {
    fontSize: 14,
    marginBottom: 12,
    fontStyle: 'italic',
    color: '#5F5F5F', // Slate Gray
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
    color: '#5F5F5F', // Slate Gray
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
    color: '#5F5F5F', // Slate Gray
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
    color: '#1E1E1E', // Charcoal Black
  },
  
  personalScoreChip: {
    backgroundColor: '#4ECDC4' + '15', // Neon Turquoise with opacity
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#4ECDC4' + '30', // Neon Turquoise with opacity
  },
  
  personalScoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    color: '#4ECDC4', // Neon Turquoise
  },
  
  personalScoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4', // Neon Turquoise
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
    color: '#5F5F5F', // Slate Gray
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
    backgroundColor: '#FDFDFD', // Cream White
    shadowColor: '#D9D9D9', // Soft Gray
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#2E294E15', // Deep Indigo with opacity
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
    color: '#1E1E1E', // Charcoal Black
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
    backgroundColor: '#4ECDC4', // Neon Turquoise
  },
  secondaryButton: {
    backgroundColor: '#FDFDFD', // Cream White
    borderWidth: 2,
    borderColor: '#4ECDC4', // Neon Turquoise
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FDFDFD', // Cream White
  },
  secondaryButtonText: {
    color: '#4ECDC4', // Neon Turquoise
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
    color: '#5F5F5F', // Slate Gray
  },
  
  ingredientsScrollView: {
    maxHeight: 400,
  },
  
  ingredientsContent: {
    gap: 16,
    paddingBottom: 8,
  },
  
  ingredientItem: {
    backgroundColor: '#D9D9D9' + '20', // Soft Gray with opacity
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4', // Neon Turquoise
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
    color: '#1E1E1E', // Charcoal Black
  },
  
  ingredientDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D9D9D9', // Soft Gray
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
    color: '#5F5F5F', // Slate Gray
  },
  
  noIngredientsText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
    color: '#5F5F5F', // Slate Gray
  },
  
  // For You Analysis Styles
  loadingAnalysis: {
    padding: 16,
    alignItems: 'center',
  },
  
  loadingAnalysisText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#5F5F5F', // Slate Gray
  },
  
  analysisContent: {
    padding: 4,
  },
  
  analysisText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'left',
    color: '#1E1E1E', // Charcoal Black
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
    color: '#4ECDC4', // Neon Turquoise
  },
  
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#5F5F5F', // Slate Gray
  },
  
  macroSecondaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#D9D9D9' + '30', // Soft Gray with opacity
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
    color: '#1E1E1E', // Charcoal Black
  },
  
  macroSecondaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    color: '#5F5F5F', // Slate Gray
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

});