import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedScoreCircleProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  duration?: number;
  onAnimationComplete?: () => void;
}

export default function AnimatedScoreCircle({
  score,
  size = 120,
  strokeWidth = 8,
  duration = 1500,
  onAnimationComplete,
}: AnimatedScoreCircleProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const breatheValue = useRef(new Animated.Value(1)).current;
  const scoreValue = useRef(new Animated.Value(0)).current;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;
  
  const getScoreColor = (currentScore: number) => {
    if (currentScore >= 86) return Colors.scoreExcellent; // Bright green for excellent (86-100)
    if (currentScore >= 66) return Colors.scoreGood;      // Green for good (66-85)
    if (currentScore >= 41) return Colors.scoreMediocre;  // Yellow for mediocre (41-65)
    return Colors.scorePoor;                              // Red for poor (40 and below)
  };
  
  const triggerHaptics = (finalScore: number) => {
    if (Platform.OS === 'web') return;
    
    if (finalScore >= 86) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (finalScore >= 66) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (finalScore >= 41) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };
  
  useEffect(() => {
    // Start breathing animation
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheValue, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Animate score counting
    const scoreAnimation = Animated.timing(scoreValue, {
      toValue: score,
      duration: duration,
      useNativeDriver: false,
    });
    
    // Animate circle progress - strokeDashoffset for SVG
    const circleAnimation = Animated.timing(animatedValue, {
      toValue: score,
      duration: duration,
      useNativeDriver: false,
    });
    
    // Start animations
    breatheAnimation.start();
    
    Animated.parallel([
      scoreAnimation,
      circleAnimation,
    ]).start(() => {
      triggerHaptics(score);
      onAnimationComplete?.();
    });
    
    return () => {
      breatheAnimation.stop();
    };
  }, [score, duration, animatedValue, breatheValue, scoreValue, onAnimationComplete]);
  
  // Calculate stroke dash offset for progress
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [{ scale: breatheValue }],
        },
      ]}
    >
      {/* SVG Circle Progress */}
      <Svg width={size} height={size} style={styles.svgContainer}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.gray200}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={getScoreColor(score)}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      
      {/* Score text */}
      <View style={styles.scoreContainer}>
        <Animated.Text 
          style={[
            styles.scoreText,
            { color: getScoreColor(score) },
          ]}
        >
          {Math.round(score)}
        </Animated.Text>
        <Text style={styles.scoreLabel}>/ 100</Text>
      </View>
      
      {/* Glow effect */}
      <View 
        style={[
          styles.glowEffect,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            shadowColor: getScoreColor(score),
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svgContainer: {
    position: 'absolute',
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    opacity: 0.7,
    marginTop: -4,
  },
  glowEffect: {
    position: 'absolute',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    zIndex: -1,
  },
});