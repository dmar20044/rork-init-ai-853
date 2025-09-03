import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useSegments } from 'expo-router';

interface TabNavigationContextType {
  currentTab: string;
  previousTab: string | null;
  tabOrder: string[];
  isTransitioning: boolean;
  animationDirection: 'left' | 'right' | null;
}

const TabNavigationContext = createContext<TabNavigationContextType | undefined>(undefined);

const tabOrder = ['index', 'grocery-list', 'discover', 'history', 'goals'];

export function TabNavigationProvider({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const [currentTab, setCurrentTab] = useState('index');
  const [previousTab, setPreviousTab] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const newTab = segments[segments.length - 1] || 'index';
    if (newTab !== currentTab && tabOrder.includes(newTab)) {
      const currentIndex = tabOrder.indexOf(currentTab);
      const newIndex = tabOrder.indexOf(newTab);
      
      // Determine animation direction
      const direction = newIndex > currentIndex ? 'left' : 'right';
      
      setIsTransitioning(true);
      setAnimationDirection(direction);
      setPreviousTab(currentTab);
      setCurrentTab(newTab);
      
      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Reset transition state after animation completes
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
        setAnimationDirection(null);
      }, 350); // Slightly longer than animation duration
    }
  }, [segments, currentTab]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(() => ({ 
    currentTab, 
    previousTab, 
    tabOrder, 
    isTransitioning, 
    animationDirection 
  }), [currentTab, previousTab, isTransitioning, animationDirection]);

  return (
    <TabNavigationContext.Provider value={value}>
      {children}
    </TabNavigationContext.Provider>
  );
}

export function useTabNavigation() {
  const context = useContext(TabNavigationContext);
  if (context === undefined) {
    throw new Error('useTabNavigation must be used within a TabNavigationProvider');
  }
  return context;
}