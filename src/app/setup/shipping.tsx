// Shipping Address Screen - Final onboarding step
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostyMascot } from '@/components/PostyMascot';
import { useAppStore } from '@/lib/store';
import { Check, ChevronRight, MapPin, Home, Building2, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default function ShippingScreen() {
  const router = useRouter();
  const setShippingAddress = useAppStore((s) => s.setShippingAddress);

  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  const handleComplete = () => {
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

    // Don't set onboarded yet - do it after passcode setup and tutorial
    router.replace('/setup/set-passcode');
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#4A90E2', '#7AB3F0']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Back Button */}
          <View className="px-4 py-2">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <ArrowLeft size={24} color="white" />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <Animated.View
                entering={FadeInDown.delay(200).springify()}
                className="items-center mb-4"
              >
                <PostyMascot
                  size="medium"
                  mood="excited"
                  showSpeechBubble
                  speechText="Where should I deliver?"
                />
              </Animated.View>

              {/* Progress */}
              <View className="px-6 mb-4">
                <View className="flex-row items-center justify-center">
                  <View className="w-8 h-8 rounded-full bg-green-400 items-center justify-center">
                    <Check size={18} color="white" />
                  </View>
                  <View className="w-12 h-1 bg-green-400" />
                  <View className="w-8 h-8 rounded-full bg-green-400 items-center justify-center">
                    <Check size={18} color="white" />
                  </View>
                  <View className="w-12 h-1 bg-amber-400" />
                  <View className="w-8 h-8 rounded-full bg-amber-400 items-center justify-center">
                    <Text className="text-gray-900 font-bold">3</Text>
                  </View>
                </View>
                <Text className="text-white/80 text-center mt-2 text-sm">
                  Step 3: Shipping Address
                </Text>
              </View>

              {/* Form Card */}
              <Animated.View
                entering={FadeInDown.delay(400).springify()}
                className="mx-4 bg-white rounded-3xl p-6 shadow-lg"
              >
                <View className="flex-row items-center mb-4">
                  <MapPin size={24} color="#4A90E2" />
                  <Text className="text-xl font-bold text-gray-900 ml-2">
                    Delivery Address
                  </Text>
                </View>

                <Text className="text-gray-500 mb-4">
                  This is where Posty will deliver all the exciting mail rewards!
                </Text>

                {/* Street Address */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>Street Address</Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}>
                    <View style={{ paddingLeft: 16, paddingRight: 8 }}>
                      <Home size={18} color="#64748B" />
                    </View>
                    <TextInput
                      value={street}
                      onChangeText={setStreet}
                      placeholder="123 Main Street, Apt 4"
                      placeholderTextColor="#94A3B8"
                      style={{
                        flex: 1,
                        paddingRight: 16,
                        paddingVertical: 14,
                        fontSize: 16,
                        color: '#111827',
                      }}
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={true}
                    />
                  </View>
                </View>

                {/* City */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>City</Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}>
                    <View style={{ paddingLeft: 16, paddingRight: 8 }}>
                      <Building2 size={18} color="#64748B" />
                    </View>
                    <TextInput
                      value={city}
                      onChangeText={setCity}
                      placeholder="Los Angeles"
                      placeholderTextColor="#94A3B8"
                      style={{
                        flex: 1,
                        paddingRight: 16,
                        paddingVertical: 14,
                        fontSize: 16,
                        color: '#111827',
                      }}
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={true}
                    />
                  </View>
                </View>

                {/* State and Zip */}
                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>State</Text>
                    <View style={{
                      backgroundColor: '#F9FAFB',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                    }}>
                      <TextInput
                        value={state}
                        onChangeText={(text) => setState(text.toUpperCase())}
                        placeholder="CA"
                        placeholderTextColor="#94A3B8"
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          fontSize: 16,
                          color: '#111827',
                          textAlign: 'center',
                        }}
                        autoCapitalize="characters"
                        maxLength={2}
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>Zip Code</Text>
                    <View style={{
                      backgroundColor: '#F9FAFB',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                    }}>
                      <TextInput
                        value={zipCode}
                        onChangeText={(text) => setZipCode(text.replace(/[^0-9]/g, ''))}
                        placeholder="90210"
                        placeholderTextColor="#94A3B8"
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          fontSize: 16,
                          color: '#111827',
                          textAlign: 'center',
                        }}
                        keyboardType="number-pad"
                        maxLength={5}
                      />
                    </View>
                  </View>
                </View>

                {/* Country (Fixed) */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>Country</Text>
                  <View style={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}>
                    <Text style={{ color: '#4B5563', fontSize: 16 }}>United States</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Complete Button */}
              <Animated.View
                entering={FadeInUp.delay(600).springify()}
                className="mx-4 mt-6"
              >
                <Pressable
                  onPress={handleComplete}
                  className="bg-amber-400 py-4 rounded-2xl flex-row items-center justify-center active:bg-amber-500"
                >
                  <Text className="text-lg font-bold text-gray-900 mr-2">Complete Setup</Text>
                  <ChevronRight size={24} color="#1F2937" />
                </Pressable>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
