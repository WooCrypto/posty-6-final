// Welcome Screen - First screen users see
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Linking, Image, Alert, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Mail, Star, Gift, Facebook, Youtube, Apple, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAppStore } from '@/lib/store';
import { isGoogleAuthConfigured, getGoogleAuthConfig, fetchGoogleUserInfo, getAccessTokenFromUrl, getAuthErrorFromUrl, getPromptAsyncOptions, shouldUseDirectAuth, initiateDirectGoogleAuth } from '@/lib/googleAuth';
import { supabaseService } from '@/lib/supabase-service';

const RosieImage = require('@/assets/rosie.png');
const MiloImage = require('@/assets/milo.png');
const SkyeImage = require('@/assets/skye.png');

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

// Social media icons as SVG paths rendered as text for TikTok and X (Twitter)
const SocialIcon = ({ type, size = 20 }: { type: 'tiktok' | 'x'; size?: number }) => {
  if (type === 'x') {
    return <Text style={{ fontSize: size, color: 'white' }}>𝕏</Text>;
  }
  // TikTok icon
  return <Text style={{ fontSize: size }}>♪</Text>;
};

export default function WelcomeScreen() {
  const router = useRouter();
  const registerWithGoogle = useAppStore((s) => s.registerWithGoogle);
  const loginWithGoogle = useAppStore((s) => s.loginWithGoogle);
  const currentUser = useAppStore((s) => s.currentUser);
  const isOnboarded = useAppStore((s) => s.isOnboarded);
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
      console.log('[GoogleAuth] Found token in URL, processing...');
      setIsGoogleLoading(true);
      handleGoogleResponse(urlToken);
    } else if (urlError) {
      console.log('[GoogleAuth] Found error in URL:', urlError);
      Alert.alert('Sign In Error', `Google sign in failed: ${urlError}`);
    }
  }, []);

  // Handle Google auth response
  useEffect(() => {
    console.log('[GoogleAuth] Response received:', response?.type, response);
    
    if (response?.type === 'success') {
      // Check both authentication object and params for access token
      const accessToken = response.authentication?.accessToken || (response.params as any)?.access_token;
      console.log('[GoogleAuth] Success! Access token from authentication:', response.authentication?.accessToken ? 'present' : 'missing');
      console.log('[GoogleAuth] Access token from params:', (response.params as any)?.access_token ? 'present' : 'missing');
      handleGoogleResponse(accessToken);
    } else if (response?.type === 'error') {
      console.log('[GoogleAuth] Error:', response.error);
      setIsGoogleLoading(false);
      Alert.alert('Sign In Error', 'Failed to sign in with Google. Please try again.');
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      console.log('[GoogleAuth] User cancelled or dismissed');
      setIsGoogleLoading(false);
    } else if (response) {
      console.log('[GoogleAuth] Unknown response type:', response.type);
      setIsGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleResponse = async (accessToken: string | undefined) => {
    console.log('[HomePage.handleGoogleResponse] Starting with accessToken:', accessToken ? 'present' : 'missing');
    
    if (!accessToken) {
      console.log('[HomePage.handleGoogleResponse] No access token, aborting');
      setIsGoogleLoading(false);
      return;
    }

    try {
      console.log('[HomePage.handleGoogleResponse] Fetching user info from Google...');
      const userInfo = await fetchGoogleUserInfo(accessToken);
      console.log('[HomePage.handleGoogleResponse] Google user info:', userInfo ? { email: userInfo.email, name: userInfo.name, id: userInfo.id?.substring(0, 8) + '...' } : 'null');
      
      if (!userInfo) {
        Alert.alert('Error', 'Failed to get user info from Google');
        setIsGoogleLoading(false);
        return;
      }

      // Use store's loginWithGoogle - it handles everything and returns structured result
      console.log('[HomePage.handleGoogleResponse] Attempting store login...');
      const loginResult = await loginWithGoogle(userInfo.email, userInfo.id);
      console.log('[HomePage.handleGoogleResponse] Store login result:', loginResult);
      
      // Helper function to navigate based on state - uses persisted isOnboarded for fast navigation
      const navigateAfterLogin = () => {
        const state = useAppStore.getState();
        console.log('[HomePage.handleGoogleResponse] Navigating based on state:', {
          hasCurrentUser: !!state.currentUser,
          childrenCount: state.currentUser?.children?.length || 0,
          isOnboarded: state.isOnboarded,
          isAuthenticated: state.isAuthenticated,
          isLoadingUserData: state.isLoadingUserData
        });
        
        // For returning users with persisted isOnboarded=true, navigate immediately to dashboard
        if (state.isOnboarded) {
          console.log('[HomePage.handleGoogleResponse] isOnboarded=true, navigating to dashboard');
          router.replace('/parent/(tabs)');
          return;
        }
        
        // For users with children in local state, go to plan selection
        if (state.currentUser?.children && state.currentUser.children.length > 0) {
          console.log('[HomePage.handleGoogleResponse] Has children, navigating to /setup/select-plan');
          router.replace('/setup/select-plan');
          return;
        }
        
        // For new/unknown users where data is still loading, wait briefly for background refresh
        // This prevents misrouting users who have children in DB but not yet in local state
        if (state.isLoadingUserData) {
          console.log('[HomePage.handleGoogleResponse] Data still loading, waiting briefly...');
          // Wait up to 2 seconds for background data to arrive, then navigate
          const checkInterval = setInterval(() => {
            const updatedState = useAppStore.getState();
            if (!updatedState.isLoadingUserData || updatedState.isOnboarded || (updatedState.currentUser?.children?.length ?? 0) > 0) {
              clearInterval(checkInterval);
              // Re-check navigation with updated state
              if (updatedState.isOnboarded) {
                console.log('[HomePage.handleGoogleResponse] Data loaded, navigating to dashboard');
                router.replace('/parent/(tabs)');
              } else if (updatedState.currentUser?.children && updatedState.currentUser.children.length > 0) {
                console.log('[HomePage.handleGoogleResponse] Data loaded, navigating to /setup/select-plan');
                router.replace('/setup/select-plan');
              } else {
                console.log('[HomePage.handleGoogleResponse] Data loaded, navigating to /setup/add-child');
                router.replace('/setup/add-child');
              }
            }
          }, 200);
          // Timeout after 2 seconds - assume new user if data still hasn't loaded
          setTimeout(() => {
            clearInterval(checkInterval);
            const finalState = useAppStore.getState();
            if (!finalState.isOnboarded && (!finalState.currentUser?.children || finalState.currentUser.children.length === 0)) {
              console.log('[HomePage.handleGoogleResponse] Timeout, assuming new user, navigating to /setup/add-child');
              router.replace('/setup/add-child');
            }
          }, 2000);
          return;
        }
        
        // No children and not loading - definitely new user
        console.log('[HomePage.handleGoogleResponse] No children, navigating to /setup/add-child');
        router.replace('/setup/add-child');
      };
      
      if (loginResult.success) {
        // User found and authenticated successfully
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigateAfterLogin();
        setIsGoogleLoading(false);
        return;
      }
      
      // Handle specific error cases based on error code from store
      console.log('[HomePage.handleGoogleResponse] Store login failed with errorCode:', loginResult.errorCode);
      
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
        console.log('[HomePage.handleGoogleResponse] User not found, registering new account...');
        const registerSuccess = await registerWithGoogle(
          userInfo.email,
          userInfo.name,
          userInfo.id
        );
        console.log('[HomePage.handleGoogleResponse] Register result:', registerSuccess);
        
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
      console.log('[HomePage.handleGoogleResponse] Unexpected error, showing generic message');
      Alert.alert('Sign In Error', loginResult.error || 'Unable to sign in. Please try again.');
    } catch (error) {
      console.error('[HomePage.handleGoogleResponse] Exception:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isGoogleAuthConfigured()) {
      Alert.alert(
        'Google Sign In Not Available',
        'Google Sign In is not configured. Please use the Get Started button to create an account.',
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGoogleLoading(true);
    
    // Use direct redirect for mobile web browsers
    if (shouldUseDirectAuth()) {
      console.log('[GoogleAuth] Using direct redirect for mobile web...');
      const success = initiateDirectGoogleAuth();
      if (!success) {
        setIsGoogleLoading(false);
        Alert.alert('Error', 'Failed to open Google Sign In. Please try again.');
      }
      // Don't reset loading - page will redirect
      return;
    }
    
    try {
      console.log('[GoogleAuth] Starting promptAsync...');
      const result = await promptAsync(getPromptAsyncOptions());
      console.log('[GoogleAuth] promptAsync result:', result);
    } catch (error) {
      console.error('[GoogleAuth] promptAsync error:', error);
      setIsGoogleLoading(false);
      Alert.alert('Error', 'Failed to open Google Sign In. Please try again.');
    }
  };

  const openSocialMedia = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  const openTerms = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/terms');
  };

  const openPrivacy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/privacy');
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Floating Trial Bubble - Top Right */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={{
              position: 'absolute',
              top: 8,
              right: 12,
              zIndex: 100,
            }}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/auth/register');
              }}
              style={{
                backgroundColor: '#00FF88',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                ...Platform.select({
                  web: { boxShadow: '0 2px 8px rgba(0, 255, 136, 0.4)' },
                  default: { shadowColor: '#00FF88', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 6 },
                }),
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#1a1a2e',
                  textAlign: 'center',
                }}
              >
                START FREE TRIAL
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '600',
                  color: 'rgba(26, 26, 46, 0.7)',
                  textAlign: 'center',
                }}
              >
                Get Your First Mail!
              </Text>
            </Pressable>
          </Animated.View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Logo */}
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              className="items-center mb-4"
            >
              <Image
                source={require('@/assets/posty-logo.png')}
                style={{ width: 180, height: 180 }}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Title - Fortnite Style */}
            <Animated.View
              entering={FadeInDown.delay(400).springify()}
              className="items-center mb-4"
            >
              <Text
                className="text-center mb-1"
                style={{
                  fontSize: 42,
                  fontWeight: '900',
                  color: '#FFD700',
                  letterSpacing: 2,
                  ...Platform.select({
                    web: { textShadow: '2px 2px 0px #FF6B00' },
                    default: { textShadowColor: '#FF6B00', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
                  }),
                }}
              >
                POSTY
              </Text>
              <Text
                className="text-center"
                style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: '#00FFFF',
                  letterSpacing: 1,
                  ...Platform.select({
                    web: { textShadow: '2px 2px 0px #0066FF' },
                    default: { textShadowColor: '#0066FF', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
                  }),
                }}
              >
                MAGIC MAIL CLUB
              </Text>
            </Animated.View>

            {/* What It Is - Value Proposition */}
            <Animated.View
              entering={FadeInDown.delay(600).springify()}
              className="items-center mb-5"
            >
              <View
                style={{
                  backgroundColor: 'rgba(255,215,0,0.15)',
                  borderRadius: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255,215,0,0.3)',
                }}
              >
                <Text
                  className="text-center"
                  style={{
                    fontSize: 18,
                    color: '#FFD700',
                    fontWeight: '700',
                    marginBottom: 8,
                  }}
                >
                  Turn Chores Into Adventures!
                </Text>
                <Text
                  className="text-center leading-5"
                  style={{
                    fontSize: 14,
                    color: '#E0E0E0',
                    fontWeight: '500',
                  }}
                >
                  A fun app that turns daily chores into games — kids earn points, rewards, and real mail they can't wait to open.
                </Text>
              </View>
            </Animated.View>

            {/* Who It's For */}
            <Animated.View
              entering={FadeInDown.delay(700).springify()}
              className="mb-5"
            >
              <Text
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: '700',
                  letterSpacing: 2,
                  marginBottom: 10,
                  textAlign: 'center',
                }}
              >
                PERFECT FOR
              </Text>
              <View className="flex-row" style={{ gap: 10 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,255,255,0.1)',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(0,255,255,0.2)',
                  }}
                >
                  <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 4 }}>👨‍👩‍👧‍👦</Text>
                  <Text style={{ color: '#00FFFF', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>Parents</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'center', marginTop: 2 }}>
                    Teach responsibility & reward good habits
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,107,107,0.1)',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,107,107,0.2)',
                  }}
                >
                  <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 4 }}>🧒</Text>
                  <Text style={{ color: '#FF6B6B', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>Kids 5-17</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'center', marginTop: 2 }}>
                    Have fun & earn real rewards!
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
                    Chores auto-adjust by age
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* How It Works - 3 Steps */}
            <Animated.View
              entering={FadeInDown.delay(750).springify()}
              className="mb-5"
            >
              <Text
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: '700',
                  letterSpacing: 2,
                  marginBottom: 10,
                  textAlign: 'center',
                }}
              >
                HOW IT WORKS
              </Text>
              <View className="flex-row" style={{ gap: 8 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,255,136,0.1)',
                    borderRadius: 12,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(0,255,136,0.2)',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>📋</Text>
                  <Text style={{ color: '#00FF88', fontWeight: '700', fontSize: 11, textAlign: 'center' }}>1. Parents set chores</Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,215,0,0.1)',
                    borderRadius: 12,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(255,215,0,0.2)',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>⭐</Text>
                  <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 11, textAlign: 'center' }}>2. Kids earn points</Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,107,107,0.1)',
                    borderRadius: 12,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(255,107,107,0.2)',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>🎁</Text>
                  <Text style={{ color: '#FF6B6B', fontWeight: '700', fontSize: 11, textAlign: 'center' }}>3. Posty delivers mail</Text>
                </View>
              </View>
            </Animated.View>

            {/* Why It Matters - Benefits */}
            <Animated.View
              entering={FadeInDown.delay(800).springify()}
              className="mb-5"
            >
              <Text
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: '700',
                  letterSpacing: 2,
                  marginBottom: 10,
                  textAlign: 'center',
                }}
              >
                WHY FAMILIES LOVE IT
              </Text>
              <FeatureItem
                icon={<Star size={24} color="#FFD700" />}
                title="BUILD RESPONSIBILITY"
                description="Age-appropriate daily tasks that teach discipline"
              />
              <FeatureItem
                icon={<Gift size={24} color="#FF6B6B" />}
                title="REAL REWARDS DELIVERED"
                description="Gift cards from Amazon, Roblox, iTunes & more"
              />
              <FeatureItem
                icon={<Mail size={24} color="#00FFFF" />}
                title="EXCITEMENT OF REAL MAIL"
                description="Kids love receiving letters & surprises at home"
              />
            </Animated.View>

            {/* Club Mascots - Static, no animations */}
            <View className="items-center mb-5">
              <Text
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: '600',
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                MEET THE CLUB
              </Text>
              <View className="flex-row items-center justify-center">
                <View className="items-center mx-2">
                  <Image
                    source={RosieImage}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    resizeMode="cover"
                  />
                  <Text style={{ color: '#FFB6C1', fontSize: 10, fontWeight: '600', marginTop: 2 }}>Rosie</Text>
                </View>
                <View className="items-center mx-2">
                  <Image
                    source={MiloImage}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    resizeMode="cover"
                  />
                  <Text style={{ color: '#FFA500', fontSize: 10, fontWeight: '600', marginTop: 2 }}>Milo</Text>
                </View>
                <View className="items-center mx-2">
                  <Image
                    source={SkyeImage}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    resizeMode="cover"
                  />
                  <Text style={{ color: '#87CEEB', fontSize: 10, fontWeight: '600', marginTop: 2 }}>Skye</Text>
                </View>
              </View>
            </View>

            {/* CTA Buttons */}
            <Animated.View
              entering={FadeInUp.delay(1000).springify()}
              className="mb-4"
            >
              {/* Social Proof Line */}
              <Text
                style={{
                  fontSize: 13,
                  color: 'rgba(255,215,0,0.9)',
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                ⭐ Parents report less arguing over chores
              </Text>

              {/* Free Shipping Line */}
              <Text
                style={{
                  fontSize: 14,
                  color: '#00FF88',
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: 10,
                }}
              >
                🎁 Your child's first letter ships FREE
              </Text>

              {/* Primary CTA - Start Free Trial */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/auth/register');
                }}
                style={{
                  backgroundColor: '#00FF88',
                  paddingVertical: 18,
                  borderRadius: 16,
                  marginBottom: 12,
                  ...Platform.select({
                    web: { boxShadow: '0 4px 12px rgba(0, 255, 136, 0.4)' },
                    default: { shadowColor: '#00FF88', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
                  }),
                }}
              >
                <Text
                  className="text-center"
                  style={{
                    fontSize: 20,
                    fontWeight: '900',
                    color: '#1a1a2e',
                    letterSpacing: 1,
                  }}
                >
                  START FREE TRIAL
                </Text>
                <Text
                  className="text-center"
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: 'rgba(26, 26, 46, 0.7)',
                    marginTop: 2,
                  }}
                >
                  No credit card required
                </Text>
              </Pressable>

              {/* Google Sign In Button */}
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={isGoogleLoading}
                style={{
                  backgroundColor: 'white',
                  paddingVertical: 14,
                  borderRadius: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isGoogleLoading ? 0.7 : 1,
                }}
              >
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  style={{ width: 20, height: 20, marginRight: 10 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#333',
                  }}
                >
                  {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
                </Text>
              </Pressable>

              {/* Sign In */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/auth/login');
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  paddingVertical: 14,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: '#00FFFF',
                }}
              >
                <Text
                  className="text-center"
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#00FFFF',
                    letterSpacing: 0.5,
                  }}
                >
                  SIGN IN
                </Text>
              </Pressable>

              {/* Trust Line for Parents */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 12,
                  paddingHorizontal: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: '500',
                    textAlign: 'center',
                  }}
                >
                  🔒 Parent-controlled • Safe for kids • Cancel anytime
                </Text>
              </View>
            </Animated.View>

            {/* Social Media Icons */}
            <Animated.View
              entering={FadeInUp.delay(1200).springify()}
              className="items-center mb-6"
            >
              <Text className="text-white/60 text-sm mb-3 font-medium">Follow us</Text>
              <View className="flex-row justify-center space-x-4">
                <Pressable
                  onPress={() => openSocialMedia('https://www.facebook.com/share/1C4VEhb72N/?mibextid=wwXIfr')}
                  className="w-12 h-12 rounded-full bg-blue-600 items-center justify-center mr-3"
                >
                  <Facebook size={24} color="white" />
                </Pressable>
                <Pressable
                  onPress={() => openSocialMedia('https://x.com/magicmailclub')}
                  className="w-12 h-12 rounded-full bg-black items-center justify-center mr-3"
                >
                  <SocialIcon type="x" size={22} />
                </Pressable>
                <Pressable
                  onPress={() => openSocialMedia('https://www.youtube.com/@PostyMagicMailClub')}
                  className="w-12 h-12 rounded-full bg-red-600 items-center justify-center mr-3"
                >
                  <Youtube size={24} color="white" />
                </Pressable>
                <Pressable
                  onPress={() => openSocialMedia('https://www.tiktok.com/@postymagic')}
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#000' }}
                >
                  <Text style={{ fontSize: 20, color: '#00f2ea' }}>♪</Text>
                </Pressable>
              </View>
            </Animated.View>

            {/* App Store Coming Soon */}
            <Animated.View
              entering={FadeInUp.delay(1300).springify()}
              className="items-center mb-6"
            >
              <Text className="text-white/60 text-sm mb-3 font-medium">Coming Soon</Text>
              <View className="flex-row justify-center" style={{ gap: 12 }}>
                {/* App Store Badge */}
                <View
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)',
                    minWidth: 130,
                  }}
                >
                  <Apple size={24} color="white" style={{ marginRight: 8 }} />
                  <View>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>Download on the</Text>
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>App Store</Text>
                  </View>
                </View>

                {/* Google Play Badge */}
                <View
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)',
                    minWidth: 130,
                  }}
                >
                  <Play size={24} color="#34A853" fill="#34A853" style={{ marginRight: 8 }} />
                  <View>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>GET IT ON</Text>
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Google Play</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Footer - Terms & Privacy */}
            <Animated.View
              entering={FadeInUp.delay(1400).springify()}
              className="items-center"
            >
              <View className="flex-row items-center">
                <Pressable onPress={openTerms}>
                  <Text className="text-white/50 text-xs underline">Terms of Service</Text>
                </Pressable>
                <Text className="text-white/30 mx-2">|</Text>
                <Pressable onPress={openPrivacy}>
                  <Text className="text-white/50 text-xs underline">Privacy Policy</Text>
                </Pressable>
              </View>
              <Text className="text-white/30 text-xs mt-2">
                © 2026 Posty Magic Mail Club
              </Text>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <View
      className="flex-row items-center rounded-xl px-4 py-3 mb-3"
      style={{
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <View
        className="w-12 h-12 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text
          style={{
            color: '#FFD700',
            fontWeight: '700',
            fontSize: 14,
            letterSpacing: 1,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
          {description}
        </Text>
      </View>
    </View>
  );
}
