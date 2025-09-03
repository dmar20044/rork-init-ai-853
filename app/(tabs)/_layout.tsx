import { Tabs } from "expo-router";
import { Camera, History, User, MessageCircle, ShoppingCart } from "lucide-react-native";
import React, { memo, useCallback } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { useTabNavigation } from "@/contexts/TabNavigationContext";
import TabContainer from "@/components/TabContainer";

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
    <TabContainer>
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen name="index" options={scannerOptions} />
        <Tabs.Screen name="grocery-list" options={groceryListOptions} />
        <Tabs.Screen name="discover" options={discoverOptions} />
        <Tabs.Screen name="history" options={historyOptions} />
        <Tabs.Screen name="goals" options={goalsOptions} />
      </Tabs>
    </TabContainer>
  );
}



export default memo(TabLayout);