import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { useTabNavigation } from '@/contexts/TabNavigationContext';

const { width: screenWidth } = Dimensions.get('window');

interface AnimatedTabWrapperProps {
  children: React.ReactNode;
  tabName: string;
}

export default function AnimatedTabWrapper({ children, tabName }: AnimatedTabWrapperProps) {
  const { currentTab, previousTab, isTransitioning, animationDirection } = useTabNavigation();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isTransitioning && animationDirection) {
      if (tabName === currentTab) {
        // This is the incoming tab
        const startPosition = animationDirection === 'left' ? screenWidth : -screenWidth;
        slideAnim.setValue(startPosition);
        
        // Animate to center
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (tabName === previousTab) {
        // This is the outgoing tab
        const endPosition = animationDirection === 'left' ? -screenWidth : screenWidth;
        slideAnim.setValue(0);
        
        // Animate out
        Animated.timing(slideAnim, {
          toValue: endPosition,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else if (!isTransitioning && tabName === currentTab) {
      // Ensure current tab is centered when not transitioning
      slideAnim.setValue(0);
    }
  }, [currentTab, previousTab, isTransitioning, animationDirection, tabName, slideAnim]);
  
  // Always render, but control visibility through opacity and position
  const isVisible = tabName === currentTab || (isTransitioning && (tabName === previousTab || tabName === currentTab));
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <Animated.View 
      style={[
        styles.container,
        isTransitioning && styles.transitioning,
        {
          transform: [{ translateX: slideAnim }],
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  transitioning: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});