// Child Tabs Layout
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Target, Gift, User } from 'lucide-react-native';
import { View } from 'react-native';

export default function ChildTabLayout() {
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
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-xl ${focused ? 'bg-blue-50' : ''}`}>
              <Target size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, focused }) => (
            <View className={`p-2 rounded-xl ${focused ? 'bg-blue-50' : ''}`}>
              <Gift size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Me',
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
