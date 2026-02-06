import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

const RosieImage = require('@/assets/rosie.png');
const MiloImage = require('@/assets/milo.png');
const SkyeImage = require('@/assets/skye.png');

type MascotName = 'rosie' | 'milo' | 'skye';

interface MascotConfig {
  name: string;
  image: any;
  color: string;
  tagline: string;
}

const MASCOTS: Record<MascotName, MascotConfig> = {
  rosie: {
    name: 'Rosie',
    image: RosieImage,
    color: '#FFB6C1',
    tagline: 'Gift Expert',
  },
  milo: {
    name: 'Milo',
    image: MiloImage,
    color: '#FFA500',
    tagline: 'Explorer',
  },
  skye: {
    name: 'Skye',
    image: SkyeImage,
    color: '#87CEEB',
    tagline: 'Delivery Pro',
  },
};

interface SingleMascotProps {
  mascot: MascotName;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  showTagline?: boolean;
  onPress?: () => void;
}

export function SingleMascot({
  mascot,
  size = 'medium',
  showName = true,
  showTagline = false,
  onPress,
}: SingleMascotProps) {
  const config = MASCOTS[mascot];
  const sizeMap = {
    small: 36,
    medium: 48,
    large: 64,
  };
  const imageSize = sizeMap[size];

  const content = (
    <View className="items-center">
      <Image
        source={config.image}
        style={{
          width: imageSize,
          height: imageSize,
          borderRadius: imageSize / 2,
        }}
        resizeMode="cover"
      />
      {showName && (
        <Text
          style={{
            color: config.color,
            fontSize: size === 'small' ? 9 : size === 'medium' ? 10 : 12,
            fontWeight: '600',
            marginTop: 2,
          }}
        >
          {config.name}
        </Text>
      )}
      {showTagline && (
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 8,
            fontWeight: '500',
          }}
        >
          {config.tagline}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

interface MascotRowProps {
  size?: 'small' | 'medium' | 'large';
  showNames?: boolean;
  showTitle?: boolean;
  spacing?: number;
}

export function MascotRow({
  size = 'medium',
  showNames = true,
  showTitle = false,
  spacing = 8,
}: MascotRowProps) {
  return (
    <View className="items-center">
      {showTitle && (
        <Text
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: '600',
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          THE CLUB
        </Text>
      )}
      <View className="flex-row items-center justify-center">
        <View style={{ marginHorizontal: spacing }}>
          <SingleMascot mascot="rosie" size={size} showName={showNames} />
        </View>
        <View style={{ marginHorizontal: spacing }}>
          <SingleMascot mascot="milo" size={size} showName={showNames} />
        </View>
        <View style={{ marginHorizontal: spacing }}>
          <SingleMascot mascot="skye" size={size} showName={showNames} />
        </View>
      </View>
    </View>
  );
}

interface CelebrationMascotProps {
  mascot?: MascotName;
  message: string;
  size?: 'medium' | 'large';
}

export function CelebrationMascot({
  mascot,
  message,
  size = 'large',
}: CelebrationMascotProps) {
  const selectedMascot = mascot || (['rosie', 'milo', 'skye'][Math.floor(Math.random() * 3)] as MascotName);
  const config = MASCOTS[selectedMascot];
  const imageSize = size === 'large' ? 80 : 60;

  return (
    <View className="items-center">
      <Image
        source={config.image}
        style={{
          width: imageSize,
          height: imageSize,
          borderRadius: imageSize / 2,
          borderWidth: 3,
          borderColor: config.color,
        }}
        resizeMode="cover"
      />
      <View
        style={{
          backgroundColor: config.color + '20',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 16,
          marginTop: 8,
          borderWidth: 1,
          borderColor: config.color + '40',
        }}
      >
        <Text
          style={{
            color: config.color,
            fontSize: 12,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {config.name} says:
        </Text>
        <Text
          style={{
            color: '#1F2937',
            fontSize: 14,
            fontWeight: '700',
            textAlign: 'center',
            marginTop: 2,
          }}
        >
          "{message}"
        </Text>
      </View>
    </View>
  );
}

interface MascotBadgeProps {
  mascot: MascotName;
  size?: number;
}

export function MascotBadge({ mascot, size = 32 }: MascotBadgeProps) {
  const config = MASCOTS[mascot];
  return (
    <Image
      source={config.image}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: config.color,
      }}
      resizeMode="cover"
    />
  );
}

export function getRandomMascot(): MascotName {
  const mascots: MascotName[] = ['rosie', 'milo', 'skye'];
  return mascots[Math.floor(Math.random() * mascots.length)];
}

export { MASCOTS, MascotName };
