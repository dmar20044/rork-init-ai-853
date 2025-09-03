import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ReactNode, useState, memo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { ScanHistoryProvider } from "@/contexts/ScanHistoryContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { GroceryListProvider, useGroceryList } from "@/contexts/GroceryListContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TabNavigationProvider } from "@/contexts/TabNavigationContext";
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
  const [hasNavigated, setHasNavigated] = useState(false);

  // Memoize stack screen options for better performance (moved before conditional returns)
  const stackScreenOptions = React.useMemo(() => ({ 
    headerBackTitle: "Back",
    animation: 'slide_from_right' as const,
    animationDuration: 200, // Faster animations
  }), []);

  const quizScreenOptions = React.useMemo(() => ({ headerShown: false }), []);
  const tabsScreenOptions = React.useMemo(() => ({ headerShown: false }), []);
  const nutritionResultsScreenOptions = React.useMemo(() => ({ headerShown: false }), []);

  useEffect(() => {
    // Wait for both profile and auth state to be loaded
    if (!isLoading && !authState.isLoading && !hasNavigated) {
      try {
        console.log('[Navigation] Profile and auth loaded:', { 
          hasCompletedQuiz: profile?.hasCompletedQuiz, 
          name: profile?.name,
          isAuthenticated: authState.isAuthenticated,
          userEmail: authState.user?.email
        });
        
        if (profile?.hasCompletedQuiz) {
          console.log('[Navigation] Navigating to tabs');
          router.replace('/(tabs)');
        } else {
          console.log('[Navigation] Navigating to quiz');
          router.replace('/quiz');
        }
        setHasNavigated(true);
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback to quiz if navigation fails
        router.replace('/quiz');
        setHasNavigated(true);
      }
    }
  }, [isLoading, authState.isLoading, profile?.hasCompletedQuiz, authState.isAuthenticated, hasNavigated, profile?.name, authState.user?.email]);

  if (isLoading || authState.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="quiz" options={quizScreenOptions} />
        <Stack.Screen name="(tabs)" options={tabsScreenOptions} />
        <Stack.Screen name="nutrition-results" options={nutritionResultsScreenOptions} />
      </Stack>
      <ToastNotification visible={showToast} message={toastMessage} />
    </>
  );
});

export default function RootLayout() {
  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Error hiding splash screen:', error);
      }
    };
    
    // Add a small delay to ensure everything is loaded
    const timer = setTimeout(hideSplash, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
          <UserProvider>
            <ScanHistoryProvider>
              <GroceryListProvider>
                <TabNavigationProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootLayoutNav />
                  </GestureHandlerRootView>
                </TabNavigationProvider>
              </GroceryListProvider>
            </ScanHistoryProvider>
          </UserProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}