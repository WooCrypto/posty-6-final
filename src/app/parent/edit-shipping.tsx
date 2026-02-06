// Edit Shipping Address Screen
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store';
import {
  ArrowLeft,
  MapPin,
  Home,
  Building2,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default function EditShippingScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const setShippingAddress = useAppStore((s) => s.setShippingAddress);

  const existingAddress = currentUser?.shippingAddress;

  const [street, setStreet] = useState(existingAddress?.street ?? '');
  const [city, setCity] = useState(existingAddress?.city ?? '');
  const [state, setState] = useState(existingAddress?.state ?? '');
  const [zipCode, setZipCode] = useState(existingAddress?.zipCode ?? '');

  const handleSave = () => {
    if (!street.trim()) {
      Alert.alert('Missing Address', 'Please enter your street address');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Missing City', 'Please enter your city');
      return;
    }
    if (!state.trim() || !US_STATES.includes(state.toUpperCase())) {
      Alert.alert('Invalid State', 'Please enter a valid US state code (e.g., CA, NY)');
      return;
    }
    if (!zipCode.trim() || zipCode.length !== 5) {
      Alert.alert('Invalid Zip Code', 'Please enter a valid 5-digit zip code');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setShippingAddress({
      street: street.trim(),
      city: city.trim(),
      state: state.toUpperCase(),
      zipCode: zipCode.trim(),
      country: 'United States',
    });

    Alert.alert(
      'Address Updated',
      'Your shipping address has been updated successfully.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
          >
            <ArrowLeft size={24} color="#1F2937" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">Shipping Address</Text>
        </View>

        <View className="flex-1 px-5 pt-6">
          {/* Info */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100"
          >
            <View className="flex-row items-start">
              <MapPin size={24} color="#4A90E2" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-800 font-bold mb-1">Delivery Address</Text>
                <Text className="text-blue-700 text-sm leading-5">
                  This is where Posty will send all mail rewards. Make sure it's accurate!
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Form */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            {/* Street Address */}
            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-2">Street Address</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Home size={18} color="#64748B" />
                <TextInput
                  value={street}
                  onChangeText={setStreet}
                  placeholder="123 Main Street, Apt 4"
                  placeholderTextColor="#94A3B8"
                  style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* City */}
            <View className="mb-4">
              <Text className="text-gray-600 text-sm mb-2">City</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Building2 size={18} color="#64748B" />
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Los Angeles"
                  placeholderTextColor="#94A3B8"
                  style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* State and Zip */}
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-gray-600 text-sm mb-2">State</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <TextInput
                    value={state}
                    onChangeText={(text) => setState(text.toUpperCase())}
                    placeholder="CA"
                    placeholderTextColor="#94A3B8"
                    style={{ fontSize: 16, color: '#111827', textAlign: 'center' }}
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                </View>
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-gray-600 text-sm mb-2">Zip Code</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <TextInput
                    value={zipCode}
                    onChangeText={(text) => setZipCode(text.replace(/[^0-9]/g, ''))}
                    placeholder="90210"
                    placeholderTextColor="#94A3B8"
                    style={{ fontSize: 16, color: '#111827', textAlign: 'center' }}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>
            </View>

            {/* Country */}
            <View className="mb-6">
              <Text className="text-gray-600 text-sm mb-2">Country</Text>
              <View className="bg-gray-100 rounded-xl px-4 py-3 border border-gray-200">
                <Text className="text-gray-600 text-base">🇺🇸 United States</Text>
              </View>
            </View>

            <Pressable
              onPress={handleSave}
              className="bg-blue-500 py-4 rounded-xl active:bg-blue-600"
            >
              <Text className="text-center text-white font-bold">Save Address</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
