// Change Plan Screen - Manage subscription with RevenueCat
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '@/lib/store';
import { PostyMascot } from '@/components/PostyMascot';
import { supabaseService } from '@/lib/supabase-service';
import {
  ArrowLeft,
  Check,
  Star,
  Crown,
  Users,
  Award,
  Pause,
  Play,
  XCircle,
  X,
  CreditCard,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SUBSCRIPTION_PLANS } from '@/lib/types';
import {
  getOfferings,
  purchasePackage,
  isRevenueCatEnabled,
} from '@/lib/revenuecatClient';
import { CardPaymentModal } from '@/components/CardPaymentModal';
import { STRIPE_PRICES, formatPrice } from '@/lib/stripeClient';
import type { PurchasesPackage } from 'react-native-purchases';

interface PlanDetails {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  popular?: boolean;
  isFree?: boolean;
  features: string[];
}

const PLAN_DETAILS: Record<string, PlanDetails> = {
  '$rc_custom_free': {
    id: 'free',
    name: 'Free Trial',
    description: 'Certificate & Stickers',
    color: '#10B981',
    isFree: true,
    icon: <Award size={24} color="#10B981" />,
    features: [
      '1 month free trial',
      'Certificate of achievement',
      'Posty Magic sticker pack',
      'Basic task tracking',
    ],
  },
  '$rc_custom_basic': {
    id: 'basic',
    name: 'Basic',
    description: '1 Child Profile',
    color: '#4A90E2',
    icon: <Star size={24} color="#4A90E2" />,
    features: [
      '1 child profile',
      'Daily task assignments',
      'Real mail rewards',
      'Badges & achievements',
    ],
  },
  '$rc_custom_standard': {
    id: 'standard',
    name: 'Standard',
    description: 'Up to 3 Children',
    color: '#22C55E',
    icon: <Users size={24} color="#22C55E" />,
    popular: true,
    features: [
      'Up to 3 child profiles',
      'Custom tasks',
      'AI task verification',
      'All badges & achievements',
    ],
  },
  '$rc_custom_premium': {
    id: 'premium',
    name: 'Premium',
    description: 'Unlimited Children',
    color: '#A78BFA',
    icon: <Crown size={24} color="#A78BFA" />,
    features: [
      'Unlimited children',
      'Gift card rewards',
      'Priority support',
      'All premium features',
    ],
  },
};

export default function ChangePlanScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const setSubscription = useAppStore((s) => s.setSubscription);
  const pauseSubscription = useAppStore((s) => s.pauseSubscription);
  const resumeSubscription = useAppStore((s) => s.resumeSubscription);
  const cancelSubscription = useAppStore((s) => s.cancelSubscription);

  const subscription = currentUser?.subscription;
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [selectedFallbackPlan, setSelectedFallbackPlan] = useState<'free' | 'basic' | 'standard' | 'premium'>('standard');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setIsLoading(true);

    if (!isRevenueCatEnabled()) {
      setUseFallback(true);
      setIsLoading(false);
      return;
    }

    try {
      const result = await getOfferings();
      if (result.ok && result.data.current) {
        let availablePackages = result.data.current.availablePackages;
        if (availablePackages.length === 0) {
          setUseFallback(true);
        } else {
          // Keep all packages - free plan will be shown as disabled for paid users
          const sortedPackages = availablePackages.sort((a, b) => {
            const order = ['$rc_custom_free', '$rc_custom_basic', '$rc_custom_standard', '$rc_custom_premium'];
            return order.indexOf(a.identifier) - order.indexOf(b.identifier);
          });
          setPackages(sortedPackages);

          // Pre-select current plan (but not free plan for paid users)
          const currentPlanId = subscription?.plan === 'basic'
            ? '$rc_custom_basic'
            : subscription?.plan === 'standard'
              ? '$rc_custom_standard'
              : subscription?.plan === 'premium'
                ? '$rc_custom_premium'
                : '$rc_custom_free';
          const currentPkg = sortedPackages.find(p => p.identifier === currentPlanId);
          // For paid users, default to a valid paid plan, not free
          const defaultPkg = subscription?.plan && subscription.plan !== 'free'
            ? sortedPackages.find(p => p.identifier !== '$rc_custom_free') ?? sortedPackages[0]
            : sortedPackages[0];
          setSelectedPackage(currentPkg ?? defaultPkg ?? null);
        }
      } else {
        setUseFallback(true);
      }
    } catch (error) {
      console.log('Error loading offerings:', error);
      setUseFallback(true);
    }
    setIsLoading(false);
  };

  const handleSelectPackage = (pkg: PurchasesPackage) => {
    // Block selecting free plan for users on paid plans
    if (pkg.identifier === '$rc_custom_free' && subscription?.plan && subscription.plan !== 'free') {
      Alert.alert(
        'Free Plan Not Available',
        'You cannot switch from a paid plan to the free trial. You can upgrade to a different paid plan instead.'
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPackage(pkg);
  };

  const getPackagePrice = (pkg: PurchasesPackage): string => {
    if (pkg.identifier === '$rc_custom_free') {
      return 'FREE';
    }
    return pkg.product.priceString ?? `$${pkg.product.price}`;
  };

  const getPlanDetails = (pkg: PurchasesPackage): PlanDetails | null => {
    return PLAN_DETAILS[pkg.identifier] ?? null;
  };

  const isCurrentPlan = (pkg: PurchasesPackage): boolean => {
    const planMap: Record<string, string> = {
      'basic': '$rc_custom_basic',
      'standard': '$rc_custom_standard',
      'premium': '$rc_custom_premium',
    };
    return planMap[subscription?.plan ?? ''] === pkg.identifier;
  };

  const handleUpdatePlan = async () => {
    if (!selectedPackage) return;

    if (isCurrentPlan(selectedPackage)) {
      Alert.alert('Same Plan', 'You are already on this plan.');
      return;
    }

    // Handle free plan locally - but prevent switching from paid to free
    if (selectedPackage.identifier === '$rc_custom_free') {
      // Users on paid plans cannot switch back to free
      if (subscription?.plan && subscription.plan !== 'free') {
        Alert.alert(
          'Cannot Switch to Free',
          'You cannot switch from a paid plan to the free plan. You can upgrade to a different paid plan instead.'
        );
        return;
      }
      
      setSubscription('free');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Switched to Free Trial',
        'You\'ll receive a certificate and Posty Magic stickers!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await purchasePackage(selectedPackage);

      if (result.ok) {
        const planMap: Record<string, 'basic' | 'standard' | 'premium'> = {
          '$rc_custom_basic': 'basic',
          '$rc_custom_standard': 'standard',
          '$rc_custom_premium': 'premium',
        };
        const plan = planMap[selectedPackage.identifier];
        if (plan) {
          setSubscription(plan);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const details = getPlanDetails(selectedPackage);
        Alert.alert(
          'Plan Updated',
          `Your subscription has been changed to ${details?.name ?? 'new plan'}.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (result.reason === 'web_not_supported') {
        Alert.alert(
          'Mobile App Required',
          'Subscriptions can only be changed in the mobile app.'
        );
      } else {
        console.log('Update not completed:', result.reason);
      }
    } catch (error) {
      console.log('Update error:', error);
      Alert.alert('Update Failed', 'Something went wrong. Please try again.');
    }

    setIsPurchasing(false);
  };

  const handlePauseResume = () => {
    if (subscription?.status === 'paused') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resumeSubscription();
      Alert.alert('Subscription Resumed', 'Your subscription is now active again.');
    } else {
      Alert.alert(
        'Pause Subscription',
        'Your subscription will be paused. You can resume anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pause',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              pauseSubscription();
            },
          },
        ]
      );
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure? You will lose access to mail rewards at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            cancelSubscription();
            Alert.alert('Subscription Cancelled', 'We\'re sad to see you go. You can resubscribe anytime.');
          },
        },
      ]
    );
  };

  const handlePayWithCard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCardPayment(true);
  };

  const handleCardPaymentSuccess = (planId: string) => {
    setShowCardPayment(false);
    const plan = planId as 'basic' | 'standard' | 'premium';
    setSubscription(plan);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Payment Successful!',
      'Your subscription is now active. Enjoy all the features!',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  // Check if user is on a paid plan (can't switch back to free)
  const isOnPaidPlan = subscription?.plan && subscription.plan !== 'free';

  // Fallback plans (no RevenueCat)
  // Show all plans, but free plan is disabled for users on paid plans
  const FALLBACK_PLANS = [
    { id: 'free', name: 'Free Trial', price: 'Free', description: 'Certificate & Stickers', isFree: true, disabled: isOnPaidPlan },
    { id: 'basic', name: 'Basic', price: '$9.99', description: '1 Child Profile' },
    { id: 'standard', name: 'Standard', price: '$19.99', description: 'Up to 3 Children', popular: true },
    { id: 'premium', name: 'Premium', price: '$29.99', description: 'Unlimited Children' },
  ];

  // Handle card payment with database record
  const handlePlanCardPayment = async (planId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFallbackPlan(planId as 'free' | 'basic' | 'standard' | 'premium');
    setShowCardPayment(true);
  };

  // Fallback for non-RevenueCat - show card payment options with blue theme
  if (useFallback) {
    const showFreeTrial = !isOnPaidPlan;

    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={['#4A90E2', '#7AB3F0']}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            {/* Back Button */}
            <View className="px-4 py-2">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              >
                <ArrowLeft size={24} color="white" />
              </Pressable>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Posty Mascot */}
              <View className="items-center mb-4">
                <PostyMascot size="large" mood="happy" />
              </View>

              {/* Header Text */}
              <Animated.View entering={FadeInDown.springify()} className="items-center mb-6">
                <Text className="text-3xl font-bold text-white text-center mb-2">
                  {showFreeTrial ? 'Start Your Free Trial!' : 'Manage Your Plan'}
                </Text>
                <Text className="text-white/80 text-center text-base">
                  {showFreeTrial 
                    ? 'Get 1 month free with a certificate and Posty Magic stickers!'
                    : `Current plan: ${SUBSCRIPTION_PLANS[subscription?.plan ?? 'free']?.name ?? 'Free'}`}
                </Text>
              </Animated.View>

              {/* Free Trial Button - Only show if eligible */}
              {showFreeTrial && (
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                  <Pressable
                    onPress={() => {
                      setSubscription('free');
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert(
                        'Free Trial Started!',
                        'You now have access to your free trial. Complete tasks to earn your certificate and stickers!',
                        [{ text: 'OK', onPress: () => router.back() }]
                      );
                    }}
                    className="bg-emerald-500 py-4 rounded-full mb-6 active:bg-emerald-600"
                  >
                    <Text className="text-white font-bold text-lg text-center">
                      Start Free Trial
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* Divider */}
              <Animated.View entering={FadeInDown.delay(150).springify()} className="flex-row items-center mb-6">
                <View className="flex-1 h-px bg-white/30" />
                <Text className="text-white/70 mx-4 text-sm">or subscribe now</Text>
                <View className="flex-1 h-px bg-white/30" />
              </Animated.View>

              {/* Plan Cards */}
              {/* Basic Plan */}
              <Animated.View entering={FadeInDown.delay(200).springify()}>
                <Pressable
                  onPress={() => handlePlanCardPayment('basic')}
                  className={`bg-white rounded-2xl p-4 mb-3 flex-row items-center ${
                    subscription?.plan === 'basic' ? 'border-2 border-blue-500' : ''
                  }`}
                >
                  <View className="w-12 h-12 rounded-full bg-amber-100 items-center justify-center mr-3">
                    <Star size={24} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">Basic</Text>
                    <Text className="text-gray-500 text-sm">1 Child Profile</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xl font-bold text-gray-900">$9.99<Text className="text-sm font-normal text-gray-500">/mo</Text></Text>
                    <View className="flex-row items-center mt-1">
                      <CreditCard size={12} color="#6B7280" />
                      <Text className="text-gray-500 text-xs ml-1">Pay with card</Text>
                    </View>
                  </View>
                  {subscription?.plan === 'basic' && (
                    <View className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                      <Check size={14} color="white" />
                    </View>
                  )}
                </Pressable>
              </Animated.View>

              {/* Standard Plan */}
              <Animated.View entering={FadeInDown.delay(250).springify()}>
                <Pressable
                  onPress={() => handlePlanCardPayment('standard')}
                  className={`bg-white rounded-2xl p-4 mb-3 flex-row items-center ${
                    subscription?.plan === 'standard' ? 'border-2 border-blue-500' : ''
                  }`}
                >
                  {/* Popular Badge */}
                  <View className="absolute -top-2 right-4 bg-red-500 px-2 py-0.5 rounded">
                    <Text className="text-white text-xs font-bold">POPULAR</Text>
                  </View>
                  
                  <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center mr-3">
                    <Users size={24} color="#22C55E" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">Standard</Text>
                    <Text className="text-gray-500 text-sm">Up to 3 Children</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xl font-bold text-gray-900">$19.99<Text className="text-sm font-normal text-gray-500">/mo</Text></Text>
                    <View className="flex-row items-center mt-1">
                      <CreditCard size={12} color="#6B7280" />
                      <Text className="text-gray-500 text-xs ml-1">Pay with card</Text>
                    </View>
                  </View>
                  {subscription?.plan === 'standard' && (
                    <View className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                      <Check size={14} color="white" />
                    </View>
                  )}
                </Pressable>
              </Animated.View>

              {/* Premium Plan */}
              <Animated.View entering={FadeInDown.delay(300).springify()}>
                <Pressable
                  onPress={() => handlePlanCardPayment('premium')}
                  className={`bg-white rounded-2xl p-4 mb-3 flex-row items-center ${
                    subscription?.plan === 'premium' ? 'border-2 border-blue-500' : ''
                  }`}
                >
                  <View className="w-12 h-12 rounded-full bg-purple-100 items-center justify-center mr-3">
                    <Crown size={24} color="#A78BFA" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">Premium</Text>
                    <Text className="text-gray-500 text-sm">Unlimited Children</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xl font-bold text-gray-900">$29.99<Text className="text-sm font-normal text-gray-500">/mo</Text></Text>
                    <View className="flex-row items-center mt-1">
                      <CreditCard size={12} color="#6B7280" />
                      <Text className="text-gray-500 text-xs ml-1">Pay with card</Text>
                    </View>
                  </View>
                  {subscription?.plan === 'premium' && (
                    <View className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                      <Check size={14} color="white" />
                    </View>
                  )}
                </Pressable>
              </Animated.View>

              {/* Manage Subscription Options for existing subscribers */}
              {subscription && subscription.status !== 'cancelled' && (
                <Animated.View entering={FadeInDown.delay(350).springify()} className="mt-4">
                  <View className="flex-row">
                    <Pressable
                      onPress={handlePauseResume}
                      className="flex-1 flex-row items-center justify-center bg-white/20 py-3 rounded-xl mr-2 active:bg-white/30"
                    >
                      {subscription.status === 'paused' ? (
                        <>
                          <Play size={18} color="white" />
                          <Text className="text-white font-semibold ml-2">Resume</Text>
                        </>
                      ) : (
                        <>
                          <Pause size={18} color="white" />
                          <Text className="text-white font-semibold ml-2">Pause</Text>
                        </>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={handleCancel}
                      className="flex-1 flex-row items-center justify-center bg-white/20 py-3 rounded-xl ml-2 active:bg-red-400/50"
                    >
                      <XCircle size={18} color="white" />
                      <Text className="text-white font-semibold ml-2">Cancel</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              )}
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>

        {/* Card Payment Modal */}
        <CardPaymentModal
          visible={showCardPayment}
          onClose={() => setShowCardPayment(false)}
          onSuccess={handleCardPaymentSuccess}
          selectedPlan={selectedFallbackPlan}
          email={currentUser?.email ?? ''}
        />
      </View>
    );
  }

  if (!isRevenueCatEnabled()) {
    return (
      <View className="flex-1 bg-gray-50">
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
            >
              <ArrowLeft size={24} color="#1F2937" />
            </Pressable>
            <Text className="text-xl font-bold text-gray-900">Manage Subscription</Text>
          </View>
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-gray-500 text-center">
              Subscription management is being set up. Please check back later.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
          >
            <ArrowLeft size={24} color="#1F2937" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">Manage Subscription</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Plan Status */}
          {subscription && (
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              className="bg-white rounded-2xl p-4 mb-6 shadow-sm"
            >
              <Text className="text-gray-500 text-sm mb-2">Current Plan</Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  {subscription.plan === 'basic' && <Star size={24} color="#4A90E2" />}
                  {subscription.plan === 'standard' && <Users size={24} color="#22C55E" />}
                  {subscription.plan === 'premium' && <Crown size={24} color="#A78BFA" />}
                  <Text className="text-xl font-bold text-gray-900 ml-2">
                    {SUBSCRIPTION_PLANS[subscription.plan]?.name ?? subscription.plan}
                  </Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full ${
                    subscription.status === 'active'
                      ? 'bg-green-100'
                      : subscription.status === 'paused'
                      ? 'bg-amber-100'
                      : 'bg-red-100'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      subscription.status === 'active'
                        ? 'text-green-700'
                        : subscription.status === 'paused'
                        ? 'text-amber-700'
                        : 'text-red-700'
                    }`}
                  >
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-500 text-sm mt-2">
                Next billing: {new Date(subscription.nextBillingDate).toLocaleDateString()}
              </Text>
            </Animated.View>
          )}

          {/* Loading State */}
          {isLoading && (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text className="text-gray-500 mt-4">Loading plans...</Text>
            </View>
          )}

          {/* Plan Options from RevenueCat */}
          {!isLoading && packages.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Text className="text-lg font-bold text-gray-900 mb-3">Choose a Plan</Text>

              {packages.map((pkg) => {
                const plan = getPlanDetails(pkg);
                if (!plan) return null;

                const isSelected = selectedPackage?.identifier === pkg.identifier;
                const isCurrent = isCurrentPlan(pkg);
                const isFree = plan.isFree;
                const price = getPackagePrice(pkg);
                // Free plan is disabled for users on paid plans
                const isDisabled = isFree && subscription?.plan && subscription.plan !== 'free';

                return (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => handleSelectPackage(pkg)}
                    className={`rounded-2xl p-4 mb-3 border-2 ${
                      isDisabled
                        ? 'bg-gray-100 border-gray-200 opacity-60'
                        : isSelected
                          ? isFree
                            ? 'bg-green-50 border-green-400'
                            : 'bg-blue-50 border-blue-400'
                          : 'bg-white border-gray-200'
                    }`}
                  >
                    {plan.popular && (
                      <View className="absolute -top-3 right-4 bg-amber-400 px-3 py-1 rounded-full">
                        <Text className="text-xs font-bold text-gray-900">MOST POPULAR</Text>
                      </View>
                    )}
                    {isDisabled && (
                      <View className="absolute -top-3 left-4 bg-gray-400 px-3 py-1 rounded-full">
                        <Text className="text-xs font-bold text-white">NOT AVAILABLE</Text>
                      </View>
                    )}
                    {isFree && !isDisabled && (
                      <View className="absolute -top-3 left-4 bg-green-500 px-3 py-1 rounded-full">
                        <Text className="text-xs font-bold text-white">FREE TRIAL</Text>
                      </View>
                    )}

                    <View className="flex-row items-start">
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center shadow-sm mr-3"
                        style={{ backgroundColor: plan.color + '20' }}
                      >
                        {plan.icon}
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className={`text-xl font-bold ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>{plan.name}</Text>
                          {isCurrent && (
                            <View className="bg-blue-100 px-2 py-0.5 rounded-full ml-2">
                              <Text className="text-blue-700 text-xs font-medium">Current</Text>
                            </View>
                          )}
                        </View>
                        <Text className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>{plan.description}</Text>
                      </View>
                      <View className="items-end">
                        <Text className={`text-2xl font-extrabold ${isDisabled ? 'text-gray-400' : isFree ? 'text-green-600' : 'text-gray-900'}`}>
                          {price}
                        </Text>
                        {!isFree && <Text className="text-gray-500 text-xs">/month</Text>}
                      </View>
                    </View>

                    <View
                      className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 items-center justify-center ${
                        isDisabled 
                          ? 'border-gray-300 bg-gray-200'
                          : isSelected 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-300'
                      }`}
                    >
                      {isSelected && !isDisabled && <Check size={14} color="white" />}
                    </View>

                    {isSelected && !isDisabled && (
                      <View className="mt-3 pt-3 border-t border-gray-100">
                        {plan.features.map((feature, idx) => (
                          <View key={idx} className="flex-row items-center mb-1">
                            <Check size={14} color="#22C55E" />
                            <Text className="text-gray-600 ml-2 text-sm">{feature}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </Animated.View>
          )}

          {/* Update Button */}
          {selectedPackage && !isCurrentPlan(selectedPackage) && (
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <Pressable
                onPress={handleUpdatePlan}
                disabled={isPurchasing}
                className={`py-4 rounded-2xl mb-2 ${
                  isPurchasing
                    ? 'bg-gray-400'
                    : selectedPackage.identifier === '$rc_custom_free'
                      ? 'bg-green-500 active:bg-green-600'
                      : 'bg-blue-500 active:bg-blue-600'
                }`}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center text-lg font-bold text-white">
                    {selectedPackage.identifier === '$rc_custom_free'
                      ? 'Start Free Trial'
                      : `Switch to ${getPlanDetails(selectedPackage)?.name} - ${getPackagePrice(selectedPackage)}/month`
                    }
                  </Text>
                )}
              </Pressable>

              {/* Pay with Card Button - for non-free plans */}
              {selectedPackage.identifier !== '$rc_custom_free' && (
                <Pressable
                  onPress={() => {
                    const planMap: Record<string, 'basic' | 'standard' | 'premium'> = {
                      '$rc_custom_basic': 'basic',
                      '$rc_custom_standard': 'standard',
                      '$rc_custom_premium': 'premium',
                    };
                    setSelectedFallbackPlan(planMap[selectedPackage.identifier] ?? 'standard');
                    handlePayWithCard();
                  }}
                  className="flex-row items-center justify-center py-3 rounded-xl border-2 border-gray-200 active:bg-gray-50 mb-4"
                >
                  <CreditCard size={18} color="#4A90E2" />
                  <Text className="text-blue-600 font-semibold ml-2">Pay with Card</Text>
                </Pressable>
              )}
            </Animated.View>
          )}

          {/* Pause/Resume and Cancel */}
          {subscription && subscription.status !== 'cancelled' && (
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <View className="flex-row mt-4">
                <Pressable
                  onPress={handlePauseResume}
                  className="flex-1 flex-row items-center justify-center bg-white py-3 rounded-xl mr-2 border border-gray-200 active:bg-gray-50"
                >
                  {subscription.status === 'paused' ? (
                    <>
                      <Play size={18} color="#22C55E" />
                      <Text className="text-green-600 font-semibold ml-2">Resume</Text>
                    </>
                  ) : (
                    <>
                      <Pause size={18} color="#F59E0B" />
                      <Text className="text-amber-600 font-semibold ml-2">Pause</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleCancel}
                  className="flex-1 flex-row items-center justify-center bg-white py-3 rounded-xl ml-2 border border-gray-200 active:bg-red-50"
                >
                  <XCircle size={18} color="#EF4444" />
                  <Text className="text-red-500 font-semibold ml-2">Cancel</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Card Payment Modal */}
      <CardPaymentModal
        visible={showCardPayment}
        onClose={() => setShowCardPayment(false)}
        onSuccess={handleCardPaymentSuccess}
        selectedPlan={selectedFallbackPlan}
        email={currentUser?.email ?? ''}
      />
    </View>
  );
}
