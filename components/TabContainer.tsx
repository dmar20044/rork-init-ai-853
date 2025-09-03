import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTabNavigation } from '@/contexts/TabNavigationContext';

interface TabContainerProps {
  children: React.ReactNode;
}

export default function TabContainer({ children }: TabContainerProps) {
  const { isTransitioning } = useTabNavigation();
  
  return (
    <View style={[styles.container, isTransitioning && styles.transitioning]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  transitioning: {
    overflow: 'hidden',
  },
});