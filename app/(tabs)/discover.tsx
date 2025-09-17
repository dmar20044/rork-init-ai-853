import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Keyboard,
  Dimensions,
  Modal,
  Animated,
  Easing,
  Image,
} from "react-native";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, MessageCircle, Sparkles, Target, Zap, User, Coffee, Utensils, Apple, Volume2, ShoppingCart, Bookmark, Dumbbell, Star, Plus, Sunrise, Zap as Lightning, ArrowRight, X, Feather, Heart, Flower2, Mic, Check } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  questionGist?: string;
  showMoreOptions?: boolean;
  isRecipeResponse?: boolean; // Track if this is a recipe response or general answer
}

interface NutritionInfo {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
  servings: string;
  summary: string;
}

interface RecipeItem {
  name: string;
  description: string;
  ingredients?: string[];
  steps?: string[];
  nutrition?: string | NutritionInfo;
}

interface RecipeModalProps {
  visible: boolean;
  recipe: RecipeItem | null;
  onClose: () => void;
  onAddToGroceryList: (ingredients: string[]) => void;
  isGenerating?: boolean;
}

interface QuickQuestion {
  id: string;
  text: string;
  icon: React.ReactNode;
}



const suggestionChips: string[] = [];

export default function AskInItScreen() {
  const { profile } = useUser();
  const { colors, isDarkMode } = useTheme();

  const quickQuestions: QuickQuestion[] = [
    {
      id: "1",
      text: "What's a healthier alternative to pizza?",
      icon: <Target size={18} color={colors.primary} />,
    },
    {
      id: "2",
      text: "Best snacks for my goals?",
      icon: <Lightning size={18} color={colors.primary} />,
    },
    {
      id: "3",
      text: "Healthy breakfast ideas?",
      icon: <Sunrise size={18} color={colors.primary} />,
    },
  ];

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeItem | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const typingDotsAnim = useRef(new Animated.Value(0)).current;
  const voiceModeExpandAnim = useRef(new Animated.Value(0)).current;
  const voiceModeBubbleAnim = useRef(new Animated.Value(0)).current;
  const soundWaveAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;
  const micRotationAnim = useRef(new Animated.Value(0)).current;
  const bubbleExpandAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [buttonText, setButtonText] = useState("Talk to InIt");

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    );

    // Start shimmer animation for gradient bars
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();

    // Start typing dots animation when loading
    if (isLoading) {
      const typingAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(typingDotsAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(typingDotsAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      typingAnimation.start();
    }

    return () => {
      keyboardDidShowListener.remove();
      shimmerAnimation.stop();
    };
  }, [isLoading]);

  // Card slide-up animation
  useEffect(() => {
    if (messages.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [messages.length]);

  const getPersonalizationText = () => {
    const goals = profile.goals;
    if (goals.healthGoal === 'high-protein') return 'High Protein';
    if (goals.bodyGoal === 'lose-weight') return 'Weight Loss';
    if (goals.dietGoal === 'vegan') return 'Vegan';
    if (goals.lifeGoal === 'eat-healthier') return 'Healthier Eating';
    return 'Balanced Nutrition';
  };

  const getGoalsContext = () => {
    const goals = profile.goals;
    const context = [];
    
    if (goals.bodyGoal) {
      const bodyGoalMap: Record<string, string> = {
        'lose-weight': 'lose weight',
        'slightly-lose-weight': 'slightly lose weight',
        'maintain-weight': 'maintain weight',
        'slightly-gain-weight': 'slightly gain weight',
        'gain-weight': 'gain weight'
      };
      context.push(`Body goal: ${bodyGoalMap[goals.bodyGoal] || goals.bodyGoal}`);
    }
    
    if (goals.healthGoal) {
      const healthGoalMap = {
        'low-sugar': 'low sugar',
        'high-protein': 'high protein',
        'low-fat': 'low fat',
        'keto': 'ketogenic diet',
        'balanced': 'balanced nutrition'
      };
      context.push(`Health focus: ${healthGoalMap[goals.healthGoal]}`);
    }
    
    if (goals.dietGoal) {
      const dietGoalMap = {
        'whole-foods': 'whole foods',
        'vegan': 'vegan',
        'carnivore': 'carnivore',
        'gluten-free': 'gluten-free',
        'vegetarian': 'vegetarian',
        'balanced': 'balanced diet'
      };
      context.push(`Diet preference: ${dietGoalMap[goals.dietGoal]}`);
    }
    
    if (goals.lifeGoal) {
      const lifeGoalMap = {
        'eat-healthier': 'eat and live healthier',
        'boost-energy': 'boost energy and mood',
        'feel-better': 'feel better about body',
        'clear-skin': 'clear up skin'
      };
      context.push(`Life goal: ${lifeGoalMap[goals.lifeGoal]}`);
    }
    

    
    return context.length > 0 ? context.join(', ') : 'general health';
  };

  const generateQuestionGist = (question: string): string => {
    const lowerQuestion = question.toLowerCase().trim();
    
    // Remove common question words and clean up
    const cleanedQuestion = lowerQuestion
      .replace(/^(what|how|can|could|should|would|tell me|give me|show me|help me|i want|i need)\s+/i, '')
      .replace(/\?+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Convert to title case and add context
    const words = cleanedQuestion.split(' ');
    const titleCased = words.map(word => {
      if (word.length <= 2) return word; // Keep short words lowercase
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
    
    // Add appropriate prefix based on question type
    if (lowerQuestion.includes('alternative') || lowerQuestion.includes('substitute') || lowerQuestion.includes('instead')) {
      return `Healthier Alternatives: ${titleCased}`;
    } else if (lowerQuestion.includes('snack') || lowerQuestion.includes('snacking')) {
      return `Snack Ideas: ${titleCased}`;
    } else if (lowerQuestion.includes('breakfast')) {
      return `Breakfast Ideas: ${titleCased}`;
    } else if (lowerQuestion.includes('lunch')) {
      return `Lunch Ideas: ${titleCased}`;
    } else if (lowerQuestion.includes('dinner')) {
      return `Dinner Ideas: ${titleCased}`;
    } else if (lowerQuestion.includes('meal prep') || lowerQuestion.includes('prep')) {
      return `Meal Prep: ${titleCased}`;
    } else if (lowerQuestion.includes('recipe') || lowerQuestion.includes('cook')) {
      return `Recipe Ideas: ${titleCased}`;
    } else if (lowerQuestion.includes('lose weight') || lowerQuestion.includes('weight loss')) {
      return `Weight Loss: ${titleCased}`;
    } else if (lowerQuestion.includes('protein') || lowerQuestion.includes('muscle')) {
      return `High Protein: ${titleCased}`;
    } else if (lowerQuestion.includes('energy') || lowerQuestion.includes('boost')) {
      return `Energy Boost: ${titleCased}`;
    } else {
      return titleCased.charAt(0).toUpperCase() + titleCased.slice(1);
    }
  };

  const isRecipeRequest = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    
    // Strong indicators for general questions (not recipes)
    const generalQuestionKeywords = [
      'better', 'vs', 'versus', 'compare', 'which', 'what\'s better', 'should i',
      'is it better', 'difference between', 'pros and cons', 'benefits of',
      'why', 'how does', 'what happens', 'explain', 'tell me about',
      'what is', 'how is', 'when should', 'is vegan', 'is whole foods',
      'quest bar', 'protein bar', 'supplement', 'nutrition facts',
      'health benefits', 'side effects', 'good for', 'bad for'
    ];
    
    // Recipe-specific keywords
    const recipeKeywords = [
      'recipe', 'cook', 'make', 'prepare', 'meal', 'breakfast', 'lunch', 'dinner',
      'dish', 'meal prep', 'ingredients', 'how to make', 'cooking', 'bake',
      'steps', 'instructions', 'serve'
    ];
    
    // Snack requests can be either - check context
    const snackKeywords = ['snack', 'snacking', 'food ideas'];
    
    const hasGeneralKeywords = generalQuestionKeywords.some(keyword => lowerText.includes(keyword));
    const hasRecipeKeywords = recipeKeywords.some(keyword => lowerText.includes(keyword));
    const hasSnackKeywords = snackKeywords.some(keyword => lowerText.includes(keyword));
    
    // Strong general question indicators
    if (hasGeneralKeywords) {
      return false;
    }
    
    // If it's asking for snacks but in a comparison/question format, treat as general
    if (hasSnackKeywords && (lowerText.includes('better') || lowerText.includes('vs') || lowerText.includes('which'))) {
      return false;
    }
    
    // Clear recipe requests
    if (hasRecipeKeywords) {
      return true;
    }
    
    // If asking for "snack ideas" or similar without comparison, treat as recipe
    if (hasSnackKeywords && (lowerText.includes('ideas') || lowerText.includes('options'))) {
      return true;
    }
    
    // Default to general question for ambiguous cases
    return false;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const goalsContext = getGoalsContext();
      const isRecipe = isRecipeRequest(text.trim());
      
      const systemPrompt = isRecipe ? 
        `You are InIt AI, a premium nutrition coach. The user's goals are: ${goalsContext}.

You MUST format ALL responses using this exact structure:

1. Start with a clear Section Title that's short, bold, and relevant to the query (e.g., "Smart Snack Options", "Balanced Dinner Ideas", "Better Grocery Swaps", "Clean Breakfast Ideas", "Quick Health Tip")

2. Provide 3-5 recommendations in this format:
   Food/Meal Name → Brief benefit explanation (max 20 words)
   
3. End with a "Coach Insight" section: 1-2 motivational sentences with a practical tip.

Rules:
- NO emojis anywhere
- Keep descriptions under 20 words each
- Always tie recommendations to their personal goals: ${goalsContext}
- Use clear, professional language
- Make it feel premium and personalized
- Each recommendation should be: Name → Benefit explanation

Example format:
Smart Snack Options

Greek Yogurt + Berries → Protein + fiber, keeps you full and gut-friendly
Edamame (steamed) → Plant protein + fiber, filling and portable
Tuna + Whole Grain Crackers → Lean protein, quick and balanced
Roasted Chickpeas → Crunchy, protein-rich swap for chips

Coach Insight
Snacks that pair protein with fiber keep you fuller for longer and prevent energy crashes.` :
        `You are InIt AI, a premium nutrition coach. The user's goals are: ${goalsContext}.

The user is asking a general nutrition question, not requesting recipes. Provide a concise, informative answer in a clean, card-friendly format.

Format your response with these sections:

Quick Answer
[Direct answer in 1 sentence]

Why This Matters
[Brief explanation in 1-2 sentences]

For Your Goals
[How this applies to their goals: ${goalsContext} - 1-2 sentences]

Action Steps
[2 specific, actionable recommendations]

Bottom Line
[One sentence key takeaway]

Rules:
- NO asterisks, emojis, or special formatting
- Keep responses short and punchy
- Use clear, professional language
- Make it practical and actionable
- Focus on their specific goals: ${goalsContext}`;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text.trim() }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.completion,
        isUser: false,
        timestamp: new Date(),
        questionGist: generateQuestionGist(text.trim()),
        showMoreOptions: false,
        isRecipeResponse: isRecipe, // Add flag to track response type
      };

      setMessages(prev => [...prev, aiMessage]);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to get response from InIt AI. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    // Ripple effect animation
    Animated.sequence([
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(rippleAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    
    setShowSuggestions(false);
    sendMessage(question);
  };

  const handleSuggestionChip = (suggestion: string) => {
    setInputText(`Tell me about ${suggestion.toLowerCase()}`);
    textInputRef.current?.focus();
  };

  const parseGeneralAnswer = (text: string) => {
    // Parse structured general answer format
    const sections: { title: string; content: string }[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentSection: { title: string; content: string } | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if line is a section header (no asterisks, just capitalized words)
      if (trimmedLine.match(/^[A-Z][a-zA-Z\s]+$/) && trimmedLine.length < 50 && !trimmedLine.includes('.')) {
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        const title = trimmedLine.trim();
        currentSection = { title, content: '' };
      } else if (currentSection && trimmedLine) {
        // Add content to current section
        if (currentSection.content) {
          currentSection.content += '\n' + trimmedLine;
        } else {
          currentSection.content = trimmedLine;
        }
      }
    }
    
    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // If no structured sections found, return the whole text as one section
    if (sections.length === 0) {
      const cleanedText = text.replace(/\*+/g, '').trim();
      sections.push({ title: 'Answer', content: cleanedText });
    }
    
    return sections;
  };

  const parseAIResponse = (text: string) => {
    // Parse the structured AI response into premium nutrition cards
    const lines = text.split('\n').filter(line => line.trim());
    const sections: { title?: string; content: RecipeItem[]; type: 'title' | 'section' | 'tip' | 'cta'; icon?: React.ReactNode }[] = [];
    let currentSection: { title?: string; content: RecipeItem[]; type: 'title' | 'section' | 'tip' | 'cta'; icon?: React.ReactNode } | null = null;
    let mainTitle = '';
    let coachInsight = '';
    
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      
      // First non-empty line is the main title
      if (!mainTitle && trimmedLine && !trimmedLine.toLowerCase().includes('coach insight')) {
        mainTitle = trimmedLine;
        continue;
      }
      
      // Check for Coach Insight section
      if (trimmedLine.toLowerCase().includes('coach insight')) {
        // Get the insight text (next line or same line after colon)
        if (trimmedLine.includes(':')) {
          coachInsight = trimmedLine.split(':').slice(1).join(':').trim();
        } else if (i + 1 < lines.length) {
          coachInsight = lines[i + 1].trim();
          i++; // Skip the next line since we used it
        }
        continue;
      }
      
      // Check for food recommendations (contains →)
      if (trimmedLine.includes('→')) {
        if (!currentSection) {
          currentSection = {
            title: mainTitle,
            content: [],
            type: 'section',
            icon: getSectionIcon(mainTitle)
          };
        }
        
        const cleanedLine = trimmedLine.replace(/^[•-]\s*/, '').replace(/\*+/g, '').trim();
        const [name, description] = cleanedLine.split('→').map(part => part.trim());
        
        if (name && description) {
          const recipeItem: RecipeItem = {
            name,
            description,
            ingredients: generateMockIngredients(name),
            steps: generateMockSteps(name),
            nutrition: generateMockNutrition(name)
          };
          currentSection.content.push(recipeItem);
        }
      }
    }
    
    if (currentSection && currentSection.content.length > 0) {
      sections.push(currentSection);
    }
    
    // Add coach insight as separate section if exists
    if (coachInsight) {
      sections.push({
        title: 'Coach Insight',
        content: [{ name: 'Coach Insight', description: coachInsight }],
        type: 'tip',
        icon: <Star size={16} color={colors.warning} />
      });
    }
    
    // If no structured content found, create a fallback section
    if (sections.length === 0) {
      const cleanedText = text.replace(/\*+/g, '').replace(/\n\s*\n/g, '\n').trim();
      sections.push({
        title: mainTitle || 'Nutrition Advice',
        content: [{ name: 'General Advice', description: cleanedText }],
        type: 'section',
        icon: <Target size={16} color={colors.info} />
      });
    }
    
    return sections;
  };

  const generateMockIngredients = (recipeName: string): string[] => {
    const baseIngredients: { [key: string]: string[] } = {
      'cauliflower': ['1 large cauliflower head', '2 tbsp olive oil', '1 cup marinara sauce', '1/2 cup mozzarella cheese', 'Italian herbs'],
      'chicken': ['4 oz grilled chicken breast', '2 cups mixed vegetables', '1 tbsp olive oil', 'Salt and pepper', 'Garlic powder'],
      'greek yogurt': ['1 cup Greek yogurt', '1/2 cup mixed berries', '1 tbsp honey', '1/4 cup granola', 'Chia seeds'],
      'salmon': ['6 oz salmon fillet', '2 cups broccoli', '1 sweet potato', '1 tbsp olive oil', 'Lemon', 'Herbs'],
      'oatmeal': ['1/2 cup rolled oats', '1 cup almond milk', '1 banana', '1 tbsp almond butter', 'Cinnamon'],
    };
    
    const lowerName = recipeName.toLowerCase();
    for (const [key, ingredients] of Object.entries(baseIngredients)) {
      if (lowerName.includes(key)) {
        return ingredients;
      }
    }
    
    return ['Main ingredient', 'Supporting ingredients', 'Seasonings', 'Healthy fats', 'Optional toppings'];
  };

  const generateMockSteps = (recipeName: string): string[] => {
    return [
      'Prep all ingredients and preheat oven if needed',
      'Cook main protein or base ingredient',
      'Prepare vegetables and seasonings',
      'Combine ingredients according to recipe',
      'Cook until done and serve immediately'
    ];
  };

  const generateMockNutrition = (recipeName: string): NutritionInfo => {
    // Generate mock nutrition data based on recipe type
    const lowerName = recipeName.toLowerCase();
    
    if (lowerName.includes('salad') || lowerName.includes('vegetable')) {
      return {
        calories: '180-220 calories',
        protein: '8-12g protein',
        carbs: '15-25g carbs',
        fat: '8-12g healthy fats',
        fiber: '6-10g fiber',
        sugar: '8-12g natural sugars',
        sodium: '300-500mg sodium',
        servings: '2 servings',
        summary: 'High in fiber, vitamins, and antioxidants. Low calorie, nutrient-dense option.'
      };
    } else if (lowerName.includes('protein') || lowerName.includes('chicken') || lowerName.includes('fish')) {
      return {
        calories: '320-420 calories',
        protein: '28-35g protein',
        carbs: '12-20g carbs',
        fat: '12-18g healthy fats',
        fiber: '3-6g fiber',
        sugar: '4-8g natural sugars',
        sodium: '400-600mg sodium',
        servings: '1 serving',
        summary: 'High protein content supports muscle building and satiety. Balanced macronutrients.'
      };
    } else if (lowerName.includes('smoothie') || lowerName.includes('yogurt')) {
      return {
        calories: '250-350 calories',
        protein: '15-25g protein',
        carbs: '25-35g carbs',
        fat: '8-15g healthy fats',
        fiber: '5-8g fiber',
        sugar: '18-25g natural sugars',
        sodium: '100-200mg sodium',
        servings: '1 serving',
        summary: 'Rich in probiotics and protein. Natural sugars from fruits provide quick energy.'
      };
    } else {
      return {
        calories: '300-400 calories',
        protein: '18-25g protein',
        carbs: '20-30g carbs',
        fat: '12-18g healthy fats',
        fiber: '4-7g fiber',
        sugar: '6-12g natural sugars',
        sodium: '350-550mg sodium',
        servings: '1-2 servings',
        summary: 'Balanced macronutrients support your health goals. Nutrient-dense and satisfying.'
      };
    }
  };

  const extractRecipeFromText = (text: string, originalRecipe: RecipeItem): RecipeItem => {
    const lines = text.split('\n').filter(line => line.trim());
    const ingredients: string[] = [];
    const steps: string[] = [];
    let nutrition = originalRecipe.nutrition || '';
    
    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('ingredient')) {
        currentSection = 'ingredients';
        continue;
      } else if (trimmedLine.toLowerCase().includes('instruction') || trimmedLine.toLowerCase().includes('step')) {
        currentSection = 'steps';
        continue;
      } else if (trimmedLine.toLowerCase().includes('nutrition')) {
        currentSection = 'nutrition';
        continue;
      }
      
      if (currentSection === 'ingredients' && trimmedLine && !trimmedLine.toLowerCase().includes('ingredient')) {
        const cleanedLine = trimmedLine.replace(/^[•-]\s*/, '').replace(/^\d+\.\s*/, '').trim();
        if (cleanedLine.length > 3) {
          ingredients.push(cleanedLine);
        }
      } else if (currentSection === 'steps' && trimmedLine && !trimmedLine.toLowerCase().includes('instruction') && !trimmedLine.toLowerCase().includes('step')) {
        const cleanedLine = trimmedLine.replace(/^[•-]\s*/, '').replace(/^\d+\.\s*/, '').trim();
        if (cleanedLine.length > 5) {
          steps.push(cleanedLine);
        }
      } else if (currentSection === 'nutrition' && trimmedLine && !trimmedLine.toLowerCase().includes('nutrition')) {
        nutrition = trimmedLine;
      }
    }
    
    return {
      ...originalRecipe,
      ingredients: ingredients.length > 0 ? ingredients : originalRecipe.ingredients,
      steps: steps.length > 0 ? steps : originalRecipe.steps,
      nutrition: nutrition || originalRecipe.nutrition
    };
  };

  const handleViewRecipe = async (recipe: RecipeItem) => {
    // Tap ripple effect for recipe buttons
    Animated.sequence([
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(rippleAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    
    setSelectedRecipe(recipe);
    setShowRecipeModal(true);
    
    // Generate AI recipe if ingredients/steps are not already detailed
    if (!recipe.ingredients || recipe.ingredients.length <= 5 || recipe.ingredients.includes('Main ingredient')) {
      setIsGeneratingRecipe(true);
      try {
        const goalsContext = getGoalsContext();
        const systemPrompt = `You are InIt AI, a premium nutrition coach. Generate a detailed recipe for "${recipe.name}" that aligns with the user's goals: ${goalsContext}.

Provide a complete recipe with:
1. A list of specific ingredients with measurements
2. Step-by-step cooking instructions
3. Comprehensive nutrition information

Format your response as JSON with this structure:
{
  "ingredients": ["ingredient 1 with measurement", "ingredient 2 with measurement", ...],
  "steps": ["step 1", "step 2", ...],
  "nutrition": {
    "calories": "number with unit",
    "protein": "grams with unit",
    "carbs": "grams with unit",
    "fat": "grams with unit",
    "fiber": "grams with unit",
    "sugar": "grams with unit",
    "sodium": "mg with unit",
    "servings": "number of servings",
    "summary": "brief nutritional highlights and benefits"
  }
}

Make the recipe healthy, practical, and aligned with their goals. Keep ingredients realistic and accessible. Provide accurate nutrition estimates based on the ingredients and portions.`;

        const response = await fetch('https://toolkit.rork.com/text/llm/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Generate a detailed recipe for ${recipe.name}. Description: ${recipe.description}` }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          try {
            // Try to parse as JSON first
            const recipeData = JSON.parse(data.completion);
            const updatedRecipe = {
              ...recipe,
              ingredients: recipeData.ingredients || recipe.ingredients,
              steps: recipeData.steps || recipe.steps,
              nutrition: recipeData.nutrition || recipe.nutrition
            };
            setSelectedRecipe(updatedRecipe);
          } catch (parseError) {
            // If JSON parsing fails, try to extract from text
            const aiText = data.completion;
            const extractedRecipe = extractRecipeFromText(aiText, recipe);
            setSelectedRecipe(extractedRecipe);
          }
        }
      } catch (error) {
        console.error('Error generating recipe:', error);
        // Keep the original recipe if AI generation fails
      } finally {
        setIsGeneratingRecipe(false);
      }
    }
  };

  const handleAddToGroceryList = (ingredients: string[]) => {
    // TODO: Implement grocery list integration
    Alert.alert('Added to Grocery List', `${ingredients.length} ingredients added to your grocery list!`);
    setShowRecipeModal(false);
  };

  const startSoundWaveAnimation = () => {
    const animations = soundWaveAnims.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 400 + (index * 100),
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400 + (index * 100),
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
    });
    
    Animated.stagger(100, animations).start();
  };

  const stopSoundWaveAnimation = () => {
    soundWaveAnims.forEach(anim => anim.stopAnimation());
  };

  const handleVoiceModeToggle = () => {
    // Heavy haptic feedback when button is pressed
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    if (isVoiceModeActive) {
      // Close voice mode
      stopSoundWaveAnimation();
      setShowCheckmark(false);
      
      // Fade text back to "Talk to InIt"
      Animated.timing(textFadeAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setButtonText("Talk to InIt");
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
      
      // Reset rotation animation
      Animated.timing(micRotationAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
      
      // Reset bubble expand animation
      Animated.timing(bubbleExpandAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.back(1.2)),
        useNativeDriver: false,
      }).start();
      
      Animated.timing(voiceModeBubbleAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setIsVoiceModeActive(false);
      });
    } else {
      // Open voice mode
      setIsVoiceModeActive(true);
      
      // Fade text to "InIt is listening"
      Animated.timing(textFadeAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setButtonText("InIt is listening");
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
      
      // Start bubble expand animation from microphone
      Animated.timing(bubbleExpandAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: false,
      }).start();
      
      // Start microphone to checkmark rotation animation
      Animated.timing(micRotationAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }).start(() => {
        // Show checkmark after rotation completes
        setShowCheckmark(true);
      });
      
      Animated.timing(voiceModeBubbleAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }).start(() => {
        // Start sound wave animation after bubble appears
        setTimeout(() => {
          startSoundWaveAnimation();
        }, 300);
      });
    }
  };

  const handleShowMoreOptions = (messageId: string) => {
    setExpandedMessages(prev => new Set([...prev, messageId]));
  };

  const getVisibleRecipes = (recipes: RecipeItem[], messageId: string, isExpanded: boolean) => {
    if (isExpanded || recipes.length <= 3) {
      return recipes;
    }
    return recipes.slice(0, 3);
  };

  const getSectionIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    
    // Snack-related icons
    if (lowerTitle.includes('snack')) {
      return <Apple size={16} color={colors.success} />;
    }
    
    // Meal-related icons
    if (lowerTitle.includes('breakfast')) {
      return <Sunrise size={16} color={colors.warning} />;
    }
    if (lowerTitle.includes('dinner') || lowerTitle.includes('lunch') || lowerTitle.includes('meal')) {
      return <Utensils size={16} color={colors.primary} />;
    }
    
    // Goal-related icons
    if (lowerTitle.includes('protein') || lowerTitle.includes('high protein')) {
      return <Dumbbell size={16} color={colors.primary} />;
    }
    if (lowerTitle.includes('weight loss') || lowerTitle.includes('lose weight')) {
      return <Target size={16} color={colors.error} />;
    }
    if (lowerTitle.includes('energy') || lowerTitle.includes('boost')) {
      return <Zap size={16} color={colors.warning} />;
    }
    
    // Swap-related icons
    if (lowerTitle.includes('swap') || lowerTitle.includes('alternative')) {
      return <ShoppingCart size={16} color={colors.info} />;
    }
    
    // Health-related icons
    if (lowerTitle.includes('clear skin') || lowerTitle.includes('skin')) {
      return <Sparkles size={16} color={colors.success} />;
    }
    
    // Default icons
    if (lowerTitle.includes('tip') || lowerTitle.includes('coach')) {
      return <Star size={16} color={colors.warning} />;
    }
    
    return <Target size={16} color={colors.info} />;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]>
      <View style={styles.gradientContainer} pointerEvents="none">
        <LinearGradient
          colors={["#4EC9F5", "#7ED9CF", "#F9BFC9", "#FF9E57"]}
          locations={[0, 0.4, 0.72, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradientFill}
        />
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1600&auto=format&fit=crop' }}
          style={styles.grainOverlay}
          resizeMode="cover"
        />
      </View>

      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: 'transparent' }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={[styles.retroHeaderBanner, { backgroundColor: isDarkMode ? '#1E1E2E' : Colors.retroCreamWhite }]}>
          <View style={styles.retroGradientOverlay} />
          <View style={styles.retroHeaderContent}>
            <View style={styles.retroTitleContainer}>

              <Text style={[styles.retroMagazineTitle, { color: isDarkMode ? '#D9D9D9' : Colors.retroCharcoalBlack }]}>Ask InIt</Text>
              <View style={[styles.retroSubtitleDivider, { backgroundColor: Colors.retroPink }]} />
            </View>

            {profile.hasCompletedQuiz && (
              <View style={[styles.retroPersonalizationPill, { backgroundColor: Colors.retroNeonTurquoise }]}>
                <Heart size={12} color={Colors.white} />
                <Text style={[styles.retroPersonalizationText, { color: Colors.white }]}>Personalized for your goals</Text>
              </View>
            )}
            

            

          </View>
        </View>

        {/* Full-screen Voice Mode Overlay */}
        {isVoiceModeActive && (
          <Animated.View 
            style={[
              styles.fullScreenVoiceModeOverlay,
              {
                backgroundColor: isDarkMode ? '#1E1E2E' : Colors.retroCreamWhite,
                opacity: voiceModeBubbleAnim,
              },
            ]}
          >
            <Animated.View 
              style={[
                styles.fullScreenVoiceBubble,
                {
                  transform: [
                    {
                      scale: voiceModeBubbleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                    {
                      translateY: voiceModeBubbleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.fullScreenVoiceIcon, { backgroundColor: '#FF3B30' + '20', borderColor: '#FF3B30' + '40' }]}>
                <Mic size={32} color={'#FF3B30'} />
              </View>
              <Text style={[styles.fullScreenVoiceTitle, { color: isDarkMode ? '#D9D9D9' : Colors.retroCharcoalBlack }]}>InIt is Listening</Text>
              <Text style={[styles.fullScreenVoiceSubtitle, { color: isDarkMode ? '#5F5F5F' : Colors.retroSlateGray }]}>Ask me anything about nutrition and wellness</Text>
              
              {/* Animated Sound Waves */}
              <View style={styles.fullScreenSoundWavesContainer}>
                {soundWaveAnims.map((anim, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.fullScreenSoundWave,
                      {
                        backgroundColor: '#FF3B30',
                        height: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [6, 24 + (index % 3) * 8],
                        }),
                        opacity: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.4, 1],
                        }),
                        transform: [
                          {
                            scaleY: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 1.3],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
              
              <TouchableOpacity 
                style={[styles.fullScreenCloseButton, { backgroundColor: isDarkMode ? '#2A2A2A' : Colors.white }]}
                onPress={handleVoiceModeToggle}
                activeOpacity={0.8}
              >
                <X size={20} color={isDarkMode ? '#D9D9D9' : Colors.retroCharcoalBlack} />
                <Text style={[styles.fullScreenCloseButtonText, { color: isDarkMode ? '#D9D9D9' : Colors.retroCharcoalBlack }]}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}

        <ScrollView 
          ref={scrollViewRef}
          style={[styles.messagesContainer, { backgroundColor: 'transparent' }]}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && !isVoiceModeActive && (
            <View style={styles.retroQuickQuestionsSection}>
              {/* Empty State with Coach Image */}
              <View style={styles.emptyStateContainer}>
                <Image 
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/e99af0hvgm7p4qmwrkbmj' }}
                  style={styles.coachImage}
                  resizeMode="contain"
                />
                <Text style={[styles.coachText, { color: isDarkMode ? '#D9D9D9' : Colors.retroCharcoalBlack }]}>I'm InIt, your personal nutrition coach</Text>
              </View>

              <View style={styles.retroQuestionsGrid}>
                {quickQuestions.map((question, index) => {
                  const techColors = [Colors.retroNeonTurquoise, Colors.retroPink, Colors.retroDeepIndigo];
                  const accentColor = techColors[index % techColors.length];
                  
                  // Create shimmer effect for gradient bars
                  const shimmerTranslateX = shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 100],
                  });
                  
                  return (
                    <Animated.View
                      key={question.id}
                      style={[
                        {
                          opacity: fadeAnim,
                          transform: [
                            {
                              translateY: slideAnim,
                            },
                          ],
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={[styles.retroQuestionCard, { backgroundColor: isDarkMode ? '#2E294E' : Colors.white, borderLeftColor: accentColor }]}
                        onPress={() => handleQuickQuestion(question.text)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.retroQuestionGradient, { backgroundColor: accentColor }]}>
                          <Animated.View
                            style={[
                              styles.shimmerOverlay,
                              {
                                backgroundColor: Colors.white,
                                transform: [{ translateX: shimmerTranslateX }],
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.retroQuestionContent}>
                          <View style={[styles.retroQuestionIcon, { backgroundColor: accentColor + '20' }]}>
                            {question.icon}
                          </View>
                          <Text style={[styles.retroQuestionTitle, { color: isDarkMode ? '#D9D9D9' : Colors.retroCharcoalBlack }]}>{question.text}</Text>
                          <Text style={[styles.retroQuestionSubtext, { color: isDarkMode ? '#5F5F5F' : Colors.retroSlateGray }]}>Wellness insight</Text>
                        </View>
                        <Animated.View 
                          style={[
                            styles.retroQuestionArrow, 
                            { backgroundColor: accentColor },
                            {
                              transform: [
                                {
                                  scale: rippleAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.1],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          <ArrowRight size={14} color={Colors.white} />
                        </Animated.View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          )}

          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.isUser ? styles.userMessage : styles.aiMessage,
              ]}
            >
              {message.isUser ? (
                <View style={styles.userMessageBubble}>
                  <Text style={styles.userMessageText}>{message.text}</Text>
                </View>
              ) : (
                <View style={[styles.aiResponseCard, { backgroundColor: Colors.white, borderColor: colors.textTertiary }]}>
                  {(() => {
                    // Check if this is a recipe response or general answer
                    if (message.isRecipeResponse === false) {
                      // Render as general answer
                      return (
                        <>
                          <View style={styles.responseHeader}>
                            <Text style={[styles.responseTitle, { color: colors.textPrimary }]}>
                              {message.questionGist || 'InIt AI Response'}
                            </Text>
                            {profile.hasCompletedQuiz && (
                              <View style={[styles.goalBadge, { backgroundColor: colors.primary }]}>
                                <Text style={[styles.goalBadgeText, { color: colors.white }]}>For your goal: {getPersonalizationText()}</Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.generalAnswerSections}>
                            {parseGeneralAnswer(message.text).map((section, index) => (
                              <View key={index} style={[styles.generalAnswerSection, { backgroundColor: colors.backgroundSecondary }]}>
                                <View style={[styles.generalAnswerGradient, { backgroundColor: colors.primary }]} />
                                <Text style={[styles.generalSectionTitle, { color: colors.primary }]}>
                                  {section.title}
                                </Text>
                                <Text style={[styles.generalSectionContent, { color: colors.textPrimary }]}>
                                  {section.content.replace(/\*+/g, '')}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </>
                      );
                    }
                    
                    // Render as recipe response (existing logic)
                    const sections = parseAIResponse(message.text);
                    const mainTitle = sections.find(s => s.type === 'title')?.title;
                    const contentSections = sections.filter(s => s.type !== 'title');
                    
                    return (
                      <>
                        <View style={styles.responseHeader}>
                          <Text style={[styles.responseTitle, { color: colors.textPrimary }]}>
                            {message.questionGist || mainTitle || 'InIt AI Response'}
                          </Text>
                          {profile.hasCompletedQuiz && (
                            <View style={[styles.goalBadge, { backgroundColor: colors.primary }]}>
                              <Text style={[styles.goalBadgeText, { color: colors.white }]}>For your goal: {getPersonalizationText()}</Text>
                            </View>
                          )}
                        </View>
                        
                        <View style={styles.sectionCardsContainer}>
                          {contentSections.map((section, index) => {
                            if (section.type === 'tip') {
                              return (
                                <View key={index} style={[styles.coachTipCard, { backgroundColor: colors.warning + '20', borderLeftColor: colors.warning }]}>
                                  <View style={[styles.coachTipGradient, { backgroundColor: colors.warning + '10' }]} />
                                  <View style={styles.cardHeader}>
                                    <View style={[styles.cardIconContainer, { backgroundColor: colors.warning + '20' }]}>
                                      <Star size={16} color={colors.warning} />
                                    </View>
                                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Coach Insight</Text>
                                  </View>
                                  <Text style={[styles.coachTipText, { color: colors.textPrimary }]}>{section.content[0]?.description || section.content.join(' ')}</Text>
                                </View>
                              );
                            }
                            
                            const isExpanded = expandedMessages.has(message.id);
                            const visibleRecipes = getVisibleRecipes(section.content, message.id, isExpanded);
                            const hasMoreOptions = section.content.length > 3 && !isExpanded;
                            
                            return (
                              <View key={index}>
                                <View style={styles.recipeCardsGrid}>
                                  {visibleRecipes.map((recipe, itemIndex) => {
                                    // Staggered animation delay for each card
                                    const cardDelay = itemIndex * 150;
                                    
                                    return (
                                      <Animated.View 
                                        key={itemIndex} 
                                        style={[
                                          styles.floatingRecipeCard, 
                                          { backgroundColor: colors.surface, borderColor: colors.textTertiary },
                                          {
                                            opacity: fadeAnim,
                                            transform: [
                                              {
                                                translateY: slideAnim.interpolate({
                                                  inputRange: [0, 50],
                                                  outputRange: [0, 50 + cardDelay / 10],
                                                }),
                                              },
                                            ],
                                          },
                                        ]}
                                      >
                                        <View style={[styles.recipeCardGradient, { backgroundColor: Colors.retroNeonTurquoise }]}>
                                          <Animated.View
                                            style={[
                                              styles.shimmerOverlay,
                                              {
                                                backgroundColor: Colors.retroPink,
                                                transform: [
                                                  {
                                                    translateX: shimmerAnim.interpolate({
                                                      inputRange: [0, 1],
                                                      outputRange: [-200, 200],
                                                    }),
                                                  },
                                                ],
                                              },
                                            ]}
                                          />
                                        </View>
                                        <View style={styles.recipeCardContent}>
                                          <Text style={[styles.recipeCardTitle, { color: colors.textPrimary }]}>{recipe.name}</Text>
                                          <Text style={[styles.recipeCardDescription, { color: colors.textSecondary }]}>{recipe.description}</Text>
                                          <View style={[styles.recipeDivider, { backgroundColor: colors.textTertiary }]} />
                                          <TouchableOpacity 
                                            style={[styles.viewRecipeButton, { backgroundColor: Colors.retroNeonTurquoise }]}
                                            onPress={() => handleViewRecipe(recipe)}
                                            activeOpacity={0.8}
                                          >
                                            <Animated.View
                                              style={[
                                                styles.rippleEffect,
                                                {
                                                  opacity: rippleAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0, 0.3],
                                                  }),
                                                  transform: [
                                                    {
                                                      scale: rippleAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0, 2],
                                                      }),
                                                    },
                                                  ],
                                                },
                                              ]}
                                            />
                                            <Text style={[styles.viewRecipeButtonText, { color: colors.white }]}>View Recipe</Text>
                                            <ArrowRight size={14} color={colors.white} />
                                          </TouchableOpacity>
                                        </View>
                                      </Animated.View>
                                    );
                                  })}
                                </View>
                                {hasMoreOptions && (
                                  <TouchableOpacity 
                                    style={[styles.showMoreButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                                    onPress={() => handleShowMoreOptions(message.id)}
                                  >
                                    <Text style={[styles.showMoreButtonText, { color: colors.primary }]}>Show more options</Text>
                                    <ArrowRight size={16} color={colors.primary} />
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          })}
                        </View>

                      </>
                    );
                  })()
                  }
                </View>
              )}
            </View>
          ))}
          
          {isLoading && (
            <View style={[styles.messageContainer, styles.aiMessage]}>
              <View style={styles.messageHeader}>
                <View style={[styles.messageAvatar, { backgroundColor: Colors.retroNeonTurquoise }]}>
                  <MessageCircle size={16} color={colors.white} />
                </View>
                <Text style={[styles.messageSender, { color: colors.textSecondary }]}>InIt AI</Text>
              </View>
              <View style={[styles.loadingContainer, { backgroundColor: Colors.white }]}>
                <View style={styles.typingDotsContainer}>
                  <Animated.View
                    style={[
                      styles.typingDot,
                      {
                        backgroundColor: Colors.retroNeonTurquoise,
                        opacity: typingDotsAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1],
                        }),
                        transform: [
                          {
                            scale: typingDotsAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.8, 1.2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.typingDot,
                      {
                        backgroundColor: Colors.retroNeonTurquoise,
                        opacity: typingDotsAnim.interpolate({
                          inputRange: [0, 0.33, 1],
                          outputRange: [0.3, 1, 0.3],
                        }),
                        transform: [
                          {
                            scale: typingDotsAnim.interpolate({
                              inputRange: [0, 0.33, 1],
                              outputRange: [0.8, 1.2, 0.8],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.typingDot,
                      {
                        backgroundColor: Colors.retroNeonTurquoise,
                        opacity: typingDotsAnim.interpolate({
                          inputRange: [0, 0.66, 1],
                          outputRange: [0.3, 1, 0.3],
                        }),
                        transform: [
                          {
                            scale: typingDotsAnim.interpolate({
                              inputRange: [0, 0.66, 1],
                              outputRange: [0.8, 1.2, 0.8],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: 'transparent', borderTopColor: Colors.retroSoftGray + '50' }]}>
          {showSuggestions && messages.length === 0 && (
            <View style={styles.retroSuggestionChips}>
              {suggestionChips.map((chip, index) => {
                const techColors = [Colors.retroNeonTurquoise, Colors.retroPink, Colors.retroDeepIndigo, Colors.retroNeonTurquoise];
                const chipColor = techColors[index % techColors.length];
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.retroSuggestionChip, { backgroundColor: chipColor + '20', borderColor: chipColor }]}
                    onPress={() => handleSuggestionChip(chip)}
                    activeOpacity={0.7}
                  >
                    <Animated.View
                      style={[
                        styles.chipRipple,
                        {
                          backgroundColor: chipColor,
                          opacity: rippleAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.2],
                          }),
                          transform: [
                            {
                              scale: rippleAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                    <Text style={[styles.retroSuggestionChipText, { color: chipColor }]}>{chip}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          
          {/* Combined input bar with text input and send button */}
          <View style={[styles.combinedInputWrapper, { backgroundColor: Colors.white, borderColor: '#E0E0E0' }]}>
            <TextInput
              ref={textInputRef}
              style={[styles.combinedTextInput, { color: isDarkMode ? '#D9D9D9' : Colors.retroCharcoalBlack }]}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (text.length > 0) {
                  setShowSuggestions(false);
                } else if (messages.length === 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Ask anything"
              placeholderTextColor={isDarkMode ? '#5F5F5F' : '#999999'}
              multiline
              maxLength={500}
              editable={!isLoading}
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 150);
              }}
            />
            <TouchableOpacity
              style={[
                styles.combinedSendButton,
                { backgroundColor: Colors.white },
                (!inputText.trim() || isLoading) && [styles.combinedSendButtonDisabled, { backgroundColor: isDarkMode ? '#5F5F5F' : Colors.retroSoftGray }],
              ]}
              onPress={() => {
                // Tap ripple effect for send button
                Animated.sequence([
                  Animated.timing(rippleAnim, {
                    toValue: 1,
                    duration: 200,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                  }),
                  Animated.timing(rippleAnim, {
                    toValue: 0,
                    duration: 150,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                  }),
                ]).start();
                
                setShowSuggestions(false);
                sendMessage(inputText);
              }}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.sendButtonRipple,
                  {
                    backgroundColor: Colors.white,
                    opacity: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.3],
                    }),
                    transform: [
                      {
                        scale: rippleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1.5],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={[styles.combinedSendIcon, { backgroundColor: isDarkMode ? '#D9D9D9' : '#000000' }]}>
                <Text style={[styles.combinedSendIconText, { color: Colors.white }]}>▶</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        <RecipeModal 
          visible={showRecipeModal}
          recipe={selectedRecipe}
          onClose={() => setShowRecipeModal(false)}
          onAddToGroceryList={handleAddToGroceryList}
          isGenerating={isGeneratingRecipe}
        />
        

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RecipeModal({ visible, recipe, onClose, onAddToGroceryList, isGenerating = false }: RecipeModalProps) {
  const { colors } = useTheme();
  if (!recipe) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.textTertiary }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{recipe.name}</Text>
          <TouchableOpacity style={[styles.modalCloseButton, { backgroundColor: colors.backgroundSecondary }]} onPress={onClose}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modalSection}>
            <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>Description</Text>
            <Text style={[styles.modalSectionText, { color: colors.textSecondary }]}>{recipe.description}</Text>
          </View>
          
          {isGenerating ? (
            <View style={styles.generatingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.generatingText, { color: colors.textSecondary }]}>InIt AI is creating your personalized recipe...</Text>
            </View>
          ) : (
            <>
              {recipe.ingredients && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>Ingredients</Text>
                  {recipe.ingredients.map((ingredient, index) => (
                    <View key={index} style={styles.ingredientItem}>
                      <View style={[styles.ingredientBullet, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.ingredientText, { color: colors.textPrimary }]}>{ingredient}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {recipe.steps && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>Instructions</Text>
                  {recipe.steps.map((step, index) => (
                    <View key={index} style={styles.stepItem}>
                      <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.stepNumberText, { color: colors.white }]}>{index + 1}</Text>
                      </View>
                      <Text style={[styles.stepText, { color: colors.textPrimary }]}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {recipe.nutrition && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>Nutrition Info</Text>
                  {typeof recipe.nutrition === 'string' ? (
                    <Text style={[styles.modalSectionText, { color: colors.textSecondary }]}>{recipe.nutrition}</Text>
                  ) : (
                    <View style={styles.nutritionGrid}>
                      <View style={styles.nutritionRow}>
                        <View style={[styles.nutritionItem, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>Calories</Text>
                          <Text style={[styles.nutritionValue, { color: colors.textPrimary }]}>{recipe.nutrition.calories}</Text>
                        </View>
                        <View style={[styles.nutritionItem, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>Protein</Text>
                          <Text style={[styles.nutritionValue, { color: colors.textPrimary }]}>{recipe.nutrition.protein}</Text>
                        </View>
                      </View>
                      <View style={styles.nutritionRow}>
                        <View style={[styles.nutritionItem, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>Carbs</Text>
                          <Text style={[styles.nutritionValue, { color: colors.textPrimary }]}>{recipe.nutrition.carbs}</Text>
                        </View>
                        <View style={[styles.nutritionItem, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>Fat</Text>
                          <Text style={[styles.nutritionValue, { color: colors.textPrimary }]}>{recipe.nutrition.fat}</Text>
                        </View>
                      </View>
                      <View style={styles.nutritionRow}>
                        <View style={[styles.nutritionItem, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>Fiber</Text>
                          <Text style={[styles.nutritionValue, { color: colors.textPrimary }]}>{recipe.nutrition.fiber}</Text>
                        </View>
                        <View style={[styles.nutritionItem, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>Sugar</Text>
                          <Text style={[styles.nutritionValue, { color: colors.textPrimary }]}>{recipe.nutrition.sugar}</Text>
                        </View>
                      </View>
                      <View style={styles.nutritionRow}>
                        <View style={[styles.nutritionItem, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>Sodium</Text>
                          <Text style={[styles.nutritionValue, { color: colors.textPrimary }]}>{recipe.nutrition.sodium}</Text>
                        </View>
                        <View style={[styles.nutritionItem, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>Servings</Text>
                          <Text style={[styles.nutritionValue, { color: colors.textPrimary }]}>{recipe.nutrition.servings}</Text>
                        </View>
                      </View>
                      {recipe.nutrition.summary && (
                        <View style={[styles.nutritionSummary, { backgroundColor: colors.primary + '20', borderLeftColor: colors.primary }]}>
                          <Text style={[styles.nutritionSummaryTitle, { color: colors.primary }]}>Nutritional Benefits</Text>
                          <Text style={[styles.nutritionSummaryText, { color: colors.textPrimary }]}>{recipe.nutrition.summary}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
        
        <View style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.textTertiary }]}>
          <TouchableOpacity 
            style={[
              styles.addToGroceryButton, 
              { backgroundColor: colors.primary },
              (isGenerating || !recipe.ingredients) && [styles.addToGroceryButtonDisabled, { backgroundColor: colors.textTertiary }]
            ]}
            onPress={() => recipe.ingredients && onAddToGroceryList(recipe.ingredients)}
            disabled={isGenerating || !recipe.ingredients}
          >
            <Plus size={18} color={colors.white} />
            <Text style={[styles.addToGroceryButtonText, { color: colors.white }]}>Add Ingredients to Grocery List</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  brandingHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.backgroundSecondary,
  },
  brandingText: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.05)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerCard: {
    backgroundColor: Colors.gray100,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray700,
    textAlign: "center",
  },
  quickQuestionsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  quickSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  quickQuestionCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  questionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    width: '100%',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray600,
  },
  messageText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.gray600,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 52,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  // New luxury styles for improved UI
  headerBanner: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8fafc',
    opacity: 0.3,
  },
  headerContent: {
    alignItems: 'center',
  },
  coachTagline: {
    fontSize: 17,
    color: Colors.gray600,
    marginTop: 6,
    fontWeight: '400',
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },
  personalizationBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
  quickQuestionsGrid: {
    gap: 8,
  },
  quickQuestionPill: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    position: 'relative',
    overflow: 'hidden',
  },
  questionIconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  questionTextPill: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  userMessageBubble: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  userMessageText: {
    fontSize: 14,
    color: Colors.white,
    lineHeight: 20,
  },
  aiResponseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    position: 'relative',
    overflow: 'hidden',
  },
  responseHeader: {
    marginBottom: 16,
  },
  responseTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  goalBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  goalBadgeText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '600',
  },
  // New luxury sectioned card styles
  sectionCardsContainer: {
    gap: 16,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardGradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fcfcfd',
    opacity: 0.5,
  },
  cardGradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  coachTipCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  coachTipGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    letterSpacing: -0.1,
  },
  cardContent: {
    gap: 8,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  luxuryDivider: {
    width: 2,
    height: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
    marginTop: 3,
    marginRight: 12,
    flexShrink: 0,
    borderRadius: 1,
  },
  cardItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  // Legacy styles (keeping for compatibility)
  contentSection: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 8,
  },
  bulletPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 8,
    marginRight: 12,
  },
  contentText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  coachTipSection: {
    backgroundColor: Colors.warning + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  coachTipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
    marginLeft: 8,
  },
  coachTipText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginTop: 8,
    fontStyle: 'italic',
    fontWeight: '400',
    letterSpacing: 0.1,
  },

  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  suggestionChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionChipText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  // New floating recipe card styles
  recipeCardsGrid: {
    gap: 12,
  },
  floatingRecipeCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    position: 'relative',
    overflow: 'hidden',
  },
  recipeCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  recipeCardContent: {
    padding: 20,
  },
  recipeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  recipeCardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  recipeDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: 16,
  },
  viewRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  viewRecipeButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
    marginRight: 6,
    letterSpacing: 0.1,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 16,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSection: {
    marginVertical: 16,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  modalSectionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
    marginRight: 12,
  },
  ingredientText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  addToGroceryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addToGroceryButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: 8,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  showMoreButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginRight: 8,
    letterSpacing: 0.1,
  },
  generatingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  generatingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  addToGroceryButtonDisabled: {
    backgroundColor: Colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  // Nutrition grid styles
  nutritionGrid: {
    gap: 12,
  },
  nutritionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nutritionItem: {
    flex: 1,
    backgroundColor: Colors.gray100,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nutritionValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  nutritionSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  nutritionSummaryTitle: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: 8,
  },
  nutritionSummaryText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // General answer styles
  generalAnswerContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  generalAnswerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
    opacity: 0.8,
  },
  generalAnswerText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  // General answer sections styles
  generalAnswerSections: {
    gap: 16,
  },
  generalAnswerSection: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  generalSectionTitle: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  generalSectionContent: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  
  // Retro Tech Pop Styles - Modern Magazine Aesthetic
  retroHeaderBanner: {
    backgroundColor: Colors.retroCreamWhite,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: Colors.retroSoftGray + '50',
    position: 'relative',
    overflow: 'hidden',
  },
  retroGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    opacity: 0.4,
  },
  retroHeaderContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  retroTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  retroIconAccent: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.retroNeonTurquoise,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: Colors.retroNeonTurquoise,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retroMagazineTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.retroCharcoalBlack,
    letterSpacing: -1.2,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  retroSubtitleDivider: {
    width: 60,
    height: 3,
    backgroundColor: Colors.retroPink,
    borderRadius: 2,
    marginLeft: 12,
  },
  retroMagazineSubtitle: {
    fontSize: 18,
    color: Colors.retroSlateGray,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  retroTagline: {
    fontSize: 14,
    color: Colors.retroSlateGray,
    fontStyle: 'italic',
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  retroPersonalizationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.retroNeonTurquoise,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: Colors.retroNeonTurquoise,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  retroPersonalizationText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  
  // Retro Conversation Bubble
  retroConversationBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 12,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  retroBubbleExpandingBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    transformOrigin: 'right center', // Expand from the microphone position
  },
  retroConversationText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
    letterSpacing: 0.3,
    flex: 1,
  },
  retroMicrophoneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  
  // Retro Tech Pop Quick Questions Section
  retroQuickQuestionsSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  retroSectionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  retroSectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.retroCharcoalBlack,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  retroSectionUnderline: {
    width: 80,
    height: 2,
    backgroundColor: Colors.retroPink,
    borderRadius: 1,
  },
  retroQuestionsGrid: {
    gap: 16,
  },
  retroQuestionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderLeftWidth: 4,
    borderLeftColor: Colors.retroNeonTurquoise,
    position: 'relative',
    overflow: 'hidden',
  },
  retroQuestionGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: Colors.retroNeonTurquoise,
  },
  retroQuestionContent: {
    flex: 1,
    marginRight: 16,
  },
  retroQuestionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.retroNeonTurquoise + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.retroNeonTurquoise + '40',
  },
  retroQuestionTitle: {
    fontSize: 16,
    color: Colors.retroCharcoalBlack,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
    marginBottom: 4,
  },
  retroQuestionSubtext: {
    fontSize: 12,
    color: Colors.retroSlateGray,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  retroQuestionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.retroNeonTurquoise,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.retroNeonTurquoise,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Retro Suggestion Chips
  retroSuggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  retroSuggestionChip: {
    backgroundColor: Colors.retroNeonTurquoise + '20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.retroNeonTurquoise,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  retroSuggestionChipText: {
    fontSize: 13,
    color: Colors.retroNeonTurquoise,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  
  // Retro Tech Pop Input Wrapper
  retroInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 40,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: Colors.retroNeonTurquoise,
  },
  retroTextInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.retroCharcoalBlack,
    maxHeight: 70,
    paddingVertical: 4,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  retroSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.retroNeonTurquoise,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: Colors.retroNeonTurquoise,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  retroSendButtonDisabled: {
    backgroundColor: Colors.retroSoftGray,
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Animation styles
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 50,
    opacity: 0.3,
  },
  rippleEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    backgroundColor: Colors.white,
  },
  chipRipple: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  sendButtonRipple: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
    shadowColor: Colors.retroNeonTurquoise,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Full-screen Voice Mode Styles
  fullScreenVoiceModeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fullScreenVoiceBubble: {
    backgroundColor: Colors.white,
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    minWidth: 320,
    maxWidth: 360,
    borderWidth: 3,
    borderColor: '#FF3B30' + '30',
  },
  fullScreenVoiceIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30' + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#FF3B30' + '40',
  },
  fullScreenVoiceTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.retroCharcoalBlack,
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  fullScreenVoiceSubtitle: {
    fontSize: 16,
    color: Colors.retroSlateGray,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  fullScreenSoundWavesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
    marginBottom: 32,
  },
  fullScreenSoundWave: {
    width: 3,
    backgroundColor: '#FF3B30',
    borderRadius: 2,
    minHeight: 4,
  },
  fullScreenCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.retroSoftGray,
  },
  fullScreenCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.retroCharcoalBlack,
    marginLeft: 8,
    letterSpacing: 0.1,
  },
  
  // Empty State Styles
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  coachImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  coachText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.retroCharcoalBlack,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  
  // Combined Input Bar Styles
  combinedInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 25,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  combinedTextInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.retroCharcoalBlack,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 80,
    fontWeight: '400',
  },
  combinedMicButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  combinedSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  combinedSendButtonDisabled: {
    backgroundColor: Colors.retroSoftGray,
    shadowOpacity: 0,
    elevation: 0,
  },
  combinedSendIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  combinedSendIconText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '600',
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  gradientFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  grainOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
  },
});