// Paywall Screen - Subscription plans with Card Payment option
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PostyMascot } from '@/components/PostyMascot';
import { AppFooter } from '@/components/AppFooter';
import { useAppStore } from '@/lib/store';
import { isEligibleForFreePlan } from '@/lib/types';
import {
  ArrowLeft,
  Check,
  Star,
  Crown,
  Users,
  Mail,
  Gift,
  Sparkles,
  X,
  Award,
  CreditCard,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatEnabled,
} from '@/lib/revenuecatClient';
import { isStripeEnabled } from '@/lib/stripeClient';
import { CardPaymentModal } from '@/components/CardPaymentModal';
import type { PurchasesPackage } from 'react-native-purchases';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
  isFree?: boolean;
  color: string;
  icon: React.ReactNode;
}

const PLAN_DETAILS: Record<string, Omit<Plan, 'price'>> = {
  '$rc_custom_free': {
    id: 'free',
    name: 'Free Trial',
    period: '/month',
    description: 'Certificate & Stickers Only',
    color: '#10B981',
    isFree: true,
    icon: <Award size={24} color="#10B981" />,
    features: [
      { text: '1 month free trial', included: true },
      { text: '1 child profile only', included: true },
      { text: 'Certificate of achievement', included: true },
      { text: 'Sticker pack included', included: true },
      { text: 'Basic task tracking', included: true },
      { text: 'Mail rewards', included: false },
      { text: 'Gift card rewards', included: false },
    ],
  },
  '$rc_custom_basic': {
    id: 'basic',
    name: 'Basic',
    period: '/month',
    description: '1 Child Profile',
    color: '#4A90E2',
    icon: <Star size={24} color="#4A90E2" />,
    features: [
      { text: '1 child profile', included: true },
      { text: 'Daily task assignments', included: true },
      { text: 'Mail rewards tracking', included: true },
      { text: 'Basic badges & achievements', included: true },
      { text: 'Multiple children', included: false },
      { text: 'Custom tasks', included: false },
      { text: 'AI task verification', included: false },
    ],
  },
  '$rc_custom_standard': {
    id: 'standard',
    name: 'Standard',
    period: '/month',
    description: 'Up to 3 Children',
    color: '#22C55E',
    icon: <Users size={24} color="#22C55E" />,
    popular: true,
    features: [
      { text: 'Up to 3 child profiles', included: true },
      { text: 'Daily task assignments', included: true },
      { text: 'Mail rewards tracking', included: true },
      { text: 'All badges & achievements', included: true },
      { text: 'Custom tasks', included: true },
      { text: 'AI task verification', included: true },
      { text: 'Gift card rewards', included: false },
    ],
  },
  '$rc_custom_premium': {
    id: 'premium',
    name: 'Premium',
    period: '/month',
    description: 'Unlimited Children',
    color: '#A78BFA',
    icon: <Crown size={24} color="#A78BFA" />,
    features: [
      { text: 'Unlimited child profiles', included: true },
      { text: 'Daily task assignments', included: true },
      { text: 'Mail rewards tracking', included: true },
      { text: 'All badges & achievements', included: true },
      { text: 'Custom tasks', included: true },
      { text: 'AI task verification', included: true },
      { text: 'Gift card rewards', included: true },
    ],
  },
};

// Fallback plans for when RevenueCat isn't configured
const FALLBACK_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 'FREE',
    period: '/month',
    description: 'Certificate & Stickers Only',
    color: '#10B981',
    isFree: true,
    icon: <Award size={24} color="#10B981" />,
    features: [
      { text: '1 month free trial', included: true },
      { text: '1 child profile only', included: true },
      { text: 'Certificate of achievement', included: true },
      { text: 'Sticker pack included', included: true },
      { text: 'Basic task tracking', included: true },
      { text: 'Mail rewards', included: false },
      { text: 'Gift card rewards', included: false },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '$9.99',
    period: '/month',
    description: '1 Child Profile',
    color: '#4A90E2',
    icon: <Star size={24} color="#4A90E2" />,
    features: [
      { text: '1 child profile', included: true },
      { text: 'Daily task assignments', included: true },
      { text: 'Mail rewards tracking', included: true },
      { text: 'Basic badges & achievements', included: true },
      { text: 'Multiple children', included: false },
      { text: 'Custom tasks', included: false },
      { text: 'AI task verification', included: false },
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$19.99',
    period: '/month',
    description: 'Up to 3 Children',
    color: '#22C55E',
    popular: true,
    icon: <Users size={24} color="#22C55E" />,
    features: [
      { text: 'Up to 3 child profiles', included: true },
      { text: 'Daily task assignments', included: true },
      { text: 'Mail rewards tracking', included: true },
      { text: 'All badges & achievements', included: true },
      { text: 'Custom tasks', included: true },
      { text: 'AI task verification', included: true },
      { text: 'Gift card rewards', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$29.99',
    period: '/month',
    description: 'Unlimited Children',
    color: '#A78BFA',
    icon: <Crown size={24} color="#A78BFA" />,
    features: [
      { text: 'Unlimited child profiles', included: true },
      { text: 'Daily task assignments', included: true },
      { text: 'Mail rewards tracking', included: true },
      { text: 'All badges & achievements', included: true },
      { text: 'Custom tasks', included: true },
      { text: 'AI task verification', included: true },
      { text: 'Gift card rewards', included: true },
    ],
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const setSubscription = useAppStore((s) => s.setSubscription);
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const currentUser = useAppStore((s) => s.currentUser);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [selectedFallbackPlan, setSelectedFallbackPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [useFallbackPlans, setUseFallbackPlans] = useState(false);

  const isWeb = Platform.OS === 'web';
  
  // Check if user is eligible for free plan (first-time signup only)
  const canSelectFreePlan = isEligibleForFreePlan(currentUser?.subscription);
  
  // Filter fallback plans based on eligibility
  const availableFallbackPlans = useMemo(() => {
    if (canSelectFreePlan) return FALLBACK_PLANS;
    return FALLBACK_PLANS.filter(plan => plan.id !== 'free');
  }, [canSelectFreePlan]);

  // Determine where to navigate after successful purchase/selection
  const handleSuccessNavigation = () => {
    if (!isOnboarded) {
      // During onboarding, go to shipping
      router.replace('/setup/shipping');
    } else {
      // Already onboarded, just go back
      router.back();
    }
  };

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setIsLoading(true);
    console.log('[Paywall] Loading offerings...');
    console.log('[Paywall] isRevenueCatEnabled:', isRevenueCatEnabled());

    if (!isRevenueCatEnabled()) {
      console.log('[Paywall] RevenueCat not enabled, using fallback plans');
      setUseFallbackPlans(true);
      // Select standard plan by default
      const standardPlan = availableFallbackPlans.find(p => p.id === 'standard');
      setSelectedFallbackPlan(standardPlan ?? availableFallbackPlans[0]);
      setIsLoading(false);
      return;
    }

    try {
      const result = await getOfferings();
      console.log('[Paywall] Offerings result:', JSON.stringify(result, null, 2));

      if (result.ok && result.data.current) {
        const availablePackages = result.data.current.availablePackages;
        console.log('[Paywall] Available packages count:', availablePackages.length);
        console.log('[Paywall] Package identifiers:', availablePackages.map(p => p.identifier));

        if (availablePackages.length === 0) {
          // No packages available, use fallback
          setUseFallbackPlans(true);
          const standardPlan = availableFallbackPlans.find(p => p.id === 'standard');
          setSelectedFallbackPlan(standardPlan ?? availableFallbackPlans[0]);
        } else {
          // Filter out free plan for ineligible users (only first-time signups can get free plan)
          let filteredPackages = availablePackages;
          if (!canSelectFreePlan) {
            filteredPackages = availablePackages.filter(
              (pkg) => pkg.identifier !== '$rc_custom_free'
            );
          }
          
          // Sort packages: free first, then basic, standard, premium
          const sortedPackages = filteredPackages.sort((a, b) => {
            const order = ['$rc_custom_free', '$rc_custom_basic', '$rc_custom_standard', '$rc_custom_premium'];
            return order.indexOf(a.identifier) - order.indexOf(b.identifier);
          });
          setPackages(sortedPackages);
          // Select standard plan by default (most popular)
          const standardPkg = sortedPackages.find(p => p.identifier === '$rc_custom_standard');
          setSelectedPackage(standardPkg ?? sortedPackages[0] ?? null);
        }
      } else {
        console.log('[Paywall] No current offering or result not ok, using fallback');
        setUseFallbackPlans(true);
        const standardPlan = availableFallbackPlans.find(p => p.id === 'standard');
        setSelectedFallbackPlan(standardPlan ?? availableFallbackPlans[0]);
      }
    } catch (error) {
      console.log('[Paywall] Error loading offerings:', error);
      setUseFallbackPlans(true);
      const standardPlan = availableFallbackPlans.find(p => p.id === 'standard');
      setSelectedFallbackPlan(standardPlan ?? availableFallbackPlans[0]);
    }
    setIsLoading(false);
  };

  const handleFreePlan = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    // Set a free subscription in the local store
    setSubscription('free'); // Set free plan for free trial
    Alert.alert(
      'Welcome to Posty!',
      'You\'ve started your free trial! You\'ll receive a certificate and stickers. Upgrade anytime for more features.',
      [{ text: 'Get Started', onPress: handleSuccessNavigation }]
    );
  };

  const handlePurchase = async () => {
    // Handle fallback plans
    if (useFallbackPlans && selectedFallbackPlan) {
      if (selectedFallbackPlan.isFree) {
        handleFreePlan();
        return;
      }
      // For paid plans in fallback mode, show card payment
      setShowCardPayment(true);
      return;
    }

    if (!selectedPackage) return;

    // Handle free plan locally
    if (selectedPackage.identifier === '$rc_custom_free') {
      handleFreePlan();
      return;
    }

    setIsPurchasing(true);
    impactAsync(ImpactFeedbackStyle.Medium);

    try {
      const result = await purchasePackage(selectedPackage);

      if (result.ok) {
        notificationAsync(NotificationFeedbackType.Success);

        // Update local subscription state based on package
        const planMap: Record<string, 'basic' | 'standard' | 'premium'> = {
          '$rc_custom_basic': 'basic',
          '$rc_custom_standard': 'standard',
          '$rc_custom_premium': 'premium',
        };
        const plan = planMap[selectedPackage.identifier];
        if (plan) {
          setSubscription(plan);
        }

        Alert.alert(
          'Welcome to Posty MagicMail Club!',
          'Your subscription is now active. Enjoy all the features!',
          [{ text: 'Get Started', onPress: handleSuccessNavigation }]
        );
      } else if (result.reason === 'web_not_supported') {
        // On web, offer card payment option
        Alert.alert(
          'Pay with Card?',
          'In-app purchases are not available on web. Would you like to pay with a credit card instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Pay with Card', onPress: () => setShowCardPayment(true) },
          ]
        );
      } else if (result.reason === 'not_configured') {
        Alert.alert(
          'Setup Required',
          'Payments are being configured. Please try again later or contact support.'
        );
      } else {
        // User cancelled - don't show error
        console.log('Purchase not completed:', result.reason);
      }
    } catch (error) {
      console.log('Purchase error:', error);
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    }

    setIsPurchasing(false);
  };

  const handleCardPaymentSuccess = (planId: string) => {
    setShowCardPayment(false);
    const plan = planId as 'basic' | 'standard' | 'premium';
    setSubscription(plan);
    notificationAsync(NotificationFeedbackType.Success);
    Alert.alert(
      'Payment Successful!',
      'Your subscription is now active. Enjoy all the features!',
      [{ text: 'Get Started', onPress: handleSuccessNavigation }]
    );
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    impactAsync(ImpactFeedbackStyle.Light);

    try {
      const result = await restorePurchases();

      if (result.ok) {
        const hasActiveEntitlement = Object.keys(result.data.entitlements.active).length > 0;
        if (hasActiveEntitlement) {
          notificationAsync(NotificationFeedbackType.Success);
          Alert.alert(
            'Purchases Restored',
            'Your subscription has been restored successfully!',
            [{ text: 'Continue', onPress: handleSuccessNavigation }]
          );
        } else {
          Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
        }
      } else {
        Alert.alert('Restore Failed', 'Could not restore purchases. Please try again.');
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Could not restore purchases. Please try again.');
    }

    setIsRestoring(false);
  };

  const handlePayWithCard = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    setShowCardPayment(true);
  };

  const getPackagePrice = (pkg: PurchasesPackage): string => {
    if (pkg.identifier === '$rc_custom_free') {
      return 'FREE';
    }
    return pkg.product.priceString ?? `$${pkg.product.price}`;
  };

  const getPlanForPackage = (pkg: PurchasesPackage): Plan | null => {
    const details = PLAN_DETAILS[pkg.identifier];
    if (!details) return null;
    return {
      ...details,
      price: getPackagePrice(pkg),
    };
  };

  // Get the currently selected plan ID for card payment
  const getSelectedPlanId = (): 'free' | 'basic' | 'standard' | 'premium' => {
    if (useFallbackPlans && selectedFallbackPlan) {
      return selectedFallbackPlan.id as 'free' | 'basic' | 'standard' | 'premium';
    }
    if (selectedPackage) {
      const planMap: Record<string, 'free' | 'basic' | 'standard' | 'premium'> = {
        '$rc_custom_free': 'free',
        '$rc_custom_basic': 'basic',
        '$rc_custom_standard': 'standard',
        '$rc_custom_premium': 'premium',
      };
      return planMap[selectedPackage.identifier] ?? 'standard';
    }
    return 'standard';
  };

  // Check if the selected plan is free
  const isSelectedPlanFree = (): boolean => {
    if (useFallbackPlans) {
      return selectedFallbackPlan?.isFree ?? false;
    }
    return selectedPackage?.identifier === '$rc_custom_free';
  };

  // Get display price for selected plan
  const getSelectedPlanPrice = (): string => {
    if (useFallbackPlans && selectedFallbackPlan) {
      return selectedFallbackPlan.price;
    }
    if (selectedPackage) {
      return getPackagePrice(selectedPackage);
    }
    return '';
  };

  const renderPlanCard = (plan: Plan, isSelected: boolean, onSelect: () => void) => {
    const isFree = plan.isFree;

    return (
      <Pressable
        onPress={onSelect}
        className={`bg-white rounded-2xl p-4 mb-3 border-2 ${
          isSelected ? 'border-blue-500' : 'border-gray-100'
        } ${isFree ? 'border-green-300' : ''}`}
      >
        {plan.popular && (
          <View className="absolute -top-3 right-4 bg-green-500 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">MOST POPULAR</Text>
          </View>
        )}
        {isFree && (
          <View className="absolute -top-3 left-4 bg-green-500 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">FREE TRIAL</Text>
          </View>
        )}

        <View className="flex-row items-center">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: plan.color + '20' }}
          >
            {plan.icon}
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">{plan.name}</Text>
            <Text className="text-gray-500 text-sm">{plan.description}</Text>
          </View>
          <View className="items-end">
            <Text className={`text-2xl font-bold ${isFree ? 'text-green-600' : 'text-gray-900'}`}>
              {plan.price}
            </Text>
            {!isFree && <Text className="text-gray-500 text-sm">{plan.period}</Text>}
          </View>
        </View>

        {isSelected && (
          <View className="mt-4 pt-4 border-t border-gray-100">
            {plan.features.map((feature, idx) => (
              <View key={idx} className="flex-row items-center mb-2">
                <View
                  className={`w-5 h-5 rounded-full items-center justify-center mr-2 ${
                    feature.included ? 'bg-green-100' : 'bg-gray-100'
                  }`}
                >
                  {feature.included ? (
                    <Check size={12} color="#22C55E" />
                  ) : (
                    <X size={12} color="#9CA3AF" />
                  )}
                </View>
                <Text
                  className={`${
                    feature.included ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <X size={24} color="#1F2937" />
          </Pressable>
          {!useFallbackPlans && (
            <Pressable
              onPress={handleRestore}
              disabled={isRestoring}
              className="px-4 py-2"
            >
              <Text className="text-blue-500 font-medium">
                {isRestoring ? 'Restoring...' : 'Restore'}
              </Text>
            </Pressable>
          )}
          {useFallbackPlans && <View className="w-20" />}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="items-center px-6 py-4"
          >
            <PostyMascot size="medium" mood="excited" animate />
            <Text className="text-2xl font-bold text-gray-900 mt-4 text-center">
              Join Posty MagicMail Club!
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              Choose a plan to unlock all features and help your kids build great habits
            </Text>
          </Animated.View>

          {/* Loading State */}
          {isLoading && (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text className="text-gray-500 mt-4">Loading plans...</Text>
            </View>
          )}

          {/* Plans from RevenueCat */}
          {!isLoading && !useFallbackPlans && packages.length > 0 && (
            <View className="px-4">
              {packages.map((pkg, index) => {
                const plan = getPlanForPackage(pkg);
                if (!plan) return null;

                const isSelected = selectedPackage?.identifier === pkg.identifier;

                return (
                  <Animated.View
                    key={pkg.identifier}
                    entering={FadeInDown.delay(200 + index * 100).springify()}
                  >
                    {renderPlanCard(plan, isSelected, () => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setSelectedPackage(pkg);
                    })}
                  </Animated.View>
                );
              })}
            </View>
          )}

          {/* Fallback Plans */}
          {!isLoading && useFallbackPlans && (
            <View className="px-4">
              {availableFallbackPlans.map((plan, index) => {
                const isSelected = selectedFallbackPlan?.id === plan.id;

                return (
                  <Animated.View
                    key={plan.id}
                    entering={FadeInDown.delay(200 + index * 100).springify()}
                  >
                    {renderPlanCard(plan, isSelected, () => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setSelectedFallbackPlan(plan);
                    })}
                  </Animated.View>
                );
              })}
            </View>
          )}

          {/* Benefits */}
          <Animated.View
            entering={FadeInDown.delay(500).springify()}
            className="px-4 mt-4"
          >
            <Text className="text-lg font-bold text-gray-900 mb-3">Why Parents Love Posty</Text>
            <View className="bg-blue-50 rounded-2xl p-4">
              <View className="flex-row items-center mb-3">
                <Mail size={20} color="#4A90E2" />
                <Text className="text-blue-800 font-medium ml-2">Real mail rewards for kids</Text>
              </View>
              <View className="flex-row items-center mb-3">
                <Sparkles size={20} color="#4A90E2" />
                <Text className="text-blue-800 font-medium ml-2">Build positive habits & discipline</Text>
              </View>
              <View className="flex-row items-center">
                <Gift size={20} color="#4A90E2" />
                <Text className="text-blue-800 font-medium ml-2">Fun achievements & badges</Text>
              </View>
            </View>
          </Animated.View>

          <AppFooter showSocial={false} showLegal />
        </ScrollView>

        {/* Purchase Buttons */}
        {!isLoading && (selectedPackage || selectedFallbackPlan) && (
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
            <SafeAreaView edges={['bottom']}>
              {/* Main Purchase Button */}
              <Pressable
                onPress={handlePurchase}
                disabled={isPurchasing}
                className={`py-4 rounded-2xl items-center ${
                  isPurchasing
                    ? 'bg-blue-400'
                    : isSelectedPlanFree()
                      ? 'bg-green-500 active:bg-green-600'
                      : 'bg-blue-500 active:bg-blue-600'
                }`}
              >
                <Text className="text-white font-bold text-lg">
                  {isPurchasing
                    ? 'Processing...'
                    : isSelectedPlanFree()
                      ? 'Start Free Trial'
                      : `Subscribe - ${getSelectedPlanPrice()}/month`
                  }
                </Text>
              </Pressable>

              {/* Pay with Card Button - shown for paid plans */}
              {!isSelectedPlanFree() && (
                <Pressable
                  onPress={handlePayWithCard}
                  className="flex-row items-center justify-center py-3 mt-2 rounded-xl border-2 border-gray-200 active:bg-gray-50"
                >
                  <CreditCard size={18} color="#4A90E2" />
                  <Text className="text-blue-600 font-semibold ml-2">
                    Pay with Card
                  </Text>
                </Pressable>
              )}

              <Text className="text-gray-400 text-xs text-center mt-2">
                {isSelectedPlanFree()
                  ? 'No credit card required for free trial.'
                  : 'Cancel anytime. Subscription renews monthly.'
                }
              </Text>
            </SafeAreaView>
          </View>
        )}
      </SafeAreaView>

      {/* Card Payment Modal */}
      <CardPaymentModal
        visible={showCardPayment}
        onClose={() => setShowCardPayment(false)}
        onSuccess={handleCardPaymentSuccess}
        selectedPlan={getSelectedPlanId()}
        email={currentUser?.email ?? ''}
      />
    </View>
  );
}
