import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ReactNode, useState, memo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, Text, TouchableOpacity, Platform } from "react-native";
import { ScanHistoryProvider } from "@/contexts/ScanHistoryContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { GroceryListProvider, useGroceryList } from "@/contexts/GroceryListContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ToastNotification } from "@/components/ToastNotification";
import { Colors } from "@/constants/colors";
import "@/constants/production"; // Initialize production config

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: Colors.background }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 16 }}>Something went wrong</Text>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>The app encountered an error. Please restart the app.</Text>
          <TouchableOpacity 
            style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text style={{ color: Colors.white, fontWeight: '600' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

SplashScreen.preventAutoHideAsync();

// Optimize QueryClient for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const RootLayoutNav = memo(function RootLayoutNav() {
  const { profile, isLoading, authState } = useUser();
  const { showToast, toastMessage } = useGroceryList();

  // Don't do any automatic navigation - let Expo Router handle initial routing
  // The user will start at the index route and we'll handle navigation from there

  return (
    <>
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
          animationDuration: Platform.OS === 'web' ? 0 : 200,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="quiz" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="nutrition-results" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding-scan" options={{ headerShown: false }} />
        <Stack.Screen name="insights" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" options={{ headerShown: false }} />
        <Stack.Screen name="backend-test" options={{ headerShown: false }} />
        <Stack.Screen name="debug" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
      <ToastNotification visible={showToast} message={toastMessage} />
    </>
  );
});

export default function RootLayout() {
  useEffect(() => {
    const prepare = async () => {
      try {
        console.log('App initialization started');
        
        // Wait a bit for everything to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Hide splash screen
        await SplashScreen.hideAsync();
        
        console.log('App initialization completed');
      } catch (error) {
        console.error('Error during app initialization:', error);
      }
    };

    prepare();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <UserProvider>
                <SubscriptionProvider>
                  <ScanHistoryProvider>
                    <GroceryListProvider>
                      <RootLayoutNav />
                    </GroceryListProvider>
                  </ScanHistoryProvider>
                </SubscriptionProvider>
              </UserProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}