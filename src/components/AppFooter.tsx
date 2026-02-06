// App Footer Component - Social links, terms, and privacy
import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { PostyAvatar } from '@/components/PostyMascot';
import * as Haptics from 'expo-haptics';

// Social media links - update these with actual URLs
const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/postymagicmail',
  facebook: 'https://www.facebook.com/share/1FuWfWLbrQ/?mibextid=wwXIfr',
  twitter: 'https://twitter.com/magicmailclub',
  tiktok: 'https://tiktok.com/@postymagic',
  youtube: 'https://youtube.com/@postymagicmailclub',
};

const LEGAL_LINKS = {
  terms: 'https://https://magicmailclub.org/privacy',
  privacy: 'https://magicmailclub.org/privacy',
};

interface AppFooterProps {
  showSocial?: boolean;
  showLegal?: boolean;
  variant?: 'light' | 'dark';
}

export function AppFooter({
  showSocial = true,
  showLegal = true,
  variant = 'light'
}: AppFooterProps) {
  const handleLink = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  const textColor = variant === 'dark' ? 'text-gray-300' : 'text-gray-500';
  const linkColor = variant === 'dark' ? 'text-blue-400' : 'text-blue-500';

  return (
    <View className="py-6 px-4 items-center">
      {/* Posty Branding */}
      <View className="flex-row items-center mb-4">
        <PostyAvatar size={24} />
        <Text className={`${textColor} font-medium ml-2`}>Posty MagicMail Club</Text>
      </View>

      {/* Social Media Links */}
      {showSocial && (
        <View className="flex-row items-center justify-center mb-4">
          <Pressable
            onPress={() => handleLink(SOCIAL_LINKS.instagram)}
            className="mx-3 p-2"
          >
            <Text className="text-2xl">📸</Text>
          </Pressable>
          <Pressable
            onPress={() => handleLink(SOCIAL_LINKS.facebook)}
            className="mx-3 p-2"
          >
            <Text className="text-2xl">👍</Text>
          </Pressable>
          <Pressable
            onPress={() => handleLink(SOCIAL_LINKS.twitter)}
            className="mx-3 p-2"
          >
            <Text className="text-2xl">🐦</Text>
          </Pressable>
          <Pressable
            onPress={() => handleLink(SOCIAL_LINKS.tiktok)}
            className="mx-3 p-2"
          >
            <Text className="text-2xl">🎵</Text>
          </Pressable>
          <Pressable
            onPress={() => handleLink(SOCIAL_LINKS.youtube)}
            className="mx-3 p-2"
          >
            <Text className="text-2xl">▶️</Text>
          </Pressable>
        </View>
      )}

      {/* Legal Links */}
      {showLegal && (
        <View className="flex-row items-center justify-center">
          <Pressable onPress={() => handleLink(LEGAL_LINKS.terms)}>
            <Text className={`${linkColor} text-sm`}>Terms of Service</Text>
          </Pressable>
          <Text className={`${textColor} mx-2`}>•</Text>
          <Pressable onPress={() => handleLink(LEGAL_LINKS.privacy)}>
            <Text className={`${linkColor} text-sm`}>Privacy Policy</Text>
          </Pressable>
        </View>
      )}

      {/* Copyright */}
      <Text className={`${textColor} text-xs mt-3`}>
        © {new Date().getFullYear()} Posty MagicMail Club. All rights reserved.
      </Text>
    </View>
  );
}

// Compact version for in-page footers
export function CompactFooter() {
  const handleLink = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  return (
    <View className="py-4 items-center border-t border-gray-100">
      <View className="flex-row items-center justify-center">
        <Pressable onPress={() => handleLink(LEGAL_LINKS.terms)}>
          <Text className="text-blue-500 text-xs">Terms</Text>
        </Pressable>
        <Text className="text-gray-400 mx-2">•</Text>
        <Pressable onPress={() => handleLink(LEGAL_LINKS.privacy)}>
          <Text className="text-blue-500 text-xs">Privacy</Text>
        </Pressable>
        <Text className="text-gray-400 mx-2">•</Text>
        <Text className="text-gray-400 text-xs">v1.0.0</Text>
      </View>
    </View>
  );
}
