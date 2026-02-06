// Parent Tabs Layout
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Users, User, Bell } from 'lucide-react-native';
import { View, Text } from 'react-native';
import { PostyAvatar } from '@/components/PostyMascot';

export default function ParentTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingTop: 6,
          paddingBottom: 6,
          height: 60,
        },
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-xl ${focused ? 'bg-blue-50' : ''}`}>
              <Home size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="children"
        options={{
          title: 'Children',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-xl ${focused ? 'bg-blue-50' : ''}`}>
              <Users size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-xl ${focused ? 'bg-blue-50' : ''}`}>
              <Bell size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-xl ${focused ? 'bg-blue-50' : ''}`}>
              <User size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
