// Forgot Password Screen - Password recovery
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostyMascot } from '@/components/PostyMascot';
import { useAppStore } from '@/lib/store';
import { ArrowLeft, Mail, KeyRound, Check } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabaseService } from '@/lib/supabase-service';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const setPasscode = useAppStore((s) => s.setPasscode);

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email');
  
  // Store the generated code for local display (verification happens server-side)
  const generatedCodeRef = useRef<string>('');

  // Generate a random 6-digit code
  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Check if user exists in database
      const { exists, hasPassword } = await supabaseService.checkUserExists(email);
      
      if (!exists) {
        setIsLoading(false);
        Alert.alert(
          'Account Not Found',
          'No account found with this email address. Would you like to create an account?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => router.replace('/auth/register') }
          ]
        );
        return;
      }

      if (!hasPassword) {
        setIsLoading(false);
        Alert.alert(
          'Google Account',
          'This account uses Google Sign-In. Please sign in with Google instead.',
          [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
        );
        return;
      }

      // Generate verification code
      const code = generateCode();
      generatedCodeRef.current = code;
      
      // Store the hashed code in database with expiry (server-side verification)
      const tokenResult = await supabaseService.createPasswordResetToken(email, code);
      
      if (!tokenResult.success) {
        setIsLoading(false);
        Alert.alert('Error', tokenResult.error || 'Failed to create reset code. Please try again.');
        return;
      }
      
      // Note: In production, this would send an actual email via a backend service
      // For now, we show the code in the alert for testing purposes
      setEmailSent(true);
      setStep('verify');
      setIsLoading(false);

      Alert.alert(
        'Verification Code',
        `Your verification code is: ${code}\n\nThis code expires in 15 minutes.\n\n(In production, this would be sent to your email)`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Verify the code server-side
      const result = await supabaseService.verifyPasswordResetCode(email, verificationCode);
      
      if (!result.success) {
        setIsLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Invalid Code', result.error || 'The verification code is incorrect or expired.');
        return;
      }

      setIsLoading(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep('reset');
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Reset password with server-side code verification
      const result = await supabaseService.resetPassword(email, verificationCode, newPassword);
      
      if (!result.success) {
        setIsLoading(false);
        Alert.alert('Error', result.error || 'Failed to reset password. Please try again.');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Password Reset!',
        'Your password has been successfully reset. You can now sign in with your new password.',
        [{ text: 'Sign In', onPress: () => router.replace('/auth/login') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
        Forgot Password?
      </Text>
      <Text className="text-gray-500 text-center mb-6">
        Enter your email and we'll send you a code to reset your password
      </Text>

      {/* Email Input */}
      <View className="mb-6">
        <Text className="text-gray-700 font-medium mb-2">Email Address</Text>
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <Mail size={20} color="#64748B" />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Send Code Button */}
      <Pressable
        onPress={handleSendCode}
        disabled={isLoading}
        className={`bg-blue-500 py-4 rounded-xl ${isLoading ? 'opacity-60' : 'active:bg-blue-600'}`}
      >
        <Text className="text-center text-lg font-bold text-white">
          {isLoading ? 'Sending...' : 'Send Reset Code'}
        </Text>
      </Pressable>
    </>
  );

  const renderVerifyStep = () => (
    <>
      <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
        Enter Code
      </Text>
      <Text className="text-gray-500 text-center mb-6">
        We sent a 6-digit code to {email}
      </Text>

      {/* Verification Code Input */}
      <View className="mb-6">
        <Text className="text-gray-700 font-medium mb-2">Verification Code</Text>
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <KeyRound size={20} color="#64748B" />
          <TextInput
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="123456"
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827', textAlign: 'center', letterSpacing: 4 }}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>
      </View>

      {/* Verify Button */}
      <Pressable
        onPress={handleVerifyCode}
        disabled={verificationCode.length !== 6}
        className={`bg-blue-500 py-4 rounded-xl mb-4 ${verificationCode.length !== 6 ? 'opacity-60' : 'active:bg-blue-600'}`}
      >
        <Text className="text-center text-lg font-bold text-white">
          Verify Code
        </Text>
      </Pressable>

      {/* Resend Code */}
      <Pressable onPress={handleSendCode} disabled={isLoading}>
        <Text className="text-blue-500 text-center font-medium">
          {isLoading ? 'Sending...' : 'Resend Code'}
        </Text>
      </Pressable>
    </>
  );

  const renderResetStep = () => (
    <>
      <View className="items-center mb-4">
        <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-3">
          <Check size={32} color="#22C55E" />
        </View>
      </View>
      <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
        Create New Password
      </Text>
      <Text className="text-gray-500 text-center mb-6">
        Enter your new password below
      </Text>

      {/* New Password Input */}
      <View className="mb-4">
        <Text className="text-gray-700 font-medium mb-2">New Password</Text>
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <KeyRound size={20} color="#64748B" />
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
            secureTextEntry
          />
        </View>
      </View>

      {/* Confirm Password Input */}
      <View className="mb-6">
        <Text className="text-gray-700 font-medium mb-2">Confirm Password</Text>
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <KeyRound size={20} color="#64748B" />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
            secureTextEntry
          />
        </View>
      </View>

      {/* Reset Button */}
      <Pressable
        onPress={handleResetPassword}
        disabled={isLoading}
        className={`bg-green-500 py-4 rounded-xl ${isLoading ? 'opacity-60' : 'active:bg-green-600'}`}
      >
        <Text className="text-center text-lg font-bold text-white">
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </Text>
      </Pressable>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#4A90E2', '#7AB3F0']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Header */}
          <View className="flex-row items-center px-4 py-2">
            <Pressable
              onPress={() => {
                if (step === 'email') {
                  router.back();
                } else if (step === 'verify') {
                  setStep('email');
                } else {
                  setStep('verify');
                }
              }}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <ArrowLeft size={24} color="white" />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Posty */}
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              className="items-center mt-4 mb-6"
            >
              <PostyMascot
                size="medium"
                mood={step === 'reset' ? 'celebrating' : 'encouraging'}
                showSpeechBubble
                speechText={
                  step === 'email' ? "Don't worry, I'll help!" :
                  step === 'verify' ? 'Check your email!' :
                  'Almost there!'
                }
              />
            </Animated.View>

            {/* Form Card */}
            <Animated.View
              entering={FadeInDown.delay(400).springify()}
              className="mx-4 bg-white rounded-3xl p-6 shadow-lg"
            >
              {step === 'email' && renderEmailStep()}
              {step === 'verify' && renderVerifyStep()}
              {step === 'reset' && renderResetStep()}

              {/* Back to Login */}
              <View className="flex-row justify-center mt-6">
                <Text className="text-gray-500">Remember your password? </Text>
                <Pressable onPress={() => router.replace('/auth/login')}>
                  <Text className="text-blue-500 font-semibold">Sign In</Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
