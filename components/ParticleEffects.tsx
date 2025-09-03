import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface ParticleEffectsProps {
  type: 'confetti' | 'shake' | 'sparkle' | 'burst' | 'glow' | 'warning' | 'none';
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
  const glowValue = useRef(new Animated.Value(0)).current;
  const burstParticles = useRef<Animated.Value[]>([]).current;
  const sparkleParticles = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    if (!trigger) return;

    switch (type) {
      case 'confetti':
        startConfetti();
        break;
      case 'shake':
        startShake();
        break;
      case 'sparkle':
        startSparkle();
        break;
      case 'burst':
        startBurst();
        break;
      case 'glow':
        startGlow();
        break;
      case 'warning':
        startWarning();
        break;
    }
  }, [trigger, type, nutritionScore, onComplete]);

  const getParticleColors = () => {
    if (nutritionScore >= 80) {
      return [Colors.scoreExcellent, '#00FF88', '#4AFF4A', '#88FF88'];
    } else if (nutritionScore >= 60) {
      return [Colors.retroNeonTurquoise, '#00AAFF', '#4488FF', '#88CCFF'];
    } else if (nutritionScore >= 40) {
      return [Colors.scoreMediocre, '#FFAA00', '#FFD700', '#FFF088'];
    } else {
      return [Colors.scorePoor, '#FF4444', '#FF6666', '#FF8888'];
    }
  };

  const startConfetti = () => {
    const particleCount = nutritionScore >= 70 ? 30 : 20;
    const newParticles = Array.from({ length: particleCount }, () => new Animated.Value(0));
    particles.splice(0, particles.length, ...newParticles);

    const animations = particles.map((particle, index) => {
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
        toValue: intensity,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: -intensity * 0.5,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }),
    ]);

    shakeAnimation.start(() => {
      onComplete?.();
    });
  };

  const startSparkle = () => {
    const newSparkles = Array.from({ length: 15 }, () => new Animated.Value(0));
    sparkleParticles.splice(0, sparkleParticles.length, ...newSparkles);

    const animations = sparkleParticles.map((sparkle, index) => {
      const randomDelay = Math.random() * 800;
      
      return Animated.sequence([
        Animated.delay(randomDelay),
        Animated.timing(sparkle, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(sparkle, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  };

  const startBurst = () => {
    const newBurst = Array.from({ length: 12 }, () => new Animated.Value(0));
    burstParticles.splice(0, burstParticles.length, ...newBurst);

    const animations = burstParticles.map((burst, index) => {
      return Animated.timing(burst, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      });
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  };

  const startGlow = () => {
    const glowAnimation = Animated.sequence([
      Animated.timing(glowValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(glowValue, {
        toValue: 0.3,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(glowValue, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    glowAnimation.start(() => {
      onComplete?.();
    });
  };

  const startWarning = () => {
    const warningAnimation = Animated.sequence([
      Animated.timing(glowValue, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowValue, {
        toValue: 0.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowValue, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    warningAnimation.start(() => {
      onComplete?.();
    });
  };

  if (type === 'none') return null;

  const particleColors = getParticleColors();

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Confetti Effect */}
      {type === 'confetti' && particles.map((particle, index) => (
        <Animated.View
          key={`confetti-${index}`}
          style={[
            styles.confettiParticle,
            {
              backgroundColor: particleColors[index % particleColors.length],
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
      ))}
      
      {/* Sparkle Effect */}
      {type === 'sparkle' && sparkleParticles.map((sparkle, index) => {
        const angle = (index / sparkleParticles.length) * 2 * Math.PI;
        const radius = 80 + Math.random() * 40;
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        
        return (
          <Animated.View
            key={`sparkle-${index}`}
            style={[
              styles.sparkleParticle,
              {
                backgroundColor: particleColors[index % particleColors.length],
                left: centerX + Math.cos(angle) * radius,
                top: centerY + Math.sin(angle) * radius,
                transform: [
                  {
                    scale: sparkle.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1.5, 0],
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
      
      {/* Burst Effect */}
      {type === 'burst' && burstParticles.map((burst, index) => {
        const angle = (index / burstParticles.length) * 2 * Math.PI;
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        
        return (
          <Animated.View
            key={`burst-${index}`}
            style={[
              styles.burstParticle,
              {
                backgroundColor: particleColors[index % particleColors.length],
                left: centerX,
                top: centerY,
                transform: [
                  {
                    translateX: burst.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.cos(angle) * 120],
                    }),
                  },
                  {
                    translateY: burst.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.sin(angle) * 120],
                    }),
                  },
                  {
                    scale: burst.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [1, 1.5, 0],
                    }),
                  },
                ],
                opacity: burst.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [1, 0.8, 0],
                }),
              },
            ]}
          />
        );
      })}
      
      {/* Glow Effect */}
      {(type === 'glow' || type === 'warning') && (
        <Animated.View
          style={[
            styles.glowOverlay,
            {
              backgroundColor: type === 'warning' ? Colors.scorePoor : particleColors[0],
              opacity: glowValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
            },
          ]}
        />
      )}
      
      {/* Shake Effect */}
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
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sparkleParticle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  burstParticle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  shakeContainer: {
    flex: 1,
  },
});