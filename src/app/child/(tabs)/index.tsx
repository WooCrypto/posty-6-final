// Child Home Screen - Main dashboard for children
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, Image, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import {
  Star,
  Flame,
  Mail,
  ChevronRight,
  Sparkles,
  Lock,
  X,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { getRandomQuote, getRotatingTip } from '@/lib/theme';
import { getPointsMultiplier } from '@/lib/types';
import { MascotRow, MascotBadge, getRandomMascot, MASCOTS } from '@/components/ClubMascots';
import { getDaysUntilShipping, getNextShippingDate, formatShippingDate, hasSelectedPlan } from '@/lib/subscriptionLimits';

export default function ChildHomeScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const tasks = useAppStore((s) => s.tasks);
  const refreshDailyTasks = useAppStore((s) => s.refreshDailyTasks);
  const checkDailyLogin = useAppStore((s) => s.checkDailyLogin);

  const [showLoginBonus, setShowLoginBonus] = useState(false);
  const [showMailCelebration, setShowMailCelebration] = useState(false);
  const [postyTip, setPostyTip] = useState(getRotatingTip());

  const child = currentUser?.children.find((c) => c.id === activeChildId);

  // Track mail meter reaching 100%
  useEffect(() => {
    if (child?.mailMeterProgress >= 100) {
      setShowMailCelebration(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [child?.mailMeterProgress]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPostyTip(getRotatingTip());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeChildId) {
      refreshDailyTasks(activeChildId);

      // Check for daily login bonus
      const result = checkDailyLogin(activeChildId);
      if (result.bonusAwarded) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowLoginBonus(true);
      }
    }
  }, [activeChildId]);

  if (!child) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">No child selected</Text>
      </View>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter((t) => t.childId === child.id && t.dueDate === today);
  const completedTasks = todaysTasks.filter(
    (t) => t.status === 'completed' || t.status === 'approved'
  );
  const approvedTasks = todaysTasks.filter((t) => t.status === 'approved');
  const pendingTasks = todaysTasks.filter((t) => t.status === 'pending');

  // Progress calculation - based on approved tasks (after parent approval)
  const progress = todaysTasks.length > 0 ? (approvedTasks.length / todaysTasks.length) * 100 : 0;
  const multiplier = getPointsMultiplier(child.totalPoints);

  const handleParentMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/passcode');
  };

  const postyMessage =
    completedTasks.length === todaysTasks.length && todaysTasks.length > 0
      ? "Amazing! You've completed all tasks!"
      : pendingTasks.length > 0
      ? getRandomQuote('encouragement')
      : 'Great start! Keep going!';

  return (
    <View className="flex-1 bg-gray-50">
      {/* Daily Login Bonus Modal */}
      <Modal
        visible={showLoginBonus}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoginBonus(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <Animated.View
            entering={ZoomIn.springify()}
            className="bg-white rounded-3xl p-6 w-full max-w-sm items-center"
          >
            <Pressable
              onPress={() => setShowLoginBonus(false)}
              className="absolute top-4 right-4"
            >
              <X size={24} color="#94A3B8" />
            </Pressable>

            <Image
              source={require('@/assets/posty-logo.png')}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />

            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: '#FFD700',
                marginTop: 12,
                ...Platform.select({
                  web: { textShadow: '1px 1px 0px #FF6B00' },
                  default: { textShadowColor: '#FF6B00', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
                }),
              }}
            >
              DAILY BONUS!
            </Text>

            <View className="flex-row items-center mt-4 bg-amber-100 px-6 py-3 rounded-full">
              <Star size={28} color="#F59E0B" />
              <Text className="text-3xl font-bold text-amber-700 ml-2">+25</Text>
            </View>

            <Text className="text-gray-600 text-center mt-4">
              You earned 25 Magic Coins for logging in today!
            </Text>

            <View className="flex-row items-center mt-3">
              <Flame size={20} color="#EF4444" />
              <Text className="text-gray-700 font-semibold ml-2">
                {child.streakDays} day streak!
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowLoginBonus(false);
              }}
              style={{
                backgroundColor: '#FFD700',
                paddingVertical: 14,
                paddingHorizontal: 40,
                borderRadius: 16,
                marginTop: 20,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1a1a2e' }}>
                AWESOME!
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* Mail Celebration Modal */}
      <Modal
        visible={showMailCelebration}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMailCelebration(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <Animated.View
            entering={ZoomIn.springify()}
            className="bg-gradient-to-b from-blue-400 to-blue-600 rounded-3xl p-6 w-full max-w-sm items-center overflow-hidden"
            style={{ backgroundColor: '#4A90E2' }}
          >
            <Pressable
              onPress={() => setShowMailCelebration(false)}
              className="absolute top-4 right-4 z-10"
            >
              <X size={24} color="white" />
            </Pressable>

            <View className="items-center">
              <Text className="text-6xl mb-2">📬</Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '800',
                  color: '#FFD700',
                  textAlign: 'center',
                  marginTop: 8,
                  ...Platform.select({
                    web: { textShadow: '1px 1px 0px #FF6B00' },
                    default: { textShadowColor: '#FF6B00', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
                  }),
                }}
              >
                MAIL METER FULL!
              </Text>
            </View>

            <View className="bg-white/20 rounded-2xl p-4 mt-4 w-full">
              <Text className="text-white text-center text-lg font-bold">
                Great job completing 5 tasks!
              </Text>
              <Text className="text-white/90 text-center mt-2">
                Complete 5 more tasks this week to earn your Posty Mail reward at the end of the month!
              </Text>
            </View>

            <View className="flex-row items-center mt-4 bg-white/20 px-4 py-2 rounded-full">
              <Mail size={20} color="white" />
              <Text className="text-white font-semibold ml-2">
                Posty is preparing your mail!
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowMailCelebration(false);
              }}
              style={{
                backgroundColor: '#FFD700',
                paddingVertical: 14,
                paddingHorizontal: 40,
                borderRadius: 16,
                marginTop: 20,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1a1a2e' }}>
                KEEP GOING!
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with gradient */}
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={{ paddingBottom: 80, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
          >
            <View className="px-5 pt-4 pb-2">
              {/* Top Bar */}
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Hey there,</Text>
                  <Text
                    style={{
                      color: '#FFD700',
                      fontSize: 24,
                      fontWeight: '800',
                      ...Platform.select({
                        web: { textShadow: '1px 1px 0px #FF6B00' },
                        default: { textShadowColor: '#FF6B00', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
                      }),
                    }}
                  >
                    {child.name}!
                  </Text>
                </View>
                <Pressable
                  onPress={handleParentMode}
                  className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
                >
                  <Lock size={20} color="white" />
                </Pressable>
              </View>

              {/* Posty Greeting */}
              <View className="items-center">
                <Image
                  source={require('@/assets/posty-logo.png')}
                  style={{ width: 100, height: 100 }}
                  resizeMode="contain"
                />
                <View className="bg-white/10 rounded-xl px-4 py-2 mt-2">
                  <Text style={{ color: '#00FFFF', fontWeight: '600', textAlign: 'center' }}>
                    {postyMessage}
                  </Text>
                </View>
                {/* Club Mascots */}
                <View className="mt-3">
                  <MascotRow size="small" showNames={true} showTitle={true} spacing={6} />
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Stats Cards */}
          <View className="px-5 -mt-12">
            <Animated.View
              entering={FadeInUp.delay(200).springify()}
              className="bg-white rounded-3xl p-5 shadow-lg"
            >
              {/* Points & Streak Row */}
              <View className="flex-row mb-4">
                <View className="flex-1 mr-2">
                  <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <View className="flex-row items-center">
                      <Star size={24} color="#F59E0B" />
                      <Text className="text-2xl font-bold text-amber-800 ml-2">
                        {child.points}
                      </Text>
                    </View>
                    <Text className="text-amber-600 text-sm mt-1">Magic Coins</Text>
                    {multiplier > 1 && (
                      <View className="bg-amber-200 px-2 py-0.5 rounded-full mt-1 self-start">
                        <Text className="text-amber-800 text-xs font-bold">{multiplier}x bonus!</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View className="flex-1 ml-2">
                  <View className="bg-red-50 rounded-2xl p-4 border border-red-100">
                    <View className="flex-row items-center">
                      <Flame size={24} color="#EF4444" />
                      <Text className="text-2xl font-bold text-red-800 ml-2">
                        {child.streakDays}
                      </Text>
                    </View>
                    <Text className="text-red-600 text-sm mt-1">Day Streak</Text>
                    {child.streakDays >= 7 && (
                      <View className="bg-red-200 px-2 py-0.5 rounded-full mt-1 self-start">
                        <Text className="text-red-800 text-xs font-bold">On fire!</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Today's Progress */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-900 font-bold">Today's Progress</Text>
                  <Text className="text-gray-500 text-sm">
                    {approvedTasks.length}/{todaysTasks.length} tasks
                  </Text>
                </View>
                <View className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: progress === 100 ? '#22C55E' : '#4A90E2',
                    }}
                  />
                </View>
                {progress === 100 && (
                  <View className="flex-row items-center mt-2">
                    <Sparkles size={16} color="#22C55E" />
                    <Text className="text-green-600 text-sm ml-1 font-medium">
                      All done! Great job!
                    </Text>
                  </View>
                )}
              </View>

              {/* Mail Meter */}
              <View className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Mail size={20} color="#4A90E2" />
                    <Text className="text-blue-800 font-bold ml-2">Mail Meter</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-blue-600 font-bold">{Math.round(child.mailMeterProgress)}%</Text>
                  </View>
                </View>
                <View className="h-4 bg-blue-100 rounded-full overflow-hidden relative">
                  <View
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                    style={{ width: `${child.mailMeterProgress}%`, backgroundColor: '#4A90E2' }}
                  />
                  {/* Mail icons showing progress */}
                  <View className="absolute inset-0 flex-row items-center justify-around px-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Text 
                        key={i} 
                        className="text-xs"
                        style={{ opacity: (child.mailMeterProgress / 100 * 5) >= i ? 1 : 0.3 }}
                      >
                        📬
                      </Text>
                    ))}
                  </View>
                </View>
                {child.mailMeterProgress >= 100 ? (
                  <View className="bg-green-100 rounded-xl p-3 mt-3">
                    <View className="flex-row items-center">
                      <Text className="text-2xl mr-2">🎉</Text>
                      <View className="flex-1">
                        <Text className="text-green-700 font-bold">Mail Ready!</Text>
                        <Text className="text-green-600 text-xs">Complete 5 more for next reward!</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-between mt-3">
                    <View className="flex-row items-center bg-blue-100 px-3 py-1.5 rounded-full">
                      <Text className="text-lg mr-1">📮</Text>
                      <Text className="text-blue-700 font-semibold text-sm">
                        {5 - Math.floor(child.mailMeterProgress / 20)} more to mail!
                      </Text>
                    </View>
                    <Text className="text-blue-500 text-xs">Weekly Goal</Text>
                  </View>
                )}
              </View>

              {/* Shipping Countdown */}
              {hasSelectedPlan(currentUser?.subscription) && currentUser?.createdAt && (
                <View className="bg-purple-50 rounded-2xl p-4 border border-purple-100 mt-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Text className="text-2xl mr-2">📬</Text>
                      <View>
                        <Text className="text-purple-800 font-bold">Next Mail Ships</Text>
                        <Text className="text-purple-600 text-xs">{formatShippingDate(getNextShippingDate(currentUser.createdAt))}</Text>
                      </View>
                    </View>
                    <View className="bg-purple-600 rounded-full px-3 py-1">
                      <Text className="text-white font-bold">{getDaysUntilShipping(currentUser.createdAt)}d</Text>
                    </View>
                  </View>
                </View>
              )}
            </Animated.View>
          </View>

          {/* Quick Actions */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="px-5 mt-6"
          >
            <Text className="text-gray-900 font-bold text-lg mb-3">Quick Start</Text>

            {pendingTasks.length > 0 ? (
              <Pressable
                onPress={() => router.push('/child/(tabs)/tasks')}
                style={{
                  backgroundColor: '#4A90E2',
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-4">
                  <Text className="text-2xl">📝</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-lg">
                    {pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''} waiting
                  </Text>
                  <Text className="text-white/80 text-sm">Tap to see your tasks</Text>
                </View>
                <ChevronRight size={24} color="white" />
              </Pressable>
            ) : completedTasks.length > 0 && completedTasks.length < todaysTasks.length ? (
              <View className="bg-amber-100 rounded-2xl p-4">
                <View className="flex-row items-center">
                  <Text className="text-3xl mr-3">⏳</Text>
                  <View className="flex-1">
                    <Text className="text-amber-800 font-bold">Waiting for approval</Text>
                    <Text className="text-amber-600 text-sm">
                      {completedTasks.length - approvedTasks.length} task(s) pending parent review
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="bg-green-100 rounded-2xl p-4">
                <View className="flex-row items-center">
                  <Text className="text-3xl mr-3">🎉</Text>
                  <View className="flex-1">
                    <Text className="text-green-800 font-bold">Amazing job!</Text>
                    <Text className="text-green-600 text-sm">
                      You've completed all your tasks for today!
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Level Progress */}
          <Animated.View
            entering={FadeInDown.delay(600).springify()}
            className="px-5 mt-6"
          >
            <View className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-purple-800 font-bold">Level {child.level}</Text>
                <Text className="text-purple-600 text-sm">
                  {child.totalPoints} Magic Coins
                </Text>
              </View>
              <View className="h-2 bg-purple-100 rounded-full overflow-hidden">
                <View
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${(child.totalPoints % 500) / 5}%` }}
                />
              </View>
              <Text className="text-purple-600 text-xs mt-1">
                {500 - (child.totalPoints % 500)} Magic Coins to Level {child.level + 1}
              </Text>
            </View>
          </Animated.View>

          {/* Posty's Tip of the Moment */}
          <Animated.View
            entering={FadeInDown.delay(700).springify()}
            className="px-5 mt-6 mb-4"
          >
            <View className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-4 border border-cyan-100">
              <View className="flex-row items-start">
                <View className="w-12 h-12 rounded-full bg-cyan-100 items-center justify-center mr-3">
                  <Text className="text-2xl">💡</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-cyan-800 font-bold mb-1">Posty's Tip</Text>
                  <Text className="text-cyan-700 text-sm leading-5">{postyTip}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
