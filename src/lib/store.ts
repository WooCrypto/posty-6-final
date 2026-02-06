// App Store - Main state management with Zustand
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import {
  User,
  Child,
  Task,
  TaskStatus,
  SubscriptionPlan,
  ShippingAddress,
  getAgeGroup,
  getPointsMultiplier,
  AgeGroup,
  Badge,
  ACHIEVEMENT_DEFINITIONS,
  MASCOT_STICKERS,
  AchievementType,
} from './types';
import { generateDailyTasks } from './task-generator';
import { supabaseService } from './supabase-service';
import { isSupabaseConfigured } from './supabase';

export type ThemeMode = 'light' | 'dark' | 'system';
export type WeatherEffect = 'none' | 'snow' | 'rain' | 'leaves' | 'petals' | 'sparkles';
export type Season = 'winter' | 'spring' | 'summer' | 'fall';

interface AppState {
  // Auth State
  isAuthenticated: boolean;
  isOnboarded: boolean;
  currentUser: User | null;
  activeChildId: string | null;
  isChildMode: boolean;
  passcodeVerified: boolean;
  lastLoginDate: string | null;
  isLoadingUserData: boolean; // True while background data refresh is in progress

  // Theme & Effects
  themeMode: ThemeMode;
  weatherEffectsEnabled: boolean;
  currentWeatherEffect: WeatherEffect;
  currentSeason: Season;

  // Tasks
  tasks: Task[];

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  registerWithGoogle: (email: string, name: string, googleId: string) => Promise<boolean>;
  loginWithGoogle: (email: string, googleId: string) => Promise<{ success: boolean; errorCode?: 'NOT_FOUND' | 'GOOGLE_ID_MISMATCH' | 'NOT_CONFIGURED' | 'NETWORK_ERROR'; error?: string }>;
  refreshUserDataInBackground: (userId: string) => Promise<void>; // Load children/tasks without blocking
  logout: () => void;
  setOnboarded: (value: boolean) => void;

  // Child Management
  addChild: (name: string, age: number, gender?: 'boy' | 'girl') => string;
  updateChild: (childId: string, updates: Partial<Child>) => void;
  removeChild: (childId: string) => void;
  setActiveChild: (childId: string | null) => void;
  switchToChildMode: (childId: string) => void;
  switchToParentMode: (passcode: string) => boolean;
  verifyPasscode: (passcode: string) => boolean;

  // Passcode Management
  setPasscode: (passcode: string) => void;
  resetPasscode: () => string;
  getPasscode: () => string | undefined;

  // Subscription
  setSubscription: (plan: SubscriptionPlan) => void;
  updateSubscription: (plan: SubscriptionPlan) => void;
  cancelSubscription: () => void;
  pauseSubscription: () => void;
  resumeSubscription: () => void;

  // User Profile
  updateUserName: (name: string) => void;
  updateUserAvatar: (avatar: string) => void;

  // Shipping
  setShippingAddress: (address: ShippingAddress) => void;

  // Tasks
  refreshDailyTasks: (childId: string) => void;
  completeTask: (taskId: string, proofData?: { photoUri?: string; timerSeconds?: number }) => void;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string) => void;
  addCustomTask: (childId: string, title: string, description: string, points: number) => void;

  // Points & Rewards
  addPoints: (childId: string, points: number) => void;
  deductPoints: (childId: string, points: number) => boolean;
  redeemGiftCard: (childId: string, giftCardId: string, giftCardName: string, pointsCost: number) => { success: boolean; message: string };
  incrementStreak: (childId: string) => void;
  resetStreak: (childId: string) => void;
  awardBadge: (childId: string, badge: Omit<Badge, 'earnedAt'>) => void;
  updateMailMeter: (childId: string) => void;
  checkDailyLogin: (childId: string) => { isNewDay: boolean; bonusAwarded: boolean };
  regenerateTasks: (childId: string) => void;
  
  // Mail Verification (for child rewards)
  sendMailVerification: (childId: string) => { success: boolean; code: string };
  verifyMailCode: (childId: string, code: string) => boolean;
  
  // Achievements
  checkAchievements: (childId: string) => void;
  loadBadgesFromDb: (childId: string) => Promise<void>;

  // Email Verification (for user signup)
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  resendVerificationCode: (email: string) => Promise<boolean>;
  pendingVerificationEmail: string | null;
  setPendingVerificationEmail: (email: string | null) => void;

  // Helpers
  getActiveChild: () => Child | null;
  getChildTasks: (childId: string) => Task[];
  getTodaysTasks: (childId: string) => Task[];
  getCompletedTasksToday: (childId: string) => Task[];
  getApprovedTasksToday: (childId: string) => Task[];
  getPendingApprovalTasks: (childId: string) => Task[];
  
  // Daily limits tracking
  getCustomTasksToday: (childId: string) => number;
  getAIRegenerationsToday: (childId: string) => number;
  canAddCustomTask: (childId: string) => boolean;
  canRegenerateWithPoints: (childId: string) => boolean;
  incrementAIRegeneration: (childId: string) => void;
  
  // Track AI regenerations per child per day (key: childId-date, value: count)
  aiRegenerations: Record<string, number>;
  
  // Theme & Weather Actions
  setThemeMode: (mode: ThemeMode) => void;
  toggleWeatherEffects: (enabled: boolean) => void;
  setWeatherEffect: (effect: WeatherEffect) => void;
  setSeason: (season: Season) => void;
  detectSeasonFromAI: () => Promise<void>;
}

const generateId = () => uuidv4();

const today = () => new Date().toISOString().split('T')[0];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      isAuthenticated: false,
      isOnboarded: false,
      currentUser: null,
      activeChildId: null,
      isChildMode: false,
      passcodeVerified: false,
      lastLoginDate: null,
      isLoadingUserData: false,
      tasks: [],
      aiRegenerations: {},
      
      // Theme & Effects
      themeMode: 'light' as ThemeMode,
      weatherEffectsEnabled: false,
      currentWeatherEffect: 'none' as WeatherEffect,
      currentSeason: 'winter' as Season,
      
      // Email verification
      pendingVerificationEmail: null,

      // Auth Actions
      login: async (email: string, password: string) => {
        // Try Supabase first
        if (await isSupabaseConfigured()) {
          const result = await supabaseService.loginUser(email, password);
          if (result.success && result.user) {
            // Check if email is verified BEFORE fully authenticating
            const verificationStatus = await supabaseService.isEmailVerified(email);
            
            // Load full user data from Supabase
            const fullData = await supabaseService.loadFullUserData(result.user.id);
            const children = fullData.children.map(c => supabaseService.dbChildToAppChild(c));
            const shippingAddress = fullData.shippingAddress ? {
              street: fullData.shippingAddress.street,
              city: fullData.shippingAddress.city,
              state: fullData.shippingAddress.state,
              zipCode: fullData.shippingAddress.zip_code,
              country: fullData.shippingAddress.country,
            } : null;
            
            // Load full subscription from subscriptions table
            const subscriptionData = await supabaseService.getFullSubscription(result.user.id);
            console.log('[Store.login] Loaded subscription:', subscriptionData?.plan || 'none');
            
            const appUser = supabaseService.dbUserToAppUser(result.user, children, shippingAddress, subscriptionData);
            
            // Load tasks for all children
            const allTasks: Task[] = [];
            for (const child of children) {
              const dbTasks = await supabaseService.getTasks(child.id);
              const mappedTasks = dbTasks.map(t => supabaseService.dbTaskToAppTask(t, child.ageGroup));
              allTasks.push(...mappedTasks);
            }
            
            // Only authenticate if email is verified
            // If not verified, store user but require verification
            if (verificationStatus.verified) {
              set({ 
                currentUser: appUser, 
                isAuthenticated: true, 
                isOnboarded: children.length > 0, 
                tasks: allTasks,
                pendingVerificationEmail: null
              });
              // Recalculate mail meter and load badges for all children
              setTimeout(() => {
                children.forEach(child => {
                  get().updateMailMeter(child.id);
                  get().loadBadgesFromDb(child.id);
                  get().checkAchievements(child.id);
                });
              }, 100);
            } else {
              // Store user data but don't authenticate - require verification
              set({ 
                currentUser: appUser, 
                isAuthenticated: false, 
                isOnboarded: children.length > 0, 
                tasks: allTasks,
                pendingVerificationEmail: email.toLowerCase()
              });
            }
            return true;
          }
        }
        // Fallback to local storage (dev mode only - also require verification)
        const storedUser = get().currentUser;
        const pendingEmail = get().pendingVerificationEmail;
        if (
          storedUser &&
          storedUser.email.toLowerCase() === email.toLowerCase() &&
          storedUser.password === password
        ) {
          // For local storage fallback, check if verification is pending
          if (pendingEmail && pendingEmail === email.toLowerCase()) {
            // Still needs verification
            set({ isAuthenticated: false });
          } else {
            set({ isAuthenticated: true });
          }
          return true;
        }
        return false;
      },

      register: async (email: string, password: string, name: string) => {
        // Try Supabase first
        if (await isSupabaseConfigured()) {
          try {
            const result = await supabaseService.registerUser(email, password, name);
            if (result.success && result.user) {
              const appUser: User = {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                role: 'parent',
                createdAt: result.user.created_at,
                children: [],
                passcode: result.user.passcode,
              };
              // Store user info but DON'T authenticate until email is verified
              // User must verify email before accessing the app
              set({ 
                currentUser: appUser, 
                isAuthenticated: false,
                pendingVerificationEmail: email.toLowerCase()
              });
              return true;
            } else {
              console.error('Supabase registration failed:', result.error);
              throw new Error(result.error || 'Registration failed');
            }
          } catch (error) {
            console.error('Registration error:', error);
            throw error;
          }
        }
        // Fallback to local storage - also require verification
        const newUser: User = {
          id: generateId(),
          email: email.toLowerCase(),
          password,
          name,
          role: 'parent',
          createdAt: new Date().toISOString(),
          children: [],
          passcode: '1234',
        };
        set({ 
          currentUser: newUser, 
          isAuthenticated: false,
          pendingVerificationEmail: email.toLowerCase()
        });
        return true;
      },

      registerWithGoogle: async (email: string, name: string, googleId: string) => {
        // Try Supabase first
        if (await isSupabaseConfigured()) {
          const result = await supabaseService.registerWithGoogle(email, name, googleId);
          if (result.success && result.user) {
            const appUser: User = {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: 'parent',
              createdAt: result.user.created_at,
              children: [],
              passcode: result.user.passcode,
            };
            set({ currentUser: appUser, isAuthenticated: true });
            return true;
          }
        }
        // Fallback to local storage
        const newUser: User = {
          id: generateId(),
          email: email.toLowerCase(),
          password: `google_${googleId}`,
          name,
          role: 'parent',
          createdAt: new Date().toISOString(),
          children: [],
          passcode: '1234',
        };
        set({ currentUser: newUser, isAuthenticated: true });
        return true;
      },

      loginWithGoogle: async (email: string, googleId: string): Promise<{ success: boolean; errorCode?: 'NOT_FOUND' | 'GOOGLE_ID_MISMATCH' | 'NOT_CONFIGURED' | 'NETWORK_ERROR'; error?: string }> => {
        console.log('[Store.loginWithGoogle] Starting FAST login for:', email);
        
        // Try Supabase first - FAST: just verify user exists
        if (await isSupabaseConfigured()) {
          console.log('[Store.loginWithGoogle] Supabase configured, verifying user...');
          
          try {
            const result = await supabaseService.loginWithGoogle(email, googleId);
            console.log('[Store.loginWithGoogle] Supabase result:', { success: result.success, hasUser: !!result.user, errorCode: result.errorCode });
            
            if (result.success && result.user) {
              console.log('[Store.loginWithGoogle] User verified! Setting authenticated immediately');
              
              // Get persisted local state for initial render (fast)
              const persistedUser = get().currentUser;
              
              // Use persisted data ONLY if it's for the SAME user (match userId, not just email)
              const isSameUser = persistedUser && persistedUser.id === result.user.id;
              
              if (isSameUser) {
                console.log('[Store.loginWithGoogle] Same user, using persisted data for instant navigation');
                // Set authenticated immediately with persisted data
                set({ 
                  isAuthenticated: true, 
                  isLoadingUserData: true // Signal that fresh data is loading
                });
              } else {
                console.log('[Store.loginWithGoogle] Different/new user, clearing stale data and creating minimal user');
                // Create minimal user from DB result for navigation - clear any stale data
                const minimalUser = supabaseService.dbUserToAppUser(result.user, [], null);
                set({ 
                  currentUser: minimalUser, 
                  isAuthenticated: true, 
                  isOnboarded: false, // Will be updated after background load
                  isLoadingUserData: true,
                  tasks: [], // Clear stale tasks from previous user
                  activeChildId: null, // Clear stale child selection
                });
              }
              
              // Trigger background data refresh (non-blocking)
              const userId = result.user.id;
              get().refreshUserDataInBackground(userId).catch(err => {
                console.error('[Store.loginWithGoogle] Background refresh failed:', err);
              });
              
              return { success: true };
            } else {
              // Pass through the error code from supabaseService
              console.log('[Store.loginWithGoogle] Supabase login failed:', result.errorCode, result.error);
              return { success: false, errorCode: result.errorCode, error: result.error };
            }
          } catch (supabaseError: any) {
            console.error('[Store.loginWithGoogle] Supabase exception:', supabaseError);
            return { success: false, errorCode: 'NETWORK_ERROR', error: supabaseError.message || 'Connection error' };
          }
        } else {
          console.log('[Store.loginWithGoogle] Supabase not configured, trying local fallback');
        }
        
        // Fallback to local storage
        const storedUser = get().currentUser;
        console.log('[Store.loginWithGoogle] Local fallback, storedUser exists:', !!storedUser, 'email matches:', storedUser?.email.toLowerCase() === email.toLowerCase());
        
        if (
          storedUser &&
          storedUser.email.toLowerCase() === email.toLowerCase() &&
          storedUser.password === `google_${googleId}`
        ) {
          set({ isAuthenticated: true });
          console.log('[Store.loginWithGoogle] Local fallback success (password match)');
          return { success: true };
        }
        if (storedUser && storedUser.email.toLowerCase() === email.toLowerCase()) {
          set((state) => ({
            currentUser: state.currentUser
              ? { ...state.currentUser, password: `google_${googleId}` }
              : null,
            isAuthenticated: true,
          }));
          console.log('[Store.loginWithGoogle] Local fallback success (email match, updated password)');
          return { success: true };
        }
        console.log('[Store.loginWithGoogle] All login attempts failed, returning NOT_FOUND');
        return { success: false, errorCode: 'NOT_FOUND', error: 'User not found' };
      },

      // Background data refresh - loads children and tasks with retry for slow networks
      refreshUserDataInBackground: async (userId: string): Promise<void> => {
        console.log('[Store.refreshUserDataInBackground] Starting background refresh for:', userId);
        set({ isLoadingUserData: true });
        
        const maxRetries = 3;
        let lastError: any;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[Store.refreshUserDataInBackground] Attempt ${attempt}/${maxRetries}`);
            const fullData = await supabaseService.loadFullUserData(userId);
            console.log('[Store.refreshUserDataInBackground] Data loaded, children count:', fullData.children.length);
            
            const children = fullData.children.map(c => supabaseService.dbChildToAppChild(c));
            const shippingAddress = fullData.shippingAddress ? {
              street: fullData.shippingAddress.street,
              city: fullData.shippingAddress.city,
              state: fullData.shippingAddress.state,
              zipCode: fullData.shippingAddress.zip_code,
              country: fullData.shippingAddress.country,
            } : null;
            
            // Load tasks for all children
            const allTasks: Task[] = [];
            for (const child of children) {
              try {
                const dbTasks = await supabaseService.getTasks(child.id);
                const mappedTasks = dbTasks.map(t => supabaseService.dbTaskToAppTask(t, child.ageGroup));
                allTasks.push(...mappedTasks);
              } catch (taskError) {
                console.error('[Store.refreshUserDataInBackground] Failed to load tasks for child:', child.id, taskError);
              }
            }
            
            // Get the current user from DB to update state
            const currentDbUser = fullData.user;
            if (currentDbUser) {
              // Load full subscription from subscriptions table
              const subscriptionData = await supabaseService.getFullSubscription(currentDbUser.id);
              console.log('[Store.refreshUserDataInBackground] Loaded subscription:', subscriptionData?.plan || 'none');
              
              const appUser = supabaseService.dbUserToAppUser(currentDbUser, children, shippingAddress, subscriptionData);
              console.log('[Store.refreshUserDataInBackground] Updating state - isOnboarded:', children.length > 0);
              set({ 
                currentUser: appUser, 
                isOnboarded: children.length > 0, 
                tasks: allTasks,
                isLoadingUserData: false 
              });
            } else {
              // Just update children and tasks if user object is missing
              set((state) => ({
                currentUser: state.currentUser ? {
                  ...state.currentUser,
                  children,
                  shippingAddress: shippingAddress || state.currentUser.shippingAddress,
                } : null,
                isOnboarded: children.length > 0,
                tasks: allTasks,
                isLoadingUserData: false,
              }));
            }
            
            // Recalculate mail meter for all children based on loaded tasks
            setTimeout(() => {
              children.forEach(child => get().updateMailMeter(child.id));
            }, 100);
            
            console.log('[Store.refreshUserDataInBackground] Background refresh complete');
            return; // Success, exit
          } catch (error) {
            lastError = error;
            console.error(`[Store.refreshUserDataInBackground] Attempt ${attempt} failed:`, error);
            if (attempt < maxRetries) {
              // Exponential backoff: 500ms, 1s, 2s
              await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
            }
          }
        }
        
        // All retries failed
        console.error('[Store.refreshUserDataInBackground] All retries failed:', lastError);
        set({ isLoadingUserData: false });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          isOnboarded: false,
          currentUser: null,
          activeChildId: null,
          isChildMode: false,
          passcodeVerified: false,
          tasks: [],
        });
      },

      setOnboarded: (value: boolean) => {
        set({ isOnboarded: value });
      },

      // Child Management
      addChild: (name: string, age: number, gender: 'boy' | 'girl' = 'boy') => {
        const state = get();
        const currentUser = state.currentUser;
        
        // Enforce child limit based on subscription plan (client-side validation)
        if (currentUser) {
          const subscription = currentUser.subscription;
          const currentChildCount = currentUser.children.length;
          
          // Get max children allowed for this plan using centralized limits
          let maxChildren = 1; // Default to 1 (free plan / no subscription)
          if (subscription?.plan === 'free' || !subscription?.plan) maxChildren = 1;
          else if (subscription?.plan === 'basic') maxChildren = 1;
          else if (subscription?.plan === 'standard') maxChildren = 3;
          else if (subscription?.plan === 'premium') maxChildren = Infinity;
          // Also check if it's a free trial (price-based detection)
          if (subscription && (subscription.price === 0 || !subscription.price)) maxChildren = 1;
          
          // Block adding if at limit (client-side check)
          if (currentChildCount >= maxChildren) {
            console.warn(`[Store] Cannot add child: client-side limit reached (${currentChildCount}/${maxChildren})`);
            return ''; // Return empty string to indicate failure
          }
          
          // Additional server-side verification will happen in Supabase sync
          // The database also enforces limits via the subscriptions table
        }
        
        const childId = generateId();
        const ageGroup = getAgeGroup(age);
        const newChild: Child = {
          id: childId,
          name,
          age,
          gender,
          ageGroup,
          points: 0,
          totalPoints: 0,
          streakDays: 0,
          level: 1,
          badges: [],
          mailMeterProgress: 0,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                children: [...state.currentUser.children, newChild],
              }
            : null,
        }));

        // Sync to Supabase in background with limit verification
        const userId = get().currentUser?.id;
        if (userId) {
          const birthday = new Date();
          birthday.setFullYear(birthday.getFullYear() - age);
          isSupabaseConfigured().then(configured => {
            if (configured) {
              supabaseService.addChild(userId, name, birthday.toISOString().split('T')[0], gender, 'dog')
                .then(dbChild => {
                  if (dbChild) {
                    // Success - update local child with database ID
                    set((state) => ({
                      currentUser: state.currentUser
                        ? {
                            ...state.currentUser,
                            children: state.currentUser.children.map(c =>
                              c.id === childId ? { ...c, id: dbChild.id } : c
                            ),
                          }
                        : null,
                    }));
                  } else {
                    // SECURITY: Database rejected - limit exceeded or error
                    // Rollback the local child addition
                    console.warn('[Store] Database rejected child addition - rolling back local state');
                    set((state) => ({
                      currentUser: state.currentUser
                        ? {
                            ...state.currentUser,
                            children: state.currentUser.children.filter(c => c.id !== childId),
                          }
                        : null,
                    }));
                  }
                });
            }
          });
        }

        // Generate initial tasks for the child
        const tasks = generateDailyTasks(childId, ageGroup);
        set((state) => ({
          tasks: [...state.tasks, ...tasks],
        }));

        return childId;
      },

      updateChild: (childId: string, updates: Partial<Child>) => {
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                children: state.currentUser.children.map((child) =>
                  child.id === childId ? { ...child, ...updates } : child
                ),
              }
            : null,
        }));

        // Sync to Supabase in background
        isSupabaseConfigured().then(configured => {
          if (configured) {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.name = updates.name;
            if (updates.gender) dbUpdates.gender = updates.gender;
            if (updates.points !== undefined) dbUpdates.points = updates.points;
            if (updates.level !== undefined) dbUpdates.level = updates.level;
            if (updates.streakDays !== undefined) dbUpdates.streak = updates.streakDays;
            if (updates.avatar) dbUpdates.profile_image = updates.avatar;
            if (Object.keys(dbUpdates).length > 0) {
              supabaseService.updateChild(childId, dbUpdates);
            }
          }
        });
      },

      removeChild: (childId: string) => {
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                children: state.currentUser.children.filter((c) => c.id !== childId),
              }
            : null,
          tasks: state.tasks.filter((t) => t.childId !== childId),
          activeChildId: state.activeChildId === childId ? null : state.activeChildId,
        }));

        // Sync to Supabase in background
        isSupabaseConfigured().then(configured => {
          if (configured) {
            supabaseService.removeChild(childId);
          }
        });
      },

      setActiveChild: (childId: string | null) => {
        set({ activeChildId: childId });
      },

      switchToChildMode: (childId: string) => {
        set({ isChildMode: true, activeChildId: childId, passcodeVerified: false });
      },

      switchToParentMode: (passcode: string) => {
        const user = get().currentUser;
        if (user && user.passcode === passcode) {
          set({ isChildMode: false, passcodeVerified: true });
          return true;
        }
        return false;
      },

      verifyPasscode: (passcode: string) => {
        const user = get().currentUser;
        return user?.passcode === passcode;
      },

      // Passcode Management
      setPasscode: (passcode: string) => {
        set((state) => ({
          currentUser: state.currentUser
            ? { ...state.currentUser, passcode }
            : null,
        }));

        // Sync to Supabase in background
        const userId = get().currentUser?.id;
        if (userId) {
          isSupabaseConfigured().then(configured => {
            if (configured) {
              supabaseService.updateUser(userId, { passcode });
            }
          });
        }
      },

      resetPasscode: () => {
        const newPasscode = Math.floor(1000 + Math.random() * 9000).toString();
        set((state) => ({
          currentUser: state.currentUser
            ? { ...state.currentUser, passcode: newPasscode }
            : null,
        }));

        // Sync to Supabase in background
        const userId = get().currentUser?.id;
        if (userId) {
          isSupabaseConfigured().then(configured => {
            if (configured) {
              supabaseService.updateUser(userId, { passcode: newPasscode });
            }
          });
        }

        return newPasscode;
      },

      getPasscode: () => {
        return get().currentUser?.passcode;
      },

      // Subscription
      setSubscription: (plan: SubscriptionPlan) => {
        const plans: Record<SubscriptionPlan, { price: number; mails: number }> = { 
          free: { price: 0, mails: 0 },
          basic: { price: 9.99, mails: 2 }, 
          standard: { price: 19.99, mails: 4 }, 
          premium: { price: 29.99, mails: 5 } 
        };
        
        const startDate = new Date().toISOString();
        // Free plan expires in 30 days (until first mail is shipped)
        const freeTrialExpiresAt = plan === 'free' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
          : undefined;
        
        // Determine signup type: 'first' if no previous subscription, 'returning' if there was one
        const currentState = get();
        const hadPreviousSubscription = currentState.currentUser?.subscription !== undefined;
        const signupType = hadPreviousSubscription ? 'returning' : 'first';
        
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                subscription: {
                  id: generateId(),
                  plan,
                  status: 'active',
                  startDate,
                  nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  mailsPerMonth: plans[plan].mails,
                  price: plans[plan].price,
                  signupType: signupType as 'first' | 'returning',
                  freeTrialExpiresAt,
                  firstMailShipped: false,
                },
              }
            : null,
        }));

        // Sync subscription to Supabase with full subscription details
        const userId = get().currentUser?.id;
        if (userId) {
          isSupabaseConfigured().then(configured => {
            if (configured) {
              // Use the new updateUserSubscription for full subscription tracking
              supabaseService.updateUserSubscription(userId, plan);
            }
          });
        }
      },

      updateSubscription: (plan: SubscriptionPlan) => {
        const plans: Record<SubscriptionPlan, { price: number; mails: number }> = { 
          free: { price: 0, mails: 0 },
          basic: { price: 9.99, mails: 2 }, 
          standard: { price: 19.99, mails: 4 }, 
          premium: { price: 29.99, mails: 5 } 
        };
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                subscription: state.currentUser.subscription
                  ? {
                      ...state.currentUser.subscription,
                      plan,
                      mailsPerMonth: plans[plan].mails,
                      price: plans[plan].price,
                      // Clear free trial expiration if upgrading to paid
                      freeTrialExpiresAt: plan === 'free' ? state.currentUser.subscription.freeTrialExpiresAt : undefined,
                    }
                  : undefined,
              }
            : null,
        }));
      },

      cancelSubscription: () => {
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                subscription: state.currentUser.subscription
                  ? { ...state.currentUser.subscription, status: 'cancelled' }
                  : undefined,
              }
            : null,
        }));
      },

      pauseSubscription: () => {
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                subscription: state.currentUser.subscription
                  ? { ...state.currentUser.subscription, status: 'paused' }
                  : undefined,
              }
            : null,
        }));
      },

      resumeSubscription: () => {
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                subscription: state.currentUser.subscription
                  ? { ...state.currentUser.subscription, status: 'active' }
                  : undefined,
              }
            : null,
        }));
      },

      // User Profile
      updateUserName: (name: string) => {
        set((state) => ({
          currentUser: state.currentUser
            ? { ...state.currentUser, name }
            : null,
        }));

        // Sync to Supabase
        const userId = get().currentUser?.id;
        if (userId) {
          isSupabaseConfigured().then(configured => {
            if (configured) {
              supabaseService.updateUser(userId, { name });
            }
          });
        }
      },

      updateUserAvatar: (avatar: string) => {
        set((state) => ({
          currentUser: state.currentUser
            ? { ...state.currentUser, avatar }
            : null,
        }));

        // Sync to Supabase
        const userId = get().currentUser?.id;
        if (userId) {
          isSupabaseConfigured().then(configured => {
            if (configured) {
              supabaseService.updateUser(userId, { profile_image: avatar });
            }
          });
        }
      },

      // Shipping
      setShippingAddress: (address: ShippingAddress) => {
        set((state) => ({
          currentUser: state.currentUser
            ? { ...state.currentUser, shippingAddress: address }
            : null,
        }));

        // Sync to Supabase in background
        const userId = get().currentUser?.id;
        if (userId) {
          isSupabaseConfigured().then(configured => {
            if (configured) {
              supabaseService.setShippingAddress(userId, address);
            }
          });
        }
      },

      // Tasks
      refreshDailyTasks: (childId: string) => {
        const state = get();
        const child = state.currentUser?.children.find((c) => c.id === childId);
        if (!child) return;

        // Remove old tasks for today and generate new ones
        const todayDate = today();
        const existingTodayTasks = state.tasks.filter(
          (t) => t.childId === childId && t.dueDate === todayDate
        );

        if (existingTodayTasks.length === 0) {
          const newTasks = generateDailyTasks(childId, child.ageGroup);
          set((s) => ({ tasks: [...s.tasks, ...newTasks] }));
          
          // Sync new tasks to Supabase
          isSupabaseConfigured().then(configured => {
            if (configured) {
              newTasks.forEach(task => {
                supabaseService.addTask({
                  id: task.id,
                  child_id: task.childId,
                  title: task.title,
                  description: task.description,
                  category: task.category,
                  points: task.points,
                  duration_minutes: 15,
                  status: task.status,
                  is_custom: task.isCustom || false,
                  task_date: task.dueDate,
                });
              });
            }
          });
        }
      },

      completeTask: (taskId: string, proofData?: { photoUri?: string; timerSeconds?: number }) => {
        const completedAt = new Date().toISOString();
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { 
                  ...task, 
                  status: 'completed' as TaskStatus, 
                  completedAt,
                  proofPhotoUri: proofData?.photoUri ?? task.proofPhotoUri,
                  proofTimerSeconds: proofData?.timerSeconds ?? task.proofTimerSeconds,
                }
              : task
          ),
        }));

        // Sync to Supabase with proof data
        isSupabaseConfigured().then(async configured => {
          if (configured) {
            const updates: any = { status: 'completed', completed_at: completedAt };
            
            // Upload photo to Supabase Storage if provided
            if (proofData?.photoUri) {
              const publicUrl = await supabaseService.uploadTaskProofImage(taskId, proofData.photoUri);
              if (publicUrl) {
                updates.proof_image = publicUrl;
                // Update local state with the public URL
                set((state) => ({
                  tasks: state.tasks.map((task) =>
                    task.id === taskId
                      ? { ...task, proofPhotoUri: publicUrl }
                      : task
                  ),
                }));
              } else {
                // Fallback to local URI if upload fails
                updates.proof_image = proofData.photoUri;
              }
            }
            
            if (proofData?.timerSeconds !== undefined) {
              updates.proof_timer_seconds = proofData.timerSeconds;
            }
            
            supabaseService.updateTask(taskId, updates);
          }
        });
      },

      approveTask: (taskId: string) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return;

        const approvedAt = new Date().toISOString();

        // Mark task as approved (which also means verified)
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'approved' as TaskStatus,
                  verifiedAt: approvedAt,
                  approvedAt: approvedAt,
                }
              : t
          ),
        }));

        // Sync to Supabase
        isSupabaseConfigured().then(configured => {
          if (configured) {
            supabaseService.updateTask(taskId, { status: 'approved', approved_at: approvedAt });
          }
        });

        // Add points to child with multiplier
        const child = state.currentUser?.children.find((c) => c.id === task.childId);
        if (child) {
          const multiplier = getPointsMultiplier(child.totalPoints);
          const pointsToAdd = task.points * multiplier;
          get().addPoints(task.childId, pointsToAdd);
          get().updateMailMeter(task.childId);
          
          // Check achievements after task approval
          setTimeout(() => {
            get().checkAchievements(task.childId);
          }, 100);
        }
      },

      rejectTask: (taskId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, status: 'pending' as TaskStatus, completedAt: undefined }
              : task
          ),
        }));

        // Sync to Supabase
        isSupabaseConfigured().then(configured => {
          if (configured) {
            supabaseService.updateTask(taskId, { status: 'pending', completed_at: undefined });
          }
        });
      },

      addCustomTask: (childId: string, title: string, description: string, points: number) => {
        const child = get().currentUser?.children.find((c) => c.id === childId);
        if (!child) return;

        // Check how many custom tasks with points have been added today
        const todayDate = today();
        const customTasksWithPointsToday = get().tasks.filter(
          (t) => t.childId === childId && t.dueDate === todayDate && t.isCustom === true && t.points > 0
        ).length;
        
        // If we've already added 5 custom tasks with points today, new tasks get 0 points
        const isOverLimit = customTasksWithPointsToday >= 5;
        const actualPoints = isOverLimit ? 0 : points;

        const newTask: Task = {
          id: generateId(),
          childId,
          title,
          description,
          category: 'learning',
          points: actualPoints,
          status: 'pending',
          dueDate: today(),
          isCustom: true,
          ageGroup: child.ageGroup,
          requiresProof: false,
          noPointsReason: isOverLimit ? 'Daily custom task limit exceeded (5 with points per day)' : undefined,
        };

        set((state) => ({ tasks: [...state.tasks, newTask] }));
        
        // Sync custom task to Supabase
        isSupabaseConfigured().then(configured => {
          if (configured) {
            supabaseService.addTask({
              id: newTask.id,
              child_id: newTask.childId,
              title: newTask.title,
              description: newTask.description,
              category: newTask.category,
              points: newTask.points,
              duration_minutes: 15,
              status: newTask.status,
              is_custom: true,
              task_date: newTask.dueDate,
            });
          }
        });
      },

      // Points & Rewards
      addPoints: (childId: string, points: number) => {
        const child = get().currentUser?.children.find((c) => c.id === childId);
        if (!child) return;
        
        const newPoints = child.points + points;
        const newTotalPoints = child.totalPoints + points;
        const newLevel = Math.floor(newTotalPoints / 500) + 1;
        
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                children: state.currentUser.children.map((c) =>
                  c.id === childId
                    ? {
                        ...c,
                        points: newPoints,
                        totalPoints: newTotalPoints,
                        level: newLevel,
                      }
                    : c
                ),
              }
            : null,
        }));
        
        // Check if level changed
        const oldLevel = child.level;
        if (newLevel > oldLevel) {
          console.log('[Store] Level up! From', oldLevel, 'to', newLevel);
          // Check achievements for level-up
          setTimeout(() => {
            get().checkAchievements(childId);
          }, 100);
        }

        // Sync to Supabase - persist points to database
        isSupabaseConfigured().then(configured => {
          if (configured) {
            supabaseService.updateChild(childId, { points: newPoints, level: newLevel });
          }
        });
      },

      deductPoints: (childId: string, points: number) => {
        const child = get().currentUser?.children.find((c) => c.id === childId);
        if (!child || child.points < points) return false;
        
        const newPoints = child.points - points;
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                children: state.currentUser.children.map((c) =>
                  c.id === childId
                    ? { ...c, points: newPoints }
                    : c
                ),
              }
            : null,
        }));

        // Sync to Supabase
        supabaseService.updateChild(childId, { points: newPoints });

        return true;
      },

      redeemGiftCard: (childId: string, giftCardId: string, giftCardName: string, pointsCost: number) => {
        const child = get().currentUser?.children.find((c) => c.id === childId);
        if (!child) {
          return { success: false, message: 'Child not found' };
        }
        if (child.points < pointsCost) {
          return { success: false, message: `Not enough points. You need ${pointsCost - child.points} more points.` };
        }
        
        const deducted = get().deductPoints(childId, pointsCost);
        if (!deducted) {
          return { success: false, message: 'Failed to deduct points' };
        }

        // Award a badge for first gift card redemption
        const hasRedemptionBadge = child.badges.some((b) => b.id === 'first-redemption');
        if (!hasRedemptionBadge) {
          get().awardBadge(childId, {
            id: 'first-redemption',
            name: 'First Reward',
            icon: '🎁',
            description: 'Redeemed your first gift card!',
          });
        }

        // Note: Gift card redemption is logged in local state
        // Parent will see the updated point balance and badge

        return { 
          success: true, 
          message: `Successfully redeemed ${giftCardName}! Your parent will receive details about the gift card.` 
        };
      },

      incrementStreak: (childId: string) => {
        const child = get().currentUser?.children.find((c) => c.id === childId);
        if (!child) return;
        
        const newStreak = child.streakDays + 1;
        
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                children: state.currentUser.children.map((c) =>
                  c.id === childId
                    ? {
                        ...c,
                        streakDays: newStreak,
                        lastCompletedDate: today(),
                      }
                    : c
                ),
              }
            : null,
        }));
        
        // Sync to Supabase
        isSupabaseConfigured().then(configured => {
          if (configured) {
            supabaseService.updateChild(childId, { streak: newStreak, last_task_date: today() });
          }
        });
      },

      resetStreak: (childId: string) => {
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                children: state.currentUser.children.map((child) =>
                  child.id === childId ? { ...child, streakDays: 0 } : child
                ),
              }
            : null,
        }));
        
        // Sync to Supabase
        isSupabaseConfigured().then(configured => {
          if (configured) {
            supabaseService.updateChild(childId, { streak: 0 });
          }
        });
      },

      awardBadge: (childId: string, badge: Omit<Badge, 'earnedAt'>) => {
        const child = get().currentUser?.children.find((c) => c.id === childId);
        if (!child) return;
        
        // Check if badge already exists by id (primary) or name (fallback)
        if (child.badges.some((b) => b.id === badge.id || b.name === badge.name)) {
          return; // Already has this badge
        }

        const newBadge: Badge = { ...badge, earnedAt: new Date().toISOString() };
        
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                children: state.currentUser.children.map((c) =>
                  c.id === childId
                    ? {
                        ...c,
                        badges: [...c.badges, newBadge],
                      }
                    : c
                ),
              }
            : null,
        }));

        // Sync to Supabase
        isSupabaseConfigured().then(configured => {
          if (configured) {
            supabaseService.addBadge(childId, {
              name: badge.name,
              icon: badge.icon,
              description: badge.description,
              type: badge.type || 'achievement',
              mascot: badge.mascot,
            });
          }
        });
      },

      checkAchievements: (childId: string) => {
        const state = get();
        const child = state.currentUser?.children.find((c) => c.id === childId);
        if (!child) return;

        // Get all approved tasks for this child
        const approvedTasks = state.tasks.filter(
          (t) => t.childId === childId && t.status === 'approved'
        );
        const approvedCount = approvedTasks.length;

        // Get current unlocked achievements from badges
        const unlockedAchievements = new Set(
          child.badges.filter(b => b.type === 'achievement').map(b => b.id)
        );

        // Check each achievement definition
        for (const achievement of ACHIEVEMENT_DEFINITIONS) {
          if (unlockedAchievements.has(achievement.id)) continue;

          let shouldUnlock = false;

          switch (achievement.checkType) {
            case 'tasks':
              shouldUnlock = approvedCount >= achievement.targetValue;
              break;
            case 'streak':
              shouldUnlock = child.streakDays >= achievement.targetValue;
              break;
            case 'points':
              shouldUnlock = child.totalPoints >= achievement.targetValue;
              break;
            case 'level':
              shouldUnlock = child.level >= achievement.targetValue;
              break;
            case 'mail':
              shouldUnlock = child.mailMeterProgress >= achievement.targetValue;
              break;
          }

          if (shouldUnlock) {
            console.log('[Store] Unlocking achievement:', achievement.id);
            get().awardBadge(childId, {
              id: achievement.id,
              name: achievement.name,
              icon: achievement.icon,
              description: achievement.description,
              type: 'achievement',
            });

            // Also save to achievements table
            isSupabaseConfigured().then(configured => {
              if (configured) {
                supabaseService.unlockAchievement(childId, achievement.id);
              }
            });
          }
        }

        // Check for level-up mascot stickers
        const mascotSticker = MASCOT_STICKERS[child.level];
        if (mascotSticker) {
          const hasMascotBadge = child.badges.some(
            (b) => b.type === 'mascot' && b.name === mascotSticker.name
          );
          if (!hasMascotBadge) {
            console.log('[Store] Awarding mascot sticker for level', child.level);
            get().awardBadge(childId, {
              id: `mascot-level-${child.level}`,
              name: mascotSticker.name,
              icon: mascotSticker.mascot === 'posty' ? '🐕' : 
                    mascotSticker.mascot === 'rosie' ? '🎀' : 
                    mascotSticker.mascot === 'milo' ? '🐵' : '🐦',
              description: mascotSticker.description,
              type: 'mascot',
              mascot: mascotSticker.mascot,
            });
          }
        }
      },

      loadBadgesFromDb: async (childId: string) => {
        if (!(await isSupabaseConfigured())) return;

        try {
          const badges = await supabaseService.getBadges(childId);
          // Always update state, even if empty - this ensures stale badges are cleared
          set((state) => ({
            currentUser: state.currentUser
              ? {
                  ...state.currentUser,
                  children: state.currentUser.children.map((c) =>
                    c.id === childId
                      ? { ...c, badges: badges || [] }
                      : c
                  ),
                }
              : null,
          }));
        } catch (err) {
          console.error('[Store] Failed to load badges:', err);
        }
      },

      updateMailMeter: (childId: string) => {
        const state = get();
        const child = state.currentUser?.children.find((c) => c.id === childId);
        if (!child) return;

        // Calculate mail meter based on weekly approved tasks
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weeklyApprovedTasks = state.tasks.filter(
          (t) =>
            t.childId === childId &&
            t.status === 'approved' &&
            t.approvedAt &&
            new Date(t.approvedAt) >= weekAgo
        );

        // Mail meter fills to 100% after 5 approved tasks (resets after claiming)
        const targetTasks = 5;
        const tasksCompleted = weeklyApprovedTasks.length % targetTasks || (weeklyApprovedTasks.length > 0 && weeklyApprovedTasks.length % targetTasks === 0 ? 5 : 0);
        const progress = Math.min(100, (tasksCompleted / targetTasks) * 100);

        set((s) => ({
          currentUser: s.currentUser
            ? {
                ...s.currentUser,
                children: s.currentUser.children.map((c) =>
                  c.id === childId ? { ...c, mailMeterProgress: progress } : c
                ),
              }
            : null,
        }));
        
        // Sync to Supabase
        isSupabaseConfigured().then(configured => {
          if (configured) {
            supabaseService.updateChild(childId, { mail_meter_progress: progress });
          }
        });
      },

      checkDailyLogin: (childId: string) => {
        const state = get();
        const child = state.currentUser?.children.find((c) => c.id === childId);
        if (!child) return { isNewDay: false, bonusAwarded: false };

        const todayDate = today();
        const lastLogin = child.lastCompletedDate;

        // Check if this is a new day
        if (lastLogin === todayDate) {
          return { isNewDay: false, bonusAwarded: false };
        }

        // Check if streak should continue or reset
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastLogin === yesterdayStr) {
          // Continue streak and award 25 points bonus
          get().incrementStreak(childId);
          get().addPoints(childId, 25);
          set({ lastLoginDate: todayDate });
          return { isNewDay: true, bonusAwarded: true };
        } else if (lastLogin) {
          // Streak broken, reset and start new
          get().resetStreak(childId);
          get().incrementStreak(childId);
          get().addPoints(childId, 25);
          set({ lastLoginDate: todayDate });
          return { isNewDay: true, bonusAwarded: true };
        } else {
          // First login ever
          get().incrementStreak(childId);
          get().addPoints(childId, 25);
          set({ lastLoginDate: todayDate });
          return { isNewDay: true, bonusAwarded: true };
        }
      },

      regenerateTasks: (childId: string) => {
        const state = get();
        const child = state.currentUser?.children.find((c) => c.id === childId);
        if (!child) return;

        const todayDate = today();

        // Check current regeneration count BEFORE incrementing
        const key = `${childId}-${todayDate}`;
        const regenerationsToday = state.aiRegenerations[key] || 0;
        
        // Increment the counter internally (this function is the single source of truth)
        const newCount = regenerationsToday + 1;
        
        // If this is the 4th or more regeneration, no points will be awarded
        const isOverLimit = newCount > 3;

        // Remove existing pending tasks for today
        const filteredTasks = state.tasks.filter(
          (t) => !(t.childId === childId && t.dueDate === todayDate && t.status === 'pending')
        );

        // Generate new tasks
        let newTasks = generateDailyTasks(childId, child.ageGroup);
        
        // If over the daily limit, set points to 0 for all regenerated tasks
        if (isOverLimit) {
          newTasks = newTasks.map((task) => ({
            ...task,
            points: 0,
            noPointsReason: 'Daily AI regeneration limit exceeded',
          }));
        }

        // Update both tasks and aiRegenerations in a single set call
        set((s) => ({
          tasks: [...filteredTasks, ...newTasks],
          aiRegenerations: {
            ...s.aiRegenerations,
            [key]: newCount,
          },
        }));
        
        // Sync regenerated tasks to Supabase
        isSupabaseConfigured().then(configured => {
          if (configured) {
            // Delete old pending tasks from Supabase first
            state.tasks
              .filter((t) => t.childId === childId && t.dueDate === todayDate && t.status === 'pending')
              .forEach(task => {
                supabaseService.deleteTask(task.id);
              });
            
            // Add new tasks to Supabase
            newTasks.forEach(task => {
              supabaseService.addTask({
                id: task.id,
                child_id: task.childId,
                title: task.title,
                description: task.description,
                category: task.category,
                points: task.points,
                duration_minutes: 15,
                status: task.status,
                is_custom: task.isCustom || false,
                task_date: task.dueDate,
              });
            });
          }
        });
      },

      // Mail Verification
      sendMailVerification: (childId: string) => {
        const state = get();
        const child = state.currentUser?.children.find((c) => c.id === childId);
        if (!child) return { success: false, code: '' };

        // Generate a 6-digit verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const now = new Date().toISOString();

        set((s) => ({
          currentUser: s.currentUser
            ? {
                ...s.currentUser,
                children: s.currentUser.children.map((c) =>
                  c.id === childId
                    ? { ...c, mailVerificationCode: code, mailVerificationSentAt: now, mailVerified: false }
                    : c
                ),
              }
            : null,
        }));

        // Sync to Supabase (fire and forget - error handling inside service)
        supabaseService.updateChild(childId, {
          mail_verification_code: code,
          mail_verification_sent_at: now,
          mail_verified: false,
        });

        return { success: true, code };
      },

      verifyMailCode: (childId: string, code: string) => {
        const state = get();
        const child = state.currentUser?.children.find((c) => c.id === childId);
        if (!child || !child.mailVerificationCode) return false;

        // Check if code matches
        if (child.mailVerificationCode !== code) return false;

        // Check if code is expired (valid for 1 hour)
        if (child.mailVerificationSentAt) {
          const sentAt = new Date(child.mailVerificationSentAt);
          const now = new Date();
          const hourInMs = 60 * 60 * 1000;
          if (now.getTime() - sentAt.getTime() > hourInMs) return false;
        }

        // Mark as verified
        set((s) => ({
          currentUser: s.currentUser
            ? {
                ...s.currentUser,
                children: s.currentUser.children.map((c) =>
                  c.id === childId
                    ? { ...c, mailVerified: true, mailVerificationCode: undefined, mailVerificationSentAt: undefined }
                    : c
                ),
              }
            : null,
        }));

        // Sync to Supabase (fire and forget - error handling inside service)
        supabaseService.updateChild(childId, {
          mail_verified: true,
          mail_verification_code: null,
          mail_verification_sent_at: null,
        });

        return true;
      },
      
      // Email Verification Functions (for user signup)
      setPendingVerificationEmail: (email: string | null) => {
        set({ pendingVerificationEmail: email });
      },
      
      verifyEmail: async (email: string, code: string) => {
        if (await isSupabaseConfigured()) {
          const result = await supabaseService.verifyEmailCode(email, code);
          if (result.success) {
            // Ensure currentUser exists before authenticating
            const currentUser = get().currentUser;
            if (!currentUser) {
              // User data is missing - try to reload it
              console.warn('[verifyEmail] User data missing, cannot authenticate');
              return false;
            }
            
            // Email verified successfully - now authenticate the user
            set({ 
              isAuthenticated: true,
              pendingVerificationEmail: null
            });
            return true;
          }
          return false;
        }
        return false;
      },
      
      resendVerificationCode: async (email: string) => {
        if (await isSupabaseConfigured()) {
          const result = await supabaseService.resendVerificationCode(email);
          return result.success;
        }
        return false;
      },

      // Helpers
      getActiveChild: () => {
        const state = get();
        if (!state.activeChildId || !state.currentUser) return null;
        return state.currentUser.children.find((c) => c.id === state.activeChildId) ?? null;
      },

      getChildTasks: (childId: string) => {
        return get().tasks.filter((t) => t.childId === childId);
      },

      getTodaysTasks: (childId: string) => {
        const todayDate = today();
        return get().tasks.filter((t) => t.childId === childId && t.dueDate === todayDate);
      },

      getCompletedTasksToday: (childId: string) => {
        const todayDate = today();
        return get().tasks.filter(
          (t) =>
            t.childId === childId &&
            t.dueDate === todayDate &&
            (t.status === 'completed' || t.status === 'approved')
        );
      },

      getApprovedTasksToday: (childId: string) => {
        const todayDate = today();
        return get().tasks.filter(
          (t) => t.childId === childId && t.dueDate === todayDate && t.status === 'approved'
        );
      },

      getPendingApprovalTasks: (childId: string) => {
        return get().tasks.filter(
          (t) => t.childId === childId && t.status === 'completed'
        );
      },

      // Daily limits tracking
      getCustomTasksToday: (childId: string) => {
        const todayDate = today();
        return get().tasks.filter(
          (t) => t.childId === childId && t.dueDate === todayDate && t.isCustom === true
        ).length;
      },

      getAIRegenerationsToday: (childId: string) => {
        const todayDate = today();
        const key = `${childId}-${todayDate}`;
        return get().aiRegenerations[key] || 0;
      },

      canAddCustomTask: (childId: string) => {
        const todayDate = today();
        const customTasksToday = get().tasks.filter(
          (t) => t.childId === childId && t.dueDate === todayDate && t.isCustom === true
        ).length;
        return customTasksToday < 5;
      },

      canRegenerateWithPoints: (childId: string) => {
        const todayDate = today();
        const key = `${childId}-${todayDate}`;
        const regenerations = get().aiRegenerations[key] || 0;
        return regenerations < 3;
      },

      incrementAIRegeneration: (childId: string) => {
        const todayDate = today();
        const key = `${childId}-${todayDate}`;
        const current = get().aiRegenerations[key] || 0;
        set((state) => ({
          aiRegenerations: {
            ...state.aiRegenerations,
            [key]: current + 1,
          },
        }));
      },
      
      // Theme & Weather Actions
      setThemeMode: (mode: ThemeMode) => {
        set({ themeMode: mode });
      },
      
      toggleWeatherEffects: (enabled: boolean) => {
        set({ weatherEffectsEnabled: enabled });
        if (enabled) {
          // Auto-detect weather effect when enabled
          get().detectSeasonFromAI();
        } else {
          set({ currentWeatherEffect: 'none' });
        }
      },
      
      setWeatherEffect: (effect: WeatherEffect) => {
        set({ currentWeatherEffect: effect });
      },
      
      setSeason: (season: Season) => {
        set({ currentSeason: season });
        // Set appropriate weather effect for the season
        const seasonEffects: Record<Season, WeatherEffect> = {
          winter: 'snow',
          spring: 'petals',
          summer: 'sparkles',
          fall: 'leaves',
        };
        if (get().weatherEffectsEnabled) {
          set({ currentWeatherEffect: seasonEffects[season] });
        }
      },
      
      detectSeasonFromAI: async () => {
        try {
          const apiKey = process.env.EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY;
          if (!apiKey) {
            // Fallback: determine season based on current month
            const month = new Date().getMonth();
            let season: Season;
            if (month >= 2 && month <= 4) season = 'spring';
            else if (month >= 5 && month <= 7) season = 'summer';
            else if (month >= 8 && month <= 10) season = 'fall';
            else season = 'winter';
            get().setSeason(season);
            return;
          }
          
          const currentDate = new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          });
          
          const prompt = `Based on today's date (${currentDate}) in the Northern Hemisphere, what season is it? Reply with ONLY one word: winter, spring, summer, or fall.`;
          
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 10 },
              }),
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase().trim();
            if (['winter', 'spring', 'summer', 'fall'].includes(text)) {
              get().setSeason(text as Season);
            }
          }
        } catch (error) {
          console.log('Error detecting season from AI:', error);
          // Fallback to month-based detection
          const month = new Date().getMonth();
          let season: Season;
          if (month >= 2 && month <= 4) season = 'spring';
          else if (month >= 5 && month <= 7) season = 'summer';
          else if (month >= 8 && month <= 10) season = 'fall';
          else season = 'winter';
          get().setSeason(season);
        }
      },
    }),
    {
      name: 'posty-magic-mail-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        isOnboarded: state.isOnboarded,
        currentUser: state.currentUser,
        activeChildId: state.activeChildId,
        isChildMode: state.isChildMode,
        lastLoginDate: state.lastLoginDate,
        tasks: state.tasks,
        aiRegenerations: state.aiRegenerations,
        themeMode: state.themeMode,
      }),
    }
  )
);
