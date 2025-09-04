import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Crown, Check, Sparkles } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SubscriptionProduct } from '@/services/subscriptionService';

interface PaywallProps {
  onClose: () => void;
  title?: string;
  subtitle?: string;
  features?: string[];
}

const DEFAULT_FEATURES = [
  'Unlimited food scans',
  'Advanced nutrition analysis',
  'Personalized recommendations',
  'Premium ingredient insights',
  'Ad-free experience',
  'Priority customer support'
];

export default function Paywall({ 
  onClose, 
  title = 'Unlock Premium Features',
  subtitle = 'Get the most out of your nutrition journey',
  features = DEFAULT_FEATURES
}: PaywallProps) {
  const { 
    products, 
    isLoading, 
    startTrial, 
    purchaseSubscription, 
    restorePurchases,
    isTrialActive,
    trialDaysRemaining
  } = useSubscription();
  
  const [selectedProduct, setSelectedProduct] = useState<string>('monthly_premium');
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(false);

  const handleStartTrial = async () => {
    if (purchasing) return;
    
    setPurchasing(true);
    try {
      const result = await startTrial(selectedProduct);
      if (result.success) {
        Alert.alert(
          'Trial Started!',
          'Your free trial has begun. Enjoy premium features!',
          [{ text: 'Continue', onPress: onClose }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to start trial');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchase = async () => {
    if (purchasing) return;
    
    setPurchasing(true);
    try {
      const result = await purchaseSubscription(selectedProduct);
      if (result.success) {
        Alert.alert(
          'Purchase Successful!',
          'Welcome to Premium! Enjoy unlimited access.',
          [{ text: 'Continue', onPress: onClose }]
        );
      } else {
        Alert.alert('Purchase Failed', result.error || 'Unable to complete purchase');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        Alert.alert(
          'Purchases Restored',
          'Your previous purchases have been restored.',
          [{ text: 'Continue', onPress: onClose }]
        );
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const getProductPrice = (product: SubscriptionProduct) => {
    if (product.period === 'year') {
      return `${product.price}/year`;
    } else if (product.period === 'month') {
      return `${product.price}/month`;
    } else {
      return `${product.price}/week`;
    }
  };

  const getProductSavings = (product: SubscriptionProduct) => {
    if (product.period === 'year') {
      return 'Save 70%';
    } else if (product.period === 'month') {
      return 'Most Popular';
    }
    return null;
  };

  const selectedProductData = products.find(p => p.id === selectedProduct);
  const hasTrialAvailable = selectedProductData?.trialPeriod && !isTrialActive;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FF6B35', '#F7931E']}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              testID="paywall-close-button"
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.iconContainer}>
              <Crown size={48} color="#FFFFFF" />
              <Sparkles size={24} color="#FFFFFF" style={styles.sparkle} />
            </View>
            
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.content}>
            {isTrialActive && (
              <View style={styles.trialBanner}>
                <Text style={styles.trialText}>
                  {trialDaysRemaining} days left in your free trial
                </Text>
              </View>
            )}

            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Premium Features</Text>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Check size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <View style={styles.plansContainer}>
              <Text style={styles.plansTitle}>Choose Your Plan</Text>
              {products.map((product) => {
                const isSelected = selectedProduct === product.id;
                const savings = getProductSavings(product);
                
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.planItem, isSelected && styles.selectedPlan]}
                    onPress={() => setSelectedProduct(product.id)}
                    testID={`plan-${product.id}`}
                  >
                    {savings && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsText}>{savings}</Text>
                      </View>
                    )}
                    
                    <View style={styles.planContent}>
                      <Text style={[styles.planTitle, isSelected && styles.selectedPlanText]}>
                        {product.title}
                      </Text>
                      <Text style={[styles.planPrice, isSelected && styles.selectedPlanText]}>
                        {getProductPrice(product)}
                      </Text>
                      <Text style={styles.planDescription}>
                        {product.description}
                      </Text>
                      {product.trialPeriod && !isTrialActive && (
                        <Text style={styles.trialInfo}>
                          {product.trialPeriod} days free trial
                        </Text>
                      )}
                    </View>
                    
                    <View style={[styles.radioButton, isSelected && styles.selectedRadio]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.buttonsContainer}>
              {hasTrialAvailable ? (
                <TouchableOpacity
                  style={[styles.primaryButton, purchasing && styles.disabledButton]}
                  onPress={handleStartTrial}
                  disabled={purchasing}
                  testID="start-trial-button"
                >
                  {purchasing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Start {selectedProductData?.trialPeriod} Day Free Trial
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryButton, purchasing && styles.disabledButton]}
                  onPress={handlePurchase}
                  disabled={purchasing || Platform.OS === 'web'}
                  testID="purchase-button"
                >
                  {purchasing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {Platform.OS === 'web' ? 'Not Available on Web' : `Subscribe for ${selectedProductData?.price}`}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.secondaryButton, restoring && styles.disabledButton]}
                onPress={handleRestore}
                disabled={restoring}
                testID="restore-button"
              >
                {restoring ? (
                  <ActivityIndicator size="small" color="#FF6B35" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Restore Purchases</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Subscriptions auto-renew unless cancelled. Cancel anytime in your device settings.
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B35',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  sparkle: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: '70%',
  },
  trialBanner: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  trialText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 12,
    flex: 1,
  },
  plansContainer: {
    marginBottom: 30,
  },
  plansTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  planItem: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPlan: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF3F0',
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  planContent: {
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  selectedPlanText: {
    color: '#FF6B35',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 4,
  },
  trialInfo: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  selectedRadio: {
    borderColor: '#FF6B35',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35',
  },
  buttonsContainer: {
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 16,
  },
});