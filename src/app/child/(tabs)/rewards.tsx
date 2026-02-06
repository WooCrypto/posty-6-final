// Child Rewards Screen - View progress and upcoming rewards with gift cards
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Modal, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { PostyMascot } from '@/components/PostyMascot';
import { isFreePlanExpired } from '@/lib/types';
import { isFreePlan as checkIsFreePlan, getDaysUntilShipping, getNextShippingDate, formatShippingDate, hasSelectedPlan } from '@/lib/subscriptionLimits';
import {
  Star,
  Gift,
  CreditCard,
  Sparkles,
  ExternalLink,
  Award,
  Info,
  Clock,
  AlertTriangle,
  Lock,
  Crown,
  X,
  Check,
  ShieldCheck,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ProgressPieChart } from '@/components/ProgressPieChart';

const RosieImage = require('@/assets/rosie.png');

export default function ChildRewardsScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const redeemGiftCard = useAppStore((s) => s.redeemGiftCard);
  const verifyPasscode = useAppStore((s) => s.verifyPasscode);

  const [selectedGiftCard, setSelectedGiftCard] = useState<{
    id: string;
    name: string;
    points: number;
    icon: string;
    color: string;
  } | null>(null);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [showMailPasscodeModal, setShowMailPasscodeModal] = useState(false);
  const [mailPasscode, setMailPasscode] = useState('');
  const [mailPasscodeError, setMailPasscodeError] = useState('');
  
  const sendMailVerification = useAppStore((s) => s.sendMailVerification);
  const verifyMailCode = useAppStore((s) => s.verifyMailCode);

  const child = currentUser?.children.find((c) => c.id === activeChildId);
  const subscription = currentUser?.subscription;
  // Use shared isFreePlan helper for consistent detection across the app
  const isFreePlan = checkIsFreePlan(subscription) || subscription?.plan === 'free';
  const freeTrialExpired = isFreePlanExpired(subscription);
  
  // Calculate days remaining for free trial
  const getDaysRemaining = (): number | null => {
    if (!subscription?.freeTrialExpiresAt || !isFreePlan) return null;
    const expirationDate = new Date(subscription.freeTrialExpiresAt);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };
  
  const daysRemaining = getDaysRemaining();

  if (!child) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">No child selected</Text>
      </View>
    );
  }

  const mailProgress = child.mailMeterProgress;
  const isMailUnlocked = mailProgress >= 100;
  const isMailVerified = child.mailVerified || false;

  const handleClaimMailReward = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowMailPasscodeModal(true);
    setMailPasscode('');
    setMailPasscodeError('');
  };

  const handleMailPasscodeSubmit = () => {
    if (mailPasscode.length !== 4) {
      setMailPasscodeError('Please enter a 4-digit passcode');
      return;
    }
    
    const isValid = verifyPasscode(mailPasscode);
    if (!isValid) {
      setMailPasscodeError('Incorrect passcode. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowMailPasscodeModal(false);
    
    // Mark mail as verified/claimed
    const result = sendMailVerification(child.id);
    if (result.success) {
      // Immediately verify it since passcode was correct
      verifyMailCode(child.id, result.code);
      setSuccessMessage('Your special mail from Posty is being prepared for delivery!');
      setShowSuccessModal(true);
    }
    setMailPasscode('');
  };

  const handleSendVerification = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = sendMailVerification(child.id);
    if (result.success) {
      setGeneratedCode(result.code);
      setShowVerificationModal(true);
      setVerificationCode('');
      setVerificationError('');
    }
  };

  const handleVerifyCode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isValid = verifyMailCode(child.id, verificationCode);
    if (isValid) {
      setShowVerificationModal(false);
      setSuccessMessage('Human verified! Your special mail from Posty is on its way!');
      setShowSuccessModal(true);
    } else {
      setVerificationError('Invalid or expired code. Please try again.');
    }
  };

  // Free plan users only get certificate and stickers from Posty
  const freeRewardTypes = [
    { icon: '🏆', name: 'Certificate of Achievement', description: 'A special certificate from Posty!' },
    { icon: '⭐', name: 'Posty Magic Stickers', description: 'Fun stickers from Posty to collect!' },
  ];

  const paidRewardTypes = [
    { icon: '✉️', name: 'Letter from Posty', description: 'A personalized letter just for you!' },
    { icon: '⭐', name: 'Stickers', description: 'Fun stickers to collect and share' },
    { icon: '📝', name: 'Activity Pages', description: 'Games, puzzles, and coloring pages' },
    { icon: '🎯', name: 'Challenge Cards', description: 'New challenges to try!' },
  ];

  // For free plan, we show their rewards first, then the paid rewards as "locked"
  const rewardTypes = isFreePlan ? freeRewardTypes : paidRewardTypes;

  const giftCardOptions = [
    {
      id: 'roblox',
      name: 'Roblox Gift Card ($5)',
      description: 'Get Robux for your avatar',
      icon: '🎮',
      color: '#E31B23',
      points: 25000,
    },
    {
      id: 'itunes',
      name: 'iTunes/Apple Gift Card ($10)',
      description: 'Apps, music, and more',
      icon: '🍎',
      color: '#555555',
      points: 50000,
    },
    {
      id: 'amazon',
      name: 'Amazon Gift Card ($15)',
      description: 'Shop millions of products',
      icon: '🛒',
      color: '#FF9900',
      points: 75000,
    },
    {
      id: 'visa',
      name: 'Visa Gift Card ($25)',
      description: 'Use anywhere Visa is accepted',
      icon: '💳',
      color: '#1A1F71',
      points: 125000,
    },
  ];

  const handleGiftCardPress = (giftCard: typeof giftCardOptions[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (child.points >= giftCard.points) {
      setSelectedGiftCard(giftCard);
      setShowRedemptionModal(true);
    } else {
      Alert.alert(
        'Not Enough Magic Coins',
        `You need ${giftCard.points - child.points} more Magic Coins to redeem this gift card. Keep completing tasks!`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleConfirmRedemption = () => {
    setShowRedemptionModal(false);
    setShowPasscodeModal(true);
    setPasscode('');
    setPasscodeError('');
  };

  const handlePasscodeSubmit = () => {
    if (passcode.length !== 4) {
      setPasscodeError('Please enter 4 digits');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const isValid = verifyPasscode(passcode);
    if (!isValid) {
      setPasscodeError('Incorrect passcode');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPasscode('');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPasscodeModal(false);
    
    if (selectedGiftCard && activeChildId) {
      const result = redeemGiftCard(activeChildId, selectedGiftCard.id, selectedGiftCard.name, selectedGiftCard.points);
      if (result.success) {
        setSuccessMessage(result.message);
        setShowSuccessModal(true);
      } else {
        Alert.alert('Redemption Failed', result.message, [{ text: 'OK' }]);
      }
    }
    setPasscode('');
  };

  const closeAllModals = () => {
    setShowRedemptionModal(false);
    setShowPasscodeModal(false);
    setShowSuccessModal(false);
    setSelectedGiftCard(null);
    setPasscode('');
    setPasscodeError('');
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Redemption Confirmation Modal */}
      <Modal
        visible={showRedemptionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRedemptionModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => setShowRedemptionModal(false)}
        >
          <Pressable
            className="w-full bg-white rounded-3xl overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            {selectedGiftCard && (
              <Animated.View entering={FadeIn.duration(200)}>
                <LinearGradient
                  colors={[selectedGiftCard.color + '20', selectedGiftCard.color + '05']}
                  className="p-6 items-center"
                >
                  <View
                    className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
                    style={{ backgroundColor: selectedGiftCard.color + '30' }}
                  >
                    <Text className="text-4xl">{selectedGiftCard.icon}</Text>
                  </View>
                  <Text className="text-xl font-bold text-gray-900 text-center">
                    Redeem {selectedGiftCard.name}?
                  </Text>
                  <Text className="text-gray-500 text-center mt-2">
                    This will use {selectedGiftCard.points.toLocaleString()} Magic Coins
                  </Text>
                  <View className="flex-row items-center mt-3 bg-amber-100 rounded-full px-4 py-2">
                    <Star size={16} color="#F59E0B" />
                    <Text className="text-amber-700 font-bold ml-2">
                      Your balance: {child.points.toLocaleString()} coins
                    </Text>
                  </View>
                </LinearGradient>
                <View className="p-6">
                  <Text className="text-gray-600 text-center mb-4">
                    Parent approval is required. Ask your parent to enter their passcode to confirm this redemption.
                  </Text>
                  <Pressable
                    onPress={handleConfirmRedemption}
                    className="bg-green-500 rounded-xl py-4 mb-3"
                  >
                    <Text className="text-white font-bold text-center text-lg">
                      Ask Parent to Approve
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowRedemptionModal(false)}
                    className="py-3"
                  >
                    <Text className="text-gray-500 text-center">Cancel</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Passcode Modal */}
      <Modal
        visible={showPasscodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasscodeModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => setShowPasscodeModal(false)}
        >
          <Pressable
            className="w-full bg-white rounded-3xl p-6"
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View entering={FadeIn.duration(200)} className="items-center">
              <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-4">
                <ShieldCheck size={32} color="#3B82F6" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                Parent Approval
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                Enter your 4-digit passcode to approve the gift card redemption
              </Text>
              <TextInput
                value={passcode}
                onChangeText={(text) => {
                  setPasscode(text.replace(/[^0-9]/g, '').slice(0, 4));
                  setPasscodeError('');
                }}
                placeholder="Enter 4-digit passcode"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                className="w-full text-center text-2xl py-4 bg-gray-100 rounded-xl tracking-[20px] font-bold"
              />
              {passcodeError ? (
                <Text className="text-red-500 mt-2">{passcodeError}</Text>
              ) : null}
              <Pressable
                onPress={handlePasscodeSubmit}
                className="w-full bg-blue-500 rounded-xl py-4 mt-6"
              >
                <Text className="text-white font-bold text-center text-lg">
                  Confirm Redemption
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowPasscodeModal(false)}
                className="py-4"
              >
                <Text className="text-gray-500 text-center">Cancel</Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={closeAllModals}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={closeAllModals}
        >
          <Pressable
            className="w-full bg-white rounded-3xl p-6"
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View entering={ZoomIn.duration(300)} className="items-center">
              <LinearGradient
                colors={['#22C55E', '#10B981']}
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
              >
                <Check size={40} color="#FFFFFF" strokeWidth={3} />
              </LinearGradient>
              <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                Redemption Successful!
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                {successMessage}
              </Text>
              <PostyMascot size="small" mood="celebrating" animate />
              <Pressable
                onPress={closeAllModals}
                className="w-full bg-green-500 rounded-xl py-4 mt-6"
              >
                <Text className="text-white font-bold text-center text-lg">
                  Awesome!
                </Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Mail Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => setShowVerificationModal(false)}
        >
          <Pressable
            className="w-full bg-white rounded-3xl p-6"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="items-center mb-4">
              <LinearGradient
                colors={['#4A90E2', '#6366F1']}
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
              >
                <ShieldCheck size={32} color="#FFFFFF" />
              </LinearGradient>
              <Text className="text-xl font-bold text-gray-900 text-center">
                Human Verification
              </Text>
              <Text className="text-gray-500 text-center mt-2">
                A parent needs to verify this reward claim
              </Text>
            </View>

            <View className="bg-blue-50 rounded-xl p-4 mb-4">
              <Text className="text-blue-700 text-sm text-center mb-2">
                Share this code with your parent:
              </Text>
              <Text className="text-3xl font-bold text-blue-600 text-center tracking-widest">
                {generatedCode}
              </Text>
              <Text className="text-blue-600 text-xs text-center mt-2">
                Code expires in 1 hour
              </Text>
            </View>

            <Text className="text-gray-700 text-center mb-3">
              Enter verification code:
            </Text>
            <TextInput
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="Enter 6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              className="border-2 border-gray-200 rounded-xl p-4 text-center text-2xl tracking-widest font-bold mb-2"
            />
            {verificationError ? (
              <Text className="text-red-500 text-center mb-3">{verificationError}</Text>
            ) : null}

            <View className="flex-row mt-4">
              <Pressable
                onPress={() => setShowVerificationModal(false)}
                className="flex-1 bg-gray-100 rounded-xl py-4 mr-2"
              >
                <Text className="text-gray-700 font-bold text-center">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleVerifyCode}
                className="flex-1 bg-blue-500 rounded-xl py-4 ml-2"
              >
                <Text className="text-white font-bold text-center">Verify</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Mail Claim Passcode Modal */}
      <Modal
        visible={showMailPasscodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMailPasscodeModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => setShowMailPasscodeModal(false)}
        >
          <Pressable
            className="w-full bg-white rounded-3xl p-6"
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View entering={FadeIn.duration(200)} className="items-center">
              <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-4">
                <ShieldCheck size={32} color="#22C55E" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                Parent Approval Required
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                Enter your 4-digit passcode to claim this mail reward
              </Text>
              <TextInput
                value={mailPasscode}
                onChangeText={(text) => {
                  setMailPasscode(text.replace(/[^0-9]/g, '').slice(0, 4));
                  setMailPasscodeError('');
                }}
                placeholder="Enter 4-digit passcode"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                className="w-full text-center text-2xl py-4 bg-gray-100 rounded-xl tracking-[20px] font-bold"
              />
              {mailPasscodeError ? (
                <Text className="text-red-500 mt-2">{mailPasscodeError}</Text>
              ) : null}
              <Pressable
                onPress={handleMailPasscodeSubmit}
                className="w-full bg-green-500 rounded-xl py-4 mt-6"
              >
                <Text className="text-white font-bold text-center text-lg">
                  Claim Mail Reward
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowMailPasscodeModal(false)}
                className="py-4"
              >
                <Text className="text-gray-500 text-center">Cancel</Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View className="px-5 py-4 bg-white border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">Rewards</Text>
          <Text className="text-gray-500 text-sm mt-1">Earn mail by completing tasks!</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Mail Meter */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="bg-white rounded-3xl p-6 mb-6 shadow-sm items-center"
          >
            <PostyMascot
              size="medium"
              mood={isMailUnlocked ? 'celebrating' : 'encouraging'}
              animate
            />

            <Text className="text-xl font-bold text-gray-900 mt-4 mb-2">Mail Meter</Text>

            {/* Progress Pie Chart */}
            <View className="my-4">
              <ProgressPieChart
                progress={mailProgress}
                size={160}
                strokeWidth={16}
                progressColor={mailProgress >= 100 ? '#22C55E' : '#4A90E2'}
                backgroundColor="#E5E7EB"
              >
                <View className="items-center">
                  <Text className="text-4xl font-extrabold" style={{ color: mailProgress >= 100 ? '#22C55E' : '#4A90E2' }}>
                    {Math.round(mailProgress)}%
                  </Text>
                  <Text className="text-gray-500 text-sm">complete</Text>
                </View>
              </ProgressPieChart>
            </View>

            {isMailUnlocked ? (
              <View className="bg-green-100 rounded-2xl p-4 w-full">
                <View className="flex-row items-center justify-center">
                  <Sparkles size={24} color="#22C55E" />
                  <Text className="text-green-700 font-bold text-lg ml-2">
                    {isMailVerified ? 'Verified & Ready!' : 'Mail Unlocked!'}
                  </Text>
                </View>
                {isMailVerified ? (
                  <View className="items-center mt-2">
                    <View className="flex-row items-center bg-green-200 rounded-full px-4 py-2 mb-2">
                      <ShieldCheck size={20} color="#16A34A" />
                      <Text className="text-green-800 font-semibold ml-2">Human Verified</Text>
                    </View>
                    <Text className="text-green-600 text-center">
                      Posty is preparing your special delivery!
                    </Text>
                  </View>
                ) : (
                  <View className="items-center mt-3">
                    <Text className="text-green-600 text-center mb-3">
                      Ask your parent to enter their passcode to claim your mail reward!
                    </Text>
                    <Pressable
                      onPress={handleClaimMailReward}
                      className="bg-green-600 rounded-full px-6 py-3 flex-row items-center active:bg-green-700"
                    >
                      <ShieldCheck size={20} color="white" />
                      <Text className="text-white font-bold ml-2">Claim with Passcode</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <View className="bg-blue-50 rounded-2xl p-4 w-full">
                <Text className="text-blue-700 text-center">
                  Complete more tasks to fill up your mail meter and unlock a special delivery from Posty!
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Shipping Countdown - Show when user has a plan */}
          {hasSelectedPlan(subscription) && currentUser?.createdAt && (
            <Animated.View
              entering={FadeInDown.delay(150).springify()}
              className="bg-gradient-to-br bg-blue-50 rounded-2xl p-5 mb-6 border border-blue-200"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-full bg-blue-200 items-center justify-center mr-3">
                    <Text className="text-2xl">📬</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-blue-900 font-bold text-lg">Next Mail Ships</Text>
                    <Text className="text-blue-700 text-sm">
                      {formatShippingDate(getNextShippingDate(currentUser.createdAt))}
                    </Text>
                  </View>
                </View>
                <View className="bg-blue-600 rounded-full px-4 py-2">
                  <Text className="text-white font-bold text-lg">
                    {getDaysUntilShipping(currentUser.createdAt)} days
                  </Text>
                </View>
              </View>
              <View className="mt-3 bg-white/60 rounded-xl p-3">
                <Text className="text-blue-800 text-sm text-center">
                  Mail ships every 3 weeks from your signup date. Keep completing tasks to earn more rewards!
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Free Plan Notice - Always show prominently at top for free plan users */}
          {isFreePlan && (
            <Animated.View
              entering={FadeInDown.delay(150).springify()}
              className="bg-amber-50 rounded-2xl p-5 mb-6 border-2 border-amber-300"
            >
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full bg-amber-200 items-center justify-center mr-3">
                  <Info size={22} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-amber-900 font-bold text-lg">Free Plan</Text>
                  <Text className="text-amber-700 text-sm">Limited rewards available</Text>
                </View>
              </View>
              <View className="bg-white rounded-xl p-4 mb-3">
                <Text className="text-gray-800 font-semibold mb-2">Your Free Plan Rewards:</Text>
                <View className="flex-row items-center mb-2">
                  <Text className="text-2xl mr-2">🏆</Text>
                  <Text className="text-gray-700">Certificate of Achievement from Posty</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-2">⭐</Text>
                  <Text className="text-gray-700">Posty Magic Stickers</Text>
                </View>
              </View>
              <Text className="text-amber-800 text-sm mb-3">
                Free plan users receive only certificates and stickers from Posty. Upgrade to unlock real mail rewards, activity pages, challenge cards, and gift card redemptions!
              </Text>
              {daysRemaining !== null && !freeTrialExpired && (
                <View className="flex-row items-center bg-amber-100 rounded-lg p-3">
                  <Clock size={18} color="#D97706" />
                  <Text className="text-amber-800 font-medium ml-2">
                    {daysRemaining > 0 
                      ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining until first mail is shipped`
                      : 'Trial period ending soon'
                    }
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* What's in the Mail */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              {isFreePlan ? 'Your Free Plan Rewards' : 'What\'s in the Mail?'}
            </Text>

            {rewardTypes.map((reward, index) => (
              <View
                key={index}
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex-row items-center"
              >
                <View className={`w-12 h-12 rounded-full ${isFreePlan ? 'bg-emerald-100' : 'bg-amber-100'} items-center justify-center mr-4`}>
                  <Text className="text-2xl">{reward.icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold">{reward.name}</Text>
                  <Text className="text-gray-500 text-sm">{reward.description}</Text>
                </View>
              </View>
            ))}
          </Animated.View>

          {/* Upgrade to Unlock - Show paid rewards to free plan users as locked */}
          {isFreePlan && (
            <Animated.View entering={FadeInDown.delay(250).springify()} className="mt-4">
              <LinearGradient
                colors={['#8B5CF6', '#EC4899', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-3xl p-[2px] mb-4"
              >
                <View className="bg-white rounded-[22px] overflow-hidden">
                  <LinearGradient
                    colors={['#FAF5FF', '#FDF2F8', '#FFF7ED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="p-5"
                  >
                    <View className="flex-row items-center mb-2">
                      <LinearGradient
                        colors={['#8B5CF6', '#EC4899']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      >
                        <Crown size={22} color="#FFFFFF" />
                      </LinearGradient>
                      <View className="flex-1">
                        <Text className="text-xl font-bold text-purple-900">Upgrade to Unlock</Text>
                        <Text className="text-purple-600 text-sm">Premium mail rewards await!</Text>
                      </View>
                      <View className="flex-row">
                        <Sparkles size={18} color="#EC4899" />
                        <Sparkles size={14} color="#F97316" style={{ marginLeft: -4, marginTop: 8 }} />
                      </View>
                    </View>
                    <Text className="text-purple-700 text-sm mb-1">
                      Ask your parent to upgrade and unlock these amazing mail rewards!
                    </Text>
                  </LinearGradient>

                  {paidRewardTypes.map((reward, index) => {
                    const gradientColors = [
                      ['#EEF2FF', '#E0E7FF'] as const,
                      ['#FDF4FF', '#FAE8FF'] as const,
                      ['#FFF7ED', '#FFEDD5'] as const,
                      ['#ECFDF5', '#D1FAE5'] as const,
                    ];
                                        const badgeGradients = [
                      ['#818CF8', '#6366F1'] as const,
                      ['#C084FC', '#A855F7'] as const,
                      ['#FB923C', '#F97316'] as const,
                      ['#34D399', '#10B981'] as const,
                    ];

                    return (
                      <View
                        key={index}
                        className="border-t border-purple-100"
                      >
                        <LinearGradient
                          colors={gradientColors[index % gradientColors.length]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          className="p-4 flex-row items-center"
                        >
                          <LinearGradient
                            colors={badgeGradients[index % badgeGradients.length]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="w-12 h-12 rounded-full items-center justify-center mr-4"
                          >
                            <Text className="text-2xl">{reward.icon}</Text>
                          </LinearGradient>
                          <View className="flex-1">
                            <Text className="text-gray-800 font-bold">{reward.name}</Text>
                            <Text className="text-gray-500 text-sm">{reward.description}</Text>
                          </View>
                          <LinearGradient
                            colors={badgeGradients[index % badgeGradients.length]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="rounded-full px-3 py-1.5 flex-row items-center"
                          >
                            <Lock size={12} color="#FFFFFF" />
                            <Text className="text-white text-xs font-bold ml-1">Locked</Text>
                          </LinearGradient>
                        </LinearGradient>
                      </View>
                    );
                  })}
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Gift Card Rewards */}
          <Animated.View
            entering={FadeInDown.delay(isFreePlan ? 300 : 250).springify()}
            className="mt-4"
          >
            {isFreePlan ? (
              <Pressable 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/paywall');
                }}
              >
                <LinearGradient
                  colors={['#F59E0B', '#EF4444', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="rounded-2xl p-4 mb-3 flex-row items-center"
                >
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="w-12 h-12 rounded-full items-center justify-center mr-3"
                  >
                    <Gift size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-lg">Gift Card Rewards</Text>
                    <Text className="text-white/80 text-sm">Upgrade to redeem for real gift cards!</Text>
                  </View>
                  <LinearGradient
                    colors={['#FFFFFF', '#F3F4F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    className="rounded-full px-4 py-2 flex-row items-center shadow-sm"
                  >
                    <Lock size={14} color="#F59E0B" />
                    <Text className="text-amber-600 text-sm font-bold ml-1">Upgrade</Text>
                  </LinearGradient>
                </LinearGradient>
              </Pressable>
            ) : (
              <>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Gift size={20} color="#4A90E2" />
                    <Text className="text-lg font-bold ml-2 text-gray-900">
                      Gift Card Rewards
                    </Text>
                  </View>
                  {/* Mini mascot next to gift cards */}
                  <Image
                    source={RosieImage}
                    style={{ width: 32, height: 32, borderRadius: 16 }}
                    resizeMode="cover"
                  />
                </View>
                <Text className="text-sm mb-3 text-gray-500">
                  Save up your Magic Coins to redeem for real gift cards!
                </Text>
              </>
            )}
            
            <View className="flex-row flex-wrap">
              {giftCardOptions.map((giftCard, index) => {
                const canRedeem = !isFreePlan && child.points >= giftCard.points;
                const cardGradients: Record<string, readonly [string, string]> = {
                  roblox: ['#FFE5E5', '#FFC7C7'],
                  itunes: ['#F5F5F5', '#E8E8E8'],
                  amazon: ['#FFF3E0', '#FFE0B2'],
                  visa: ['#E8EAF6', '#C5CAE9'],
                };
                
                return (
                  <Pressable
                    key={giftCard.id}
                    onPress={() => {
                      if (isFreePlan) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push('/paywall');
                      } else {
                        handleGiftCardPress(giftCard);
                      }
                    }}
                    className={`w-[48%] rounded-2xl overflow-hidden mb-3 shadow-sm border-2 ${
                      isFreePlan 
                        ? 'border-gray-200' 
                        : `${canRedeem ? 'border-green-300' : 'border-gray-100'}`
                    } ${index % 2 === 0 ? 'mr-[4%]' : ''}`}
                  >
                    <LinearGradient
                      colors={isFreePlan ? cardGradients[giftCard.id] || ['#F9FAFB', '#F3F4F6'] : ['#FFFFFF', '#FAFAFA']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="p-4"
                    >
                      <View
                        className="w-12 h-12 rounded-xl items-center justify-center mb-2"
                        style={{ backgroundColor: giftCard.color + '25' }}
                      >
                        <Text className="text-2xl">{giftCard.icon}</Text>
                      </View>
                      <Text className={`font-semibold text-sm ${isFreePlan ? 'text-gray-700' : 'text-gray-900'}`}>
                        {giftCard.name}
                      </Text>
                      <Text className={`text-xs mt-1 ${isFreePlan ? 'text-gray-500' : 'text-gray-500'}`}>
                        {giftCard.description}
                      </Text>
                      <View className={`flex-row items-center mt-2 ${isFreePlan || canRedeem ? 'opacity-100' : 'opacity-50'}`}>
                        <Star size={12} color={isFreePlan ? '#F59E0B' : '#F59E0B'} />
                        <Text className={`font-bold text-xs ml-1 ${isFreePlan ? 'text-amber-600' : 'text-amber-700'}`}>
                          {giftCard.points.toLocaleString()} pts
                        </Text>
                      </View>
                      {isFreePlan && (
                        <View className="bg-amber-100 rounded-full px-2 py-1 mt-2 self-start flex-row items-center">
                          <Lock size={10} color="#D97706" />
                          <Text className="text-amber-700 text-xs font-medium ml-1">Upgrade</Text>
                        </View>
                      )}
                      {canRedeem && !isFreePlan && (
                        <View className="bg-green-100 rounded-full px-2 py-1 mt-2 self-start">
                          <Text className="text-green-700 text-xs font-medium">Can Redeem!</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* Magic Coins Summary */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="mt-4"
          >
            <Text className="text-lg font-bold text-gray-900 mb-3">Your Magic Coins</Text>

            <View className="bg-gradient-to-br bg-amber-50 rounded-2xl p-5 border border-amber-100">
              <View className="flex-row items-center mb-4">
                <View className="w-14 h-14 rounded-full bg-amber-200 items-center justify-center mr-4">
                  <Star size={28} color="#F59E0B" />
                </View>
                <View>
                  <Text className="text-3xl font-bold text-amber-800">{child.points}</Text>
                  <Text className="text-amber-600">Current Coins</Text>
                </View>
              </View>

              <View className="flex-row justify-between pt-4 border-t border-amber-200">
                <View>
                  <Text className="text-amber-800 font-bold">{child.totalPoints}</Text>
                  <Text className="text-amber-600 text-sm">Total Earned</Text>
                </View>
                <View>
                  <Text className="text-amber-800 font-bold">Level {child.level}</Text>
                  <Text className="text-amber-600 text-sm">Current Level</Text>
                </View>
                <View>
                  <Text className="text-amber-800 font-bold">{child.badges.length}</Text>
                  <Text className="text-amber-600 text-sm">Badges</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Badges */}
          {child.badges.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(400).springify()}
              className="mt-4"
            >
              <Text className="text-lg font-bold text-gray-900 mb-3">Your Badges</Text>
              <View className="bg-white rounded-2xl p-4 shadow-sm">
                <View className="flex-row flex-wrap">
                  {child.badges.map((badge) => (
                    <View key={badge.id} className="items-center w-1/4 mb-4">
                      <View className="w-12 h-12 rounded-full bg-purple-100 items-center justify-center mb-1">
                        <Text className="text-2xl">{badge.icon}</Text>
                      </View>
                      <Text className="text-xs text-gray-600 text-center">{badge.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
