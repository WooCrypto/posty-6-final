// Google Authentication Client using expo-auth-session
// Works in Expo Go and development builds
//
// IMPORTANT SETUP FOR MOBILE:
// To fix "redirect_uri_mismatch" (Error 400) on mobile, add these redirect URIs 
// in Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client ID:
//
// For Expo Go development:
//   https://auth.expo.io/@your-expo-username/vibecode
//
// For standalone iOS builds:
//   com.vibecode.postymagicmail:/oauth2redirect/google
//
// For standalone Android builds:
//   com.vibecode.postymagicmail:/oauth2redirect/google
//
// For Web:
//   Your Replit domain: https://your-repl-name.replit.app
//   And for local testing: http://localhost:5000
//
// IMPORTANT: The "disallowed_useragent" (403) error from Google happens when:
// 1. OAuth is triggered from an embedded WebView instead of a system browser
// 2. Google blocks embedded browsers for security reasons
// 
// Solution: Use native Google Sign-In package for production builds, or
// ensure expo-auth-session opens in an external browser.

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';

// Complete auth session for web - capture the result for debugging
const authSessionResult = WebBrowser.maybeCompleteAuthSession();
if (Platform.OS === 'web') {
  console.log('[GoogleAuth] maybeCompleteAuthSession result:', authSessionResult);
  
  // Log URL info for debugging
  if (typeof window !== 'undefined') {
    console.log('[GoogleAuth] Current URL:', window.location.href);
    console.log('[GoogleAuth] URL hash:', window.location.hash);
    console.log('[GoogleAuth] URL search:', window.location.search);
  }
}

// Detect if running on mobile web (phone/tablet browser)
export const isMobileWeb = (): boolean => {
  if (Platform.OS !== 'web') return false;
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
};

// Environment variables for Google Sign-In
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

// Get the Expo redirect URI for debugging
export const getExpoRedirectUri = () => {
  // For Expo Go, the redirect URI follows this pattern
  const expoUsername = Constants.expoConfig?.owner || 'anonymous';
  const slug = Constants.expoConfig?.slug || 'vibecode';
  return `https://auth.expo.io/@${expoUsername}/${slug}`;
};

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  photo?: string;
  givenName?: string;
  familyName?: string;
}

export interface GoogleSignInResult {
  ok: boolean;
  user?: GoogleUser;
  accessToken?: string;
  error?: string;
}

// Check if Google Sign-In is configured
export const isGoogleAuthConfigured = (): boolean => {
  return !!WEB_CLIENT_ID;
};

// Get the appropriate client ID for the platform
// For Expo Go, we use the webClientId for all platforms
export const getGoogleClientIds = () => {
  // In Expo Go, we need to use the web client ID for all platforms
  // The web client ID works for OAuth on all platforms in development
  return {
    webClientId: WEB_CLIENT_ID,
    // Use web client ID as fallback if platform-specific IDs aren't set
    iosClientId: IOS_CLIENT_ID || WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID || WEB_CLIENT_ID,
  };
};

// Get the web redirect URI (current origin)
export const getWebRedirectUri = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://vibecode.replit.app';
};

// Get auth request config based on platform
// Uses the Expo proxy for Expo Go to avoid the disallowed_useragent error
export const getGoogleAuthConfig = () => {
  if (!WEB_CLIENT_ID) {
    console.log('[GoogleAuth] No WEB_CLIENT_ID configured');
    return null;
  }

  // For web platform (including mobile web)
  if (Platform.OS === 'web') {
    const redirectUri = getWebRedirectUri();
    console.log('[GoogleAuth] Web redirect URI:', redirectUri);
    console.log('[GoogleAuth] Make sure this URI is added to your Google Cloud Console OAuth credentials');
    
    return {
      clientId: WEB_CLIENT_ID,
      redirectUri: redirectUri,
      responseType: 'token',
      usePKCE: false,
    };
  }

  // For iOS/Android in Expo Go, use expoClientId which uses Expo's auth proxy
  // The proxy ensures the OAuth flow opens in an external browser, not a WebView
  // 
  // IMPORTANT: You must add the redirect URI to your Google Cloud Console:
  // Go to APIs & Services > Credentials > OAuth 2.0 Client ID
  // Add the redirect URI shown by getExpoRedirectUri()
  const redirectUri = getExpoRedirectUri();
  console.log('[GoogleAuth] Mobile redirect URI:', redirectUri);
  console.log('[GoogleAuth] Add this URI to your Google Cloud Console OAuth credentials');
  
  return {
    expoClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID || WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID || WEB_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
  };
};

// Options for promptAsync to ensure external browser is used
// This helps avoid the 403 disallowed_useragent error
export const getPromptAsyncOptions = () => {
  // On web (both desktop and mobile), use redirect mode to avoid popup blockers
  if (Platform.OS === 'web') {
    console.log('[GoogleAuth] Using redirect mode for web');
    return {
      windowFeatures: { popup: false },
    };
  }
  
  return {
    // Use preferred browser app on mobile instead of in-app browser
    preferEphemeralSession: true,
    // Show the browser UI
    showInRecents: true,
  };
};

// Direct OAuth redirect for mobile web browsers
// This bypasses expo-auth-session which doesn't work reliably on mobile web
export const initiateDirectGoogleAuth = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    console.log('[GoogleAuth] Direct auth only works on web');
    return false;
  }
  
  if (!WEB_CLIENT_ID) {
    console.log('[GoogleAuth] No WEB_CLIENT_ID configured');
    return false;
  }
  
  const redirectUri = getWebRedirectUri();
  const state = Math.random().toString(36).substring(7);
  
  // Store state for CSRF protection
  try {
    sessionStorage.setItem('google_auth_state', state);
  } catch (e) {
    console.log('[GoogleAuth] Could not store state in sessionStorage');
  }
  
  // Build Google OAuth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', WEB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');
  
  console.log('[GoogleAuth] Redirecting to Google OAuth...');
  console.log('[GoogleAuth] Redirect URI:', redirectUri);
  
  // Redirect to Google
  window.location.href = authUrl.toString();
  return true;
};

// Check if we should use direct redirect (for mobile web)
export const shouldUseDirectAuth = (): boolean => {
  return Platform.OS === 'web' && isMobileWeb();
};

// Fetch user info from Google API using access token
export const fetchGoogleUserInfo = async (accessToken: string): Promise<GoogleUser | null> => {
  try {
    const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.log('[GoogleAuth] Failed to fetch user info:', response.status);
      return null;
    }

    const userInfo = await response.json();

    return {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name ?? userInfo.given_name ?? 'User',
      photo: userInfo.picture,
      givenName: userInfo.given_name,
      familyName: userInfo.family_name,
    };
  } catch (error) {
    console.log('[GoogleAuth] Error fetching user info:', error);
    return null;
  }
};

// Hook configuration for useAuthRequest
export const useGoogleAuthConfig = () => {
  return getGoogleAuthConfig();
};

// Helper to extract access token from URL hash (for web redirect fallback)
// Google OAuth implicit flow returns: #access_token=...&token_type=...&expires_in=...&state=...
export const getAccessTokenFromUrl = (): string | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  
  const hash = window.location.hash;
  if (!hash) return null;
  
  // Parse the hash fragment
  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  const returnedState = params.get('state');
  
  if (accessToken) {
    console.log('[GoogleAuth] Found access_token in URL hash');
    
    // Validate state for CSRF protection (only if state was stored)
    try {
      const storedState = sessionStorage.getItem('google_auth_state');
      if (storedState) {
        if (returnedState !== storedState) {
          console.error('[GoogleAuth] State mismatch - possible CSRF attack');
          // Clean up state and URL even on failure
          sessionStorage.removeItem('google_auth_state');
          if (window.history?.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          return null;
        }
        console.log('[GoogleAuth] State validated successfully');
        sessionStorage.removeItem('google_auth_state');
      }
    } catch (e) {
      console.log('[GoogleAuth] Could not validate state from sessionStorage');
    }
    
    // IMPORTANT: Clean up the URL immediately to remove token from browser history
    if (window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    return accessToken;
  }
  
  return null;
};

// Check if there's an error in the URL from Google OAuth
export const getAuthErrorFromUrl = (): string | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  
  const hash = window.location.hash;
  const search = window.location.search;
  
  // Check hash for error
  if (hash) {
    const hashParams = new URLSearchParams(hash.substring(1));
    const error = hashParams.get('error');
    if (error) {
      console.log('[GoogleAuth] Found error in URL hash:', error);
      return error;
    }
  }
  
  // Check search params for error
  if (search) {
    const searchParams = new URLSearchParams(search);
    const error = searchParams.get('error');
    if (error) {
      console.log('[GoogleAuth] Found error in URL search:', error);
      return error;
    }
  }
  
  return null;
};
