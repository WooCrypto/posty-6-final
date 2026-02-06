import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform, Modal } from 'react-native';
import { X, Download, Smartphone } from 'lucide-react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const lastDismissed = localStorage.getItem('installPromptDismissed');
      if (!lastDismissed || Date.now() - parseInt(lastDismissed) > 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isStandalone) {
      const lastIOSPrompt = localStorage.getItem('iosPromptDismissed');
      if (!lastIOSPrompt || Date.now() - parseInt(lastIOSPrompt) > 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => setShowIOSInstructions(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.log('Install error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    if (Platform.OS === 'web') {
      localStorage.setItem('installPromptDismissed', Date.now().toString());
    }
  };

  const handleDismissIOS = () => {
    setShowIOSInstructions(false);
    if (Platform.OS === 'web') {
      localStorage.setItem('iosPromptDismissed', Date.now().toString());
    }
  };

  if (Platform.OS !== 'web') return null;

  return (
    <>
      {showPrompt && deferredPrompt && (
        <Modal transparent animationType="slide" visible={showPrompt}>
          <View className="flex-1 justify-end bg-black/50">
            <Animated.View
              entering={FadeInUp}
              exiting={FadeOutDown}
              className="bg-white rounded-t-3xl p-6 pb-10"
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-xl bg-blue-100 items-center justify-center mr-3">
                    <Download size={24} color="#4A90E2" />
                  </View>
                  <View>
                    <Text className="text-xl font-bold text-gray-900">Download App</Text>
                    <Text className="text-gray-500">Get the full experience</Text>
                  </View>
                </View>
                <Pressable onPress={handleDismiss} className="p-2">
                  <X size={24} color="#94A3B8" />
                </Pressable>
              </View>

              <Text className="text-gray-600 mb-6">
                Add Posty MagicMail Club to your home screen for quick access and the best experience!
              </Text>

              <View className="flex-row gap-3" style={{ gap: 12 }}>
                <Pressable
                  onPress={handleDismiss}
                  className="flex-1 py-3 rounded-xl border border-gray-200 items-center"
                >
                  <Text className="text-gray-600 font-semibold">Not Now</Text>
                </Pressable>
                <Pressable
                  onPress={handleInstall}
                  className="flex-1 py-3 rounded-xl bg-blue-500 items-center"
                >
                  <Text className="text-white font-semibold">Install App</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      {showIOSInstructions && (
        <Modal transparent animationType="slide" visible={showIOSInstructions}>
          <View className="flex-1 justify-end bg-black/50">
            <Animated.View
              entering={FadeInUp}
              exiting={FadeOutDown}
              className="bg-white rounded-t-3xl p-6 pb-10"
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-xl bg-blue-100 items-center justify-center mr-3">
                    <Smartphone size={24} color="#4A90E2" />
                  </View>
                  <View>
                    <Text className="text-xl font-bold text-gray-900">Add to Home Screen</Text>
                    <Text className="text-gray-500">iOS Instructions</Text>
                  </View>
                </View>
                <Pressable onPress={handleDismissIOS} className="p-2">
                  <X size={24} color="#94A3B8" />
                </Pressable>
              </View>

              <View className="bg-gray-50 rounded-xl p-4 mb-4">
                <Text className="text-gray-800 font-semibold mb-3">To install on your iPhone:</Text>
                
                <View className="mb-3">
                  <Text className="text-gray-700">
                    1. Tap the <Text className="font-bold">Share</Text> button (square with arrow) at the bottom of Safari
                  </Text>
                </View>
                
                <View className="mb-3">
                  <Text className="text-gray-700">
                    2. Scroll down and tap <Text className="font-bold">"Add to Home Screen"</Text>
                  </Text>
                </View>
                
                <View>
                  <Text className="text-gray-700">
                    3. Tap <Text className="font-bold">"Add"</Text> in the top right corner
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleDismissIOS}
                className="py-3 rounded-xl bg-blue-500 items-center"
              >
                <Text className="text-white font-semibold">Got it!</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>
      )}
    </>
  );
}
