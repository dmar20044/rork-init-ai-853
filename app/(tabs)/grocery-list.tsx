import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Image,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import {
  Plus,
  Trash2,
  Check,
  ShoppingCart,
  Edit3,
  X,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useGroceryList, GroceryItem } from '@/contexts/GroceryListContext';
import { useTheme } from '@/contexts/ThemeContext';

// Retro Tech Pop Color Palette
const RetroColors = {
  neonTurquoise: '#4ECDC4',
  retroPink: '#FF6B81', 
  deepIndigo: '#2E294E',
  creamWhite: '#FDFDFD',
  charcoalBlack: '#1E1E1E',
  slateGray: '#5F5F5F',
  softGray: '#D9D9D9',
};

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

const formatDate = (date: Date): string => {
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

interface GroceryCardProps {
  item: GroceryItem;
  onDelete: () => void;
  onToggle: () => void;
  onEdit: () => void;
  index: number;
}

function GroceryCard({ item, onDelete, onToggle, onEdit, index }: GroceryCardProps) {
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

  // Get display score (personal score if available, otherwise health score)
  const displayScore = item.personalScore ?? item.healthScore;
  const hasScore = displayScore !== undefined;
  const { grade, color } = hasScore ? getHealthGrade(displayScore) : { grade: '', color: RetroColors.slateGray };

  return (
    <View style={styles.groceryCardContainer}>
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDelete}
          testID={`delete-${item.id}`}
        >
          <Trash2 size={20} color={RetroColors.creamWhite} />
          <Text style={[styles.deleteButtonText, { color: RetroColors.creamWhite }]}>Delete</Text>
        </TouchableOpacity>
      </View>
      
      <Animated.View 
        style={[
          styles.groceryCard,
          {
            transform: [{ translateX }],
            backgroundColor: RetroColors.creamWhite,
            opacity: item.completed ? 0.7 : 1,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          onPress={onToggle}
          style={styles.cardContent}
          activeOpacity={0.7}
          testID={`grocery-item-${item.id}`}
        >
          <View style={styles.cardHeader}>
            {/* Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={onToggle}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, { borderColor: RetroColors.softGray }, item.completed && { backgroundColor: RetroColors.neonTurquoise, borderColor: RetroColors.neonTurquoise }]}>
                {item.completed && <Check size={16} color={RetroColors.creamWhite} />}
              </View>
            </TouchableOpacity>
            
            {/* Product Image */}
            <View style={styles.productImageContainer}>
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.productThumbnail} />
              ) : (
                <View style={[styles.productImagePlaceholder, { backgroundColor: RetroColors.softGray + '20' }]}>
                  <ShoppingCart size={24} color={RetroColors.slateGray} />
                </View>
              )}
            </View>
            
            {/* Product Info */}
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: RetroColors.charcoalBlack }, item.completed && { textDecorationLine: 'line-through', color: RetroColors.slateGray }]}>
                {item.name}
              </Text>
              {(item.calories || item.protein) && (
                <View style={styles.productDetails}>
                  {item.calories && (
                    <>
                      <Text style={[styles.detailText, { color: RetroColors.slateGray }]}>{item.calories} cal</Text>
                      {item.protein && <Text style={[styles.detailSeparator, { color: RetroColors.slateGray }]}>•</Text>}
                    </>
                  )}
                  {item.protein && (
                    <Text style={[styles.detailText, { color: RetroColors.slateGray }]}>{item.protein}g protein</Text>
                  )}
                </View>
              )}
              <View style={styles.timeRow}>
                <Clock size={10} color={RetroColors.softGray} />
                <Text style={[styles.timeText, { color: RetroColors.softGray }]}>Added {formatDate(item.addedAt)}</Text>
              </View>
            </View>
            
            {/* Score Ring or Edit Button */}
            <View style={styles.actionContainer}>
              {hasScore ? (
                <View style={styles.scoreRing}>
                  <View style={[styles.miniScoreRing, { borderColor: color, backgroundColor: RetroColors.creamWhite }]}>
                    <Text style={[styles.miniGradeText, { color }]}>{grade}</Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={onEdit}
                  activeOpacity={0.7}
                >
                  <Edit3 size={18} color={RetroColors.slateGray} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Color bar at bottom (only if has score) */}
          {hasScore && (
            <View style={[styles.colorBar, { backgroundColor: color }]} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}


export default function GroceryListScreen() {
  const { groceryItems, addItem, toggleItem, deleteItem, updateItem, clearCompleted, isLoading } = useGroceryList();
  const [newItemName, setNewItemName] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const handleAddItem = async () => {
    if (newItemName.trim()) {
      await addItem(newItemName.trim());
      setNewItemName('');
    }
  };

  const handleToggleItem = async (id: string) => {
    await toggleItem(id);
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteItem(id);
          },
        },
      ]
    );
  };

  const startEditing = (item: GroceryItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const saveEdit = async () => {
    if (editingName.trim() && editingId) {
      await updateItem(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleClearCompleted = () => {
    const completedCount = groceryItems.filter(item => item.completed).length;
    if (completedCount === 0) return;

    Alert.alert(
      'Clear Completed Items',
      `Remove ${completedCount} completed item${completedCount > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearCompleted();
          },
        },
      ]
    );
  };

  const pendingItems = groceryItems.filter(item => !item.completed);
  const completedItems = groceryItems.filter(item => item.completed);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: RetroColors.creamWhite }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: RetroColors.slateGray }]}>Loading grocery list...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: RetroColors.creamWhite }]}>
      <TabSlideView index={1} testID="tab-grocery">
      <View style={[styles.header, { backgroundColor: RetroColors.creamWhite, borderBottomColor: RetroColors.softGray }]}>
        <View style={styles.headerContent}>
          <ShoppingCart size={28} color={RetroColors.neonTurquoise} />
          <Text style={[styles.headerTitle, { color: RetroColors.charcoalBlack }]}>Grocery List</Text>
        </View>
        {completedItems.length > 0 && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: RetroColors.retroPink + '15' }]}
            onPress={handleClearCompleted}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearButtonText, { color: RetroColors.retroPink }]}>Clear Completed</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.addItemContainer, { backgroundColor: RetroColors.creamWhite, borderBottomColor: RetroColors.softGray }]}>
        <TextInput
          style={[styles.addItemInput, { backgroundColor: RetroColors.softGray + '20', color: RetroColors.charcoalBlack }]}
          placeholder="Add new item..."
          placeholderTextColor={RetroColors.slateGray}
          value={newItemName}
          onChangeText={setNewItemName}
          onSubmitEditing={handleAddItem}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: RetroColors.neonTurquoise }, !newItemName.trim() && { backgroundColor: RetroColors.softGray }]}
          onPress={handleAddItem}
          disabled={!newItemName.trim()}
          activeOpacity={0.7}
        >
          <Plus size={24} color={RetroColors.creamWhite} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {groceryItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShoppingCart size={64} color={RetroColors.softGray} />
            <Text style={[styles.emptyTitle, { color: RetroColors.charcoalBlack }]}>Your grocery list is empty</Text>
            <Text style={[styles.emptySubtitle, { color: RetroColors.slateGray }]}>Add items to get started!</Text>
          </View>
        ) : (
          <>
            {/* Pending Items */}
            {pendingItems.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: RetroColors.charcoalBlack }]}>
                  To Buy ({pendingItems.length})
                </Text>
                {pendingItems.map((item, index) => (
                  editingId === item.id ? (
                    <View key={item.id} style={[styles.itemContainer, { backgroundColor: RetroColors.creamWhite }]}>
                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => handleToggleItem(item.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, { borderColor: RetroColors.softGray }, item.completed && { backgroundColor: RetroColors.neonTurquoise, borderColor: RetroColors.neonTurquoise }]}>
                          {item.completed && <Check size={16} color={RetroColors.creamWhite} />}
                        </View>
                      </TouchableOpacity>

                      <View style={styles.editContainer}>
                        <TextInput
                          style={[styles.editInput, { color: RetroColors.charcoalBlack, borderBottomColor: RetroColors.neonTurquoise }]}
                          value={editingName}
                          onChangeText={setEditingName}
                          onSubmitEditing={saveEdit}
                          autoFocus
                        />
                        <TouchableOpacity
                          style={styles.editActionButton}
                          onPress={saveEdit}
                          activeOpacity={0.7}
                        >
                          <Check size={20} color={RetroColors.neonTurquoise} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.editActionButton}
                          onPress={cancelEdit}
                          activeOpacity={0.7}
                        >
                          <X size={20} color={RetroColors.retroPink} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <GroceryCard
                      key={item.id}
                      item={item}
                      index={index}
                      onDelete={() => handleDeleteItem(item.id)}
                      onToggle={() => handleToggleItem(item.id)}
                      onEdit={() => startEditing(item)}
                    />
                  )
                ))}
              </View>
            )}

            {/* Completed Items */}
            {completedItems.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: RetroColors.charcoalBlack }]}>
                  Completed ({completedItems.length})
                </Text>
                {completedItems.map((item, index) => (
                  <GroceryCard
                    key={item.id}
                    item={item}
                    index={index}
                    onDelete={() => handleDeleteItem(item.id)}
                    onToggle={() => handleToggleItem(item.id)}
                    onEdit={() => startEditing(item)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
      </TabSlideView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addItemContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  addItemInput: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completedItemContainer: {
    opacity: 0.7,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  editContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  editActionButton: {
    padding: 4,
  },
  
  // New GroceryCard styles
  groceryCardContainer: {
    marginBottom: 12,
    position: 'relative',
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
  deleteButton: {
    backgroundColor: RetroColors.retroPink,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: '90%',
    minHeight: 80,
  },
  deleteButtonText: {
    color: RetroColors.creamWhite,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  groceryCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
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
  },
  detailSeparator: {
    fontSize: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
  },
  actionContainer: {
    alignItems: 'center',
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
  },
  miniGradeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 8,
  },
  colorBar: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 8,
  },
});

export { GroceryItem };