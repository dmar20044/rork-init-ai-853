import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { ArrowLeft, TrendingUp, Award, Target, AlertTriangle, Zap, Calendar, Trash2, Medal, AlertCircle, User, Heart, Utensils } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useScanHistory, ScanHistoryItem } from '@/contexts/ScanHistoryContext';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';

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
      return (item.nutrition.protein || 0) >= 10;
    case 'low-sugar':
      return (item.nutrition.sugar || 0) <= 5;
    case 'low-fat':
      return (item.nutrition.fat || 0) <= 3;
    case 'keto':
      return (item.nutrition.carbs || 0) <= 5;
    default:
      return getDisplayScore(item) >= 70;
  }
};

const getDisplayScore = (item: ScanHistoryItem): number => {
  return item.nutrition.personalScore ?? item.nutrition.healthScore;
};

export default function InsightsScreen() {
  const { history, clearHistory } = useScanHistory();
  const { profile } = useUser();
  const { colors } = useTheme();
  
  const last30Days = useMemo(() => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return history.filter(item => item.timestamp >= thirtyDaysAgo);
  }, [history]);
  
  // Score trends calculation
  const scoreTrends = useMemo(() => {
    const trends7Days = [];
    const trends30Days = [];
    
    // Calculate daily averages for last 7 days (including today)
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const dayScans = history.filter(item => item.timestamp >= dayStart && item.timestamp < dayEnd);
      const avgScore = dayScans.length > 0 
        ? dayScans.reduce((acc, item) => acc + getDisplayScore(item), 0) / dayScans.length
        : 0;
      
      trends7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: Math.round(avgScore),
        scans: dayScans.length
      });
    }
    
    // Calculate weekly averages for last 30 days (4 weeks)
    for (let i = 3; i >= 0; i--) {
      const weekEnd = Date.now() - i * 7 * 24 * 60 * 60 * 1000;
      const weekStart = weekEnd - 7 * 24 * 60 * 60 * 1000;
      
      const weekScans = history.filter(item => item.timestamp >= weekStart && item.timestamp < weekEnd);
      const avgScore = weekScans.length > 0 
        ? weekScans.reduce((acc, item) => acc + getDisplayScore(item), 0) / weekScans.length
        : 0;
      
      trends30Days.push({
        date: `Week ${4 - i}`,
        score: Math.round(avgScore),
        scans: weekScans.length
      });
    }
    
    return { trends7Days, trends30Days };
  }, [history]);
  
  // Best and worst choices
  const bestChoices = useMemo(() => {
    return [...last30Days]
      .sort((a, b) => getDisplayScore(b) - getDisplayScore(a))
      .slice(0, 3);
  }, [last30Days]);
  
  const worstChoices = useMemo(() => {
    return [...last30Days]
      .sort((a, b) => getDisplayScore(a) - getDisplayScore(b))
      .slice(0, 3);
  }, [last30Days]);
  
  // Goal alignment calculations
  const goalAlignments = useMemo(() => {
    if (last30Days.length === 0) return [];
    
    const goals = [
      { key: 'bodyGoal', label: 'Body Goal', value: profile.goals.bodyGoal },
      { key: 'healthGoal', label: getGoalAlignmentLabel(profile.goals.healthGoal), value: profile.goals.healthGoal },
      { key: 'dietGoal', label: 'Diet Preference', value: profile.goals.dietGoal },
    ];
    
    return goals.map(goal => {
      if (!goal.value) return { ...goal, percentage: 0, aligned: 0, total: 0 };
      
      let alignedScans = 0;
      
      if (goal.key === 'healthGoal') {
        alignedScans = last30Days.filter(item => checkGoalAlignment(item, goal.value)).length;
      } else if (goal.key === 'bodyGoal') {
        // For body goals, consider high scores as aligned
        alignedScans = last30Days.filter(item => getDisplayScore(item) >= 70).length;
      } else if (goal.key === 'dietGoal') {
        // For diet goals, consider high scores as aligned
        alignedScans = last30Days.filter(item => getDisplayScore(item) >= 75).length;
      }
      
      const percentage = Math.round((alignedScans / last30Days.length) * 100);
      
      return {
        ...goal,
        percentage,
        aligned: alignedScans,
        total: last30Days.length
      };
    }).filter(goal => goal.value); // Only show goals that are set
  }, [last30Days, profile.goals]);
  
  // Calculate streak info
  const streakInfo = useMemo(() => {
    const scanDates = history.map(item => new Date(item.timestamp).toISOString().split('T')[0]);
    const uniqueDates = [...new Set(scanDates)].sort();
    
    let bestStreak = 0;
    let currentStreak = 0;
    
    if (uniqueDates.length > 0) {
      let tempStreak = 1;
      
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currentDate = new Date(uniqueDates[i]);
        const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
        } else {
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);
      
      // Calculate current streak
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
        currentStreak = 1;
        let checkDate = uniqueDates.includes(today) ? today : yesterday;
        let checkIndex = uniqueDates.indexOf(checkDate);
        
        for (let i = checkIndex - 1; i >= 0; i--) {
          const prevDate = new Date(uniqueDates[i]);
          const currentDate = new Date(uniqueDates[i + 1]);
          const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 1000));
          
          if (daysDiff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }
    
    return { bestStreak, currentStreak };
  }, [history]);
  
  // Calculate score improvement
  const scoreImprovement = useMemo(() => {
    if (scoreTrends.trends7Days.length < 2) return 0;
    
    const firstWeekAvg = scoreTrends.trends7Days.slice(0, 3).reduce((acc, day) => acc + day.score, 0) / 3;
    const lastWeekAvg = scoreTrends.trends7Days.slice(-3).reduce((acc, day) => acc + day.score, 0) / 3;
    
    return Math.round(lastWeekAvg - firstWeekAvg);
  }, [scoreTrends]);
  
  return (
    <View style={[styles.luxuryBackground, { backgroundColor: colors.background }]}>
      {/* Soft gradient overlay */}
      <View style={styles.gradientOverlay} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Insights</Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Gradient Divider */}
        <View style={styles.gradientDivider}>
          <View style={styles.gradientBar} />
        </View>
        
        {/* Score Trends Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Score Trends</Text>
          </View>
          
          {/* Improvement Callout */}
          {scoreImprovement !== 0 && (
            <View style={[styles.calloutCard, { backgroundColor: scoreImprovement > 0 ? Colors.success + '15' : Colors.error + '15' }]}>
              <Zap size={16} color={scoreImprovement > 0 ? Colors.success : Colors.error} />
              <Text style={[styles.calloutText, { color: scoreImprovement > 0 ? Colors.success : Colors.error }]}>
                Your average score {scoreImprovement > 0 ? 'improved' : 'decreased'} {Math.abs(scoreImprovement)} points this week 🚀
              </Text>
            </View>
          )}
          
          {/* Unified Streak Card */}
          <View style={[styles.unifiedStreakCard, { backgroundColor: colors.backgroundTertiary }]}>
            <View style={styles.streakSection}>
              <Calendar size={18} color={colors.primary} />
              <View style={styles.streakContent}>
                <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Current Streak</Text>
                <Text style={[styles.streakValue, { color: colors.textPrimary }]}>{streakInfo.currentStreak} days</Text>
              </View>
            </View>
            <View style={[styles.streakVerticalDivider, { backgroundColor: colors.textTertiary + '40' }]} />
            <View style={styles.streakSection}>
              <Award size={18} color={Colors.warning} />
              <View style={styles.streakContent}>
                <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Best Streak</Text>
                <Text style={[styles.streakValue, { color: colors.textPrimary }]}>{streakInfo.bestStreak} days</Text>
              </View>
            </View>
          </View>
          
          {/* Smooth Gradient Line Chart */}
          <View style={styles.chartContainer}>
            <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Last 7 Days</Text>
            <View style={styles.modernChartArea}>
              <View style={styles.chartGrid}>
                {[100, 75, 50, 25, 0].map((value, index) => (
                  <View key={index} style={[styles.gridLine, { backgroundColor: colors.textTertiary + '20' }]}>
                    <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>{value}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.chartLineContainer}>
                {scoreTrends.trends7Days.map((day, index) => {
                  const nextDay = scoreTrends.trends7Days[index + 1];
                  const hasNext = index < scoreTrends.trends7Days.length - 1;
                  return (
                    <View key={index} style={styles.chartPoint}>
                      <View 
                        style={[
                          styles.chartDot,
                          { 
                            backgroundColor: day.score >= 75 ? '#FF6B6B' : day.score >= 55 ? '#FFB347' : '#FF8A80',
                            transform: [{ translateY: -(day.score * 0.8) }]
                          }
                        ]} 
                      />
                      {hasNext && (
                        <View 
                          style={[
                            styles.chartLine,
                            {
                              height: Math.abs(nextDay.score - day.score) * 0.8,
                              backgroundColor: colors.primary + '60',
                              transform: [
                                { translateY: -(Math.max(day.score, nextDay.score) * 0.8) },
                                { rotate: nextDay.score > day.score ? '-45deg' : '45deg' }
                              ]
                            }
                          ]}
                        />
                      )}
                      <Text style={[styles.modernChartLabel, { color: colors.textSecondary }]}>{day.date}</Text>
                      <Text style={[styles.modernChartScore, { color: colors.textPrimary }]}>{day.score > 0 ? day.score : '-'}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
        
        {/* Best vs Worst Choices - Swipeable Carousels */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Award size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Best vs Worst Choices</Text>
          </View>
          
          {/* Best Choices Carousel */}
          <View style={styles.carouselSection}>
            <View style={styles.carouselHeader}>
              <Medal size={16} color={Colors.warning} />
              <Text style={[styles.carouselTitle, { color: colors.textPrimary }]}>Top Choices</Text>
            </View>
            <FlatList
              data={bestChoices}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContainer}
              renderItem={({ item }) => {
                const { grade, color } = getHealthGrade(getDisplayScore(item));
                return (
                  <View style={[styles.carouselCard, { backgroundColor: colors.backgroundTertiary }]}>
                    <View style={styles.carouselImageContainer}>
                      <Image source={{ uri: item.imageUri }} style={styles.carouselImage} />
                      <View style={[styles.carouselBadge, { backgroundColor: Colors.success }]}>
                        <Text style={styles.carouselBadgeText}>Top Choice</Text>
                      </View>
                    </View>
                    <View style={styles.carouselInfo}>
                      <Text style={[styles.carouselName, { color: colors.textPrimary }]} numberOfLines={2}>{item.nutrition.name}</Text>
                      <View style={styles.carouselScore}>
                        <View style={[styles.carouselGrade, { backgroundColor: color }]}>
                          <Text style={styles.carouselGradeText}>{grade}</Text>
                        </View>
                        <Text style={[styles.carouselScoreText, { color: colors.textSecondary }]}>{getDisplayScore(item)}</Text>
                      </View>
                    </View>
                  </View>
                );
              }}
              keyExtractor={(item) => item.id}
            />
          </View>
          
          {/* Worst Choices Carousel */}
          <View style={styles.carouselSection}>
            <View style={styles.carouselHeader}>
              <AlertCircle size={16} color={Colors.error} />
              <Text style={[styles.carouselTitle, { color: colors.textPrimary }]}>Needs Improvement</Text>
            </View>
            <FlatList
              data={worstChoices}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContainer}
              renderItem={({ item }) => {
                const { grade, color } = getHealthGrade(getDisplayScore(item));
                return (
                  <View style={[styles.carouselCard, { backgroundColor: colors.backgroundTertiary }]}>
                    <View style={styles.carouselImageContainer}>
                      <Image source={{ uri: item.imageUri }} style={styles.carouselImage} />
                      <View style={[styles.carouselBadge, { backgroundColor: Colors.error }]}>
                        <Text style={styles.carouselBadgeText}>Needs Improvement</Text>
                      </View>
                    </View>
                    <View style={styles.carouselInfo}>
                      <Text style={[styles.carouselName, { color: colors.textPrimary }]} numberOfLines={2}>{item.nutrition.name}</Text>
                      <View style={styles.carouselScore}>
                        <View style={[styles.carouselGrade, { backgroundColor: color }]}>
                          <Text style={styles.carouselGradeText}>{grade}</Text>
                        </View>
                        <Text style={[styles.carouselScoreText, { color: colors.textSecondary }]}>{getDisplayScore(item)}</Text>
                      </View>
                    </View>
                  </View>
                );
              }}
              keyExtractor={(item) => item.id}
            />
          </View>
        </View>
        
        {/* Goal Alignment */}
        {goalAlignments.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Target size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Goal Alignment</Text>
            </View>
            
            <View style={styles.goalCardsContainer}>
              {goalAlignments.map((goal, index) => {
                const getGoalIcon = (goalKey: string) => {
                  switch (goalKey) {
                    case 'bodyGoal': return User;
                    case 'healthGoal': return Heart;
                    case 'dietGoal': return Utensils;
                    default: return Target;
                  }
                };
                
                const IconComponent = getGoalIcon(goal.key);
                const gradientColors = goal.percentage >= 70 
                  ? ['#00C851', '#007E33'] // Green gradient for high
                  : goal.percentage >= 40 
                  ? ['#FF6B35', '#FF8E53'] // Orange gradient for medium
                  : ['#FF6B6B', '#FF8A80']; // Red gradient for low
                
                return (
                  <View key={index} style={[styles.goalCard, { backgroundColor: colors.backgroundTertiary }]}>
                    <View style={styles.goalCardHeader}>
                      <View style={[styles.goalIconContainer, { backgroundColor: colors.primary + '15' }]}>
                        <IconComponent size={20} color={colors.primary} />
                      </View>
                      <View style={styles.goalCardContent}>
                        <Text style={[styles.goalCardTitle, { color: colors.textPrimary }]}>{goal.label}</Text>
                        <Text style={[styles.goalCardSubtitle, { color: colors.textSecondary }]}>{goal.aligned} of {goal.total} scans</Text>
                      </View>
                      <Text style={[styles.goalCardPercentage, { color: gradientColors[0] }]}>{goal.percentage}%</Text>
                    </View>
                    
                    <View style={[styles.goalCardProgressContainer, { backgroundColor: colors.textTertiary + '20' }]}>
                      <View style={styles.goalCardProgressTrack}>
                        <View 
                          style={[
                            styles.goalCardProgressFill,
                            {
                              width: `${goal.percentage}%`,
                              backgroundColor: gradientColors[0],
                            }
                          ]}
                        >
                          <View 
                            style={[
                              styles.goalCardProgressGradient,
                              {
                                backgroundColor: gradientColors[1],
                              }
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        
        {/* Empty State */}
        {history.length === 0 && (
          <View style={styles.emptyState}>
            <AlertTriangle size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No scan data yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Start scanning products to see your insights!</Text>
          </View>
        )}
        
        {/* Delete All History Button */}
        {history.length > 0 && (
          <View style={styles.deleteSection}>
            <TouchableOpacity 
              style={[styles.deleteButton, { borderColor: colors.textTertiary + '40' }]} 
              onPress={() => {
                // Show confirmation alert
                if (typeof window !== 'undefined' && window.confirm) {
                  // Web confirmation
                  if (window.confirm('Are you sure you want to delete all scan history? This action cannot be undone.')) {
                    clearHistory();
                  }
                } else {
                  // Mobile - just clear for now (could add Alert.alert later)
                  clearHistory();
                }
              }}
            >
              <Trash2 size={16} color={colors.textSecondary} />
              <Text style={[styles.deleteButtonText, { color: colors.textSecondary }]}>Delete All History</Text>
            </TouchableOpacity>
          </View>
        )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  luxuryBackground: {
    flex: 1,
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    opacity: 0.03,
    background: 'linear-gradient(180deg, rgba(255, 107, 107, 0.05) 0%, rgba(255, 107, 107, 0.15) 100%)',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  gradientDivider: {
    height: 3,
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  gradientBar: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  calloutText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  unifiedStreakCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  streakSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakContent: {
    flex: 1,
  },
  streakVerticalDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 20,
  },
  streakLabel: {
    fontSize: 12,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chartContainer: {
    marginTop: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  modernChartArea: {
    height: 140,
    position: 'relative',
    paddingHorizontal: 16,
  },
  chartGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 10,
    marginRight: 8,
    width: 20,
  },
  chartLineContainer: {
    flexDirection: 'row',
    height: 100,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  chartPoint: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chartLine: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
  modernChartLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
  modernChartScore: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  carouselSection: {
    marginBottom: 24,
  },
  carouselHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  carouselContainer: {
    paddingHorizontal: 4,
  },
  carouselCard: {
    width: 140,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  carouselImageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  carouselImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  carouselBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  carouselBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.white,
  },
  carouselInfo: {
    alignItems: 'center',
  },
  carouselName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  carouselScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  carouselGrade: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselGradeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
  },
  carouselScoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ctaButton: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  goalCardsContainer: {
    gap: 16,
  },
  goalCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  goalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalCardContent: {
    flex: 1,
  },
  goalCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  goalCardSubtitle: {
    fontSize: 13,
  },
  goalCardPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  goalCardProgressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalCardProgressTrack: {
    height: '100%',
    width: '100%',
  },
  goalCardProgressFill: {
    height: '100%',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  goalCardProgressGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '30%',
    opacity: 0.7,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteSection: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});