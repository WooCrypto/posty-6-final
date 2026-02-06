// Posty Mascot Component - The friendly mail-carrier dog
import React from 'react';
import { View, Text, Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';

interface PostyProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  mood?: 'happy' | 'excited' | 'encouraging' | 'celebrating';
  showSpeechBubble?: boolean;
  speechText?: string;
  animate?: boolean;
  className?: string;
}

const sizeMap = {
  small: { container: 70, image: 60 },
  medium: { container: 120, image: 100 },
  large: { container: 170, image: 150 },
  xlarge: { container: 220, image: 200 },
};

export function PostyMascot({
  size = 'medium',
  mood = 'happy',
  showSpeechBubble = false,
  speechText,
  animate = true,
  className,
}: PostyProps) {
  const bounce = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (animate) {
      // Bouncing animation
      bounce.value = withRepeat(
        withSequence(
          withSpring(-8, { damping: 8, stiffness: 200 }),
          withSpring(0, { damping: 8, stiffness: 200 })
        ),
        -1,
        true
      );

      // Subtle rotation for excitement
      if (mood === 'excited' || mood === 'celebrating') {
        rotate.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 150 }),
            withTiming(5, { duration: 150 }),
            withTiming(0, { duration: 150 })
          ),
          -1
        );
      }

      // Scale pulse for celebrating
      if (mood === 'celebrating') {
        scale.value = withRepeat(
          withSequence(
            withSpring(1.1, { damping: 10 }),
            withSpring(1, { damping: 10 })
          ),
          -1
        );
      }
    }
  }, [animate, mood]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  const dimensions = sizeMap[size];

  return (
    <View className={cn('items-center', className)}>
      {showSpeechBubble && speechText && (
        <View className="bg-white rounded-2xl px-4 py-3 mb-3 shadow-sm border border-gray-100 max-w-[250px]">
          <Text className="text-gray-800 text-center text-sm font-medium">
            {speechText}
          </Text>
          {/* Speech bubble tail */}
          <View
            className="absolute -bottom-2 left-1/2 -ml-2 w-4 h-4 bg-white rotate-45 border-r border-b border-gray-100"
          />
        </View>
      )}
      <Animated.View
        style={[
          {
            width: dimensions.container,
            height: dimensions.container,
            justifyContent: 'center',
            alignItems: 'center',
          },
          animate ? animatedStyle : {},
        ]}
      >
        {/* Posty the dog mascot image */}
        <Image
          source={require('../../public/image-2.png')}
          style={{
            width: dimensions.image,
            height: dimensions.image,
          }}
          resizeMode="contain"
        />
        {/* Celebration effects */}
        {mood === 'celebrating' && (
          <>
            <View className="absolute -top-2 -left-2">
              <Text style={{ fontSize: dimensions.image * 0.2 }}>🎉</Text>
            </View>
            <View className="absolute -top-2 -right-2">
              <Text style={{ fontSize: dimensions.image * 0.2 }}>🎉</Text>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

// Posty Avatar for smaller displays (headers, lists, etc.)
export function PostyAvatar({ size = 40 }: { size?: number }) {
  return (
    <View
      className="rounded-full items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Image
        source={require('../../public/image-2.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}
