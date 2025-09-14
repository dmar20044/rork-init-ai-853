import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Flag,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { NutritionInfo } from '@/services/foodAnalysis';

interface FlagItemProps {
  name: string;
  description: string;
  type: 'clean' | 'questionable' | 'stayaway';
  index: number;
}

interface IngredientFlagsProps {
  nutrition: NutritionInfo;
}

function FlagItem({ name, description, type }: FlagItemProps) {
  const getFlagIcon = () => {
    switch (type) {
      case 'clean': return CheckCircle;
      case 'questionable': return AlertTriangle;
      case 'stayaway': return XCircle;
    }
  };

  const getFlagColor = () => {
    switch (type) {
      case 'clean': return Colors.success;
      case 'questionable': return Colors.warning;
      case 'stayaway': return Colors.error;
    }
  };

  const Icon = getFlagIcon();
  const color = getFlagColor();

  return (
    <View style={styles.flagItem}>
      <Icon size={16} color={color} style={styles.flagIcon} />
      <View style={styles.flagContent}>
        <Text style={[styles.flagName, { color }]}>{name}</Text>
        <Text style={styles.flagDescription}>{description}</Text>
      </View>
    </View>
  );
}

function FlagCircle({ 
  type, 
  count, 
  flags, 
  onPress 
}: { 
  type: 'clean' | 'questionable' | 'stayaway'; 
  count: number; 
  flags: FlagItemProps[];
  onPress: () => void;
}) {
  const getCircleColor = () => {
    switch (type) {
      case 'clean': return Colors.success;
      case 'questionable': return Colors.warning;
      case 'stayaway': return Colors.error;
    }
  };

  const getFlagColor = () => {
    switch (type) {
      case 'clean': return Colors.success;
      case 'questionable': return Colors.warning;
      case 'stayaway': return Colors.error;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'clean': return 'Clean';
      case 'questionable': return 'Questionable';
      case 'stayaway': return 'Stay Away';
    }
  };

  const color = getCircleColor();
  const flagColor = getFlagColor();
  const label = getLabel();

  return (
    <TouchableOpacity 
      style={styles.flagCircle} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.flagCircleInner, { borderColor: flagColor, borderWidth: 2, backgroundColor: 'transparent' }]}>
        <Flag size={24} color={flagColor} />
      </View>
      <Text style={[styles.flagCircleLabel, { color }]}>{label}</Text>
      <Text style={[styles.flagCircleCount, { color }]}>{count}</Text>
    </TouchableOpacity>
  );
}

export default function IngredientFlags({ nutrition }: IngredientFlagsProps) {
  const [expandedFlag, setExpandedFlag] = useState<'clean' | 'questionable' | 'stayaway' | null>(null);
  const [animatedHeight] = useState(new Animated.Value(0));

  // Categorize ingredients into flags
  const categorizeIngredients = () => {
    const cleanFlags: FlagItemProps[] = [];
    const questionableFlags: FlagItemProps[] = [];
    const stayAwayFlags: FlagItemProps[] = [];

    // High-risk additives (red flags)
    const highRiskAdditives = [
      'aspartame', 'sucralose', 'acesulfame potassium', 'acesulfame k', 'ace-k',
      'sodium benzoate', 'potassium sorbate', 'bha', 'bht', 'tbhq', 'propyl gallate',
      'sodium nitrite', 'sodium nitrate', 'monosodium glutamate', 'msg',
      'red dye 40', 'red 40', 'yellow dye 5', 'yellow 5', 'blue dye 1', 'blue 1',
      'caramel color', 'phosphoric acid', 'sodium phosphate', 'calcium phosphate',
      'potassium bromate', 'azodicarbonamide', 'brominated vegetable oil', 'bvo',
      'olestra', 'olean', 'recombinant bovine growth hormone', 'rbgh', 'rbst',
      'butylated hydroxyanisole', 'butylated hydroxytoluene', 'tertiary butylhydroquinone'
    ];

    // Moderate-risk additives (yellow flags)
    const moderateRiskAdditives = [
      'citric acid', 'ascorbic acid', 'tocopherols', 'lecithin', 'soy lecithin',
      'carrageenan', 'xanthan gum', 'guar gum', 'locust bean gum', 'agar',
      'natural flavors', 'artificial flavors', 'modified corn starch', 'modified food starch',
      'maltodextrin', 'dextrose', 'corn syrup', 'high fructose corn syrup', 'hfcs',
      'sodium alginate', 'calcium alginate', 'potassium alginate',
      'mono- and diglycerides', 'monoglycerides', 'diglycerides',
      'polysorbate 60', 'polysorbate 80', 'sodium stearoyl lactylate',
      'calcium stearoyl lactylate', 'datem', 'calcium propionate', 'sodium propionate',
      'potassium sorbate', 'calcium sorbate', 'sorbic acid',
      'enriched flour', 'bleached flour', 'bromated flour'
    ];

    // Seed oils and processed fats (yellow to red flags)
    const seedOils = [
      'soybean oil', 'canola oil', 'corn oil', 'sunflower oil', 'safflower oil',
      'cottonseed oil', 'rapeseed oil', 'vegetable oil', 'grapeseed oil', 'grape seed oil',
      'rice bran oil', 'peanut oil', 'partially hydrogenated oil',
      'hydrogenated oil', 'trans fat', 'margarine', 'vegetable shortening'
    ];

    // Added sugars (yellow flags)
    const addedSugars = [
      'cane sugar', 'brown sugar', 'raw sugar', 'turbinado sugar', 'demerara sugar',
      'coconut sugar', 'palm sugar', 'agave nectar', 'agave syrup', 'maple syrup',
      'honey', 'molasses', 'brown rice syrup', 'barley malt syrup', 'date syrup',
      'fructose', 'glucose', 'sucrose', 'lactose', 'maltose', 'galactose',
      'invert sugar', 'cane juice', 'evaporated cane juice', 'fruit juice concentrate'
    ];

    // Good ingredients (green flags)
    const wholeFoods = [
      // Proteins
      'chicken', 'turkey', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'cod',
      'eggs', 'egg whites', 'milk', 'cheese', 'yogurt', 'greek yogurt', 'cottage cheese',
      'beans', 'lentils', 'chickpeas', 'black beans', 'kidney beans', 'pinto beans',
      // Grains and starches
      'oats', 'quinoa', 'brown rice', 'wild rice', 'barley', 'buckwheat', 'millet',
      'whole wheat', 'whole grain', 'sweet potato', 'potato', 'yam',
      // Nuts and seeds
      'almonds', 'walnuts', 'cashews', 'pecans', 'pistachios', 'brazil nuts',
      'peanuts', 'sunflower seeds', 'pumpkin seeds', 'chia seeds', 'flax seeds',
      'sesame seeds', 'hemp seeds',
      // Healthy fats
      'olive oil', 'extra virgin olive oil', 'avocado oil', 'coconut oil', 'butter',
      'ghee', 'avocado', 'olives',
      // Fruits and vegetables
      'tomatoes', 'spinach', 'kale', 'broccoli', 'carrots', 'bell peppers',
      'onions', 'garlic', 'ginger', 'celery', 'cucumber', 'zucchini',
      'apple', 'banana', 'berries', 'strawberries', 'blueberries', 'raspberries',
      'blackberries', 'oranges', 'lemons', 'limes', 'grapes', 'pineapple',
      // Basic ingredients
      'water', 'sea salt', 'himalayan salt', 'black pepper', 'herbs', 'spices',
      'vanilla extract', 'cocoa', 'cacao', 'coconut', 'coconut milk'
    ];

    // Get all ingredients from the nutrition data
    const allIngredients = [...(nutrition.ingredients || [])];
    
    // If no ingredients are available, show a message
    if (allIngredients.length === 0) {
      questionableFlags.push({
        name: 'No ingredient list available',
        description: 'Ingredient information not found on product',
        type: 'questionable',
        index: -1,
      });
      return { cleanFlags, questionableFlags, stayAwayFlags };
    }
    
    allIngredients.forEach((ingredient, index) => {
      const lowerIngredient = ingredient.toLowerCase().trim();
      let categorized = false;
      
      // Check for high-risk additives (RED FLAGS)
      const highRiskMatch = highRiskAdditives.find(additive => 
        lowerIngredient.includes(additive.toLowerCase()) ||
        additive.toLowerCase().includes(lowerIngredient)
      );
      if (highRiskMatch) {
        let detailedDescription = 'Potentially harmful additive';
        
        // Provide specific health impact descriptions
        if (lowerIngredient.includes('aspartame') || lowerIngredient.includes('sucralose') || lowerIngredient.includes('acesulfame')) {
          detailedDescription = 'Artificial sweetener that may disrupt gut bacteria, trigger cravings, and potentially cause headaches in sensitive individuals';
        } else if (lowerIngredient.includes('sodium benzoate') || lowerIngredient.includes('potassium sorbate')) {
          detailedDescription = 'Preservative that can form benzene (a carcinogen) when combined with vitamin C, may trigger allergic reactions';
        } else if (lowerIngredient.includes('bha') || lowerIngredient.includes('bht') || lowerIngredient.includes('tbhq')) {
          detailedDescription = 'Synthetic antioxidant preservative linked to potential carcinogenic effects and hormone disruption';
        } else if (lowerIngredient.includes('sodium nitrite') || lowerIngredient.includes('sodium nitrate')) {
          detailedDescription = 'Preservative that can form nitrosamines (carcinogens) in the body, especially when heated or combined with proteins';
        } else if (lowerIngredient.includes('msg') || lowerIngredient.includes('monosodium glutamate')) {
          detailedDescription = 'Flavor enhancer that may cause headaches, nausea, and brain fog in sensitive individuals';
        } else if (lowerIngredient.includes('red dye') || lowerIngredient.includes('yellow dye') || lowerIngredient.includes('blue dye')) {
          detailedDescription = 'Artificial food coloring linked to hyperactivity in children and potential allergic reactions';
        } else if (lowerIngredient.includes('caramel color')) {
          detailedDescription = 'Artificial coloring that may contain 4-methylimidazole, a potential carcinogen formed during manufacturing';
        } else if (lowerIngredient.includes('phosphoric acid') || lowerIngredient.includes('phosphate')) {
          detailedDescription = 'Acidulant that can interfere with calcium absorption, potentially weakening bones and teeth';
        }
        
        stayAwayFlags.push({
          name: ingredient,
          description: detailedDescription,
          type: 'stayaway',
          index,
        });
        categorized = true;
      }

      // Check for seed oils and trans fats (RED FLAGS for processed oils)
      if (!categorized) {
        const seedOilMatch = seedOils.find(oil => 
          lowerIngredient.includes(oil.toLowerCase()) ||
          oil.toLowerCase().includes(lowerIngredient)
        );
        if (seedOilMatch) {
          if (lowerIngredient.includes('hydrogenated') || lowerIngredient.includes('trans')) {
            stayAwayFlags.push({
              name: ingredient,
              description: `Trans fat that raises bad cholesterol, lowers good cholesterol, and increases inflammation and heart disease risk`,
              type: 'stayaway',
              index,
            });
          } else {
            let oilDescription = 'Highly processed oil high in omega-6 fatty acids that can promote inflammation when consumed in excess';
            
            if (lowerIngredient.includes('soybean')) {
              oilDescription = 'Highly processed soybean oil that disrupts omega-3/omega-6 balance, may increase inflammation and oxidative stress';
            } else if (lowerIngredient.includes('canola')) {
              oilDescription = 'Processed rapeseed oil that undergoes chemical extraction and may contain trans fats from processing';
            } else if (lowerIngredient.includes('corn oil')) {
              oilDescription = 'Highly refined corn oil with excessive omega-6 fatty acids that can promote inflammation and insulin resistance';
            }
            
            questionableFlags.push({
              name: ingredient,
              description: oilDescription,
              type: 'questionable',
              index,
            });
          }
          categorized = true;
        }
      }

      // Check for moderate-risk additives (YELLOW FLAGS)
      if (!categorized) {
        const moderateRiskMatch = moderateRiskAdditives.find(additive => 
          lowerIngredient.includes(additive.toLowerCase()) ||
          additive.toLowerCase().includes(lowerIngredient)
        );
        if (moderateRiskMatch) {
          let moderateDescription = 'Processed additive - consume in moderation';
          
          if (lowerIngredient.includes('carrageenan')) {
            moderateDescription = 'Seaweed extract that may cause digestive inflammation and gut irritation in sensitive individuals';
          } else if (lowerIngredient.includes('xanthan gum') || lowerIngredient.includes('guar gum')) {
            moderateDescription = 'Thickening agent that may cause digestive upset in large amounts but generally safe in small quantities';
          } else if (lowerIngredient.includes('natural flavors') || lowerIngredient.includes('artificial flavors')) {
            moderateDescription = 'Flavor compounds that may contain dozens of undisclosed chemicals, some potentially triggering sensitivities';
          } else if (lowerIngredient.includes('modified corn starch') || lowerIngredient.includes('modified food starch')) {
            moderateDescription = 'Chemically altered starch that provides texture but offers no nutritional value and may affect blood sugar';
          } else if (lowerIngredient.includes('maltodextrin')) {
            moderateDescription = 'Highly processed starch that spikes blood sugar faster than table sugar and may disrupt gut bacteria';
          } else if (lowerIngredient.includes('corn syrup') || lowerIngredient.includes('high fructose corn syrup')) {
            moderateDescription = 'Processed sweetener that bypasses normal satiety signals, promotes fat storage, and may contribute to insulin resistance';
          } else if (lowerIngredient.includes('lecithin')) {
            moderateDescription = 'Emulsifier that helps mix oil and water, generally safe but may be derived from GMO sources';
          }
          
          questionableFlags.push({
            name: ingredient,
            description: moderateDescription,
            type: 'questionable',
            index,
          });
          categorized = true;
        }
      }

      // Check for added sugars (YELLOW FLAGS)
      if (!categorized) {
        const addedSugarMatch = addedSugars.find(sugar => 
          lowerIngredient.includes(sugar.toLowerCase()) ||
          sugar.toLowerCase().includes(lowerIngredient)
        );
        if (addedSugarMatch) {
          let sugarDescription = 'Added sugar that spikes blood glucose and insulin levels';
          
          // Natural sugars like honey and maple syrup are better than refined sugars
          if (['honey', 'maple syrup', 'date syrup', 'coconut sugar'].includes(addedSugarMatch)) {
            if (lowerIngredient.includes('honey')) {
              sugarDescription = 'Natural sweetener with trace minerals and antioxidants, but still raises blood sugar and should be consumed sparingly';
            } else if (lowerIngredient.includes('maple syrup')) {
              sugarDescription = 'Natural sweetener with minerals like manganese and zinc, but high in fructose which can stress the liver';
            } else if (lowerIngredient.includes('coconut sugar')) {
              sugarDescription = 'Less processed sugar with small amounts of nutrients, but metabolically similar to regular sugar';
            } else {
              sugarDescription = 'Natural sweetener that still contributes to blood sugar spikes and should be limited';
            }
          } else {
            if (lowerIngredient.includes('cane sugar') || lowerIngredient.includes('brown sugar')) {
              sugarDescription = 'Refined sugar that causes rapid blood glucose spikes, promotes inflammation, and feeds harmful gut bacteria';
            } else if (lowerIngredient.includes('fructose')) {
              sugarDescription = 'Simple sugar that bypasses normal glucose metabolism, directly stresses the liver, and promotes fat storage';
            } else if (lowerIngredient.includes('glucose') || lowerIngredient.includes('dextrose')) {
              sugarDescription = 'Simple sugar that rapidly elevates blood glucose and insulin, potentially contributing to insulin resistance';
            } else {
              sugarDescription = 'Added sugar that contributes to blood sugar instability, inflammation, and increased risk of metabolic disorders';
            }
          }
          
          questionableFlags.push({
            name: ingredient,
            description: sugarDescription,
            type: 'questionable',
            index,
          });
          categorized = true;
        }
      }

      // Check for whole foods (GREEN FLAGS)
      if (!categorized) {
        const wholeFoodMatch = wholeFoods.find(food => 
          lowerIngredient.includes(food.toLowerCase()) ||
          food.toLowerCase().includes(lowerIngredient)
        );
        if (wholeFoodMatch) {
          let description = 'Whole food ingredient that provides natural nutrients';
          
          // Add specific descriptions for different types of whole foods
          if (lowerIngredient.includes('chicken') || lowerIngredient.includes('turkey')) {
            description = 'Lean protein that provides all essential amino acids, supports muscle maintenance, and helps with satiety';
          } else if (lowerIngredient.includes('beef')) {
            description = 'Complete protein rich in iron, zinc, and B-vitamins that supports muscle growth and cognitive function';
          } else if (lowerIngredient.includes('fish') || lowerIngredient.includes('salmon')) {
            description = 'High-quality protein with omega-3 fatty acids that reduce inflammation and support brain and heart health';
          } else if (lowerIngredient.includes('eggs')) {
            description = 'Complete protein with choline for brain health, lutein for eye health, and all essential amino acids';
          } else if (lowerIngredient.includes('oats')) {
            description = 'Whole grain rich in beta-glucan fiber that helps lower cholesterol and stabilize blood sugar levels';
          } else if (lowerIngredient.includes('quinoa')) {
            description = 'Complete protein grain with all essential amino acids, fiber, and minerals like magnesium and iron';
          } else if (lowerIngredient.includes('brown rice')) {
            description = 'Whole grain that provides sustained energy, B-vitamins, and fiber for digestive health';
          } else if (lowerIngredient.includes('olive oil')) {
            description = 'Monounsaturated fat rich in antioxidants that supports heart health and reduces inflammation';
          } else if (lowerIngredient.includes('avocado oil')) {
            description = 'Heat-stable monounsaturated fat with vitamin E that supports nutrient absorption and heart health';
          } else if (lowerIngredient.includes('coconut oil')) {
            description = 'Saturated fat with medium-chain triglycerides that may boost metabolism and provide quick energy';
          } else if (lowerIngredient.includes('spinach') || lowerIngredient.includes('kale')) {
            description = 'Leafy green packed with iron, folate, vitamin K, and antioxidants that support blood and bone health';
          } else if (lowerIngredient.includes('broccoli')) {
            description = 'Cruciferous vegetable with vitamin C, sulforaphane, and fiber that supports immune function and detoxification';
          } else if (lowerIngredient.includes('carrots')) {
            description = 'Root vegetable rich in beta-carotene (vitamin A) that supports eye health and immune function';
          } else if (lowerIngredient.includes('berries') || lowerIngredient.includes('blueberries')) {
            description = 'Antioxidant-rich fruit that supports brain health, reduces inflammation, and provides vitamin C';
          } else if (lowerIngredient.includes('apple')) {
            description = 'Fiber-rich fruit with quercetin and other antioxidants that support heart health and blood sugar control';
          } else if (lowerIngredient.includes('almonds') || lowerIngredient.includes('walnuts')) {
            description = 'Nutrient-dense nuts with healthy fats, protein, and vitamin E that support heart and brain health';
          } else if (lowerIngredient.includes('beans') || lowerIngredient.includes('lentils')) {
            description = 'Plant protein rich in fiber, folate, and minerals that support digestive health and blood sugar control';
          } else if (lowerIngredient.includes('yogurt')) {
            description = 'Fermented dairy with probiotics, protein, and calcium that supports gut health and bone strength';
          }
          
          cleanFlags.push({
            name: ingredient,
            description: description,
            type: 'clean',
            index,
          });
          categorized = true;
        }
      }

      // Special handling for organic ingredients
      if (!categorized && nutrition.isOrganic) {
        // If it's organic and not obviously bad, lean towards good
        if (!lowerIngredient.includes('syrup') && !lowerIngredient.includes('refined')) {
          cleanFlags.push({
            name: ingredient,
            description: `Organic ingredient grown without synthetic pesticides, herbicides, or GMOs, reducing chemical exposure`,
            type: 'clean',
            index,
          });
          categorized = true;
        }
      }

      // Default categorization for unrecognized ingredients
      if (!categorized) {
        // If it's one of the first 3 ingredients and sounds natural, it's probably okay
        if (index < 3 && !lowerIngredient.includes('modified') && 
            !lowerIngredient.includes('artificial') && !lowerIngredient.includes('enriched')) {
          questionableFlags.push({
            name: ingredient,
            description: `Primary ingredient that makes up a significant portion of this product - evaluate based on your health goals`,
            type: 'questionable',
            index,
          });
        } else {
          let defaultDescription = 'Processed ingredient with unclear health impact';
          
          if (lowerIngredient.includes('enriched') || lowerIngredient.includes('fortified')) {
            defaultDescription = 'Processed ingredient with added synthetic vitamins to replace nutrients lost during processing';
          } else if (lowerIngredient.includes('modified')) {
            defaultDescription = 'Chemically or physically altered ingredient that may behave differently than its natural form';
          } else if (lowerIngredient.includes('concentrate') || lowerIngredient.includes('isolate')) {
            defaultDescription = 'Highly processed ingredient where natural components have been separated and concentrated';
          }
          
          questionableFlags.push({
            name: ingredient,
            description: defaultDescription,
            type: 'questionable',
            index,
          });
        }
      }
    });

    return { cleanFlags, questionableFlags, stayAwayFlags };
  };

  const { cleanFlags, questionableFlags, stayAwayFlags } = useMemo(() => {
    const result = categorizeIngredients();
    const sortByIndex = (a: FlagItemProps, b: FlagItemProps) => (a.index ?? 9999) - (b.index ?? 9999);
    result.cleanFlags.sort(sortByIndex);
    result.questionableFlags.sort(sortByIndex);
    result.stayAwayFlags.sort(sortByIndex);
    console.log('[IngredientFlags] Flags computed', {
      clean: result.cleanFlags.length,
      questionable: result.questionableFlags.length,
      stayAway: result.stayAwayFlags.length,
    });
    return result;
  }, [nutrition]);

  const handleFlagPress = (flagType: 'clean' | 'questionable' | 'stayaway') => {
    if (expandedFlag === flagType) {
      // Collapse
      setExpandedFlag(null);
      Animated.timing(animatedHeight, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      // Expand
      setExpandedFlag(flagType);
      Animated.timing(animatedHeight, {
        toValue: 200, // Adjust based on content
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const renderFlagDropdown = (flags: FlagItemProps[], type: 'clean' | 'questionable' | 'stayaway') => {
    if (expandedFlag !== type || flags.length === 0) return null;

    return (
      <Animated.View style={[styles.flagDropdown, { maxHeight: animatedHeight }]} testID={`ingredient-flag-dropdown-${type}`}>
        <View style={styles.flagDropdownContent}>
          {flags.map((flag, index) => (
            <FlagItem key={`${type}-${index}`} {...flag} />
          ))}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container} testID="ingredient-flags-container">
      <View style={styles.flagCirclesContainer} testID="ingredient-flag-circles">
        {stayAwayFlags.length > 0 && (
          <FlagCircle
            type="stayaway"
            count={stayAwayFlags.length}
            flags={stayAwayFlags}
            onPress={() => handleFlagPress('stayaway')}
          />
        )}
        {questionableFlags.length > 0 && (
          <FlagCircle
            type="questionable"
            count={questionableFlags.length}
            flags={questionableFlags}
            onPress={() => handleFlagPress('questionable')}
          />
        )}
        {cleanFlags.length > 0 && (
          <FlagCircle
            type="clean"
            count={cleanFlags.length}
            flags={cleanFlags}
            onPress={() => handleFlagPress('clean')}
          />
        )}
      </View>
      
      {renderFlagDropdown(stayAwayFlags, 'stayaway')}
      {renderFlagDropdown(questionableFlags, 'questionable')}
      {renderFlagDropdown(cleanFlags, 'clean')}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  flagCirclesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  flagCircle: {
    alignItems: 'center',
    padding: 8,
    minWidth: 80,
  },
  flagCircleInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  flagCircleLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  flagCircleCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  flagDropdown: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flagDropdownContent: {
    padding: 16,
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  flagIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  flagContent: {
    flex: 1,
  },
  flagName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  flagDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});