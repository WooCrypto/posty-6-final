// Add Child Screen - First step of onboarding
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostyMascot } from '@/components/PostyMascot';
import { useAppStore } from '@/lib/store';
import { User, Plus, Trash2, ChevronRight, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getAgeGroup, AGE_GROUPS } from '@/lib/types';

interface ChildInput {
  id: string;
  name: string;
  age: string;
  gender: 'boy' | 'girl';
}

export default function AddChildScreen() {
  const router = useRouter();
  const { returnPlan } = useLocalSearchParams<{ returnPlan?: string }>();
  const addChild = useAppStore((s) => s.addChild);
  const setSubscription = useAppStore((s) => s.setSubscription);
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);

  const [children, setChildren] = useState<ChildInput[]>([
    { id: '1', name: '', age: '', gender: 'boy' },
  ]);

  const handleAddChild = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // During signup, only 1 child allowed on free/basic plan
    // Show upgrade prompt when trying to add more
    Alert.alert(
      'Subscribe to Add More',
      'The free and basic plans support 1 child. Upgrade to Standard (3 children) or Premium (unlimited) to add more children to your account.',
      [
        { text: 'OK', style: 'cancel' },
        {
          text: 'View Plans',
          onPress: () => {
            // Don't add the child yet - let them complete child info first
            // Plan selection will redirect back here if no children added
            router.push('/setup/select-plan');
          },
        },
      ]
    );
  };

  const handleRemoveChild = (id: string) => {
    if (children.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChildren(children.filter((c) => c.id !== id));
  };

  const handleUpdateChild = (id: string, field: 'name' | 'age' | 'gender', value: string) => {
    setChildren(
      children.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // If user goes back during onboarding, log them out and go to welcome
    Alert.alert(
      'Cancel Setup?',
      'Going back will cancel your account setup. You can sign up again later.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Go Back',
          style: 'destructive',
          onPress: () => {
            // First navigate, then logout to avoid navigation state issues
            router.dismissAll();
            // Small delay to let navigation settle before logout
            setTimeout(() => {
              logout();
            }, 100);
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    // Validate child info
    const child = children[0];
    if (!child.name.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for your child');
      return;
    }
    const age = parseInt(child.age, 10);
    if (isNaN(age) || age < 5 || age > 17) {
      Alert.alert('Invalid Age', 'Age must be between 5 and 17');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Add the single child with gender
    addChild(child.name.trim(), age, child.gender);

    // If user came from plan selection (returnPlan param), set subscription and go to shipping
    if (returnPlan) {
      if (returnPlan === 'free') {
        setSubscription('free');
      } else if (['basic', 'standard', 'premium'].includes(returnPlan)) {
        setSubscription(returnPlan as 'basic' | 'standard' | 'premium');
      }
      router.push('/setup/shipping');
    } else {
      // Normal flow - go to plan selection
      router.push('/setup/select-plan');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#4A90E2', '#7AB3F0']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Back Button */}
          <View className="px-4 py-2">
            <Pressable
              onPress={handleBack}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <ArrowLeft size={24} color="white" />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <Animated.View
                entering={FadeInDown.delay(200).springify()}
                className="items-center mb-4"
              >
                <PostyMascot
                  size="medium"
                  mood="excited"
                  showSpeechBubble
                  speechText="Let's meet your kids!"
                />
              </Animated.View>

              {/* Progress */}
              <View className="px-6 mb-4">
                <View className="flex-row items-center justify-center">
                  <View className="w-8 h-8 rounded-full bg-amber-400 items-center justify-center">
                    <Text className="text-gray-900 font-bold">1</Text>
                  </View>
                  <View className="w-12 h-1 bg-white/30" />
                  <View className="w-8 h-8 rounded-full bg-white/30 items-center justify-center">
                    <Text className="text-white/60 font-bold">2</Text>
                  </View>
                  <View className="w-12 h-1 bg-white/30" />
                  <View className="w-8 h-8 rounded-full bg-white/30 items-center justify-center">
                    <Text className="text-white/60 font-bold">3</Text>
                  </View>
                </View>
                <Text className="text-white/80 text-center mt-2 text-sm">
                  Step 1: Add Your Children
                </Text>
              </View>

              {/* Children Cards */}
              <Animated.View
                entering={FadeInDown.delay(400).springify()}
                className="mx-4"
              >
                {children.map((child, index) => (
                  <View
                    key={child.id}
                    className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-lg font-semibold text-gray-900">
                        Child 1
                      </Text>
                    </View>

                    {/* Name Input */}
                    <View className="mb-3">
                      <Text className="text-gray-600 text-sm mb-1">Name</Text>
                      <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                        <User size={18} color="#64748B" />
                        <TextInput
                          value={child.name}
                          onChangeText={(value) => handleUpdateChild(child.id, 'name', value)}
                          placeholder="Child's name"
                          placeholderTextColor="#94A3B8"
                          style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                          autoCapitalize="words"
                        />
                      </View>
                    </View>

                    {/* Age Input */}
                    <View className="mb-3">
                      <Text className="text-gray-600 text-sm mb-1">Age (5-17)</Text>
                      <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                        <Text className="text-gray-500 text-lg">🎂</Text>
                        <TextInput
                          value={child.age}
                          onChangeText={(value) => handleUpdateChild(child.id, 'age', value.replace(/[^0-9]/g, ''))}
                          placeholder="Age"
                          placeholderTextColor="#94A3B8"
                          style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                          keyboardType="number-pad"
                          maxLength={2}
                        />
                      </View>
                      {child.age && parseInt(child.age, 10) >= 5 && parseInt(child.age, 10) <= 17 && (
                        <Text className="text-blue-500 text-sm mt-1">
                          {AGE_GROUPS[getAgeGroup(parseInt(child.age, 10))].label}
                        </Text>
                      )}
                    </View>

                    {/* Gender Selection */}
                    <View>
                      <Text className="text-gray-600 text-sm mb-2">I'm a...</Text>
                      <View className="flex-row">
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            handleUpdateChild(child.id, 'gender', 'boy');
                          }}
                          className={`flex-1 mr-2 py-4 rounded-xl border-2 items-center ${
                            child.gender === 'boy'
                              ? 'bg-blue-50 border-blue-400'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <Text className="text-3xl mb-1">👦</Text>
                          <Text className={`font-semibold ${
                            child.gender === 'boy' ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            Boy
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            handleUpdateChild(child.id, 'gender', 'girl');
                          }}
                          className={`flex-1 ml-2 py-4 rounded-xl border-2 items-center ${
                            child.gender === 'girl'
                              ? 'bg-pink-50 border-pink-400'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <Text className="text-3xl mb-1">👧</Text>
                          <Text className={`font-semibold ${
                            child.gender === 'girl' ? 'text-pink-600' : 'text-gray-600'
                          }`}>
                            Girl
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Add Another Child Button - Shows upgrade prompt */}
                <Pressable
                  onPress={handleAddChild}
                  className="flex-row items-center justify-center bg-blue-400/40 rounded-2xl py-4 border-2 border-dashed border-blue-300/60 mb-4"
                >
                  <Plus size={24} color="#BFDBFE" />
                  <Text className="text-blue-100 font-semibold ml-2">Add Another Child</Text>
                </Pressable>
              </Animated.View>

              {/* Continue Button */}
              <Animated.View
                entering={FadeInUp.delay(600).springify()}
                className="mx-4 mt-4"
              >
                <Pressable
                  onPress={handleContinue}
                  className="bg-amber-400 py-4 rounded-2xl flex-row items-center justify-center active:bg-amber-500"
                >
                  <Text className="text-lg font-bold text-gray-900 mr-2">Continue</Text>
                  <ChevronRight size={24} color="#1F2937" />
                </Pressable>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
