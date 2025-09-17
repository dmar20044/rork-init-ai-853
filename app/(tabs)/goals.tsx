import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { User, Target, Trophy, ChevronRight, Settings, Bell, Heart, Zap, TrendingUp, X, UserCircle, LogOut, Flame, Calendar, Edit3, Moon, Sun, Shield, Camera, Image as ImageIcon, AlertTriangle, Plus } from "lucide-react-native";
import { format, getDay } from 'date-fns';

import { useUser, UserGoals } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useScanHistory } from "@/contexts/ScanHistoryContext";
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import GoalSelectionModal from '@/components/GoalSelectionModal';

export default function GoalsScreen() {
  const { profile, updateGoals, updateProfile, logout, authState, getStreakHistory } = useUser();
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const { history } = useScanHistory();
  
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedGoalType, setSelectedGoalType] = useState<keyof UserGoals | null>(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [streakCalendarVisible, setStreakCalendarVisible] = useState(false);
  const [personalDetailsVisible, setPersonalDetailsVisible] = useState(false);
  const [privacyPolicyVisible, setPrivacyPolicyVisible] = useState(false);
  const [termsOfServiceVisible, setTermsOfServiceVisible] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.name || '');
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [allergensModalVisible, setAllergensModalVisible] = useState(false);
  const [newAllergen, setNewAllergen] = useState('');

  // Grouped terms for Seed Oils preference toggle
  const seedOilTerms: string[] = [
    'soybean oil',
    'corn oil',
    'canola oil',
    'rapeseed oil',
    'cottonseed oil',
    'sunflower oil',
    'safflower oil',
    'grapeseed oil',
    'rice bran oil',
    'peanut oil',
  ];

  const [heightFeet, setHeightFeet] = useState<string>('');
  const [heightInches, setHeightInches] = useState<string>('');
  const [weightLb, setWeightLb] = useState<string>('');
  const [sex, setSex] = useState<'male' | 'female' | 'other' | null>(profile.sex ?? null);
  const [activityLevel, setActivityLevel] = useState<'inactive' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extra-active' | null>(profile.activityLevel ?? null);

  useEffect(() => {
    const cm = profile.heightCm ?? null;
    if (cm && !isNaN(cm)) {
      const totalInches = cm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches - feet * 12);
      setHeightFeet(String(feet));
      setHeightInches(String(inches));
    } else {
      setHeightFeet('');
      setHeightInches('');
    }
    const kg = profile.weightKg ?? null;
    if (kg && !isNaN(kg)) {
      const lb = kg * 2.2046226218;
      setWeightLb(String(Math.round(lb)));
    } else {
      setWeightLb('');
    }
    setSex(profile.sex ?? null);
    setActivityLevel(profile.activityLevel ?? null);
  }, [profile.heightCm, profile.weightKg, profile.sex, profile.activityLevel]);

  
  // Animation values
  const flameAnim = useRef(new Animated.Value(1)).current;
  const cardScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  
  const handleCardPress = (index: number, goalType: keyof UserGoals) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.sequence([
      Animated.timing(cardScales[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cardScales[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Open goal selection modal
    setSelectedGoalType(goalType);
    setModalVisible(true);
  };
  
  const handleGoalSelect = async (value: string) => {
    if (!selectedGoalType) return;
    
    await updateGoals({ [selectedGoalType]: value });
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  
  const handleStrictnessSelect = async (value: string) => {
    if (!selectedGoalType) return;
    
    // Map goal type to strictness type
    const strictnessMap: Record<string, keyof UserGoals> = {
      healthGoal: 'healthStrictness',
      dietGoal: 'dietStrictness',
      lifeGoal: 'lifeStrictness',
    };
    
    const strictnessType = strictnessMap[selectedGoalType];
    if (strictnessType) {
      await updateGoals({ [strictnessType]: value });
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };
  
  const getCurrentStrictness = (goalType: keyof UserGoals): string | null => {
    const strictnessMap: Record<string, keyof UserGoals> = {
      healthGoal: 'healthStrictness',
      dietGoal: 'dietStrictness',
      lifeGoal: 'lifeStrictness',
    };
    
    const strictnessType = strictnessMap[goalType];
    return strictnessType ? (profile.goals[strictnessType] || null) : null;
  };
  
  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedGoalType(null);
  };

  const getGoalLabel = (goalType: string, goalValue: string | null | undefined) => {
    if (!goalValue) return 'Not set';
    
    const labels: Record<string, Record<string, string>> = {
      bodyGoal: {
        'lose-weight': 'Lose Weight',
        'gain-weight': 'Gain Weight',
        'maintain-weight': 'Maintain Weight',
      },
      healthGoal: {
        'low-sugar': 'Low Sugar',
        'high-protein': 'High Protein',
        'low-fat': 'Low Fat',
        'keto': 'Keto',
        'balanced': 'Balanced',
      },
      dietGoal: {
        'whole-foods': 'Whole Foods',
        'vegan': 'Vegan',
        'carnivore': 'Carnivore',
        'gluten-free': 'Gluten Free',
        'vegetarian': 'Vegetarian',
        'balanced': 'Balanced',
      },
      lifeGoal: {
        'eat-healthier': 'Eat Healthier',
        'boost-energy': 'Boost Energy',
        'feel-better': 'Feel Better',
        'clear-skin': 'Clear Skin',
      },
    };
    
    return labels[goalType]?.[goalValue] || goalValue;
  };

  // Real streak data from user context
  const currentStreak = profile.currentStreak;
  const longestStreak = profile.longestStreak;
  const streakHistory = getStreakHistory(7);
  
  // Debug logging to track streak updates
  useEffect(() => {
    console.log('[GoalsScreen] Profile streak updated:', {
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      lastScanDate: profile.lastScanDate,
      scanDatesCount: profile.scanDates?.length || 0
    });
  }, [profile.currentStreak, profile.longestStreak, profile.lastScanDate, profile.scanDates]);
  
  // Get day letters for Cal AI style display using PST timezone
  const getDayLetter = (dateStr: string) => {
    // Parse the date string and ensure we're using PST timezone
    const date = new Date(dateStr + 'T00:00:00-08:00'); // Force PST timezone
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return dayNames[getDay(date)];
  };
  
  const getDayNumber = (dateStr: string) => {
    // Parse the date string and ensure we're using PST timezone
    const date = new Date(dateStr + 'T00:00:00-08:00'); // Force PST timezone
    return parseInt(format(date, 'd'));
  };

  // Flame animation based on streak
  useEffect(() => {
    const flameIntensity = Math.min(currentStreak / 10, 1); // Max intensity at 10+ days
    const animateFlame = () => {
      Animated.sequence([
        Animated.timing(flameAnim, {
          toValue: 1 + (flameIntensity * 0.3),
          duration: 1000 + (flameIntensity * 500),
          useNativeDriver: true,
        }),
        Animated.timing(flameAnim, {
          toValue: 1,
          duration: 1000 + (flameIntensity * 500),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(animateFlame, 2000 - (flameIntensity * 500));
      });
    };
    animateFlame();
  }, [currentStreak]);

  const getFlameColor = () => {
    if (currentStreak >= 30) return '#FF4500'; // Deep red-orange for 30+ days
    if (currentStreak >= 14) return '#FF6347'; // Tomato red for 2+ weeks
    if (currentStreak >= 7) return '#FF7F50';  // Coral for 1+ week
    if (currentStreak >= 3) return '#FFA500';  // Orange for 3+ days
    return '#FFD700'; // Gold for starting streak
  };

  const renderCalendarDay = (dayData: { date: string; scanned: boolean; isToday?: boolean; isFuture?: boolean }, index: number) => {
    // Parse the date string and ensure we're using PST timezone
    const date = new Date(dayData.date + 'T00:00:00-08:00'); // Force PST timezone
    const dayNumber = parseInt(format(date, 'd'));
    const dayLetter = getDayLetter(dayData.date);
    
    return (
      <View key={index} style={styles.calendarDay}>
        <Text style={[
          styles.calendarDayLetter, 
          dayData.isToday && styles.calendarToday,
          dayData.isFuture && styles.calendarFuture
        ]}>
          {dayLetter}
        </Text>
        <Text style={[
          styles.calendarDayNumber, 
          dayData.isToday && styles.calendarToday,
          dayData.isFuture && styles.calendarFuture
        ]}>
          {dayNumber}
        </Text>
        <View style={[
          styles.calendarDayIndicator,
          dayData.scanned ? styles.calendarDayScanned : styles.calendarDayMissed,
          dayData.isFuture && styles.calendarFutureIndicator
        ]} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Retro Tech Pop Gradient Background */}
      <LinearGradient
        colors={["#4EC9F5", "#7ED9CF", "#F9BFC9", "#FF9E57"]}
        locations={[0, 0.33, 0.66, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientBg}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.brandingHeader}>
        <Text style={styles.brandingText}>InIt AI</Text>
      </View>
      
      {/* Hero Profile Card */}
      <TouchableOpacity 
        style={styles.heroCard}
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          if (!profile.name) {
            // If no name is set, directly show name input
            setTempName('');
            setEditingName(true);
            setPersonalDetailsVisible(true);
          } else {
            // If name is set, show personal details modal
            setPersonalDetailsVisible(true);
          }
        }}
        activeOpacity={0.9}
      >
        <View style={styles.heroBackground} />
        <View style={styles.heroContent}>
          <View style={styles.heroAvatarContainer}>
            <TouchableOpacity 
              style={styles.heroAvatarRing}
              onPress={async () => {
                if (Platform.OS !== 'web') {
                  try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (hapticError) {
                    console.log('Haptics not available:', hapticError);
                  }
                }
                setIsPickingImage(true);
                
                try {
                  // Request media library permissions
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert(
                      'Permission Required',
                      'We need access to your photo library to select a profile picture.',
                      [{ text: 'OK' }]
                    );
                    setIsPickingImage(false);
                    return;
                  }

                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1], // Square aspect ratio for profile pictures
                    quality: 0.8,
                    base64: false,
                  });

                  if (!result.canceled && result.assets?.[0]?.uri) {
                    const imageUri = result.assets[0].uri;
                    await updateProfile({ profilePictureUri: imageUri });
                    
                    if (Platform.OS !== 'web') {
                      try {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      } catch (hapticError) {
                        console.log('Haptics not available:', hapticError);
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error picking profile image:', error);
                  Alert.alert(
                    'Error',
                    'Failed to select profile picture. Please try again.',
                    [{ text: 'OK' }]
                  );
                } finally {
                  setIsPickingImage(false);
                }
              }}
              disabled={isPickingImage}
            >
              <View style={styles.heroAvatarInner}>
                {profile.profilePictureUri ? (
                  <Image 
                    source={{ uri: profile.profilePictureUri }}
                    style={styles.heroAvatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <User size={36} color={colors.white} />
                )}
              </View>
              <View style={styles.heroAvatarOverlay}>
                <Camera size={12} color={colors.white} />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>
              {profile.name || 'Tap to set your name'}
            </Text>
            <Text style={styles.heroSubtitle}>Health Explorer</Text>
          </View>
          <TouchableOpacity 
            style={styles.heroSettingsButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent hero card press
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setSettingsModalVisible(true);
            }}
          >
            <Settings size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      
      {/* Cal AI Style Streak Tracker */}
      <View style={styles.streakSection}>
        <View style={styles.streakHeader}>
          <View style={styles.streakTitleContainer}>
            <Text style={styles.sectionTitle}>Streak Tracker</Text>
          </View>
          <View style={styles.streakCountContainer}>
            <Animated.View style={[
              styles.flameIconContainer,
              { transform: [{ scale: flameAnim }] }
            ]}>
              <Flame 
                size={20} 
                color={getFlameColor()} 
                fill={getFlameColor()}
              />
            </Animated.View>
            <Text style={styles.streakCount}>{currentStreak}</Text>
          </View>
        </View>
        
        <View style={styles.calAiStreakCard}>
          <View style={styles.calAiDaysContainer}>
            {streakHistory.map((dayData, index) => {
              return (
                <View key={index} style={[
                  styles.calAiDay,
                  dayData.isFuture && styles.calAiFutureDay
                ]}>
                  <View style={[
                    styles.calAiDayCircle,
                    dayData.scanned ? styles.calAiDayScanned : styles.calAiDayEmpty,
                    dayData.isToday && styles.calAiDayToday,
                    dayData.isFuture && styles.calAiFutureDayCircle
                  ]}>
                    <Text style={[
                      styles.calAiDayLetter,
                      dayData.scanned ? styles.calAiDayLetterScanned : styles.calAiDayLetterEmpty,
                      dayData.isToday && styles.calAiDayLetterToday,
                      dayData.isFuture && styles.calAiFutureDayLetter
                    ]}>
                      {getDayLetter(dayData.date)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.calAiDayNumber,
                    dayData.isToday && styles.calAiDayNumberToday,
                    dayData.isFuture && styles.calAiFutureDayNumber
                  ]}>
                    {getDayNumber(dayData.date)}
                  </Text>
                </View>
              );
            })}
          </View>
          
          <TouchableOpacity 
            style={styles.streakDetailsButton}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setStreakCalendarVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.streakDetailsText}>View Details</Text>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Goals Section */}
      <View style={styles.goalsSection}>
        <Text style={styles.sectionTitle}>🎯 Your Goals</Text>
        
        <Animated.View style={{ transform: [{ scale: cardScales[0] }] }}>
          <TouchableOpacity 
            style={styles.goalCard} 
            onPress={() => handleCardPress(0, 'bodyGoal')}
            activeOpacity={0.9}
          >
            <View style={styles.goalContent}>
              <Text style={styles.goalTitle}>Body Goal</Text>
              <Text style={styles.goalProgress}>{getGoalLabel('bodyGoal', profile.goals.bodyGoal)}</Text>
              <View style={styles.goalProgressBar}>
                <View style={[styles.goalProgressFill, { 
                  width: profile.goals.bodyGoal ? "100%" : "0%",
                  backgroundColor: '#4ECDC4' 
                }]} />
              </View>
            </View>
            <View style={styles.goalArrow}>
              <ChevronRight size={20} color={'#D9D9D9'} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: cardScales[1] }] }}>
          <TouchableOpacity 
            style={styles.goalCard} 
            onPress={() => handleCardPress(1, 'healthGoal')}
            activeOpacity={0.9}
          >
            <View style={styles.goalContent}>
              <Text style={styles.goalTitle}>Health Focus</Text>
              <Text style={styles.goalProgress}>{getGoalLabel('healthGoal', profile.goals.healthGoal)}</Text>
              <View style={styles.goalProgressBar}>
                <View style={[styles.goalProgressFill, { 
                  width: profile.goals.healthGoal ? "100%" : "0%", 
                  backgroundColor: '#FF6B81' 
                }]} />
              </View>
            </View>
            <View style={styles.goalArrow}>
              <ChevronRight size={20} color={'#D9D9D9'} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: cardScales[2] }] }}>
          <TouchableOpacity 
            style={styles.goalCard} 
            onPress={() => handleCardPress(2, 'dietGoal')}
            activeOpacity={0.9}
          >
            <View style={styles.goalContent}>
              <Text style={styles.goalTitle}>Diet Preference</Text>
              <Text style={styles.goalProgress}>{getGoalLabel('dietGoal', profile.goals.dietGoal)}</Text>
              <View style={styles.goalProgressBar}>
                <View style={[styles.goalProgressFill, { 
                  width: profile.goals.dietGoal ? "100%" : "0%", 
                  backgroundColor: '#4ECDC4' 
                }]} />
              </View>
            </View>
            <View style={styles.goalArrow}>
              <ChevronRight size={20} color={'#D9D9D9'} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: cardScales[3] }] }}>
          <TouchableOpacity 
            style={styles.goalCard} 
            onPress={() => handleCardPress(3, 'lifeGoal')}
            activeOpacity={0.9}
          >
            <View style={styles.goalContent}>
              <Text style={styles.goalTitle}>Life Goal</Text>
              <Text style={styles.goalProgress}>{getGoalLabel('lifeGoal', profile.goals.lifeGoal)}</Text>
              <View style={styles.goalProgressBar}>
                <View style={[styles.goalProgressFill, { 
                  width: profile.goals.lifeGoal ? "100%" : "0%", 
                  backgroundColor: '#FF6B81' 
                }]} />
              </View>
            </View>
            <View style={styles.goalArrow}>
              <ChevronRight size={20} color={'#D9D9D9'} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Allergens/Preferences Card */}
        <TouchableOpacity 
          style={styles.goalCard} 
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            setAllergensModalVisible(true);
          }}
          activeOpacity={0.9}
        >
          <View style={styles.goalContent}>
            <Text style={styles.goalTitle}>Allergens & Preferences</Text>
            <Text style={styles.goalProgress}>
              {profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0 
                ? `${profile.dietaryRestrictions.length} restriction${profile.dietaryRestrictions.length > 1 ? 's' : ''} set`
                : 'No restrictions set'
              }
            </Text>
            <View style={styles.goalProgressBar}>
              <View style={[styles.goalProgressFill, { 
                width: profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0 ? "100%" : "0%", 
                backgroundColor: '#4ECDC4' 
              }]} />
            </View>
          </View>
          <View style={styles.goalArrow}>
            <ChevronRight size={20} color={'#D9D9D9'} />
          </View>
        </TouchableOpacity>


      </View>
      





      </ScrollView>
      
      {/* Goal Selection Modal */}
      {selectedGoalType && (
        <GoalSelectionModal
          visible={modalVisible}
          onClose={handleModalClose}
          goalType={selectedGoalType}
          currentValue={profile.goals[selectedGoalType] || null}
          currentStrictness={getCurrentStrictness(selectedGoalType)}
          onSelect={handleGoalSelect}
          onSelectStrictness={handleStrictnessSelect}
        />
      )}
      
      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>Settings</Text>
              <TouchableOpacity 
                onPress={() => setSettingsModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingsModalContent}>
              <TouchableOpacity 
                style={styles.settingsModalItem}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setSettingsModalVisible(false);
                  setPersonalDetailsVisible(true);
                }}
              >
                <View style={styles.settingsModalItemLeft}>
                  <UserCircle size={24} color={colors.textPrimary} />
                  <Text style={styles.settingsModalItemText}>Personal Details</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingsModalItem}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setSettingsModalVisible(false);
                  setPrivacyPolicyVisible(true);
                }}
              >
                <View style={styles.settingsModalItemLeft}>
                  <Shield size={24} color={colors.textPrimary} />
                  <Text style={styles.settingsModalItemText}>Privacy Policy</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingsModalItem}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setSettingsModalVisible(false);
                  setTermsOfServiceVisible(true);
                }}
              >
                <View style={styles.settingsModalItemLeft}>
                  <Shield size={24} color={colors.textPrimary} />
                  <Text style={styles.settingsModalItemText}>Terms of Service</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingsModalItem}
                onPress={async () => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  await toggleTheme();
                }}
              >
                <View style={styles.settingsModalItemLeft}>
                  {isDarkMode ? (
                    <Sun size={24} color={colors.textPrimary} />
                  ) : (
                    <Moon size={24} color={colors.textPrimary} />
                  )}
                  <Text style={styles.settingsModalItemText}>
                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                  </Text>
                </View>
                <View style={[
                  styles.themeToggle,
                  isDarkMode && styles.themeToggleActive
                ]}>
                  <View style={[
                    styles.themeToggleThumb,
                    isDarkMode && styles.themeToggleThumbActive
                  ]} />
                </View>
              </TouchableOpacity>
              
              {/* App Version */}
              <View style={[styles.settingsModalItem, styles.versionItem]}>
                <View style={styles.settingsModalItemLeft}>
                  <Text style={styles.versionText}>App Version</Text>
                </View>
                <Text style={styles.versionNumber}>1.0.0</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.settingsModalItem, styles.logoutItem]}
                onPress={async () => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  
                  setSettingsModalVisible(false);
                  
                  try {
                    console.log('[GoalsScreen] Logging out user...');
                    await logout();
                    
                    // Navigate back to quiz after logout
                    console.log('[GoalsScreen] Navigating to quiz after logout');
                    router.replace('/quiz');
                  } catch (error) {
                    console.error('[GoalsScreen] Error during logout:', error);
                    // Still navigate to quiz even if logout fails
                    router.replace('/quiz');
                  }
                }}
              >
                <View style={styles.settingsModalItemLeft}>
                  <LogOut size={24} color={colors.error} />
                  <Text style={[styles.settingsModalItemText, { color: colors.error }]}>Log Out</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Goals Modal */}
      <Modal
        visible={goalsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setGoalsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.goalsModal}>
            <View style={styles.goalsModalHeader}>
              <Text style={styles.goalsModalTitle}>Your Goals</Text>
              <TouchableOpacity 
                onPress={() => setGoalsModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.goalsModalContent}>
              <Animated.View style={{ transform: [{ scale: cardScales[0] }] }}>
                <TouchableOpacity 
                  style={styles.goalCard} 
                  onPress={() => {
                    setGoalsModalVisible(false);
                    handleCardPress(0, 'bodyGoal');
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.goalContent}>
                    <Text style={styles.goalTitle}>Body Goal</Text>
                    <Text style={styles.goalProgress}>{getGoalLabel('bodyGoal', profile.goals.bodyGoal)}</Text>
                    <View style={styles.goalProgressBar}>
                      <View style={[styles.goalProgressFill, { 
                        width: profile.goals.bodyGoal ? "100%" : "0%",
                        backgroundColor: colors.primary 
                      }]} />
                    </View>
                  </View>
                  <View style={styles.goalArrow}>
                    <ChevronRight size={20} color={'#D9D9D9'} />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={{ transform: [{ scale: cardScales[1] }] }}>
                <TouchableOpacity 
                  style={styles.goalCard} 
                  onPress={() => {
                    setGoalsModalVisible(false);
                    handleCardPress(1, 'healthGoal');
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.goalContent}>
                    <Text style={styles.goalTitle}>Health Focus</Text>
                    <Text style={styles.goalProgress}>{getGoalLabel('healthGoal', profile.goals.healthGoal)}</Text>
                    <View style={styles.goalProgressBar}>
                      <View style={[styles.goalProgressFill, { 
                        width: profile.goals.healthGoal ? "100%" : "0%", 
                        backgroundColor: colors.info 
                      }]} />
                    </View>
                  </View>
                  <View style={styles.goalArrow}>
                    <ChevronRight size={20} color={'#D9D9D9'} />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={{ transform: [{ scale: cardScales[2] }] }}>
                <TouchableOpacity 
                  style={styles.goalCard} 
                  onPress={() => {
                    setGoalsModalVisible(false);
                    handleCardPress(2, 'dietGoal');
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.goalContent}>
                    <Text style={styles.goalTitle}>Diet Preference</Text>
                    <Text style={styles.goalProgress}>{getGoalLabel('dietGoal', profile.goals.dietGoal)}</Text>
                    <View style={styles.goalProgressBar}>
                      <View style={[styles.goalProgressFill, { 
                        width: profile.goals.dietGoal ? "100%" : "0%", 
                        backgroundColor: colors.warning 
                      }]} />
                    </View>
                  </View>
                  <View style={styles.goalArrow}>
                    <ChevronRight size={20} color={'#D9D9D9'} />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={{ transform: [{ scale: cardScales[3] }] }}>
                <TouchableOpacity 
                  style={styles.goalCard} 
                  onPress={() => {
                    setGoalsModalVisible(false);
                    handleCardPress(3, 'lifeGoal');
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.goalContent}>
                    <Text style={styles.goalTitle}>Life Goal</Text>
                    <Text style={styles.goalProgress}>{getGoalLabel('lifeGoal', profile.goals.lifeGoal)}</Text>
                    <View style={styles.goalProgressBar}>
                      <View style={[styles.goalProgressFill, { 
                        width: profile.goals.lifeGoal ? "100%" : "0%", 
                        backgroundColor: colors.success 
                      }]} />
                    </View>
                  </View>
                  <View style={styles.goalArrow}>
                    <ChevronRight size={20} color={'#D9D9D9'} />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Allergens/Preferences Card */}
              <TouchableOpacity 
                style={styles.goalCard} 
                onPress={() => {
                  setGoalsModalVisible(false);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setAllergensModalVisible(true);
                }}
                activeOpacity={0.9}
              >
                <View style={styles.goalContent}>
                  <Text style={styles.goalTitle}>Allergens & Preferences</Text>
                  <Text style={styles.goalProgress}>
                    {profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0 
                      ? `${profile.dietaryRestrictions.length} restriction${profile.dietaryRestrictions.length > 1 ? 's' : ''} set`
                      : 'No restrictions set'
                    }
                  </Text>
                  <View style={styles.goalProgressBar}>
                    <View style={[styles.goalProgressFill, { 
                      width: profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0 ? "100%" : "0%", 
                      backgroundColor: colors.error 
                    }]} />
                  </View>
                </View>
                <View style={styles.goalArrow}>
                  <ChevronRight size={20} color={'#D9D9D9'} />
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Streak Calendar Modal */}
      <Modal
        visible={streakCalendarVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStreakCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.streakModal}>
            <View style={styles.streakModalHeader}>
              <View style={styles.streakModalTitleContainer}>
                <Flame size={24} color={getFlameColor()} fill={getFlameColor()} />
                <Text style={styles.streakModalTitle}>Streak History</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setStreakCalendarVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.streakModalContent}>
              <View style={styles.streakStats}>
                <View style={styles.streakStat}>
                  <Text style={styles.streakStatNumber}>{currentStreak}</Text>
                  <Text style={styles.streakStatLabel}>Current</Text>
                </View>
                <View style={styles.streakStat}>
                  <Text style={styles.streakStatNumber}>{longestStreak}</Text>
                  <Text style={styles.streakStatLabel}>Best Ever</Text>
                </View>
                <View style={styles.streakStat}>
                  <Text style={styles.streakStatNumber}>{history.length}</Text>
                  <Text style={styles.streakStatLabel}>Total Scans</Text>
                </View>
              </View>
              
              <Text style={styles.calendarTitle}>7-Day Calendar</Text>
              <View style={styles.calendar}>
                {streakHistory.map((dayData, index) => renderCalendarDay(dayData, index))}
              </View>
              
              <View style={styles.streakTips}>
                <Text style={styles.streakTipsTitle}>💡 Keep Your Streak Alive!</Text>
                <Text style={styles.streakTipsText}>
                  Scan at least one food item daily to maintain your streak. The flame grows brighter as your streak gets longer!
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Personal Details Modal */}
      <Modal
        visible={personalDetailsVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setPersonalDetailsVisible(false)}
      >
        <SafeAreaView style={styles.personalDetailsScreen}>
          {/* Header */}
          <View style={styles.personalDetailsScreenHeader}>
            <TouchableOpacity 
              onPress={() => setPersonalDetailsVisible(false)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.personalDetailsScreenTitle}>Personal Details</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <ScrollView style={styles.personalDetailsScreenContent}>
            {/* Profile Section */}
            <View style={styles.profileCard}>
              <View style={styles.profileAvatarContainer}>
                <TouchableOpacity 
                  style={styles.profileAvatar}
                  onPress={async () => {
                    if (Platform.OS !== 'web') {
                      try {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (hapticError) {
                        console.log('Haptics not available:', hapticError);
                      }
                    }
                    setIsPickingImage(true);
                    
                    try {
                      // Request media library permissions
                      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (status !== 'granted') {
                        Alert.alert(
                          'Permission Required',
                          'We need access to your photo library to select a profile picture.',
                          [{ text: 'OK' }]
                        );
                        setIsPickingImage(false);
                        return;
                      }

                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        aspect: [1, 1], // Square aspect ratio for profile pictures
                        quality: 0.8,
                        base64: false,
                      });

                      if (!result.canceled && result.assets?.[0]?.uri) {
                        const imageUri = result.assets[0].uri;
                        await updateProfile({ profilePictureUri: imageUri });
                        
                        if (Platform.OS !== 'web') {
                          try {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          } catch (hapticError) {
                            console.log('Haptics not available:', hapticError);
                          }
                        }
                      }
                    } catch (error) {
                      console.error('Error picking profile image:', error);
                      Alert.alert(
                        'Error',
                        'Failed to select profile picture. Please try again.',
                        [{ text: 'OK' }]
                      );
                    } finally {
                      setIsPickingImage(false);
                    }
                  }}
                  disabled={isPickingImage}
                >
                  {profile.profilePictureUri ? (
                    <Image 
                      source={{ uri: profile.profilePictureUri }}
                      style={styles.profileAvatarImage}
                      contentFit="cover"
                    />
                  ) : (
                    <User size={32} color={colors.white} />
                  )}
                  <View style={styles.profileAvatarOverlay}>
                    <Camera size={16} color={colors.white} />
                  </View>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.profileNameButton}
                onPress={() => {
                  setTempName(profile.name || '');
                  setEditingName(true);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Text style={styles.profileNameText}>
                  {profile.name ? profile.name : 'Tap to set your name'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Input Fields */}
            <View style={styles.inputSection}>
              <View style={styles.inputField} testID="nameField">
                <View style={styles.inputIconContainer}>
                  <User size={20} color={colors.textSecondary} />
                </View>
                {editingName ? (
                  <TextInput
                    style={styles.textInput}
                    value={tempName}
                    onChangeText={setTempName}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={async () => {
                      if (tempName.trim()) {
                        await updateProfile({ name: tempName.trim() });
                        setEditingName(false);
                        if (Platform.OS !== 'web') {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                      } else {
                        Alert.alert('Error', 'Name cannot be empty');
                      }
                    }}
                  />
                ) : (
                  <TouchableOpacity 
                    style={styles.textInputTouchable}
                    onPress={() => {
                      setTempName(profile.name || '');
                      setEditingName(true);
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  >
                    <Text style={styles.textInputText}>
                      {profile.name || 'Enter your name'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.inputField} testID="emailField">
                <View style={styles.inputIconContainer}>
                  <Text style={styles.inputIcon}>✉️</Text>
                </View>
                <View style={styles.textInputTouchable}>
                  <Text style={[styles.textInputText, !profile.email && styles.placeholderText]}>
                    {profile.email || 'Email not set'}
                  </Text>
                </View>
              </View>

              {/* Biometrics & Activity */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Biometrics & Activity</Text>
              </View>

              <View style={styles.inputField} testID="heightField">
                <View style={styles.inputIconContainer}>
                  <Text style={styles.inputIcon}>📏</Text>
                </View>
                <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    keyboardType="numeric"
                    placeholder="Ft"
                    placeholderTextColor={colors.textSecondary}
                    value={heightFeet}
                    onChangeText={setHeightFeet}
                    onBlur={async () => {
                      const f = heightFeet.trim();
                      const i = heightInches.trim();
                      if ((f && isNaN(Number(f))) || (i && isNaN(Number(i)))) {
                        Alert.alert('Invalid height', 'Use numbers for feet and inches.');
                        return;
                      }
                      const feetNum = f ? Number(f) : 0;
                      const inchesNum = i ? Number(i) : 0;
                      const totalInches = feetNum * 12 + inchesNum;
                      const cm = totalInches > 0 ? Math.round(totalInches * 2.54) : null;
                      await updateProfile({ heightCm: cm });
                    }}
                    testID="heightFeetInput"
                  />
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    keyboardType="numeric"
                    placeholder="In"
                    placeholderTextColor={colors.textSecondary}
                    value={heightInches}
                    onChangeText={setHeightInches}
                    onBlur={async () => {
                      const f = heightFeet.trim();
                      const i = heightInches.trim();
                      if ((f && isNaN(Number(f))) || (i && isNaN(Number(i)))) {
                        Alert.alert('Invalid height', 'Use numbers for feet and inches.');
                        return;
                      }
                      const feetNum = f ? Number(f) : 0;
                      const inchesNum = i ? Number(i) : 0;
                      const totalInches = feetNum * 12 + inchesNum;
                      const cm = totalInches > 0 ? Math.round(totalInches * 2.54) : null;
                      await updateProfile({ heightCm: cm });
                    }}
                    testID="heightInchesInput"
                  />
                </View>
              </View>

              <View style={styles.inputField} testID="weightField">
                <View style={styles.inputIconContainer}>
                  <Text style={styles.inputIcon}>⚖️</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="Weight (lb)"
                  placeholderTextColor={colors.textSecondary}
                  value={weightLb}
                  onChangeText={setWeightLb}
                  onBlur={async () => {
                    const v = weightLb.trim();
                    if (v && isNaN(Number(v))) {
                      Alert.alert('Invalid weight', 'Please enter a valid number in lb.');
                      return;
                    }
                    const lb = v ? Number(v) : 0;
                    const kg = lb > 0 ? Math.round((lb / 2.2046226218) * 10) / 10 : null;
                    await updateProfile({ weightKg: kg });
                  }}
                  testID="weightLbInput"
                />
              </View>

              <View style={styles.chipsRow} testID="sexChips">
                {(['male','female','other'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, sex === s && styles.chipActive]}
                    onPress={async () => {
                      setSex(s);
                      await updateProfile({ sex: s });
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, sex === s && styles.chipTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Activity Level</Text>
              </View>
              <View style={styles.activityList} testID="activityLevelOptions">
                {([
                  { key: 'inactive', label: 'Inactive' },
                  { key: 'lightly-active', label: 'Lightly Active' },
                  { key: 'moderately-active', label: 'Moderately Active' },
                  { key: 'very-active', label: 'Very Active' },
                  { key: 'extra-active', label: 'Extra Active' },
                ] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.activityItem, activityLevel === opt.key && styles.activityItemActive]}
                    onPress={async () => {
                      setActivityLevel(opt.key);
                      await updateProfile({ activityLevel: opt.key });
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.radioOuter, activityLevel === opt.key && styles.radioOuterActive]}>
                      {activityLevel === opt.key && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.activityLabel, activityLevel === opt.key && styles.activityLabelActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Stats Section */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Total Scans</Text>
              <Text style={styles.statsNumber}>{history.length}</Text>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.saveButton}
                testID="saveBiometricsButton"
                onPress={async () => {
                  const f = heightFeet.trim();
                  const i = heightInches.trim();
                  const w = weightLb.trim();
                  if ((f && isNaN(Number(f))) || (i && isNaN(Number(i))) || (w && isNaN(Number(w)))) {
                    Alert.alert('Invalid values', 'Use numbers for feet, inches, and pounds.');
                    return;
                  }
                  const feetNum = f ? Number(f) : 0;
                  const inchesNum = i ? Number(i) : 0;
                  const totalInches = feetNum * 12 + inchesNum;
                  const cm = totalInches > 0 ? Math.round(totalInches * 2.54) : null;
                  const lb = w ? Number(w) : 0;
                  const kg = lb > 0 ? Math.round((lb / 2.2046226218) * 10) / 10 : null;
                  await updateProfile({
                    name: editingName && tempName.trim() ? tempName.trim() : profile.name,
                    heightCm: cm,
                    weightKg: kg,
                    sex: sex ?? null,
                    activityLevel: activityLevel ?? null,
                  });
                  setEditingName(false);
                  if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                  Alert.alert('Saved', 'Your details were updated.');
                }}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
              {editingName && (
                <TouchableOpacity
                  style={styles.cancelActionButton}
                  onPress={() => {
                    setTempName(profile.name || '');
                    setEditingName(false);
                  }}
                >
                  <Text style={styles.cancelActionButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Privacy Policy Modal */}
      <Modal
        visible={privacyPolicyVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setPrivacyPolicyVisible(false)}
      >
        <SafeAreaView style={styles.privacyPolicyScreen}>
          {/* Header */}
          <View style={styles.privacyPolicyScreenHeader}>
            <TouchableOpacity 
              onPress={() => setPrivacyPolicyVisible(false)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.privacyPolicyScreenTitle}>Privacy Policy</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <ScrollView style={styles.privacyPolicyContent}>
            <View style={styles.privacyPolicyCard}>
              <Text style={styles.privacyPolicyTitle}>Privacy Policy</Text>
              <Text style={styles.privacyPolicyDate}>Effective Date: 08/28/2025</Text>
              
              <Text style={styles.privacyPolicyText}>
                At InIt AI, we respect your privacy. This policy explains how we handle your information when you use our app.
              </Text>
              
              <Text style={styles.privacyPolicySectionTitle}>Information We Collect</Text>
              <Text style={styles.privacyPolicyText}>
                • Information you provide (like your name, email, and nutrition goals).{"\n"}
                • Data from product scans, searches, and AI interactions.{"\n"}
                • Basic device information (such as device type, operating system, and usage data).{"\n"}
                • Nutrition data from third-party sources (like Open Food Facts).
              </Text>
              
              <Text style={styles.privacyPolicySectionTitle}>How We Use Your Information</Text>
              <Text style={styles.privacyPolicyText}>
                We use your data to:{"\n"}
                • Personalize food insights and recommendations.{"\n"}
                • Improve app performance and user experience.{"\n"}
                • Process subscriptions and manage your account.{"\n"}
                • Communicate important updates or changes to the service.
              </Text>
              
              <Text style={styles.privacyPolicySectionTitle}>How We Share Information</Text>
              <Text style={styles.privacyPolicyText}>
                We do not sell your data. We only share information with:{"\n"}
                • Service providers (such as payment processors and hosting services).{"\n"}
                • When required by law.{"\n"}
                • In the case of a business transfer (like a merger or acquisition).
              </Text>
              
              <Text style={styles.privacyPolicySectionTitle}>Data Security</Text>
              <Text style={styles.privacyPolicyText}>
                We use industry-standard measures to protect your information. However, no system is completely secure.
              </Text>
              
              <Text style={styles.privacyPolicySectionTitle}>Your Rights</Text>
              <Text style={styles.privacyPolicyText}>
                You may request access, correction, or deletion of your data by contacting us at [Insert Support Email].
              </Text>
              
              <Text style={styles.privacyPolicySectionTitle}>Children's Privacy</Text>
              <Text style={styles.privacyPolicyText}>
                InIt AI is not intended for children under 13, and we do not knowingly collect data from them.
              </Text>
              
              <Text style={styles.privacyPolicySectionTitle}>Changes to This Policy</Text>
              <Text style={styles.privacyPolicyText}>
                We may update this policy from time to time. If changes are made, we will notify you within the app.
              </Text>
              
              <Text style={styles.privacyPolicySectionTitle}>Contact Us</Text>
              <Text style={styles.privacyPolicyText}>
                If you have questions about this Privacy Policy, contact us at:{"\n"}
                Email: Support@initat.app
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Terms of Service Modal */}
      <Modal
        visible={termsOfServiceVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setTermsOfServiceVisible(false)}
      >
        <SafeAreaView style={styles.termsOfServiceScreen}>
          {/* Header */}
          <View style={styles.termsOfServiceScreenHeader}>
            <TouchableOpacity 
              onPress={() => setTermsOfServiceVisible(false)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.termsOfServiceScreenTitle}>Terms of Service</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <ScrollView style={styles.termsOfServiceContent}>
            <View style={styles.termsOfServiceCard}>
              <Text style={styles.termsOfServiceTitle}>Terms of Service</Text>
              <Text style={styles.termsOfServiceDate}>Effective Date: 8/28/2025</Text>
              
              <Text style={styles.termsOfServiceText}>
                Welcome to InIt AI. By using our app, you agree to the following terms:
              </Text>
              
              <Text style={styles.termsOfServiceSectionTitle}>1. Use of the App</Text>
              <Text style={styles.termsOfServiceText}>
                • InIt AI provides nutrition insights, product scans, and recommendations.{"\n"}
                • You may only use the app for personal, non-commercial purposes.{"\n"}
                • You are responsible for maintaining the confidentiality of your account.
              </Text>
              
              <Text style={styles.termsOfServiceSectionTitle}>2. No Medical Advice</Text>
              <Text style={styles.termsOfServiceText}>
                • InIt AI is a nutrition and lifestyle tool, not a medical service.{"\n"}
                • The app does not provide medical advice, diagnosis, or treatment.{"\n"}
                • Always consult a qualified healthcare provider for medical concerns.
              </Text>
              
              <Text style={styles.termsOfServiceSectionTitle}>3. Subscriptions & Payments</Text>
              <Text style={styles.termsOfServiceText}>
                • The app offers a free trial period, followed by a subscription.{"\n"}
                • By subscribing, you authorize recurring charges until you cancel.{"\n"}
                • Subscriptions are billed through your app store account.{"\n"}
                • Refunds are subject to the policies of the app store (Apple App Store / Google Play).
              </Text>
              
              <Text style={styles.termsOfServiceSectionTitle}>4. User Content</Text>
              <Text style={styles.termsOfServiceText}>
                • You may input information such as goals, preferences, or dietary restrictions.{"\n"}
                • You retain ownership of your data, but grant InIt AI a license to process it for app functionality.
              </Text>
              
              <Text style={styles.termsOfServiceSectionTitle}>5. Acceptable Use</Text>
              <Text style={styles.termsOfServiceText}>
                You agree not to:{"\n"}
                • Misuse, copy, or resell the app.{"\n"}
                • Attempt to reverse-engineer or tamper with the software.{"\n"}
                • Use the app in a way that violates applicable laws.
              </Text>
              
              <Text style={styles.termsOfServiceSectionTitle}>6. Disclaimer of Warranties</Text>
              <Text style={styles.termsOfServiceText}>
                • The app is provided "as is" without warranties of any kind.{"\n"}
                • We do not guarantee accuracy, completeness, or specific results from recommendations.
              </Text>
              
              <Text style={styles.termsOfServiceSectionTitle}>7. Limitation of Liability</Text>
              <Text style={styles.termsOfServiceText}>
                To the maximum extent permitted by law, InIt AI is not liable for any damages, including health outcomes, lost profits, or data issues, resulting from use of the app.
              </Text>
              
              <Text style={styles.termsOfServiceSectionTitle}>8. Termination</Text>
              <Text style={styles.termsOfServiceText}>
                • We may suspend or terminate accounts that violate these Terms.{"\n"}
                • You may stop using the app at any time by deleting your account.
              </Text>
              
              <Text style={styles.termsOfServiceSectionTitle}>9. Changes to the Terms</Text>
              <Text style={styles.termsOfServiceText}>
                • We may update these Terms from time to time.{"\n"}
                • Continued use of the app after updates means you accept the revised Terms.
              </Text>
              
              <Text style={styles.termsOfServiceSectionTitle}>10. Contact Us</Text>
              <Text style={styles.termsOfServiceText}>
                For questions about these Terms, contact us at:{"\n"}
                Email: support@initai.app
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Allergens/Preferences Modal */}
      <Modal
        visible={allergensModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setAllergensModalVisible(false)}
      >
        <SafeAreaView style={styles.allergensScreen}>
          {/* Header */}
          <View style={styles.allergensScreenHeader}>
            <TouchableOpacity 
              onPress={() => setAllergensModalVisible(false)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.allergensScreenTitle}>Allergens & Preferences</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <ScrollView style={styles.allergensScreenContent}>
            <View style={styles.allergensCard}>
              <Text style={styles.allergensTitle}>Dietary Restrictions</Text>
              <Text style={styles.allergensSubtitle}>
                Add any allergens, intolerances, or dietary preferences you want to avoid. We'll warn you when scanning products that contain these ingredients.
              </Text>
              
              {/* Add New Allergen */}
              <View style={styles.addAllergenSection}>
                <View style={styles.addAllergenInputContainer}>
                  <TextInput
                    style={styles.addAllergenInput}
                    value={newAllergen}
                    onChangeText={setNewAllergen}
                    placeholder="e.g., peanuts, gluten, seed oils"
                    placeholderTextColor={colors.textSecondary}
                    onSubmitEditing={() => {
                      if (newAllergen.trim()) {
                        const currentRestrictions = profile.dietaryRestrictions || [];
                        const newRestrictions = [...currentRestrictions, newAllergen.trim()];
                        updateProfile({ dietaryRestrictions: newRestrictions });
                        setNewAllergen('');
                        if (Platform.OS !== 'web') {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.addAllergenButton}
                    onPress={() => {
                      if (newAllergen.trim()) {
                        const currentRestrictions = profile.dietaryRestrictions || [];
                        const newRestrictions = [...currentRestrictions, newAllergen.trim()];
                        updateProfile({ dietaryRestrictions: newRestrictions });
                        setNewAllergen('');
                        if (Platform.OS !== 'web') {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                      }
                    }}
                  >
                    <Plus size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Current Restrictions */}
              {profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0 && (
                <View style={styles.currentRestrictionsSection}>
                  <Text style={styles.currentRestrictionsTitle}>Current Restrictions:</Text>
                  <View style={styles.restrictionsList}>
                    {profile.dietaryRestrictions.map((restriction, index) => (
                      <View key={index} style={styles.restrictionChip}>
                        <Text style={styles.restrictionChipText}>{restriction}</Text>
                        <TouchableOpacity
                          style={styles.removeRestrictionButton}
                          onPress={() => {
                            const newRestrictions = profile.dietaryRestrictions?.filter((_, i) => i !== index) || [];
                            updateProfile({ dietaryRestrictions: newRestrictions });
                            if (Platform.OS !== 'web') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                          }}
                        >
                          <X size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Common Allergens Quick Add */}
              <View style={styles.commonAllergensSection}>
                <Text style={styles.commonAllergensTitle}>Common Allergens:</Text>
                <View style={styles.commonAllergensList}>
                  {['Peanuts', 'Tree Nuts', 'Dairy', 'Eggs', 'Soy', 'Wheat/Gluten', 'Fish', 'Shellfish', 'Seed Oils', 'Artificial Sweeteners'].map((allergen) => {
                    const allergenLower = allergen.toLowerCase();
                    const currentRestrictions = profile.dietaryRestrictions || [];
                    const isSeedOils = allergenLower === 'seed oils';

                    const seedOilsPresent = isSeedOils
                      ? seedOilTerms.some(t => currentRestrictions.includes(t))
                      : false;

                    const isAdded = isSeedOils
                      ? seedOilsPresent
                      : currentRestrictions.includes(allergenLower);

                    return (
                      <TouchableOpacity
                        key={allergen}
                        style={[styles.commonAllergenChip, isAdded && styles.commonAllergenChipAdded]}
                        onPress={() => {
                          const existing = profile.dietaryRestrictions || [];

                          if (isSeedOils) {
                            // Toggle all seed oil terms as a group
                            const anyPresent = seedOilTerms.some(t => existing.includes(t));
                            let next: string[];
                            if (anyPresent) {
                              next = existing.filter(r => !seedOilTerms.includes(r));
                            } else {
                              const merged = new Set([...existing, ...seedOilTerms]);
                              next = Array.from(merged);
                            }
                            updateProfile({ dietaryRestrictions: next });
                          } else {
                            if (existing.includes(allergenLower)) {
                              const next = existing.filter(r => r !== allergenLower);
                              updateProfile({ dietaryRestrictions: next });
                            } else {
                              const next = [...existing, allergenLower];
                              updateProfile({ dietaryRestrictions: next });
                            }
                          }

                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                        }}
                      >
                        <Text style={[styles.commonAllergenChipText, isAdded && styles.commonAllergenChipTextAdded]}>
                          {allergen}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gradientBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrollContent: { paddingBottom: 40 },
  brandingHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  brandingText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  
  // Hero Profile Card
  heroCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#4ECDC4', // Neon Turquoise outline
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: colors.surface,
    opacity: 0.8,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  heroAvatarContainer: {
    marginRight: 20,
  },
  heroAvatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  heroAvatarInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4ECDC4', // Neon Turquoise
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  heroAvatarOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4ECDC4', // Neon Turquoise
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDFDFD', // Cream White
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  heroSettingsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  
  // Profile Banner (legacy - keeping for compatibility)
  profileBanner: {
    backgroundColor: colors.surface,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    position: 'relative',
  },
  gradientUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  avatarInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  userLevel: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
  },
  
  // XP Progress Section
  xpSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  xpCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  xpHeader: {
    marginBottom: 20,
  },
  xpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  xpNextLevel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  // Weekly Highlight Section
  highlightSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  highlightCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  highlightIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 64, 64, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  highlightStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  highlightStat: {
    alignItems: 'center',
    flex: 1,
  },
  highlightStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  highlightStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  highlightStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Level Section (legacy - keeping for compatibility)
  levelSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  levelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  levelTextContainer: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  levelSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  xpProgressContainer: {
    alignItems: 'center',
  },
  xpProgressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: colors.textTertiary + '40',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  xpProgressFill: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: 'transparent',
    borderTopColor: colors.primary,
    borderRightColor: colors.primary,
  },
  xpProgressCenter: {
    alignItems: 'center',
  },
  xpText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  xpMaxText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -2,
  },
  xpLabel: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  
  // Weekly Highlight
  weeklyHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  highlightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
  },
  // Goals Section
  goalsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: '#FF6B81', // Retro Pink for section titles
    marginBottom: 20,
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#2E294E', // Deep Indigo outline
  },
  goalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  bodyGoalIcon: {
    backgroundColor: '#4ECDC415', // Neon Turquoise with transparency
  },
  healthGoalIcon: {
    backgroundColor: '#FF6B8115', // Retro Pink with transparency
  },
  dietGoalIcon: {
    backgroundColor: '#2E294E15', // Deep Indigo with transparency
  },
  lifeGoalIcon: {
    backgroundColor: '#4ECDC415', // Neon Turquoise with transparency
  },
  allergensGoalIcon: {
    backgroundColor: '#FF6B8115', // Retro Pink with transparency
  },
  iconPulse: {
    // Animation container for pulsing icons
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  goalProgress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
    fontWeight: '500',
  },
  goalProgressBar: {
    height: 6,
    backgroundColor: colors.textSecondary + '40',
    borderRadius: 3,
  },
  goalProgressFill: {
    height: "100%",
    backgroundColor: '#4ECDC4', // Neon Turquoise
    borderRadius: 3,
  },
  goalArrow: {
    marginLeft: 12,
  },
  settingsSection: {
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 32,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.textTertiary + '30',
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  
  // Settings Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  settingsModal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  settingsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.textTertiary + '30',
  },
  settingsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  settingsModalContent: {
    paddingVertical: 8,
  },
  settingsModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  settingsModalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsModalItemText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 16,
    fontWeight: '500',
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: colors.textTertiary + '30',
    marginTop: 8,
  },
  logoutText: {
    color: colors.error,
  },
  
  // Version Item Styles
  versionItem: {
    borderTopWidth: 1,
    borderTopColor: colors.textTertiary + '30',
    marginTop: 8,
    paddingVertical: 12,
  },
  versionText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  versionNumber: {
    fontSize: 16,
    color: colors.textTertiary,
    fontWeight: '400',
  },
  
  // Goals Modal
  goalsModal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  goalsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.textTertiary + '30',
  },
  goalsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  goalsModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  
  // Cal AI Style Streak Tracker Styles
  streakSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  streakTitleContainer: {
    flex: 1,
  },
  streakCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#4ECDC4', // Neon Turquoise
  },
  flameIconContainer: {
    marginRight: 6,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  calAiStreakCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#4ECDC4', // Neon Turquoise outline
  },
  calAiDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calAiDay: {
    alignItems: 'center',
    flex: 1,
  },
  calAiDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  calAiDayEmpty: {
    backgroundColor: 'transparent',
    borderColor: colors.textTertiary + '60',
  },
  calAiDayScanned: {
    backgroundColor: '#FF6B6B', // Light red fill for scanned days
    borderColor: '#FF6B6B',
    borderStyle: 'solid',
  },
  calAiDayToday: {
    borderColor: colors.primary,
    borderWidth: 3,
    borderStyle: 'solid',
  },
  calAiDayLetter: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  calAiDayLetterEmpty: {
    color: colors.textTertiary,
  },
  calAiDayLetterScanned: {
    color: colors.white,
  },
  calAiDayLetterToday: {
    color: colors.primary,
  },
  calAiDayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  calAiDayNumberToday: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  // Future day styles for blurred effect
  calAiFutureDay: {
    opacity: 0.5,
  },
  calAiFutureDayCircle: {
    backgroundColor: 'transparent',
    borderColor: colors.textTertiary + '40',
    borderStyle: 'dashed',
  },
  calAiFutureDayLetter: {
    color: colors.textTertiary + '80',
  },
  calAiFutureDayNumber: {
    color: colors.textTertiary + '80',
    opacity: 0.7,
  },
  streakDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 12,
    gap: 4,
  },
  streakDetailsText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  
  // Legacy streak styles (keeping for modal compatibility)
  streakCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  streakMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakBadgeContainer: {
    marginTop: 8,
  },
  streakBestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  streakCalendarPreview: {
    alignItems: 'center',
  },
  streakCalendarDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  streakDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  streakDotActive: {
    backgroundColor: colors.success,
  },
  streakDotInactive: {
    backgroundColor: colors.textTertiary + '60',
  },
  streakViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flameContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 69, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  streakInfo: {
    flex: 1,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    lineHeight: 32,
  },
  streakLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: -2,
  },
  streakBest: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
    marginLeft: 4,
  },
  streakRight: {
    alignItems: 'center',
  },
  streakViewText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  
  // Streak Modal Styles
  streakModal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  streakModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.textTertiary + '30',
  },
  streakModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  streakModalContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  streakStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 12,
  },
  streakStat: {
    alignItems: 'center',
  },
  streakStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  streakStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  calendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  calendarDay: {
    alignItems: 'center',
    flex: 1,
  },
  calendarDayLetter: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  calendarDayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  calendarToday: {
    color: colors.primary,
  },
  calendarFuture: {
    color: colors.textTertiary,
    opacity: 0.5,
  },
  calendarDayIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calendarDayScanned: {
    backgroundColor: colors.success,
  },
  calendarDayMissed: {
    backgroundColor: colors.textTertiary + '60',
  },
  calendarFutureIndicator: {
    backgroundColor: colors.textTertiary + '30',
    opacity: 0.5,
  },
  streakTips: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 12,
    padding: 16,
  },
  streakTipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  streakTipsText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  
  // Personal Details Screen (Full Screen)
  personalDetailsScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  personalDetailsScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.textTertiary + '30',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  personalDetailsScreenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60, // Same width as back button to center title
  },
  personalDetailsScreenContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Profile Section
  profileCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
  },
  profileAvatarContainer: {
    marginBottom: 16,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  profileAvatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileNameButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  profileNameText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  sectionHeaderRow: {
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  // Input Section
  inputSection: {
    paddingHorizontal: 20,
    marginTop: 32,
    gap: 16,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIconContainer: {
    marginRight: 12,
    width: 20,
    alignItems: 'center',
  },
  inputIcon: {
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
    paddingVertical: 0, // Remove default padding
  },
  textInputTouchable: {
    flex: 1,
    paddingVertical: 2,
  },
  textInputText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.white,
  },

  activityList: {
    marginTop: 8,
    gap: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
  },
  activityItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  activityLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  activityLabelActive: {
    color: colors.primary,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
  
  // Stats Section
  statsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statsNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  
  // Action Buttons
  actionButtons: {
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 32,
    gap: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  cancelActionButton: {
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelActionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  
  // Theme Toggle Styles
  themeToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.textTertiary + '60',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  themeToggleActive: {
    backgroundColor: colors.primary,
  },
  themeToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  themeToggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  
  // Privacy Policy Screen Styles
  privacyPolicyScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  privacyPolicyScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.textTertiary + '30',
  },
  privacyPolicyScreenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  privacyPolicyContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  privacyPolicyCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
  },
  privacyPolicyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  privacyPolicyDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  privacyPolicySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  privacyPolicyText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  
  // Terms of Service Screen Styles
  termsOfServiceScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  termsOfServiceScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.textTertiary + '30',
  },
  termsOfServiceScreenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  termsOfServiceContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  termsOfServiceCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
  },
  termsOfServiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  termsOfServiceDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  termsOfServiceSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  termsOfServiceText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  
  // Allergens Screen Styles
  allergensScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  allergensScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.textTertiary + '30',
  },
  allergensScreenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  allergensScreenContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  allergensCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
  },
  allergensTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  allergensSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  addAllergenSection: {
    marginBottom: 32,
  },
  addAllergenInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addAllergenInput: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
  },
  addAllergenButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentRestrictionsSection: {
    marginBottom: 32,
  },
  currentRestrictionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  restrictionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  restrictionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '15',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  restrictionChipText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '500',
  },
  removeRestrictionButton: {
    padding: 2,
  },
  commonAllergensSection: {
    marginTop: 8,
  },
  commonAllergensTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  commonAllergensList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  commonAllergenChip: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
  },
  commonAllergenChipAdded: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  commonAllergenChipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  commonAllergenChipTextAdded: {
    color: colors.white,
  },
  
  // Preferences Screen Styles
  preferencesScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  preferencesScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.textTertiary + '30',
  },
  preferencesScreenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  preferencesScreenContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  preferencesCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.textSecondary + '20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
  },
  preferencesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  preferencesSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 32,
    textAlign: 'center',
  },
  strictnessSection: {
    marginBottom: 32,
  },
  strictnessSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  strictnessSectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  strictnessOptions: {
    gap: 12,
  },
  strictnessOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  strictnessOptionSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  strictnessOptionCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strictnessOptionCircleSelected: {
    borderColor: colors.primary,
  },
  strictnessOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  strictnessOptionContent: {
    flex: 1,
  },
  strictnessOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  strictnessOptionTitleSelected: {
    color: colors.primary,
  },
  strictnessOptionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  strictnessOptionDescriptionSelected: {
    color: colors.textSecondary,
  },
});