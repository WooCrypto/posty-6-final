// Parent Profile Tab - Account settings and management
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Share, Platform, Image, ActionSheetIOS, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { PostyAvatar } from '@/components/PostyMascot';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import {
  User,
  CreditCard,
  MapPin,
  Lock,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Mail,
  Shield,
  Crown,
  Edit3,
  Share2,
  Camera,
  PlayCircle,
  Snowflake,
  Phone,
  Download,
  Apple,
  Play,
} from 'lucide-react-native';
import { AppFooter } from '@/components/AppFooter';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { SUBSCRIPTION_PLANS } from '@/lib/types';

export default function ParentProfileScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const updateUserAvatar = useAppStore((s) => s.updateUserAvatar);
  const weatherEffectsEnabled = useAppStore((s) => s.weatherEffectsEnabled);
  const toggleWeatherEffects = useAppStore((s) => s.toggleWeatherEffects);
  const currentSeason = useAppStore((s) => s.currentSeason);
  const [showTutorial, setShowTutorial] = useState(false);

  const subscription = currentUser?.subscription;
  const shippingAddress = currentUser?.shippingAddress;

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleSubscriptionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/parent/change-plan');
  };

  const handleShippingPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/parent/edit-shipping');
  };

  const handlePasscodePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/parent/change-passcode');
  };

  const handlePasswordPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/parent/change-password');
  };

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/parent/edit-profile');
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: 'Check out Posty Magic Mail Club! Kids earn real mail rewards by completing fun daily tasks.\n\nhttps://magicmailclub.org',
        url: 'https://magicmailclub.org',
        title: 'Posty Magic Mail Club',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleCallSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('tel:+18434181006');
  };

  const handleChangePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const options = ['Take Photo', 'Choose from Library', 'Cancel'];
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) takePhoto();
          else if (buttonIndex === 1) pickImage();
        }
      );
    } else {
      Alert.alert('Change Photo', 'Choose an option', [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateUserAvatar(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateUserAvatar(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const getPlanIcon = () => {
    if (subscription?.plan === 'premium') return <Crown size={20} color="#A78BFA" />;
    return <CreditCard size={20} color="#4A90E2" />;
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View className="px-5 py-3 bg-white shadow-sm" style={{ elevation: 2 }}>
          <Text className="text-xl font-bold text-gray-900">Profile</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm"
          >
            <View className="flex-row items-center">
              <Pressable onPress={handleChangePhoto} className="relative mr-4">
                <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center overflow-hidden">
                  {currentUser?.avatar ? (
                    <Image
                      source={{ uri: currentUser.avatar }}
                      style={{ width: 64, height: 64 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <User size={32} color="#4A90E2" />
                  )}
                </View>
                <View className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-500 items-center justify-center border-2 border-white">
                  <Camera size={12} color="white" />
                </View>
              </Pressable>
              <Pressable
                onPress={handleEditProfile}
                className="flex-1 active:opacity-70"
              >
                <View className="flex-row items-center">
                  <Text className="text-xl font-bold text-gray-900">
                    {currentUser?.name ?? 'Parent'}
                  </Text>
                  <Edit3 size={16} color="#4A90E2" className="ml-2" style={{ marginLeft: 8 }} />
                </View>
                <Text className="text-gray-500">{currentUser?.email}</Text>
                <Text className="text-blue-500 text-sm mt-1">Tap to edit profile</Text>
              </Pressable>
              <PostyAvatar size={40} />
            </View>
          </Animated.View>

          {/* Subscription Section */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden"
          >
            <View className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <Text className="text-gray-500 font-semibold text-sm uppercase tracking-wide">
                Subscription
              </Text>
            </View>

            <Pressable
              onPress={handleSubscriptionPress}
              className="flex-row items-center px-4 py-4 active:bg-gray-50"
            >
              <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                {getPlanIcon()}
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">
                  {subscription ? SUBSCRIPTION_PLANS[subscription.plan].name : 'No Plan'}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {subscription
                    ? `$${subscription.price}/month • ${subscription.mailsPerMonth} mails`
                    : 'Subscribe to start'}
                </Text>
              </View>
              <View className="flex-row items-center">
                {subscription?.status === 'active' && (
                  <View className="bg-green-100 px-2 py-1 rounded-full mr-2">
                    <Text className="text-green-700 text-xs font-medium">Active</Text>
                  </View>
                )}
                <ChevronRight size={20} color="#94A3B8" />
              </View>
            </Pressable>
          </Animated.View>

          {/* Settings Section */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden"
          >
            <View className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <Text className="text-gray-500 font-semibold text-sm uppercase tracking-wide">
                Settings
              </Text>
            </View>

            <Pressable
              onPress={handleShippingPress}
              className="flex-row items-center px-4 py-4 border-b border-gray-100 active:bg-gray-50"
            >
              <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-3">
                <MapPin size={20} color="#22C55E" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Shipping Address</Text>
                <Text className="text-gray-500 text-sm" numberOfLines={1}>
                  {shippingAddress
                    ? `${shippingAddress.street}, ${shippingAddress.city}`
                    : 'Not set'}
                </Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </Pressable>

            <Pressable
              onPress={handlePasscodePress}
              className="flex-row items-center px-4 py-4 border-b border-gray-100 active:bg-gray-50"
            >
              <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mr-3">
                <Lock size={20} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Parent Passcode</Text>
                <Text className="text-gray-500 text-sm">Change or reset your PIN</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </Pressable>

            <Pressable
              onPress={handlePasswordPress}
              className="flex-row items-center px-4 py-4 active:bg-gray-50"
            >
              <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                <Shield size={20} color="#4A90E2" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Change Password</Text>
                <Text className="text-gray-500 text-sm">Update your account password</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </Pressable>
          </Animated.View>

          {/* Appearance Section */}
          <Animated.View
            entering={FadeInDown.delay(350).springify()}
            className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden"
          >
            <View className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <Text className="text-gray-500 font-semibold text-sm uppercase tracking-wide">
                Appearance
              </Text>
            </View>

            <View className="flex-row items-center px-4 py-4">
              <View className="w-10 h-10 rounded-full bg-cyan-50 items-center justify-center mr-3">
                <Snowflake size={20} color="#06B6D4" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Seasonal Effects</Text>
                <Text className="text-gray-500 text-sm">
                  {weatherEffectsEnabled 
                    ? `${currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)} effects active` 
                    : 'Snow, leaves, and more'}
                </Text>
              </View>
              <Switch
                value={weatherEffectsEnabled}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleWeatherEffects(value);
                }}
                trackColor={{ false: '#E2E8F0', true: '#06B6D4' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Animated.View>

          {/* Support Section */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden"
          >
            <View className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <Text className="text-gray-500 font-semibold text-sm uppercase tracking-wide">
                Support
              </Text>
            </View>

            <Pressable 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowTutorial(true);
              }}
              className="flex-row items-center px-4 py-4 border-b border-gray-100 active:bg-gray-50"
            >
              <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-3">
                <PlayCircle size={20} color="#22C55E" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Watch Tutorial</Text>
                <Text className="text-gray-500 text-sm">Learn how to use the app</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </Pressable>

            <Pressable className="flex-row items-center px-4 py-4 border-b border-gray-100 active:bg-gray-50">
              <View className="w-10 h-10 rounded-full bg-purple-50 items-center justify-center mr-3">
                <HelpCircle size={20} color="#A78BFA" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Help Center</Text>
                <Text className="text-gray-500 text-sm">https://t.me/PostyMail</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </Pressable>

            <Pressable className="flex-row items-center px-4 py-4 border-b border-gray-100 active:bg-gray-50">
              <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                <Mail size={20} color="#4A90E2" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Contact Us</Text>
                <Text className="text-gray-500 text-sm">postyteam@magicmailclub.org</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </Pressable>

            <Pressable
              onPress={handleCallSupport}
              className="flex-row items-center px-4 py-4 border-b border-gray-100 active:bg-gray-50"
            >
              <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mr-3">
                <Phone size={20} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Call Support</Text>
                <Text className="text-gray-500 text-sm">+1-(843) 418-1006</Text>
                <Text className="text-gray-400 text-xs">10am - 9pm EST</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </Pressable>

            <Pressable
              onPress={handleShare}
              className="flex-row items-center px-4 py-4 active:bg-gray-50"
            >
              <View className="w-10 h-10 rounded-full bg-pink-50 items-center justify-center mr-3">
                <Share2 size={20} color="#EC4899" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Share with Friends</Text>
                <Text className="text-gray-500 text-sm">Invite others to join Posty</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </Pressable>
          </Animated.View>

          {/* Download App Section */}
          <Animated.View
            entering={FadeInDown.delay(450).springify()}
            className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden"
          >
            <View className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <Text className="text-gray-500 font-semibold text-sm uppercase tracking-wide">
                Download App
              </Text>
            </View>

            <View className="px-4 py-4">
              <Text className="text-gray-700 text-center mb-4">
                Get the best experience with our mobile app
              </Text>
              
              <View className="flex-row justify-center gap-3" style={{ gap: 12 }}>
                {/* App Store Badge */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Linking.openURL('https://apps.apple.com/app/posty-magicmail-club/id6740044938');
                  }}
                  className="active:opacity-70"
                >
                  <View className="bg-black rounded-xl px-4 py-2.5 flex-row items-center border border-gray-600" style={{ minWidth: 145 }}>
                    <View className="mr-2">
                      <Apple size={28} color="white" />
                    </View>
                    <View>
                      <Text className="text-white text-[10px] leading-tight">Download on the</Text>
                      <Text className="text-white font-semibold text-lg leading-tight">App Store</Text>
                    </View>
                  </View>
                </Pressable>

                {/* Google Play Badge */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Linking.openURL('https://play.google.com/store/apps/details?id=com.vibecode.postymagicmail');
                  }}
                  className="active:opacity-70"
                >
                  <View className="bg-black rounded-xl px-4 py-2.5 flex-row items-center border border-gray-600" style={{ minWidth: 145 }}>
                    <View className="mr-2">
                      <Play size={28} color="#34A853" fill="#34A853" />
                    </View>
                    <View>
                      <Text className="text-white text-[10px] leading-tight">GET IT ON</Text>
                      <Text className="text-white font-semibold text-lg leading-tight">Google Play</Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Logout Button */}
          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center justify-center bg-white rounded-2xl py-4 shadow-sm active:bg-red-50"
            >
              <LogOut size={20} color="#EF4444" />
              <Text className="text-red-500 font-semibold ml-2">Log Out</Text>
            </Pressable>
          </Animated.View>

          {/* Version */}
          <Text className="text-gray-400 text-center text-xs mt-6">
            Posty MagicMail Club v1.0.0
          </Text>

          {/* Footer with social links and legal */}
          <AppFooter showSocial showLegal />
        </ScrollView>
      </SafeAreaView>

      {/* Tutorial Modal */}
      <OnboardingTutorial
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </View>
  );
}
