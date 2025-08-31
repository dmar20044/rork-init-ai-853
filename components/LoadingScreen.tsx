import React, { useState, useEffect, useRef } from 'react';
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

export default function LoadingScreen({ isVisible, onCancel, onComplete, onProductNotFound, progress }: LoadingScreenProps) {
  const { colors } = useTheme();
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(0);


  const [currentStep, setCurrentStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showProductNotFound, setShowProductNotFound] = useState<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const progressBarValueRef = useRef<number>(0);
  
  // Step icon morph animations
  const stepIconScales = useRef<Animated.Value[]>(
    Array.from({ length: progressSteps.length }, () => new Animated.Value(1))
  );
  const stepIconRotations = useRef<Animated.Value[]>(
    Array.from({ length: progressSteps.length }, () => new Animated.Value(0))
  );
  
  // Initialize all animated values as refs to avoid re-creation
  const loadingAnimations = useRef<Animated.Value[]>(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  );
  const progressBarWidth = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const messageTranslateY = useRef(new Animated.Value(0)).current;
  
  const slideUpValue = useRef(new Animated.Value(screenHeight)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  
  // Hero animation values - Ripple effects
  const ripple1Scale = useRef(new Animated.Value(0)).current;
  const ripple2Scale = useRef(new Animated.Value(0)).current;
  const ripple3Scale = useRef(new Animated.Value(0)).current;
  const ripple1Opacity = useRef(new Animated.Value(0.8)).current;
  const ripple2Opacity = useRef(new Animated.Value(0.8)).current;
  const ripple3Opacity = useRef(new Animated.Value(0.8)).current;
  const centerPulse = useRef(new Animated.Value(1)).current;
  const centerGlow = useRef(new Animated.Value(0.5)).current;
  
  // Background gradient animation
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  
  // Initialize animations once when component mounts
  useEffect(() => {
    if (!isVisible) return;
    
    const animations: Animated.CompositeAnimation[] = [];
    
    // Start continuous loading animations
    loadingAnimations.current.forEach((anim, index) => {
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
    
    // Hero animation - Ripple effects with staggered timing
    const createRippleAnimation = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 2.5,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.8,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };
    
    // Start ripple animations with staggered delays
    const ripple1Animation = createRippleAnimation(ripple1Scale, ripple1Opacity, 0);
    const ripple2Animation = createRippleAnimation(ripple2Scale, ripple2Opacity, 600);
    const ripple3Animation = createRippleAnimation(ripple3Scale, ripple3Opacity, 1200);
    
    animations.push(ripple1Animation, ripple2Animation, ripple3Animation);
    ripple1Animation.start();
    ripple2Animation.start();
    ripple3Animation.start();
    
    // Center pulse animation
    const centerPulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(centerPulse, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(centerPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Center glow animation
    const centerGlowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(centerGlow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(centerGlow, {
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
        Animated.timing(gradientAnimation, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
        }),
        Animated.timing(gradientAnimation, {
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
    ]);
    animations.push(entranceAnimation);
    entranceAnimation.start();
    
    return () => {
      animations.forEach(animation => animation.stop());
    };
  }, [isVisible, slideUpValue, cardScale, cardOpacity, ripple1Scale, ripple2Scale, ripple3Scale, ripple1Opacity, ripple2Opacity, ripple3Opacity, centerPulse, centerGlow, gradientAnimation]);
  

  
  // Initialize random message index on mount
  useEffect(() => {
    if (isVisible) {
      setCurrentMessageIndex(Math.floor(Math.random() * motivationalQuotes.length));
    }
  }, [isVisible]);

  // Handle message rotation with random order
  useEffect(() => {
    if (!isVisible) return;
    
    const messageInterval = setInterval(() => {
      // Fade out current message
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
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
        messageTranslateY.setValue(20);
        Animated.parallel([
          Animated.timing(messageOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(messageTranslateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 2000);
    
    return () => clearInterval(messageInterval);
  }, [isVisible, messageOpacity, messageTranslateY]);
  
  // Handle external progress or 3-step progress with minimum timing
  useEffect(() => {
    if (!isVisible) {
      // Reset state when not visible
      setCurrentStep(0);
      setCompletedSteps(new Set());
      setShowProductNotFound(false);
      progressBarValueRef.current = 0;
      progressBarWidth.setValue(0);
      return;
    }
    
    // Record start time for minimum display duration
    startTimeRef.current = Date.now();
    
    // Always reset progress bar when becoming visible
    progressBarWidth.setValue(0);
    progressBarValueRef.current = 0;
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setShowProductNotFound(false);
    
    // Minimum display duration of 3 seconds
    const MINIMUM_DURATION = 3000;
    
    // Product not found timeout (5 seconds)
    const productNotFoundTimeout = setTimeout(() => {
      console.log('LoadingScreen: Product not found timeout triggered');
      setShowProductNotFound(true);
      
      // Wait 2 more seconds to show the message, then go back
      setTimeout(() => {
        if (onProductNotFound) {
          onProductNotFound();
        } else if (onCancel) {
          onCancel();
        }
      }, 2000);
    }, 5000);
    
    // Fallback timeout to prevent infinite loading (10 seconds max)
    const fallbackTimeout = setTimeout(() => {
      console.log('LoadingScreen: Fallback timeout triggered, calling onComplete');
      if (onComplete) {
        onComplete();
      }
    }, 10000);
    
    // If external progress is provided, use controlled timing
    if (typeof progress === 'number') {
      console.log('LoadingScreen: External progress received:', progress);
      const clampedProgress = Math.max(0, Math.min(100, progress));
      
      console.log('LoadingScreen: Updating progress from', progressBarValueRef.current, 'to', clampedProgress);
      progressBarValueRef.current = clampedProgress;
      
      // When progress reaches 100%, ensure minimum duration before completing
      if (clampedProgress >= 100) {
        clearTimeout(productNotFoundTimeout);
        const elapsedTime = Date.now() - startTimeRef.current;
        const remainingTime = Math.max(0, MINIMUM_DURATION - elapsedTime);
        
        const completeTimeout = setTimeout(() => {
          console.log('LoadingScreen: Progress reached 100%, calling onComplete');
          clearTimeout(fallbackTimeout);
          if (onComplete) {
            onComplete();
          }
        }, remainingTime + 800); // Add short delay after minimum duration
        
        return () => {
          clearTimeout(completeTimeout);
          clearTimeout(fallbackTimeout);
          clearTimeout(productNotFoundTimeout);
        };
      }
      
      // Calculate which step we should be on based on progress
      const targetStepIndex = Math.min(
        Math.floor((clampedProgress / 100) * progressSteps.length),
        progressSteps.length - 1
      );
      
      console.log('LoadingScreen: Setting current step to', targetStepIndex, 'based on progress', clampedProgress);
      setCurrentStep(targetStepIndex);
      
      // Animate progress bar to match external progress smoothly
      Animated.timing(progressBarWidth, {
        toValue: clampedProgress,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        console.log('LoadingScreen: Progress bar animation completed for', clampedProgress + '%');
      });
      
      return () => {
        clearTimeout(fallbackTimeout);
        clearTimeout(productNotFoundTimeout);
      };
    }
    
    // Custom 3-step progress with exact timing and pauses
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    
    // Step 0: Reading (0-1 second)
    setCurrentStep(0);
    
    // Animate progress bar to 33% over 0.6 seconds, then pause
    Animated.timing(progressBarWidth, {
      toValue: 33.33,
      duration: 600,
      useNativeDriver: false,
    }).start();
    
    // After 1 second (0.6s animation + 0.4s pause): Move to step 1 (Analyzing)
    timeouts.push(setTimeout(() => {
      setCurrentStep(1);
      setCompletedSteps(prev => new Set([...prev, 0]));
      
      // Animate icon completion for step 0
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
      
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (hapticError) {
          console.log('Haptics not available:', hapticError);
        }
      }
      
      // Animate progress bar to 66% over 0.6 seconds, then pause
      Animated.timing(progressBarWidth, {
        toValue: 66.66,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }, 1000));
    
    // After 2 seconds (1s + 0.6s animation + 0.4s pause): Move to step 2 (Personalizing)
    timeouts.push(setTimeout(() => {
      setCurrentStep(2);
      setCompletedSteps(prev => new Set([...prev, 1]));
      
      // Animate icon completion for step 1
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
      
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (hapticError) {
          console.log('Haptics not available:', hapticError);
        }
      }
      
      // Animate progress bar to 100% over 0.6 seconds, then pause
      Animated.timing(progressBarWidth, {
        toValue: 100,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }, 2000));
    
    // After 3 seconds (2s + 0.6s animation + 0.4s pause): Complete step 2 and finish
    timeouts.push(setTimeout(() => {
      setCompletedSteps(prev => new Set([...prev, 2]));
      
      // Animate icon completion for step 2
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
      
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (hapticError) {
          console.log('Haptics not available:', hapticError);
        }
      }
      
      // Complete after a short delay
      timeouts.push(setTimeout(() => {
        clearTimeout(productNotFoundTimeout);
        clearTimeout(fallbackTimeout);
        if (onComplete) {
          console.log('LoadingScreen: Auto progress completed, calling onComplete');
          onComplete();
        }
      }, 500));
    }, 3000));
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      clearTimeout(fallbackTimeout);
      clearTimeout(productNotFoundTimeout);
    };
  }, [isVisible, progressBarWidth, progress, onComplete]);
  
  // Separate effect to handle progress updates when progress prop changes
  useEffect(() => {
    if (!isVisible || typeof progress !== 'number') return;
    
    console.log('LoadingScreen: Progress prop changed to:', progress);
    const clampedProgress = Math.max(0, Math.min(100, progress));
    
    // Calculate which step we should be on based on progress
    const targetStepIndex = Math.min(
      Math.floor((clampedProgress / 100) * progressSteps.length),
      progressSteps.length - 1
    );
    
    console.log('LoadingScreen: Updating step to', targetStepIndex, 'for progress', clampedProgress);
    setCurrentStep(targetStepIndex);
    
    // Animate progress bar to match external progress smoothly
    Animated.timing(progressBarWidth, {
      toValue: clampedProgress,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      console.log('LoadingScreen: Progress bar updated to', clampedProgress + '%');
    });
  }, [progress, isVisible, progressBarWidth]);
  
  if (!isVisible) {
    return null;
  }
  
  const currentMessage = motivationalQuotes[currentMessageIndex];
  
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      {/* Dynamic Gradient Background */}
      <Animated.View style={[
        styles.gradientBackground,
        {
          opacity: gradientAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 0.7],
          }),
          transform: [{
            translateX: gradientAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 100],
            }),
          }],
        },
      ]} />

      
      {/* Main Loading Card */}
      <Animated.View style={[
        styles.shimmerCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.textTertiary,
          transform: [
            { translateY: slideUpValue },
            { scale: cardScale },
          ],
          opacity: cardOpacity,
        },
      ]}>
        {/* Minimal Branding - Init AI Logo */}
        <View style={styles.brandingContainer}>
          <Text style={[styles.brandingText, { color: colors.primary }]}>InIt AI</Text>
        </View>
        {/* Hero Animation - AI Scanning Ripples */}
        <View style={styles.heroContainer}>
          {/* Ripple Effect 1 - Outermost */}
          <Animated.View style={[
            styles.rippleRing,
            styles.ripple1,
            {
              transform: [{ scale: ripple1Scale }],
              opacity: ripple1Opacity,
            },
          ]} />
          
          {/* Ripple Effect 2 - Middle */}
          <Animated.View style={[
            styles.rippleRing,
            styles.ripple2,
            {
              transform: [{ scale: ripple2Scale }],
              opacity: ripple2Opacity,
            },
          ]} />
          
          {/* Ripple Effect 3 - Inner */}
          <Animated.View style={[
            styles.rippleRing,
            styles.ripple3,
            {
              transform: [{ scale: ripple3Scale }],
              opacity: ripple3Opacity,
            },
          ]} />
          
          {/* Center glow effect */}
          <Animated.View style={[
            styles.centerGlow,
            {
              opacity: centerGlow,
              transform: [{ scale: centerPulse }],
            },
          ]} />
          
          {/* Center AI icon */}
          <Animated.View style={[
            styles.centerIcon,
            {
              transform: [{ scale: centerPulse }],
            },
          ]}>
            <Target size={24} color={colors.white} strokeWidth={1.5} />
          </Animated.View>
        </View>
        
        {/* Category Badge */}
        <View style={[styles.categoryBadge, {
          backgroundColor: colors.primary + '20', // Primary color with transparency
          borderColor: colors.primary,
        }]}>
          <View style={styles.categoryBadgeContent}>
            <Target size={14} color={colors.primary} strokeWidth={1.5} />
            <Text style={[styles.categoryBadgeText, {
              color: colors.primary,
            }]}>
              Smart Insights
            </Text>
          </View>
        </View>
        
        {/* Dynamic Loading Text or Product Not Found */}
        <Animated.View style={[
          styles.loadingTextContainer,
          {
            opacity: messageOpacity,
            transform: [{ translateY: messageTranslateY }],
          },
        ]}>
          {showProductNotFound ? (
            <Text style={[styles.loadingText, styles.productNotFoundText, { color: colors.primary }]}>
              Product not found
            </Text>
          ) : (
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
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
                        backgroundColor: shouldBeHighlighted ? colors.primary : 'transparent',
                        borderColor: shouldBeHighlighted ? colors.primary : colors.textTertiary,
                        shadowColor: shouldBeHighlighted ? colors.primary : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: shouldBeHighlighted ? 0.6 : 0,
                        shadowRadius: shouldBeHighlighted ? 8 : 0,
                        elevation: shouldBeHighlighted ? 6 : 0,
                        transform: [
                          { scale: stepIconScales.current[index] },
                          { 
                            rotate: stepIconRotations.current[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            })
                          },
                        ],
                      }
                    ]}>
                      {completedSteps.has(index) ? (
                        <Animated.View style={[
                          styles.stepCheckmark,
                          {
                            transform: [
                              { scale: stepIconScales.current[index] },
                            ],
                          },
                        ]} />
                      ) : (
                        <Animated.View style={{
                          transform: [
                            { scale: stepIconScales.current[index] },
                          ],
                        }}>
                          <IconComponent 
                            size={16} 
                            color={shouldBeHighlighted ? colors.white : colors.textTertiary} 
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
                          color: shouldBeHighlighted ? colors.primary : colors.textTertiary,
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
                        backgroundColor: (completedSteps.has(index) || (index < currentStep)) ? colors.primary : colors.textTertiary,
                      }
                    ]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
          
          {/* Thin progress bar at bottom */}
          <View style={[styles.progressBarBackground, { backgroundColor: colors.textTertiary }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.primary,
                  width: progressBarWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          </View>
        </View>
      </Animated.View>
      
      {/* Cancel Scan Button - Fixed at bottom */}
      {onCancel && (
        <TouchableOpacity 
          style={[styles.cancelScanButton, {
            backgroundColor: colors.primary + '20',
            borderColor: colors.primary,
          }]} 
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onCancel();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelScanButtonText, { color: colors.primary }]}>Cancel Scan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

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
    top: -100,
    left: -200,
    right: -200,
    bottom: -100,
    backgroundColor: '#FF6B6B',
    opacity: 0.1,
    transform: [{ rotate: '15deg' }],
    zIndex: 0,
  },

  shimmerCard: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
    borderWidth: 1,
  },
  heroContainer: {
    width: 200,
    height: 200,
    marginBottom: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 3,
  },
  ripple1: {
    width: 80,
    height: 80,
    borderColor: '#FF6B6B', // Bright retro red
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  ripple2: {
    width: 80,
    height: 80,
    borderColor: '#FF8E8E',
    shadowColor: '#FF8E8E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 6,
  },
  ripple3: {
    width: 80,
    height: 80,
    borderColor: '#FFB1B1',
    shadowColor: '#FFB1B1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  centerGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B', // Bright retro red
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 12,
  },
  centerIcon: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B', // Bright retro red
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 10,
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
  cancelScanButton: {
    position: 'absolute',
    bottom: 80,
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

});