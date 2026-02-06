// Register Screen - Parent account creation with Google Sign-In
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/lib/store';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Check } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { fetchGoogleUserInfo, isGoogleAuthConfigured, getGoogleAuthConfig, getPromptAsyncOptions, getAccessTokenFromUrl, getAuthErrorFromUrl, shouldUseDirectAuth, initiateDirectGoogleAuth } from '@/lib/googleAuth';
import { supabaseService } from '@/lib/supabase-service';
import { generateVerificationCode } from '@/lib/email-service';

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAppStore((s) => s.register);
  const registerWithGoogle = useAppStore((s) => s.registerWithGoogle);
  const loginWithGoogle = useAppStore((s) => s.loginWithGoogle);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Google Auth configuration - use the new config function
  const googleAuthConfig = getGoogleAuthConfig();
  const [request, response, promptAsync] = Google.useAuthRequest(
    googleAuthConfig ?? { clientId: '' }
  );

  // Check for access token in URL on mount (fallback for web redirect)
  useEffect(() => {
    const urlToken = getAccessTokenFromUrl();
    const urlError = getAuthErrorFromUrl();
    
    if (urlToken) {
      console.log('[GoogleAuth Register] Found token in URL, processing...');
      setIsGoogleLoading(true);
      handleGoogleResponse(urlToken);
    } else if (urlError) {
      console.log('[GoogleAuth Register] Found error in URL:', urlError);
      Alert.alert('Sign Up Error', `Google sign up failed: ${urlError}`);
    }
  }, []);

  // Handle Google auth response
  useEffect(() => {
    console.log('[GoogleAuth Register] Response received:', response?.type, response);
    
    if (response?.type === 'success') {
      const accessToken = response.authentication?.accessToken || (response.params as any)?.access_token;
      console.log('[GoogleAuth Register] Success! Access token from authentication:', response.authentication?.accessToken ? 'present' : 'missing');
      console.log('[GoogleAuth Register] Access token from params:', (response.params as any)?.access_token ? 'present' : 'missing');
      handleGoogleResponse(accessToken);
    } else if (response?.type === 'error') {
      console.log('[GoogleAuth Register] Error:', response.error);
      setIsGoogleLoading(false);
      Alert.alert('Sign Up Error', 'Failed to sign up with Google. Please try again.');
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      console.log('[GoogleAuth Register] User cancelled or dismissed');
      setIsGoogleLoading(false);
    } else if (response) {
      console.log('[GoogleAuth Register] Unknown response type:', response.type);
      setIsGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleResponse = async (accessToken: string | undefined) => {
    if (!accessToken) {
      setIsGoogleLoading(false);
      return;
    }

    try {
      const userInfo = await fetchGoogleUserInfo(accessToken);
      if (!userInfo) {
        Alert.alert('Error', 'Failed to get user info from Google');
        setIsGoogleLoading(false);
        return;
      }

      // Try to log in first (existing user)
      const loginResult = await loginWithGoogle(userInfo.email, userInfo.id);
      console.log('[RegisterPage.handleGoogleResponse] Store login result:', loginResult);
      
      if (loginResult.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigate based on onboarding status
        const state = useAppStore.getState();
        if (state.currentUser?.children && state.currentUser.children.length > 0 && state.isOnboarded) {
          router.replace('/parent/(tabs)');
        } else if (state.currentUser?.children && state.currentUser.children.length > 0) {
          router.replace('/setup/select-plan');
        } else {
          router.replace('/setup/add-child');
        }
      } else if (loginResult.errorCode === 'NOT_FOUND') {
        // New user - register with Google
        const registerSuccess = await registerWithGoogle(
          userInfo.email,
          userInfo.name,
          userInfo.id
        );
        if (registerSuccess) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/setup/add-child');
        } else {
          Alert.alert('Error', 'Failed to create account. Please try again.');
        }
      } else if (loginResult.errorCode === 'GOOGLE_ID_MISMATCH') {
        Alert.alert(
          'Different Google Account',
          'This email is already linked to a different Google account. Please sign in with your original Google account or use email/password.',
          [{ text: 'OK' }]
        );
      } else if (loginResult.errorCode === 'NETWORK_ERROR' || loginResult.errorCode === 'NOT_CONFIGURED') {
        Alert.alert(
          'Connection Error', 
          loginResult.error || 'Unable to connect. Please check your internet connection and try again.',
          [{ text: 'Try Again', onPress: () => handleGoogleSignIn() }, { text: 'Cancel', style: 'cancel' }]
        );
      } else {
        Alert.alert('Error', loginResult.error || 'Failed to sign in. Please try again.');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!agreedToTerms) {
      Alert.alert('Terms Required', 'Please agree to the Terms of Service and Privacy Policy');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter your name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const success = await register(email, password, name);
      if (success) {
        // Generate and send verification code
        const verificationCode = generateVerificationCode();
        await supabaseService.sendEmailVerification(email, verificationCode, name);
        
        // Redirect to email verification page
        router.replace({
          pathname: '/auth/verify-email',
          params: { email: email.toLowerCase() }
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error?.message || '';
      
      // Check if user already exists
      if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists') || errorMessage.includes('users_email_key')) {
        Alert.alert(
          'Account Already Exists',
          'An account with this email already exists. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.replace('/auth/login') }
          ]
        );
      } else {
        Alert.alert('Error', errorMessage || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isGoogleAuthConfigured()) {
      Alert.alert(
        'Google Sign In Not Available',
        'Google Sign In is not configured for this app. Please use email registration instead.',
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGoogleLoading(true);
    
    // Use direct redirect for mobile web browsers
    if (shouldUseDirectAuth()) {
      console.log('[GoogleAuth Register] Using direct redirect for mobile web...');
      const success = initiateDirectGoogleAuth();
      if (!success) {
        setIsGoogleLoading(false);
        Alert.alert('Error', 'Failed to open Google Sign Up. Please try again.');
      }
      // Don't reset loading - page will redirect
      return;
    }
    
    try {
      console.log('[GoogleAuth Register] Starting promptAsync...');
      const result = await promptAsync(getPromptAsyncOptions());
      console.log('[GoogleAuth Register] promptAsync result:', result);
    } catch (error) {
      console.error('[GoogleAuth Register] promptAsync error:', error);
      setIsGoogleLoading(false);
      Alert.alert('Error', 'Failed to open Google Sign Up. Please try again.');
    }
  };

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

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              className="items-center mt-2 mb-4"
            >
              <Image
                source={require('@/assets/posty-logo.png')}
                style={{ width: 100, height: 100 }}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Form Card */}
            <Animated.View
              entering={FadeInDown.delay(400).springify()}
              className="mx-4 bg-white rounded-3xl p-6 shadow-lg"
            >
              <Text className="text-2xl font-bold text-gray-900 text-center mb-1">
                Create Account
              </Text>
              <Text className="text-gray-500 text-center mb-5">
                Join Posty Magic Mail Club
              </Text>

              {/* Google Sign In Button - Always show */}
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className={`flex-row items-center justify-center bg-white border-2 border-gray-200 py-3 rounded-xl mb-4 ${
                  isGoogleLoading ? 'opacity-60' : 'active:bg-gray-50'
                }`}
              >
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  style={{ width: 20, height: 20, marginRight: 8 }}
                />
                <Text className="text-gray-700 font-semibold">
                  {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
                </Text>
              </Pressable>

              {/* Divider */}
              <View className="flex-row items-center mb-4">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="text-gray-400 mx-4 text-sm">or</Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>

              {/* Name Input */}
              <View className="mb-3">
                <Text className="text-gray-700 font-medium mb-1.5 text-sm">Your Name</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <User size={18} color="#64748B" />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email Input */}
              <View className="mb-3">
                <Text className="text-gray-700 font-medium mb-1.5 text-sm">Email</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <Mail size={18} color="#64748B" />
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

              {/* Password Input */}
              <View className="mb-3">
                <Text className="text-gray-700 font-medium mb-1.5 text-sm">Password</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <Lock size={18} color="#64748B" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create a password"
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={18} color="#64748B" />
                    ) : (
                      <Eye size={18} color="#64748B" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-1.5 text-sm">Confirm Password</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <Lock size={18} color="#64748B" />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>

              {/* Terms Checkbox */}
              <Pressable
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                className="flex-row items-start mb-5"
              >
                <View
                  className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 mt-0.5 ${
                    agreedToTerms ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}
                >
                  {agreedToTerms && <Check size={12} color="white" />}
                </View>
                <Text className="flex-1 text-gray-600 text-sm leading-5">
                  I am a parent or legal guardian and agree to the{' '}
                  <Text
                    className="text-blue-500 underline"
                    onPress={() => router.push('/terms')}
                  >
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text
                    className="text-blue-500 underline"
                    onPress={() => router.push('/privacy')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </Pressable>

              {/* Register Button */}
              <Pressable
                onPress={handleRegister}
                disabled={isLoading}
                style={{
                  backgroundColor: agreedToTerms ? '#FFD700' : '#E0E0E0',
                  paddingVertical: 14,
                  borderRadius: 12,
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                <Text
                  className="text-center text-lg font-bold"
                  style={{ color: agreedToTerms ? '#1a1a2e' : '#888' }}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </Pressable>

              {/* Login Link */}
              <View className="flex-row justify-center mt-4">
                <Text className="text-gray-500">Already have an account? </Text>
                <Pressable onPress={() => router.replace('/auth/login')}>
                  <Text className="text-blue-500 font-semibold">Sign In</Text>
                </Pressable>
              </View>
            </Animated.View>

            {/* Footer */}
            <View className="items-center mt-6">
              <View className="flex-row items-center">
                <Pressable onPress={() => router.push('/terms')}>
                  <Text className="text-white/50 text-xs underline">Terms</Text>
                </Pressable>
                <Text className="text-white/30 mx-2">|</Text>
                <Pressable onPress={() => router.push('/privacy')}>
                  <Text className="text-white/50 text-xs underline">Privacy</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
