// Select Plan Screen - Subscription selection with RevenueCat
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator, Platform, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostyMascot } from '@/components/PostyMascot';
import { useAppStore } from '@/lib/store';
import { isEligibleForFreePlan } from '@/lib/types';
import { Check, ChevronRight, Star, Crown, Users, Shield, Square, CheckSquare, Award, ArrowLeft, CreditCard, X } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import {
  getOfferings,
  isRevenueCatEnabled,
} from '@/lib/revenuecatClient';
import {
  isStripeEnabled,
  processPayment,
  STRIPE_PRICES,
  formatPrice,
} from '@/lib/stripeClient';
import type { PurchasesPackage } from 'react-native-purchases';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanDetails {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  popular?: boolean;
  isFree?: boolean;
  features: PlanFeature[];
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
      { text: '1 month free trial', included: true },
      { text: 'Certificate of achievement', included: true },
      { text: 'Posty Magic sticker pack', included: true },
      { text: 'Basic task tracking', included: true },
      { text: 'Mail rewards', included: false },
      { text: 'Multiple children', included: false },
    ],
  },
  '$rc_custom_basic': {
    id: 'basic',
    name: 'Basic',
    description: '1 Child Profile',
    color: '#4A90E2',
    icon: <Star size={24} color="#4A90E2" />,
    features: [
      { text: '1 child profile', included: true },
      { text: 'Daily task assignments', included: true },
      { text: 'Real mail rewards', included: true },
      { text: 'Badges & achievements', included: true },
      { text: 'Custom tasks', included: false },
      { text: 'AI task verification', included: false },
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
      { text: 'Up to 3 child profiles', included: true },
      { text: 'Daily task assignments', included: true },
      { text: 'Real mail rewards', included: true },
      { text: 'All badges & achievements', included: true },
      { text: 'Custom tasks', included: true },
      { text: 'AI task verification', included: true },
    ],
  },
  '$rc_custom_premium': {
    id: 'premium',
    name: 'Premium',
    description: 'Unlimited Children',
    color: '#A78BFA',
    icon: <Crown size={24} color="#A78BFA" />,
    features: [
      { text: 'Unlimited child profiles', included: true },
      { text: 'Daily task assignments', included: true },
      { text: 'Real mail rewards', included: true },
      { text: 'All badges & achievements', included: true },
      { text: 'Custom tasks', included: true },
      { text: 'Gift card rewards', included: true },
    ],
  },
};

// Web Payment Screen Component for when RevenueCat is not available
interface WebPaymentScreenProps {
  onFreeTrial: () => void;
  onSubscribe: (planId: string) => void;
}

function WebPaymentScreen({ onFreeTrial, onSubscribe }: WebPaymentScreenProps) {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [email, setEmail] = useState(currentUser?.email ?? '');

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ').substring(0, 19) : '';
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const handleSelectPlan = (planId: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setSelectedPlan(planId);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    // Validate inputs
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      Alert.alert('Invalid Card', 'Please enter a valid card number');
      return;
    }
    if (!expiry || expiry.length < 5) {
      Alert.alert('Invalid Expiry', 'Please enter expiry as MM/YY');
      return;
    }
    if (!cvc || cvc.length < 3) {
      Alert.alert('Invalid CVC', 'Please enter your card CVC');
      return;
    }
    if (!cardholderName.trim()) {
      Alert.alert('Name Required', 'Please enter the cardholder name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Email Required', 'Please enter a valid email');
      return;
    }

    setIsProcessing(true);
    impactAsync(ImpactFeedbackStyle.Medium);

    try {
      const result = await processPayment(
        selectedPlan,
        cardNumber.replace(/\s/g, ''),
        expiry,
        cvc,
        email,
        cardholderName
      );

      if (result.ok) {
        notificationAsync(NotificationFeedbackType.Success);
        setShowPaymentModal(false);
        Alert.alert(
          'Payment Successful!',
          'Welcome to Posty Magic Mail Club! Your subscription is now active.',
          [{ text: 'Continue', onPress: () => onSubscribe(selectedPlan) }]
        );
      } else {
        notificationAsync(NotificationFeedbackType.Error);
        Alert.alert('Payment Failed', result.error ?? 'Please try again or use a different card.');
      }
    } catch (error) {
      notificationAsync(NotificationFeedbackType.Error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }

    setIsProcessing(false);
  };

  const plans = [
    { id: 'basic', name: 'Basic', price: '$9.99/mo', description: '1 Child Profile', color: '#4A90E2' },
    { id: 'standard', name: 'Standard', price: '$19.99/mo', description: 'Up to 3 Children', color: '#22C55E', popular: true },
    { id: 'premium', name: 'Premium', price: '$29.99/mo', description: 'Unlimited Children', color: '#A78BFA' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#4A90E2', '#7AB3F0']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 items-center px-6 pt-8">
              <PostyMascot size="large" mood="happy" animate />
              <Text className="text-2xl font-bold text-white mt-6 text-center">
                Start Your Free Trial!
              </Text>
              <Text className="text-white/80 text-center mt-2 mb-6">
                Get 1 month free with a certificate and Posty Magic stickers!
              </Text>

              {/* Free Trial Button */}
              <Pressable
                onPress={onFreeTrial}
                className="bg-green-500 px-8 py-4 rounded-2xl active:bg-green-600 w-full max-w-sm"
              >
                <Text className="text-white font-bold text-lg text-center">Start Free Trial</Text>
              </Pressable>

              {/* Divider */}
              <View className="flex-row items-center my-6 w-full max-w-sm">
                <View className="flex-1 h-px bg-white/30" />
                <Text className="text-white/70 mx-4 text-sm">or subscribe now</Text>
                <View className="flex-1 h-px bg-white/30" />
              </View>

              {/* Subscription Plans */}
              {isStripeEnabled() ? (
                <View className="w-full max-w-sm">
                  {plans.map((plan) => (
                    <Pressable
                      key={plan.id}
                      onPress={() => handleSelectPlan(plan.id)}
                      className="bg-white rounded-2xl p-4 mb-3 active:opacity-90"
                    >
                      {plan.popular && (
                        <View className="absolute -top-2 right-4 bg-amber-400 px-2 py-0.5 rounded-full">
                          <Text className="text-xs font-bold text-gray-900">POPULAR</Text>
                        </View>
                      )}
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <View
                            className="w-10 h-10 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: plan.color + '20' }}
                          >
                            {plan.id === 'basic' && <Star size={20} color={plan.color} />}
                            {plan.id === 'standard' && <Users size={20} color={plan.color} />}
                            {plan.id === 'premium' && <Crown size={20} color={plan.color} />}
                          </View>
                          <View>
                            <Text className="text-gray-900 font-bold">{plan.name}</Text>
                            <Text className="text-gray-500 text-sm">{plan.description}</Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className="text-gray-900 font-bold">{plan.price}</Text>
                          <View className="flex-row items-center">
                            <CreditCard size={12} color="#64748B" />
                            <Text className="text-gray-500 text-xs ml-1">Pay with card</Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View className="bg-white/20 rounded-2xl p-4 w-full max-w-sm">
                  <Text className="text-white text-center">
                    Card payments are being set up. Start with a free trial for now!
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <Animated.View
            entering={ZoomIn.springify()}
            className="bg-white rounded-t-3xl p-6 pb-10"
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Complete Payment
              </Text>
              <Pressable
                onPress={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            {/* Plan Summary */}
            {selectedPlan && (
              <View className="bg-blue-50 rounded-xl p-4 mb-4">
                <Text className="text-blue-800 font-semibold">
                  {STRIPE_PRICES[selectedPlan]?.name ?? 'Plan'} - {formatPrice(STRIPE_PRICES[selectedPlan]?.priceInCents ?? 0)}/month
                </Text>
              </View>
            )}

            {/* Card Form */}
            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-2">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#111827',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-2">Cardholder Name</Text>
              <TextInput
                value={cardholderName}
                onChangeText={setCardholderName}
                placeholder="John Smith"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#111827',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-2">Card Number</Text>
              <TextInput
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                placeholder="4242 4242 4242 4242"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={19}
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#111827',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              />
            </View>

            <View className="flex-row mb-6">
              <View className="flex-1 mr-2">
                <Text className="text-gray-600 text-sm mb-2">Expiry</Text>
                <TextInput
                  value={expiry}
                  onChangeText={(text) => setExpiry(formatExpiry(text))}
                  placeholder="MM/YY"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={5}
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: '#111827',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                />
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-gray-600 text-sm mb-2">CVC</Text>
                <TextInput
                  value={cvc}
                  onChangeText={(text) => setCvc(text.replace(/\D/g, ''))}
                  placeholder="123"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: '#111827',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                />
              </View>
            </View>

            <Pressable
              onPress={handlePayment}
              disabled={isProcessing}
              className={`py-4 rounded-xl ${isProcessing ? 'bg-gray-300' : 'bg-blue-500 active:bg-blue-600'}`}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-center text-lg">
                  Pay {selectedPlan ? formatPrice(STRIPE_PRICES[selectedPlan]?.priceInCents ?? 0) : ''}
                </Text>
              )}
            </Pressable>

            <Text className="text-gray-400 text-xs text-center mt-4">
              Secure payment powered by Stripe
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

export default function SelectPlanScreen() {
  const router = useRouter();
  const setSubscription = useAppStore((s) => s.setSubscription);
  const currentUser = useAppStore((s) => s.currentUser);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showSafetyPromise, setShowSafetyPromise] = useState(false);
  
  // Check if user is eligible for free plan (first-time signup only)
  const canSelectFreePlan = isEligibleForFreePlan(currentUser?.subscription);
  
  // Filter PLAN_DETAILS based on eligibility
  const availablePlanDetails = useMemo(() => {
    if (canSelectFreePlan) return PLAN_DETAILS;
    const filtered: Record<string, PlanDetails> = {};
    Object.entries(PLAN_DETAILS).forEach(([key, value]) => {
      if (key !== '$rc_custom_free') {
        filtered[key] = value;
      }
    });
    return filtered;
  }, [canSelectFreePlan]);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setIsLoading(true);

    if (!isRevenueCatEnabled()) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await getOfferings();
      if (result.ok && result.data.current) {
        let availablePackages = result.data.current.availablePackages;
        
        // Filter out free plan for ineligible users (only first-time signups can get free plan)
        if (!canSelectFreePlan) {
          availablePackages = availablePackages.filter(
            (pkg) => pkg.identifier !== '$rc_custom_free'
          );
        }
        
        // Sort packages: free first, then basic, standard, premium
        const sortedPackages = availablePackages.sort((a, b) => {
          const order = ['$rc_custom_free', '$rc_custom_basic', '$rc_custom_standard', '$rc_custom_premium'];
          return order.indexOf(a.identifier) - order.indexOf(b.identifier);
        });
        setPackages(sortedPackages);
        // Select standard plan by default (most popular)
        const standardPkg = sortedPackages.find(p => p.identifier === '$rc_custom_standard');
        setSelectedPackage(standardPkg ?? sortedPackages[0] ?? null);
      }
    } catch (error) {
      console.log('Error loading offerings:', error);
    }
    setIsLoading(false);
  };

  const handleSelectPackage = (pkg: PurchasesPackage) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setSelectedPackage(pkg);
  };

  const handleFreePlan = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    // Show paywall so users can see all plan options before confirming free trial
    router.replace('/paywall');
  };

  const handleContinue = async () => {
    if (!consentChecked) {
      notificationAsync(NotificationFeedbackType.Warning);
      Alert.alert(
        'Consent Required',
        'Please confirm that you are the parent/guardian and consent to your child using this app.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!selectedPackage) return;

    // For all plans, show the paywall with full subscription details
    impactAsync(ImpactFeedbackStyle.Medium);
    router.replace('/paywall');
  };

  const handleConsentToggle = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    setConsentChecked(!consentChecked);
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

  // Check if user has added at least one child
  const hasChildren = (currentUser?.children?.length ?? 0) > 0;

  // Fallback if RevenueCat not configured (Web version)
  if (!isRevenueCatEnabled()) {
    return (
      <WebPaymentScreen
        onFreeTrial={() => {
          // Check if user has added a child first
          if (!hasChildren) {
            Alert.alert(
              'Add Your Child First',
              'Please add your child\'s information before selecting a plan.',
              [{ text: 'OK', onPress: () => router.replace('/setup/add-child?returnPlan=free') }]
            );
            return;
          }
          setSubscription('free');
          router.push('/setup/shipping');
        }}
        onSubscribe={(planId: string) => {
          // Check if user has added a child first
          if (!hasChildren) {
            Alert.alert(
              'Add Your Child First',
              'Please add your child\'s information before selecting a plan.',
              [{ text: 'OK', onPress: () => router.replace(`/setup/add-child?returnPlan=${planId}`) }]
            );
            return;
          }
          setSubscription(planId as 'basic' | 'standard' | 'premium');
          router.push('/setup/shipping');
        }}
      />
    );
  }

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
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              className="items-center mb-4"
            >
              <PostyMascot
                size="medium"
                mood="happy"
                showSpeechBubble
                speechText="Pick your adventure!"
              />
            </Animated.View>

            {/* Progress */}
            <View className="px-6 mb-4">
              <View className="flex-row items-center justify-center">
                <View className="w-8 h-8 rounded-full bg-green-400 items-center justify-center">
                  <Check size={18} color="white" />
                </View>
                <View className="w-12 h-1 bg-amber-400" />
                <View className="w-8 h-8 rounded-full bg-amber-400 items-center justify-center">
                  <Text className="text-gray-900 font-bold">2</Text>
                </View>
                <View className="w-12 h-1 bg-white/30" />
                <View className="w-8 h-8 rounded-full bg-white/30 items-center justify-center">
                  <Text className="text-white/60 font-bold">3</Text>
                </View>
              </View>
              <Text className="text-white/80 text-center mt-2 text-sm">
                Step 2: Choose Your Plan
              </Text>
            </View>

            {/* Loading State */}
            {isLoading && (
              <View className="py-20 items-center">
                <ActivityIndicator size="large" color="white" />
                <Text className="text-white mt-4">Loading plans...</Text>
              </View>
            )}

            {/* Plan Cards from RevenueCat */}
            {!isLoading && packages.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(400).springify()}
                className="mx-4"
              >
                {packages.map((pkg) => {
                  const plan = getPlanDetails(pkg);
                  if (!plan) return null;

                  const isSelected = selectedPackage?.identifier === pkg.identifier;
                  const isFree = plan.isFree;
                  const price = getPackagePrice(pkg);

                  return (
                    <Pressable
                      key={pkg.identifier}
                      onPress={() => handleSelectPackage(pkg)}
                      className={`rounded-2xl p-4 mb-4 border-2 ${
                        isSelected
                          ? isFree
                            ? 'bg-green-50 border-green-400'
                            : 'bg-white border-blue-400'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {plan.popular && (
                        <View className="absolute -top-3 right-4 bg-amber-400 px-3 py-1 rounded-full">
                          <Text className="text-xs font-bold text-gray-900">MOST POPULAR</Text>
                        </View>
                      )}
                      {isFree && (
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
                          <Text className="text-xl font-bold text-gray-900">{plan.name}</Text>
                          <Text className="text-gray-500 text-sm">{plan.description}</Text>
                        </View>
                        <View className="items-end">
                          <Text className={`text-2xl font-extrabold ${isFree ? 'text-green-600' : 'text-gray-900'}`}>
                            {price}
                          </Text>
                          {!isFree && <Text className="text-gray-500 text-xs">/month</Text>}
                        </View>
                      </View>

                      <View
                        className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <Check size={14} color="white" />}
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
                                <Check size={12} color={feature.included ? '#22C55E' : '#9CA3AF'} />
                              </View>
                              <Text
                                className={feature.included ? 'text-gray-700 text-sm' : 'text-gray-400 text-sm'}
                              >
                                {feature.text}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </Animated.View>
            )}

            {/* Parent Safety Promise */}
            <Animated.View
              entering={FadeInDown.delay(500).springify()}
              className="mx-4 mb-4"
            >
              <Pressable
                onPress={() => setShowSafetyPromise(!showSafetyPromise)}
                className="bg-white/20 rounded-2xl p-4 border border-white/30"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-green-400 items-center justify-center mr-3">
                    <Shield size={20} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-base">Parent Safety Promise</Text>
                    <Text className="text-white/70 text-sm">
                      {showSafetyPromise ? 'Tap to collapse' : 'Tap to learn more'}
                    </Text>
                  </View>
                </View>

                {showSafetyPromise && (
                  <View className="mt-4 pt-4 border-t border-white/20">
                    <Text className="text-white/90 text-sm leading-5 mb-3">
                      At Posty Magic Mail Club, we take your child's safety seriously:
                    </Text>
                    <View className="space-y-2">
                      <View className="flex-row items-start mb-2">
                        <Check size={16} color="#22C55E" />
                        <Text className="text-white/80 text-sm ml-2 flex-1">
                          COPPA Compliant - Minimal data collection, no sharing
                        </Text>
                      </View>
                      <View className="flex-row items-start mb-2">
                        <Check size={16} color="#22C55E" />
                        <Text className="text-white/80 text-sm ml-2 flex-1">
                          Parent-Controlled - All approvals require PIN verification
                        </Text>
                      </View>
                      <View className="flex-row items-start mb-2">
                        <Check size={16} color="#22C55E" />
                        <Text className="text-white/80 text-sm ml-2 flex-1">
                          No Social Features - Children cannot communicate with others
                        </Text>
                      </View>
                      <View className="flex-row items-start">
                        <Check size={16} color="#22C55E" />
                        <Text className="text-white/80 text-sm ml-2 flex-1">
                          Real Physical Mail - Rewards delivered to your home
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </Pressable>
            </Animated.View>

            {/* Parent Consent Checkbox */}
            <Animated.View
              entering={FadeInDown.delay(550).springify()}
              className="mx-4 mb-4"
            >
              <Pressable
                onPress={handleConsentToggle}
                className="flex-row items-start bg-white/10 rounded-xl p-4"
              >
                <View className="mt-0.5">
                  {consentChecked ? (
                    <CheckSquare size={24} color="#22C55E" />
                  ) : (
                    <Square size={24} color="white" />
                  )}
                </View>
                <Text className="text-white text-sm ml-3 flex-1 leading-5">
                  I am the parent or legal guardian of the child(ren) using this app. I consent to my child's use of Posty Magic Mail Club and have read and agree to the{' '}
                  <Text
                    className="underline"
                    onPress={() => router.push('/terms')}
                  >
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text
                    className="underline"
                    onPress={() => router.push('/privacy')}
                  >
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </Pressable>
            </Animated.View>

            {/* Continue Button */}
            <Animated.View
              entering={FadeInUp.delay(600).springify()}
              className="mx-4 mt-2"
            >
              <Pressable
                onPress={handleContinue}
                disabled={!selectedPackage}
                className={`py-4 rounded-2xl flex-row items-center justify-center ${
                  selectedPackage?.identifier === '$rc_custom_free'
                    ? 'bg-green-500 active:bg-green-600'
                    : 'bg-amber-400 active:bg-amber-500'
                }`}
              >
                <Text className="text-lg font-bold text-gray-900 mr-2">
                  Continue to Subscribe
                </Text>
                <ChevronRight size={24} color="#1F2937" />
              </Pressable>

              <Text className="text-white/70 text-center mt-3 text-sm">
                View all plans and pricing on next screen
              </Text>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
