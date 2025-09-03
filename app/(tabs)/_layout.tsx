import { Tabs } from "expo-router";
import { Camera, History, User, MessageCircle, ShoppingCart } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useRef } from "react";
import { Platform, Animated, Dimensions } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { usePathname } from "expo-router";

// Memoized icon components for better performance
const CameraIcon = memo(({ color, size }: { color: string; size: number }) => (
  <Camera color={color} size={size} />
));

const ShoppingCartIcon = memo(({ color, size }: { color: string; size: number }) => (
  <ShoppingCart color={color} size={size} />
));

const MessageCircleIcon = memo(({ color, size }: { color: string; size: number }) => (
  <MessageCircle color={color} size={size} />
));

const HistoryIcon = memo(({ color, size }: { color: string; size: number }) => (
  <History color={color} size={size} />
));

const UserIcon = memo(({ color, size }: { color: string; size: number }) => (
  <User color={color} size={size} />
));

function TabLayout() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  
  // Map routes to indices for animation
  const routeIndices = {
    '/': 0,
    '/grocery-list': 1,
    '/discover': 2,
    '/history': 3,
    '/goals': 4,
  };
  
  const currentIndex = routeIndices[pathname as keyof typeof routeIndices] || 0;
  const previousIndex = useRef(0);
  
  useEffect(() => {
    if (currentIndex !== previousIndex.current) {
      // Animate slide transition
      Animated.timing(slideAnim, {
        toValue: currentIndex,
        duration: 500,
        useNativeDriver: false, // We need to animate layout properties
      }).start();
      
      previousIndex.current = currentIndex;
    }
  }, [currentIndex, slideAnim]);
  
  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = React.useMemo(() => ({
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textTertiary,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.textTertiary + '30',
      paddingBottom: Platform.OS === "ios" ? 0 : 8,
      paddingTop: 8,
      height: Platform.OS === "ios" ? 88 : 68,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: "600" as const,
    },
    headerShown: false,
    // Performance optimizations
    lazy: false, // Disable lazy loading for smooth animations
    tabBarHideOnKeyboard: true, // Hide tab bar when keyboard is open
    tabBarAllowFontScaling: false, // Prevent font scaling issues
  }), [colors]);

  // Memoize tab screen options
  const scannerOptions = React.useMemo(() => ({
    title: "Scanner",
    tabBarIcon: ({ color, size }: { color: string; size: number }) => <CameraIcon color={color} size={size} />,
  }), []);

  const groceryListOptions = React.useMemo(() => ({
    title: "Grocery List",
    tabBarIcon: ({ color, size }: { color: string; size: number }) => <ShoppingCartIcon color={color} size={size} />,
  }), []);

  const discoverOptions = React.useMemo(() => ({
    title: "Ask InIt",
    tabBarIcon: ({ color, size }: { color: string; size: number }) => <MessageCircleIcon color={color} size={size} />,
  }), []);

  const historyOptions = React.useMemo(() => ({
    title: "History",
    tabBarIcon: ({ color, size }: { color: string; size: number }) => <HistoryIcon color={color} size={size} />,
  }), []);

  const goalsOptions = React.useMemo(() => ({
    title: "Profile",
    tabBarIcon: ({ color, size }: { color: string; size: number }) => <UserIcon color={color} size={size} />,
  }), []);
  
  return (
    <Animated.View 
      style={{
        flex: 1,
        transform: [{
          translateX: slideAnim.interpolate({
            inputRange: [0, 1, 2, 3, 4],
            outputRange: [0, -screenWidth * 0.05, -screenWidth * 0.1, -screenWidth * 0.05, 0],
            extrapolate: 'clamp',
          })
        }],
        opacity: slideAnim.interpolate({
          inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
          outputRange: [1, 0.8, 1, 0.8, 1, 0.8, 1, 0.8, 1],
          extrapolate: 'clamp',
        })
      }}
    >
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen name="index" options={scannerOptions} />
        <Tabs.Screen name="grocery-list" options={groceryListOptions} />
        <Tabs.Screen name="discover" options={discoverOptions} />
        <Tabs.Screen name="history" options={historyOptions} />
        <Tabs.Screen name="goals" options={goalsOptions} />
      </Tabs>
    </Animated.View>
  );
}

export default memo(TabLayout);