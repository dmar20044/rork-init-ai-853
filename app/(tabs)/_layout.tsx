import { Tabs } from "expo-router";
import React, { memo, useCallback, useState, useRef } from "react";
import { Platform, View, TouchableOpacity, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import Svg, { Path } from "react-native-svg";

interface IconProps { color: string; size: number; focused?: boolean }
interface AnimatedIconProps extends IconProps { onPress?: () => void }

// Checkmark icon component
const CheckmarkIcon = memo(function CheckmarkIcon(props: { color: string; size: number }) {
  const { color, size } = props;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
    </Svg>
  );
});



// Memoized icon components for better performance
const CameraIcon = memo(function CameraIcon(props: IconProps) {
  const { color, size, focused } = props;
  const retroRed = '#FF0040';
  const iconColor = focused ? retroRed : color;
  
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
        <Path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
        <Path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
      </Svg>
    );
  }
  
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

// Animated camera icon that transforms to checkmark
const AnimatedCameraIcon = memo(function AnimatedCameraIcon(props: AnimatedIconProps) {
  const { color, size, focused, onPress } = props;
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showCheckmark, setShowCheckmark] = useState<boolean>(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;
  const morphValue = useRef(new Animated.Value(0)).current;
  
  // Effect to handle focused state changes
  React.useEffect(() => {
    if (focused && !showCheckmark) {
      // Animate to checkmark when tab becomes focused
      setIsAnimating(true);
      
      Animated.sequence([
        // Spin and scale down simultaneously
        Animated.parallel([
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 0.3,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        // Brief pause to switch icons
        Animated.delay(50),
      ]).start(() => {
        // Switch to checkmark
        setShowCheckmark(true);
        
        // Scale up and fade in checkmark
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(morphValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Scale back to normal
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setIsAnimating(false);
          });
        });
      });
    } else if (!focused && showCheckmark) {
      // Animate back to camera when tab loses focus
      setIsAnimating(true);
      
      Animated.sequence([
        // Scale down and fade out checkmark
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 0.3,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(morphValue, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        // Brief pause to switch icons
        Animated.delay(50),
      ]).start(() => {
        // Switch back to camera
        setShowCheckmark(false);
        spinValue.setValue(0);
        
        // Scale up and fade in camera
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsAnimating(false);
        });
      });
    }
  }, [focused, showCheckmark, spinValue, scaleValue, opacityValue, morphValue]);
  
  const startAnimation = useCallback(() => {
    if (isAnimating || focused) return; // Don't animate if already focused or animating
    
    setIsAnimating(true);
    
    // Create sequence: spin -> scale down -> switch icon -> scale up -> reset
    Animated.sequence([
      // Spin and scale down simultaneously
      Animated.parallel([
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // Brief pause to switch icons
      Animated.delay(50),
    ]).start(() => {
      // Switch to checkmark
      setShowCheckmark(true);
      
      // Scale up and fade in checkmark
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Scale back to normal
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // Reset after delay only if not focused
          if (!focused) {
            setTimeout(() => {
              setShowCheckmark(false);
              setIsAnimating(false);
              spinValue.setValue(0);
              scaleValue.setValue(1);
              opacityValue.setValue(1);
            }, 1000);
          } else {
            setIsAnimating(false);
          }
        });
      });
    });
    
    // Call the original onPress
    if (onPress) {
      onPress();
    }
  }, [isAnimating, focused, onPress, spinValue, scaleValue, opacityValue]);
  
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const animatedStyle = {
    transform: [
      { rotate: spin },
      { scale: scaleValue },
    ],
    opacity: opacityValue,
  };
  
  return (
    <TouchableOpacity onPress={startAnimation} activeOpacity={0.8}>
      <Animated.View style={animatedStyle}>
        {showCheckmark ? (
          <CheckmarkIcon color="white" size={size} />
        ) : (
          <CameraIcon color={color} size={size} focused={focused} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});



const ShoppingCartIcon = memo(function ShoppingCartIcon(props: IconProps) {
  const { color, size, focused } = props;
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

const MessageCircleIcon = memo(function MessageCircleIcon(props: IconProps) {
  const { color, size, focused } = props;
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

const HistoryIcon = memo(function HistoryIcon(props: IconProps) {
  const { color, size, focused } = props;
  if (focused) {
    // Filled history icon when active
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path fillRule="evenodd" d="M2.25 2.25a.75.75 0 0 0 0 1.5H3v10.5a3 3 0 0 0 3 3h1.21l-1.172 3.513a.75.75 0 0 0 1.424.474l.329-.987h8.418l.33.987a.75.75 0 0 0 1.422-.474l-1.17-3.513H18a3 3 0 0 0 3-3V3.75h.75a.75.75 0 0 0 0-1.5H2.25Zm6.04 16.5.5-1.5h6.42l.5 1.5H8.29Zm7.46-12a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Zm-3 2.25a.75.75 0 0 0-1.5 0v3.75a.75.75 0 0 0 1.5 0V9Zm-3 2.25a.75.75 0 0 0-1.5 0v1.5a.75.75 0 0 0 1.5 0v-1.5Z" clipRule="evenodd" />
      </Svg>
    );
  }
  
  // Outline history icon when inactive
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
      />
    </Svg>
  );
});

const ProfileIcon = memo(function ProfileIcon(props: IconProps) {
  const { color, size, focused } = props;
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
  
  // Custom tab bar component with elevated scanner button
  const CustomTabBar = useCallback(({ state, descriptors, navigation }: any) => {
    return (
      <View style={[styles.tabBarContainer, { backgroundColor: colors.surface, borderTopColor: colors.textTertiary + '30' }]}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          // const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
          const isFocused = state.index === index;
          const isScanner = route.name === 'index'; // Scanner tab

          const onPress = () => {
            if (Platform.OS !== 'web') {
              Haptics.selectionAsync();
            }
            
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          if (isScanner) {
            // Elevated scanner button
            return (
              <View key={route.key} style={styles.scannerButtonContainer}>
                <View
                  style={[
                    styles.scannerButton,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                    }
                  ]}
                >
                  <AnimatedCameraIcon 
                    color="white" 
                    size={28} 
                    focused={isFocused}
                    onPress={onPress}
                  />
                </View>
              </View>
            );
          }

          // Regular tab buttons
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.regularTab}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                {options.tabBarIcon && options.tabBarIcon({
                  focused: isFocused,
                  color: isFocused ? colors.primary : colors.textTertiary,
                  size: 24,
                })}
                <View style={styles.labelContainer}>
                  <View style={[
                    styles.label,
                    {
                      color: isFocused ? colors.primary : colors.textTertiary,
                    }
                  ]}>
                    {/* Label text would go here but we'll keep it minimal */}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [colors]);

  // Memoize screen options to prevent unnecessary re-renders
  const screenOptions = React.useMemo(() => ({
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textTertiary,
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
    tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => <HistoryIcon color={color} size={size} focused={focused} />,
  }), []);

  const goalsOptions = React.useMemo(() => ({
    title: "Profile",
    tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => <ProfileIcon color={color} size={size} focused={focused} />,
  }), []);
  
  return (
    <Tabs 
      screenOptions={screenOptions}
      tabBar={CustomTabBar}
      screenListeners={{
        tabPress: handleTabPress,
      }}
    >
      <Tabs.Screen name="grocery-list" options={groceryListOptions} />
      <Tabs.Screen name="discover" options={discoverOptions} />
      <Tabs.Screen name="index" options={scannerOptions} />
      <Tabs.Screen name="history" options={historyOptions} />
      <Tabs.Screen name="goals" options={goalsOptions} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 88 : 68,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 34 : 8,
    paddingTop: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  regularTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    marginTop: 4,
    height: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  scannerButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  scannerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default memo(TabLayout);