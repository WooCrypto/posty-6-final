import React, { useEffect, useMemo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useAppStore, WeatherEffect } from '@/lib/store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}

function SnowParticle({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(SCREEN_HEIGHT + 50, {
          duration: particle.duration,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );
    translateX.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(20, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          left: particle.x,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          opacity: particle.opacity,
        },
      ]}
    />
  );
}

function LeafParticle({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(SCREEN_HEIGHT + 50, {
          duration: particle.duration,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );
    translateX.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(40, {
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
    rotate.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(360, {
          duration: 4000,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const colors = ['#D2691E', '#8B4513', '#CD853F', '#DEB887', '#F4A460'];
  const color = colors[particle.id % colors.length];

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          left: particle.x,
          width: particle.size,
          height: particle.size * 0.6,
          borderRadius: particle.size / 3,
          backgroundColor: color,
          opacity: particle.opacity,
        },
      ]}
    />
  );
}

function PetalParticle({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(SCREEN_HEIGHT + 50, {
          duration: particle.duration,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );
    translateX.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(30, {
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
    rotate.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(360, {
          duration: 5000,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const colors = ['#FFB7C5', '#FFC0CB', '#FFD1DC', '#FFBCD9', '#FF69B4'];
  const color = colors[particle.id % colors.length];

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          left: particle.x,
          width: particle.size,
          height: particle.size * 0.7,
          borderRadius: particle.size / 2,
          backgroundColor: color,
          opacity: particle.opacity,
        },
      ]}
    />
  );
}

function SparkleParticle({ particle }: { particle: Particle }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(1, {
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
    scale.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(1.5, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * particle.opacity,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.sparkle,
        animatedStyle,
        {
          left: particle.x,
          top: (particle.id * 137) % SCREEN_HEIGHT,
          width: particle.size,
          height: particle.size,
        },
      ]}
    >
      <View style={[styles.sparkleCore, { backgroundColor: '#FFD700' }]} />
    </Animated.View>
  );
}

function RainParticle({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(-50);

  useEffect(() => {
    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(SCREEN_HEIGHT + 50, {
          duration: particle.duration * 0.5,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          left: particle.x,
          width: 2,
          height: particle.size * 2,
          borderRadius: 1,
          backgroundColor: 'rgba(135, 206, 235, 0.6)',
          opacity: particle.opacity,
        },
      ]}
    />
  );
}

export function WeatherEffects() {
  const weatherEffectsEnabled = useAppStore((s) => s.weatherEffectsEnabled);
  const currentWeatherEffect = useAppStore((s) => s.currentWeatherEffect);
  const detectSeasonFromAI = useAppStore((s) => s.detectSeasonFromAI);

  useEffect(() => {
    if (weatherEffectsEnabled && currentWeatherEffect === 'none') {
      detectSeasonFromAI();
    }
  }, [weatherEffectsEnabled, currentWeatherEffect, detectSeasonFromAI]);

  const particles = useMemo(() => {
    const count = currentWeatherEffect === 'sparkles' ? 15 : 30;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      delay: Math.random() * 5000,
      duration: 5000 + Math.random() * 5000,
      size: 4 + Math.random() * 8,
      opacity: 0.4 + Math.random() * 0.6,
    }));
  }, [currentWeatherEffect]);

  if (!weatherEffectsEnabled || currentWeatherEffect === 'none') {
    return null;
  }

  const renderParticle = (particle: Particle) => {
    switch (currentWeatherEffect) {
      case 'snow':
        return <SnowParticle key={particle.id} particle={particle} />;
      case 'leaves':
        return <LeafParticle key={particle.id} particle={particle} />;
      case 'petals':
        return <PetalParticle key={particle.id} particle={particle} />;
      case 'sparkles':
        return <SparkleParticle key={particle.id} particle={particle} />;
      case 'rain':
        return <RainParticle key={particle.id} particle={particle} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { pointerEvents: 'none' as const }]}>
      {particles.map(renderParticle)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleCore: {
    width: '50%',
    height: '50%',
    borderRadius: 100,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
});
