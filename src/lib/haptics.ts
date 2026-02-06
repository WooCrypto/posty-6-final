// Cross-platform haptics helper - safely handles web platform
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Haptics are only available on iOS and Android, not on web
const isHapticsSupported = Platform.OS !== 'web';

/**
 * Safely trigger haptic impact feedback
 * Falls back silently on web platform
 */
export const impactAsync = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.impactAsync(style);
  } catch (error) {
    // Silently fail on unsupported platforms or errors
    console.debug('[Haptics] Impact not supported:', error);
  }
};

/**
 * Safely trigger haptic notification feedback
 * Falls back silently on web platform
 */
export const notificationAsync = async (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.notificationAsync(type);
  } catch (error) {
    // Silently fail on unsupported platforms or errors
    console.debug('[Haptics] Notification not supported:', error);
  }
};

/**
 * Safely trigger haptic selection feedback
 * Falls back silently on web platform
 */
export const selectionAsync = async () => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    // Silently fail on unsupported platforms or errors
    console.debug('[Haptics] Selection not supported:', error);
  }
};

// Re-export types for convenience
export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
