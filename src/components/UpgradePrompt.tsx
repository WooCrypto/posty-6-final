// Upgrade Prompt Modal - Shows when user exceeds plan limits
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Crown, X, Users, Star, CreditCard } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { CardPaymentModal } from './CardPaymentModal';
import { useAppStore } from '@/lib/store';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  reason: 'child_limit' | 'feature_locked';
  currentChildCount?: number;
}

const UPGRADE_CONTENT = {
  child_limit: {
    title: 'Upgrade to Add More Children',
    description: 'Your current plan only allows 1 child profile. Upgrade to add more children and unlock all features!',
    icon: <Users size={48} color="#4A90E2" />,
  },
  feature_locked: {
    title: 'Upgrade to Unlock',
    description: 'This feature is only available on paid plans. Upgrade now to access all the great features!',
    icon: <Crown size={48} color="#A78BFA" />,
  },
};

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$9.99',
    children: '1 child',
    color: '#4A90E2',
    icon: <Star size={20} color="#4A90E2" />,
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$19.99',
    children: 'Up to 3 children',
    color: '#22C55E',
    icon: <Users size={20} color="#22C55E" />,
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$29.99',
    children: 'Unlimited children',
    color: '#A78BFA',
    icon: <Crown size={20} color="#A78BFA" />,
  },
];

export function UpgradePrompt({
  visible,
  onClose,
  reason,
  currentChildCount = 1,
}: UpgradePromptProps) {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const setSubscription = useAppStore((s) => s.setSubscription);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'standard' | 'premium'>('standard');
  const [showCardPayment, setShowCardPayment] = useState(false);

  const content = UPGRADE_CONTENT[reason];

  // Filter plans based on child count
  const availablePlans = PLANS.filter(plan => {
    if (plan.id === 'basic') return currentChildCount <= 1;
    if (plan.id === 'standard') return currentChildCount <= 3;
    return true; // Premium always available
  });

  const handleViewPlans = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push('/paywall');
  };

  const handleQuickUpgrade = (planId: 'basic' | 'standard' | 'premium') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(planId);
    setShowCardPayment(true);
  };

  const handleCardPaymentSuccess = (planId: string) => {
    setShowCardPayment(false);
    const plan = planId as 'basic' | 'standard' | 'premium';
    setSubscription(plan);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent>
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={onClose}
        >
          <Pressable
            className="w-full bg-white rounded-3xl overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="relative pt-8 pb-4 px-6 items-center">
              <Pressable
                onPress={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <X size={18} color="#6B7280" />
              </Pressable>

              <Animated.View entering={FadeIn.delay(100)}>
                <View className="w-20 h-20 rounded-full bg-blue-50 items-center justify-center mb-4">
                  {content.icon}
                </View>
              </Animated.View>

              <Animated.Text
                entering={FadeInDown.delay(200).springify()}
                className="text-xl font-bold text-gray-900 text-center"
              >
                {content.title}
              </Animated.Text>

              <Animated.Text
                entering={FadeInDown.delay(300).springify()}
                className="text-gray-500 text-center mt-2"
              >
                {content.description}
              </Animated.Text>
            </View>

            {/* Quick Plan Selection */}
            <View className="px-6 pb-4">
              <Text className="text-gray-600 font-medium mb-3">Choose a plan:</Text>
              {availablePlans.map((plan, index) => (
                <Animated.View
                  key={plan.id}
                  entering={FadeInDown.delay(400 + index * 100).springify()}
                >
                  <Pressable
                    onPress={() => handleQuickUpgrade(plan.id as 'basic' | 'standard' | 'premium')}
                    className={`flex-row items-center p-4 rounded-xl mb-2 border-2 ${
                      plan.popular ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'
                    } active:opacity-80`}
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: plan.color + '20' }}
                    >
                      {plan.icon}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="font-bold text-gray-900">{plan.name}</Text>
                        {plan.popular && (
                          <View className="ml-2 bg-green-500 px-2 py-0.5 rounded-full">
                            <Text className="text-white text-xs font-bold">BEST</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-gray-500 text-sm">{plan.children}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-bold text-gray-900">{plan.price}</Text>
                      <Text className="text-gray-400 text-xs">/month</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            {/* Actions */}
            <View className="px-6 pb-6">
              <Pressable
                onPress={handleViewPlans}
                className="py-3 rounded-xl items-center border border-gray-200"
              >
                <Text className="text-gray-600 font-medium">View All Plans</Text>
              </Pressable>

              <Text className="text-gray-400 text-xs text-center mt-3">
                Cancel anytime. 30-day money back guarantee.
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Card Payment Modal */}
      <CardPaymentModal
        visible={showCardPayment}
        onClose={() => setShowCardPayment(false)}
        onSuccess={handleCardPaymentSuccess}
        selectedPlan={selectedPlan}
        email={currentUser?.email ?? ''}
      />
    </>
  );
}
