import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useSegments } from 'expo-router';

interface TabNavigationContextType {
  currentTab: string;
  previousTab: string | null;
  tabOrder: string[];
}

const TabNavigationContext = createContext<TabNavigationContextType | undefined>(undefined);

const tabOrder = ['index', 'grocery-list', 'discover', 'history', 'goals'];

export function TabNavigationProvider({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const [currentTab, setCurrentTab] = useState('index');
  const [previousTab, setPreviousTab] = useState<string | null>(null);

  useEffect(() => {
    const newTab = segments[segments.length - 1] || 'index';
    if (newTab !== currentTab && tabOrder.includes(newTab)) {
      setPreviousTab(currentTab);
      setCurrentTab(newTab);
    }
  }, [segments, currentTab]);

  const value = useMemo(() => ({ currentTab, previousTab, tabOrder }), [currentTab, previousTab]);

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