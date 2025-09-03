import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface ARScanningOverlayProps {
  isScanning: boolean;
  isBarcodeMode: boolean;
  scanProgress?: number;
  onScanComplete?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SCAN_FRAME_SIZE = 280;

export default function ARScanningOverlay({
  isScanning,
  isBarcodeMode,
  scanProgress = 0,
  onScanComplete,
}: ARScanningOverlayProps) {
  const scanLineValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const cornerGlowValue = useRef(new Animated.Value(0)).current;
  const gridOpacity = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      startScanningAnimation();
    } else {
      stopScanningAnimation();
    }
  }, [isScanning]);

  useEffect(() => {
    Animated.timing(progressValue, {
      toValue: scanProgress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [scanProgress]);

  const startScanningAnimation = () => {
    // Scanning line animation
    const scanLineAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineValue, {
          toValue: 1,
          duration: isBarcodeMode ? 2000 : 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineValue, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ])
    );

    // Corner glow animation
    const cornerGlowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerGlowValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(cornerGlowValue, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Grid overlay animation
    const gridAnimation = Animated.timing(gridOpacity, {
      toValue: 0.3,
      duration: 500,
      useNativeDriver: true,
    });

    // Pulse animation for frame
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    scanLineAnimation.start();
    cornerGlowAnimation.start();
    gridAnimation.start();
    pulseAnimation.start();
  };

  const stopScanningAnimation = () => {
    scanLineValue.stopAnimation();
    cornerGlowValue.stopAnimation();
    pulseValue.stopAnimation();
    
    Animated.parallel([
      Animated.timing(scanLineValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cornerGlowValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(gridOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getScanColor = () => {
    if (scanProgress > 80) return Colors.scoreExcellent;
    if (scanProgress > 60) return Colors.retroNeonTurquoise;
    if (scanProgress > 40) return Colors.scoreMediocre;
    return Colors.primary;
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {/* AR Grid Overlay */}
      <Animated.View style={[styles.gridOverlay, { opacity: gridOpacity }]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLine, styles.horizontalLine, { top: (i + 1) * (SCAN_FRAME_SIZE / 9) }]} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLine, styles.verticalLine, { left: (i + 1) * (SCAN_FRAME_SIZE / 9) }]} />
        ))}
      </Animated.View>

      {/* Main Scan Frame */}
      <Animated.View 
        style={[
          styles.scanFrame,
          {
            transform: [{ scale: pulseValue }],
          },
        ]}
      >
        {/* Corner Elements with Glow */}
        {['TL', 'TR', 'BL', 'BR'].map((corner) => (
          <Animated.View
            key={corner}
            style={[
              styles.scanCorner,
              styles[`scanCorner${corner}` as keyof typeof styles],
              {
                borderColor: getScanColor(),
                shadowColor: getScanColor(),
                shadowOpacity: cornerGlowValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
                shadowRadius: cornerGlowValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 12],
                }),
                elevation: cornerGlowValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [3, 8],
                }),
              },
            ]}
          />
        ))}

        {/* Scanning Line */}
        {isScanning && (
          <Animated.View
            style={[
              styles.scanLine,
              {
                backgroundColor: getScanColor(),
                shadowColor: getScanColor(),
                transform: [
                  {
                    translateY: scanLineValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-2, SCAN_FRAME_SIZE - 2],
                    }),
                  },
                ],
                opacity: scanLineValue.interpolate({
                  inputRange: [0, 0.1, 0.9, 1],
                  outputRange: [0, 1, 1, 0],
                }),
              },
            ]}
          />
        )}

        {/* Progress Indicator */}
        {scanProgress > 0 && (
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: getScanColor(),
                  width: progressValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}

        {/* Center Target */}
        <View style={styles.centerTarget}>
          <View style={[styles.targetDot, { backgroundColor: getScanColor() }]} />
          <Animated.View
            style={[
              styles.targetRing,
              {
                borderColor: getScanColor(),
                transform: [
                  {
                    scale: pulseValue.interpolate({
                      inputRange: [1, 1.05],
                      outputRange: [1, 1.2],
                    }),
                  },
                ],
                opacity: pulseValue.interpolate({
                  inputRange: [1, 1.05],
                  outputRange: [0.8, 0.3],
                }),
              },
            ]}
          />
        </View>
      </Animated.View>

      {/* Status Text */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {isScanning
            ? isBarcodeMode
              ? 'Scanning barcode...'
              : 'Analyzing food...'
            : isBarcodeMode
            ? 'Position barcode in frame'
            : 'Position food in frame'
          }
        </Text>
        {scanProgress > 0 && (
          <Text style={styles.progressText}>{Math.round(scanProgress)}%</Text>
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
    zIndex: 100,
  },
  gridOverlay: {
    position: 'absolute',
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  horizontalLine: {
    width: '100%',
    height: 1,
  },
  verticalLine: {
    height: '100%',
    width: 1,
  },
  scanFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 24,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 24,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 24,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 24,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  progressContainer: {
    position: 'absolute',
    bottom: -30,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  centerTarget: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  targetRing: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  statusContainer: {
    position: 'absolute',
    bottom: -80,
    alignItems: 'center',
  },
  statusText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});