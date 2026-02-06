// Approve Tasks Screen - Parent reviews completed tasks with passcode verification
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { PostyMascot } from '@/components/PostyMascot';
import {
  ArrowLeft,
  Check,
  X,
  Star,
  Clock,
  Lock,
  Delete,
  Camera,
  Timer,
  Sparkles,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeOutRight, Layout, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getPointsMultiplier, Task } from '@/lib/types';

export default function ApproveTasksScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const children = currentUser?.children ?? [];
  const tasks = useAppStore((s) => s.tasks);
  const approveTask = useAppStore((s) => s.approveTask);
  const rejectTask = useAppStore((s) => s.rejectTask);
  const verifyPasscode = useAppStore((s) => s.verifyPasscode);

  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [pendingApprovalTaskId, setPendingApprovalTaskId] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isApproveAllMode, setIsApproveAllMode] = useState(false);
  const shakeX = useSharedValue(0);

  // Get all tasks pending approval (completed but not approved)
  const pendingTasks = tasks.filter((t) => t.status === 'completed');

  const handleApprovePress = (taskId: string) => {
    setPendingApprovalTaskId(taskId);
    setIsApproveAllMode(false);
    setShowPasscodeModal(true);
    setPasscode('');
  };

  const handleApproveAllPress = () => {
    if (pendingTasks.length === 0) return;
    setIsApproveAllMode(true);
    setPendingApprovalTaskId(null);
    setShowPasscodeModal(true);
    setPasscode('');
  };

  const handleNumberPress = (num: string) => {
    if (passcode.length < 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newPasscode = passcode + num;
      setPasscode(newPasscode);

      if (newPasscode.length === 4) {
        setTimeout(() => handlePasscodeSubmit(newPasscode), 100);
      }
    }
  };

  const handleDeletePress = () => {
    if (passcode.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPasscode(passcode.slice(0, -1));
    }
  };

  const handlePasscodeSubmit = (code: string) => {
    if (verifyPasscode(code)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPasscodeModal(false);
      
      if (isApproveAllMode) {
        // Approve all pending tasks
        pendingTasks.forEach((task) => {
          approveTask(task.id);
        });
        setIsApproveAllMode(false);
      } else if (pendingApprovalTaskId) {
        approveTask(pendingApprovalTaskId);
        setPendingApprovalTaskId(null);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      setPasscode('');
    }
  };

  const handleReject = (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Reject Task',
      'Are you sure? The child will need to redo this task.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => rejectTask(taskId),
        },
      ]
    );
  };

  const handleViewProof = (task: Task) => {
    setSelectedTask(task);
    setShowProofModal(true);
  };

  const getChildName = (childId: string) => {
    return children.find((c) => c.id === childId)?.name ?? 'Unknown';
  };

  const getChildMultiplier = (childId: string) => {
    const child = children.find((c) => c.id === childId);
    return child ? getPointsMultiplier(child.totalPoints) : 1;
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const renderDot = (index: number) => {
    const isFilled = passcode.length > index;
    return (
      <View
        key={index}
        className={`w-4 h-4 rounded-full mx-2 ${
          isFilled ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      />
    );
  };

  const renderKeypadButton = (value: string) => (
    <Pressable
      onPress={() => handleNumberPress(value)}
      className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center m-1 active:bg-gray-200"
    >
      <Text className="text-2xl font-semibold text-gray-900">{value}</Text>
    </Pressable>
  );

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
            <Text className="text-xl font-bold text-gray-900">Approve Tasks</Text>
            <Text className="text-gray-500 text-sm">
              {pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''} pending
            </Text>
          </View>
          <View className="flex-row items-center bg-amber-100 px-3 py-1 rounded-full">
            <Lock size={14} color="#F59E0B" />
            <Text className="text-amber-700 font-medium text-sm ml-1">PIN Required</Text>
          </View>
        </View>

        {/* Approve All Button - Only show when there are pending tasks */}
        {pendingTasks.length > 1 && (
          <Pressable
            onPress={handleApproveAllPress}
            className="mx-5 mt-4 bg-green-500 py-3 rounded-xl flex-row items-center justify-center active:bg-green-600"
          >
            <Check size={20} color="white" />
            <Text className="text-white font-bold text-base ml-2">
              Approve All {pendingTasks.length} Tasks
            </Text>
            <Lock size={14} color="white" className="ml-2" />
          </Pressable>
        )}

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {pendingTasks.length === 0 ? (
            <View className="items-center py-16">
              <PostyMascot size="large" mood="happy" animate />
              <Text className="text-xl font-bold text-gray-900 mt-6">All caught up!</Text>
              <Text className="text-gray-500 text-center mt-2">
                No tasks waiting for approval.{'\n'}Check back later!
              </Text>
            </View>
          ) : (
            pendingTasks.map((task, index) => {
              const multiplier = getChildMultiplier(task.childId);
              const actualPoints = task.points * multiplier;
              const hasProof = task.proofPhotoUri || task.proofTimerSeconds;
              const hasAIVerification = task.aiVerificationResult;

              return (
                <Animated.View
                  key={task.id}
                  entering={FadeInDown.delay(index * 100).springify()}
                  exiting={FadeOutRight.duration(300)}
                  layout={Layout.springify()}
                  className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
                >
                  {/* Task Header */}
                  <View className="flex-row items-start mb-3">
                    <View className="w-12 h-12 rounded-full bg-amber-100 items-center justify-center mr-3">
                      <Clock size={24} color="#F59E0B" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-gray-900">{task.title}</Text>
                      <Text className="text-blue-500 text-sm font-medium">
                        {getChildName(task.childId)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <View className="flex-row items-center bg-amber-100 px-2 py-1 rounded-full">
                        <Star size={14} color="#F59E0B" />
                        <Text className="text-amber-700 font-bold ml-1">{actualPoints}</Text>
                      </View>
                      {multiplier > 1 && (
                        <Text className="text-xs text-amber-600 mt-1">{multiplier}x bonus!</Text>
                      )}
                    </View>
                  </View>

                  {/* Task Description */}
                  <Text className="text-gray-600 mb-3">{task.description}</Text>

                  {/* Proof of Work Section */}
                  {hasProof && (
                    <Pressable
                      onPress={() => handleViewProof(task)}
                      className="bg-blue-50 rounded-xl p-3 mb-3 border border-blue-100"
                    >
                      <View className="flex-row items-center">
                        {task.proofPhotoUri && (
                          <View className="flex-row items-center mr-4">
                            <Camera size={16} color="#4A90E2" />
                            <Text className="text-blue-600 font-medium ml-1">Photo Proof</Text>
                          </View>
                        )}
                        {task.proofTimerSeconds && (
                          <View className="flex-row items-center mr-4">
                            <Timer size={16} color="#4A90E2" />
                            <Text className="text-blue-600 font-medium ml-1">
                              {Math.floor(task.proofTimerSeconds / 60)}:{(task.proofTimerSeconds % 60).toString().padStart(2, '0')} tracked
                            </Text>
                          </View>
                        )}
                        <Text className="text-blue-500 text-sm ml-auto">View →</Text>
                      </View>
                    </Pressable>
                  )}

                  {/* AI Verification Badge */}
                  {hasAIVerification && (
                    <View className={`rounded-xl p-3 mb-3 ${task.aiVerificationResult?.isVerified ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
                      <View className="flex-row items-center">
                        <Sparkles size={16} color={task.aiVerificationResult?.isVerified ? '#22C55E' : '#F59E0B'} />
                        <Text className={`font-medium ml-2 ${task.aiVerificationResult?.isVerified ? 'text-green-700' : 'text-amber-700'}`}>
                          AI Verified: {task.aiVerificationResult?.confidence ? `${Math.round(task.aiVerificationResult.confidence * 100)}%` : 'Pending'}
                        </Text>
                      </View>
                      {task.aiVerificationResult?.feedback && (
                        <Text className="text-gray-600 text-sm mt-1">{task.aiVerificationResult.feedback}</Text>
                      )}
                    </View>
                  )}

                  {/* Completion Time */}
                  {task.completedAt && (
                    <Text className="text-gray-400 text-sm mb-4">
                      Completed {new Date(task.completedAt).toLocaleTimeString()}
                    </Text>
                  )}

                  {/* Action Buttons */}
                  <View className="flex-row">
                    <Pressable
                      onPress={() => handleReject(task.id)}
                      className="flex-1 flex-row items-center justify-center bg-red-50 py-3 rounded-xl mr-2 active:bg-red-100"
                    >
                      <X size={20} color="#EF4444" />
                      <Text className="text-red-500 font-semibold ml-2">Reject</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleApprovePress(task.id)}
                      className="flex-1 flex-row items-center justify-center bg-green-500 py-3 rounded-xl ml-2 active:bg-green-600"
                    >
                      <Lock size={16} color="white" />
                      <Text className="text-white font-semibold ml-2">Approve</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Passcode Modal */}
      <Modal
        visible={showPasscodeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasscodeModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl pt-6 pb-10 px-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Enter Passcode</Text>
              <Pressable
                onPress={() => {
                  setShowPasscodeModal(false);
                  setPendingApprovalTaskId(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            <Text className="text-gray-500 text-center mb-6">
              {isApproveAllMode 
                ? `Enter your parent PIN to approve all ${pendingTasks.length} tasks`
                : 'Enter your parent PIN to approve this task'}
            </Text>

            {/* Passcode Dots */}
            <Animated.View style={animatedStyle} className="flex-row justify-center mb-8">
              {[0, 1, 2, 3].map(renderDot)}
            </Animated.View>

            {/* Keypad */}
            <View className="items-center">
              <View className="flex-row">
                {renderKeypadButton('1')}
                {renderKeypadButton('2')}
                {renderKeypadButton('3')}
              </View>
              <View className="flex-row">
                {renderKeypadButton('4')}
                {renderKeypadButton('5')}
                {renderKeypadButton('6')}
              </View>
              <View className="flex-row">
                {renderKeypadButton('7')}
                {renderKeypadButton('8')}
                {renderKeypadButton('9')}
              </View>
              <View className="flex-row">
                <View className="w-16 h-16 m-1" />
                {renderKeypadButton('0')}
                <Pressable
                  onPress={handleDeletePress}
                  className="w-16 h-16 rounded-full items-center justify-center m-1 active:bg-gray-100"
                >
                  <Delete size={24} color="#64748B" />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Proof Modal */}
      <Modal
        visible={showProofModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProofModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl pt-6 pb-10 px-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Proof of Work</Text>
              <Pressable
                onPress={() => setShowProofModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            {selectedTask && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-lg font-semibold text-gray-900 mb-2">{selectedTask.title}</Text>
                <Text className="text-gray-500 mb-4">{selectedTask.description}</Text>

                {selectedTask.proofPhotoUri && (
                  <View className="mb-4">
                    <Text className="text-gray-700 font-medium mb-2">Photo Evidence</Text>
                    <Image
                      source={{ uri: selectedTask.proofPhotoUri }}
                      style={{ width: '100%', height: 250, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  </View>
                )}

                {selectedTask.proofTimerSeconds && (
                  <View className="bg-blue-50 rounded-xl p-4 mb-4">
                    <View className="flex-row items-center">
                      <Timer size={24} color="#4A90E2" />
                      <View className="ml-3">
                        <Text className="text-gray-900 font-semibold">Time Tracked</Text>
                        <Text className="text-blue-600 text-lg font-bold">
                          {Math.floor(selectedTask.proofTimerSeconds / 60)} min {selectedTask.proofTimerSeconds % 60} sec
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {selectedTask.aiVerificationResult && (
                  <View className={`rounded-xl p-4 ${selectedTask.aiVerificationResult.isVerified ? 'bg-green-50' : 'bg-amber-50'}`}>
                    <View className="flex-row items-center mb-2">
                      <Sparkles size={20} color={selectedTask.aiVerificationResult.isVerified ? '#22C55E' : '#F59E0B'} />
                      <Text className={`font-semibold ml-2 ${selectedTask.aiVerificationResult.isVerified ? 'text-green-700' : 'text-amber-700'}`}>
                        AI Analysis
                      </Text>
                    </View>
                    <Text className="text-gray-700">{selectedTask.aiVerificationResult.feedback}</Text>
                    <Text className="text-gray-500 text-sm mt-2">
                      Confidence: {Math.round(selectedTask.aiVerificationResult.confidence * 100)}%
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
