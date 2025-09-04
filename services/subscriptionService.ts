import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type SubscriptionPlan = 'free' | 'weekly' | 'monthly' | 'yearly';

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt?: Date;
  trialEndsAt?: Date;
  purchaseToken?: string;
  originalTransactionId?: string;
}

export interface SubscriptionProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  period: 'week' | 'month' | 'year';
  trialPeriod?: number; // days
}

// Mock products for development - replace with actual App Store/Play Store product IDs
const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: 'weekly_premium',
    title: 'Weekly Premium',
    description: 'Unlimited scans and premium features',
    price: '$4.99',
    currency: 'USD',
    period: 'week',
    trialPeriod: 3
  },
  {
    id: 'monthly_premium',
    title: 'Monthly Premium',
    description: 'Unlimited scans and premium features',
    price: '$9.99',
    currency: 'USD',
    period: 'month',
    trialPeriod: 7
  },
  {
    id: 'yearly_premium',
    title: 'Yearly Premium',
    description: 'Unlimited scans and premium features - Best Value!',
    price: '$59.99',
    currency: 'USD',
    period: 'year',
    trialPeriod: 7
  }
];

class SubscriptionService {
  private static instance: SubscriptionService;
  private listeners: ((status: SubscriptionStatus) => void)[] = [];
  
  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  // Get available subscription products
  async getProducts(): Promise<SubscriptionProduct[]> {
    // In a real app, this would fetch from App Store/Play Store
    return SUBSCRIPTION_PRODUCTS;
  }

  // Add listener for subscription status changes
  addListener(callback: (status: SubscriptionStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(status: SubscriptionStatus): void {
    this.listeners.forEach(callback => callback(status));
  }

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const stored = await AsyncStorage.getItem('subscription_status');
      if (stored) {
        const parsed = JSON.parse(stored);
        const status = {
          ...parsed,
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
          trialEndsAt: parsed.trialEndsAt ? new Date(parsed.trialEndsAt) : undefined,
        };
        
        // Check if subscription has expired
        if (status.expiresAt && new Date() > status.expiresAt) {
          const expiredStatus = { plan: 'free' as const, isActive: false };
          await this.updateSubscriptionStatus(expiredStatus);
          return expiredStatus;
        }
        
        return status;
      }
    } catch (error) {
      console.error('Error getting subscription status:', error);
    }
    
    return { plan: 'free', isActive: false };
  }

  private async updateSubscriptionStatus(status: SubscriptionStatus): Promise<void> {
    await AsyncStorage.setItem('subscription_status', JSON.stringify(status));
    this.notifyListeners(status);
  }

  async startTrial(productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const product = SUBSCRIPTION_PRODUCTS.find(p => p.id === productId);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + (product.trialPeriod || 3));
      
      const status: SubscriptionStatus = {
        plan: product.period === 'week' ? 'weekly' : product.period === 'month' ? 'monthly' : 'yearly',
        isActive: true,
        trialEndsAt,
      };
      
      await this.updateSubscriptionStatus(status);
      return { success: true };
    } catch (error) {
      console.error('Error starting trial:', error);
      return { success: false, error: 'Failed to start trial' };
    }
  }

  async purchaseSubscription(productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real app, this would trigger the native purchase flow
      if (Platform.OS === 'web') {
        // For web, you might redirect to Stripe or another payment processor
        return { success: false, error: 'Web purchases not supported in this demo' };
      }

      const product = SUBSCRIPTION_PRODUCTS.find(p => p.id === productId);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      // Simulate purchase process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const expiresAt = new Date();
      if (product.period === 'week') {
        expiresAt.setDate(expiresAt.getDate() + 7);
      } else if (product.period === 'month') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }
      
      const status: SubscriptionStatus = {
        plan: product.period === 'week' ? 'weekly' : product.period === 'month' ? 'monthly' : 'yearly',
        isActive: true,
        expiresAt,
        purchaseToken: `mock_token_${Date.now()}`,
        originalTransactionId: `mock_transaction_${Date.now()}`
      };
      
      await this.updateSubscriptionStatus(status);
      return { success: true };
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      return { success: false, error: 'Purchase failed' };
    }
  }

  async restorePurchases(): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real app, this would restore purchases from App Store/Play Store
      console.log('Restoring purchases...');
      
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, we'll just return the current status
      await this.getSubscriptionStatus();
      return { success: true };
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return { success: false, error: 'Failed to restore purchases' };
    }
  }

  async cancelSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      const status: SubscriptionStatus = {
        plan: 'free',
        isActive: false,
      };
      
      await this.updateSubscriptionStatus(status);
      return { success: true };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return { success: false, error: 'Failed to cancel subscription' };
    }
  }

  async isTrialActive(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    if (!status.trialEndsAt) return false;
    return new Date() < status.trialEndsAt;
  }

  async isPremium(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    if (!status.isActive) return false;
    
    if (status.trialEndsAt && new Date() < status.trialEndsAt) {
      return true; // Trial is active
    }
    
    if (status.expiresAt && new Date() < status.expiresAt) {
      return true; // Subscription is active
    }
    
    return false;
  }

  async getRemainingTrialDays(): Promise<number> {
    const status = await this.getSubscriptionStatus();
    if (!status.trialEndsAt) return 0;
    
    const now = new Date();
    const trialEnd = status.trialEndsAt;
    
    if (now >= trialEnd) return 0;
    
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  async getSubscriptionInfo(): Promise<{
    isActive: boolean;
    plan: SubscriptionPlan;
    daysRemaining?: number;
    isTrialActive: boolean;
    trialDaysRemaining?: number;
  }> {
    const status = await this.getSubscriptionStatus();
    const isTrialActive = await this.isTrialActive();
    const trialDaysRemaining = await this.getRemainingTrialDays();
    
    let daysRemaining: number | undefined;
    if (status.expiresAt) {
      const now = new Date();
      const diffTime = status.expiresAt.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    
    return {
      isActive: status.isActive,
      plan: status.plan,
      daysRemaining,
      isTrialActive,
      trialDaysRemaining: isTrialActive ? trialDaysRemaining : undefined
    };
  }
}

export default SubscriptionService.getInstance();