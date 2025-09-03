import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, AccessibilityInfo } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Mic, Waves } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function AskInitSpeak() {
  const { colors, isDarkMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isListening, setIsListening] = useState<boolean>(false);

  const startPressAnim = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 12,
      bounciness: 6,
    }).start();
  }, [scaleAnim]);

  const endPressAnim = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 12,
      bounciness: 6,
    }).start();
  }, [scaleAnim]);

  const onPressTalk = useCallback(async () => {
    try {
      console.log('[AskInitSpeak] Talk button pressed');
      if (Platform.OS !== 'web') {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {
          console.log('Haptics not available:', e);
        }
      } else {
        console.log('Haptics not available on web');
      }
      const next = !isListening;
      setIsListening(next);
      AccessibilityInfo.announceForAccessibility?.(next ? 'Listening. Speak now.' : 'Stopped listening.');
    } catch (error) {
      console.error('[AskInitSpeak] Error handling talk press', error);
    }
  }, [isListening]);

  const containerStyle = useMemo(() => [
    styles.container,
    { backgroundColor: colors.background },
  ], [colors.background]);

  const pulseColor = isDarkMode ? colors.primaryLight : colors.primary;
  const ringColor = isDarkMode ? colors.surfaceTertiary : '#F5F5F5';

  return (
    <View style={containerStyle} testID="askinit-speak-screen">
      <Stack.Screen options={{
        title: 'Speak to InIt',
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.textPrimary },
        headerTintColor: colors.textPrimary,
      }} />

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.buttonOuter,
            { borderColor: ringColor, shadowColor: 'rgba(0, 0, 0, 0.3)' },
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={startPressAnim}
            onPressOut={endPressAnim}
            onPress={onPressTalk}
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Stop listening' : 'Start talking'}
            accessibilityHint="Double tap to toggle speak mode"
            style={[styles.button, { backgroundColor: colors.surface }]}
            testID="talk-button"
          >
            <View style={[styles.pulse, { backgroundColor: isListening ? pulseColor : 'transparent' }]} />
            <View style={styles.iconRow}>
              <Mic size={36} color={isListening ? colors.white : colors.textPrimary} />
            </View>
            <Text style={[styles.label, { color: isListening ? colors.white : colors.textPrimary }]}>Talk</Text>
            {isListening && (
              <View style={styles.waveRow}>
                <Waves size={20} color={colors.white} />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
        <Text style={[styles.helper, { color: colors.textSecondary }]} testID="helper-text">
          Press to start a conversation with your nutrition coach.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  button: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulse: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 90,
    opacity: 0.22,
  },
  iconRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRow: {
    position: 'absolute',
    bottom: 24,
  },
  label: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  helper: {
    marginTop: 24,
    fontSize: 14,
    textAlign: 'center' as const,
  },
});
