import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionPlan = 'free' | 'weekly' | 'monthly';

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt?: Date;
  trialEndsAt?: Date;
}

class SubscriptionService {
  private static instance: SubscriptionService;
  
  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const stored = await AsyncStorage.getItem('subscription_status');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
          trialEndsAt: parsed.trialEndsAt ? new Date(parsed.trialEndsAt) : undefined,
        };
      }
    } catch (error) {
      console.error('Error getting subscription status:', error);
    }
    
    return { plan: 'free', isActive: false };
  }

  async startTrial(): Promise<void> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 3); // 3 day trial
    
    const status: SubscriptionStatus = {
      plan: 'monthly',
      isActive: true,
      trialEndsAt,
    };
    
    await AsyncStorage.setItem('subscription_status', JSON.stringify(status));
  }

  async subscribe(plan: 'weekly' | 'monthly'): Promise<void> {
    const expiresAt = new Date();
    if (plan === 'weekly') {
      expiresAt.setDate(expiresAt.getDate() + 7);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }
    
    const status: SubscriptionStatus = {
      plan,
      isActive: true,
      expiresAt,
    };
    
    await AsyncStorage.setItem('subscription_status', JSON.stringify(status));
  }

  async cancelSubscription(): Promise<void> {
    const status: SubscriptionStatus = {
      plan: 'free',
      isActive: false,
    };
    
    await AsyncStorage.setItem('subscription_status', JSON.stringify(status));
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
}

export default SubscriptionService.getInstance();