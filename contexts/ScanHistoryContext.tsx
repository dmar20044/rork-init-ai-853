import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NutritionInfo } from '@/services/foodAnalysis';
import { saveScanToHistory, getUserScanHistory, deleteScanFromHistory, clearUserScanHistory } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

export interface ScanHistoryItem {
  id: string;
  nutrition: NutritionInfo;
  imageUri: string;
  timestamp: number;
}

interface ScanHistoryContextType {
  history: ScanHistoryItem[];
  addToHistory: (item: Omit<ScanHistoryItem, 'id' | 'timestamp'>) => Promise<void>;
  removeFromHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  isLoading: boolean;
}

const ScanHistoryContext = createContext<ScanHistoryContextType | undefined>(undefined);

const STORAGE_KEY = 'scan_history';

export function ScanHistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { authState } = useUser();

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[ScanHistory] Loading history...', {
        isAuthenticated: authState.isAuthenticated,
        userId: authState.user?.id
      });
      
      if (authState.isAuthenticated && authState.user?.id) {
        // Load from Supabase for authenticated users
        try {
          console.log('[ScanHistory] Loading from Supabase...');
          const supabaseHistory = await getUserScanHistory(authState.user.id);
          
          // Convert Supabase format to local format
          const convertedHistory: ScanHistoryItem[] = supabaseHistory.map(item => ({
            id: item.id,
            nutrition: item.nutrition_data,
            imageUri: item.image_uri || '',
            timestamp: new Date(item.created_at).getTime(),
          }));
          
          setHistory(convertedHistory);
          
          // Also save to local storage as backup
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(convertedHistory));
          console.log('[ScanHistory] Loaded', convertedHistory.length, 'items from Supabase');
          
        } catch (supabaseError: any) {
          console.error('[ScanHistory] Failed to load from Supabase:', supabaseError);
          
          // Check if it's a table not found error
          if (supabaseError?.code === 'PGRST205') {
            console.warn('[ScanHistory] scan_history table not found. Please run the Supabase schema SQL script.');
          }
          
          // Fallback to local storage
          await loadFromLocalStorage();
        }
      } else {
        // Load from local storage for non-authenticated users
        await loadFromLocalStorage();
      }
    } catch (error) {
      console.error('[ScanHistory] Error loading scan history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authState.isAuthenticated, authState.user?.id]);

  // Load history when component mounts or auth state changes
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadFromLocalStorage = async () => {
    console.log('[ScanHistory] Loading from local storage...');
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsedHistory = JSON.parse(stored);
      setHistory(parsedHistory.sort((a: ScanHistoryItem, b: ScanHistoryItem) => b.timestamp - a.timestamp));
      console.log('[ScanHistory] Loaded', parsedHistory.length, 'items from local storage');
    } else {
      setHistory([]);
      console.log('[ScanHistory] No local history found');
    }
  };

  const saveToLocalStorage = useCallback(async (newHistory: ScanHistoryItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('[ScanHistory] Error saving to local storage:', error);
    }
  }, []);

  const addToHistory = useCallback(async (item: Omit<ScanHistoryItem, 'id' | 'timestamp'>) => {
    const timestamp = Date.now();
    const localId = timestamp.toString() + Math.random().toString(36).substr(2, 9);
    
    // Check for duplicate entries (same product name within last 10 seconds)
    const recentDuplicate = history.find(historyItem => 
      historyItem.nutrition.name === item.nutrition.name && 
      (timestamp - historyItem.timestamp) < 10000 // 10 seconds
    );
    
    if (recentDuplicate) {
      console.log('[ScanHistory] Duplicate entry detected, skipping:', {
        productName: item.nutrition.name,
        timeDiff: timestamp - recentDuplicate.timestamp
      });
      return;
    }
    
    const newItem: ScanHistoryItem = {
      ...item,
      id: localId,
      timestamp,
    };

    console.log('[ScanHistory] Adding item to history:', {
      productName: item.nutrition.name,
      score: item.nutrition.healthScore,
      isAuthenticated: authState.isAuthenticated
    });

    // Update local state immediately
    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    
    // Save to local storage
    await saveToLocalStorage(newHistory);
    
    // Save to Supabase if user is authenticated
    if (authState.isAuthenticated && authState.user?.id) {
      try {
        console.log('[ScanHistory] Saving to Supabase...');
        const savedItem = await saveScanToHistory(authState.user.id, {
          productName: item.nutrition.name || 'Unknown Product',
          brand: undefined, // NutritionInfo doesn't have brand field
          score: Number(item.nutrition.healthScore || 0),
          baseScore: item.nutrition.healthScore ? Number(item.nutrition.healthScore) : undefined,
          personalizedScore: item.nutrition.personalScore ? Number(item.nutrition.personalScore) : undefined,
          imageUri: item.imageUri,
          nutritionData: item.nutrition,
          analysisData: undefined, // NutritionInfo doesn't have analysis field
        });
        
        // Update the item with the Supabase ID
        const updatedHistory = newHistory.map(historyItem => 
          historyItem.id === localId 
            ? { ...historyItem, id: savedItem.id }
            : historyItem
        );
        
        setHistory(updatedHistory);
        await saveToLocalStorage(updatedHistory);
        
        console.log('[ScanHistory] Successfully saved to Supabase with ID:', savedItem.id);
      } catch (error) {
        console.error('[ScanHistory] Failed to save to Supabase:', error);
        // Continue with local storage only
      }
    }
  }, [history, authState.isAuthenticated, authState.user?.id, saveToLocalStorage]);

  const removeFromHistory = useCallback(async (id: string) => {
    console.log('[ScanHistory] Removing item from history:', id);
    
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    await saveToLocalStorage(newHistory);
    
    // Remove from Supabase if user is authenticated
    if (authState.isAuthenticated && authState.user?.id) {
      try {
        await deleteScanFromHistory(authState.user.id, id);
        console.log('[ScanHistory] Successfully removed from Supabase');
      } catch (error) {
        console.error('[ScanHistory] Failed to remove from Supabase:', error);
        // Continue with local removal only
      }
    }
  }, [history, authState.isAuthenticated, authState.user?.id, saveToLocalStorage]);

  const clearHistory = useCallback(async () => {
    console.log('[ScanHistory] Clearing all history');
    
    setHistory([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
    
    // Clear from Supabase if user is authenticated
    if (authState.isAuthenticated && authState.user?.id) {
      try {
        await clearUserScanHistory(authState.user.id);
        console.log('[ScanHistory] Successfully cleared Supabase history');
      } catch (error) {
        console.error('[ScanHistory] Failed to clear Supabase history:', error);
        // Continue with local clearing only
      }
    }
  }, [authState.isAuthenticated, authState.user?.id]);

  const value = useMemo(() => ({
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    isLoading,
  }), [history, addToHistory, removeFromHistory, clearHistory, isLoading]);

  return (
    <ScanHistoryContext.Provider value={value}>
      {children}
    </ScanHistoryContext.Provider>
  );
}

export function useScanHistory() {
  const context = useContext(ScanHistoryContext);
  if (context === undefined) {
    throw new Error('useScanHistory must be used within a ScanHistoryProvider');
  }
  return context;
}