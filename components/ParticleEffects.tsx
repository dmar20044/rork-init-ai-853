import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface ParticleEffectsProps {
  type: 'confetti' | 'shake' | 'sparkles' | 'warning' | 'success' | 'none';
  trigger: boolean;
  nutritionScore?: number;
  onComplete?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ParticleEffects({
  type,
  trigger,
  nutritionScore = 50,
  onComplete,
}: ParticleEffectsProps) {
  const particles = useRef<Animated.Value[]>([]).current;
  const shakeValue = useRef(new Animated.Value(0)).current;
  const sparkleAnimations = useRef<Animated.Value[]>([]).current;
  const warningPulse = useRef(new Animated.Value(1)).current;
  const successGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;

    switch (type) {
      case 'confetti':
        startConfetti();
        break;
      case 'shake':
        startShake();
        break;
      case 'sparkles':
        startSparkles();
        break;
      case 'warning':
        startWarning();
        break;
      case 'success':
        startSuccess();
        break;
    }
  }, [trigger, type]);

  const startConfetti = () => {
    // Create more particles based on nutrition score
    const particleCount = nutritionScore >= 70 ? 30 : nutritionScore >= 50 ? 20 : 15;
    const newParticles = Array.from({ length: particleCount }, () => new Animated.Value(0));
    particles.splice(0, particles.length, ...newParticles);

    const animations = particles.map((particle, index) => {
      const randomX = Math.random() * screenWidth;
      const randomDelay = Math.random() * 500;
      
      return Animated.sequence([
        Animated.delay(randomDelay),
        Animated.timing(particle, {
          toValue: 1,
          duration: nutritionScore >= 70 ? 1500 : 1000,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  };

  const startSparkles = () => {
    // Create sparkle effect for good nutrition scores
    const sparkleCount = 12;
    const newSparkles = Array.from({ length: sparkleCount }, () => new Animated.Value(0));
    sparkleAnimations.splice(0, sparkleAnimations.length, ...newSparkles);

    const animations = sparkleAnimations.map((sparkle, index) => {
      const randomDelay = Math.random() * 800;
      
      return Animated.sequence([
        Animated.delay(randomDelay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkle, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  };

  const startWarning = () => {
    // Warning pulse for poor nutrition scores
    const warningAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(warningPulse, {
          toValue: 1.3,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(warningPulse, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 4 }
    );

    warningAnimation.start(() => {
      onComplete?.();
    });
  };

  const startSuccess = () => {
    // Success glow for excellent nutrition scores
    const successAnimation = Animated.sequence([
      Animated.timing(successGlow, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(successGlow, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]);

    successAnimation.start(() => {
      onComplete?.();
    });
  };

  const startShake = () => {
    const intensity = nutritionScore < 30 ? 15 : 10;
    const shakeAnimation = Animated.sequence([
      Animated.timing(shakeValue, {
        toValue: intensity,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: -intensity,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: intensity * 0.7,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: -intensity * 0.7,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);

    shakeAnimation.start(() => {
      onComplete?.();
    });
  };

  if (type === 'none') return null;

  const getParticleColors = () => {
    if (nutritionScore >= 80) {
      return [Colors.scoreExcellent, '#00FF88', '#32CD32', '#90EE90', '#98FB98'];
    } else if (nutritionScore >= 60) {
      return [Colors.retroNeonTurquoise, Colors.scoreGood, '#00CED1', '#20B2AA', '#48D1CC'];
    } else if (nutritionScore >= 40) {
      return [Colors.scoreMediocre, '#FFD700', '#FFA500', '#FF8C00', '#FF7F50'];
    } else {
      return [Colors.scorePoor, '#FF6347', '#FF4500', '#DC143C', '#B22222'];
    }
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {type === 'confetti' && particles.map((particle, index) => {
        const colors = getParticleColors();
        return (
          <Animated.View
            key={index}
            style={[
              styles.confettiParticle,
              {
                backgroundColor: colors[index % colors.length],
                left: Math.random() * screenWidth,
                transform: [
                  {
                    translateY: particle.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-50, screenHeight + 50],
                    }),
                  },
                  {
                    rotate: particle.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '720deg'],
                    }),
                  },
                  {
                    scale: particle.interpolate({
                      inputRange: [0, 0.3, 0.7, 1],
                      outputRange: [0, 1.2, 1, 0],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
      
      {type === 'sparkles' && sparkleAnimations.map((sparkle, index) => {
        const angle = (index / sparkleAnimations.length) * 2 * Math.PI;
        const radius = 120;
        const x = screenWidth / 2 + Math.cos(angle) * radius;
        const y = screenHeight / 2 + Math.sin(angle) * radius;
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.sparkleParticle,
              {
                left: x,
                top: y,
                transform: [
                  {
                    scale: sparkle.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1.5],
                    }),
                  },
                  {
                    rotate: sparkle.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    }),
                  },
                ],
                opacity: sparkle,
              },
            ]}
          />
        );
      })}
      
      {type === 'warning' && (
        <Animated.View
          style={[
            styles.warningOverlay,
            {
              transform: [{ scale: warningPulse }],
            },
          ]}
        />
      )}
      
      {type === 'success' && (
        <Animated.View
          style={[
            styles.successGlow,
            {
              opacity: successGlow,
              transform: [
                {
                  scale: successGlow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                },
              ],
            },
          ]}
        />
      )}
      
      {type === 'shake' && (
        <Animated.View
          style={[
            styles.shakeContainer,
            {
              transform: [{ translateX: shakeValue }],
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  confettiParticle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  sparkleParticle: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: Colors.scoreExcellent,
    borderRadius: 6,
    shadowColor: Colors.scoreExcellent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  warningOverlay: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    height: 200,
    backgroundColor: 'rgba(255, 99, 71, 0.1)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 99, 71, 0.3)',
  },
  successGlow: {
    position: 'absolute',
    top: '30%',
    left: '5%',
    right: '5%',
    height: 300,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 30,
    shadowColor: Colors.scoreExcellent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  shakeContainer: {
    flex: 1,
  },
});