import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  X,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  List,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface IngredientAnalysis {
  ingredient: string;
  description: string;
  isGood: boolean;
  purpose: string;
}

interface IngredientListModalProps {
  visible: boolean;
  onClose: () => void;
  ingredients: IngredientAnalysis[];
  isLoading: boolean;
}

const getIngredientColor = (ingredient: IngredientAnalysis): string => {
  // Check for "Be Cautious" ingredients (artificial, preservatives)
  if (ingredient.ingredient.toLowerCase().includes('artificial') || 
      ingredient.ingredient.toLowerCase().includes('preservative') ||
      ingredient.ingredient.toLowerCase().includes('color') ||
      ingredient.ingredient.toLowerCase().includes('flavor')) {
    return Colors.error; // Red for be cautious
  }
  
  // Use the isGood property for Clean (green) vs Questionable (orange)
  return ingredient.isGood ? Colors.success : Colors.warning;
};

const getIngredientCategory = (ingredient: IngredientAnalysis): string => {
  // Check for "Be Cautious" ingredients
  if (ingredient.ingredient.toLowerCase().includes('artificial') || 
      ingredient.ingredient.toLowerCase().includes('preservative') ||
      ingredient.ingredient.toLowerCase().includes('color') ||
      ingredient.ingredient.toLowerCase().includes('flavor')) {
    return 'Be Cautious';
  }
  
  // Use the isGood property for Clean vs Questionable
  return ingredient.isGood ? 'Clean' : 'Questionable';
};

const getIngredientIcon = (ingredient: IngredientAnalysis) => {
  const category = getIngredientCategory(ingredient);
  
  switch (category) {
    case 'Clean':
      return <CheckCircle size={20} color={Colors.success} />;
    case 'Questionable':
      return <AlertTriangle size={20} color={Colors.warning} />;
    case 'Be Cautious':
      return <AlertCircle size={20} color={Colors.error} />;
    default:
      return <CheckCircle size={20} color={Colors.success} />;
  }
};

export default function IngredientListModal({
  visible,
  onClose,
  ingredients,
  isLoading,
}: IngredientListModalProps) {
  const { colors } = useTheme();

  // Group ingredients by category
  const groupedIngredients = {
    clean: ingredients.filter(ing => getIngredientCategory(ing) === 'Clean'),
    questionable: ingredients.filter(ing => getIngredientCategory(ing) === 'Questionable'),
    beCautious: ingredients.filter(ing => getIngredientCategory(ing) === 'Be Cautious'),
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.textSecondary + '20' }]}>
          <View style={styles.headerLeft}>
            <List size={24} color={Colors.retroNeonTurquoise} />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Ingredient List</Text>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.textSecondary + '10' }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Analyzing ingredients...
              </Text>
            </View>
          ) : (
            <View style={styles.content}>
              {/* Summary Stats */}
              <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>Summary</Text>
                <View style={styles.summaryStats}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: Colors.success }]}>
                      {groupedIngredients.clean.length}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Clean</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: Colors.warning }]}>
                      {groupedIngredients.questionable.length}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Questionable</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: Colors.error }]}>
                      {groupedIngredients.beCautious.length}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Be Cautious</Text>
                  </View>
                </View>
              </View>

              {/* Clean Ingredients */}
              {groupedIngredients.clean.length > 0 && (
                <View style={[styles.categorySection, { backgroundColor: colors.surface }]}>
                  <View style={styles.categoryHeader}>
                    <CheckCircle size={20} color={Colors.success} />
                    <Text style={[styles.categoryTitle, { color: Colors.success }]}>Clean Ingredients</Text>
                    <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>({groupedIngredients.clean.length})</Text>
                  </View>
                  <View style={styles.ingredientsList}>
                    {groupedIngredients.clean.map((ingredient, index) => (
                      <View key={`clean-${index}`} style={[styles.ingredientItem, { borderLeftColor: Colors.success }]}>
                        <View style={styles.ingredientHeader}>
                          {getIngredientIcon(ingredient)}
                          <Text style={[styles.ingredientName, { color: colors.textPrimary }]}>
                            {ingredient.ingredient}
                          </Text>
                        </View>
                        <Text style={[styles.ingredientDescription, { color: colors.textSecondary }]}>
                          {ingredient.description}
                        </Text>
                        <Text style={[styles.ingredientPurpose, { color: colors.textSecondary }]}>
                          Purpose: {ingredient.purpose}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Questionable Ingredients */}
              {groupedIngredients.questionable.length > 0 && (
                <View style={[styles.categorySection, { backgroundColor: colors.surface }]}>
                  <View style={styles.categoryHeader}>
                    <AlertTriangle size={20} color={Colors.warning} />
                    <Text style={[styles.categoryTitle, { color: Colors.warning }]}>Questionable Ingredients</Text>
                    <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>({groupedIngredients.questionable.length})</Text>
                  </View>
                  <View style={styles.ingredientsList}>
                    {groupedIngredients.questionable.map((ingredient, index) => (
                      <View key={`questionable-${index}`} style={[styles.ingredientItem, { borderLeftColor: Colors.warning }]}>
                        <View style={styles.ingredientHeader}>
                          {getIngredientIcon(ingredient)}
                          <Text style={[styles.ingredientName, { color: colors.textPrimary }]}>
                            {ingredient.ingredient}
                          </Text>
                        </View>
                        <Text style={[styles.ingredientDescription, { color: colors.textSecondary }]}>
                          {ingredient.description}
                        </Text>
                        <Text style={[styles.ingredientPurpose, { color: colors.textSecondary }]}>
                          Purpose: {ingredient.purpose}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Be Cautious Ingredients */}
              {groupedIngredients.beCautious.length > 0 && (
                <View style={[styles.categorySection, { backgroundColor: colors.surface }]}>
                  <View style={styles.categoryHeader}>
                    <AlertCircle size={20} color={Colors.error} />
                    <Text style={[styles.categoryTitle, { color: Colors.error }]}>Be Cautious Ingredients</Text>
                    <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>({groupedIngredients.beCautious.length})</Text>
                  </View>
                  <View style={styles.ingredientsList}>
                    {groupedIngredients.beCautious.map((ingredient, index) => (
                      <View key={`becautious-${index}`} style={[styles.ingredientItem, { borderLeftColor: Colors.error }]}>
                        <View style={styles.ingredientHeader}>
                          {getIngredientIcon(ingredient)}
                          <Text style={[styles.ingredientName, { color: colors.textPrimary }]}>
                            {ingredient.ingredient}
                          </Text>
                        </View>
                        <Text style={[styles.ingredientDescription, { color: colors.textSecondary }]}>
                          {ingredient.description}
                        </Text>
                        <Text style={[styles.ingredientPurpose, { color: colors.textSecondary }]}>
                          Purpose: {ingredient.purpose}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* No ingredients message */}
              {ingredients.length === 0 && !isLoading && (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No ingredient analysis available
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.retroCreamWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: Colors.retroCreamWhite,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.retroCharcoalBlack,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.retroSoftGray + '30',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.retroSlateGray,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: Colors.retroCreamWhite,
    shadowColor: Colors.retroSoftGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.retroDeepIndigo + '15',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.retroCharcoalBlack,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.retroSlateGray,
  },
  categorySection: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: Colors.retroCreamWhite,
    shadowColor: Colors.retroSoftGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.retroDeepIndigo + '15',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientItem: {
    backgroundColor: Colors.retroSoftGray + '10',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    flex: 1,
    color: Colors.retroCharcoalBlack,
  },
  ingredientDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
    color: Colors.retroSlateGray,
  },
  ingredientPurpose: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    color: Colors.retroSlateGray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    color: Colors.retroSlateGray,
  },
});