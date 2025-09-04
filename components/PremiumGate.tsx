import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Crown, Lock } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import Paywall from './Paywall';

interface PremiumGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  feature?: string;
}

export default function PremiumGate({ 
  children, 
  title = 'Premium Feature',
  description = 'This feature requires a premium subscription',
  feature = 'premium feature'
}: PremiumGateProps) {
  const { isPremium, isTrialActive } = useSubscription();
  const [showPaywall, setShowPaywall] = useState<boolean>(false);

  const hasAccess = isPremium || isTrialActive;

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Crown size={32} color="#FF6B35" />
          <Lock size={16} color="#FF6B35" style={styles.lockIcon} />
        </View>
        
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => setShowPaywall(true)}
          testID="premium-gate-upgrade-button"
        >
          <Crown size={20} color="#FFFFFF" />
          <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showPaywall}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <Paywall
          onClose={() => setShowPaywall(false)}
          title={`Unlock ${feature}`}
          subtitle="Get premium access to all features"
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  lockIcon: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});