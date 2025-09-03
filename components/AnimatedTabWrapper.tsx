import React, { useEffect, useRef, createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { Animated, Dimensions } from 'react-native';
import { useSegments } from 'expo-router';

interface TabAnimationContextType {
  currentTabIndex: number;
  previousTabIndex: number;
  slideDirection: 'left' | 'right';
  isAnimating: boolean;
}

const TabAnimationContext = createContext<TabAnimationContextType | null>(null);

export const useTabAnimation = () => {
  const context = useContext(TabAnimationContext);
  if (!context) {
    return { currentTabIndex: 0, previousTabIndex: 0, slideDirection: 'right' as const, isAnimating: false };
  }
  return context;
};

// Tab order mapping
const tabOrder = ['index', 'grocery-list', 'discover', 'history', 'goals'];

export const TabAnimationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const segments = useSegments();
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [previousTabIndex, setPreviousTabIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const currentTab = segments[segments.length - 1] || 'index';
    const newIndex = tabOrder.indexOf(currentTab);
    
    if (newIndex !== -1 && newIndex !== currentTabIndex) {
      setPreviousTabIndex(currentTabIndex);
      setCurrentTabIndex(newIndex);
      setSlideDirection(newIndex > currentTabIndex ? 'left' : 'right');
      setIsAnimating(true);
      
      // Reset animation state after animation completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    }
  }, [segments, currentTabIndex]);

  const contextValue = useMemo(() => ({
    currentTabIndex,
    previousTabIndex,
    slideDirection,
    isAnimating
  }), [currentTabIndex, previousTabIndex, slideDirection, isAnimating]);

  return (
    <TabAnimationContext.Provider value={contextValue}>
      {children}
    </TabAnimationContext.Provider>
  );
};

interface AnimatedTabWrapperProps {
  children: ReactNode;
  tabName: string;
}

export const AnimatedTabWrapper: React.FC<AnimatedTabWrapperProps> = ({ children, tabName }) => {
  const { currentTabIndex, previousTabIndex, slideDirection, isAnimating } = useTabAnimation();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get('window');
  
  const tabIndex = tabOrder.indexOf(tabName);
  const isCurrentTab = currentTabIndex === tabIndex;
  const wasPreviousTab = previousTabIndex === tabIndex;
  
  useEffect(() => {
    if (isAnimating && (isCurrentTab || wasPreviousTab)) {
      // Reset animation value
      slideAnim.setValue(isCurrentTab ? (slideDirection === 'left' ? screenWidth : -screenWidth) : 0);
      
      // Animate to final position
      Animated.timing(slideAnim, {
        toValue: isCurrentTab ? 0 : (slideDirection === 'left' ? -screenWidth : screenWidth),
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else if (!isAnimating) {
      // Ensure current tab is visible and others are hidden
      slideAnim.setValue(isCurrentTab ? 0 : screenWidth);
    }
  }, [isAnimating, isCurrentTab, wasPreviousTab, slideDirection, screenWidth, slideAnim]);
  
  // Only render if this is the current tab or involved in animation
  if (!isCurrentTab && !wasPreviousTab && isAnimating) {
    return null;
  }
  
  if (!isCurrentTab && !isAnimating) {
    return null;
  }
  
  return (
    <Animated.View 
      style={[
        { flex: 1 },
        {
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};