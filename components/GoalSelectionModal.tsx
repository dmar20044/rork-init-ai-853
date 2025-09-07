import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { UserGoals } from '@/contexts/UserContext';
import * as Haptics from 'expo-haptics';

type GoalType = keyof UserGoals;

interface GoalOption {
  value: string;
  label: string;
  description?: string;
}

interface GoalSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  goalType: GoalType;
  currentValue: string | null;
  onSelect: (value: string) => void;
}

const goalOptions: Record<GoalType, GoalOption[]> = {
  bodyGoal: [
    { value: 'lose-weight', label: 'Lose Weight', description: 'Focus on calorie deficit and fat loss' },
    { value: 'gain-weight', label: 'Gain Weight', description: 'Build muscle and healthy weight gain' },
    { value: 'maintain-weight', label: 'Maintain Weight', description: 'Keep current weight stable' },
  ],
  healthGoal: [
    { value: 'low-sugar', label: 'Low Sugar', description: 'Minimize sugar intake' },
    { value: 'high-protein', label: 'High Protein', description: 'Prioritize protein-rich foods' },
    { value: 'low-fat', label: 'Low Fat', description: 'Reduce fat consumption' },
    { value: 'keto', label: 'Keto', description: 'High fat, very low carb diet' },
    { value: 'balanced', label: 'Balanced', description: 'Well-rounded nutrition' },
  ],
  dietGoal: [
    { value: 'whole-foods', label: 'Whole Foods', description: 'Unprocessed, natural foods' },
    { value: 'vegan', label: 'Vegan', description: 'Plant-based diet only' },
    { value: 'carnivore', label: 'Carnivore', description: 'Animal products only' },
    { value: 'gluten-free', label: 'Gluten Free', description: 'No gluten-containing foods' },
    { value: 'vegetarian', label: 'Vegetarian', description: 'No meat, but dairy/eggs OK' },
    { value: 'balanced', label: 'Balanced', description: 'Variety of food groups' },
  ],
  lifeGoal: [
    { value: 'eat-healthier', label: 'Eat Healthier', description: 'Make better food choices' },
    { value: 'boost-energy', label: 'Boost Energy', description: 'Increase daily energy levels' },
    { value: 'feel-better', label: 'Feel Better', description: 'Improve overall wellbeing' },
    { value: 'clear-skin', label: 'Clear Skin', description: 'Improve skin health through diet' },
  ],

};

const goalTitles: Record<GoalType, string> = {
  bodyGoal: 'Body Goal',
  healthGoal: 'Health Focus',
  dietGoal: 'Diet Preference',
  lifeGoal: 'Life Goal',
};

export default function GoalSelectionModal({
  visible,
  onClose,
  goalType,
  currentValue,
  onSelect,
}: GoalSelectionModalProps) {
  const options = goalOptions[goalType] || [];
  const title = goalTitles[goalType] || 'Select Goal';

  const handleSelect = (value: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSelect(value);
    // Don't automatically close the modal - let user close it manually
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Choose the option that best fits your current goals
          </Text>

          {options.map((option) => {
            const isSelected = currentValue === option.value;
            
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionCard, isSelected && styles.selectedCard]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, isSelected && styles.selectedLabel]}>
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text style={[styles.optionDescription, isSelected && styles.selectedDescription]}>
                        {option.description}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <View style={styles.checkIcon}>
                      <Check size={20} color={Colors.white} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    width: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: 24,
    lineHeight: 22,
  },
  optionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  selectedLabel: {
    color: Colors.white,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  selectedDescription: {
    color: Colors.white,
    opacity: 0.9,
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  bottomSpacing: {
    height: 40,
  },
});