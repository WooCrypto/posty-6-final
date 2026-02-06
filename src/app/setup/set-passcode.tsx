// Set Passcode Screen - Initial passcode setup after signup
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { Lock, Shield, ArrowRight, AlertTriangle } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function SetPasscodeScreen() {
  const router = useRouter();
  const setPasscode = useAppStore((s) => s.setPasscode);

  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState('');

  const handleSetPasscode = () => {
    setError('');

    if (newPasscode.length !== 4 || !/^\d{4}$/.test(newPasscode)) {
      setError('Passcode must be exactly 4 digits.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setError('Passcodes do not match.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPasscode(newPasscode);
    router.replace('/setup/complete');
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/setup/complete');
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="items-center mb-6"
          >
            <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4">
              <Shield size={40} color="#4A90E2" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 text-center">
              Set Parent Passcode
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              Keep your parent controls secure
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="bg-amber-50 rounded-2xl p-4 mb-6 border border-amber-200"
          >
            <View className="flex-row items-start">
              <AlertTriangle size={24} color="#F59E0B" />
              <View className="flex-1 ml-3">
                <Text className="text-amber-800 font-bold mb-1">Default Passcode: 1234</Text>
                <Text className="text-amber-700 text-sm leading-5">
                  Your account currently uses the default passcode. We strongly recommend setting a custom passcode to prevent children from accessing parent controls.
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm"
          >
            <Text className="text-lg font-bold text-gray-900 mb-4">Create Your Passcode</Text>

            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-2">New Passcode (4 digits)</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Lock size={18} color="#64748B" />
                <TextInput
                  value={newPasscode}
                  onChangeText={(text) => {
                    setNewPasscode(text.replace(/[^0-9]/g, ''));
                    setError('');
                  }}
                  placeholder="Enter 4-digit passcode"
                  placeholderTextColor="#94A3B8"
                  style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-2">Confirm Passcode</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Lock size={18} color="#64748B" />
                <TextInput
                  value={confirmPasscode}
                  onChangeText={(text) => {
                    setConfirmPasscode(text.replace(/[^0-9]/g, ''));
                    setError('');
                  }}
                  placeholder="Confirm passcode"
                  placeholderTextColor="#94A3B8"
                  style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>

            {error ? (
              <View className="bg-red-50 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-center">{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSetPasscode}
              className="bg-blue-500 py-4 rounded-xl flex-row items-center justify-center active:bg-blue-600"
            >
              <Text className="text-white font-bold text-lg mr-2">Set Passcode</Text>
              <ArrowRight size={20} color="white" />
            </Pressable>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="bg-gray-100 rounded-2xl p-4 mb-4"
          >
            <View className="flex-row items-start">
              <Lock size={20} color="#64748B" />
              <View className="flex-1 ml-3">
                <Text className="text-gray-700 font-medium mb-1">Why set a passcode?</Text>
                <Text className="text-gray-500 text-sm leading-5">
                  The passcode is used to switch from child mode back to parent mode. Without a custom passcode, your children may access parent controls using the default code (1234).
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <Pressable
              onPress={handleSkip}
              className="py-4"
            >
              <Text className="text-gray-500 text-center font-medium">
                Skip for now (keep default: 1234)
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
