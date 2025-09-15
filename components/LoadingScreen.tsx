import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Target,
  BarChart3,
  Database,
  User,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';


interface LoadingScreenProps {
  isVisible: boolean;
  onCancel?: () => void;
  onComplete?: () => void;
  onProductNotFound?: () => void;
  progress?: number; // Allow external progress control
}

const { height: screenHeight } = Dimensions.get('window');

const motivationalQuotes = [
  "Small changes lead to big transformations.",
  "Every healthy choice is an investment in your future self.",
  "Progress, not perfection, is the goal.",
  "Your body is your temple. Treat it with respect.",
  "Consistency beats perfection every time.",
  "Fuel your body like the machine it is.",
  "Health is wealth. Invest wisely.",
  "You are what you eat, so don't be fast, cheap, easy, or fake.",
  "Take care of your body. It's the only place you have to live.",
  "A healthy outside starts from the inside.",
  "Your health is an investment, not an expense.",
  "Good nutrition is a responsibility, not a restriction.",
  "The groundwork for all happiness is good health.",
  "Eat well, live well, be well.",
  "Your future self will thank you for the choices you make today."
];

const progressSteps = [
  { label: 'Reading', duration: 1000, icon: BarChart3 },
  { label: 'Analyzing', duration: 1000, icon: Database },
  { label: 'Personalizing', duration: 1000, icon: User }
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isVisible, onCancel, onComplete, onProductNotFound, progress }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(0);
  const { isDarkMode } = useTheme();

  // Dynamic color scheme based on theme
  const themeColors = useMemo(() => ({
    primary: '#4ECDC4', // Neon Turquoise
    secondary: '#FF6B81', // Retro Pink
    accent: '#2E294E', // Deep Indigo
    background: isDarkMode ? '#1E1E2E' : '#FDFDFD', // Charcoal Indigo or Cream White
    surface: isDarkMode ? '#2E294E' : '#FDFDFD', // Deep Indigo or Cream White
    text: isDarkMode ? '#D9D9D9' : '#1E1E1E', // Soft Gray or Charcoal Black
    textSecondary: '#5F5F5F', // Slate Gray
    textTertiary: isDarkMode ? '#5F5F5F' : '#D9D9D9', // Slate Gray or Soft Gray
    white: '#FDFDFD',
    gradientBg: isDarkMode ? '#2E294E' : '#FF6B81', // Deep Indigo or Retro Pink
  }), [isDarkMode]);
  
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showProductNotFound, setShowProductNotFound] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const progressBarValueRef = useRef<number>(0);
  
  // Step icon morph animations - initialize once with useRef
  const stepIconScalesRef = useRef<Animated.Value[] | null>(null);
  const stepIconRotationsRef = useRef<Animated.Value[] | null>(null);
  
  // Initialize step animations on first render
  if (!stepIconScalesRef.current) {
    stepIconScalesRef.current = Array.from({ length: progressSteps.length }, () => new Animated.Value(1));
  }
  if (!stepIconRotationsRef.current) {
    stepIconRotationsRef.current = Array.from({ length: progressSteps.length }, () => new Animated.Value(0));
  }
  
  const stepIconScales = stepIconScalesRef;
  const stepIconRotations = stepIconRotationsRef;
  
  // Initialize all animated values as refs to avoid re-creation
  const animatedValuesRef = useRef<{
    loadingAnimations: Animated.Value[];
    progressBarWidth: Animated.Value;
    messageOpacity: Animated.Value;
    messageTranslateY: Animated.Value;
    slideUpValue: Animated.Value;
    cardScale: Animated.Value;
    cardOpacity: Animated.Value;

    centerPulse: Animated.Value;
    centerGlow: Animated.Value;
    gradientAnimation: Animated.Value;
  } | null>(null);
  
  // Initialize animated values on first render
  if (!animatedValuesRef.current) {
    animatedValuesRef.current = {
      loadingAnimations: Array.from({ length: 8 }, () => new Animated.Value(0)),
      progressBarWidth: new Animated.Value(0),
      messageOpacity: new Animated.Value(1),
      messageTranslateY: new Animated.Value(0),
      slideUpValue: new Animated.Value(screenHeight),
      cardScale: new Animated.Value(0.8),
      cardOpacity: new Animated.Value(0),

      centerPulse: new Animated.Value(1),
      centerGlow: new Animated.Value(0.5),
      gradientAnimation: new Animated.Value(0),
    };
  }
  
  const animatedValues = animatedValuesRef.current;
  


  // Initialize animations once when component mounts
  useEffect(() => {
    if (!isVisible || !animatedValues) return;
    
    const animations: Animated.CompositeAnimation[] = [];
    
    // Start continuous loading animations
    animatedValues.loadingAnimations.forEach((anim, index) => {
      const animation = Animated.loop(
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
      );
      animations.push(animation);
      animation.start();
    });
    

    
    // Center pulse animation
    const centerPulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValues.centerPulse, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValues.centerPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Center glow animation
    const centerGlowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValues.centerGlow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValues.centerGlow, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    
    animations.push(centerPulseAnimation, centerGlowAnimation);
    centerPulseAnimation.start();
    centerGlowAnimation.start();
    
    // Background gradient animation
    const backgroundGradientAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValues.gradientAnimation, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValues.gradientAnimation, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: false,
        }),
      ])
    );
    
    animations.push(backgroundGradientAnimation);
    backgroundGradientAnimation.start();
    
    // Animate card entrance
    const entranceAnimation = Animated.parallel([
      Animated.spring(animatedValues.slideUpValue, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues.cardScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues.cardOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);
    animations.push(entranceAnimation);
    entranceAnimation.start();
    
    return () => {
      animations.forEach(animation => animation.stop());
    };
  }, [isVisible, animatedValues]);
  

  
  // Initialize random message index on mount
  useEffect(() => {
    if (isVisible) {
      setCurrentMessageIndex(Math.floor(Math.random() * motivationalQuotes.length));
    }
  }, [isVisible]);

  // Handle message rotation with random order
  useEffect(() => {
    if (!isVisible || !animatedValues) return;
    
    const messageInterval = setInterval(() => {
      // Fade out current message
      Animated.parallel([
        Animated.timing(animatedValues.messageOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValues.messageTranslateY, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Update message to random index (avoiding current one)
        setCurrentMessageIndex((prevIndex) => {
          let newIndex;
          do {
            newIndex = Math.floor(Math.random() * motivationalQuotes.length);
          } while (newIndex === prevIndex && motivationalQuotes.length > 1);
          return newIndex;
        });
        
        // Reset position and fade in new message
        animatedValues.messageTranslateY.setValue(20);
        Animated.parallel([
          Animated.timing(animatedValues.messageOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValues.messageTranslateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 2000);
    
    return () => clearInterval(messageInterval);
  }, [isVisible, animatedValues]);
  
  // Handle external progress or 3-step progress with minimum timing
  useEffect(() => {
    if (!isVisible) {
      // Reset state when not visible
      setCurrentStep(0);
      setCompletedSteps(new Set());
      setShowProductNotFound(false);
      setCurrentProgress(0);
      progressBarValueRef.current = 0;
      if (animatedValues) {
        animatedValues.progressBarWidth.setValue(0);
      }
      return;
    }
    
    if (!animatedValues) return;
    
    // Record start time for minimum display duration
    startTimeRef.current = Date.now();
    
    // Only reset progress bar when becoming visible if no external progress is provided
    if (typeof progress !== 'number') {
      animatedValues.progressBarWidth.setValue(0);
      progressBarValueRef.current = 0;
      setCurrentProgress(0);
      setCurrentStep(0);
      setCompletedSteps(new Set());
      setShowProductNotFound(false);
    }
    
    // Minimum display duration of 3 seconds
    const MINIMUM_DURATION = 3000;
    
    // Only set timeouts if no external progress is provided
    // This allows the analysis to complete naturally without artificial limits
    let productNotFoundTimeout: ReturnType<typeof setTimeout> | null = null;
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Only use timeouts for internal progress (when no external progress is provided)
    if (typeof progress !== 'number') {
      // Product not found timeout (20 seconds) - much longer to allow for slow analysis
      productNotFoundTimeout = setTimeout(() => {
        console.log('LoadingScreen: Product not found timeout triggered after 20 seconds');
        setShowProductNotFound(true);
        
        // Wait 2 more seconds to show the message, then go back
        setTimeout(() => {
          if (onProductNotFound) {
            onProductNotFound();
          } else if (onCancel) {
            onCancel();
          }
        }, 2000);
      }, 20000);
      
      // Fallback timeout to prevent infinite loading (30 seconds max)
      fallbackTimeout = setTimeout(() => {
        console.log('LoadingScreen: Fallback timeout triggered after 30 seconds, calling onComplete');
        if (onComplete) {
          onComplete();
        }
      }, 30000);
    }
    
    // If external progress is provided, use controlled timing
    if (typeof progress === 'number') {
      console.log('LoadingScreen: External progress received:', progress);
      const clampedProgress = Math.max(0, Math.min(100, progress));
      
      // Only update if progress is actually increasing to prevent resets
      if (clampedProgress >= progressBarValueRef.current) {
        console.log('LoadingScreen: Updating progress from', progressBarValueRef.current, 'to', clampedProgress);
        progressBarValueRef.current = clampedProgress;
        setCurrentProgress(clampedProgress);
        
        // Calculate which step we should be on based on progress
        const targetStepIndex = Math.min(
          Math.floor((clampedProgress / 100) * progressSteps.length),
          progressSteps.length - 1
        );
        
        console.log('LoadingScreen: Setting current step to', targetStepIndex, 'based on progress', clampedProgress);
        setCurrentStep(targetStepIndex);
        
        // Animate progress bar to match external progress smoothly
        Animated.timing(animatedValues.progressBarWidth, {
          toValue: clampedProgress,
          duration: 500, // Slightly longer duration for smoother animation
          useNativeDriver: false,
        }).start(() => {
          console.log('LoadingScreen: Progress bar animation completed for', clampedProgress + '%');
        });
      }
      
      // When progress reaches 100%, ensure minimum duration before completing
      if (clampedProgress >= 100) {
        console.log('LoadingScreen: Progress reached 100%, clearing timeouts and completing');
        if (productNotFoundTimeout) clearTimeout(productNotFoundTimeout);
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        const elapsedTime = Date.now() - startTimeRef.current;
        const remainingTime = Math.max(0, MINIMUM_DURATION - elapsedTime);
        
        const completeTimeout = setTimeout(() => {
          console.log('LoadingScreen: Progress 100% completion timeout, calling onComplete');
          if (onComplete) {
            onComplete();
          }
        }, remainingTime + 800); // Add short delay after minimum duration
        
        return () => {
          clearTimeout(completeTimeout);
          if (fallbackTimeout) clearTimeout(fallbackTimeout);
          if (productNotFoundTimeout) clearTimeout(productNotFoundTimeout);
        };
      }
      
      return () => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        if (productNotFoundTimeout) clearTimeout(productNotFoundTimeout);
      };
    }
    
    // Custom 3-step progress with exact timing and pauses
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    
    // Step 0: Reading (0-1 second)
    setCurrentStep(0);
    
    // Animate progress bar to 33% over 0.6 seconds, then pause
    Animated.timing(animatedValues.progressBarWidth, {
      toValue: 33.33,
      duration: 600,
      useNativeDriver: false,
    }).start();
    setCurrentProgress(33.33);
    
    // After 1 second (0.6s animation + 0.4s pause): Move to step 1 (Analyzing)
    timeouts.push(setTimeout(() => {
      setCurrentStep(1);
      setCompletedSteps(prev => new Set([...prev, 0]));
      
      // Animate icon completion for step 0
      if (stepIconScales.current && stepIconRotations.current) {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(stepIconScales.current[0], {
              toValue: 1.3,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(stepIconRotations.current[0], {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(stepIconScales.current[0], {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
      
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (hapticError) {
          console.log('Haptics not available:', hapticError);
        }
      }
      
      // Animate progress bar to 66% over 0.6 seconds, then pause
      Animated.timing(animatedValues.progressBarWidth, {
        toValue: 66.66,
        duration: 600,
        useNativeDriver: false,
      }).start();
      setCurrentProgress(66.66);
    }, 1000));
    
    // After 2 seconds (1s + 0.6s animation + 0.4s pause): Move to step 2 (Personalizing)
    timeouts.push(setTimeout(() => {
      setCurrentStep(2);
      setCompletedSteps(prev => new Set([...prev, 1]));
      
      // Animate icon completion for step 1
      if (stepIconScales.current && stepIconRotations.current) {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(stepIconScales.current[1], {
              toValue: 1.3,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(stepIconRotations.current[1], {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(stepIconScales.current[1], {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
      
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (hapticError) {
          console.log('Haptics not available:', hapticError);
        }
      }
      
      // Animate progress bar to 100% over 0.6 seconds, then pause
      Animated.timing(animatedValues.progressBarWidth, {
        toValue: 100,
        duration: 600,
        useNativeDriver: false,
      }).start();
      setCurrentProgress(100);
    }, 2000));
    
    // After 3 seconds (2s + 0.6s animation + 0.4s pause): Complete step 2 and finish
    timeouts.push(setTimeout(() => {
      setCompletedSteps(prev => new Set([...prev, 2]));
      
      // Animate icon completion for step 2
      if (stepIconScales.current && stepIconRotations.current) {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(stepIconScales.current[2], {
              toValue: 1.3,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(stepIconRotations.current[2], {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(stepIconScales.current[2], {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
      
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (hapticError) {
          console.log('Haptics not available:', hapticError);
        }
      }
      
      // Complete after a short delay
      timeouts.push(setTimeout(() => {
        console.log('LoadingScreen: Auto progress completed, clearing timeouts and calling onComplete');
        if (productNotFoundTimeout) clearTimeout(productNotFoundTimeout);
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        if (onComplete) {
          onComplete();
        }
      }, 500));
    }, 3000));
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (productNotFoundTimeout) clearTimeout(productNotFoundTimeout);
    };
  }, [isVisible, animatedValues?.progressBarWidth, progress, onComplete, onCancel, onProductNotFound, stepIconScales, stepIconRotations]);
  
  // Separate effect to handle progress updates when progress prop changes
  useEffect(() => {
    if (!isVisible || typeof progress !== 'number' || !animatedValues) return;
    
    console.log('LoadingScreen: Progress prop changed to:', progress);
    const clampedProgress = Math.max(0, Math.min(100, progress));
    
    // Only update if progress is actually increasing to prevent resets
    if (clampedProgress >= progressBarValueRef.current) {
      console.log('LoadingScreen: Updating step and progress for', clampedProgress);
      
      // Calculate which step we should be on based on progress
      const targetStepIndex = Math.min(
        Math.floor((clampedProgress / 100) * progressSteps.length),
        progressSteps.length - 1
      );
      
      setCurrentStep(targetStepIndex);
      setCurrentProgress(clampedProgress);
      progressBarValueRef.current = clampedProgress;
      
      // Animate progress bar to match external progress smoothly
      Animated.timing(animatedValues.progressBarWidth, {
        toValue: clampedProgress,
        duration: 500, // Slightly longer duration for smoother animation
        useNativeDriver: false,
      }).start(() => {
        console.log('LoadingScreen: Progress bar updated to', clampedProgress + '%');
      });
    } else {
      console.log('LoadingScreen: Ignoring progress update as it would decrease from', progressBarValueRef.current, 'to', clampedProgress);
    }
  }, [progress, isVisible, animatedValues?.progressBarWidth]);
  
  if (!isVisible) {
    return null;
  }
  
  const currentMessage = motivationalQuotes[currentMessageIndex];
  
  return (
    <View style={styles.loadingContainer}>
      {/* Retro Tech Pop Gradient Background */}
      <LinearGradient
        colors={isDarkMode 
          ? ['#2E294E', '#4ECDC4', '#FF6B81', '#FF6B3B', '#1E1E1E'] 
          : ['#4EC9F5', '#7ED9CF', '#F9BFC9', '#FF9E57']
        }
        locations={isDarkMode 
          ? [0, 0.25, 0.5, 0.75, 1] 
          : [0, 0.35, 0.65, 1]
        }
        style={styles.gradientBackground}
      />
      
      {/* Animated overlay for subtle movement */}
      {animatedValues && (
        <Animated.View style={[
          styles.animatedOverlay,
          {
            opacity: animatedValues.gradientAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.3],
            }),
            transform: [{
              translateY: animatedValues.gradientAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 50],
              }),
            }],
          },
        ]} />
      )}

      
      {/* Main Loading Card */}
      {animatedValues && (
        <Animated.View style={[
          styles.shimmerCard,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            transform: [
              { translateY: animatedValues.slideUpValue },
              { scale: animatedValues.cardScale },
            ],
            opacity: animatedValues.cardOpacity,
          },
        ]}>
        {/* Minimal Branding - Init AI Logo */}
        <View style={styles.brandingContainer}>
          <Text style={[styles.brandingText, { color: '#4EC9F5' }]}>InIt AI</Text>
        </View>
        {/* Hero Animation - Center Icon Only */}
        <View style={styles.heroContainer}>
          {/* Center glow effect */}
          <Animated.View style={[
            styles.centerGlow,
            {
              opacity: animatedValues.centerGlow,
              transform: [{ scale: animatedValues.centerPulse }],
            },
          ]} />
          
          {/* Center AI icon */}
          <Animated.View style={[
            styles.centerIcon,
            {
              transform: [{ scale: animatedValues.centerPulse }],
            },
          ]}>
            <Target size={24} color="#FFFFFF" strokeWidth={1.5} />
          </Animated.View>
        </View>
        
        {/* Category Badge */}
        <View style={[styles.categoryBadge, {
          backgroundColor: 'rgba(78, 201, 245, 0.2)',
          borderColor: '#4EC9F5',
        }]}>
          <View style={styles.categoryBadgeContent}>
            <Target size={14} color="#4EC9F5" strokeWidth={1.5} />
            <Text style={[styles.categoryBadgeText, {
              color: '#4EC9F5',
            }]}>
              Smart Insights
            </Text>
          </View>
        </View>
        
        {/* Dynamic Loading Text or Product Not Found */}
        <Animated.View style={[
          styles.loadingTextContainer,
          {
            opacity: animatedValues.messageOpacity,
            transform: [{ translateY: animatedValues.messageTranslateY }],
          },
        ]}>
          {showProductNotFound ? (
            <Text style={[styles.loadingText, styles.productNotFoundText, { color: '#4EC9F5' }]}>
              Product not found
            </Text>
          ) : (
            <Text style={[styles.loadingText, { color: '#666666' }]}>
              {currentMessage}
            </Text>
          )}
        </Animated.View>
        
        {/* Horizontal 3-Step Progress Tracker */}
        <View style={styles.progressContainer}>
          {/* Horizontal step indicators */}
          <View style={styles.horizontalStepsContainer}>
            {progressSteps.map((step, index) => {
              const IconComponent = step.icon;
              const isActive = index === currentStep;
              const isCompleted = completedSteps.has(index);
              // A step should be highlighted if it's the current step OR if the progress has passed it
              const shouldBeHighlighted = isActive || isCompleted || index < currentStep;

              
              return (
                <React.Fragment key={index}>
                  <View style={styles.horizontalStepItem}>
                    {/* Step circle with glow effect */}
                    <Animated.View style={[
                      styles.horizontalStepIndicator,
                      {
                        backgroundColor: shouldBeHighlighted ? '#4EC9F5' : 'transparent',
                        borderColor: shouldBeHighlighted ? '#4EC9F5' : '#CCCCCC',
                        shadowColor: shouldBeHighlighted ? '#4EC9F5' : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: shouldBeHighlighted ? 0.6 : 0,
                        shadowRadius: shouldBeHighlighted ? 8 : 0,
                        elevation: shouldBeHighlighted ? 6 : 0,
                        transform: [
                          { scale: stepIconScales.current?.[index] || 1 },
                          { 
                            rotate: stepIconRotations.current?.[index]?.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            }) || '0deg'
                          },
                        ],
                      }
                    ]}>
                      {completedSteps.has(index) ? (
                        <Animated.View style={[
                          styles.stepCheckmark,
                          {
                            transform: [
                              { scale: stepIconScales.current?.[index] || 1 },
                            ],
                          },
                        ]} />
                      ) : (
                        <Animated.View style={[
                          styles.stepIconContainer,
                          {
                            transform: [
                              { scale: stepIconScales.current?.[index] || 1 },
                            ],
                          },
                        ]}>
                          <IconComponent 
                            size={16} 
                            color={shouldBeHighlighted ? '#FFFFFF' : '#CCCCCC'} 
                            strokeWidth={1}
                          />
                        </Animated.View>
                      )}
                    </Animated.View>
                    
                    {/* Step label */}
                    <Text 
                      style={[
                        styles.horizontalStepLabel,
                        {
                          color: shouldBeHighlighted ? '#4EC9F5' : '#CCCCCC',
                          fontWeight: shouldBeHighlighted ? '600' : '400',
                        }
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {step.label}
                    </Text>
                  </View>
                  
                  {/* Connection line between steps */}
                  {index < progressSteps.length - 1 && (
                    <View style={[
                      styles.stepConnector,
                      {
                        backgroundColor: (completedSteps.has(index) || (index < currentStep)) ? '#4EC9F5' : '#CCCCCC',
                      }
                    ]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
          
          {/* Percentage-style progress bar */}
          <View style={styles.percentageProgressContainer}>
            <View style={[styles.percentageProgressBar, { backgroundColor: '#E0E0E0' }]}>
              <Animated.View
                style={[
                  styles.percentageProgressFill,
                  {
                    backgroundColor: '#4EC9F5',
                    width: animatedValues.progressBarWidth.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.percentageText, { color: '#4EC9F5' }]}>
              {Math.round(currentProgress)}%
            </Text>
          </View>
        </View>
        </Animated.View>
      )}
      
      {/* Cancel Scan Button - Fixed at bottom */}
      {onCancel && (
        <TouchableOpacity 
          style={[styles.cancelScanButton, {
            backgroundColor: 'rgba(78, 201, 245, 0.2)',
            borderColor: '#4EC9F5',
          }]} 
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onCancel();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelScanButtonText, { color: '#4EC9F5' }]}>Cancel Scan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default LoadingScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  animatedOverlay: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 200,
    zIndex: 1,
  },

  shimmerCard: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    shadowColor: '#4EC9F5',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 10,
    borderWidth: 1,
    backdropFilter: 'blur(10px)',
  },
  heroContainer: {
    width: 200,
    height: 200,
    marginBottom: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  centerGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4EC9F5',
    shadowColor: '#4EC9F5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 15,
  },
  centerIcon: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4EC9F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    shadowColor: '#4EC9F5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 12,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  categoryBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center',
    letterSpacing: 1.2,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'system-ui',
    }),
  },
  loadingTextContainer: {
    marginBottom: 24,
    minHeight: 48, // Prevent layout shift
  },
  loadingText: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
    minHeight: 48, // Prevent layout shift
    paddingHorizontal: 8,
    fontStyle: 'italic',
    fontWeight: '300' as const,
    opacity: 0.9,
  },


  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  horizontalStepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  horizontalStepItem: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 100,
  },
  horizontalStepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  horizontalStepLabel: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 1,
    maxWidth: 95,
    minWidth: 70,
  },
  stepConnector: {
    height: 2,
    flex: 1,
    marginHorizontal: 8,
    marginTop: -24,
    borderRadius: 1,
  },
  stepCheckmark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  progressBarBackground: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  percentageProgressContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  percentageProgressBar: {
    width: '80%',
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  percentageProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 60,
  },
  cancelScanButton: {
    position: 'absolute',
    bottom: 100,
    left: 80,
    right: 80,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 20,
    borderWidth: 1,
  },
  cancelScanButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  brandingContainer: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    zIndex: 20,
  },
  brandingText: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: 2,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'system-ui',
    }),
  },
  productNotFoundText: {
    fontWeight: '600' as const,
    fontStyle: 'normal',
    fontSize: 16,
  },
  stepIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

});