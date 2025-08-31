import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/colors';
import PremiumScanFeedback from '@/components/PremiumScanFeedback';
import { useScanHistory } from '@/contexts/ScanHistoryContext';

export default function NutritionResultsScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { history } = useScanHistory();
  
  const historyItem = history.find(item => item.id === itemId);
  
  if (!historyItem) {
    router.back();
    return null;
  }
  
  const handleScanAnother = () => {
    router.replace('/(tabs)');
  };
  
  const handleSaveToHistory = () => {
    // Item is already in history, just go back
    router.back();
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      
      <PremiumScanFeedback
        nutrition={historyItem.nutrition}
        imageUri={historyItem.imageUri}
        onScanAnother={handleScanAnother}
        onSaveToHistory={handleSaveToHistory}
        isLoading={false}
        onBack={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
});