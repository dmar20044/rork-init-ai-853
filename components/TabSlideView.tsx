import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTabTransition } from '@/contexts/TabTransitionContext';

interface TabSlideViewProps {
  index: number;
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export default function TabSlideView({ index, children, style, testID }: TabSlideViewProps) {
  const isFocused = useIsFocused();
  const { prevIndex, currentIndex, screenWidth } = useTabTransition();
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const direction = useMemo(() => {
    if (prevIndex === null || currentIndex === null) return 0;
    if (currentIndex === prevIndex) return 0;
    return currentIndex > prevIndex ? 1 : -1;
  }, [prevIndex, currentIndex]);

  useEffect(() => {
    if (isFocused) {
      const from = direction === 0 ? 0 : (direction === 1 ? screenWidth : -screenWidth);
      translateX.setValue(from);
      opacity.setValue(0.9);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ]).start();
    } else {
      translateX.setValue(0);
      opacity.setValue(1);
    }
  }, [isFocused, direction, screenWidth, translateX, opacity]);

  return (
    <Animated.View
      testID={testID}
      style={[styles.container, style, { transform: [{ translateX }], opacity }]}
    >
      <View style={styles.inner}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
});
