// Parent Activity Tab - Recent activity feed with Today/History toggle
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/lib/store';
import {
  CheckCircle2,
  Clock,
  Star,
  Mail,
  Flame,
  Trophy,
  History,
  Calendar,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import * as Haptics from 'expo-haptics';

interface ActivityItem {
  id: string;
  type: 'task_completed' | 'task_approved' | 'streak' | 'mail_unlocked' | 'badge';
  childName: string;
  title: string;
  description: string;
  timestamp: string;
}

export default function ParentActivityScreen() {
  const [showHistory, setShowHistory] = useState(false);
  const currentUser = useAppStore((s) => s.currentUser);
  const children = currentUser?.children ?? [];
  const tasks = useAppStore((s) => s.tasks);

  const todayStart = startOfDay(new Date());

  // Generate activity items from tasks and children data
  const allActivityItems: ActivityItem[] = [];

  // Add completed and approved tasks as activity
  tasks
    .filter((t) => t.completedAt || t.approvedAt)
    .sort((a, b) => {
      const dateA = a.approvedAt || a.completedAt || '';
      const dateB = b.approvedAt || b.completedAt || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .forEach((task) => {
      const child = children.find((c) => c.id === task.childId);
      if (!child) return;

      if (task.status === 'approved' && task.approvedAt) {
        allActivityItems.push({
          id: `approved-${task.id}`,
          type: 'task_approved',
          childName: child.name,
          title: 'Task Approved',
          description: task.title,
          timestamp: task.approvedAt,
        });
      } else if (task.status === 'completed' && task.completedAt) {
        allActivityItems.push({
          id: `completed-${task.id}`,
          type: 'task_completed',
          childName: child.name,
          title: 'Task Completed',
          description: task.title,
          timestamp: task.completedAt,
        });
      }
    });

  // Add streak achievements
  children.forEach((child) => {
    if (child.streakDays >= 3) {
      allActivityItems.push({
        id: `streak-${child.id}`,
        type: 'streak',
        childName: child.name,
        title: `${child.streakDays} Day Streak!`,
        description: 'Keep up the great work!',
        timestamp: child.lastCompletedDate || new Date().toISOString(),
      });
    }
  });

  // Sort by timestamp
  allActivityItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Filter based on toggle
  const activityItems = showHistory 
    ? allActivityItems.slice(0, 50) // Show up to 50 history items
    : allActivityItems.filter(item => new Date(item.timestamp) >= todayStart);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'task_completed':
        return <Clock size={20} color="#F59E0B" />;
      case 'task_approved':
        return <CheckCircle2 size={20} color="#22C55E" />;
      case 'streak':
        return <Flame size={20} color="#EF4444" />;
      case 'mail_unlocked':
        return <Mail size={20} color="#4A90E2" />;
      case 'badge':
        return <Trophy size={20} color="#A78BFA" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'task_completed':
        return 'bg-amber-100';
      case 'task_approved':
        return 'bg-green-100';
      case 'streak':
        return 'bg-red-100';
      case 'mail_unlocked':
        return 'bg-blue-100';
      case 'badge':
        return 'bg-purple-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, "'Today at' h:mm a");
    } else if (isYesterday(date)) {
      return format(date, "'Yesterday at' h:mm a");
    }
    return format(date, "MMM d 'at' h:mm a");
  };

  const handleToggle = (history: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowHistory(history);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View className="px-5 py-4 bg-white border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">Activity</Text>
          <Text className="text-gray-500 text-sm mt-1">Recent updates from your children</Text>
          
          {/* Toggle Switch */}
          <View className="flex-row bg-gray-100 rounded-xl p-1 mt-3">
            <Pressable
              onPress={() => handleToggle(false)}
              className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${!showHistory ? 'bg-white shadow-sm' : ''}`}
            >
              <Calendar size={16} color={!showHistory ? '#4A90E2' : '#9CA3AF'} />
              <Text className={`ml-2 font-medium ${!showHistory ? 'text-blue-600' : 'text-gray-500'}`}>
                Today
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleToggle(true)}
              className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${showHistory ? 'bg-white shadow-sm' : ''}`}
            >
              <History size={16} color={showHistory ? '#4A90E2' : '#9CA3AF'} />
              <Text className={`ml-2 font-medium ${showHistory ? 'text-blue-600' : 'text-gray-500'}`}>
                History
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {activityItems.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-6xl mb-4">{showHistory ? '📚' : '📭'}</Text>
              <Text className="text-gray-500 text-center">
                {showHistory ? 'No activity history yet' : 'No activity today'}
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-1">
                {showHistory 
                  ? 'Activity will build up as your children complete tasks'
                  : 'Check back later as your children complete tasks today'}
              </Text>
            </View>
          ) : (
            activityItems.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 50).springify()}
                className="flex-row mb-4"
              >
                {/* Timeline line */}
                <View className="items-center mr-3">
                  <View className={`w-10 h-10 rounded-full ${getActivityColor(item.type)} items-center justify-center`}>
                    {getActivityIcon(item.type)}
                  </View>
                  {index < activityItems.length - 1 && (
                    <View className="w-0.5 flex-1 bg-gray-200 my-1" />
                  )}
                </View>

                {/* Content */}
                <View className="flex-1 bg-white rounded-xl p-3 shadow-sm">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-gray-900 font-semibold">{item.title}</Text>
                    <Text className="text-gray-400 text-xs">{formatTimestamp(item.timestamp)}</Text>
                  </View>
                  <Text className="text-gray-600 text-sm">{item.description}</Text>
                  <Text className="text-blue-500 text-xs mt-1 font-medium">{item.childName}</Text>
                </View>
              </Animated.View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
