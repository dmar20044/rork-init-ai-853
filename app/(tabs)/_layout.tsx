import { Tabs } from "expo-router";
import { History, User, MessageCircle, ShoppingCart } from "lucide-react-native";
import React, { memo, useCallback } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import Svg, { Path } from "react-native-svg";

// Memoized icon components for better performance
const CameraIcon = memo(({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
    />
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
    />
  </Svg>
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
  
  // Handle tab press with haptic feedback
  const handleTabPress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, []);
  
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
    lazy: true, // Load tabs lazily
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
    <Tabs 
      screenOptions={screenOptions}
      screenListeners={{
        tabPress: handleTabPress,
      }}
    >
      <Tabs.Screen name="index" options={scannerOptions} />
      <Tabs.Screen name="grocery-list" options={groceryListOptions} />
      <Tabs.Screen name="discover" options={discoverOptions} />
      <Tabs.Screen name="history" options={historyOptions} />
      <Tabs.Screen name="goals" options={goalsOptions} />
    </Tabs>
  );
}

export default memo(TabLayout);