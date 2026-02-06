// Email Verification Screen - Verify email after signup
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Mail, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/lib/store';
import { PostyMascot } from '@/components/PostyMascot';

const PostyLogo = require('@/assets/posty-logo.png');

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = (params.email as string) || '';
  
  const verifyEmail = useAppStore((s) => s.verifyEmail);
  const resendVerificationCode = useAppStore((s) => s.resendVerificationCode);
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  
  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);
  
  const handleCodeChange = (text: string, index: number) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    
    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all digits entered
    if (digit && index === 5 && newCode.every(d => d)) {
      handleVerify(newCode.join(''));
    }
  };
  
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handleVerify = async (verificationCode?: string) => {
    const fullCode = verificationCode || code.join('');
    
    if (fullCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter all 6 digits');
      return;
    }
    
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const success = await verifyEmail(email, fullCode);
      
      if (success) {
        setIsVerified(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Wait a moment to show success, then navigate based on onboarding state
        setTimeout(() => {
          const state = useAppStore.getState();
          const currentUser = state.currentUser;
          const isOnboarded = state.isOnboarded;
          
          if (currentUser?.children && currentUser.children.length > 0 && isOnboarded) {
            router.replace('/parent/(tabs)');
          } else if (currentUser?.children && currentUser.children.length > 0) {
            router.replace('/setup/select-plan');
          } else {
            router.replace('/setup/add-child');
          }
        }, 1500);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Invalid Code', 'The verification code is incorrect or has expired. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResend = async () => {
    if (resendCountdown > 0) return;
    
    setIsResending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const success = await resendVerificationCode(email);
      
      if (success) {
        setResendCountdown(60); // 60 second cooldown
        Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      } else {
        Alert.alert('Error', 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      console.error('Resend error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
    }
  };
  
  if (isVerified) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View entering={FadeInUp.springify()} className="items-center">
              <View className="w-24 h-24 rounded-full bg-green-500 items-center justify-center mb-6">
                <CheckCircle size={60} color="white" />
              </View>
              <Text className="text-3xl font-bold text-white mb-2">Email Verified!</Text>
              <Text className="text-white/70 text-center px-8">
                Welcome to Posty Magic Mail Club! Setting up your account...
              </Text>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }
  
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Header */}
          <View className="flex-row items-center px-4 py-2">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <ArrowLeft size={24} color="white" />
            </Pressable>
          </View>
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View className="flex-1 justify-center px-6">
              {/* Posty Welcome */}
              <Animated.View
                entering={FadeInDown.delay(200).springify()}
                className="items-center mb-8"
              >
                <PostyMascot
                  size="large"
                  mood="excited"
                  showSpeechBubble
                  speechText="Check your email!"
                />
              </Animated.View>
              
              {/* Title */}
              <Animated.View
                entering={FadeInDown.delay(300).springify()}
                className="items-center mb-8"
              >
                <Text className="text-2xl font-bold text-white mb-2">
                  Verify Your Email
                </Text>
                <Text className="text-white/70 text-center px-4">
                  Posty from Magic Mail Club welcomes you! We've sent a 6-digit code to:
                </Text>
                <Text className="text-cyan-400 font-semibold mt-2">{email}</Text>
              </Animated.View>
              
              {/* Code Input */}
              <Animated.View
                entering={FadeInDown.delay(400).springify()}
                className="mb-8"
              >
                <View className="flex-row justify-center gap-2">
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { inputRefs.current[index] = ref; }}
                      value={digit}
                      onChangeText={(text) => handleCodeChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      style={{
                        width: 48,
                        height: 56,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: digit ? '#FFD700' : 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}
                    />
                  ))}
                </View>
              </Animated.View>
              
              {/* Verify Button */}
              <Animated.View entering={FadeInDown.delay(500).springify()}>
                <Pressable
                  onPress={() => handleVerify()}
                  disabled={isLoading || code.some(d => !d)}
                  style={{
                    backgroundColor: code.every(d => d) ? '#FFD700' : 'rgba(255,255,255,0.2)',
                    paddingVertical: 16,
                    borderRadius: 14,
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  <Text
                    className="text-center text-lg font-bold"
                    style={{ color: code.every(d => d) ? '#1a1a2e' : 'rgba(255,255,255,0.5)' }}
                  >
                    {isLoading ? 'Verifying...' : 'Verify Email'}
                  </Text>
                </Pressable>
              </Animated.View>
              
              {/* Resend Code */}
              <Animated.View
                entering={FadeInDown.delay(600).springify()}
                className="items-center mt-6"
              >
                <Text className="text-white/60 mb-2">Didn't receive the code?</Text>
                <Pressable
                  onPress={handleResend}
                  disabled={isResending || resendCountdown > 0}
                  className="flex-row items-center"
                >
                  <RefreshCw
                    size={16}
                    color={resendCountdown > 0 ? 'rgba(255,255,255,0.3)' : '#4FC3F7'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: resendCountdown > 0 ? 'rgba(255,255,255,0.3)' : '#4FC3F7',
                      fontWeight: '600',
                    }}
                  >
                    {isResending
                      ? 'Sending...'
                      : resendCountdown > 0
                      ? `Resend in ${resendCountdown}s`
                      : 'Resend Code'}
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
