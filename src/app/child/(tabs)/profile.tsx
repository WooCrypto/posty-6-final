// Child Profile Screen
import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Image, ActionSheetIOS, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { PostyMascot } from '@/components/PostyMascot';
import { MascotRow } from '@/components/ClubMascots';
import {
  Star,
  Flame,
  Trophy,
  Lock,
  ChevronRight,
  LogOut,
  Camera,
  Snowflake,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { AGE_GROUPS, getPointsMultiplier } from '@/lib/types';

export default function ChildProfileScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const tasks = useAppStore((s) => s.tasks);
  const logout = useAppStore((s) => s.logout);
  const updateChild = useAppStore((s) => s.updateChild);
  const weatherEffectsEnabled = useAppStore((s) => s.weatherEffectsEnabled);
  const toggleWeatherEffects = useAppStore((s) => s.toggleWeatherEffects);
  const currentSeason = useAppStore((s) => s.currentSeason);

  const child = currentUser?.children.find((c) => c.id === activeChildId);

  if (!child) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">No child selected</Text>
      </View>
    );
  }

  const ageGroupInfo = AGE_GROUPS[child.ageGroup];
  const multiplier = getPointsMultiplier(child.totalPoints);
  const totalApproved = tasks.filter(
    (t) => t.childId === child.id && t.status === 'approved'
  ).length;

  const handleParentMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/passcode');
  };

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

    if (!result.canceled && result.assets[0] && activeChildId) {
      updateChild(activeChildId, { avatar: result.assets[0].uri });
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

    if (!result.canceled && result.assets[0] && activeChildId) {
      updateChild(activeChildId, { avatar: result.assets[0].uri });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Get achievements from badges (database-backed) with null guard
  const badges = child.badges || [];
  const achievementBadges = badges.filter(b => b.type === 'achievement');
  const mascotBadges = badges.filter(b => b.type === 'mascot');
  
  // Combine into displayable achievements with unlocked state
  const achievements = [
    {
      icon: '🌟',
      name: 'First Task',
      description: 'Complete your first task',
      unlocked: achievementBadges.some(b => b.id === 'first_task') || totalApproved >= 1,
    },
    {
      icon: '🔥',
      name: 'Week Warrior',
      description: '7 day streak',
      unlocked: achievementBadges.some(b => b.id === 'streak_7') || child.streakDays >= 7,
    },
    {
      icon: '💯',
      name: 'Century Club',
      description: 'Earn 100 total points',
      unlocked: achievementBadges.some(b => b.id === 'points_100') || child.totalPoints >= 100,
    },
    {
      icon: '🚀',
      name: 'Rising Star',
      description: 'Reach Level 5',
      unlocked: achievementBadges.some(b => b.id === 'level_5') || child.level >= 5,
    },
    {
      icon: '📬',
      name: 'Mail Time',
      description: 'Unlock your first mail',
      unlocked: achievementBadges.some(b => b.id === 'mail_unlocked') || child.mailMeterProgress >= 100,
    },
    {
      icon: '🏆',
      name: 'Super Achiever',
      description: 'Complete 50 tasks',
      unlocked: achievementBadges.some(b => b.id === 'task_50') || totalApproved >= 50,
    },
  ];
  
  // Count total achievements (achievements + mascot badges)
  const totalBadgesEarned = achievementBadges.length + mascotBadges.length;

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View className="px-5 py-3 bg-white flex-row items-center justify-between shadow-sm" style={{ elevation: 2 }}>
          <Text className="text-xl font-bold text-gray-900">My Profile</Text>
          <Pressable
            onPress={handleParentMode}
            className="flex-row items-center bg-gray-100 px-3 py-2 rounded-full active:bg-gray-200"
          >
            <Lock size={14} color="#64748B" />
            <Text className="text-gray-600 text-xs font-medium ml-1">Parent</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="bg-white rounded-3xl p-6 mb-4 shadow-sm items-center"
          >
            <Pressable onPress={handleChangePhoto} className="relative">
              <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center mb-3 border-4 border-blue-200 overflow-hidden">
                {child.avatar ? (
                  <Image
                    source={{ uri: child.avatar }}
                    style={{ width: 96, height: 96 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-5xl">
                    {child.age <= 7 ? '👶' : child.age <= 11 ? '🧒' : child.age <= 14 ? '👧' : '🧑'}
                  </Text>
                )}
              </View>
              <View className="absolute bottom-2 right-0 w-8 h-8 rounded-full bg-blue-500 items-center justify-center border-2 border-white">
                <Camera size={16} color="white" />
              </View>
            </Pressable>
            <Text className="text-2xl font-bold text-gray-900">{child.name}</Text>
            <Text className="text-gray-500 mt-1">
              Age {child.age} • {ageGroupInfo.label}
            </Text>

            <View className="flex-row mt-4">
              <View className="bg-blue-100 px-3 py-1 rounded-full mr-2">
                <Text className="text-blue-700 font-medium">Level {child.level}</Text>
              </View>
              {multiplier > 1 && (
                <View className="bg-amber-100 px-3 py-1 rounded-full">
                  <Text className="text-amber-700 font-medium">{multiplier}x Coins</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Stats */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="flex-row mb-4"
          >
            <View className="flex-1 bg-amber-50 rounded-2xl p-4 mr-2 border border-amber-100">
              <View className="flex-row items-center">
                <Star size={20} color="#F59E0B" />
                <Text className="text-amber-800 font-bold text-xl ml-2">{child.totalPoints}</Text>
              </View>
              <Text className="text-amber-600 text-sm mt-1">Total Magic Coins</Text>
            </View>
            <View className="flex-1 bg-red-50 rounded-2xl p-4 mx-1 border border-red-100">
              <View className="flex-row items-center">
                <Flame size={20} color="#EF4444" />
                <Text className="text-red-800 font-bold text-xl ml-2">{child.streakDays}</Text>
              </View>
              <Text className="text-red-600 text-sm mt-1">Day Streak</Text>
            </View>
            <View className="flex-1 bg-green-50 rounded-2xl p-4 ml-2 border border-green-100">
              <View className="flex-row items-center">
                <Trophy size={20} color="#22C55E" />
                <Text className="text-green-800 font-bold text-xl ml-2">{totalApproved}</Text>
              </View>
              <Text className="text-green-600 text-sm mt-1">Tasks Done</Text>
            </View>
          </Animated.View>

          {/* Achievements */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text className="text-lg font-bold text-gray-900 mb-3">Achievements</Text>
            <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {achievements.map((achievement, index) => (
                <View
                  key={index}
                  className={`flex-row items-center p-4 ${
                    index < achievements.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <View
                    className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                      achievement.unlocked ? 'bg-amber-100' : 'bg-gray-100'
                    }`}
                  >
                    <Text className={`text-2xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                      {achievement.icon}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-semibold ${
                        achievement.unlocked ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {achievement.name}
                    </Text>
                    <Text className="text-gray-500 text-sm">{achievement.description}</Text>
                  </View>
                  {achievement.unlocked && (
                    <View className="bg-green-100 px-2 py-1 rounded-full">
                      <Text className="text-green-700 text-xs font-medium">Unlocked!</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Appearance Settings */}
          <Animated.View
            entering={FadeInDown.delay(350).springify()}
            className="mt-4"
          >
            <Text className="text-lg font-bold text-gray-900 mb-3">Settings</Text>
            <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <View className="flex-row items-center p-4">
                <View className="w-12 h-12 rounded-full bg-cyan-100 items-center justify-center mr-4">
                  <Snowflake size={24} color="#06B6D4" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold">Fun Effects</Text>
                  <Text className="text-gray-500 text-sm">
                    {weatherEffectsEnabled 
                      ? `${currentSeason === 'winter' ? 'Snow' : currentSeason === 'fall' ? 'Leaves' : currentSeason === 'spring' ? 'Petals' : 'Sparkles'} falling!` 
                      : 'Snow, leaves & more!'}
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
            </View>
          </Animated.View>

          {/* Posty Message */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="mt-6 items-center"
          >
            <PostyMascot size="small" mood="happy" animate />
            <View className="bg-blue-50 rounded-2xl p-4 mt-3 border border-blue-100">
              <Text className="text-blue-700 text-center">
                "Keep up the amazing work, {child.name}! You're doing great!"
              </Text>
              <Text className="text-blue-500 text-center text-sm mt-1">- Posty</Text>
            </View>
          </Animated.View>

          {/* Club Friends Section */}
          <Animated.View
            entering={FadeInDown.delay(450).springify()}
            className="mt-6 bg-white rounded-2xl p-4 shadow-sm items-center"
          >
            <Text className="text-gray-900 font-bold text-sm mb-2">The Magic Mail Club</Text>
            <MascotRow size="medium" showNames={true} spacing={12} />
            <Text className="text-gray-400 text-xs mt-2 text-center">
              Collect all the club merch!
            </Text>
          </Animated.View>

          {/* Logout Button */}
          <Animated.View
            entering={FadeInDown.delay(500).springify()}
            className="mt-6"
          >
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center justify-center bg-white rounded-2xl py-4 shadow-sm active:bg-red-50 border border-gray-100"
            >
              <LogOut size={20} color="#EF4444" />
              <Text className="text-red-500 font-semibold ml-2">Log Out</Text>
            </Pressable>
          </Animated.View>

          {/* Version */}
          <Text className="text-gray-400 text-center text-xs mt-6 mb-4">
            Posty MagicMail Club v1.0.0
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
