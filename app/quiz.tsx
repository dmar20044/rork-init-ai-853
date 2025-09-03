import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Animated,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { 
  ChevronRight, 
  Target, 
  Heart, 
  Utensils,
  Sparkles,
  CheckCircle,
  TrendingUp,
  Mail,
  Shield,
  X,
  Star,
  Users,
  Bell,
  Gift,
  CreditCard
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useUser, UserGoals } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import * as StoreReview from 'expo-store-review';
import * as Notifications from 'expo-notifications';

interface QuizStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  type: 'input' | 'single-select' | 'welcome' | 'complete' | 'email-auth' | 'otp-verify' | 'privacy-trust' | 'instruction' | 'loading' | 'rating-request' | 'notifications' | 'referral-code' | 'free-trial' | 'subscription-selection' | 'tags-input';
  options?: {
    id: string;
    label: string;
    description?: string;
  }[];
}

const quizSteps: QuizStep[] = [
  {
    id: 'welcome',
    title: 'Smart food choices, made personal',
    subtitle: '',
    icon: <Sparkles size={48} color={Colors.primary} />,
    type: 'welcome',
  },
  {
    id: 'generating-questions',
    title: 'Generating your personalized questions',
    subtitle: 'Please wait while we create your custom experience...',
    icon: <Sparkles size={48} color={Colors.primary} />,
    type: 'loading',
  },
  {
    id: 'bodyGoal',
    title: 'What\'s your body goal?',
    subtitle: 'Choose what best describes your current objective',
    icon: <Target size={48} color={Colors.primary} />,
    type: 'single-select',
    options: [
      { id: 'lose-weight', label: 'Lose Weight', description: 'I want to shed some pounds' },
      { id: 'slightly-lose-weight', label: 'Slightly Lose Weight', description: 'I want to lose a few pounds gradually' },
      { id: 'maintain-weight', label: 'Maintain Weight', description: 'I\'m happy with my current weight' },
      { id: 'slightly-gain-weight', label: 'Slightly Gain Weight', description: 'I want to gain a few pounds gradually' },
      { id: 'gain-weight', label: 'Gain Weight', description: 'I want to build mass' },
    ],
  },
  {
    id: 'healthGoal',
    title: 'What\'s your health focus?',
    subtitle: 'Select your primary nutritional priority',
    icon: <Heart size={48} color={Colors.primary} />,
    type: 'single-select',
    options: [
      { id: 'low-sugar', label: 'Low Sugar', description: 'Minimize sugar intake' },
      { id: 'high-protein', label: 'High Protein', description: 'Maximize protein consumption' },
      { id: 'low-fat', label: 'Low Fat', description: 'Reduce fat intake' },
      { id: 'keto', label: 'Keto', description: 'High fat, low carb lifestyle' },
      { id: 'balanced', label: 'Balanced', description: 'Well-rounded nutrition' },
    ],
  },
  {
    id: 'dietGoal',
    title: 'What\'s your diet preference?',
    subtitle: 'Choose your dietary approach',
    icon: <Utensils size={48} color={Colors.primary} />,
    type: 'single-select',
    options: [
      { id: 'whole-foods', label: 'Whole Foods', description: 'Unprocessed, natural foods' },
      { id: 'vegan', label: 'Vegan', description: 'Plant-based only' },
      { id: 'carnivore', label: 'Carnivore', description: 'Animal products focused' },
      { id: 'gluten-free', label: 'Gluten Free', description: 'No gluten-containing foods' },
      { id: 'vegetarian', label: 'Vegetarian', description: 'No meat, but dairy/eggs OK' },
      { id: 'balanced', label: 'Balanced', description: 'Everything in moderation' },
    ],
  },
  {
    id: 'dietary-restrictions',
    title: 'Any allergies, intolerances, or ingredients to avoid?',
    subtitle: 'Add items like peanuts, lactose, shellfish, seed oils, artificial sweeteners, etc. You can skip if none.',
    icon: <Utensils size={48} color={Colors.primary} />,
    type: 'tags-input',
  },
  {
    id: 'lifeGoal',
    title: 'What would you like to accomplish?',
    subtitle: 'Select your main motivation',
    icon: <Sparkles size={48} color={Colors.primary} />,
    type: 'single-select',
    options: [
      { id: 'eat-healthier', label: 'Eat and Live Healthier', description: 'Overall wellness improvement' },
      { id: 'boost-energy', label: 'Boost My Energy and Mood', description: 'Feel more energetic daily' },
      { id: 'feel-better', label: 'Feel Better About My Body', description: 'Improve body confidence' },
      { id: 'clear-skin', label: 'Clear Up My Skin', description: 'Better skin through nutrition' },
    ],
  },

  {
    id: 'privacy-trust',
    title: 'Thank you for trusting us',
    subtitle: 'Now let\'s personalize InIt AI for you...',
    icon: <Shield size={48} color={Colors.primary} />,
    type: 'privacy-trust',
  },

  {
    id: 'rating-request',
    title: 'Be the first to rate us',
    subtitle: 'Help us build something amazing together',
    icon: <Sparkles size={48} color={Colors.primary} />,
    type: 'rating-request',
  },
  {
    id: 'notifications',
    title: 'Reach your goals with notifications',
    subtitle: 'Stay on track with personalized reminders',
    icon: <Bell size={48} color={Colors.primary} />,
    type: 'notifications',
  },
  {
    id: 'referral-code',
    title: 'Enter referral code (optional)',
    subtitle: 'You can skip this step',
    icon: <Gift size={48} color={Colors.primary} />,
    type: 'referral-code',
  },
  {
    id: 'save-progress',
    title: 'Save Your Progress',
    subtitle: 'Sign in with email to save your personalized profile',
    icon: <Mail size={48} color={Colors.primary} />,
    type: 'email-auth',
  },
  {
    id: 'verify-otp',
    title: 'Verify Your Email',
    subtitle: 'Enter the 6-digit code we sent to your email',
    icon: <Shield size={48} color={Colors.primary} />,
    type: 'otp-verify',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    subtitle: 'Your personalized health journey starts now',
    icon: <CheckCircle size={48} color={Colors.success} />,
    type: 'complete',
  },
  {
    id: 'free-trial',
    title: 'Secure your 3 day free trial',
    subtitle: 'Get unlimited access to all premium features',
    icon: <Star size={48} color={Colors.primary} />,
    type: 'free-trial',
  },
  {
    id: 'subscription-selection',
    title: 'Choose your plan',
    subtitle: 'After 3 days, your subscription will automatically renew at $8.99/month unless canceled at least 24 hours before the end of the trial.',
    icon: <Star size={48} color={Colors.primary} />,
    type: 'subscription-selection',
  },
];

function QuizScreen() {
  const { completeQuiz, updateProfile } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<{
    bodyGoal: string | null;
    healthGoal: string | null;
    dietGoal: string | null;
    lifeGoal: string | null;
    referralCode: string;
    selectedSubscription: string | null;
    dietaryRestrictions: string[];
  }>({
    bodyGoal: null,
    healthGoal: null,
    dietGoal: null,
    lifeGoal: null,
    referralCode: '',
    selectedSubscription: null,
    dietaryRestrictions: [],
  });
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const screenWidth = Dimensions.get('window').width;
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Sign-in modal state
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInOtp, setSignInOtp] = useState('');
  const [isSignInAuthenticating, setIsSignInAuthenticating] = useState(false);
  const [signInOtpError, setSignInOtpError] = useState('');
  const [isSignInVerifying, setIsSignInVerifying] = useState(false);
  const [showSignInOtpInput, setShowSignInOtpInput] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [signInResendCooldown, setSignInResendCooldown] = useState(0);

  const currentStepData = quizSteps[currentStep];
  const progress = (currentStep + 1) / quizSteps.length;

  const handleNext = () => {
    if (currentStep < quizSteps.length - 1) {
      // If entering the loading step, start the progress animation
      if (quizSteps[currentStep + 1].id === 'generating-questions') {
        setLoadingProgress(0);
        // Start loading animation after slide transition
        setTimeout(() => {
          const interval = setInterval(() => {
            setLoadingProgress(prev => {
              if (prev >= 100) {
                clearInterval(interval);
                return 100;
              }
              return prev + 2;
            });
          }, 50);
        }, 300);
      }
      
      Animated.timing(slideAnim, {
        toValue: -screenWidth,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(currentStep + 1);
        slideAnim.setValue(screenWidth);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(currentStep - 1);
        slideAnim.setValue(-screenWidth);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
    },
    onPanResponderMove: (evt, gestureState) => {
      slideAnim.setValue(gestureState.dx);
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dx } = gestureState;
      const threshold = screenWidth * 0.3;
      
      if (dx > threshold && currentStep > 0) {
        // Swipe right - go to previous step
        handlePrevious();
      } else if (dx < -threshold && currentStep < quizSteps.length - 1 && canProceed()) {
        // Swipe left - go to next step (only if can proceed)
        handleNext();
      } else {
        // Snap back to center
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });



  const handleSelectOption = (optionId: string) => {
    const stepId = currentStepData.id as keyof typeof answers;
    setAnswers(prev => ({ ...prev, [stepId]: optionId }));
  };

  const handleEmailAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsAuthenticating(true);
    try {
      console.log('[Quiz] Sending OTP to email:', email);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.error('[Quiz] Error sending OTP:', error);
        
        // Check if it's a rate limiting error
        if (error.message?.includes('For security purposes')) {
          const match = error.message.match(/after (\d+) seconds/);
          const seconds = match ? parseInt(match[1]) : 60;
          Alert.alert(
            'Please Wait', 
            `For security reasons, please wait ${seconds} seconds before requesting another code.`
          );
          setResendCooldown(seconds);
          startResendCooldown(seconds);
        } else {
          Alert.alert('Error', 'Failed to send verification code. Please try again.');
        }
        return;
      }

      console.log('[Quiz] OTP sent successfully');
      // Start cooldown for resend button
      setResendCooldown(60);
      startResendCooldown(60);
      handleNext();
    } catch (error) {
      console.error('[Quiz] Error in email auth:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const verifyOTPAutomatically = async (otpCode: string) => {
    if (otpCode.length !== 6) {
      setOtpError('');
      return;
    }

    setIsVerifying(true);
    setOtpError('');
    
    try {
      console.log('[Quiz] Auto-verifying OTP:', otpCode);
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      });

      if (error) {
        console.error('[Quiz] Error verifying OTP:', error);
        setOtpError('Invalid verification code. Please try again.');
        return;
      }

      console.log('[Quiz] OTP verified successfully:', data.user?.id);
      // Small delay to show success before proceeding
      setTimeout(() => {
        handleNext();
      }, 500);
    } catch (error) {
      console.error('[Quiz] Error in OTP verification:', error);
      setOtpError('Something went wrong. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOTPChange = (text: string) => {
    // Only allow numbers and limit to 6 digits
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(numericText);
    
    // Clear any previous error when user starts typing
    if (otpError) {
      setOtpError('');
    }
    
    // Auto-verify when 6 digits are entered
    if (numericText.length === 6) {
      verifyOTPAutomatically(numericText);
    }
  };

  const handleSignInEmailAuth = async () => {
    if (!signInEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsSignInAuthenticating(true);
    try {
      console.log('[Quiz] Attempting sign-in for email:', signInEmail);
      
      // Try to send OTP directly - Supabase will handle whether user exists
      const { error } = await supabase.auth.signInWithOtp({
        email: signInEmail.trim().toLowerCase(),
        options: {
          shouldCreateUser: false, // Don't create new user for sign-in
        },
      });

      if (error) {
        console.error('[Quiz] Error sending sign-in OTP:', error);
        
        // Check if it's a rate limiting error
        if (error.message?.includes('For security purposes')) {
          const match = error.message.match(/after (\d+) seconds/);
          const seconds = match ? parseInt(match[1]) : 60;
          Alert.alert(
            'Please Wait', 
            `For security reasons, please wait ${seconds} seconds before requesting another code.`
          );
          setSignInResendCooldown(seconds);
          startSignInResendCooldown(seconds);
          return;
        }
        
        // Check if it's a "user not found" error
        if (error.message?.toLowerCase().includes('user not found') || 
            error.message?.toLowerCase().includes('invalid login') ||
            error.message?.toLowerCase().includes('email not confirmed')) {
          Alert.alert(
            'No Account Found', 
            "No account found with this email. Please create an account first or check your email address.",
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert('Error', 'Failed to send verification code. Please try again.');
        }
        return;
      }

      console.log('[Quiz] Sign-in OTP sent successfully');
      // Start cooldown for resend button
      setSignInResendCooldown(60);
      startSignInResendCooldown(60);
      setShowSignInOtpInput(true);
    } catch (error) {
      console.error('[Quiz] Error in sign-in email auth:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSignInAuthenticating(false);
    }
  };

  const verifySignInOTPAutomatically = async (otpCode: string) => {
    if (otpCode.length !== 6) {
      setSignInOtpError('');
      return;
    }

    setIsSignInVerifying(true);
    setSignInOtpError('');
    
    try {
      console.log('[Quiz] Auto-verifying sign-in OTP:', otpCode);
      const { data, error } = await supabase.auth.verifyOtp({
        email: signInEmail.trim(),
        token: otpCode.trim(),
        type: 'email',
      });

      if (error) {
        console.error('[Quiz] Error verifying sign-in OTP:', error);
        setSignInOtpError('Invalid verification code. Please try again.');
        return;
      }

      console.log('[Quiz] Sign-in OTP verified successfully:', data.user?.id);
      
      // Close modal and navigate to main app
      setShowSignInModal(false);
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    } catch (error) {
      console.error('[Quiz] Error in sign-in OTP verification:', error);
      setSignInOtpError('Something went wrong. Please try again.');
    } finally {
      setIsSignInVerifying(false);
    }
  };

  const handleSignInOTPChange = (text: string) => {
    // Only allow numbers and limit to 6 digits
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
    setSignInOtp(numericText);
    
    // Clear any previous error when user starts typing
    if (signInOtpError) {
      setSignInOtpError('');
    }
    
    // Auto-verify when 6 digits are entered
    if (numericText.length === 6) {
      verifySignInOTPAutomatically(numericText);
    }
  };

  const startResendCooldown = (seconds: number) => {
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startSignInResendCooldown = (seconds: number) => {
    const interval = setInterval(() => {
      setSignInResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetSignInModal = () => {
    setSignInEmail('');
    setSignInOtp('');
    setSignInOtpError('');
    setShowSignInOtpInput(false);
    setIsSignInAuthenticating(false);
    setIsSignInVerifying(false);
    setSignInResendCooldown(0);
  };

  const handleComplete = async () => {
    try {
      console.log('[Quiz] Completing quiz with answers:', answers);
      const goals: UserGoals = {
        bodyGoal: answers.bodyGoal as UserGoals['bodyGoal'],
        healthGoal: answers.healthGoal as UserGoals['healthGoal'],
        dietGoal: answers.dietGoal as UserGoals['dietGoal'],
        lifeGoal: answers.lifeGoal as UserGoals['lifeGoal'],
      };
      const result = await completeQuiz({
        name: '',
        goals,
      });
      console.log('[Quiz] Quiz completed successfully:', result);
      if (answers.dietaryRestrictions.length > 0) {
        console.log('[Quiz] Saving dietary restrictions to profile:', answers.dietaryRestrictions);
        await updateProfile({ dietaryRestrictions: answers.dietaryRestrictions });
      }
      handleNext();
    } catch (error) {
      console.error('[Quiz] Error completing quiz:', error);
    }
  };

  const handleRateApp = async () => {
    try {
      console.log('[Quiz] Requesting app store review');
      
      if (Platform.OS === 'ios') {
        // Check if StoreReview is available
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          await StoreReview.requestReview();
          console.log('[Quiz] iOS review prompt shown');
        } else {
          console.log('[Quiz] StoreReview not available on this device');
          // Fallback: could open App Store URL
        }
      } else if (Platform.OS === 'android') {
        // For Android, you would typically use Google Play In-App Review
        // Since we're using Expo Go, we'll show a message
        Alert.alert(
          'Rate InIt AI',
          'Thank you for wanting to rate our app! Please visit the Google Play Store to leave a review.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        // Web platform
        Alert.alert(
          'Thank You!',
          'Thank you for your interest in rating our app! Your feedback means a lot to us.',
          [{ text: 'OK', style: 'default' }]
        );
      }
      
      // Continue to next step after rating attempt
      setTimeout(() => {
        handleNext();
      }, 1000);
    } catch (error) {
      console.error('[Quiz] Error requesting review:', error);
      // Continue anyway
      handleNext();
    }
  };

  const handleNotificationPermission = async (allow: boolean) => {
    try {
      console.log('[Quiz] Handling notification permission:', allow);
      
      if (allow && Platform.OS !== 'web') {
        // Request notification permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus === 'granted') {
          console.log('[Quiz] Notification permissions granted');
          
          // Configure notification behavior
          await Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
              shouldShowBanner: true,
              shouldShowList: true,
            }),
          });
          
          Alert.alert(
            'Notifications Enabled!',
            'You\'ll receive helpful reminders and updates to stay on track with your nutrition goals.',
            [{ text: 'Great!', style: 'default' }]
          );
        } else {
          console.log('[Quiz] Notification permissions denied');
          Alert.alert(
            'Notifications Disabled',
            'You can enable notifications later in your device settings if you change your mind.',
            [{ text: 'OK', style: 'default' }]
          );
        }
      } else if (allow && Platform.OS === 'web') {
        // Web notification handling
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('[Quiz] Web notification permissions granted');
            Alert.alert(
              'Notifications Enabled!',
              'You\'ll receive helpful reminders in your browser.',
              [{ text: 'Great!', style: 'default' }]
            );
          } else {
            console.log('[Quiz] Web notification permissions denied');
          }
        }
      } else {
        console.log('[Quiz] User declined notifications');
      }
      
      // Continue to next step
      setTimeout(() => {
        handleNext();
      }, allow ? 2000 : 500);
    } catch (error) {
      console.error('[Quiz] Error handling notification permission:', error);
      // Continue anyway
      handleNext();
    }
  };

  const handleStartFreeTrial = async () => {
    try {
      console.log('[Quiz] Starting free trial process');
      
      // In a real app, you would integrate with:
      // - RevenueCat for cross-platform subscriptions
      // - Expo In-App Purchases
      // - Stripe for web payments
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // Mobile: Would use in-app purchases
        Alert.alert(
          'Free Trial Started!',
          'Your 3-day free trial has begun. You now have access to all premium features!',
          [
            {
              text: 'Continue',
              style: 'default',
              onPress: () => handleNext()
            }
          ]
        );
      } else {
        // Web: Would redirect to payment processor
        Alert.alert(
          'Free Trial',
          'In the full app, this would start your free trial with payment processing.',
          [
            {
              text: 'Continue',
              style: 'default',
              onPress: () => handleNext()
            }
          ]
        );
      }
    } catch (error) {
      console.error('[Quiz] Error starting free trial:', error);
      Alert.alert(
        'Error',
        'There was an issue starting your free trial. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const canProceed = () => {
    switch (currentStepData.id) {
      case 'welcome':
        return true;

      case 'bodyGoal':
        return answers.bodyGoal !== null;
      case 'healthGoal':
        return answers.healthGoal !== null;
      case 'dietGoal':
        return answers.dietGoal !== null;
      case 'dietary-restrictions':
        return true;
      case 'privacy-trust':
        return true;
      case 'rating-request':
        return true;
      case 'notifications':
        return true;
      case 'referral-code':
        return true;
      case 'lifeGoal':
        return answers.lifeGoal !== null;
      case 'generating-questions':
        return loadingProgress >= 100;
      case 'save-progress':
        return email.trim().length > 0 && email.includes('@');
      case 'verify-otp':
        return otp.trim().length === 6 && !otpError && !isVerifying;
      case 'free-trial':
        return true;
      case 'subscription-selection':
        return answers.selectedSubscription !== null;
      case 'complete':
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStepData.type) {
      case 'welcome':
        return (
          <View style={styles.welcomeContent}>
            <View style={styles.brandContainer}>
              <Text style={styles.brandText}>InIt AI</Text>
              <Image 
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/32o8mj2lj8xq0awy1bj29' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeTitle}>{currentStepData.title}</Text>
              <TouchableOpacity style={styles.getStartedButton} onPress={handleNext}>
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.signInButton}
                onPress={() => {
                  resetSignInModal();
                  setShowSignInModal(true);
                }}
              >
                <Text style={styles.signInButtonText}>Already have an account? Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
        
      case 'email-auth':
        return (
          <View style={styles.authContent}>
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor={Colors.gray500}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>
        );

      case 'otp-verify':
        return (
          <View style={styles.authContent}>
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
            <Text style={styles.emailDisplay}>Sent to: {email}</Text>
            <TextInput
              style={[
                styles.textInput, 
                styles.otpInput,
                otpError ? styles.otpInputError : null,
                otp.length === 6 && !otpError && !isVerifying ? styles.otpInputSuccess : null
              ]}
              value={otp}
              onChangeText={handleOTPChange}
              placeholder="000000"
              placeholderTextColor={Colors.gray500}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textAlign="center"
              editable={!isVerifying}
            />
            {isVerifying && (
              <View style={styles.verifyingContainer}>
                <Text style={styles.verifyingText}>Verifying...</Text>
              </View>
            )}
            {otpError ? (
              <Text style={styles.errorText}>{otpError}</Text>
            ) : null}
            {otp.length === 6 && !otpError && !isVerifying ? (
              <Text style={styles.successText}>✓ Code verified successfully!</Text>
            ) : null}
            <TouchableOpacity 
              style={[styles.resendButton, resendCooldown > 0 && styles.resendButtonDisabled]}
              onPress={() => {
                if (resendCooldown > 0) return;
                setOtp('');
                handleEmailAuth();
              }}
              disabled={resendCooldown > 0}
            >
              <Text style={[styles.resendButtonText, resendCooldown > 0 && styles.resendButtonTextDisabled]}>
                {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'privacy-trust':
        return (
          <View style={styles.privacyContent}>
            <View style={styles.privacyIconContainer}>
              <View style={styles.privacyCircle}>
                <View style={styles.privacyInnerCircle}>
                  <View style={styles.handContainer}>
                    <Text style={styles.handEmoji}>🤝</Text>
                  </View>
                </View>
              </View>
            </View>
            <Text style={styles.privacyTitle}>{currentStepData.title}</Text>
            <Text style={styles.privacySubtitle}>{currentStepData.subtitle}</Text>
            
            <View style={styles.privacySecuritySection}>
              <View style={styles.lockIconContainer}>
                <Shield size={24} color={Colors.primary} />
              </View>
              <Text style={styles.privacySecurityTitle}>Your privacy and security matter to us.</Text>
              <Text style={styles.privacySecurityText}>
                We promise to always keep your{"\n"}personal information private and secure.
              </Text>
            </View>
          </View>
        );

      case 'instruction':
        if (currentStepData.id === 'instruction-scan') {
          return (
            <View style={styles.instructionContent}>
              <View style={styles.instructionImageContainer}>
                <View style={styles.phoneFrame}>
                  <View style={styles.phoneScreen}>
                    <View style={styles.scanningFrame}>
                      <View style={styles.cornerTopLeft} />
                      <View style={styles.cornerTopRight} />
                      <View style={styles.cornerBottomLeft} />
                      <View style={styles.cornerBottomRight} />
                    </View>
                    <View style={styles.productMockup}>
                      <View style={styles.productBox} />
                      <Text style={styles.productText}>Scan Me!</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.instructionTitle}>{currentStepData.title}</Text>
              <Text style={styles.instructionSubtitle}>{currentStepData.subtitle}</Text>
            </View>
          );
        } else if (currentStepData.id === 'instruction-score') {
          return (
            <View style={styles.instructionContent}>
              <View style={styles.instructionImageContainer}>
                <View style={styles.scoreFrame}>
                  <View style={styles.scoreScreen}>
                    <View style={styles.scoreCircleContainer}>
                      <View style={styles.scoreCircle}>
                        <Text style={styles.scoreNumber}>92.5</Text>
                        <Text style={styles.scoreOutOf}>/100</Text>
                      </View>
                      <Text style={styles.personalScoreLabel}>Personal Score</Text>
                    </View>
                    <View style={styles.scoreBreakdown}>
                      <View style={styles.baseScoreCard}>
                        <Text style={styles.baseScoreLabel}>BASE SCORE</Text>
                        <Text style={styles.baseScoreNumber}>83.5</Text>
                      </View>
                      <View style={styles.scorePlus}>
                        <Text style={styles.scorePlusText}>+9</Text>
                      </View>
                      <View style={styles.yourScoreCard}>
                        <Text style={styles.yourScoreLabel}>YOUR SCORE</Text>
                        <Text style={styles.yourScoreNumber}>92.5</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.instructionTitle}>{currentStepData.title}</Text>
              <Text style={styles.instructionSubtitle}>{currentStepData.subtitle}</Text>
            </View>
          );
        } else if (currentStepData.id === 'instruction-alternatives') {
          return (
            <View style={styles.instructionContent}>
              <View style={styles.instructionImageContainer}>
                <View style={styles.alternativesFrame}>
                  <View style={styles.alternativesScreen}>
                    <View style={styles.comparisonContainer}>
                      <View style={styles.productComparison}>
                        <View style={styles.goodProductContainer}>
                          <View style={styles.productImageGood}>
                            <View style={styles.hippeasPackage}>
                              <Text style={styles.hippeasText}>HIPPEAS</Text>
                              <Text style={styles.hippeasSubtext}>chickpea tortilla snacks</Text>
                            </View>
                          </View>
                          <Text style={styles.productLabel}>Good</Text>
                          <View style={styles.checkmarkContainer}>
                            <CheckCircle size={20} color={Colors.success} />
                          </View>
                        </View>
                        
                        <View style={styles.badProductContainer}>
                          <View style={styles.productImageBad}>
                            <View style={styles.laysPackage}>
                              <Text style={styles.laysText}>Lay&apos;s</Text>
                              <Text style={styles.laysSubtext}>Classic</Text>
                            </View>
                          </View>
                          <Text style={styles.productLabel}>Bad</Text>
                          <View style={styles.xmarkContainer}>
                            <X size={20} color={Colors.error} />
                          </View>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.alternativesTextContainer}>
                      <Text style={styles.alternativesMainText}>See <Text style={styles.healthyText}>healthy</Text> alternatives for you</Text>
                      <View style={styles.progressDots}>
                        <View style={styles.progressDot} />
                        <View style={styles.progressDot} />
                        <View style={[styles.progressDot, styles.progressDotActive]} />
                        <View style={styles.progressDot} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.instructionTitle}>{currentStepData.title}</Text>
              <Text style={styles.instructionSubtitle}>{currentStepData.subtitle}</Text>
            </View>
          );

        }
        return null;

      case 'loading':
        return (
          <View style={styles.loadingContent}>
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
            
            <View style={styles.loadingBarContainer}>
              <View style={styles.loadingBar}>
                <View style={[styles.loadingBarFill, { width: `${loadingProgress}%` }]} />
              </View>
              <Text style={styles.loadingPercentage}>{Math.round(loadingProgress)}%</Text>
            </View>
          </View>
        );

      case 'rating-request':
        return (
          <View style={styles.ratingContent}>
            <View style={styles.ratingIconContainer}>
              <View style={styles.ratingCircle}>
                <View style={styles.ratingInnerCircle}>
                  <Star size={32} color={Colors.primary} fill={Colors.primary} />
                </View>
              </View>
            </View>
            <Text style={styles.ratingTitle}>{currentStepData.title}</Text>
            <Text style={styles.ratingSubtitle}>{currentStepData.subtitle}</Text>
            
            <View style={styles.ratingCard}>
              <View style={styles.ratingStarsContainer}>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={24} color={Colors.primary} fill={Colors.primary} />
                  ))}
                </View>
                <Text style={styles.ratingText}>Be our first 5-star review!</Text>
              </View>
              
              <View style={styles.ratingStats}>
                <View style={styles.ratingStatItem}>
                  <Users size={20} color={Colors.textSecondary} />
                  <Text style={styles.ratingStatText}>You&apos;ll be #1</Text>
                </View>
                <View style={styles.ratingStatItem}>
                  <Sparkles size={20} color={Colors.textSecondary} />
                  <Text style={styles.ratingStatText}>Shape our future</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.ratingMessage}>
              <Text style={styles.ratingMessageTitle}>InIt AI was made for early adopters like you</Text>
              <Text style={styles.ratingMessageText}>
                Your feedback will help us create the perfect nutrition companion. 
                Be part of our founding community!
              </Text>
            </View>
            
            <View style={styles.ratingTestimonial}>
              <View style={styles.testimonialAvatar}>
                <Text style={styles.testimonialAvatarText}>👤</Text>
              </View>
              <View style={styles.testimonialContent}>
                <Text style={styles.testimonialName}>Future You</Text>
                <View style={styles.testimonialStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={16} color={Colors.primary} fill={Colors.primary} />
                  ))}
                </View>
                <Text style={styles.testimonialText}>
                  &quot;This app helped me make better food choices from day one!&quot;
                </Text>
              </View>
            </View>
            
            <View style={styles.ratingActions}>
              <TouchableOpacity 
                style={styles.rateNowButton}
                onPress={handleRateApp}
              >
                <Star size={20} color={Colors.white} fill={Colors.white} />
                <Text style={styles.rateNowButtonText}>Rate Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.rateLaterButton}
                onPress={handleNext}
              >
                <Text style={styles.rateLaterButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'notifications':
        return (
          <View style={styles.notificationsContent}>
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
            
            <View style={styles.notificationCard}>
              <View style={styles.notificationMockup}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationAppName}>InIt AI would like to send you</Text>
                  <Text style={styles.notificationTitle}>Notifications</Text>
                </View>
                <View style={styles.notificationButtons}>
                  <TouchableOpacity 
                    style={styles.notificationDenyButton}
                    onPress={() => handleNotificationPermission(false)}
                  >
                    <Text style={styles.notificationDenyText}>Don&apos;t Allow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.notificationAllowButton}
                    onPress={() => handleNotificationPermission(true)}
                  >
                    <Text style={styles.notificationAllowText}>Allow</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pointingHand}>
                  <Text style={styles.pointingHandEmoji}>👆</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.notificationBenefits}>
              <View style={styles.notificationBenefit}>
                <Bell size={20} color={Colors.primary} />
                <Text style={styles.notificationBenefitText}>Daily nutrition reminders</Text>
              </View>
              <View style={styles.notificationBenefit}>
                <TrendingUp size={20} color={Colors.primary} />
                <Text style={styles.notificationBenefitText}>Weekly progress updates</Text>
              </View>
              <View style={styles.notificationBenefit}>
                <Sparkles size={20} color={Colors.primary} />
                <Text style={styles.notificationBenefitText}>Personalized tips & insights</Text>
              </View>
            </View>
          </View>
        );

      case 'referral-code':
        return (
          <View style={styles.referralContent}>
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
            
            <View style={styles.referralInputContainer}>
              <TextInput
                style={styles.referralInput}
                value={answers.referralCode}
                onChangeText={(text) => setAnswers(prev => ({ ...prev, referralCode: text }))}
                placeholder="Referral Code"
                placeholderTextColor={Colors.gray500}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.referralSubmitButton}>
                <Text style={styles.referralSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'free-trial':
        return (
          <View style={styles.freeTrialContent}>
            <View style={styles.iconContainer}>
              <CreditCard size={48} color={Colors.primary} />
            </View>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
            
            <View style={styles.freeTrialCard}>
              <View style={styles.freeTrialHeader}>
                <Text style={styles.freeTrialPrice}>$0</Text>
                <Text style={styles.freeTrialPeriod}>for 3 days</Text>
              </View>
              
              <View style={styles.freeTrialFeatures}>
                <View style={styles.freeTrialFeature}>
                  <CheckCircle size={20} color={Colors.success} />
                  <Text style={styles.freeTrialFeatureText}>Unlimited product scans</Text>
                </View>
                <View style={styles.freeTrialFeature}>
                  <CheckCircle size={20} color={Colors.success} />
                  <Text style={styles.freeTrialFeatureText}>Personalized nutrition insights</Text>
                </View>
                <View style={styles.freeTrialFeature}>
                  <CheckCircle size={20} color={Colors.success} />
                  <Text style={styles.freeTrialFeatureText}>Smart food recommendations</Text>
                </View>
                <View style={styles.freeTrialFeature}>
                  <CheckCircle size={20} color={Colors.success} />
                  <Text style={styles.freeTrialFeatureText}>Progress tracking & streaks</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.startTrialButton}
                onPress={handleStartFreeTrial}
              >
                <CreditCard size={20} color={Colors.white} />
                <Text style={styles.startTrialButtonText}>Start Free Trial</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentDisclaimer}>
              <Text style={styles.paymentDisclaimerText}>
                No payment required now. Cancel anytime during your free trial.
              </Text>
            </View>
          </View>
        );

      case 'subscription-selection':
        return (
          <View style={styles.subscriptionContent}>
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subscriptionSubtitle}>{currentStepData.subtitle}</Text>
            
            <View style={styles.subscriptionOptions}>
              {/* Weekly Option */}
              <TouchableOpacity
                style={[
                  styles.subscriptionCard,
                  answers.selectedSubscription === 'weekly' && styles.subscriptionCardSelected
                ]}
                onPress={() => setAnswers(prev => ({ ...prev, selectedSubscription: 'weekly' }))}
              >
                <View style={styles.subscriptionHeader}>
                  <Text style={[
                    styles.subscriptionTitle,
                    answers.selectedSubscription === 'weekly' && styles.subscriptionTitleSelected
                  ]}>Weekly</Text>
                  <Text style={[
                    styles.subscriptionPrice,
                    answers.selectedSubscription === 'weekly' && styles.subscriptionPriceSelected
                  ]}>$4.99</Text>
                  <Text style={[
                    styles.subscriptionPeriod,
                    answers.selectedSubscription === 'weekly' && styles.subscriptionPeriodSelected
                  ]}>per week</Text>
                </View>
                
                <View style={styles.subscriptionFeatures}>
                  <View style={styles.subscriptionFeature}>
                    <CheckCircle size={16} color={answers.selectedSubscription === 'weekly' ? Colors.white : Colors.success} />
                    <Text style={[
                      styles.subscriptionFeatureText,
                      answers.selectedSubscription === 'weekly' && styles.subscriptionFeatureTextSelected
                    ]}>All premium features</Text>
                  </View>
                  <View style={styles.subscriptionFeature}>
                    <CheckCircle size={16} color={answers.selectedSubscription === 'weekly' ? Colors.white : Colors.success} />
                    <Text style={[
                      styles.subscriptionFeatureText,
                      answers.selectedSubscription === 'weekly' && styles.subscriptionFeatureTextSelected
                    ]}>Cancel anytime</Text>
                  </View>
                </View>
                
                {answers.selectedSubscription === 'weekly' && (
                  <View style={styles.subscriptionCheckmark}>
                    <CheckCircle size={24} color={Colors.white} />
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Monthly Option with Free Trial */}
              <TouchableOpacity
                style={[
                  styles.subscriptionCard,
                  styles.subscriptionCardRecommended,
                  answers.selectedSubscription === 'monthly' && styles.subscriptionCardSelected
                ]}
                onPress={() => setAnswers(prev => ({ ...prev, selectedSubscription: 'monthly' }))}
              >
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>BEST VALUE</Text>
                </View>
                
                <View style={styles.subscriptionHeader}>
                  <Text style={[
                    styles.subscriptionTitle,
                    answers.selectedSubscription === 'monthly' && styles.subscriptionTitleSelected
                  ]}>Monthly</Text>
                  <Text style={[
                    styles.subscriptionPrice,
                    answers.selectedSubscription === 'monthly' && styles.subscriptionPriceSelected
                  ]}>$8.99</Text>
                  <Text style={[
                    styles.subscriptionPeriod,
                    answers.selectedSubscription === 'monthly' && styles.subscriptionPeriodSelected
                  ]}>per month</Text>
                </View>
                
                <View style={styles.freeTrialBanner}>
                  <Star size={16} color={Colors.white} fill={Colors.white} />
                  <Text style={styles.freeTrialBannerText}>3-day free trial included</Text>
                </View>
                
                <View style={styles.subscriptionFeatures}>
                  <View style={styles.subscriptionFeature}>
                    <CheckCircle size={16} color={answers.selectedSubscription === 'monthly' ? Colors.white : Colors.success} />
                    <Text style={[
                      styles.subscriptionFeatureText,
                      answers.selectedSubscription === 'monthly' && styles.subscriptionFeatureTextSelected
                    ]}>All premium features</Text>
                  </View>
                  <View style={styles.subscriptionFeature}>
                    <CheckCircle size={16} color={answers.selectedSubscription === 'monthly' ? Colors.white : Colors.success} />
                    <Text style={[
                      styles.subscriptionFeatureText,
                      answers.selectedSubscription === 'monthly' && styles.subscriptionFeatureTextSelected
                    ]}>Better value per week</Text>
                  </View>
                  <View style={styles.subscriptionFeature}>
                    <CheckCircle size={16} color={answers.selectedSubscription === 'monthly' ? Colors.white : Colors.success} />
                    <Text style={[
                      styles.subscriptionFeatureText,
                      answers.selectedSubscription === 'monthly' && styles.subscriptionFeatureTextSelected
                    ]}>Cancel anytime</Text>
                  </View>
                </View>
                
                {answers.selectedSubscription === 'monthly' && (
                  <View style={styles.subscriptionCheckmark}>
                    <CheckCircle size={24} color={Colors.white} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'complete':
        return (
          <View style={styles.completeContent}>
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
          </View>
        );

      case 'input':
        return (
          <View style={styles.inputContent}>
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
          </View>
        );
      case 'tags-input':
        return (
          <View style={styles.selectContent}>
            <View style={styles.iconContainer}>{currentStepData.icon}</View>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
            <View style={styles.tagsInputContainer}>
              <View style={styles.tagsList}>
                {answers.dietaryRestrictions.map((tag, idx) => (
                  <View key={`${tag}-${idx}`} style={styles.tagChip} testID={`tag-${tag}`}>
                    <Text style={styles.tagText}>#{tag}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setAnswers(prev => ({
                          ...prev,
                          dietaryRestrictions: prev.dietaryRestrictions.filter((t, i) => !(t === tag && i === idx)),
                        }));
                      }}
                      style={styles.tagRemove}
                      testID={`remove-tag-${tag}`}
                    >
                      <X size={14} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <TextInput
                style={styles.tagsTextInput}
                placeholder="Type an item and press Add (e.g., peanuts, lactose, seed oils)"
                placeholderTextColor={Colors.gray500}
                value={tagDraft}
                onChangeText={setTagDraft}
                autoCapitalize="none"
                autoCorrect={false}
                testID="dietary-restrictions-input"
              />
              <TouchableOpacity
                style={[styles.addTagButton, tagDraft.trim().length === 0 && styles.nextButtonDisabled]}
                onPress={handleAddTag}
                disabled={tagDraft.trim().length === 0}
                testID="add-dietary-restriction"
              >
                <Text style={[styles.nextButtonText, tagDraft.trim().length === 0 && styles.nextButtonTextDisabled]}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.suggestionsContainer}>
              {commonRestrictionSuggestions.map((s) => {
                const selected = answers.dietaryRestrictions.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.suggestionChip, selected && styles.suggestionChipSelected]}
                    onPress={() => toggleSuggestion(s)}
                    testID={`suggestion-${s}`}
                  >
                    <Text style={[styles.suggestionText, selected && styles.suggestionTextSelected]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 'single-select':
        return (
          <View style={styles.selectContent}>
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
            <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
              {currentStepData.options?.map((option) => {
                const isSelected = answers[currentStepData.id as keyof typeof answers] === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => handleSelectOption(option.id)}
                  >
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {option.label}
                      </Text>
                      {option.description && (
                        <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionSelected]}>
                          {option.description}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <CheckCircle size={24} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  const renderSignInModal = () => (
    <Modal
      visible={showSignInModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        resetSignInModal();
        setShowSignInModal(false);
      }}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => {
              resetSignInModal();
              setShowSignInModal(false);
            }}
          >
            <X size={24} color={Colors.gray600} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Sign In</Text>
          <View style={styles.modalSpacer} />
        </View>

        <View style={styles.modalContent}>
          {!showSignInOtpInput ? (
            // Email input step
            <>
              <View style={styles.modalIconContainer}>
                <Mail size={48} color={Colors.primary} />
              </View>
              <Text style={styles.modalMainTitle}>Welcome Back!</Text>
              <Text style={styles.modalSubtitle}>Enter your email to sign in to your account</Text>
              
              <TextInput
                style={styles.modalTextInput}
                value={signInEmail}
                onChangeText={setSignInEmail}
                placeholder="Enter your email address"
                placeholderTextColor={Colors.gray500}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  (!signInEmail.trim() || !signInEmail.includes('@') || isSignInAuthenticating) && styles.modalButtonDisabled
                ]}
                onPress={handleSignInEmailAuth}
                disabled={!signInEmail.trim() || !signInEmail.includes('@') || isSignInAuthenticating}
              >
                {isSignInAuthenticating ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Text style={[
                      styles.modalButtonText,
                      (!signInEmail.trim() || !signInEmail.includes('@')) && styles.modalButtonTextDisabled
                    ]}>
                      Send Code
                    </Text>
                    <Mail size={20} color={(!signInEmail.trim() || !signInEmail.includes('@')) ? Colors.gray400 : Colors.white} />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            // OTP verification step
            <>
              <View style={styles.modalIconContainer}>
                <Shield size={48} color={Colors.primary} />
              </View>
              <Text style={styles.modalMainTitle}>Verify Your Email</Text>
              <Text style={styles.modalSubtitle}>Enter the 6-digit code we sent to your email</Text>
              <Text style={styles.modalEmailDisplay}>Sent to: {signInEmail}</Text>
              
              <TextInput
                style={[
                  styles.modalTextInput,
                  styles.modalOtpInput,
                  signInOtpError ? styles.modalOtpInputError : null,
                  signInOtp.length === 6 && !signInOtpError && !isSignInVerifying ? styles.modalOtpInputSuccess : null
                ]}
                value={signInOtp}
                onChangeText={handleSignInOTPChange}
                placeholder="000000"
                placeholderTextColor={Colors.gray500}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                textAlign="center"
                editable={!isSignInVerifying}
              />
              
              {isSignInVerifying && (
                <View style={styles.modalVerifyingContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.modalVerifyingText}>Verifying...</Text>
                </View>
              )}
              
              {signInOtpError ? (
                <Text style={styles.modalErrorText}>{signInOtpError}</Text>
              ) : null}
              
              {signInOtp.length === 6 && !signInOtpError && !isSignInVerifying ? (
                <Text style={styles.modalSuccessText}>✓ Code verified successfully!</Text>
              ) : null}
              
              <TouchableOpacity 
                style={[styles.modalResendButton, signInResendCooldown > 0 && styles.modalResendButtonDisabled]}
                onPress={() => {
                  if (signInResendCooldown > 0) return;
                  setSignInOtp('');
                  setShowSignInOtpInput(false);
                  handleSignInEmailAuth();
                }}
                disabled={signInResendCooldown > 0}
              >
                <Text style={[styles.modalResendButtonText, signInResendCooldown > 0 && styles.modalResendButtonTextDisabled]}>
                  {signInResendCooldown > 0 ? `Resend Code (${signInResendCooldown}s)` : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  const [tagDraft, setTagDraft] = useState<string>('');
  const commonRestrictionSuggestions = useMemo<string[]>(
    () => [
      'peanuts',
      'tree nuts',
      'dairy',
      'lactose',
      'gluten',
      'shellfish',
      'soy',
      'egg',
      'sesame',
      'seed oils',
      'artificial sweeteners',
      'added sugar',
      'high sodium',
      'red meat',
    ],
    []
  );
  const normalizeTag = (s: string) => s.trim().toLowerCase();
  const handleAddTag = () => {
    const normalized = normalizeTag(tagDraft);
    if (!normalized) return;
    if (answers.dietaryRestrictions.includes(normalized)) {
      setTagDraft('');
      return;
    }
    setAnswers(prev => ({ ...prev, dietaryRestrictions: [...prev.dietaryRestrictions, normalized] }));
    setTagDraft('');
  };
  const toggleSuggestion = (s: string) => {
    const normalized = normalizeTag(s);
    setAnswers(prev => (
      prev.dietaryRestrictions.includes(normalized)
        ? { ...prev, dietaryRestrictions: prev.dietaryRestrictions.filter(t => t !== normalized) }
        : { ...prev, dietaryRestrictions: [...prev.dietaryRestrictions, normalized] }
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderSignInModal()}
      {currentStepData.type !== 'welcome' && (
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>

          </View>
        </View>
      )}

      <Animated.View 
        style={[styles.content, currentStepData.type === 'welcome' && { paddingHorizontal: 0 }, { transform: [{ translateX: slideAnim }] }]}
        {...panResponder.panHandlers}
        testID={`quiz-step-${currentStepData.id}`}
      >
        {renderStepContent()}
      </Animated.View>

      {currentStepData.type !== 'welcome' && (
        <View style={styles.footer}>

          {currentStepData.type === 'complete' ? (
            <TouchableOpacity
              style={[styles.nextButton, styles.completeButton]}
              onPress={handleComplete}
            >
              <Text style={styles.completeButtonText}>Continue</Text>
              <ChevronRight size={20} color={Colors.white} />
            </TouchableOpacity>
          ) : currentStepData.type === 'subscription-selection' ? (
            <TouchableOpacity
              style={[styles.nextButton, styles.completeButton, !canProceed() && styles.nextButtonDisabled]}
              onPress={() => {
                console.log('[Quiz] Final step - navigating to main app');
                router.replace('/(tabs)');
              }}
              disabled={!canProceed()}
            >
              <Text style={[styles.completeButtonText, !canProceed() && styles.nextButtonTextDisabled]}>Start Your Journey</Text>
            </TouchableOpacity>
          ) : currentStepData.type === 'email-auth' ? (
            <TouchableOpacity
              style={[styles.nextButton, styles.authButton, (!canProceed() || isAuthenticating) && styles.nextButtonDisabled]}
              onPress={handleEmailAuth}
              disabled={!canProceed() || isAuthenticating}
            >
              <Text style={[styles.nextButtonText, (!canProceed() || isAuthenticating) && styles.nextButtonTextDisabled]}>
                {isAuthenticating ? 'Sending...' : 'Send Code'}
              </Text>
              {!isAuthenticating && <Mail size={20} color={!canProceed() ? Colors.gray400 : Colors.white} />}
            </TouchableOpacity>
          ) : currentStepData.type === 'otp-verify' ? (
            canProceed() ? (
              <TouchableOpacity
                style={[styles.nextButton, styles.successButton]}
                onPress={handleNext}
              >
                <Text style={styles.successButtonText}>Continue</Text>
                <ChevronRight size={20} color={Colors.white} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.nextButton, styles.nextButtonDisabled]}>
                <Text style={styles.nextButtonTextDisabled}>
                  {isVerifying ? 'Verifying...' : 'Enter 6-digit code'}
                </Text>
              </View>
            )
          ) : currentStepData.type === 'loading' ? (
            canProceed() ? (
              <TouchableOpacity
                style={[styles.nextButton, styles.retroRedButton]}
                onPress={handleNext}
              >
                <Text style={styles.retroRedButtonText}>Continue</Text>
                <ChevronRight size={20} color={Colors.white} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.nextButton, styles.nextButtonDisabled]}>
                <Text style={styles.nextButtonTextDisabled}>
                  Generating questions...
                </Text>
              </View>
            )
          ) : currentStepData.type === 'free-trial' ? (
            <TouchableOpacity
              style={[styles.nextButton, styles.skipButton]}
              onPress={handleNext}
            >
              <Text style={styles.skipButtonText}>
                Skip for Now
              </Text>
              <ChevronRight size={20} color={Colors.gray600} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text style={[styles.nextButtonText, !canProceed() && styles.nextButtonTextDisabled]}>
                Continue
              </Text>
              <ChevronRight size={20} color={!canProceed() ? Colors.gray400 : Colors.white} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.gray600,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  welcomeContent: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cameraBackground: {
    flex: 1,
    width: '100%',
  },
  cameraBackgroundImage: {
    resizeMode: 'cover',
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningFrame: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    right: '15%',
    bottom: '35%',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'white',
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: 'white',
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'white',
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: 'white',
    borderBottomRightRadius: 8,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    borderRadius: 25,
    marginBottom: 20,
  },
  scanLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scanIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  scanText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  controlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  flashButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  spacerButton: {
    width: 50,
    height: 50,
  },
  brandContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 180,
    height: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeTextContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 38,
  },
  getStartedButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 25,
    marginBottom: 20,
  },
  getStartedButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  signInButton: {
    paddingVertical: 10,
  },
  signInButtonText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  completeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  inputContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  tagsInputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    padding: 16,
    gap: 12,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  tagRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsTextInput: {
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  suggestionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  suggestionChipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  suggestionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionTextSelected: {
    color: Colors.textPrimary,
  },
  authContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emailDisplay: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  otpInput: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  resendButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  resendButtonText: {
    fontSize: 16,
    color: Colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  authButton: {
    backgroundColor: Colors.primary,
  },
  selectContent: {
    flex: 1,
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  textInput: {
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  optionsContainer: {
    flex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: Colors.white,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  optionDescriptionSelected: {
    color: Colors.white,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.gray600,
    marginLeft: 4,
  },
  spacer: {
    flex: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
  },
  nextButtonDisabled: {
    backgroundColor: Colors.gray200,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginRight: 8,
  },
  nextButtonTextDisabled: {
    color: Colors.gray400,
  },
  completeButton: {
    backgroundColor: Colors.success,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  otpInputError: {
    borderColor: Colors.error,
    backgroundColor: '#fef2f2',
  },
  otpInputSuccess: {
    borderColor: Colors.success,
    backgroundColor: '#f0fdf4',
  },
  verifyingContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  verifyingText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 12,
  },
  successText: {
    fontSize: 14,
    color: Colors.success,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  successButton: {
    backgroundColor: Colors.success,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginRight: 8,
  },
  retroRedButton: {
    backgroundColor: Colors.retroRed,
  },
  retroRedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginRight: 8,
  },
  privacyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  privacyIconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  privacyCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  privacyInnerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  handContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  handEmoji: {
    fontSize: 48,
  },
  privacyTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 38,
  },
  privacySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 60,
  },
  privacySecuritySection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  lockIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  privacySecurityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  privacySecurityText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Sign-in modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    justifyContent: 'flex-start',
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalMainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalEmailDisplay: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalTextInput: {
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    marginBottom: 24,
  },
  modalOtpInput: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  modalOtpInputError: {
    borderColor: Colors.error,
    backgroundColor: '#fef2f2',
  },
  modalOtpInputSuccess: {
    borderColor: Colors.success,
    backgroundColor: '#f0fdf4',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonDisabled: {
    backgroundColor: Colors.gray200,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  modalButtonTextDisabled: {
    color: Colors.gray400,
  },
  modalVerifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  modalVerifyingText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  modalErrorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 12,
  },
  modalSuccessText: {
    fontSize: 14,
    color: Colors.success,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  modalResendButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  modalResendButtonText: {
    fontSize: 16,
    color: Colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonTextDisabled: {
    color: Colors.gray400,
    textDecorationLine: 'none',
  },
  modalResendButtonDisabled: {
    opacity: 0.5,
  },
  modalResendButtonTextDisabled: {
    color: Colors.gray400,
    textDecorationLine: 'none',
  },
  // Instruction page styles
  instructionContent: {
    flex: 1,
    paddingTop: 20,
    alignItems: 'center',
  },
  instructionImageContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  phoneFrame: {
    width: 200,
    height: 360,
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  productMockup: {
    position: 'absolute',
    bottom: '30%',
    left: '50%',
    transform: [{ translateX: -30 }],
    alignItems: 'center',
  },
  productBox: {
    width: 60,
    height: 80,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  productText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  instructionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  instructionSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  // Score instruction page styles
  scoreFrame: {
    width: 280,
    height: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  scoreScreen: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: '#22c55e',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#22c55e',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22c55e',
    lineHeight: 36,
  },
  scoreOutOf: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: -4,
  },
  personalScoreLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  scoreBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  baseScoreCard: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  baseScoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  baseScoreNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  scorePlus: {
    alignItems: 'center',
  },
  scorePlusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  yourScoreCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  yourScoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  yourScoreNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  // Alternatives instruction page styles
  alternativesFrame: {
    width: 300,
    height: 500,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  alternativesScreen: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    justifyContent: 'space-between',
  },
  comparisonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productComparison: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  goodProductContainer: {
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0f2fe',
    shadowColor: '#22c55e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  badProductContainer: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#fecaca',
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productImageGood: {
    width: 80,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  productImageBad: {
    width: 80,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#fbbf24',
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  hippeasPackage: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  hippeasText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  hippeasSubtext: {
    fontSize: 8,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
  },
  laysPackage: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  laysText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  laysSubtext: {
    fontSize: 10,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
  },
  productLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xmarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fecaca',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alternativesTextContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  alternativesMainText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
  },
  healthyText: {
    color: Colors.error,
    fontWeight: 'bold',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  progressDotActive: {
    backgroundColor: Colors.error,
  },
  // Loading page styles
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  loadingBarContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
  },
  loadingBar: {
    width: '80%',
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  loadingPercentage: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Rating request page styles
  ratingContent: {
    flex: 1,
    paddingTop: 20,
    alignItems: 'center',
  },
  ratingIconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  ratingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ratingInnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 34,
  },
  ratingSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  ratingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  ratingStarsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  ratingStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  ratingStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingStatText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  ratingMessage: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  ratingMessageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  ratingMessageText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  ratingTestimonial: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'flex-start',
  },
  testimonialAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  testimonialAvatarText: {
    fontSize: 20,
  },
  testimonialContent: {
    flex: 1,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  testimonialStars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  testimonialText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // Choices instruction page styles
  choicesFrame: {
    width: 320,
    height: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beforeAfterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  beforeContainer: {
    flex: 1,
  },
  afterContainer: {
    flex: 1,
  },
  arrowContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beforeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  afterCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bbf7d0',
    shadowColor: '#22c55e',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  personContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  personBefore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ef4444',
    opacity: 0.8,
  },
  personAfter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#22c55e',
    opacity: 0.8,
  },
  beforeAfterLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  bulletPoints: {
    alignItems: 'flex-start',
    width: '100%',
  },
  bulletPoint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
    lineHeight: 18,
    fontWeight: '500',
  },
  instructionFeatures: {
    width: '100%',
    paddingHorizontal: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  // Notifications page styles
  notificationsContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  notificationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  notificationMockup: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  notificationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  notificationAppName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  notificationButtons: {
    flexDirection: 'row',
    gap: 0,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  notificationDenyButton: {
    flex: 1,
    backgroundColor: Colors.gray200,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  notificationDenyText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  notificationAllowButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  notificationAllowText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  pointingHand: {
    position: 'absolute',
    bottom: -10,
    right: 20,
  },
  pointingHandEmoji: {
    fontSize: 24,
  },
  // Referral code page styles
  referralContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  referralInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  referralSubmitButton: {
    backgroundColor: Colors.gray200,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  referralSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray600,
  },
  // Free trial page styles
  freeTrialContent: {
    flex: 1,
    paddingTop: 20,
    alignItems: 'center',
  },
  freeTrialCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  freeTrialHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  freeTrialPrice: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
    lineHeight: 52,
  },
  freeTrialPeriod: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  freeTrialFeatures: {
    marginBottom: 20,
  },
  freeTrialFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  freeTrialFeatureText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginLeft: 12,
    flex: 1,
  },
  freeTrialFooter: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  freeTrialFooterText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  freeTrialBenefits: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  freeTrialBenefitsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  freeTrialBenefitsText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Subscription selection page styles
  subscriptionContent: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 20,
  },
  subscriptionOptions: {
    gap: 12,
    paddingBottom: 20,
  },
  subscriptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subscriptionCardRecommended: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  subscriptionCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  recommendedBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  subscriptionHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  subscriptionTitleSelected: {
    color: Colors.white,
  },
  subscriptionPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    lineHeight: 28,
  },
  subscriptionPriceSelected: {
    color: Colors.white,
  },
  subscriptionPeriod: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  subscriptionPeriodSelected: {
    color: Colors.white,
    opacity: 0.9,
  },
  freeTrialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 10,
    gap: 4,
  },
  freeTrialBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  subscriptionFeatures: {
    gap: 6,
  },
  subscriptionFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscriptionFeatureText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  subscriptionFeatureTextSelected: {
    color: Colors.white,
  },
  subscriptionCheckmark: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  subscriptionDisclosure: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fef3cd',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  subscriptionDisclosureText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  subscriptionSubtitle: {
    fontSize: 12,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 32,
  },
  // Rating actions styles
  ratingActions: {
    width: '100%',
    gap: 12,
    marginTop: 20,
  },
  rateNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  rateNowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  rateLaterButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  rateLaterButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  // Notification benefits styles
  notificationBenefits: {
    width: '100%',
    marginTop: 32,
    gap: 16,
  },
  notificationBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  notificationBenefitText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  // Free trial button styles
  startTrialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
  },
  startTrialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  paymentDisclaimer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  paymentDisclaimerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // Skip button styles
  skipButton: {
    backgroundColor: Colors.gray200,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray600,
    marginRight: 8,
  },
});

export default QuizScreen;