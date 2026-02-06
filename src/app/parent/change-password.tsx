import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, Lock, Key } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/lib/store';
import { supabaseService } from '@/lib/supabase-service';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);

    try {
      if (!currentUser?.email) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const result = await supabaseService.updatePassword(currentUser.email, currentPassword, newPassword);
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Password Changed',
          'Your password has been updated successfully.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', result.error || 'Failed to change password. Please check your current password and try again.');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              className="p-2 -ml-2"
            >
              <ArrowLeft size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-bold text-gray-900 ml-2">Change Password</Text>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <Key size={24} color="#4A90E2" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-lg">Update Your Password</Text>
                  <Text className="text-gray-500 text-sm">Enter your current password and choose a new one</Text>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Current Password</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                  <View className="pl-4">
                    <Lock size={20} color="#9CA3AF" />
                  </View>
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    secureTextEntry={!showCurrentPassword}
                    className="flex-1 px-3 py-4 text-gray-900"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Pressable
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="pr-4"
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={20} color="#9CA3AF" />
                    ) : (
                      <Eye size={20} color="#9CA3AF" />
                    )}
                  </Pressable>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">New Password</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                  <View className="pl-4">
                    <Lock size={20} color="#9CA3AF" />
                  </View>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password (min 6 characters)"
                    secureTextEntry={!showNewPassword}
                    className="flex-1 px-3 py-4 text-gray-900"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    className="pr-4"
                  >
                    {showNewPassword ? (
                      <EyeOff size={20} color="#9CA3AF" />
                    ) : (
                      <Eye size={20} color="#9CA3AF" />
                    )}
                  </Pressable>
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Confirm New Password</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                  <View className="pl-4">
                    <Lock size={20} color="#9CA3AF" />
                  </View>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry={!showConfirmPassword}
                    className="flex-1 px-3 py-4 text-gray-900"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="pr-4"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#9CA3AF" />
                    ) : (
                      <Eye size={20} color="#9CA3AF" />
                    )}
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleChangePassword}
                disabled={isLoading}
                className={`py-4 rounded-xl ${isLoading ? 'bg-blue-300' : 'bg-blue-500 active:bg-blue-600'}`}
              >
                <Text className="text-white font-bold text-center text-lg">
                  {isLoading ? 'Updating...' : 'Change Password'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/auth/forgot-password');
              }}
              className="py-3"
            >
              <Text className="text-blue-500 text-center font-medium">
                Forgot your password?
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
