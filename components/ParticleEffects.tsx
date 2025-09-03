import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface ParticleEffectsProps {
  type: 'confetti' | 'shake' | 'none';
  trigger: boolean;
  onComplete?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ParticleEffects({
  type,
  trigger,
  onComplete,
}: ParticleEffectsProps) {
  const particles = useRef<Animated.Value[]>([]).current;
  const shakeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;

    if (type === 'confetti') {
      startConfetti();
    } else if (type === 'shake') {
      startShake();
    }
  }, [trigger, type]);

  const startConfetti = () => {
    // Create 20 particles
    const newParticles = Array.from({ length: 20 }, () => new Animated.Value(0));
    particles.splice(0, particles.length, ...newParticles);

    const animations = particles.map((particle, index) => {
      const randomX = Math.random() * screenWidth;
      const randomDelay = Math.random() * 500;
      
      return Animated.sequence([
        Animated.delay(randomDelay),
        Animated.timing(particle, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  };

  const startShake = () => {
    const shakeAnimation = Animated.sequence([
      Animated.timing(shakeValue, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: 10,
        duration: 100,
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

  return (
    <View style={styles.container} pointerEvents="none">
      {type === 'confetti' && particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confettiParticle,
            {
              backgroundColor: [
                Colors.neonGreen,
                Colors.neonBlue,
                Colors.neonYellow,
                Colors.neonCoral,
                Colors.neonPurple,
              ][index % 5],
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
                    outputRange: ['0deg', '360deg'],
                  }),
                },
                {
                  scale: particle.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      
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
  },
  shakeContainer: {
    flex: 1,
  },
});