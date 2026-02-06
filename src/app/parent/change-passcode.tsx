// Change Passcode Screen - Update or reset parent passcode
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import {
  ArrowLeft,
  Lock,
  Mail,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function ChangePasscodeScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const setPasscode = useAppStore((s) => s.setPasscode);
  const resetPasscode = useAppStore((s) => s.resetPasscode);
  const getPasscode = useAppStore((s) => s.getPasscode);

  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  const handleChangePasscode = () => {
    const storedPasscode = getPasscode();

    if (currentPasscode !== storedPasscode) {
      Alert.alert('Incorrect Passcode', 'The current passcode you entered is incorrect.');
      return;
    }

    if (newPasscode.length !== 4 || !/^\d{4}$/.test(newPasscode)) {
      Alert.alert('Invalid Passcode', 'Passcode must be exactly 4 digits.');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      Alert.alert('Passcode Mismatch', 'The new passcodes do not match.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPasscode(newPasscode);
    Alert.alert(
      'Passcode Updated',
      'Your parent passcode has been changed successfully.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const handleResetAndEmail = () => {
    Alert.alert(
      'Reset Passcode',
      `A new passcode will be generated and sent to ${currentUser?.email}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & Email',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const newCode = resetPasscode();
            // In a real app, this would send an email
            Alert.alert(
              'Passcode Reset',
              `Your new passcode is: ${newCode}\n\nThis has been sent to ${currentUser?.email} for safekeeping.`,
              [{ text: 'OK', onPress: () => router.back() }]
            );
          },
        },
      ]
    );
  };

  const handleEmailCurrentPasscode = () => {
    const passcode = getPasscode();
    // In a real app, this would send an email
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Passcode Sent',
      `Your current passcode (${passcode}) has been sent to ${currentUser?.email} for safekeeping.`
    );
  };

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
          <Text className="text-xl font-bold text-gray-900">Parent Passcode</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100"
          >
            <View className="flex-row items-start">
              <Lock size={24} color="#4A90E2" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-800 font-bold mb-1">About Parent Passcode</Text>
                <Text className="text-blue-700 text-sm leading-5">
                  Your passcode is used to switch from child mode back to parent mode.
                  Keep it secret from your children!
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Change Passcode Form */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm"
          >
            <Text className="text-lg font-bold text-gray-900 mb-4">Change Passcode</Text>

            {/* Current Passcode */}
            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-2">Current Passcode</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Lock size={18} color="#64748B" />
                <TextInput
                  value={currentPasscode}
                  onChangeText={(text) => setCurrentPasscode(text.replace(/[^0-9]/g, ''))}
                  placeholder="Enter current passcode"
                  placeholderTextColor="#94A3B8"
                  style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry={!showPasscode}
                />
                <Pressable onPress={() => setShowPasscode(!showPasscode)}>
                  {showPasscode ? (
                    <EyeOff size={18} color="#64748B" />
                  ) : (
                    <Eye size={18} color="#64748B" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* New Passcode */}
            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-2">New Passcode (4 digits)</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Lock size={18} color="#64748B" />
                <TextInput
                  value={newPasscode}
                  onChangeText={(text) => setNewPasscode(text.replace(/[^0-9]/g, ''))}
                  placeholder="Enter new passcode"
                  placeholderTextColor="#94A3B8"
                  style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry={!showPasscode}
                />
              </View>
            </View>

            {/* Confirm Passcode */}
            <View className="mb-6">
              <Text className="text-gray-600 text-sm mb-2">Confirm New Passcode</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Lock size={18} color="#64748B" />
                <TextInput
                  value={confirmPasscode}
                  onChangeText={(text) => setConfirmPasscode(text.replace(/[^0-9]/g, ''))}
                  placeholder="Confirm new passcode"
                  placeholderTextColor="#94A3B8"
                  style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry={!showPasscode}
                />
              </View>
            </View>

            <Pressable
              onPress={handleChangePasscode}
              className="bg-blue-500 py-4 rounded-xl active:bg-blue-600"
            >
              <Text className="text-center text-white font-bold">Update Passcode</Text>
            </Pressable>
          </Animated.View>

          {/* Alternative Options */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <Text className="text-lg font-bold text-gray-900 mb-4">Other Options</Text>

            <Pressable
              onPress={handleEmailCurrentPasscode}
              className="flex-row items-center py-3 border-b border-gray-100"
            >
              <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-3">
                <Mail size={20} color="#22C55E" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Email Current Passcode</Text>
                <Text className="text-gray-500 text-sm">Send to {currentUser?.email}</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleResetAndEmail}
              className="flex-row items-center py-3"
            >
              <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mr-3">
                <RefreshCw size={20} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Reset & Email New Passcode</Text>
                <Text className="text-gray-500 text-sm">Generate a new random passcode</Text>
              </View>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
