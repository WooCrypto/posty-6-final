// Child Tasks Screen - Daily task list with proof of work
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/lib/store';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  CheckCircle2,
  Circle,
  Star,
  Clock,
  Sparkles,
  Camera,
  Timer,
  X,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Task, getPointsMultiplier } from '@/lib/types';
import { isGeminiEnabled } from '@/lib/gemini';
import { hasSelectedPlan, getDaysUntilShipping, getNextShippingDate, formatShippingDate } from '@/lib/subscriptionLimits';
import { useRouter } from 'expo-router';
const MiloImage = require('@/assets/milo.png');

const categoryEmojis: Record<string, string> = {
  reading: '📚',
  chores: '🧹',
  creativity: '🎨',
  kindness: '💝',
  fitness: '💪',
  mindset: '🧠',
  learning: '📖',
  goals: '🎯',
  entrepreneur: '💼',
};

export default function ChildTasksScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const tasks = useAppStore((s) => s.tasks);
  const completeTask = useAppStore((s) => s.completeTask);
  const router = useRouter();

  const [showProofModal, setShowProofModal] = useState(false);
  const [showNoPlanModal, setShowNoPlanModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proofType, setProofType] = useState<'photo' | 'timer' | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const child = currentUser?.children.find((c) => c.id === activeChildId);
  const hasPlan = hasSelectedPlan(currentUser?.subscription);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  if (!child) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">No child selected</Text>
      </View>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter((t) => t.childId === child.id && t.dueDate === today);
  const pendingTasks = todaysTasks.filter((t) => t.status === 'pending');
  const completedTasks = todaysTasks.filter((t) => t.status === 'completed');
  const approvedTasks = todaysTasks.filter((t) => t.status === 'approved');

  const multiplier = getPointsMultiplier(child.totalPoints);

  const handleTaskPress = (task: Task) => {
    // Check if user has a subscription plan selected
    if (!hasPlan) {
      setShowNoPlanModal(true);
      return;
    }
    
    setSelectedTask(task);
    setProofType(null);
    setCapturedPhoto(null);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    setShowProofModal(true);
  };

  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to take proof photos.');
        return;
      }
    }
    setProofType('photo');
  };

  const handleCapturePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
        if (photo?.uri) {
          setCapturedPhoto(photo.uri);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.log('Error taking photo:', error);
        Alert.alert('Error', 'Could not take photo. Please try again.');
      }
    }
  };

  const handleStartTimer = () => {
    setProofType('timer');
    setTimerSeconds(0);
    setIsTimerRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleToggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleResetTimer = () => {
    setTimerSeconds(0);
    setIsTimerRunning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmitProof = async () => {
    if (!selectedTask) return;

    setIsVerifying(true);

    try {
      // Complete the task with proof data (photo and/or timer)
      const proofData: { photoUri?: string; timerSeconds?: number } = {};
      
      if (capturedPhoto) {
        proofData.photoUri = capturedPhoto;
      }
      
      if (proofType === 'timer' || timerSeconds > 0) {
        proofData.timerSeconds = timerSeconds;
      }
      
      completeTask(selectedTask.id, Object.keys(proofData).length > 0 ? proofData : undefined);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowProofModal(false);
      setSelectedTask(null);
      setCapturedPhoto(null);
      setTimerSeconds(0);

      Alert.alert(
        'Great job! 🎉',
        'Your task has been submitted for parent approval!',
        [{ text: 'Awesome!' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not submit proof. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCompleteWithoutProof = () => {
    if (!selectedTask) return;

    Alert.alert(
      'Complete Task?',
      `Did you finish "${selectedTask.title}"?\n\nYour parent will need to approve it to earn ${selectedTask.points * multiplier} Magic Coins!`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Done!',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Pass timer data if timer was used
            const proofData = timerSeconds > 0 ? { timerSeconds } : undefined;
            completeTask(selectedTask.id, proofData);
            setShowProofModal(false);
            setSelectedTask(null);
            setCapturedPhoto(null);
            setTimerSeconds(0);
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTaskCard = (task: Task, index: number) => {
    const isPending = task.status === 'pending';
    const isCompleted = task.status === 'completed';
    const isApproved = task.status === 'approved';
    const actualPoints = task.points * multiplier;

    return (
      <Animated.View
        key={task.id}
        entering={FadeInRight.delay(index * 100).springify()}
        layout={Layout.springify()}
      >
        <Pressable
          onPress={() => isPending && handleTaskPress(task)}
          disabled={!isPending}
          className={`bg-white rounded-2xl p-4 mb-3 shadow-sm border-l-4 ${
            isApproved
              ? 'border-green-500 opacity-80'
              : isCompleted
              ? 'border-amber-400'
              : 'border-blue-400'
          } active:opacity-90`}
        >
          <View className="flex-row items-start">
            {/* Status Icon */}
            <View className="mr-3 mt-0.5">
              {isApproved ? (
                <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                  <CheckCircle2 size={20} color="#22C55E" />
                </View>
              ) : isCompleted ? (
                <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
                  <Clock size={20} color="#F59E0B" />
                </View>
              ) : (
                <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
                  <Circle size={20} color="#4A90E2" />
                </View>
              )}
            </View>

            {/* Content */}
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text className="text-lg mr-2">{categoryEmojis[task.category] ?? '📋'}</Text>
                <Text
                  className={`flex-1 font-bold ${
                    isApproved ? 'text-gray-400 line-through' : 'text-gray-900'
                  }`}
                >
                  {task.title}
                </Text>
              </View>
              <Text className={`text-sm ${isApproved ? 'text-gray-400' : 'text-gray-500'}`}>
                {task.description}
              </Text>
              {task.isCustom && (
                <View className="bg-purple-100 px-2 py-0.5 rounded-full self-start mt-2">
                  <Text className="text-purple-700 text-xs font-medium">Custom Task</Text>
                </View>
              )}
              {task.requiresProof && isPending && (
                <View className="bg-blue-100 px-2 py-0.5 rounded-full self-start mt-2">
                  <Text className="text-blue-700 text-xs font-medium">Proof Required</Text>
                </View>
              )}
            </View>

            {/* Points */}
            <View className="items-end">
              <View
                className={`flex-row items-center px-2 py-1 rounded-full ${
                  isApproved ? 'bg-green-100' : 'bg-amber-100'
                }`}
              >
                <Star size={14} color={isApproved ? '#22C55E' : '#F59E0B'} />
                <Text
                  className={`ml-1 font-bold ${
                    isApproved ? 'text-green-700' : 'text-amber-700'
                  }`}
                >
                  {actualPoints}
                </Text>
              </View>
              {isApproved && (
                <Text className="text-green-600 text-xs mt-1">Earned!</Text>
              )}
              {isCompleted && !isApproved && (
                <Text className="text-amber-600 text-xs mt-1">Pending</Text>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View className="px-5 py-4 bg-white border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Today's Tasks</Text>
              <Text className="text-gray-500 text-sm mt-1">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            {/* Milo the explorer mascot */}
            <Image
              source={MiloImage}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              resizeMode="cover"
            />
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-100"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-blue-800 font-bold">Progress</Text>
                <Text className="text-blue-600 text-sm">
                  {approvedTasks.length} approved • {completedTasks.length} waiting • {pendingTasks.length} to do
                </Text>
              </View>
              {multiplier > 1 && (
                <View className="bg-amber-400 px-3 py-1 rounded-full">
                  <Text className="text-gray-900 font-bold text-sm">{multiplier}x Coins!</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <>
              <Text className="text-gray-900 font-bold mb-3">To Do ({pendingTasks.length})</Text>
              {pendingTasks.map((task, index) => renderTaskCard(task, index))}
            </>
          )}

          {/* Completed (Awaiting Approval) */}
          {completedTasks.length > 0 && (
            <>
              <Text className="text-gray-900 font-bold mb-3 mt-4">
                Waiting for Approval ({completedTasks.length})
              </Text>
              {completedTasks.map((task, index) => renderTaskCard(task, index))}
            </>
          )}

          {/* Approved */}
          {approvedTasks.length > 0 && (
            <>
              <Text className="text-gray-900 font-bold mb-3 mt-4">
                Completed ({approvedTasks.length})
              </Text>
              {approvedTasks.map((task, index) => renderTaskCard(task, index))}
            </>
          )}

          {/* All Done Message */}
          {todaysTasks.length > 0 && pendingTasks.length === 0 && (
            <Animated.View
              entering={FadeInDown.delay(300).springify()}
              className="items-center py-8"
            >
              <Sparkles size={48} color="#22C55E" />
              <Text className="text-xl font-bold text-gray-900 mt-4">All tasks completed!</Text>
              <Text className="text-gray-500 text-center mt-2">
                Amazing work! Come back tomorrow for more tasks.
              </Text>
            </Animated.View>
          )}

          {/* No Tasks */}
          {todaysTasks.length === 0 && (
            <View className="items-center py-16">
              <Text className="text-5xl mb-4">📭</Text>
              <Text className="text-xl font-bold text-gray-900">No tasks today</Text>
              <Text className="text-gray-500 text-center mt-2">
                Check back tomorrow for new tasks!
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Proof of Work Modal */}
      <Modal
        visible={showProofModal}
        animationType="slide"
        onRequestClose={() => setShowProofModal(false)}
      >
        <SafeAreaView style={{ flex: 1 }} className="bg-gray-50">
          {/* Modal Header */}
          <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
            <Pressable
              onPress={() => {
                setShowProofModal(false);
                setIsTimerRunning(false);
              }}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
            >
              <X size={24} color="#1F2937" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">{selectedTask?.title}</Text>
              <Text className="text-gray-500 text-sm">Complete this task</Text>
            </View>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
            {/* Task Description */}
            <View className="bg-white rounded-2xl p-4 mb-4">
              <Text className="text-gray-600">{selectedTask?.description}</Text>
              <View className="flex-row items-center mt-3">
                <Star size={16} color="#F59E0B" />
                <Text className="text-amber-700 font-bold ml-1">
                  {(selectedTask?.points ?? 0) * multiplier} Magic Coins
                </Text>
              </View>
            </View>

            {/* Proof Type Selection */}
            {!proofType && (
              <>
                <Text className="text-gray-900 font-bold mb-3">Add Proof (Optional)</Text>
                <View className="flex-row mb-4">
                  <Pressable
                    onPress={handleTakePhoto}
                    className="flex-1 bg-white rounded-2xl p-4 mr-2 items-center border border-gray-200 active:bg-gray-50"
                  >
                    <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center mb-2">
                      <Camera size={28} color="#4A90E2" />
                    </View>
                    <Text className="text-gray-900 font-semibold">Take Photo</Text>
                    <Text className="text-gray-500 text-xs text-center mt-1">
                      Show your completed work
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleStartTimer}
                    className="flex-1 bg-white rounded-2xl p-4 ml-2 items-center border border-gray-200 active:bg-gray-50"
                  >
                    <View className="w-14 h-14 rounded-full bg-green-100 items-center justify-center mb-2">
                      <Timer size={28} color="#22C55E" />
                    </View>
                    <Text className="text-gray-900 font-semibold">Use Timer</Text>
                    <Text className="text-gray-500 text-xs text-center mt-1">
                      Track time spent
                    </Text>
                  </Pressable>
                </View>

                {/* Complete without proof */}
                <Pressable
                  onPress={handleCompleteWithoutProof}
                  className="bg-green-500 rounded-2xl py-4 items-center active:bg-green-600"
                >
                  <Text className="text-white font-bold text-lg">I'm Done!</Text>
                </Pressable>
              </>
            )}

            {/* Photo Capture */}
            {proofType === 'photo' && !capturedPhoto && (
              <View className="flex-1">
                <Text className="text-gray-900 font-bold mb-3">Take a Photo</Text>
                <View className="h-80 rounded-2xl overflow-hidden mb-4">
                  <CameraView
                    ref={cameraRef}
                    style={{ flex: 1 }}
                    facing="back"
                  />
                </View>
                <View className="flex-row">
                  <Pressable
                    onPress={() => setProofType(null)}
                    className="flex-1 bg-gray-200 rounded-2xl py-4 mr-2 items-center"
                  >
                    <Text className="text-gray-700 font-semibold">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCapturePhoto}
                    className="flex-1 bg-blue-500 rounded-2xl py-4 ml-2 items-center active:bg-blue-600"
                  >
                    <Text className="text-white font-bold">Capture</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Photo Preview */}
            {proofType === 'photo' && capturedPhoto && (
              <View>
                <Text className="text-gray-900 font-bold mb-3">Photo Captured!</Text>
                <Image
                  source={{ uri: capturedPhoto }}
                  style={{ width: '100%', height: 300, borderRadius: 16 }}
                  resizeMode="cover"
                />
                <View className="flex-row mt-4">
                  <Pressable
                    onPress={() => setCapturedPhoto(null)}
                    className="flex-1 bg-gray-200 rounded-2xl py-4 mr-2 items-center"
                  >
                    <Text className="text-gray-700 font-semibold">Retake</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmitProof}
                    disabled={isVerifying}
                    className="flex-1 bg-green-500 rounded-2xl py-4 ml-2 items-center active:bg-green-600"
                  >
                    <Text className="text-white font-bold">
                      {isVerifying ? 'Submitting...' : 'Submit'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Timer */}
            {proofType === 'timer' && (
              <View>
                <Text className="text-gray-900 font-bold mb-3">Time Tracker</Text>
                <View className="bg-white rounded-2xl p-6 items-center mb-4">
                  <Text className="text-5xl font-bold text-gray-900 mb-6">
                    {formatTime(timerSeconds)}
                  </Text>
                  <View className="flex-row">
                    <Pressable
                      onPress={handleResetTimer}
                      className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center mx-2"
                    >
                      <RotateCcw size={24} color="#64748B" />
                    </Pressable>
                    <Pressable
                      onPress={handleToggleTimer}
                      className={`w-20 h-20 rounded-full items-center justify-center mx-2 ${
                        isTimerRunning ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                    >
                      {isTimerRunning ? (
                        <Pause size={32} color="white" />
                      ) : (
                        <Play size={32} color="white" />
                      )}
                    </Pressable>
                    <View className="w-14 h-14 mx-2" />
                  </View>
                </View>
                <View className="flex-row">
                  <Pressable
                    onPress={() => {
                      setProofType(null);
                      setTimerSeconds(0);
                      setIsTimerRunning(false);
                    }}
                    className="flex-1 bg-gray-200 rounded-2xl py-4 mr-2 items-center"
                  >
                    <Text className="text-gray-700 font-semibold">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmitProof}
                    disabled={timerSeconds < 10}
                    className={`flex-1 rounded-2xl py-4 ml-2 items-center ${
                      timerSeconds >= 10 ? 'bg-green-500 active:bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <Text className={`font-bold ${timerSeconds >= 10 ? 'text-white' : 'text-gray-500'}`}>
                      {timerSeconds >= 10 ? 'Submit' : 'Track at least 10s'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* No Plan Selected Modal */}
      <Modal
        visible={showNoPlanModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoPlanModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center">
            <Text className="text-5xl mb-4">🐕</Text>
            <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
              Choose a Plan First!
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              Ask your parent to pick a subscription plan before you can start completing tasks and earning Magic Coins!
            </Text>
            <Pressable
              onPress={() => setShowNoPlanModal(false)}
              className="bg-blue-500 rounded-2xl py-4 px-8 w-full items-center"
            >
              <Text className="text-white font-bold text-lg">OK, Got it!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
