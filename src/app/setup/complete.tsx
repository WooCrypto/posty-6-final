// Setup Complete Screen - Celebration after onboarding
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostyMascot } from '@/components/PostyMascot';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { useAppStore } from '@/lib/store';
import { PartyPopper, Mail, ArrowRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function CompleteScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const children = currentUser?.children ?? [];
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Show the tutorial first
    setShowTutorial(true);
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
    // Mark onboarding as complete after tutorial
    setOnboarded(true);
    // Navigate to parent dashboard after tutorial
    router.replace('/parent/(tabs)');
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#22C55E', '#4ECDC4', '#4A90E2']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView 
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24, justifyContent: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            {/* Celebration Icon */}
            <Animated.View
              entering={ZoomIn.delay(200).springify()}
              className="items-center mb-6"
            >
              <View className="flex-row items-center">
                <PartyPopper size={40} color="#FFD93D" />
                <View className="mx-4">
                  <PostyMascot size="large" mood="celebrating" animate />
                </View>
                <PartyPopper size={40} color="#FFD93D" style={{ transform: [{ scaleX: -1 }] }} />
              </View>
            </Animated.View>

            {/* Success Message */}
            <Animated.View
              entering={FadeInDown.delay(400).springify()}
              className="items-center mb-8"
            >
              <Text className="text-4xl font-extrabold text-white text-center mb-3">
                You're All Set!
              </Text>
              <Text className="text-lg text-white/90 text-center leading-6">
                Welcome to Posty's MagicMail Club!{'\n'}
                The adventure begins now!
              </Text>
            </Animated.View>

            {/* Summary Card */}
            <Animated.View
              entering={FadeInDown.delay(600).springify()}
              className="bg-white/20 rounded-3xl p-5 mb-8"
            >
              <View className="flex-row items-center mb-4">
                <Mail size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-2">What's Next</Text>
              </View>

              <View className="space-y-3">
                <SummaryItem
                  emoji="👧👦"
                  text={`${children.length} ${children.length === 1 ? 'child' : 'children'} added`}
                />
                <SummaryItem
                  emoji="📋"
                  text="Daily tasks are ready"
                />
                <SummaryItem
                  emoji="📬"
                  text="First mail coming soon!"
                />
                <SummaryItem
                  emoji="⭐"
                  text="Start earning Magic Coins today"
                />
              </View>
            </Animated.View>

            {/* Posty's Message */}
            <Animated.View
              entering={FadeInDown.delay(800).springify()}
              className="bg-white rounded-2xl p-4 mb-8"
            >
              <Text className="text-gray-800 text-center font-medium">
                "I can't wait to send {children[0]?.name ?? 'your child'} their first letter!
                Let's start completing tasks and earning those rewards!"
              </Text>
              <Text className="text-right text-gray-500 mt-2">- Posty 🐕</Text>
            </Animated.View>

            {/* Get Started Button */}
            <Animated.View entering={FadeInUp.delay(1000).springify()}>
              <Pressable
                onPress={handleGetStarted}
                className="bg-amber-400 py-4 rounded-2xl flex-row items-center justify-center active:bg-amber-500"
              >
                <Text className="text-lg font-bold text-gray-900 mr-2">Let's Go!</Text>
                <ArrowRight size={24} color="#1F2937" />
              </Pressable>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Onboarding Tutorial Modal */}
      <OnboardingTutorial
        visible={showTutorial}
        onClose={handleTutorialClose}
      />
    </View>
  );
}

function SummaryItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View className="flex-row items-center mb-2">
      <Text className="text-xl mr-3">{emoji}</Text>
      <Text className="text-white font-medium">{text}</Text>
    </View>
  );
}
