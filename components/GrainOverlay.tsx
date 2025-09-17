import React, { memo } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';

interface GrainOverlayProps {
  opacity?: number;
  testID?: string;
}

const NOISE_URI = 'https://pub-19ca9f6a88aa4af6a2cb24cb9a499a98.r2.dev/textures/fine-noise.png';

function GrainOverlayBase({ opacity = 0.06, testID = 'grain-overlay' }: GrainOverlayProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        testID={testID}
        accessibilityIgnoresInvertColors
        source={{ uri: NOISE_URI }}
        style={[styles.noise, { opacity }]}
        resizeMode={Platform.OS === 'web' ? 'cover' : 'cover'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  noise: {
    ...StyleSheet.absoluteFillObject,
  },
});

export const GrainOverlay = memo(GrainOverlayBase);
export default GrainOverlay;
