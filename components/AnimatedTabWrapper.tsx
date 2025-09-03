import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { useTabNavigation } from '@/contexts/TabNavigationContext';

const { width: screenWidth } = Dimensions.get('window');

interface AnimatedTabWrapperProps {
  children: React.ReactNode;
  tabName: string;
}

export default function AnimatedTabWrapper({ children, tabName }: AnimatedTabWrapperProps) {
  const { currentTab, previousTab, tabOrder } = useTabNavigation();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (currentTab === tabName && previousTab && previousTab !== currentTab && !isInitialMount.current) {
      const currentIndex = tabOrder.indexOf(currentTab);
      const prevIndex = tabOrder.indexOf(previousTab);
      
      if (currentIndex !== -1 && prevIndex !== -1) {
        const direction = currentIndex > prevIndex ? 1 : -1;
        
        // Start from off-screen
        slideAnim.setValue(direction * screenWidth);
        
        // Animate to center
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [currentTab, previousTab, tabName, slideAnim, tabOrder]);
  
  return (
    <Animated.View 
      style={[
        styles.container,
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
});