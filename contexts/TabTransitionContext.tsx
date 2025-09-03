import React, { useState } from 'react';
import { Dimensions } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';

interface TabTransitionState {
  prevIndex: number | null;
  currentIndex: number | null;
  setCurrentIndex: (index: number) => void;
  screenWidth: number;
}

export const [TabTransitionProvider, useTabTransition] = createContextHook<TabTransitionState>(() => {
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndexState] = useState<number | null>(null);
  const width = Dimensions.get('window').width;

  const setCurrentIndex = (index: number) => {
    setPrevIndex((prev) => (currentIndex !== null ? currentIndex : prev));
    setCurrentIndexState(index);
    console.log('[TabTransition] setCurrentIndex', { index, prevIndex: currentIndex });
  };

  return {
    prevIndex,
    currentIndex,
    setCurrentIndex,
    screenWidth: width,
  } as TabTransitionState;
});
