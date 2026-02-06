// Onboarding Tutorial Modal - Shows how to use the app after signup
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  Baby,
  ArrowLeftRight,
  Lock,
  CheckCircle,
  Star,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react-native';
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface OnboardingTutorialProps {
  visible: boolean;
  onClose: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Parent Mode',
    description: 'You start in Parent Mode. Here you can manage your children, approve completed tasks, and change settings.',
    icon: <Users size={48} color="#4A90E2" />,
    highlight: 'You are the captain of this ship!',
  },
  {
    title: 'Switch to Child Mode',
    description: 'Tap on any child\'s profile to switch to their view. They can complete tasks and earn Magic Coins from there.',
    icon: <Baby size={48} color="#22C55E" />,
    highlight: 'Tap a child to switch views',
  },
  {
    title: 'Switching Back',
    description: 'To switch back to Parent Mode, tap the "Parent Mode" button in the child\'s profile. You\'ll need to enter your 4-digit passcode.',
    icon: <ArrowLeftRight size={48} color="#F59E0B" />,
    highlight: 'Default passcode: 1234',
  },
  {
    title: 'Parental Control',
    description: 'The default passcode is 1234. We strongly recommend changing it so your children cannot access Parent Mode without permission. This keeps task approvals and settings secure.',
    icon: <Lock size={48} color="#EF4444" />,
    highlight: 'Change your passcode in Profile > Security',
  },
  {
    title: 'Approve Tasks',
    description: 'When your child completes a task, you\'ll see it in the Activity tab. Review their work and approve to award Magic Coins!',
    icon: <CheckCircle size={48} color="#22C55E" />,
    highlight: 'Review & approve for coins',
  },
  {
    title: 'Earn Rewards',
    description: 'As tasks get approved, your child earns Magic Coins and fills their Mail Meter. When it\'s full, they get real mail rewards!',
    icon: <Star size={48} color="#FFD700" />,
    highlight: 'Coins = Mail Rewards!',
  },
];

export function OnboardingTutorial({ visible, onClose }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep(0);
    onClose();
  };

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/60 justify-center px-5">
        <Animated.View
          entering={FadeIn}
          className="bg-white rounded-3xl overflow-hidden"
        >
          {/* Close Button */}
          <Pressable
            onPress={handleClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
          >
            <X size={18} color="#6B7280" />
          </Pressable>

          {/* Content */}
          <View className="pt-12 pb-6 px-6">
            {/* Progress Dots */}
            <View className="flex-row justify-center mb-6">
              {TUTORIAL_STEPS.map((_, index) => (
                <View
                  key={index}
                  className={`w-2 h-2 rounded-full mx-1 ${
                    index === currentStep ? 'bg-blue-500 w-6' : 'bg-gray-300'
                  }`}
                />
              ))}
            </View>

            {/* Icon */}
            <View className="items-center mb-6">
              <View className="w-24 h-24 rounded-full bg-gray-50 items-center justify-center">
                {step.icon}
              </View>
            </View>

            {/* Title */}
            <Text className="text-2xl font-bold text-gray-900 text-center mb-3">
              {step.title}
            </Text>

            {/* Description */}
            <Text className="text-gray-600 text-center text-base leading-6 mb-4">
              {step.description}
            </Text>

            {/* Highlight Box */}
            {step.highlight && (
              <View className="bg-blue-50 rounded-xl px-4 py-3 mb-6">
                <Text className="text-blue-700 font-semibold text-center">
                  {step.highlight}
                </Text>
              </View>
            )}
          </View>

          {/* Navigation Buttons */}
          <View className="flex-row border-t border-gray-100">
            {/* Back Button */}
            <Pressable
              onPress={handlePrev}
              disabled={currentStep === 0}
              className={`flex-1 py-4 flex-row items-center justify-center border-r border-gray-100 ${
                currentStep === 0 ? 'opacity-30' : 'active:bg-gray-50'
              }`}
            >
              <ChevronLeft size={20} color="#6B7280" />
              <Text className="text-gray-600 font-medium ml-1">Back</Text>
            </Pressable>

            {/* Next/Done Button */}
            <Pressable
              onPress={handleNext}
              className="flex-1 py-4 flex-row items-center justify-center bg-blue-500 active:bg-blue-600"
            >
              <Text className="text-white font-bold mr-1">
                {isLastStep ? "Got It!" : "Next"}
              </Text>
              {!isLastStep && <ChevronRight size={20} color="white" />}
            </Pressable>
          </View>
        </Animated.View>

        {/* Skip Button */}
        <Pressable
          onPress={handleClose}
          className="mt-4 py-3"
        >
          <Text className="text-white/80 text-center font-medium">
            Skip Tutorial
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
