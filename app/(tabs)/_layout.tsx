import { Tabs } from "expo-router";
import { History, User, MessageCircle } from "lucide-react-native";
import React, { memo, useCallback } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import Svg, { Path } from "react-native-svg";

// Memoized icon components for better performance
const CameraIcon = memo(({ color, size, focused }: { color: string; size: number; focused?: boolean }) => {
  const retroRed = '#FF0040';
  const iconColor = focused ? retroRed : color;
  
  if (focused) {
    // Filled camera icon when active
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
        <Path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
        <Path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
      </Svg>
    );
  }
  
  // Outline camera icon when inactive
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={1.5}>
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
  );
});

const ShoppingCartIcon = memo(({ color, size, focused }: { color: string; size: number; focused?: boolean }) => {
  if (focused) {
    // Filled shopping cart icon when active
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM3.75 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM16.5 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
      </Svg>
    );
  }
  
  // Outline shopping cart icon when inactive
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
      />
    </Svg>
  );
});

const MessageCircleIcon = memo(({ color, size, focused }: { color: string; size: number; focused?: boolean }) => {
  if (focused) {
    // Filled message icon when active
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223ZM8.25 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" clipRule="evenodd" />
      </Svg>
    );
  }
  
  // Outline message icon when inactive
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
      />
    </Svg>
  );
});

const HistoryIcon = memo(({ color, size }: { color: string; size: number }) => (
  <History color={color} size={size} />
));

const ProfileIcon = memo(({ color, size, focused }: { color: string; size: number; focused?: boolean }) => {
  if (focused) {
    // Filled profile icon when active
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path fillRule="evenodd" d="M4.5 3.75a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V6.75a3 3 0 0 0-3-3h-15Zm4.125 3a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Zm-3.873 8.703a4.126 4.126 0 0 1 7.746 0 .75.75 0 0 1-.351.92 7.47 7.47 0 0 1-3.522.877 7.47 7.47 0 0 1-3.522-.877.75.75 0 0 1-.351-.92ZM15 8.25a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 0-1.5H15ZM14.25 12a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H15a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 0-1.5H15Z" clipRule="evenodd" />
      </Svg>
    );
  }
  
  // Outline profile icon when inactive
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z"
      />
    </Svg>
  );
});

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
    tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => <CameraIcon color={color} size={size} focused={focused} />,
  }), []);

  const groceryListOptions = React.useMemo(() => ({
    title: "Grocery List",
    tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => <ShoppingCartIcon color={color} size={size} focused={focused} />,
  }), []);

  const discoverOptions = React.useMemo(() => ({
    title: "Ask InIt",
    tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => <MessageCircleIcon color={color} size={size} focused={focused} />,
  }), []);

  const historyOptions = React.useMemo(() => ({
    title: "History",
    tabBarIcon: ({ color, size }: { color: string; size: number }) => <HistoryIcon color={color} size={size} />,
  }), []);

  const goalsOptions = React.useMemo(() => ({
    title: "Profile",
    tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => <ProfileIcon color={color} size={size} focused={focused} />,
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