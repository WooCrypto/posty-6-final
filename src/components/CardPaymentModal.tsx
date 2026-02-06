// Card Payment Modal - Using Stripe Elements for PCI-compliant payment
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CreditCard, Lock, Check, AlertCircle } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import {
  STRIPE_PRICES,
  formatPrice,
  STRIPE_PRODUCT_IDS,
  createPaymentIntent,
  isStripeEnabled,
  hasStripeSecretKey,
  getStripe
} from '@/lib/stripeClient';
import { supabaseService } from '@/lib/supabase-service';
import { useAppStore } from '@/lib/store';

// Stripe Elements imports for web
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { StripeCardElementOptions } from '@stripe/stripe-js';

interface CardPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (planId: string) => void;
  selectedPlan: 'free' | 'basic' | 'standard' | 'premium';
  email: string;
}

// Card Element styling
const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1F2937',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      '::placeholder': {
        color: '#9CA3AF',
      },
      backgroundColor: '#F9FAFB',
    },
    invalid: {
      color: '#EF4444',
      iconColor: '#EF4444',
    },
  },
  hidePostalCode: true,
};

// Inner payment form component that uses Stripe hooks
function PaymentForm({
  selectedPlan,
  email,
  onSuccess,
  onClose,
}: {
  selectedPlan: 'free' | 'basic' | 'standard' | 'premium';
  email: string;
  onSuccess: (planId: string) => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const plan = STRIPE_PRICES[selectedPlan];
  const stripeConfigured = isStripeEnabled() && hasStripeSecretKey();

  const handlePayment = async () => {
    setError(null);

    if (!stripe || !elements) {
      setError('Payment system is loading. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card input not found. Please refresh and try again.');
      return;
    }

    if (!cardComplete) {
      setError('Please complete the card details.');
      notificationAsync(NotificationFeedbackType.Error);
      return;
    }

    if (cardholderName.trim().length < 2) {
      setError('Please enter the cardholder name.');
      notificationAsync(NotificationFeedbackType.Error);
      return;
    }

    if (!stripeConfigured) {
      setError('Stripe is not configured. Please add your Stripe keys.');
      notificationAsync(NotificationFeedbackType.Error);
      return;
    }

    setIsProcessing(true);
    impactAsync(ImpactFeedbackStyle.Medium);

    try {
      console.log(`[Stripe] Processing payment for ${selectedPlan}`);
      console.log(`[Stripe] Product ID: ${STRIPE_PRODUCT_IDS[selectedPlan]}`);
      console.log(`[Stripe] Amount: ${formatPrice(plan.priceInCents)}`);

      // Step 1: Create PaymentIntent on server
      const intentResult = await createPaymentIntent(
        plan.priceInCents,
        'usd',
        email,
        `${plan.name} subscription for ${cardholderName}`
      );

      if (!intentResult.ok || !intentResult.clientSecret) {
        setError(intentResult.error ?? 'Failed to create payment. Please try again.');
        notificationAsync(NotificationFeedbackType.Error);
        setIsProcessing(false);
        return;
      }

      // Step 2: Confirm payment with Stripe Elements (PCI compliant)
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        intentResult.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardholderName,
              email: email,
            },
          },
        }
      );

      if (stripeError) {
        console.error('[Stripe] Payment error:', stripeError);
        setError(stripeError.message ?? 'Payment failed. Please try again.');
        notificationAsync(NotificationFeedbackType.Error);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        console.log(`[Stripe] Payment successful! ID: ${paymentIntent.id}`);
        setPaymentSuccess(true);
        notificationAsync(NotificationFeedbackType.Success);

        // Record payment in database for audit trail and security
        const userId = useAppStore.getState().currentUser?.id;
        if (userId) {
          await supabaseService.recordPayment(
            userId,
            selectedPlan,
            plan.priceInCents,
            paymentIntent.id,
            undefined,
            { email, cardholderName, planName: plan.name }
          );
          
          // Update subscription in database
          await supabaseService.updateUserSubscription(
            userId,
            selectedPlan as 'basic' | 'standard' | 'premium',
            paymentIntent.id
          );
        }

        // Wait a moment to show success state
        await new Promise((resolve) => setTimeout(resolve, 1500));
        onSuccess(selectedPlan);
      } else {
        setError(`Payment status: ${paymentIntent?.status}. Please try again.`);
        notificationAsync(NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      console.error('[Stripe] Payment error:', err);
      setError(err?.message || 'Payment failed. Please try again.');
      notificationAsync(NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stripe Not Configured Warning */}
        {!stripeConfigured && (
          <Animated.View
            entering={FadeIn}
            className="bg-amber-50 rounded-2xl p-4 mb-4 flex-row items-start"
          >
            <AlertCircle size={20} color="#F59E0B" />
            <View className="flex-1 ml-3">
              <Text className="text-amber-800 font-semibold">Stripe Not Configured</Text>
              <Text className="text-amber-700 text-sm mt-1">
                Please add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY and EXPO_PUBLIC_STRIPE_SECRET_KEY to enable payments.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Plan Summary */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
        >
          <Text className="text-gray-500 text-sm mb-1">You're subscribing to</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">{plan.name}</Text>
            <Text className="text-2xl font-bold text-blue-600">
              {formatPrice(plan.priceInCents)}/mo
            </Text>
          </View>
          <Text className="text-gray-500 text-sm mt-1">
            Billed monthly - Cancel anytime
          </Text>
        </Animated.View>

        {/* Payment Success State */}
        {paymentSuccess && (
          <Animated.View
            entering={FadeIn}
            className="bg-green-50 rounded-2xl p-6 mb-4 items-center"
          >
            <View className="w-16 h-16 rounded-full bg-green-500 items-center justify-center mb-3">
              <Check size={32} color="white" />
            </View>
            <Text className="text-green-800 font-bold text-lg">Payment Successful!</Text>
            <Text className="text-green-600 text-sm text-center mt-1">
              Setting up your subscription...
            </Text>
          </Animated.View>
        )}

        {/* Card Form */}
        {!paymentSuccess && (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <View className="flex-row items-center mb-4">
              <CreditCard size={20} color="#4A90E2" />
              <Text className="text-gray-900 font-semibold ml-2">Card Details</Text>
            </View>

            {/* Cardholder Name */}
            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-1">Cardholder Name</Text>
              <TextInput
                value={cardholderName}
                onChangeText={setCardholderName}
                placeholder="John Smith"
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                autoCapitalize="words"
                editable={!isProcessing}
              />
            </View>

            {/* Stripe Card Element - Secure iframe-based card input */}
            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-1">Card Information</Text>
              <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                <CardElement
                  options={CARD_ELEMENT_OPTIONS}
                  onChange={(event) => {
                    setCardComplete(event.complete);
                    if (event.error) {
                      setError(event.error.message);
                    } else {
                      setError(null);
                    }
                  }}
                />
              </View>
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-1">Email for receipt</Text>
              <TextInput
                value={email}
                editable={false}
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-500 border border-gray-200"
              />
            </View>

            {/* Error Message */}
            {error && (
              <Animated.View entering={FadeIn} className="bg-red-50 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </Animated.View>
            )}

            {/* Security Note */}
            <View className="flex-row items-center justify-center bg-gray-50 rounded-xl p-3">
              <Lock size={16} color="#22C55E" />
              <Text className="text-gray-500 text-sm ml-2">
                Secure payment powered by Stripe
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Pay Button */}
      {!paymentSuccess && (
        <View className="px-5 pb-6 pt-2 bg-white border-t border-gray-100">
          <Pressable
            onPress={handlePayment}
            disabled={isProcessing || !stripe}
            className={`py-4 rounded-2xl items-center flex-row justify-center ${
              isProcessing || !stripe ? 'bg-blue-400' : 'bg-blue-500 active:bg-blue-600'
            }`}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white font-bold text-lg ml-2">Processing...</Text>
              </>
            ) : (
              <>
                <CreditCard size={20} color="white" />
                <Text className="text-white font-bold text-lg ml-2">
                  Pay {formatPrice(plan.priceInCents)}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </>
  );
}

export function CardPaymentModal({
  visible,
  onClose,
  onSuccess,
  selectedPlan,
  email,
}: CardPaymentModalProps) {
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    // Load Stripe when modal becomes visible
    if (visible && !stripePromise) {
      getStripe().then(setStripePromise);
    }
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      {...(Platform.OS === 'ios' ? { presentationStyle: 'pageSheet' as const } : {})}
    >
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <Pressable onPress={handleClose} className="p-2">
            <X size={24} color="#6B7280" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Pay with Card</Text>
          <View className="w-10" />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <PaymentForm
                selectedPlan={selectedPlan}
                email={email}
                onSuccess={onSuccess}
                onClose={onClose}
              />
            </Elements>
          ) : (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text className="text-gray-500 mt-4">Loading payment form...</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
