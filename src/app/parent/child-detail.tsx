// Child Detail Screen - View child progress and manage
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, TextInput, Alert, Image, ActionSheetIOS, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/lib/store';
import {
  ArrowLeft,
  Star,
  Flame,
  Mail,
  Trophy,
  Plus,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Sparkles,
  X,
  Edit3,
  Camera,
} from 'lucide-react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { AGE_GROUPS, getPointsMultiplier } from '@/lib/types';
import { supabaseService } from '@/lib/supabase-service';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function ChildDetailScreen() {
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId: string }>();

  const currentUser = useAppStore((s) => s.currentUser);
  const tasks = useAppStore((s) => s.tasks);
  const switchToChildMode = useAppStore((s) => s.switchToChildMode);
  const regenerateTasks = useAppStore((s) => s.regenerateTasks);
  const verifyPasscode = useAppStore((s) => s.verifyPasscode);
  const updateChild = useAppStore((s) => s.updateChild);
  const canRegenerateWithPoints = useAppStore((s) => s.canRegenerateWithPoints);
  const getAIRegenerationsToday = useAppStore((s) => s.getAIRegenerationsToday);

  // AI regeneration limits - regenerateTasks handles incrementing the counter internally
  const aiRegenerationsToday = childId ? getAIRegenerationsToday(childId) : 0;
  const canRegenWithPoints = childId ? canRegenerateWithPoints(childId) : false;
  const remainingRegenerations = 3 - aiRegenerationsToday;

  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Edit child info state
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingGender, setEditingGender] = useState<'boy' | 'girl'>('boy');

  const child = currentUser?.children.find((c) => c.id === childId);

  if (!child) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Child not found</Text>
      </View>
    );
  }

  const childTasks = tasks.filter((t) => t.childId === child.id);
  const today = new Date().toISOString().split('T')[0];
  const todaysTasks = childTasks.filter((t) => t.dueDate === today);
  const completedToday = todaysTasks.filter(
    (t) => t.status === 'completed' || t.status === 'approved'
  ).length;
  const approvedToday = todaysTasks.filter((t) => t.status === 'approved').length;
  const totalCompleted = childTasks.filter((t) => t.status === 'approved').length;

  const ageGroupInfo = AGE_GROUPS[child.ageGroup];
  const multiplier = getPointsMultiplier(child.totalPoints);

  const handleSwitchToChild = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    switchToChildMode(child.id);
    router.replace('/child/(tabs)');
  };

  const handleAddTask = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/parent/add-task', params: { childId: child.id } });
  };

  const handleRegenerateTasksPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPasscodeInput('');
    setPasscodeError(false);
    setShowPasscodeModal(true);
  };

  const handlePasscodeSubmit = () => {
    if (verifyPasscode(passcodeInput)) {
      setShowPasscodeModal(false);
      setIsRegenerating(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Calculate if this regeneration will earn points (before the counter is incremented by regenerateTasks)
      const newRemainingRegenerations = remainingRegenerations - 1;
      const willEarnPoints = remainingRegenerations > 0;

      // Simulate AI thinking time
      setTimeout(() => {
        // regenerateTasks now handles both task generation AND incrementing the counter
        regenerateTasks(child.id);
        setIsRegenerating(false);
        
        if (willEarnPoints) {
          Alert.alert(
            'Tasks Regenerated',
            `New tasks have been generated for ${child.name} using AI!${newRemainingRegenerations > 0 ? ` (${newRemainingRegenerations} more regeneration${newRemainingRegenerations !== 1 ? 's' : ''} with coins today)` : '\n\nNote: This was the last regeneration that awards coins today. Further regenerations today will not give coins.'}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Tasks Regenerated (No Coins)',
            `New tasks have been generated for ${child.name}, but Magic Coins will not be awarded for these tasks since the daily limit (3 regenerations with coins) has been reached.`,
            [{ text: 'OK' }]
          );
        }
      }, 1500);
    } else {
      setPasscodeError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleEditName = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingName(child?.name ?? '');
    setEditingGender(child?.gender ?? 'boy');
    setShowEditNameModal(true);
  };

  const handleSaveNameChange = () => {
    if (!editingName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a valid name.');
      return;
    }
    if (childId) {
      updateChild(childId, { name: editingName.trim(), gender: editingGender });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditNameModal(false);
    }
  };

  const handleChangePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const options = ['Take Photo', 'Choose from Library', 'Cancel'];
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) takePhoto();
          else if (buttonIndex === 1) pickImage();
        }
      );
    } else {
      Alert.alert('Change Photo', 'Choose an option', [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const uploadAndSetPhoto = async (localUri: string) => {
    if (!childId) return;
    
    const configured = await isSupabaseConfigured();
    if (configured) {
      const publicUrl = await supabaseService.uploadProfileImage('child', childId, localUri);
      if (publicUrl) {
        updateChild(childId, { avatar: publicUrl });
      } else {
        updateChild(childId, { avatar: localUri });
      }
    } else {
      updateChild(childId, { avatar: localUri });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0] && childId) {
      await uploadAndSetPhoto(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0] && childId) {
      await uploadAndSetPhoto(result.assets[0].uri);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Passcode Modal for AI Regeneration */}
      <Modal
        visible={showPasscodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasscodeModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <Animated.View
            entering={ZoomIn.springify()}
            className="bg-white rounded-3xl p-6 w-full max-w-sm"
          >
            <Pressable
              onPress={() => setShowPasscodeModal(false)}
              className="absolute top-4 right-4"
            >
              <X size={24} color="#94A3B8" />
            </Pressable>

            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-purple-100 items-center justify-center mb-3">
                <Sparkles size={32} color="#8B5CF6" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center">
                AI Task Regeneration
              </Text>
              <Text className="text-gray-500 text-center mt-2">
                Enter your parent passcode to regenerate {child?.name}'s tasks with AI
              </Text>
            </View>

            <View className="mb-4">
              <TextInput
                value={passcodeInput}
                onChangeText={(text) => {
                  setPasscodeInput(text.replace(/[^0-9]/g, '').slice(0, 4));
                  setPasscodeError(false);
                }}
                placeholder="Enter 4-digit passcode"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  textAlign: 'center',
                  fontSize: 24,
                  fontWeight: '700',
                  letterSpacing: 8,
                  color: '#111827',
                  borderWidth: passcodeError ? 2 : 1,
                  borderColor: passcodeError ? '#F87171' : '#E5E7EB',
                }}
              />
              {passcodeError && (
                <Text className="text-red-500 text-sm text-center mt-2">
                  Incorrect passcode. Please try again.
                </Text>
              )}
            </View>

            <Pressable
              onPress={handlePasscodeSubmit}
              disabled={passcodeInput.length < 4}
              style={{
                backgroundColor: passcodeInput.length === 4 ? '#8B5CF6' : '#E5E7EB',
                paddingVertical: 14,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontWeight: '700',
                  fontSize: 16,
                  color: passcodeInput.length === 4 ? 'white' : '#9CA3AF',
                }}
              >
                Regenerate Tasks
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <Animated.View
            entering={ZoomIn.springify()}
            className="bg-white rounded-3xl p-6 w-full max-w-sm"
          >
            <Pressable
              onPress={() => setShowEditNameModal(false)}
              className="absolute top-4 right-4 z-10"
            >
              <X size={24} color="#94A3B8" />
            </Pressable>

            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-3">
                <Edit3 size={32} color="#4A90E2" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center">
                Edit Child Info
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-2">Name</Text>
              <TextInput
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Enter name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                autoFocus
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

            {/* Gender Selection */}
            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-2">Gender</Text>
              <View className="flex-row">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditingGender('boy');
                  }}
                  className={`flex-1 mr-2 py-3 rounded-xl border-2 items-center ${
                    editingGender === 'boy'
                      ? 'bg-blue-50 border-blue-400'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className="text-2xl mb-1">👦</Text>
                  <Text className={`font-semibold text-sm ${
                    editingGender === 'boy' ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    Boy
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditingGender('girl');
                  }}
                  className={`flex-1 ml-2 py-3 rounded-xl border-2 items-center ${
                    editingGender === 'girl'
                      ? 'bg-pink-50 border-pink-400'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className="text-2xl mb-1">👧</Text>
                  <Text className={`font-semibold text-sm ${
                    editingGender === 'girl' ? 'text-pink-600' : 'text-gray-600'
                  }`}>
                    Girl
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleSaveNameChange}
              style={{
                backgroundColor: '#4A90E2',
                paddingVertical: 14,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontWeight: '700',
                  fontSize: 16,
                  color: 'white',
                }}
              >
                Save Changes
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* Regenerating Overlay */}
      {isRegenerating && (
        <View className="absolute inset-0 bg-black/40 z-50 items-center justify-center">
          <View className="bg-white rounded-2xl p-6 items-center">
            <Animated.View
              entering={ZoomIn.springify()}
              className="w-16 h-16 rounded-full bg-purple-100 items-center justify-center mb-3"
            >
              <Sparkles size={32} color="#8B5CF6" />
            </Animated.View>
            <Text className="text-lg font-bold text-gray-900">Generating new tasks...</Text>
            <Text className="text-gray-500 text-sm mt-1">AI is creating fun activities</Text>
          </View>
        </View>
      )}

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
            <Text className="text-xl font-bold text-gray-900">{child.name}</Text>
            <Text className="text-gray-500 text-sm">
              Age {child.age} • {ageGroupInfo.label}
            </Text>
          </View>
          <Pressable
            onPress={handleSwitchToChild}
            className="bg-blue-500 px-4 py-2 rounded-lg active:bg-blue-600"
          >
            <Text className="text-white font-semibold">Switch</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm items-center"
          >
            {/* Edit button */}
            <Pressable
              onPress={handleEditName}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Edit3 size={16} color="#64748B" />
            </Pressable>

            <Pressable onPress={handleChangePhoto} className="relative">
              <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center mb-3 border-4 border-blue-200 overflow-hidden">
                {child.avatar ? (
                  <Image
                    source={{ uri: child.avatar }}
                    style={{ width: 96, height: 96 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-5xl">
                    {child.age <= 7 ? '👶' : child.age <= 11 ? '🧒' : child.age <= 14 ? '👧' : '🧑'}
                  </Text>
                )}
              </View>
              <View className="absolute bottom-2 right-0 w-8 h-8 rounded-full bg-blue-500 items-center justify-center border-2 border-white">
                <Camera size={16} color="white" />
              </View>
            </Pressable>
            <Pressable onPress={handleEditName} className="active:opacity-70">
              <Text className="text-2xl font-bold text-gray-900 mb-1">{child.name}</Text>
            </Pressable>
            <View className="flex-row items-center">
              <View className="bg-blue-100 px-3 py-1 rounded-full mr-2">
                <Text className="text-blue-700 font-medium">Level {child.level}</Text>
              </View>
              {multiplier > 1 && (
                <View className="bg-amber-100 px-3 py-1 rounded-full">
                  <Text className="text-amber-700 font-medium">{multiplier}x Coins</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Stats Grid */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="flex-row flex-wrap -mx-1.5 mb-4"
          >
            <View className="w-1/2 px-1.5 mb-3">
              <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <View className="flex-row items-center mb-1">
                  <Star size={20} color="#F59E0B" />
                  <Text className="text-2xl font-bold text-amber-800 ml-2">{child.points}</Text>
                </View>
                <Text className="text-amber-600 text-sm">Magic Coins</Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <View className="bg-red-50 rounded-2xl p-4 border border-red-100">
                <View className="flex-row items-center mb-1">
                  <Flame size={20} color="#EF4444" />
                  <Text className="text-2xl font-bold text-red-800 ml-2">{child.streakDays}</Text>
                </View>
                <Text className="text-red-600 text-sm">Day Streak</Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5">
              <View className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <View className="flex-row items-center mb-1">
                  <Mail size={20} color="#4A90E2" />
                  <Text className="text-2xl font-bold text-blue-800 ml-2">{Math.round(child.mailMeterProgress)}%</Text>
                </View>
                <Text className="text-blue-600 text-sm">Mail Progress</Text>
              </View>
            </View>
            <View className="w-1/2 px-1.5">
              <View className="bg-green-50 rounded-2xl p-4 border border-green-100">
                <View className="flex-row items-center mb-1">
                  <Trophy size={20} color="#22C55E" />
                  <Text className="text-2xl font-bold text-green-800 ml-2">{totalCompleted}</Text>
                </View>
                <Text className="text-green-600 text-sm">Total Completed</Text>
              </View>
            </View>
          </Animated.View>

          {/* Today's Progress */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm"
          >
            <Text className="text-lg font-bold text-gray-900 mb-3">Today's Progress</Text>
            <View className="mb-3">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500">Completed</Text>
                <Text className="text-gray-700 font-medium">
                  {completedToday}/{todaysTasks.length} tasks
                </Text>
              </View>
              <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <View
                  className="h-full bg-amber-400 rounded-full"
                  style={{
                    width: `${todaysTasks.length > 0 ? (completedToday / todaysTasks.length) * 100 : 0}%`,
                  }}
                />
              </View>
            </View>
            <View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500">Approved</Text>
                <Text className="text-gray-700 font-medium">
                  {approvedToday}/{todaysTasks.length} tasks
                </Text>
              </View>
              <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <View
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${todaysTasks.length > 0 ? (approvedToday / todaysTasks.length) * 100 : 0}%`,
                  }}
                />
              </View>
            </View>
          </Animated.View>

          {/* Add Custom Task */}
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <Pressable
              onPress={handleAddTask}
              className="bg-white rounded-2xl p-4 shadow-sm flex-row items-center active:bg-gray-50"
            >
              <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-4">
                <Plus size={24} color="#4A90E2" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Add Custom Task</Text>
                <Text className="text-gray-500 text-sm">Create a personalized task</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </Pressable>
          </Animated.View>

          {/* AI Regenerate Tasks Button */}
          <Animated.View entering={FadeInDown.delay(450).springify()} className="mt-3">
            <Pressable
              onPress={handleRegenerateTasksPress}
              className="bg-gradient-to-r rounded-2xl p-4 shadow-sm flex-row items-center active:opacity-90"
              style={{ backgroundColor: canRegenWithPoints ? '#8B5CF6' : '#9CA3AF' }}
            >
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-4">
                <Sparkles size={24} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">AI Regenerate Tasks</Text>
                <Text className="text-white/70 text-sm">
                  {canRegenWithPoints 
                    ? `${remainingRegenerations} regeneration${remainingRegenerations !== 1 ? 's' : ''} with coins left today`
                    : 'No more coins available today - tasks will still generate'
                  }
                </Text>
              </View>
              <RefreshCw size={20} color="white" />
            </Pressable>
          </Animated.View>

          {/* Badges */}
          {child.badges.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(500).springify()}
              className="mt-4"
            >
              <Text className="text-lg font-bold text-gray-900 mb-3">Badges Earned</Text>
              <View className="bg-white rounded-2xl p-4 shadow-sm">
                <View className="flex-row flex-wrap">
                  {child.badges.map((badge) => (
                    <View key={badge.id} className="items-center mr-4 mb-3">
                      <Text className="text-3xl mb-1">{badge.icon}</Text>
                      <Text className="text-xs text-gray-600">{badge.name}</Text>
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
