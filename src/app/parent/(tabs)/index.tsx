// Parent Home Screen - Overview dashboard
import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { PostyMascot, PostyAvatar } from '@/components/PostyMascot';
import {
  Mail,
  Star,
  ChevronRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Flame,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { getDaysUntilShipping, getNextShippingDate, formatShippingDate, hasSelectedPlan } from '@/lib/subscriptionLimits';

export default function ParentHomeScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const children = currentUser?.children ?? [];
  const tasks = useAppStore((s) => s.tasks);
  const refreshDailyTasks = useAppStore((s) => s.refreshDailyTasks);

  // Refresh tasks for all children on load
  useEffect(() => {
    children.forEach((child) => {
      refreshDailyTasks(child.id);
    });
  }, []);

  // Get pending approvals count
  const pendingApprovals = tasks.filter((t) => t.status === 'completed').length;

  // Get today's stats across all children
  const today = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter((t) => t.dueDate === today);
  const completedToday = todaysTasks.filter(
    (t) => t.status === 'completed' || t.status === 'approved'
  ).length;
  const approvedToday = todaysTasks.filter((t) => t.status === 'approved').length;

  const handleApprovePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/parent/approve-tasks');
  };

  const handleChildPress = (childId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/parent/child-detail', params: { childId } });
  };

  const handleSwitchToChild = (childId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const switchToChildMode = useAppStore.getState().switchToChildMode;
    switchToChildMode(childId);
    router.replace('/child/(tabs)');
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <LinearGradient
            colors={['#4A90E2', '#7AB3F0']}
            style={{ paddingBottom: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
          >
            <View className="px-5 pt-4">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-white/80 text-sm">Welcome back,</Text>
                  <Text className="text-white text-2xl font-bold">
                    {currentUser?.name ?? 'Parent'}
                  </Text>
                </View>
                <PostyAvatar size={48} />
              </View>

              {/* Quick Stats */}
              <View className="flex-row mt-2">
                <View className="flex-1 bg-white/20 rounded-xl p-3 mr-2">
                  <View className="flex-row items-center">
                    <CheckCircle2 size={20} color="#FFD93D" />
                    <Text className="text-white ml-2 font-semibold">{completedToday}</Text>
                  </View>
                  <Text className="text-white/80 text-xs mt-1">Tasks Done Today</Text>
                </View>
                <View className="flex-1 bg-white/20 rounded-xl p-3">
                  <View className="flex-row items-center">
                    <Star size={20} color="#FFD93D" />
                    <Text className="text-white ml-2 font-semibold">{approvedToday}</Text>
                  </View>
                  <Text className="text-white/80 text-xs mt-1">Approved Today</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Shipping Countdown Card */}
          {hasSelectedPlan(currentUser?.subscription) && currentUser?.createdAt && (
            <Animated.View
              entering={FadeInDown.delay(150).springify()}
              className="mx-5 -mt-10 mb-3"
            >
              <View className="bg-white rounded-2xl p-4 shadow-lg flex-row items-center border-l-4 border-blue-400">
                <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-4">
                  <Mail size={24} color="#4A90E2" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold">Next Mail Ships</Text>
                  <Text className="text-gray-500 text-sm">{formatShippingDate(getNextShippingDate(currentUser.createdAt))}</Text>
                </View>
                <View className="bg-blue-600 rounded-full px-4 py-2">
                  <Text className="text-white font-bold">{getDaysUntilShipping(currentUser.createdAt)} days</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Pending Approvals Card */}
          {pendingApprovals > 0 && (
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              className={`mx-5 ${hasSelectedPlan(currentUser?.subscription) && currentUser?.createdAt ? '' : '-mt-10'}`}
            >
              <Pressable
                onPress={handleApprovePress}
                className="bg-white rounded-2xl p-4 shadow-lg flex-row items-center border-l-4 border-amber-400"
              >
                <View className="w-12 h-12 rounded-full bg-amber-100 items-center justify-center mr-4">
                  <Clock size={24} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-lg">
                    {pendingApprovals} Task{pendingApprovals > 1 ? 's' : ''} Pending
                  </Text>
                  <Text className="text-gray-500 text-sm">Tap to review and approve</Text>
                </View>
                <ChevronRight size={24} color="#94A3B8" />
              </Pressable>
            </Animated.View>
          )}

          {/* Children Overview */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="mx-5 mt-6"
          >
            <Text className="text-gray-900 font-bold text-lg mb-3">Your Children</Text>

            {children.map((child, index) => {
              const childTasks = tasks.filter(
                (t) => t.childId === child.id && t.dueDate === today
              );
              const childCompleted = childTasks.filter(
                (t) => t.status === 'completed' || t.status === 'approved'
              ).length;
              const childApproved = childTasks.filter((t) => t.status === 'approved').length;
              const progress =
                childTasks.length > 0 ? (childApproved / childTasks.length) * 100 : 0;

              return (
                <Pressable
                  key={child.id}
                  onPress={() => handleChildPress(child.id)}
                  className="bg-white rounded-2xl p-4 mb-3 shadow-sm active:bg-gray-50"
                >
                  <View className="flex-row items-center mb-3">
                    <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center mr-3 overflow-hidden">
                      {child.avatar && (child.avatar.startsWith('http') || child.avatar.startsWith('data:') || child.avatar.startsWith('file:')) ? (
                        <Image
                          source={{ uri: child.avatar }}
                          style={{ width: 56, height: 56 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-2xl">
                          {child.age <= 7 ? '👶' : child.age <= 11 ? '🧒' : child.age <= 14 ? '👧' : '🧑'}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-bold text-lg">{child.name}</Text>
                      <Text className="text-gray-500 text-sm">Age {child.age} • Level {child.level}</Text>
                    </View>
                    <View className="items-end">
                      <View className="flex-row items-center">
                        <Flame size={16} color="#FF6B6B" />
                        <Text className="text-gray-900 font-semibold ml-1">{child.streakDays}</Text>
                      </View>
                      <Text className="text-gray-400 text-xs">day streak</Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View className="mb-3">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-500 text-sm">Today's Progress</Text>
                      <Text className="text-gray-700 font-medium text-sm">
                        {childApproved}/{childTasks.length} approved
                      </Text>
                    </View>
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </View>
                  </View>

                  {/* Quick Stats */}
                  <View className="flex-row">
                    <View className="flex-1 flex-row items-center">
                      <Star size={16} color="#FFD93D" />
                      <Text className="text-gray-600 ml-1 text-sm">{child.points} coins</Text>
                    </View>
                    <View className="flex-1 flex-row items-center">
                      <Mail size={16} color="#4A90E2" />
                      <Text className="text-gray-600 ml-1 text-sm">{Math.round(child.mailMeterProgress)}% to mail</Text>
                    </View>
                    <Pressable
                      onPress={() => handleSwitchToChild(child.id)}
                      className="bg-blue-500 px-3 py-1.5 rounded-lg active:bg-blue-600"
                    >
                      <Text className="text-white text-sm font-medium">Switch</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>

          {/* Posty's Tips */}
          <Animated.View
            entering={FadeInDown.delay(600).springify()}
            className="mx-5 mt-4"
          >
            <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <View className="flex-row items-start">
                <PostyAvatar size={40} />
                <View className="flex-1 ml-3">
                  <Text className="text-amber-800 font-bold mb-1">Posty's Tip</Text>
                  <Text className="text-amber-700 text-sm leading-5">
                    Kids who complete tasks consistently are more likely to develop
                    strong habits. Encourage them to keep their streak going!
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
