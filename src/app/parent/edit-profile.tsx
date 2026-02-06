// Edit Parent Profile Screen
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { ArrowLeft, User, Camera } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { supabaseService } from '@/lib/supabase-service';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function EditProfileScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const updateUserName = useAppStore((s) => s.updateUserName);
  const updateUserAvatar = useAppStore((s) => s.updateUserAvatar);

  const [name, setName] = useState(currentUser?.name ?? '');
  const [avatarUri, setAvatarUri] = useState(currentUser?.avatar ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const localUri = result.assets[0].uri;
      setAvatarUri(localUri);
      
      if (currentUser?.id) {
        setIsUploadingPhoto(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        const configured = await isSupabaseConfigured();
        if (configured) {
          const publicUrl = await supabaseService.uploadProfileImage('user', currentUser.id, localUri);
          if (publicUrl) {
            setAvatarUri(publicUrl);
            updateUserAvatar(publicUrl);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            updateUserAvatar(localUri);
          }
        } else {
          updateUserAvatar(localUri);
        }
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      updateUserName(name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }

    setIsSaving(false);
  };

  const isValidImageUri = avatarUri && (avatarUri.startsWith('http') || avatarUri.startsWith('file://'));

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
          >
            <ArrowLeft size={24} color="#1F2937" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900 flex-1">Edit Profile</Text>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            className="bg-blue-500 px-4 py-2 rounded-full active:bg-blue-600"
          >
            <Text className="text-white font-semibold">
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 px-5 pt-6">
            {/* Profile Avatar */}
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              className="items-center mb-8"
            >
              <Pressable onPress={pickImage} disabled={isUploadingPhoto}>
                <View className="w-28 h-28 rounded-full bg-blue-100 items-center justify-center overflow-hidden">
                  {isValidImageUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={{ width: 112, height: 112 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <User size={48} color="#4A90E2" />
                  )}
                </View>
                <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-500 items-center justify-center border-2 border-white">
                  <Camera size={16} color="white" />
                </View>
              </Pressable>
              <Text className="text-gray-500 text-sm mt-2">
                {isUploadingPhoto ? 'Uploading...' : 'Tap to change photo'}
              </Text>
            </Animated.View>

            {/* Name Input */}
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              <Text className="text-gray-500 text-sm font-medium mb-2">Your Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
                style={{ fontSize: 18, color: '#111827', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </Animated.View>

            {/* Email Display (read-only) */}
            <Animated.View
              entering={FadeInDown.delay(300).springify()}
              className="bg-white rounded-2xl p-4 shadow-sm mt-4"
            >
              <Text className="text-gray-500 text-sm font-medium mb-2">Email</Text>
              <Text className="text-lg text-gray-400 py-2">
                {currentUser?.email}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                Email cannot be changed
              </Text>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
