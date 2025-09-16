import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serializeError } from '@/utils/error';

// These will be set from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://djkastkpaaicewoicqxf.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqa2FzdGtwYWFpY2V3b2ljcXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjA2MDIsImV4cCI6MjA3MTczNjYwMn0.Oz0H947O7xCMUZN72T_rjKKHmBIADScV-ylFt4tr40M';

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string;
          profile_picture_uri: string | null;
          body_goal: string | null;
          health_goal: string | null;
          diet_goal: string | null;
          life_goal: string | null;
          motivation: string | null;
          referral_source: string | null;
          has_completed_quiz: boolean;
          level: number;
          xp: number;
          weekly_xp: number;
          week_start_date: string;
          current_streak: number;
          longest_streak: number;
          last_scan_date: string | null;
          scan_dates: string[];
          dietary_restrictions: any;
          dietary_preferences: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email?: string;
          profile_picture_uri?: string | null;
          body_goal?: string | null;
          health_goal?: string | null;
          diet_goal?: string | null;
          life_goal?: string | null;
          motivation?: string | null;
          referral_source?: string | null;
          has_completed_quiz?: boolean;
          level?: number;
          xp?: number;
          weekly_xp?: number;
          week_start_date?: string;
          current_streak?: number;
          longest_streak?: number;
          last_scan_date?: string | null;
          scan_dates?: string[];
          dietary_restrictions?: any;
          dietary_preferences?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string;
          profile_picture_uri?: string | null;
          body_goal?: string | null;
          health_goal?: string | null;
          diet_goal?: string | null;
          life_goal?: string | null;
          motivation?: string | null;
          referral_source?: string | null;
          has_completed_quiz?: boolean;
          level?: number;
          xp?: number;
          weekly_xp?: number;
          week_start_date?: string;
          current_streak?: number;
          longest_streak?: number;
          last_scan_date?: string | null;
          scan_dates?: string[];
          dietary_restrictions?: any;
          dietary_preferences?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      quiz_responses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          body_goal: string;
          health_goal: string;
          diet_goal: string;
          life_goal: string;
          motivation: string;
          referral_source: string;
          dietary_restrictions: any;
          dietary_preferences: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          body_goal: string;
          health_goal: string;
          diet_goal: string;
          life_goal: string;
          motivation: string;
          referral_source: string;
          dietary_restrictions?: any;
          dietary_preferences?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          body_goal?: string;
          health_goal?: string;
          diet_goal?: string;
          life_goal?: string;
          motivation?: string;
          referral_source?: string;
          dietary_restrictions?: any;
          dietary_preferences?: any;
          created_at?: string;
        };
      };
      scan_history: {
        Row: {
          id: string;
          user_id: string;
          product_name: string;
          brand: string | null;
          score: number;
          base_score: number | null;
          personalized_score: number | null;
          image_uri: string | null;
          nutrition_data: any;
          analysis_data: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_name: string;
          brand?: string | null;
          score: number;
          base_score?: number | null;
          personalized_score?: number | null;
          image_uri?: string | null;
          nutrition_data: any;
          analysis_data?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_name?: string;
          brand?: string | null;
          score?: number;
          base_score?: number | null;
          personalized_score?: number | null;
          image_uri?: string | null;
          nutrition_data?: any;
          analysis_data?: any | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Helper functions for database operations
export const createUserProfile = async (userId: string, profileData: any) => {
  // Debug logging removed for production
  
  const insertData = {
    user_id: userId,
    name: profileData.name,
    email: profileData.email || '',
    profile_picture_uri: profileData.profilePictureUri || null,
    body_goal: profileData.goals?.bodyGoal,
    health_goal: profileData.goals?.healthGoal,
    diet_goal: profileData.goals?.dietGoal,
    life_goal: profileData.goals?.lifeGoal,
    motivation: profileData.goals?.motivation,
    has_completed_quiz: profileData.hasCompletedQuiz || false,
    level: profileData.level || 1,
    xp: profileData.xp || 0,
    weekly_xp: profileData.weeklyXP || 0,
    week_start_date: profileData.weekStartDate || new Date().toISOString().split('T')[0],
    current_streak: profileData.currentStreak || 0,
    longest_streak: profileData.longestStreak || 0,
    last_scan_date: profileData.lastScanDate || null,
    scan_dates: profileData.scanDates || [],
    dietary_restrictions: profileData.dietaryRestrictions || [],
    dietary_preferences: profileData.dietaryPreferences || [],
  };
  
  // Debug logging removed for production
  
  const { data, error } = await supabase
    .from('user_profiles')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error creating user profile:', serializeError(error));
    throw error;
  }

  // Debug logging removed for production
  return data;
};

export const updateUserProfile = async (userId: string, updates: any) => {
  // Debug logging removed for production
  
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  // Debug logging removed for production
  
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error updating user profile:', serializeError(error));
    
    if ((error as any)?.code === 'PGRST116') {
      const customError = new Error('User profile not found. Profile must be created first.');
      (customError as any).code = 'PROFILE_NOT_FOUND';
      throw customError;
    }
    
    throw error;
  }

  // Debug logging removed for production
  return data;
};

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && (error as any).code !== 'PGRST116') {
    console.error('[Supabase] Error fetching user profile:', serializeError(error));
    throw error;
  }

  return data;
};

export const checkEmailExists = async (email: string) => {
  // Debug logging removed for production
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('email', email.trim().toLowerCase())
    .single();

  if (error && (error as any).code !== 'PGRST116') {
    console.error('[Supabase] Error checking email existence:', serializeError(error));
    throw error;
  }

  const exists = !!data;
  // Debug logging removed for production
  return exists;
};

export const saveQuizResponse = async (userId: string, quizData: any) => {
  // Debug logging removed for production
  
  const insertData = {
    user_id: userId,
    name: quizData.name,
    body_goal: quizData.goals.bodyGoal,
    health_goal: quizData.goals.healthGoal,
    diet_goal: quizData.goals.dietGoal,
    life_goal: quizData.goals.lifeGoal,
    motivation: quizData.goals.motivation,
    referral_source: quizData.referralSource || 'unknown',
    dietary_restrictions: quizData.dietaryRestrictions || [],
    dietary_preferences: [], // Empty for now, can be expanded later
  };
  
  // Debug logging removed for production
  
  const { data, error } = await supabase
    .from('quiz_responses')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error saving quiz response:', serializeError(error));
    throw error;
  }

  // Debug logging removed for production
  return data;
};

// Scan History helper functions
export const saveScanToHistory = async (userId: string, scanData: {
  productName: string;
  brand?: string;
  score: number;
  baseScore?: number;
  personalizedScore?: number;
  imageUri?: string;
  nutritionData: any;
  analysisData?: any;
}) => {
  // Debug logging removed for production
  
  // Ensure all score values are properly formatted as numbers
  const score = Number(scanData.score);
  const baseScore = scanData.baseScore ? Number(scanData.baseScore) : null;
  const personalizedScore = scanData.personalizedScore ? Number(scanData.personalizedScore) : null;
  
  // Validate that scores are valid numbers
  if (isNaN(score)) {
    throw new Error(`Invalid score value: ${scanData.score}`);
  }
  if (baseScore !== null && isNaN(baseScore)) {
    throw new Error(`Invalid baseScore value: ${scanData.baseScore}`);
  }
  if (personalizedScore !== null && isNaN(personalizedScore)) {
    throw new Error(`Invalid personalizedScore value: ${scanData.personalizedScore}`);
  }
  
  const insertData = {
    user_id: userId,
    product_name: scanData.productName,
    brand: scanData.brand || null,
    score: score,
    base_score: baseScore,
    personalized_score: personalizedScore,
    image_uri: scanData.imageUri || null,
    nutrition_data: scanData.nutritionData,
    analysis_data: scanData.analysisData || null,
  };
  
  // Debug logging removed for production
  
  const { data, error } = await supabase
    .from('scan_history')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error saving scan to history:', serializeError(error));
    throw error;
  }

  // Debug logging removed for production
  return data;
};

export const getUserScanHistory = async (userId: string) => {
  // Debug logging removed for production
  
  const { data, error } = await supabase
    .from('scan_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] Error fetching scan history:', serializeError(error));
    throw error;
  }

  // Debug logging removed for production
  return data || [];
};

export const deleteScanFromHistory = async (userId: string, scanId: string) => {
  // Debug logging removed for production
  
  const { error } = await supabase
    .from('scan_history')
    .delete()
    .eq('user_id', userId)
    .eq('id', scanId);

  if (error) {
    console.error('[Supabase] Error deleting scan from history:', serializeError(error));
    throw error;
  }

  // Debug logging removed for production
};

export const clearUserScanHistory = async (userId: string) => {
  // Debug logging removed for production
  
  const { error } = await supabase
    .from('scan_history')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[Supabase] Error clearing scan history:', serializeError(error));
    throw error;
  }

  // Debug logging removed for production
};