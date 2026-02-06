// Login Screen - Parent login with Google Sign-In
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostyMascot } from '@/components/PostyMascot';
import { useAppStore } from '@/lib/store';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { isGoogleAuthConfigured, getGoogleAuthConfig, fetchGoogleUserInfo, getPromptAsyncOptions, getAccessTokenFromUrl, getAuthErrorFromUrl, shouldUseDirectAuth, initiateDirectGoogleAuth } from '@/lib/googleAuth';
import { supabaseService } from '@/lib/supabase-service';
import { generateVerificationCode } from '@/lib/email-service';

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const login = useAppStore((s) => s.login);
  const loginWithGoogle = useAppStore((s) => s.loginWithGoogle);
  const registerWithGoogle = useAppStore((s) => s.registerWithGoogle);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      console.log('[GoogleAuth Login] Found token in URL, processing...');
      setIsGoogleLoading(true);
      handleGoogleResponse(urlToken);
    } else if (urlError) {
      console.log('[GoogleAuth Login] Found error in URL:', urlError);
      Alert.alert('Sign In Error', `Google sign in failed: ${urlError}`);
    }
  }, []);

  // Handle Google auth response
  useEffect(() => {
    console.log('[GoogleAuth Login] Response received:', response?.type, response);
    
    if (response?.type === 'success') {
      // Check both authentication object and params for access token
      const accessToken = response.authentication?.accessToken || (response.params as any)?.access_token;
      console.log('[GoogleAuth Login] Success! Access token from authentication:', response.authentication?.accessToken ? 'present' : 'missing');
      console.log('[GoogleAuth Login] Access token from params:', (response.params as any)?.access_token ? 'present' : 'missing');
      handleGoogleResponse(accessToken);
    } else if (response?.type === 'error') {
      console.log('[GoogleAuth Login] Error:', response.error);
      setIsGoogleLoading(false);
      Alert.alert('Sign In Error', 'Failed to sign in with Google. Please try again.');
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      console.log('[GoogleAuth Login] User cancelled or dismissed');
      setIsGoogleLoading(false);
    } else if (response) {
      console.log('[GoogleAuth Login] Unknown response type:', response.type);
      setIsGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleResponse = async (accessToken: string | undefined) => {
    console.log('[LoginPage.handleGoogleResponse] Starting with accessToken:', accessToken ? 'present' : 'missing');
    
    if (!accessToken) {
      console.log('[LoginPage.handleGoogleResponse] No access token, aborting');
      setIsGoogleLoading(false);
      return;
    }

    try {
      console.log('[LoginPage.handleGoogleResponse] Fetching user info from Google...');
      const userInfo = await fetchGoogleUserInfo(accessToken);
      console.log('[LoginPage.handleGoogleResponse] Google user info:', userInfo ? { email: userInfo.email, name: userInfo.name, id: userInfo.id?.substring(0, 8) + '...' } : 'null');
      
      if (!userInfo) {
        Alert.alert('Error', 'Failed to get user info from Google');
        setIsGoogleLoading(false);
        return;
      }

      // Use store's loginWithGoogle - it handles everything and returns structured result
      console.log('[LoginPage.handleGoogleResponse] Attempting store login...');
      const loginResult = await loginWithGoogle(userInfo.email, userInfo.id);
      console.log('[LoginPage.handleGoogleResponse] Store login result:', loginResult);
      
      // Helper function to navigate based on state
      const navigateAfterLogin = () => {
        const state = useAppStore.getState();
        console.log('[LoginPage.handleGoogleResponse] Navigating based on state:', {
          hasCurrentUser: !!state.currentUser,
          childrenCount: state.currentUser?.children?.length || 0,
          isOnboarded: state.isOnboarded,
          isAuthenticated: state.isAuthenticated
        });
        
        if (state.currentUser?.children && state.currentUser.children.length > 0 && state.isOnboarded) {
          console.log('[LoginPage.handleGoogleResponse] Navigating to /parent/(tabs)');
          router.replace('/parent/(tabs)');
        } else if (state.currentUser?.children && state.currentUser.children.length > 0) {
          console.log('[LoginPage.handleGoogleResponse] Navigating to /setup/select-plan');
          router.replace('/setup/select-plan');
        } else {
          console.log('[LoginPage.handleGoogleResponse] Navigating to /setup/add-child');
          router.replace('/setup/add-child');
        }
      };
      
      if (loginResult.success) {
        // User found and authenticated successfully
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigateAfterLogin();
        setIsGoogleLoading(false);
        return;
      }
      
      // Handle specific error cases based on error code from store
      console.log('[LoginPage.handleGoogleResponse] Store login failed with errorCode:', loginResult.errorCode);
      
      if (loginResult.errorCode === 'GOOGLE_ID_MISMATCH') {
        Alert.alert(
          'Different Google Account',
          'This email is already linked to a different Google account. Please sign in with your original Google account or use email/password.',
          [{ text: 'OK' }]
        );
        setIsGoogleLoading(false);
        return;
      }
      
      if (loginResult.errorCode === 'NETWORK_ERROR' || loginResult.errorCode === 'NOT_CONFIGURED') {
        Alert.alert(
          'Connection Error', 
          loginResult.error || 'Unable to connect. Please check your internet connection and try again.',
          [{ text: 'Try Again', onPress: () => handleGoogleSignIn() }, { text: 'Cancel', style: 'cancel' }]
        );
        setIsGoogleLoading(false);
        return;
      }
      
      // Only register if user truly doesn't exist (NOT_FOUND)
      if (loginResult.errorCode === 'NOT_FOUND') {
        console.log('[LoginPage.handleGoogleResponse] User not found, registering new account...');
        const registerSuccess = await registerWithGoogle(
          userInfo.email,
          userInfo.name,
          userInfo.id
        );
        console.log('[LoginPage.handleGoogleResponse] Register result:', registerSuccess);
        
        if (registerSuccess) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/setup/add-child');
        } else {
          Alert.alert('Error', 'Failed to create account. Please try again.');
        }
        setIsGoogleLoading(false);
        return;
      }
      
      // Fallback for any unexpected error
      console.log('[LoginPage.handleGoogleResponse] Unexpected error, showing generic message');
      Alert.alert('Sign In Error', loginResult.error || 'Unable to sign in. Please try again.');
    } catch (error) {
      console.error('[LoginPage.handleGoogleResponse] Exception:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    if (!password) {
      Alert.alert('Missing Password', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const success = await login(email, password);
      if (success) {
        // Get the updated state after login - the store now handles verification check
        const state = useAppStore.getState();
        
        // Check if user needs email verification
        if (state.pendingVerificationEmail || !state.isAuthenticated) {
          // Send a new verification code and redirect to verification page
          const verificationCode = generateVerificationCode();
          await supabaseService.sendEmailVerification(email, verificationCode, state.currentUser?.name || 'User');
          
          router.replace({
            pathname: '/auth/verify-email',
            params: { email: email.toLowerCase() }
          });
          return;
        }
        
        const updatedUser = state.currentUser;
        const isOnboarded = state.isOnboarded;

        // Navigate based on whether onboarding is complete
        if (updatedUser?.children && updatedUser.children.length > 0 && isOnboarded) {
          router.replace('/parent/(tabs)');
        } else if (updatedUser?.children && updatedUser.children.length > 0) {
          // Has children but not fully onboarded - go to plan selection
          router.replace('/setup/select-plan');
        } else {
          router.replace('/setup/add-child');
        }
      } else {
        Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isGoogleAuthConfigured()) {
      Alert.alert(
        'Google Sign In Not Available',
        'Google Sign In is not configured for this app. Please use email login instead.',
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGoogleLoading(true);
    
    // Use direct redirect for mobile web browsers
    if (shouldUseDirectAuth()) {
      console.log('[GoogleAuth Login] Using direct redirect for mobile web...');
      const success = initiateDirectGoogleAuth();
      if (!success) {
        setIsGoogleLoading(false);
        Alert.alert('Error', 'Failed to open Google Sign In. Please try again.');
      }
      // Don't reset loading - page will redirect
      return;
    }
    
    try {
      console.log('[GoogleAuth Login] Starting promptAsync...');
      const result = await promptAsync(getPromptAsyncOptions());
      console.log('[GoogleAuth Login] promptAsync result:', result);
    } catch (error) {
      console.error('[GoogleAuth Login] promptAsync error:', error);
      setIsGoogleLoading(false);
      Alert.alert('Error', 'Failed to open Google Sign In. Please try again.');
    }
  };

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
              onPress={() => router.back()}
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
              className="items-center mt-8 mb-8"
            >
              <PostyMascot
                size="large"
                mood="happy"
                showSpeechBubble
                speechText="Welcome back!"
              />
            </Animated.View>

            {/* Form Card */}
            <Animated.View
              entering={FadeInDown.delay(400).springify()}
              className="mx-4 bg-white rounded-3xl p-6 shadow-lg"
            >
              <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                Welcome Back
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                Sign in to continue
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

              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Email</Text>
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

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Password</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <Lock size={20} color="#64748B" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color="#64748B" />
                    ) : (
                      <Eye size={20} color="#64748B" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Forgot Password Link */}
              <Pressable
                onPress={() => router.push('/auth/forgot-password')}
                className="mb-4"
              >
                <Text className="text-blue-500 text-right font-medium">
                  Forgot Password?
                </Text>
              </Pressable>

              {/* Login Button */}
              <Pressable
                onPress={handleLogin}
                disabled={isLoading}
                className={`bg-blue-500 py-4 rounded-xl ${isLoading ? 'opacity-60' : 'active:bg-blue-600'}`}
              >
                <Text className="text-center text-lg font-bold text-white">
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Text>
              </Pressable>

              {/* Register Link */}
              <View className="flex-row justify-center mt-4">
                <Text className="text-gray-500">Don't have an account? </Text>
                <Pressable onPress={() => router.replace('/auth/register')}>
                  <Text className="text-blue-500 font-semibold">Sign Up</Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
