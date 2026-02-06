// Add Custom Task Screen
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/lib/store';
import {
  ArrowLeft,
  Star,
  FileText,
  Target,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function AddTaskScreen() {
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const currentUser = useAppStore((s) => s.currentUser);
  const addCustomTask = useAppStore((s) => s.addCustomTask);
  const canAddCustomTask = useAppStore((s) => s.canAddCustomTask);
  const getCustomTasksToday = useAppStore((s) => s.getCustomTasksToday);

  const child = currentUser?.children.find((c) => c.id === childId);
  const customTasksToday = childId ? getCustomTasksToday(childId) : 0;
  const canAddWithPoints = childId ? canAddCustomTask(childId) : false;
  const remainingWithPoints = Math.max(0, 5 - customTasksToday);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('15');

  const handleAddTask = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a task title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please enter a task description');
      return;
    }
    const pointsNum = parseInt(points, 10);
    if (isNaN(pointsNum) || pointsNum < 5 || pointsNum > 100) {
      Alert.alert('Invalid Points', 'Points must be between 5 and 100');
      return;
    }

    if (!childId) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Task will be added - points will be 0 if over the daily limit
    const willHavePoints = canAddWithPoints;
    addCustomTask(childId, title.trim(), description.trim(), pointsNum);

    if (willHavePoints) {
      const newRemaining = remainingWithPoints - 1;
      Alert.alert(
        'Task Added',
        `"${title}" has been added to ${child?.name ?? 'your child'}'s tasks with ${pointsNum} Magic Coins.${newRemaining > 0 ? ` (${newRemaining} more task${newRemaining !== 1 ? 's' : ''} with coins today)` : '\n\nNote: You\'ve used all 5 tasks with coins for today. You can still add more tasks, but they won\'t award coins.'}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        'Task Added (No Coins)',
        `"${title}" has been added to ${child?.name ?? 'your child'}'s tasks, but it won't award Magic Coins since you've already added 5 custom tasks with coins today.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const pointOptions = [5, 10, 15, 20, 25, 30, 50];

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
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">Add Task</Text>
            <Text className="text-gray-500 text-sm">For {child?.name ?? 'your child'}</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            {/* Task Title */}
            <View className="mb-5">
              <Text className="text-gray-700 font-medium mb-2">Task Title</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Target size={18} color="#64748B" />
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Practice Piano"
                  placeholderTextColor="#94A3B8"
                  style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                  autoCapitalize="sentences"
                />
              </View>
            </View>

            {/* Task Description */}
            <View className="mb-5">
              <Text className="text-gray-700 font-medium mb-2">Description</Text>
              <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <View className="flex-row items-start">
                  <FileText size={18} color="#64748B" style={{ marginTop: 2 }} />
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe what needs to be done..."
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827', minHeight: 80, textAlignVertical: 'top' }}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </View>

            {/* Magic Coins Selection */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Magic Coins Reward</Text>
              <View className="flex-row flex-wrap -mx-1">
                {pointOptions.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPoints(p.toString())}
                    className={`px-4 py-2 rounded-full m-1 ${
                      points === p.toString()
                        ? 'bg-amber-400'
                        : 'bg-gray-100'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <Star size={14} color={points === p.toString() ? '#1F2937' : '#64748B'} />
                      <Text
                        className={`ml-1 font-semibold ${
                          points === p.toString() ? 'text-gray-900' : 'text-gray-600'
                        }`}
                      >
                        {p}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row items-center mt-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Star size={18} color="#64748B" />
                <TextInput
                  value={points}
                  onChangeText={(text) => setPoints(text.replace(/[^0-9]/g, ''))}
                  placeholder="Custom points (5-100)"
                  placeholderTextColor="#94A3B8"
                  style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>

            <Pressable
              onPress={handleAddTask}
              className={`py-4 rounded-xl ${canAddWithPoints ? 'bg-blue-500 active:bg-blue-600' : 'bg-amber-500 active:bg-amber-600'}`}
            >
              <Text className="text-center font-bold text-lg text-white">
                {canAddWithPoints ? 'Add Task' : 'Add Task (No Points)'}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Daily Limit Notice */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className={`rounded-2xl p-4 mt-4 border ${canAddWithPoints ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}
          >
            <Text className={`font-bold mb-1 ${canAddWithPoints ? 'text-blue-800' : 'text-amber-800'}`}>
              {canAddWithPoints ? 'Daily Coins Limit' : 'Coins Limit Reached'}
            </Text>
            <Text className={`text-sm ${canAddWithPoints ? 'text-blue-700' : 'text-amber-700'}`}>
              {canAddWithPoints 
                ? `You can add ${remainingWithPoints} more custom task${remainingWithPoints !== 1 ? 's' : ''} with coins today for ${child?.name ?? 'this child'}. After that, you can still add tasks but they won't earn coins.`
                : `You've used all 5 custom tasks with coins today for ${child?.name ?? 'this child'}. You can still add more tasks, but they won't award coins.`}
            </Text>
          </Animated.View>

          {/* Tips */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="bg-amber-50 rounded-2xl p-4 mt-4 border border-amber-100"
          >
            <Text className="text-amber-800 font-bold mb-2">Tips for Custom Tasks</Text>
            <Text className="text-amber-700 text-sm leading-5">
              • Keep tasks age-appropriate{'\n'}
              • Be specific about what needs to be done{'\n'}
              • Set fair point values based on difficulty{'\n'}
              • Make tasks achievable in one day
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
