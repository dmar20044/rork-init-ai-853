import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Crown, Calendar, RefreshCw, X } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import Paywall from '@/components/Paywall';

export default function SubscriptionScreen() {
  const {
    status,
    isPremium,
    isTrialActive,
    trialDaysRemaining,
    refreshStatus,
    cancelSubscription,
    restorePurchases
  } = useSubscription();

  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await cancelSubscription();
            setLoading(false);
            
            if (result.success) {
              Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled.');
            } else {
              Alert.alert('Error', result.error || 'Failed to cancel subscription');
            }
          }
        }
      ]
    );
  };

  const handleRestorePurchases = async () => {
    setLoading(true);
    const result = await restorePurchases();
    setLoading(false);
    
    if (result.success) {
      Alert.alert('Success', 'Your purchases have been restored.');
    } else {
      Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = () => {
    if (isPremium) return '#4CAF50';
    if (isTrialActive) return '#FF9800';
    return '#9E9E9E';
  };

  const getStatusText = () => {
    if (isTrialActive) return `Trial (${trialDaysRemaining} days left)`;
    if (isPremium) return 'Premium Active';
    return 'Free Plan';
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Subscription',
            headerRight: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            )
          }} 
        />
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Crown size={32} color={getStatusColor()} />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Current Plan</Text>
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
            </View>

            {status.expiresAt && (
              <View style={styles.statusDetail}>
                <Calendar size={16} color="#666" />
                <Text style={styles.statusDetailText}>
                  Expires: {formatDate(status.expiresAt)}
                </Text>
              </View>
            )}

            {status.trialEndsAt && (
              <View style={styles.statusDetail}>
                <Calendar size={16} color="#666" />
                <Text style={styles.statusDetailText}>
                  Trial ends: {formatDate(status.trialEndsAt)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage Subscription</Text>
            
            {!isPremium && !isTrialActive && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowPaywall(true)}
              >
                <Crown size={20} color="#FF6B35" />
                <Text style={styles.actionButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleRestorePurchases}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <RefreshCw size={20} color="#666" />
              )}
              <Text style={styles.secondaryButtonText}>Restore Purchases</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => refreshStatus()}
            >
              <RefreshCw size={20} color="#666" />
              <Text style={styles.secondaryButtonText}>Refresh Status</Text>
            </TouchableOpacity>

            {(isPremium || isTrialActive) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleCancelSubscription}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#F44336" />
                ) : (
                  <X size={20} color="#F44336" />
                )}
                <Text style={styles.dangerButtonText}>Cancel Subscription</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Features</Text>
            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>• Unlimited food scans</Text>
              <Text style={styles.featureItem}>• Advanced nutrition analysis</Text>
              <Text style={styles.featureItem}>• Personalized recommendations</Text>
              <Text style={styles.featureItem}>• Premium ingredient insights</Text>
              <Text style={styles.featureItem}>• Ad-free experience</Text>
              <Text style={styles.featureItem}>• Priority customer support</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing Information</Text>
            <View style={styles.billingInfo}>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Plan:</Text>
                <Text style={styles.billingValue}>{status.plan}</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Status:</Text>
                <Text style={[styles.billingValue, { color: getStatusColor() }]}>
                  {status.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
              {status.purchaseToken && (
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>Purchase ID:</Text>
                  <Text style={styles.billingValue}>
                    {status.purchaseToken.substring(0, 16)}...
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Subscriptions are managed through your device&apos;s App Store or Google Play Store. 
              To cancel, go to your device settings and manage subscriptions.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          title="Upgrade to Premium"
          subtitle="Unlock all features and get the most out of your nutrition journey"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDetailText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
  },
  dangerButton: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginLeft: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 12,
  },
  featuresList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  featureItem: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
    lineHeight: 24,
  },
  billingInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billingLabel: {
    fontSize: 16,
    color: '#666666',
  },
  billingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
});