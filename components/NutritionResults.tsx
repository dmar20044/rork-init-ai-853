import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  PanResponder,
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
  
  // Sliding functionality state
  const [currentView, setCurrentView] = useState<'score' | 'goals'>('score');
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get('window');
  
  const loadingMessages = getLoadingMessages();
  
  // Pan responder for sliding between views
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal gestures with minimal vertical movement
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        slideAnimation.setOffset((slideAnimation as any)._value);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Constrain movement to prevent over-sliding
        const newValue = Math.max(-screenWidth, Math.min(0, gestureState.dx));
        slideAnimation.setValue(newValue);
      },
      onPanResponderRelease: (evt, gestureState) => {
        slideAnimation.flattenOffset();
        
        const threshold = screenWidth * 0.2; // 20% of screen width
        const velocity = gestureState.vx;
        
        // Determine target based on gesture
        let targetView: 'score' | 'goals';
        if (Math.abs(velocity) > 0.5) {
          // Fast swipe - use velocity direction
          targetView = velocity < 0 ? 'goals' : 'score';
        } else {
          // Slow swipe - use distance threshold
          targetView = gestureState.dx < -threshold ? 'goals' : 'score';
        }
        
        // Animate to target position
        const targetValue = targetView === 'score' ? 0 : -screenWidth;
        Animated.spring(slideAnimation, {
          toValue: targetValue,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        
        setCurrentView(targetView);
      },
    })
  ).current;

  const normalized = useCallback((s: string) => s.toLowerCase().trim(), []);
  const alerts = useMemo(() => {
    const restrictions = (profile.dietaryRestrictions ?? []).map(normalized);
    const ingredients = (nutrition.ingredients ?? []).map(normalized);
    const allergens = (nutrition.allergens ?? []).map(normalized);
    const matches: string[] = [];
    restrictions.forEach(r => {
      const hit = ingredients.some(i => i.includes(r)) || allergens.some(a => a.includes(r));
      if (hit && r.length > 0 && !matches.includes(r)) matches.push(r);
    });
    return matches;
  }, [profile.dietaryRestrictions, nutrition.ingredients, nutrition.allergens, normalized]);
  
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
                <Sparkles size={20} color={Colors.primary} />
              ) : index % 3 === 1 ? (
                <Zap size={18} color={Colors.info} />
              ) : (
                <Star size={16} color={Colors.warning} />
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
              <Heart size={12} color={Colors.primary} />
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
                  <View style={[styles.fireworkDot, { backgroundColor: i % 2 === 0 ? Colors.primary : Colors.info }]} />
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
                <Icon size={16} color={Colors.primary} />
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </View>
    );
  }
  

  
  return (
    <View style={styles.container}>
      {/* Header with back arrow and title */}
      <View style={styles.header} testID="results-header">
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack || onScanAnother}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>InIt AI</Text>
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
          <View style={styles.heroCard}>
            <View style={styles.productHeader} testID="product-header">
              <View style={styles.productImageContainer}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.productImage} />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Sparkles size={32} color={Colors.gray400} />
                  </View>
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{nutrition.name}</Text>
                {nutrition.servingSize && (
                  <Text style={styles.servingSize}>Serving: {nutrition.servingSize}</Text>
                )}
              </View>
            </View>
            
            {/* Sliding Views Container */}
            <View style={styles.slidingContainer} {...panResponder.panHandlers}>
              <Animated.View 
                style={[
                  styles.slidingContent,
                  {
                    transform: [{ translateX: slideAnimation }],
                  },
                ]}
              >
                {/* Score View */}
                <View style={[styles.slideView, { width: screenWidth - 32 }]}>
                  <View style={styles.scoreSection}>
                    <View style={styles.scoreRingContainer}>
                      <View style={[styles.scoreRing, { shadowColor: getScoreColor(showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore) }]} testID="score-ring">
                        <View style={styles.scoreRingInner}>
                          <Text style={[styles.scoreNumber, { color: getScoreColor(showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore) }]}>
                            {showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore}
                          </Text>
                          <Text style={styles.scoreOutOf}>/100</Text>
                        </View>
                      </View>
                      <View style={[styles.scoreRingProgress, { borderColor: getScoreColor(showPersonalized && nutrition.personalScore !== undefined ? nutrition.personalScore : nutrition.healthScore) }]} />
                    </View>
                    
                    <Text style={styles.personalScoreSubtitle}>Personal Score</Text>

                    {alerts.length > 0 && (
                      <View style={styles.alertPill} testID="allergen-preference-pill">
                        <AlertTriangle size={14} color={Colors.white} />
                        <Text style={styles.alertPillText}>Contains items you avoid</Text>
                      </View>
                    )}
                    
                    {/* Score Comparison Row */}
                    {showPersonalized && nutrition.personalScore !== undefined && nutrition.personalScore !== nutrition.healthScore && (
                      <View style={styles.comparisonContainer}>
                        <View style={styles.comparisonRow}>
                          <View style={styles.baseScoreChip}>
                            <Text style={styles.baseScoreLabel}>Base Score</Text>
                            <Text style={styles.baseScoreValue}>{nutrition.healthScore}</Text>
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
                          
                          <View style={styles.personalScoreChip}>
                            <Text style={styles.personalScoreLabel}>Your Score</Text>
                            <Text style={styles.personalScoreValue}>{nutrition.personalScore}</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
                
                {/* Goals View */}
                {showPersonalized && profile.goals && (
                  <View style={[styles.slideView, { width: screenWidth - 32 }]}>
                    <View style={styles.goalsSection}>
                      <Text style={styles.goalsSectionTitle}>Life Goals</Text>
                      
                      {/* Goal Ratings */}
                      <View style={styles.goalRatings}>
                        {profile.goals.dietGoal && (
                          <View style={styles.goalRating}>
                            <Text style={styles.goalLabel}>Diet Goal</Text>
                            <Text style={styles.goalValue}>{profile.goals.dietGoal.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                            <View style={styles.goalScoreContainer}>
                              <View style={[styles.goalScoreRing, { borderColor: getScoreColor(nutrition.personalScore || nutrition.healthScore) }]}>
                                <Text style={[styles.goalScoreText, { color: getScoreColor(nutrition.personalScore || nutrition.healthScore) }]}>
                                  {Math.round((nutrition.personalScore || nutrition.healthScore) * 0.9)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        )}
                        
                        {profile.goals.healthGoal && (
                          <View style={styles.goalRating}>
                            <Text style={styles.goalLabel}>Health Goal</Text>
                            <Text style={styles.goalValue}>{profile.goals.healthGoal.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                            <View style={styles.goalScoreContainer}>
                              <View style={[styles.goalScoreRing, { borderColor: getScoreColor(nutrition.personalScore || nutrition.healthScore) }]}>
                                <Text style={[styles.goalScoreText, { color: getScoreColor(nutrition.personalScore || nutrition.healthScore) }]}>
                                  {Math.round((nutrition.personalScore || nutrition.healthScore) * 0.85)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        )}
                        
                        {profile.goals.bodyGoal && (
                          <View style={styles.goalRating}>
                            <Text style={styles.goalLabel}>Body Goal</Text>
                            <Text style={styles.goalValue}>{profile.goals.bodyGoal.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                            <View style={styles.goalScoreContainer}>
                              <View style={[styles.goalScoreRing, { borderColor: getScoreColor(nutrition.personalScore || nutrition.healthScore) }]}>
                                <Text style={[styles.goalScoreText, { color: getScoreColor(nutrition.personalScore || nutrition.healthScore) }]}>
                                  {Math.round((nutrition.personalScore || nutrition.healthScore) * 0.95)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                      
                      {/* Overall Score Circle */}
                      <View style={styles.overallScoreContainer}>
                        <Text style={styles.overallScoreLabel}>Overall</Text>
                        <View style={styles.overallScoreRingContainer}>
                          <View style={[styles.overallScoreRing, { shadowColor: getScoreColor(nutrition.personalScore || nutrition.healthScore) }]}>
                            <View style={styles.overallScoreRingInner}>
                              <Text style={[styles.overallScoreNumber, { color: getScoreColor(nutrition.personalScore || nutrition.healthScore) }]}>
                                {nutrition.personalScore || nutrition.healthScore}
                              </Text>
                              <Text style={styles.overallScoreOutOf}>/100</Text>
                            </View>
                          </View>
                          <View style={[styles.overallScoreRingProgress, { borderColor: getScoreColor(nutrition.personalScore || nutrition.healthScore) }]} />
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </Animated.View>
            </View>
            
            {/* Dots Indicator */}
            {showPersonalized && profile.goals && (
              <View style={styles.dotsContainer}>
                <View style={[styles.dot, currentView === 'score' && styles.dotActive]} />
                <View style={[styles.dot, currentView === 'goals' && styles.dotActive]} />
              </View>
            )}
            
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
                      <Text style={styles.resultMessage}>Excellent choice! This aligns perfectly with your goals.</Text>
                    </>
                  );
                  if (score >= 75) return (
                    <>
                      <CheckCircle size={16} color={Colors.scoreGood} />
                      <Text style={styles.resultMessage}>Good pick! This works well for your health goals.</Text>
                    </>
                  );
                  if (score >= 55) return (
                    <>
                      <AlertCircle size={16} color={Colors.scoreMediocre} />
                      <Text style={styles.resultMessage}>This could work better for your goals — consider alternatives.</Text>
                    </>
                  );
                  if (score >= 41) return (
                    <>
                      <Target size={16} color={Colors.scorePoor} />
                      <Text style={styles.resultMessage}>This doesn&apos;t align well with your goals — try a better swap?</Text>
                    </>
                  );
                  return (
                    <>
                      <Shield size={16} color={Colors.error} />
                      <Text style={styles.resultMessage}>Be aware! This product may not support your health goals.</Text>
                    </>
                  );
                })()}
              </View>
            </View>
          </View>



          {alerts.length > 0 && (
            <View style={styles.card} testID="allergen-preference-card">
              <View style={styles.cardHeader}>
                <AlertTriangle size={20} color={Colors.error} />
                <Text style={styles.cardTitle}>Heads up</Text>
              </View>
              <View>
                <Text style={styles.alertText}>This product includes ingredients you marked as allergens or preferences to avoid:</Text>
                <View style={styles.alertChips}>
                  {alerts.map((a) => (
                    <View key={a} style={styles.alertChip}>
                      <Text style={styles.alertChipText}>{a}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.alertSubtext}>Your score is not reduced. We show this warning so you can decide.</Text>
              </View>
            </View>
          )}

          {/* Macro Breakdown Section - positioned based on current view */}
          <Animated.View 
            style={[
              styles.macroBreakdownContainer,
              {
                transform: [{
                  translateY: currentView === 'goals' ? 100 : 0
                }]
              }
            ]}
          >
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Zap size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>Macro Breakdown</Text>
              </View>
              
              <View style={styles.macroGrid}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{nutrition.calories}</Text>
                  <Text style={styles.macroLabel}>Calories</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{nutrition.protein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{nutrition.carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{nutrition.fat}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
              
              <View style={styles.macroSecondaryGrid}>
                <View style={styles.macroSecondaryItem}>
                  <Text style={styles.macroSecondaryValue}>{nutrition.fiber}g</Text>
                  <Text style={styles.macroSecondaryLabel}>Fiber</Text>
                </View>
                <View style={styles.macroSecondaryItem}>
                  <Text style={styles.macroSecondaryValue}>{nutrition.sugar}g</Text>
                  <Text style={styles.macroSecondaryLabel}>Sugar</Text>
                </View>
                <View style={styles.macroSecondaryItem}>
                  <Text style={styles.macroSecondaryValue}>{nutrition.saturatedFat}g</Text>
                  <Text style={styles.macroSecondaryLabel}>Sat Fat</Text>
                </View>
                <View style={styles.macroSecondaryItem}>
                  <Text style={styles.macroSecondaryValue}>{nutrition.sodium}mg</Text>
                  <Text style={styles.macroSecondaryLabel}>Sodium</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Ingredient Breakdown Section */}
          {nutrition.ingredients && nutrition.ingredients.length > 0 && (
            <View style={styles.card}>
              <TouchableOpacity 
                style={styles.cardHeader}
                onPress={toggleIngredientSection}
                activeOpacity={0.7}
              >
                <List size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>Ingredient Breakdown</Text>
                {isIngredientSectionExpanded ? (
                  <ChevronDown size={20} color={Colors.textSecondary} style={styles.sectionChevron} />
                ) : (
                  <ChevronRight size={20} color={Colors.textSecondary} style={styles.sectionChevron} />
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
                    <Text style={styles.loadingIngredientsText}>Analyzing ingredients...</Text>
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
                          <View key={index} style={styles.ingredientItem}>
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
                              <Text style={styles.ingredientName}>{analysis.ingredient}</Text>
                              {isExpanded ? (
                                <ChevronDown size={20} color={Colors.textSecondary} />
                              ) : (
                                <ChevronRight size={20} color={Colors.textSecondary} />
                              )}
                            </TouchableOpacity>
                            
                            {isExpanded && (
                              <View style={styles.ingredientDetails}>
                                <Text style={[styles.ingredientDescription, {
                                  color: analysis.isGood ? Colors.textSecondary : Colors.error
                                }]}>
                                  {analysis.description}
                                </Text>
                                <Text style={styles.ingredientPurpose}>
                                  Purpose: {analysis.purpose}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.noIngredientsText}>
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
            <View style={styles.card}>
              <TouchableOpacity 
                style={styles.cardHeader}
                onPress={toggleForYouSection}
                activeOpacity={0.7}
              >
                <Heart size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>For You Analysis</Text>
                {isForYouSectionExpanded ? (
                  <ChevronDown size={20} color={Colors.textSecondary} style={styles.sectionChevron} />
                ) : (
                  <ChevronRight size={20} color={Colors.textSecondary} style={styles.sectionChevron} />
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
                    <Text style={styles.loadingAnalysisText}>Generating personalized analysis...</Text>
                  </View>
                ) : (
                  <View style={styles.analysisContent}>
                    <Text style={styles.analysisText}>{forYouAnalysis}</Text>
                  </View>
                )}
              </Animated.View>
            </View>
          )}

          {/* Call-to-Action Buttons */}
          <View style={styles.ctaSection}>
            <TouchableOpacity 
              style={styles.addToGroceryButton}
              onPress={async () => {
                try {
                  await addItem(nutrition.name);
                  console.log('Added to grocery list:', nutrition.name);
                } catch (error) {
                  console.error('Error adding to grocery list:', error);
                }
              }}
              activeOpacity={0.7}
            >
              <ShoppingCart size={20} color={Colors.primary} />
              <Text style={styles.addToGroceryButtonText}>Add to Grocery List</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => setShowBetterSwapsModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.ctaButtonText}>Better Bites</Text>
              <ArrowRight size={20} color={Colors.white} />
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
              style={[styles.button, styles.primaryButton]}
              onPress={onScanAnother}
            >
              <Text style={styles.primaryButtonText}>Scan Another</Text>
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
    backgroundColor: '#f8f9fa',
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
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  shimmerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray100,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  shimmerBars: {
    width: '100%',
    gap: 12,
  },
  shimmerBar: {
    height: 12,
    backgroundColor: Colors.gray100,
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
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  cardContainer: {
    flex: 1,
  },
  // Hero Card Styles
  heroCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
    lineHeight: 24,
  },
  servingSize: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
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
    backgroundColor: Colors.white,
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
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '500',
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
    backgroundColor: Colors.gray100,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  
  baseScoreLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  
  baseScoreValue: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  
  personalScoreChip: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  
  personalScoreLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  
  personalScoreValue: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: 'bold',
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
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    flex: 1,
  },
  // Card Styles
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  

  
  // CTA Section
  ctaSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  
  addToGroceryButton: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  addToGroceryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  ctaButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  ctaButtonText: {
    color: Colors.white,
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
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: Colors.primary,
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
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  
  ingredientsScrollView: {
    maxHeight: 400,
  },
  
  ingredientsContent: {
    gap: 16,
    paddingBottom: 8,
  },
  
  ingredientItem: {
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
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
    color: Colors.textPrimary,
    flex: 1,
    textTransform: 'capitalize',
  },
  
  ingredientDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  
  ingredientDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  
  ingredientPurpose: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  
  noIngredientsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  
  // For You Analysis Styles
  loadingAnalysis: {
    padding: 16,
    alignItems: 'center',
  },
  
  loadingAnalysisText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  
  analysisContent: {
    padding: 4,
  },
  
  analysisText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
    textAlign: 'left',
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
    color: Colors.primary,
    marginBottom: 4,
  },
  
  macroLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  macroSecondaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray50,
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
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  
  macroSecondaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  alertPill: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  alertPillText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  alertText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  alertChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  alertChip: {
    backgroundColor: Colors.error + '10',
    borderColor: Colors.error + '40',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  alertChipText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  alertSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
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
  
  // Sliding functionality styles
  slidingContainer: {
    height: 400,
    overflow: 'hidden',
  },
  
  slidingContent: {
    flexDirection: 'row',
    height: '100%',
  },
  
  slideView: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  goalsSection: {
    alignItems: 'center',
    width: '100%',
  },
  
  goalsSectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 24,
  },
  
  goalRatings: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  
  goalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 16,
  },
  
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  goalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: 12,
  },
  
  goalScoreContainer: {
    alignItems: 'center',
  },
  
  goalScoreRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  
  goalScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  overallScoreContainer: {
    alignItems: 'center',
  },
  
  overallScoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  
  overallScoreRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  overallScoreRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  
  overallScoreRingInner: {
    alignItems: 'center',
  },
  
  overallScoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  
  overallScoreOutOf: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  
  overallScoreRingProgress: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderStyle: 'solid',
  },
  
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray300,
  },
  
  dotActive: {
    backgroundColor: Colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  
  macroBreakdownContainer: {
    // Container for animated macro breakdown positioning
  },

});