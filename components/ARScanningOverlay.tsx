import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface ARScanningOverlayProps {
  isScanning: boolean;
  scanProgress?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export default function ARScanningOverlay({
  isScanning,
  scanProgress = 0,
}: ARScanningOverlayProps) {
  const scanLinePosition = useRef(new Animated.Value(0)).current;
  const cornerPulse = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      startScanningAnimation();
    } else {
      stopScanningAnimation();
    }
  }, [isScanning]);

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: scanProgress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [scanProgress]);

  const startScanningAnimation = () => {
    // Scanning line animation
    const scanLineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLinePosition, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLinePosition, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Corner pulse animation
    const cornerPulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerPulse, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(cornerPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Glow animation
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    scanLineLoop.start();
    cornerPulseLoop.start();
    glowLoop.start();
  };

  const stopScanningAnimation = () => {
    scanLinePosition.stopAnimation();
    cornerPulse.stopAnimation();
    glowAnimation.stopAnimation();
    
    // Reset to initial positions
    Animated.parallel([
      Animated.timing(scanLinePosition, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cornerPulse, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Main scan frame */}
      <View style={styles.scanFrame}>
        {/* Animated corners */}
        <Animated.View
          style={[
            styles.scanCorner,
            styles.scanCornerTL,
            {
              transform: [{ scale: cornerPulse }],
              opacity: isScanning ? 1 : 0.7,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.scanCorner,
            styles.scanCornerTR,
            {
              transform: [{ scale: cornerPulse }],
              opacity: isScanning ? 1 : 0.7,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.scanCorner,
            styles.scanCornerBL,
            {
              transform: [{ scale: cornerPulse }],
              opacity: isScanning ? 1 : 0.7,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.scanCorner,
            styles.scanCornerBR,
            {
              transform: [{ scale: cornerPulse }],
              opacity: isScanning ? 1 : 0.7,
            },
          ]}
        />

        {/* Scanning line */}
        {isScanning && (
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [
                  {
                    translateY: scanLinePosition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 280],
                    }),
                  },
                ],
                opacity: glowAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1, 0.3],
                }),
              },
            ]}
          >
            <View style={styles.scanLineGlow} />
          </Animated.View>
        )}

        {/* Progress indicator */}
        {scanProgress > 0 && (
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}

        {/* Glow effect */}
        {isScanning && (
          <Animated.View
            style={[
              styles.glowEffect,
              {
                opacity: glowAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3],
                }),
              },
            ]}
          />
        )}
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
    borderRadius: 24,
  },
  scanCorner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: Colors.primary,
    borderWidth: 4,
  },
  scanCornerTL: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 24,
  },
  scanCornerTR: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 24,
  },
  scanCornerBL: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 24,
  },
  scanCornerBR: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 24,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  scanLineGlow: {
    position: 'absolute',
    top: -10,
    left: -20,
    right: -20,
    height: 23,
    backgroundColor: Colors.primary,
    opacity: 0.2,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  progressContainer: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  glowEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
});