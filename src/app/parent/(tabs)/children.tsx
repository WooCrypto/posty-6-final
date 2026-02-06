// Parent Children Tab - Manage children profiles
import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import {
  Plus,
  ChevronRight,
  Star,
  Mail,
  Flame,
  Trophy,
  X,
  Crown,
  Trash2,
  Lock,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AGE_GROUPS, getPointsMultiplier } from '@/lib/types';
import { canAddChild, getChildLimitMessage, getSubscriptionLimits } from '@/lib/subscriptionLimits';
import { UpgradePrompt } from '@/components/UpgradePrompt';

export default function ParentChildrenScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const addChild = useAppStore((s) => s.addChild);
  const removeChild = useAppStore((s) => s.removeChild);
  const verifyPasscode = useAppStore((s) => s.verifyPasscode);
  const children = currentUser?.children ?? [];
  const tasks = useAppStore((s) => s.tasks);
  const subscription = currentUser?.subscription;

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');
  const [newChildGender, setNewChildGender] = useState<'boy' | 'girl'>('boy');

  // Passcode modal state
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState(['', '', '', '']);
  const [passcodeError, setPasscodeError] = useState(false);
  const [childToDelete, setChildToDelete] = useState<{ id: string; name: string } | null>(null);
  const passcodeInputRefs = useRef<(TextInput | null)[]>([]);

  const limits = getSubscriptionLimits(subscription);

  const handleChildPress = (childId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/parent/child-detail', params: { childId } });
  };

  const handleDeleteChild = (childId: string, childName: string) => {
    // Don't allow deleting if this is the last child
    if (children.length <= 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Cannot Delete',
        'You must have at least one child in your account. You cannot delete the last remaining child.',
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Show passcode modal instead of direct deletion
    setChildToDelete({ id: childId, name: childName });
    setPasscode(['', '', '', '']);
    setPasscodeError(false);
    setShowPasscodeModal(true);
    setTimeout(() => passcodeInputRefs.current[0]?.focus(), 100);
  };

  const handlePasscodeChange = (value: string, index: number) => {
    if (value.length > 1) return;

    const newPasscode = [...passcode];
    newPasscode[index] = value;
    setPasscode(newPasscode);
    setPasscodeError(false);

    // Move to next input if value entered
    if (value && index < 3) {
      passcodeInputRefs.current[index + 1]?.focus();
    }

    // Check passcode when all 4 digits entered
    if (index === 3 && value) {
      const fullPasscode = newPasscode.join('');
      if (verifyPasscode(fullPasscode)) {
        // Passcode correct, proceed with deletion
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowPasscodeModal(false);

        if (childToDelete) {
          Alert.alert(
            'Delete Child',
            `Are you sure you want to remove ${childToDelete.name} from your account? This will permanently delete all their points, tasks, and progress.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  removeChild(childToDelete.id);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Child Removed', `${childToDelete.name} has been removed from your account.`);
                  setChildToDelete(null);
                },
              },
            ],
          );
        }
      } else {
        // Passcode incorrect
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPasscodeError(true);
        setPasscode(['', '', '', '']);
        passcodeInputRefs.current[0]?.focus();
      }
    }
  };

  const handlePasscodeKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !passcode[index] && index > 0) {
      passcodeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleAddChild = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if user can add more children
    if (!canAddChild(subscription, children.length)) {
      // Show upgrade prompt
      setShowUpgradePrompt(true);
      return;
    }

    // Show add child modal
    setShowAddChildModal(true);
  };

  const handleConfirmAddChild = () => {
    if (!newChildName.trim()) {
      Alert.alert('Name Required', 'Please enter your child\'s name.');
      return;
    }

    const age = parseInt(newChildAge);
    if (isNaN(age) || age < 5 || age > 17) {
      Alert.alert('Invalid Age', 'Please enter an age between 5 and 17.');
      return;
    }

    // Double-check child limit before adding (defense in depth)
    if (!canAddChild(subscription, children.length)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShowAddChildModal(false);
      setShowUpgradePrompt(true);
      return;
    }

    const childId = addChild(newChildName.trim(), age, newChildGender);
    
    // Check if child was actually added (store returns empty string if limit reached)
    if (!childId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShowAddChildModal(false);
      setShowUpgradePrompt(true);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Reset and close modal
    setNewChildName('');
    setNewChildAge('');
    setNewChildGender('boy');
    setShowAddChildModal(false);

    Alert.alert(
      'Child Added!',
      `${newChildName.trim()} has been added to your family. They're ready to start earning rewards!`,
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View className="px-5 py-4 bg-white border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Children</Text>
              <Text className="text-gray-500 text-sm mt-1">
                {children.length} {children.length === 1 ? 'child' : 'children'} enrolled
              </Text>
            </View>
            {/* Plan indicator */}
            <View className="bg-blue-50 px-3 py-1.5 rounded-full">
              <Text className="text-blue-700 text-xs font-medium">
                {getChildLimitMessage(subscription)}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={true}
        >
          {children.map((child, index) => {
            const childTasks = tasks.filter((t) => t.childId === child.id);
            const completedTasks = childTasks.filter(
              (t) => t.status === 'approved'
            ).length;
            const ageGroupInfo = AGE_GROUPS[child.ageGroup];
            const multiplier = getPointsMultiplier(child.totalPoints);

            return (
              <Animated.View
                key={child.id}
                entering={FadeInDown.delay(index * 100).springify()}
              >
                <Pressable
                  onPress={() => handleChildPress(child.id)}
                  className="bg-white rounded-2xl p-5 mb-4 shadow-sm active:bg-gray-50"
                >
                  {/* Child Header */}
                  <View className="flex-row items-center mb-4">
                    <View className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 items-center justify-center mr-4 border-2 border-blue-300">
                      <Text className="text-3xl">
                        {child.age <= 7 ? '👶' : child.age <= 11 ? '🧒' : child.age <= 14 ? '👧' : '🧑'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-bold text-gray-900">{child.name}</Text>
                      <Text className="text-gray-500 text-sm">
                        Age {child.age} • {ageGroupInfo.label}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <View className="bg-blue-100 px-2 py-0.5 rounded-full">
                          <Text className="text-blue-700 text-xs font-medium">
                            Level {child.level}
                          </Text>
                        </View>
                        {multiplier > 1 && (
                          <View className="bg-amber-100 px-2 py-0.5 rounded-full ml-2">
                            <Text className="text-amber-700 text-xs font-medium">
                              {multiplier}x Points
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      {/* Delete button - always show, passcode check happens on press */}
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteChild(child.id, child.name);
                        }}
                        className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-2 active:bg-red-100"
                      >
                        <Trash2 size={20} color="#EF4444" />
                      </Pressable>
                      <ChevronRight size={24} color="#94A3B8" />
                    </View>
                  </View>

                  {/* Stats Grid */}
                  <View className="flex-row flex-wrap -mx-1">
                    <View className="w-1/2 px-1 mb-2">
                      <View className="bg-amber-50 rounded-xl p-3">
                        <View className="flex-row items-center">
                          <Star size={18} color="#F59E0B" />
                          <Text className="text-amber-800 font-bold ml-2">{child.points}</Text>
                        </View>
                        <Text className="text-amber-600 text-xs mt-1">Current Points</Text>
                      </View>
                    </View>
                    <View className="w-1/2 px-1 mb-2">
                      <View className="bg-red-50 rounded-xl p-3">
                        <View className="flex-row items-center">
                          <Flame size={18} color="#EF4444" />
                          <Text className="text-red-800 font-bold ml-2">{child.streakDays}</Text>
                        </View>
                        <Text className="text-red-600 text-xs mt-1">Day Streak</Text>
                      </View>
                    </View>
                    <View className="w-1/2 px-1">
                      <View className="bg-blue-50 rounded-xl p-3">
                        <View className="flex-row items-center">
                          <Mail size={18} color="#4A90E2" />
                          <Text className="text-blue-800 font-bold ml-2">{Math.round(child.mailMeterProgress)}%</Text>
                        </View>
                        <Text className="text-blue-600 text-xs mt-1">Mail Progress</Text>
                      </View>
                    </View>
                    <View className="w-1/2 px-1">
                      <View className="bg-green-50 rounded-xl p-3">
                        <View className="flex-row items-center">
                          <Trophy size={18} color="#22C55E" />
                          <Text className="text-green-800 font-bold ml-2">{completedTasks}</Text>
                        </View>
                        <Text className="text-green-600 text-xs mt-1">Tasks Completed</Text>
                      </View>
                    </View>
                  </View>

                  {/* Badges */}
                  {child.badges.length > 0 && (
                    <View className="mt-3 pt-3 border-t border-gray-100">
                      <Text className="text-gray-500 text-xs mb-2">Recent Badges</Text>
                      <View className="flex-row">
                        {child.badges.slice(0, 5).map((badge) => (
                          <View key={badge.id} className="mr-2">
                            <Text className="text-xl">{badge.icon}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}

          {/* Add Child Button */}
          <Animated.View entering={FadeInDown.delay(children.length * 100).springify()}>
            <Pressable
              onPress={handleAddChild}
              className={`flex-row items-center justify-center rounded-2xl p-4 border-2 border-dashed active:opacity-80 ${
                canAddChild(subscription, children.length)
                  ? 'bg-white border-gray-300'
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              {canAddChild(subscription, children.length) ? (
                <>
                  <Plus size={24} color="#64748B" />
                  <Text className="text-gray-600 font-semibold ml-2">Add Another Child</Text>
                </>
              ) : (
                <>
                  <Crown size={24} color="#F59E0B" />
                  <Text className="text-amber-700 font-semibold ml-2">Upgrade to Add More Children</Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* Limit info */}
          {!canAddChild(subscription, children.length) && (
            <Animated.View entering={FadeInDown.delay((children.length + 1) * 100).springify()}>
              <Text className="text-gray-400 text-center text-sm mt-3">
                Your current plan allows {getChildLimitMessage(subscription)}.
                Upgrade to add more!
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        reason="child_limit"
        currentChildCount={children.length}
      />

      {/* Add Child Modal */}
      <Modal 
        visible={showAddChildModal} 
        animationType="slide" 
        {...(Platform.OS === 'ios' ? { presentationStyle: 'pageSheet' as const } : {})}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <Pressable
              onPress={() => {
                setShowAddChildModal(false);
                setNewChildName('');
                setNewChildAge('');
                setNewChildGender('boy');
              }}
              className="p-2"
            >
              <X size={24} color="#6B7280" />
            </Pressable>
            <Text className="text-lg font-bold text-gray-900">Add Child</Text>
            <View className="w-10" />
          </View>

          <View className="flex-1 px-6 pt-6">
            <Text className="text-gray-600 mb-6 text-center">
              Add your child to start their rewarding journey!
            </Text>

            {/* Name Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Child's Name</Text>
              <TextInput
                value={newChildName}
                onChangeText={setNewChildName}
                placeholder="Enter name"
                placeholderTextColor="#9CA3AF"
                style={{ backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#111827', fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB' }}
                autoCapitalize="words"
              />
            </View>

            {/* Age Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Age (5-17)</Text>
              <TextInput
                value={newChildAge}
                onChangeText={(text) => setNewChildAge(text.replace(/[^0-9]/g, ''))}
                placeholder="Enter age"
                placeholderTextColor="#9CA3AF"
                style={{ backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#111827', fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB' }}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            {/* Gender Selection */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Gender</Text>
              <View className="flex-row">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setNewChildGender('boy');
                  }}
                  className={`flex-1 mr-2 py-4 rounded-xl border-2 items-center ${
                    newChildGender === 'boy'
                      ? 'bg-blue-50 border-blue-400'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className="text-3xl mb-1">👦</Text>
                  <Text className={`font-semibold ${
                    newChildGender === 'boy' ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    Boy
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setNewChildGender('girl');
                  }}
                  className={`flex-1 ml-2 py-4 rounded-xl border-2 items-center ${
                    newChildGender === 'girl'
                      ? 'bg-pink-50 border-pink-400'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className="text-3xl mb-1">👧</Text>
                  <Text className={`font-semibold ${
                    newChildGender === 'girl' ? 'text-pink-600' : 'text-gray-600'
                  }`}>
                    Girl
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Confirm Button */}
            <Pressable
              onPress={handleConfirmAddChild}
              className="bg-blue-500 py-4 rounded-2xl items-center active:bg-blue-600"
            >
              <Text className="text-white font-bold text-lg">Add Child</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Passcode Verification Modal */}
      <Modal visible={showPasscodeModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            {/* Header */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
                <Lock size={32} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center">Enter Passcode</Text>
              <Text className="text-gray-500 text-center mt-2">
                Enter your 4-digit passcode to delete {childToDelete?.name}
              </Text>
            </View>

            {/* Passcode Input */}
            <View className="flex-row justify-center mb-6">
              {[0, 1, 2, 3].map((index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { passcodeInputRefs.current[index] = ref; }}
                  value={passcode[index]}
                  onChangeText={(value) => handlePasscodeChange(value, index)}
                  onKeyPress={(e) => handlePasscodeKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  secureTextEntry
                  style={{
                    width: 56,
                    height: 56,
                    marginHorizontal: 8,
                    textAlign: 'center',
                    fontSize: 24,
                    fontWeight: '700',
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: passcodeError ? '#EF4444' : '#E5E7EB',
                    backgroundColor: passcodeError ? '#FEF2F2' : '#F9FAFB',
                    color: '#1F2937',
                  }}
                />
              ))}
            </View>

            {/* Error Message */}
            {passcodeError && (
              <Text className="text-red-500 text-center text-sm mb-4">
                Incorrect passcode. Please try again.
              </Text>
            )}

            {/* Cancel Button */}
            <Pressable
              onPress={() => {
                setShowPasscodeModal(false);
                setChildToDelete(null);
                setPasscode(['', '', '', '']);
                setPasscodeError(false);
              }}
              className="py-3 rounded-xl items-center"
            >
              <Text className="text-gray-600 font-semibold">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
