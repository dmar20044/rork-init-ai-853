import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import SubscriptionService, { SubscriptionStatus, SubscriptionProduct } from '@/services/subscriptionService';

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [status, setStatus] = useState<SubscriptionStatus>({ plan: 'free', isActive: false });
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isTrialActive, setIsTrialActive] = useState<boolean>(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(0);

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const [currentStatus, premiumStatus, trialStatus, trialDays, availableProducts] = await Promise.all([
        SubscriptionService.getSubscriptionStatus(),
        SubscriptionService.isPremium(),
        SubscriptionService.isTrialActive(),
        SubscriptionService.getRemainingTrialDays(),
        SubscriptionService.getProducts()
      ]);

      setStatus(currentStatus);
      setIsPremium(premiumStatus);
      setIsTrialActive(trialStatus);
      setTrialDaysRemaining(trialDays);
      setProducts(availableProducts);
    } catch (error) {
      console.error('Error refreshing subscription status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startTrial = useCallback(async (productId: string) => {
    const result = await SubscriptionService.startTrial(productId);
    if (result.success) {
      await refreshStatus();
    }
    return result;
  }, [refreshStatus]);

  const purchaseSubscription = useCallback(async (productId: string) => {
    const result = await SubscriptionService.purchaseSubscription(productId);
    if (result.success) {
      await refreshStatus();
    }
    return result;
  }, [refreshStatus]);

  const restorePurchases = useCallback(async () => {
    const result = await SubscriptionService.restorePurchases();
    if (result.success) {
      await refreshStatus();
    }
    return result;
  }, [refreshStatus]);

  const cancelSubscription = useCallback(async () => {
    const result = await SubscriptionService.cancelSubscription();
    if (result.success) {
      await refreshStatus();
    }
    return result;
  }, [refreshStatus]);

  useEffect(() => {
    refreshStatus();

    // Listen for subscription status changes
    const unsubscribe = SubscriptionService.addListener((newStatus) => {
      setStatus(newStatus);
      refreshStatus();
    });

    return unsubscribe;
  }, [refreshStatus]);

  return useMemo(() => ({
    status,
    products,
    isLoading,
    isPremium,
    isTrialActive,
    trialDaysRemaining,
    startTrial,
    purchaseSubscription,
    restorePurchases,
    cancelSubscription,
    refreshStatus
  }), [status, products, isLoading, isPremium, isTrialActive, trialDaysRemaining, startTrial, purchaseSubscription, restorePurchases, cancelSubscription, refreshStatus]);
});