import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  PanResponder,
  Animated,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { Clock, TrendingUp, Award, AlertCircle, Trash2, Trophy, Target, ShoppingBasket, Settings, BarChart3 } from "lucide-react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useScanHistory, ScanHistoryItem } from "@/contexts/ScanHistoryContext";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";



const getHealthGrade = (score: number): { grade: string; color: string; label: string } => {
  if (score >= 95) return { grade: 'A+', color: '#00FF00', label: 'Excellent' };
  if (score >= 90) return { grade: 'A', color: '#00FF00', label: 'Excellent' };
  if (score >= 86) return { grade: 'A-', color: '#00FF00', label: 'Excellent' };
  if (score >= 83) return { grade: 'B+', color: '#34C759', label: 'Good' };
  if (score >= 79) return { grade: 'B', color: '#34C759', label: 'Good' };
  if (score >= 75) return { grade: 'B-', color: '#34C759', label: 'Good' };
  if (score >= 70) return { grade: 'C+', color: '#FFD60A', label: 'Mediocre' };
  if (score >= 63) return { grade: 'C', color: '#FFD60A', label: 'Mediocre' };
  if (score >= 55) return { grade: 'C-', color: '#FFD60A', label: 'Mediocre' };
  if (score >= 51) return { grade: 'D+', color: '#FF9500', label: 'Bad' };
  if (score >= 46) return { grade: 'D', color: '#FF9500', label: 'Bad' };
  if (score >= 41) return { grade: 'D-', color: '#FF9500', label: 'Bad' };
  return { grade: 'F', color: '#FF3B30', label: 'Be Aware!' };
};

const getGoalAlignmentLabel = (goal: string | null): string => {
  switch (goal) {
    case 'high-protein': return 'High Protein';
    case 'low-sugar': return 'Low Sugar';
    case 'low-fat': return 'Low Fat';
    case 'keto': return 'Keto';
    case 'balanced': return 'Balanced';
    default: return 'Health Focus';
  }
};

const checkGoalAlignment = (item: ScanHistoryItem, healthGoal: string | null): boolean => {
  if (!healthGoal) return false;
  
  switch (healthGoal) {
    case 'high-protein':
      return (item.nutrition.protein || 0) >= 10; // 10g+ protein
    case 'low-sugar':
      return (item.nutrition.sugar || 0) <= 5; // 5g or less sugar
    case 'low-fat':
      return (item.nutrition.fat || 0) <= 3; // 3g or less fat
    case 'keto':
      return (item.nutrition.carbs || 0) <= 5; // 5g or less carbs
    default:
      return getDisplayScore(item) >= 70; // General healthy choice
  }
};

const getDisplayScore = (item: ScanHistoryItem): number => {
  // Use personalized score if available, otherwise fall back to base score
  return item.nutrition.personalScore ?? item.nutrition.healthScore;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return `Today, ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`;
  } else if (diffInHours < 48) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`;
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
};

interface HistoryCardProps {
  item: ScanHistoryItem;
  grade: string;
  color: string;
  label: string;
  onDelete: () => void;
  onPress: () => void;
  index: number;
}

function HistoryCard({ item, grade, color, label, onDelete, onPress, index }: HistoryCardProps) {
  const { colors } = useTheme();
  const [translateX] = useState(new Animated.Value(0));
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const deleteButtonWidth = 80;
  const swipeThreshold = deleteButtonWidth * 0.6;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 50;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx < 0) {
        const clampedDx = Math.max(gestureState.dx, -deleteButtonWidth);
        translateX.setValue(clampedDx);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx < -swipeThreshold) {
        setShowDeleteButton(true);
        Animated.spring(translateX, {
          toValue: -deleteButtonWidth,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      } else {
        setShowDeleteButton(false);
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    },
  });

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDelete();
    });
  };

  return (
    <View style={styles.historyCardContainer}>
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDelete}
          testID={`delete-${item.id}`}
        >
          <Trash2 size={20} color="#FDFDFD" />
          <Text style={[styles.deleteButtonText, { color: '#FDFDFD' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
      
      <Animated.View 
        style={[
          styles.historyCardNoTimeline,
          {
            transform: [{ translateX }],
            backgroundColor: colors.surface,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          onPress={onPress}
          style={styles.cardContent}
          activeOpacity={0.7}
          testID={`history-item-${item.id}`}
        >
          <View style={styles.cardHeader}>
            <Image source={{ uri: item.imageUri }} style={styles.productThumbnail} />
            
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.textPrimary }]}>{item.nutrition.name}</Text>
              <View style={styles.productDetails}>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>{item.nutrition.calories} cal</Text>
                <Text style={[styles.detailSeparator, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>{item.nutrition.protein}g protein</Text>
              </View>
              <View style={styles.timeRow}>
                <Clock size={10} color="#5F5F5F" />
                <Text style={[styles.timeText, { color: colors.textTertiary }]}>{formatDate(item.timestamp)}</Text>
              </View>
            </View>
            
            <View style={styles.scoreRing}>
              <View style={[styles.miniScoreRing, { borderColor: color, backgroundColor: colors.surface }]}>
                <Text style={[styles.miniGradeText, { color }]}>{grade}</Text>
              </View>
            </View>
          </View>
          
          {/* Color bar at bottom */}
          <View style={[styles.colorBar, { backgroundColor: color }]} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function HistoryScreen() {
  const { history, removeFromHistory, clearHistory, isLoading } = useScanHistory();
  const { profile } = useUser();
  const { colors } = useTheme();
  
  // Calculate stats for last 7 days
  const last7Days = useMemo(() => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return history.filter(item => item.timestamp >= sevenDaysAgo);
  }, [history]);
  
  const averageScore = last7Days.length > 0 
    ? Math.round(last7Days.reduce((acc, item) => acc + getDisplayScore(item), 0) / last7Days.length)
    : 0;
    
  const averageGrade = getHealthGrade(averageScore);
  
  // Find top choice of the week
  const topChoice = useMemo(() => {
    if (last7Days.length === 0) return null;
    return last7Days.reduce((best, current) => 
      getDisplayScore(current) > getDisplayScore(best) ? current : best
    );
  }, [last7Days]);
  
  // Calculate goal alignment percentage
  const goalAlignment = useMemo(() => {
    if (last7Days.length === 0) return 0;
    const alignedScans = last7Days.filter(item => checkGoalAlignment(item, profile.goals.healthGoal));
    return Math.round((alignedScans.length / last7Days.length) * 100);
  }, [last7Days, profile.goals.healthGoal]);
  
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.brandingHeader, { backgroundColor: colors.background }]}>
          <Text style={[styles.brandingText, { color: colors.primary }]}>InIt AI</Text>
        </View>
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading scan history...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (history.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.brandingHeader, { backgroundColor: colors.background }]}>
          <Text style={[styles.brandingText, { color: colors.primary }]}>InIt AI</Text>
        </View>
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
          <View style={styles.emptyBasket}>
            <ShoppingBasket size={64} color="#4ECDC4" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No scans yet!</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Start your health journey by scanning your first product
          </Text>
          <TouchableOpacity 
            style={[styles.startScanningButton, { backgroundColor: '#4ECDC4' }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={[styles.startScanningText, { color: '#FDFDFD' }]}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.brandingHeader, { backgroundColor: colors.background }]}>
          <Text style={[styles.brandingText, { color: colors.primary }]}>InIt AI</Text>
        </View>
        
        {/* New Top Stats Section */}
        <View style={styles.newStatsContainer}>
          {/* Avg Score Badge */}
          <View style={[styles.avgScoreBadge, { backgroundColor: colors.surface }]}>
            <View style={styles.ribbonContainer}>
              <View style={[styles.ribbon, { backgroundColor: averageGrade.color }]}>
                <Text style={[styles.ribbonGrade, { color: colors.white }]}>{averageGrade.grade}</Text>
              </View>
              <View style={styles.ribbonTail} />
            </View>
            <Text style={[styles.avgScoreLabel, { color: colors.textSecondary }]}>7-Day Average</Text>
            <Text style={[styles.avgScoreValue, { color: colors.textPrimary }]}>{averageScore}</Text>
          </View>
          
          {/* Top Choice of the Week */}
          <View style={[styles.topChoiceCard, { backgroundColor: colors.surface }]}>
            <View style={styles.topChoiceHeader}>
              <Trophy size={16} color="#4ECDC4" />
              <Text style={[styles.topChoiceTitle, { color: colors.textPrimary }]}>Top Choice</Text>
            </View>
            {topChoice ? (
              <View style={styles.topChoiceContent}>
                <Image source={{ uri: topChoice.imageUri }} style={styles.topChoiceThumbnail} />
                <View style={styles.topChoiceInfo}>
                  <Text style={[styles.topChoiceName, { color: colors.textPrimary }]} numberOfLines={2}>{topChoice.nutrition.name}</Text>
                  <Text style={[styles.topChoiceScore, { color: colors.primary }]}>{getDisplayScore(topChoice)}</Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.topChoicePlaceholder, { color: colors.textSecondary }]}>Make your first scan!</Text>
            )}
          </View>
          
          {/* Goal Alignment */}
          <View style={[styles.goalAlignmentCard, { backgroundColor: colors.surface }]}>
            <View style={styles.goalAlignmentHeader}>
              <Target size={16} color="#4ECDC4" />
              <Text style={[styles.goalAlignmentTitle, { color: colors.textPrimary }]}>Goal Alignment</Text>
            </View>
            <View style={styles.progressRingContainer}>
              <View style={[styles.progressRing, { backgroundColor: colors.textTertiary }]}>
                <View 
                  style={[
                    styles.progressRingFill,
                    {
                      transform: [{ rotate: `${(goalAlignment / 100) * 360}deg` }],
                      backgroundColor: goalAlignment >= 70 ? '#4ECDC4' : goalAlignment >= 40 ? '#FF6B81' : '#2E294E',
                    }
                  ]}
                />
                <View style={[styles.progressRingInner, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.progressPercentage, { color: colors.textPrimary }]}>{goalAlignment}%</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.goalAlignmentLabel, { color: colors.textSecondary }]}>{getGoalAlignmentLabel(profile.goals.healthGoal)}</Text>
          </View>
        </View>

        {/* Recent Scans with Timeline */}
        <View style={styles.historyContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Scans</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/insights')} style={[styles.manageButton, { backgroundColor: '#4ECDC4' + '20' }]}>
                <BarChart3 size={16} color="#4ECDC4" />
                <Text style={[styles.manageButtonText, { color: '#4ECDC4' }]}>View Full Insights</Text>
              </TouchableOpacity>
            )}
          </View>
          

          
          {history.map((item, index) => {
            const displayScore = getDisplayScore(item);
            const { grade, color, label } = getHealthGrade(displayScore);
            return (
              <HistoryCard
                key={item.id}
                item={item}
                grade={grade}
                color={color}
                label={label}
                index={index}
                onDelete={() => removeFromHistory(item.id)}
                onPress={() => router.push(`/nutrition-results?itemId=${item.id}`)}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FDFDFD', // Cream White
  },
  container: {
    flex: 1,
    backgroundColor: '#FDFDFD', // Cream White
  },
  brandingHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FDFDFD', // Cream White
  },
  brandingText: {
    fontSize: 24,
    fontWeight: "bold",
    color: '#1E1E1E', // Charcoal Black
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FDFDFD', // Cream White
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: '#D9D9D9', // Soft Gray
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: '#1E1E1E', // Charcoal Black
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#5F5F5F', // Slate Gray
  },
  historyContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: '#1E1E1E', // Charcoal Black
    marginBottom: 16,
  },
  historyCardContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginLeft: 48,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyCardNoTimeline: {
    backgroundColor: '#FDFDFD', // Cream White
    borderRadius: 12,
    padding: 16,
    shadowColor: '#D9D9D9', // Soft Gray
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  historyInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: Colors.gray500,
  },
  categoryBadge: {
    fontSize: 11,
    color: Colors.gray700,
    backgroundColor: Colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  scoreContainer: {
    alignItems: "center",
  },
  gradeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  gradeText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  scoreText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calorieText: {
    fontSize: 13,
    color: Colors.gray700,
    fontWeight: "500",
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E1E1E', // Charcoal Black
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#5F5F5F', // Slate Gray
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#4ECDC4' + '20', // Neon Turquoise with opacity
  },
  manageButtonText: {
    fontSize: 12,
    color: '#4ECDC4', // Neon Turquoise
    marginLeft: 4,
    fontWeight: '600',
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  nutritionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  nutritionText: {
    fontSize: 12,
    color: Colors.gray600,
  },
  scoreBarContainer: {
    marginTop: 12,
  },
  scoreBar: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  deleteButton: {
    backgroundColor: '#FF6B81', // Retro Pink
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: '90%',
    minHeight: 80,
  },
  deleteButtonText: {
    color: '#FDFDFD', // Cream White
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  cardContent: {
    flex: 1,
  },
  
  // New styles for redesigned history
  newStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  
  // Avg Score Badge styles
  avgScoreBadge: {
    flex: 1,
    backgroundColor: '#FDFDFD', // Cream White
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#D9D9D9', // Soft Gray
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ribbonContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  ribbon: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    position: 'relative',
  },
  ribbonGrade: {
    color: '#FDFDFD', // Cream White
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  ribbonTail: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D9D9D9', // Soft Gray
  },
  avgScoreLabel: {
    fontSize: 12,
    color: '#5F5F5F', // Slate Gray
    marginBottom: 4,
  },
  avgScoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E1E1E', // Charcoal Black
  },
  
  // Top Choice Card styles
  topChoiceCard: {
    flex: 1,
    backgroundColor: '#FDFDFD', // Cream White
    borderRadius: 16,
    padding: 16,
    shadowColor: '#D9D9D9', // Soft Gray
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  topChoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  topChoiceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E1E1E', // Charcoal Black
  },
  topChoiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topChoiceThumbnail: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  topChoiceInfo: {
    flex: 1,
  },
  topChoiceName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1E1E1E', // Charcoal Black
    marginBottom: 2,
  },
  topChoiceScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ECDC4', // Neon Turquoise
  },
  topChoicePlaceholder: {
    fontSize: 11,
    color: '#5F5F5F', // Slate Gray
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Goal Alignment Card styles
  goalAlignmentCard: {
    flex: 1,
    backgroundColor: '#FDFDFD', // Cream White
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#D9D9D9', // Soft Gray
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  goalAlignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  goalAlignmentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E1E1E', // Charcoal Black
  },
  progressRingContainer: {
    marginBottom: 8,
  },
  progressRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D9D9D9', // Soft Gray
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressRingFill: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.8,
  },
  progressRingInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDFDFD', // Cream White
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  progressPercentage: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E1E1E', // Charcoal Black
  },
  goalAlignmentLabel: {
    fontSize: 10,
    color: '#5F5F5F', // Slate Gray
    textAlign: 'center',
  },
  

  
  // New card styles
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1E1E', // Charcoal Black
    marginBottom: 4,
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#5F5F5F', // Slate Gray
  },
  detailSeparator: {
    fontSize: 12,
    color: '#5F5F5F', // Slate Gray
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#5F5F5F', // Slate Gray
  },
  scoreRing: {
    alignItems: 'center',
  },
  miniScoreRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDFDFD', // Cream White
  },
  miniGradeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  colorBar: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 8,
  },
  
  // Empty state styles
  emptyBasket: {
    marginBottom: 16,
  },
  startScanningButton: {
    backgroundColor: '#4ECDC4', // Neon Turquoise
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  startScanningText: {
    color: '#FDFDFD', // Cream White
    fontSize: 16,
    fontWeight: '600',
  },
});