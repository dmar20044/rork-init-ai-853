import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function OnboardingScanScreen() {
  const handleNext = () => {
    // For now, just go back to quiz - you can change this later
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress indicators */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>

        {/* Main visual */}
        <View style={styles.visualContainer}>
          <View style={styles.phoneFrame}>
            <View style={styles.phoneScreen}>
              {/* Simulated camera viewfinder */}
              <View style={styles.cameraView}>
                <View style={styles.scanFrame}>
                  <View style={[styles.scanCorner, styles.scanCornerTL]} />
                  <View style={[styles.scanCorner, styles.scanCornerTR]} />
                  <View style={[styles.scanCorner, styles.scanCornerBL]} />
                  <View style={[styles.scanCorner, styles.scanCornerBR]} />
                  
                  {/* Product placeholder */}
                  <View style={styles.productPlaceholder}>
                    <View style={styles.productBox}>
                      <Text style={styles.productText}>🥤</Text>
                      <Text style={styles.brandText}>Franui</Text>
                      <Text style={styles.productName}>Dark Chocolate</Text>
                    </View>
                  </View>
                </View>
                
                {/* Scan hint */}
                <Text style={styles.scanHint}>Position product within frame</Text>
              </View>
              
              {/* Bottom controls */}
              <View style={styles.cameraControls}>
                <View style={styles.controlButton} />
                <View style={styles.captureButton}>
                  <View style={styles.captureButtonInner} />
                </View>
                <View style={styles.controlButton} />
              </View>
            </View>
          </View>
          
          {/* Floating result card */}
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultCategory}>🍫 Ice Cream</Text>
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>4.0</Text>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>⭐</Text>
                </View>
              </View>
            </View>
            <Text style={styles.resultTitle}>Franui{"\n"}Dark Chocolate</Text>
          </View>
        </View>

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            <Text style={styles.titleHighlight}>Scan</Text> any product
          </Text>
          <Text style={styles.subtitle}>
            Simply point your camera at any food product or meal to get instant nutritional insights and personalized health scores.
          </Text>
        </View>
      </View>

      {/* Bottom button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray300,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  visualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 40,
  },
  phoneFrame: {
    width: 280,
    height: 500,
    backgroundColor: Colors.black,
    borderRadius: 32,
    padding: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: Colors.black,
    borderRadius: 28,
    overflow: 'hidden',
  },
  cameraView: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  scanFrame: {
    width: 200,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scanCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  productPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 120,
  },
  productText: {
    fontSize: 32,
    marginBottom: 8,
  },
  brandText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  scanHint: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    gap: 40,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  captureButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
  },
  resultCard: {
    position: 'absolute',
    top: 60,
    right: -20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    minWidth: 160,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scoreBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scoreBadgeText: {
    fontSize: 10,
    color: Colors.white,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 38,
  },
  titleHighlight: {
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});