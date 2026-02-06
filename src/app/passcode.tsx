// Passcode Screen - Enter PIN to switch to parent mode
import React, { useState } from 'react';
import { View, Text, Pressable, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { X, Delete, Mail, KeyRound, Check } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';

export default function PasscodeScreen() {
  const router = useRouter();
  const switchToParentMode = useAppStore((s) => s.switchToParentMode);
  const currentUser = useAppStore((s) => s.currentUser);
  const resetPasscode = useAppStore((s) => s.resetPasscode);
  const setPasscode = useAppStore((s) => s.setPasscode);

  const [passcode, setPasscodeInput] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'confirm' | 'sending' | 'sent' | 'verify' | 'newPasscode'>('confirm');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPasscodeInput, setNewPasscodeInput] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const shakeX = useSharedValue(0);

  const handleNumberPress = (num: string) => {
    if (passcode.length < 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newPasscode = passcode + num;
      setPasscodeInput(newPasscode);

      // Auto-submit when 4 digits entered
      if (newPasscode.length === 4) {
        setTimeout(() => verifyPasscodeEntry(newPasscode), 100);
      }
    }
  };

  const handleDelete = () => {
    if (passcode.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPasscodeInput(passcode.slice(0, -1));
    }
  };

  const verifyPasscodeEntry = (code: string) => {
    const success = switchToParentMode(code);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/parent/(tabs)');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Shake animation
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      setPasscodeInput('');
    }
  };

  const handleForgotPasscode = () => {
    setShowForgotModal(true);
    setForgotStep('confirm');
    setVerificationCode('');
    setNewPasscodeInput('');
    setConfirmPasscode('');
  };

  const sendResetEmail = async () => {
    if (!currentUser?.email) {
      Alert.alert('Error', 'No email address on file.');
      return;
    }

    setForgotStep('sending');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);

    // Simulate sending email (in production, this would call a backend API)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Open email client with the reset code
    const emailSubject = encodeURIComponent('Posty MagicMail - Passcode Reset Code');
    const emailBody = encodeURIComponent(
      `Hello ${currentUser.name},\n\n` +
      `Your passcode reset verification code is: ${code}\n\n` +
      `Enter this code in the app to reset your parent passcode.\n\n` +
      `If you didn't request this, please ignore this email.\n\n` +
      `- The Posty MagicMail Team`
    );

    const mailtoUrl = `mailto:${currentUser.email}?subject=${emailSubject}&body=${emailBody}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      }
    } catch (error) {
      console.log('Could not open email client');
    }

    setForgotStep('sent');
  };

  const handleVerifyCode = () => {
    if (verificationCode === generatedCode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setForgotStep('newPasscode');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid Code', 'The verification code is incorrect. Please try again.');
    }
  };

  const handleSetNewPasscode = () => {
    if (newPasscodeInput.length !== 4) {
      Alert.alert('Invalid Passcode', 'Passcode must be 4 digits.');
      return;
    }
    if (newPasscodeInput !== confirmPasscode) {
      Alert.alert('Mismatch', 'Passcodes do not match. Please try again.');
      return;
    }

    // Set the new passcode
    setPasscode(newPasscodeInput);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Alert.alert(
      'Passcode Reset!',
      'Your parent passcode has been successfully reset. You can now use your new passcode.',
      [{ text: 'OK', onPress: () => {
        setShowForgotModal(false);
        setPasscodeInput('');
      }}]
    );
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep('confirm');
    setVerificationCode('');
    setNewPasscodeInput('');
    setConfirmPasscode('');
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

  const renderKeypadButton = (value: string, subtitle?: string) => (
    <Pressable
      onPress={() => handleNumberPress(value)}
      className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center m-2 active:bg-gray-200"
    >
      <Text className="text-3xl font-semibold text-gray-900">{value}</Text>
      {subtitle && <Text className="text-xs text-gray-500">{subtitle}</Text>}
    </Pressable>
  );

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <X size={24} color="#1F2937" />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">Parent Access</Text>
          <View className="w-10" />
        </View>

        <View className="flex-1 justify-center items-center px-6">
          {/* Lock Icon */}
          <Animated.View entering={FadeIn.delay(200)} className="mb-8">
            <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center">
              <Text className="text-4xl">🔒</Text>
            </View>
          </Animated.View>

          {/* Instructions */}
          <Text className="text-xl font-bold text-gray-900 mb-2">Enter Parent Passcode</Text>
          <Text className="text-gray-500 text-center mb-8">
            This keeps your settings secure
          </Text>

          {/* Passcode Dots */}
          <Animated.View style={animatedStyle} className="flex-row mb-10">
            {[0, 1, 2, 3].map(renderDot)}
          </Animated.View>

          {/* Keypad */}
          <View className="items-center">
            <View className="flex-row">
              {renderKeypadButton('1')}
              {renderKeypadButton('2', 'ABC')}
              {renderKeypadButton('3', 'DEF')}
            </View>
            <View className="flex-row">
              {renderKeypadButton('4', 'GHI')}
              {renderKeypadButton('5', 'JKL')}
              {renderKeypadButton('6', 'MNO')}
            </View>
            <View className="flex-row">
              {renderKeypadButton('7', 'PQRS')}
              {renderKeypadButton('8', 'TUV')}
              {renderKeypadButton('9', 'WXYZ')}
            </View>
            <View className="flex-row">
              <View className="w-20 h-20 m-2" />
              {renderKeypadButton('0')}
              <Pressable
                onPress={handleDelete}
                className="w-20 h-20 rounded-full items-center justify-center m-2 active:bg-gray-100"
              >
                <Delete size={28} color="#64748B" />
              </Pressable>
            </View>
          </View>

          {/* Forgot Passcode */}
          <Pressable onPress={handleForgotPasscode} className="mt-8">
            <Text className="text-blue-500 font-medium">Forgot Passcode?</Text>
          </Pressable>
        </View>

        {/* Forgot Passcode Modal */}
        <Modal
          visible={showForgotModal}
          animationType="slide"
          transparent
          onRequestClose={closeForgotModal}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 pb-10">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-gray-900">
                  {forgotStep === 'confirm' && 'Forgot Passcode?'}
                  {forgotStep === 'sending' && 'Sending Email...'}
                  {forgotStep === 'sent' && 'Email Sent!'}
                  {forgotStep === 'verify' && 'Enter Code'}
                  {forgotStep === 'newPasscode' && 'New Passcode'}
                </Text>
                <Pressable
                  onPress={closeForgotModal}
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                >
                  <X size={18} color="#64748B" />
                </Pressable>
              </View>

              {/* Confirm Step */}
              {forgotStep === 'confirm' && (
                <Animated.View entering={FadeInDown}>
                  <View className="items-center mb-6">
                    <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-3">
                      <Mail size={32} color="#4A90E2" />
                    </View>
                  </View>
                  <Text className="text-gray-600 text-center mb-2">
                    We'll send a verification code to:
                  </Text>
                  <Text className="text-gray-900 font-semibold text-center text-lg mb-6">
                    {currentUser?.email ?? 'your email'}
                  </Text>
                  <Pressable
                    onPress={sendResetEmail}
                    className="bg-blue-500 py-4 rounded-xl active:bg-blue-600"
                  >
                    <Text className="text-white font-bold text-center text-lg">
                      Send Reset Code
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* Sending Step */}
              {forgotStep === 'sending' && (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color="#4A90E2" />
                  <Text className="text-gray-600 mt-4">Preparing your reset code...</Text>
                </View>
              )}

              {/* Sent Step */}
              {forgotStep === 'sent' && (
                <Animated.View entering={FadeInDown}>
                  <View className="items-center mb-6">
                    <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-3">
                      <Check size={32} color="#22C55E" />
                    </View>
                  </View>
                  <Text className="text-gray-600 text-center mb-2">
                    A verification code has been sent to your email.
                  </Text>
                  <Text className="text-gray-500 text-center text-sm mb-6">
                    Check your email app for the code and enter it below.
                  </Text>
                  <Pressable
                    onPress={() => setForgotStep('verify')}
                    className="bg-blue-500 py-4 rounded-xl active:bg-blue-600"
                  >
                    <Text className="text-white font-bold text-center text-lg">
                      Enter Verification Code
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* Verify Step */}
              {forgotStep === 'verify' && (
                <Animated.View entering={FadeInDown}>
                  <Text className="text-gray-600 text-center mb-4">
                    Enter the 6-digit code from your email
                  </Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 mb-6">
                    <KeyRound size={20} color="#64748B" />
                    <TextInput
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      placeholder="123456"
                      placeholderTextColor="#94A3B8"
                      style={{ flex: 1, marginLeft: 12, fontSize: 18, color: '#111827', textAlign: 'center', letterSpacing: 4 }}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                  <Pressable
                    onPress={handleVerifyCode}
                    disabled={verificationCode.length !== 6}
                    className={`py-4 rounded-xl ${
                      verificationCode.length === 6
                        ? 'bg-blue-500 active:bg-blue-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    <Text className="text-white font-bold text-center text-lg">
                      Verify Code
                    </Text>
                  </Pressable>
                  <Pressable onPress={sendResetEmail} className="mt-4">
                    <Text className="text-blue-500 text-center font-medium">
                      Resend Code
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* New Passcode Step */}
              {forgotStep === 'newPasscode' && (
                <Animated.View entering={FadeInDown}>
                  <View className="items-center mb-6">
                    <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-3">
                      <Check size={32} color="#22C55E" />
                    </View>
                  </View>
                  <Text className="text-gray-600 text-center mb-4">
                    Create a new 4-digit passcode
                  </Text>

                  <View className="mb-4">
                    <Text className="text-gray-700 font-medium mb-2">New Passcode</Text>
                    <TextInput
                      value={newPasscodeInput}
                      onChangeText={setNewPasscodeInput}
                      placeholder="****"
                      placeholderTextColor="#94A3B8"
                      style={{ backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB', color: '#111827', fontSize: 18, textAlign: 'center', letterSpacing: 4 }}
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>

                  <View className="mb-6">
                    <Text className="text-gray-700 font-medium mb-2">Confirm Passcode</Text>
                    <TextInput
                      value={confirmPasscode}
                      onChangeText={setConfirmPasscode}
                      placeholder="****"
                      placeholderTextColor="#94A3B8"
                      style={{ backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB', color: '#111827', fontSize: 18, textAlign: 'center', letterSpacing: 4 }}
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>

                  <Pressable
                    onPress={handleSetNewPasscode}
                    disabled={newPasscodeInput.length !== 4 || confirmPasscode.length !== 4}
                    className={`py-4 rounded-xl ${
                      newPasscodeInput.length === 4 && confirmPasscode.length === 4
                        ? 'bg-green-500 active:bg-green-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    <Text className="text-white font-bold text-center text-lg">
                      Set New Passcode
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
