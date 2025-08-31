import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, subDays, differenceInDays } from 'date-fns';

import { supabase, createUserProfile, updateUserProfile, getUserProfile, saveQuizResponse } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface UserGoals {
  bodyGoal: 'lose-weight' | 'gain-weight' | 'maintain-weight' | null;
  healthGoal: 'low-sugar' | 'high-protein' | 'low-fat' | 'keto' | 'balanced' | null;
  dietGoal: 'whole-foods' | 'vegan' | 'carnivore' | 'gluten-free' | 'vegetarian' | 'balanced' | null;
  lifeGoal: 'eat-healthier' | 'boost-energy' | 'feel-better' | 'clear-skin' | null;
  motivation: 'looking-better' | 'feeling-better' | 'more-energy' | 'longevity' | null;
}

export interface UserProfile {
  name: string;
  email: string;
  profilePictureUri: string | null;
  goals: UserGoals;
  hasCompletedQuiz: boolean;

  currentStreak: number;
  longestStreak: number;
  lastScanDate: string | null; // ISO date string of last scan
  scanDates: string[]; // Array of ISO date strings when user scanned
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const STORAGE_KEY = 'user_profile';

const defaultProfile: UserProfile = {
  name: '',
  email: '',
  profilePictureUri: null,
  goals: {
    bodyGoal: null,
    healthGoal: null,
    dietGoal: null,
    lifeGoal: null,
    motivation: null,
  },
  hasCompletedQuiz: false,

  currentStreak: 0,
  longestStreak: 0,
  lastScanDate: null,
  scanDates: [],
};

export const [UserProvider, useUser] = createContextHook(() => {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const initializeAuth = useCallback(async () => {
    try {
      console.log('[UserContext] Initializing authentication...');
      
      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[UserContext] Error getting session:', error);
      }
      
      console.log('[UserContext] Current session:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });
      
      if (session?.user) {
        console.log('[UserContext] Found existing session, user is authenticated');
        setAuthState({
          user: session.user,
          isAuthenticated: true,
          isLoading: false,
        });
        
        // Load profile for authenticated user
        await loadProfile(session.user);
      } else {
        console.log('[UserContext] No existing session found');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        // Load local profile for non-authenticated user
        await loadProfile();
      }
      
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[UserContext] Auth state changed:', event, {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        });
        
        if (session?.user) {
          setAuthState({
            user: session.user,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Load profile for newly authenticated user
          await loadProfile(session.user);
        } else {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          
          // Reset to default profile when logged out
          setProfile(defaultProfile);
          setIsLoading(false);
        }
      });
      
      return () => {
        subscription.unsubscribe();
      };
      
    } catch (error) {
      console.error('[UserContext] Error initializing auth:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      await loadProfile();
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);



  const loadProfile = async (user?: User) => {
    try {
      console.log('[UserContext] Loading profile...', {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email
      });
      
      if (user) {
        // Try to load profile from Supabase first for authenticated users
        try {
          console.log('[UserContext] Loading profile from Supabase...');
          const supabaseProfile = await getUserProfile(user.id);
          
          if (supabaseProfile) {
            console.log('[UserContext] Found Supabase profile:', {
              hasCompletedQuiz: supabaseProfile.has_completed_quiz,
              name: supabaseProfile.name
            });
            
            const profileFromSupabase: UserProfile = {
              name: supabaseProfile.name,
              email: supabaseProfile.email || user.email || '',
              profilePictureUri: supabaseProfile.profile_picture_uri || null,
              goals: {
                bodyGoal: supabaseProfile.body_goal as any,
                healthGoal: supabaseProfile.health_goal as any,
                dietGoal: supabaseProfile.diet_goal as any,
                lifeGoal: supabaseProfile.life_goal as any,
                motivation: supabaseProfile.motivation as any,
              },
              hasCompletedQuiz: supabaseProfile.has_completed_quiz,

              currentStreak: supabaseProfile.current_streak || 0,
              longestStreak: supabaseProfile.longest_streak || 0,
              lastScanDate: supabaseProfile.last_scan_date || null,
              scanDates: supabaseProfile.scan_dates || [],
            };
            
            setProfile(profileFromSupabase);
            // Also save to local storage as backup
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profileFromSupabase));
            console.log('[UserContext] Profile loaded from Supabase and cached locally');
            setIsLoading(false);
            return;
          }
        } catch (supabaseError) {
          console.log('[UserContext] Could not load from Supabase, falling back to local storage:', supabaseError);
        }
      }
      
      // Fallback to local storage
      console.log('[UserContext] Loading profile from local storage...');
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedProfile = JSON.parse(stored);
        console.log('[UserContext] Found stored profile:', { hasCompletedQuiz: parsedProfile.hasCompletedQuiz, name: parsedProfile.name });
        // Ensure all required fields exist
        const validProfile = {
          ...defaultProfile,
          ...parsedProfile,
          goals: {
            ...defaultProfile.goals,
            ...(parsedProfile.goals || {})
          },

          // Ensure streak fields exist for older profiles
          currentStreak: parsedProfile.currentStreak ?? 0,
          longestStreak: parsedProfile.longestStreak ?? 0,
          lastScanDate: parsedProfile.lastScanDate ?? null,
          scanDates: parsedProfile.scanDates ?? [],
          // Ensure profile picture field exists for older profiles
          profilePictureUri: parsedProfile.profilePictureUri ?? null,
          // Update email from auth if available
          email: user?.email || parsedProfile.email || '',
        };
        setProfile(validProfile);
        console.log('[UserContext] Profile loaded from local storage:', { hasCompletedQuiz: validProfile.hasCompletedQuiz, name: validProfile.name });
      } else {
        console.log('[UserContext] No stored profile found, using default');
        // If we have a user but no profile, set their email
        if (user?.email) {
          const profileWithEmail = {
            ...defaultProfile,
            email: user.email,
          };
          setProfile(profileWithEmail);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Reset to default profile on error
      const profileToUse = user?.email ? { ...defaultProfile, email: user.email } : defaultProfile;
      setProfile(profileToUse);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (newProfile: UserProfile) => {
    try {
      console.log('[UserContext] Saving profile:', { hasCompletedQuiz: newProfile.hasCompletedQuiz, name: newProfile.name });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
      console.log('[UserContext] Profile saved successfully');
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  };

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...updates };
    await saveProfile(newProfile);
    
    // Sync with Supabase if user is authenticated
    if (authState.isAuthenticated && authState.user?.id) {
      try {
        console.log('[UserContext] Syncing profile updates to Supabase:', updates);
        const supabaseUpdates: any = {};
        
        // Map profile fields to Supabase fields
        if (updates.name !== undefined) supabaseUpdates.name = updates.name;
        if (updates.email !== undefined) supabaseUpdates.email = updates.email;
        if (updates.profilePictureUri !== undefined) supabaseUpdates.profile_picture_uri = updates.profilePictureUri;
        if (updates.hasCompletedQuiz !== undefined) supabaseUpdates.has_completed_quiz = updates.hasCompletedQuiz;
        if (updates.currentStreak !== undefined) supabaseUpdates.current_streak = updates.currentStreak;
        if (updates.longestStreak !== undefined) supabaseUpdates.longest_streak = updates.longestStreak;
        if (updates.lastScanDate !== undefined) supabaseUpdates.last_scan_date = updates.lastScanDate;
        if (updates.scanDates !== undefined) supabaseUpdates.scan_dates = updates.scanDates;
        
        if (updates.goals) {
          if (updates.goals.bodyGoal !== undefined) supabaseUpdates.body_goal = updates.goals.bodyGoal;
          if (updates.goals.healthGoal !== undefined) supabaseUpdates.health_goal = updates.goals.healthGoal;
          if (updates.goals.dietGoal !== undefined) supabaseUpdates.diet_goal = updates.goals.dietGoal;
          if (updates.goals.lifeGoal !== undefined) supabaseUpdates.life_goal = updates.goals.lifeGoal;
          if (updates.goals.motivation !== undefined) supabaseUpdates.motivation = updates.goals.motivation;
        }
        
        if (Object.keys(supabaseUpdates).length > 0) {
          await updateUserProfile(authState.user.id, supabaseUpdates);
          console.log('[UserContext] Profile updates synced to Supabase successfully');
        }
      } catch (error: any) {
        console.error('[UserContext] Failed to sync profile updates to Supabase:', error);
        
        // If the profile doesn't exist, try to create it
        if (error?.code === 'PROFILE_NOT_FOUND' || error?.code === 'PGRST116') {
          try {
            console.log('[UserContext] Profile not found, creating new profile...');
            await createUserProfile(authState.user.id, newProfile);
            console.log('[UserContext] Profile created successfully');
          } catch (createError) {
            console.error('[UserContext] Failed to create profile:', createError);
          }
        }
        // Continue with local update even if Supabase fails
      }
    }
  }, [profile, authState]);

  const updateGoals = useCallback(async (goals: Partial<UserGoals>) => {
    const newGoals = { ...profile.goals, ...goals };
    
    // Update local profile first
    await updateProfile({ goals: newGoals });
    
    // Try to update Supabase if user is authenticated
    if (authState.isAuthenticated && authState.user?.id) {
      try {
        console.log('[UserContext] Updating goals in Supabase:', newGoals);
        await updateUserProfile(authState.user.id, {
          body_goal: newGoals.bodyGoal,
          health_goal: newGoals.healthGoal,
          diet_goal: newGoals.dietGoal,
          life_goal: newGoals.lifeGoal,
          motivation: newGoals.motivation,
        });
        console.log('[UserContext] Goals updated in Supabase successfully');
      } catch (error: any) {
        console.error('[UserContext] Failed to update goals in Supabase:', error);
        
        // If the profile doesn't exist, try to create it
        if (error?.code === 'PROFILE_NOT_FOUND' || error?.code === 'PGRST116') {
          try {
            console.log('[UserContext] Profile not found, creating new profile with goals...');
            const profileData = {
              name: profile.name,
              email: authState.user.email || profile.email,
              goals: newGoals,
              hasCompletedQuiz: profile.hasCompletedQuiz,
            };
            await createUserProfile(authState.user.id, profileData);
            console.log('[UserContext] Profile created successfully with updated goals');
          } catch (createError) {
            console.error('[UserContext] Failed to create profile with goals:', createError);
          }
        }
        // Continue with local update even if Supabase fails
      }
    }
  }, [profile.goals, profile.name, profile.email, profile.hasCompletedQuiz, updateProfile, authState]);



  const completeQuiz = useCallback(async (quizData: {
    name: string;
    goals: UserGoals;
    referralSource?: string | null;
  }) => {
    console.log('[UserContext] ===== STARTING QUIZ COMPLETION =====');
    console.log('[UserContext] Quiz data received:', {
      name: quizData.name,
      goals: quizData.goals,
      referralSource: quizData.referralSource
    });
    
    // Get current user session to get email
    console.log('[UserContext] Getting current user session...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[UserContext] Error getting user:', userError);
    }
    
    console.log('[UserContext] Current user:', {
      id: user?.id,
      email: user?.email,
      authenticated: !!user
    });
    
    const userEmail = user?.email || '';
    
    // Always update local profile first (this ensures the quiz is marked as completed)
    console.log('[UserContext] ===== UPDATING LOCAL PROFILE =====');
    console.log('[UserContext] Current profile before update:', {
      name: profile.name,
      hasCompletedQuiz: profile.hasCompletedQuiz
    });
    
    const updatedLocalProfile = {
      name: quizData.name,
      email: userEmail,
      goals: quizData.goals,
      hasCompletedQuiz: true,
    };
    
    console.log('[UserContext] Updating local profile with:', updatedLocalProfile);
    
    await updateProfile(updatedLocalProfile);
    console.log('[UserContext] Local profile updated successfully');
    
    // Try to save to Supabase (but don't fail if it doesn't work)
    console.log('[UserContext] ===== STARTING SUPABASE INTEGRATION =====');
    try {
      // User should already be authenticated from the quiz flow
      if (!user?.id) {
        throw new Error('No authenticated user found - user must complete email verification first');
      }
      
      const userId = user.id;
      console.log('[UserContext] Using authenticated user ID:', userId);
      
      // Save quiz response to database
      console.log('[UserContext] Saving quiz response to database...');
      console.log('[UserContext] Quiz response data:', {
        userId,
        name: quizData.name,
        bodyGoal: quizData.goals.bodyGoal,
        healthGoal: quizData.goals.healthGoal,
        dietGoal: quizData.goals.dietGoal,
        lifeGoal: quizData.goals.lifeGoal,
        motivation: quizData.goals.motivation,
        referralSource: quizData.referralSource || 'unknown'
      });
      
      const quizResponse = await saveQuizResponse(userId, {
        name: quizData.name,
        goals: quizData.goals,
        referralSource: quizData.referralSource,
      });
      console.log('[UserContext] ✅ Quiz response saved successfully:', quizResponse?.id);
      
      // Create or update user profile in database
      console.log('[UserContext] Creating/updating user profile in database...');
      const profileData = {
        name: quizData.name,
        email: user.email || '',
        goals: quizData.goals,
        hasCompletedQuiz: true,

      };
      
      console.log('[UserContext] Profile data for database:', {
        userId,
        name: profileData.name,
        email: profileData.email,
        bodyGoal: profileData.goals.bodyGoal,
        healthGoal: profileData.goals.healthGoal,
        dietGoal: profileData.goals.dietGoal,
        lifeGoal: profileData.goals.lifeGoal,
        motivation: profileData.goals.motivation,
        hasCompletedQuiz: profileData.hasCompletedQuiz
      });
      
      try {
        // Try to update existing profile first
        console.log('[UserContext] Attempting to update existing profile...');
        const updatedProfile = await updateUserProfile(userId, {
          name: profileData.name,
          email: profileData.email,
          body_goal: profileData.goals.bodyGoal,
          health_goal: profileData.goals.healthGoal,
          diet_goal: profileData.goals.dietGoal,
          life_goal: profileData.goals.lifeGoal,
          motivation: profileData.goals.motivation,
          has_completed_quiz: profileData.hasCompletedQuiz,
        });
        console.log('[UserContext] ✅ Updated existing user profile:', updatedProfile?.id);
      } catch (updateError: any) {
        console.log('[UserContext] Update failed, creating new profile...');
        console.log('[UserContext] Update error:', {
          message: updateError?.message,
          code: updateError?.code,
          details: updateError?.details
        });
        
        // Check if it's the specific "profile not found" error or the original PGRST116
        if (updateError?.code === 'PROFILE_NOT_FOUND' || updateError?.code === 'PGRST116') {
          console.log('[UserContext] Profile does not exist, creating new one...');
          const newProfile = await createUserProfile(userId, profileData);
          console.log('[UserContext] ✅ Created new user profile:', newProfile?.id);
        } else {
          // Re-throw other errors
          throw updateError;
        }
      }
      
      console.log('[UserContext] ✅ Supabase integration completed successfully');
      
    } catch (error: any) {
      console.error('[UserContext] ❌ Supabase integration failed:', error);
      console.error('[UserContext] Full error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      console.log('[UserContext] Continuing with local storage only');
    }
    
    console.log('[UserContext] ===== QUIZ COMPLETION FINISHED =====');
    
    return { leveledUp: false };
  }, [profile, updateProfile]);

  const logout = useCallback(async () => {
    try {
      console.log('[UserContext] Logging out user...');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[UserContext] Error signing out:', error);
      }
      
      // Clear local storage
      await AsyncStorage.removeItem(STORAGE_KEY);
      
      // Reset profile to default
      setProfile(defaultProfile);
      
      // Auth state will be updated by the auth state change listener
      console.log('[UserContext] User logged out successfully');
      
    } catch (error) {
      console.error('[UserContext] Error during logout:', error);
      // Even if there's an error, reset the local state
      setProfile(defaultProfile);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  // Helper function to calculate streak using PST timezone
  const calculateStreak = useCallback((scanDates: string[], lastScanDate: string | null): { currentStreak: number; longestStreak: number } => {
    if (scanDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }
    
    // Sort dates in descending order (most recent first)
    const sortedDates = [...scanDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    // Calculate current streak using PST timezone
    let currentStreak = 0;
    const now = new Date();
    const pstOffset = -8 * 60; // PST is UTC-8 (in minutes)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const pstTime = new Date(utc + (pstOffset * 60000));
    const todayStr = format(pstTime, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(pstTime, 1), 'yyyy-MM-dd');
    
    // Check if user scanned today or yesterday to maintain streak
    if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
      currentStreak = 1;
      let checkDate = new Date(sortedDates[0]);
      
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = subDays(checkDate, 1);
        const prevDateStr = format(prevDate, 'yyyy-MM-dd');
        
        if (sortedDates[i] === prevDateStr) {
          currentStreak++;
          checkDate = prevDate;
        } else {
          break;
        }
      }
    }
    
    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]);
      const prevDate = new Date(sortedDates[i - 1]);
      const daysDiff = differenceInDays(prevDate, currentDate);
      
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    
    return { currentStreak, longestStreak };
  }, []);
  
  const updateScanStreak = useCallback(async (score: number) => {
    // Update streak tracking without XP using PST timezone
    const now = new Date();
    const pstOffset = -8 * 60; // PST is UTC-8 (in minutes)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const pstTime = new Date(utc + (pstOffset * 60000));
    const today = format(pstTime, 'yyyy-MM-dd');
    const updatedScanDates = [...profile.scanDates];
    
    // Only add today's date if it's not already there
    if (!updatedScanDates.includes(today)) {
      updatedScanDates.push(today);
    }
    
    // Calculate new streak
    const { currentStreak, longestStreak } = calculateStreak(updatedScanDates, today);
    
    // Update profile with new streak data
    await updateProfile({
      currentStreak,
      longestStreak: Math.max(longestStreak, profile.longestStreak),
      lastScanDate: today,
      scanDates: updatedScanDates,
    });
    
    console.log(`[Streak] Current: ${currentStreak}, Longest: ${Math.max(longestStreak, profile.longestStreak)} (PST)`);
    
    return { leveledUp: false };
  }, [profile, updateProfile, calculateStreak]);

  // Helper function to get streak history for calendar display using PST timezone
  const getStreakHistory = useCallback((days: number = 7) => {
    const history = [];
    // Use PST timezone (UTC-8) for consistent date calculation
    const now = new Date();
    const pstOffset = -8 * 60; // PST is UTC-8 (in minutes)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const pstTime = new Date(utc + (pstOffset * 60000));
    const today = new Date(pstTime.getFullYear(), pstTime.getMonth(), pstTime.getDate());
    
    // Create 7-day calendar: 6 days from yesterday to today + 1 day in advance
    for (let i = -5; i <= 1; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const isToday = i === 0;
      const isFuture = i > 0;
      
      history.push({
        date: dateStr,
        scanned: profile.scanDates.includes(dateStr),
        isToday,
        isFuture,
      });
    }
    
    console.log('[getStreakHistory] Generated 7-day calendar (PST):', history.map(h => ({ date: h.date, scanned: h.scanned, isToday: h.isToday, isFuture: h.isFuture })));
    console.log('[getStreakHistory] Today is (PST):', format(today, 'yyyy-MM-dd'));
    console.log('[getStreakHistory] Current scan dates:', profile.scanDates);
    return history;
  }, [profile.scanDates]);
  
  return useMemo(() => ({
    profile,
    isLoading,
    authState,
    updateProfile,
    updateGoals,
    completeQuiz,
    updateScanStreak,
    getStreakHistory,
    logout,
  }), [profile, isLoading, authState, updateProfile, updateGoals, completeQuiz, updateScanStreak, getStreakHistory, logout]);
});