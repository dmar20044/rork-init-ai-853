import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GroceryItem {
  id: string;
  name: string;
  completed: boolean;
  addedAt: Date;
  // Optional product details from scan history
  imageUri?: string;
  healthScore?: number;
  personalScore?: number;
  calories?: number;
  protein?: number;
  scanHistoryId?: string; // Reference to original scan
}

interface GroceryListContextType {
  groceryItems: GroceryItem[];
  addItem: (name: string, productDetails?: Partial<GroceryItem>) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  updateItem: (id: string, name: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  isLoading: boolean;
  showToast: boolean;
  toastMessage: string;
}

const GroceryListContext = createContext<GroceryListContextType | undefined>(undefined);

export function GroceryListProvider({ children }: { children: React.ReactNode }) {
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const loadGroceryList = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('groceryList');
      if (stored) {
        const items = JSON.parse(stored).map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt),
        }));
        setGroceryItems(items);
      }
    } catch (error) {
      console.error('Error loading grocery list:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveGroceryList = useCallback(async (items: GroceryItem[]) => {
    try {
      await AsyncStorage.setItem('groceryList', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving grocery list:', error);
    }
  }, []);

  useEffect(() => {
    loadGroceryList();
  }, [loadGroceryList]);

  const addItem = useCallback(async (name: string, productDetails?: Partial<GroceryItem>) => {
    if (name.trim()) {
      const newItem: GroceryItem = {
        id: Date.now().toString(),
        name: name.trim(),
        completed: false,
        addedAt: new Date(),
        ...productDetails, // Spread any additional product details
      };
      const updatedItems = [newItem, ...groceryItems];
      setGroceryItems(updatedItems);
      await saveGroceryList(updatedItems);
      
      // Show toast notification
      setToastMessage('Added to your list');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  }, [groceryItems, saveGroceryList]);

  const toggleItem = useCallback(async (id: string) => {
    const updatedItems = groceryItems.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setGroceryItems(updatedItems);
    await saveGroceryList(updatedItems);
  }, [groceryItems, saveGroceryList]);

  const deleteItem = useCallback(async (id: string) => {
    const updatedItems = groceryItems.filter(item => item.id !== id);
    setGroceryItems(updatedItems);
    await saveGroceryList(updatedItems);
  }, [groceryItems, saveGroceryList]);

  const updateItem = useCallback(async (id: string, name: string) => {
    if (name.trim()) {
      const updatedItems = groceryItems.map(item =>
        item.id === id ? { ...item, name: name.trim() } : item
      );
      setGroceryItems(updatedItems);
      await saveGroceryList(updatedItems);
    }
  }, [groceryItems, saveGroceryList]);

  const clearCompleted = useCallback(async () => {
    const updatedItems = groceryItems.filter(item => !item.completed);
    setGroceryItems(updatedItems);
    await saveGroceryList(updatedItems);
  }, [groceryItems, saveGroceryList]);

  const value: GroceryListContextType = {
    groceryItems,
    addItem,
    toggleItem,
    deleteItem,
    updateItem,
    clearCompleted,
    isLoading,
    showToast,
    toastMessage,
  };

  return (
    <GroceryListContext.Provider value={value}>
      {children}
    </GroceryListContext.Provider>
  );
}

export function useGroceryList(): GroceryListContextType {
  const context = useContext(GroceryListContext);
  if (context === undefined) {
    throw new Error('useGroceryList must be used within a GroceryListProvider');
  }
  return context;
}

export { GroceryItem };