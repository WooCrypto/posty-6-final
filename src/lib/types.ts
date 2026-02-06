// Core Types for Posty MagicMail Club

export type UserRole = 'parent' | 'child' | 'admin';
export type SubscriptionPlan = 'free' | 'basic' | 'standard' | 'premium';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'verified' | 'approved' | 'rejected';
export type AgeGroup = '5-7' | '8-11' | '12-14' | '15-17';

export interface User {
  id: string;
  email: string;
  password?: string; // Stored for login validation
  name: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
  subscription?: Subscription;
  shippingAddress?: ShippingAddress;
  children: Child[];
  passcode?: string;
}

export interface Child {
  id: string;
  name: string;
  age: number;
  gender?: 'boy' | 'girl';
  avatar?: string;
  ageGroup: AgeGroup;
  points: number;
  totalPoints: number;
  streakDays: number;
  lastCompletedDate?: string;
  level: number;
  badges: Badge[];
  mailMeterProgress: number;
  mailVerificationCode?: string;
  mailVerificationSentAt?: string;
  mailVerified?: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  childId: string;
  title: string;
  description: string;
  category: TaskCategory;
  points: number;
  status: TaskStatus;
  dueDate: string;
  completedAt?: string;
  verifiedAt?: string;
  approvedAt?: string;
  isCustom: boolean;
  ageGroup: AgeGroup;
  requiresProof: boolean;
  proofPhotoUri?: string;
  proofTimerSeconds?: number;
  noPointsReason?: string;
  aiVerificationResult?: {
    isVerified: boolean;
    confidence: number;
    feedback: string;
  };
}

export type TaskCategory =
  | 'reading'
  | 'chores'
  | 'creativity'
  | 'kindness'
  | 'fitness'
  | 'mindset'
  | 'learning'
  | 'goals'
  | 'entrepreneur'
  | 'general';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
  type?: 'achievement' | 'level' | 'mascot';
  mascot?: 'posty' | 'rosie' | 'milo' | 'skye';
}

export interface Achievement {
  id: string;
  childId: string;
  achievementType: AchievementType;
  unlockedAt: string;
  progress?: number;
  targetValue?: number;
}

export type AchievementType = 
  | 'first_task'
  | 'task_10'
  | 'task_25'
  | 'task_50'
  | 'task_100'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'points_100'
  | 'points_500'
  | 'points_1000'
  | 'points_5000'
  | 'level_2'
  | 'level_5'
  | 'level_10'
  | 'level_15'
  | 'mail_unlocked'
  | 'mail_shipped';

export interface AchievementDefinition {
  id: AchievementType;
  name: string;
  description: string;
  icon: string;
  targetValue: number;
  checkType: 'tasks' | 'streak' | 'points' | 'level' | 'mail';
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { id: 'first_task', name: 'First Task', description: 'Complete your first task', icon: '🌟', targetValue: 1, checkType: 'tasks' },
  { id: 'task_10', name: 'Getting Started', description: 'Complete 10 tasks', icon: '📋', targetValue: 10, checkType: 'tasks' },
  { id: 'task_25', name: 'Task Master', description: 'Complete 25 tasks', icon: '✅', targetValue: 25, checkType: 'tasks' },
  { id: 'task_50', name: 'Super Achiever', description: 'Complete 50 tasks', icon: '🏆', targetValue: 50, checkType: 'tasks' },
  { id: 'task_100', name: 'Century Champion', description: 'Complete 100 tasks', icon: '💎', targetValue: 100, checkType: 'tasks' },
  { id: 'streak_3', name: 'Consistency', description: '3 day streak', icon: '🔥', targetValue: 3, checkType: 'streak' },
  { id: 'streak_7', name: 'Week Warrior', description: '7 day streak', icon: '🔥', targetValue: 7, checkType: 'streak' },
  { id: 'streak_14', name: 'Two Week Champion', description: '14 day streak', icon: '💪', targetValue: 14, checkType: 'streak' },
  { id: 'streak_30', name: 'Monthly Master', description: '30 day streak', icon: '👑', targetValue: 30, checkType: 'streak' },
  { id: 'points_100', name: 'Century Club', description: 'Earn 100 points', icon: '💯', targetValue: 100, checkType: 'points' },
  { id: 'points_500', name: 'Point Collector', description: 'Earn 500 points', icon: '⭐', targetValue: 500, checkType: 'points' },
  { id: 'points_1000', name: 'Point Master', description: 'Earn 1,000 points', icon: '🌟', targetValue: 1000, checkType: 'points' },
  { id: 'points_5000', name: 'Point Legend', description: 'Earn 5,000 points', icon: '💫', targetValue: 5000, checkType: 'points' },
  { id: 'level_2', name: 'Level Up!', description: 'Reach Level 2', icon: '📈', targetValue: 2, checkType: 'level' },
  { id: 'level_5', name: 'Rising Star', description: 'Reach Level 5', icon: '🚀', targetValue: 5, checkType: 'level' },
  { id: 'level_10', name: 'Expert', description: 'Reach Level 10', icon: '🎯', targetValue: 10, checkType: 'level' },
  { id: 'level_15', name: 'Master', description: 'Reach Level 15', icon: '🏅', targetValue: 15, checkType: 'level' },
  { id: 'mail_unlocked', name: 'Mail Time!', description: 'Unlock your first mail', icon: '📬', targetValue: 100, checkType: 'mail' },
];

export const MASCOT_STICKERS: Record<number, { mascot: 'posty' | 'rosie' | 'milo' | 'skye'; name: string; description: string }> = {
  1: { mascot: 'posty', name: 'Posty Starter', description: 'Welcome to the club!' },
  2: { mascot: 'rosie', name: 'Rosie Friend', description: 'Level 2 achieved!' },
  3: { mascot: 'milo', name: 'Milo Explorer', description: 'Level 3 achieved!' },
  4: { mascot: 'skye', name: 'Skye Flyer', description: 'Level 4 achieved!' },
  5: { mascot: 'posty', name: 'Posty Star', description: 'Level 5 achieved!' },
  6: { mascot: 'rosie', name: 'Rosie Helper', description: 'Level 6 achieved!' },
  7: { mascot: 'milo', name: 'Milo Adventurer', description: 'Level 7 achieved!' },
  8: { mascot: 'skye', name: 'Skye Traveler', description: 'Level 8 achieved!' },
  9: { mascot: 'posty', name: 'Posty Champion', description: 'Level 9 achieved!' },
  10: { mascot: 'rosie', name: 'Rosie Champion', description: 'Level 10 achieved!' },
  11: { mascot: 'milo', name: 'Milo Champion', description: 'Level 11 achieved!' },
  12: { mascot: 'skye', name: 'Skye Champion', description: 'Level 12 achieved!' },
  13: { mascot: 'posty', name: 'Posty Legend', description: 'Level 13 achieved!' },
  14: { mascot: 'rosie', name: 'Rosie Legend', description: 'Level 14 achieved!' },
  15: { mascot: 'milo', name: 'Milo Legend', description: 'Level 15 achieved!' },
};

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: 'active' | 'paused' | 'cancelled';
  startDate: string;
  nextBillingDate: string;
  mailsPerMonth: number;
  price: number;
  signupType?: 'first' | 'returning'; // Track if this is a first-time signup
  freeTrialExpiresAt?: string; // Free trial expires 30 days from signup or until first mail shipped
  firstMailShipped?: boolean; // Track if first mail has been shipped
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface MailReward {
  id: string;
  childId: string;
  type: 'letter' | 'sticker' | 'activity' | 'challenge' | 'gift';
  status: 'pending' | 'preparing' | 'shipped' | 'delivered';
  scheduledDate: string;
  shippedDate?: string;
  deliveredDate?: string;
  trackingNumber?: string;
}

export interface DailyProgress {
  date: string;
  totalTasks: number;
  completedTasks: number;
  approvedTasks: number;
  pointsEarned: number;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, { name: string; price: number; mails: number; features: string[] }> = {
  free: {
    name: 'Free Trial',
    price: 0,
    mails: 0,
    features: [
      '1 month free trial',
      'Certificate of achievement',
      'Posty Magic sticker pack',
      'Basic task tracking',
    ],
  },
  basic: {
    name: 'Basic',
    price: 9.99,
    mails: 2,
    features: [
      '2 mail deliveries per month',
      'Daily tasks for your child',
      'Progress tracking',
      'Personalized letters from Posty',
    ],
  },
  standard: {
    name: 'Standard',
    price: 19.99,
    mails: 4,
    features: [
      '4 mail deliveries per month (weekly)',
      'Daily tasks for your child',
      'Progress tracking',
      'Personalized letters from Posty',
      'Stickers & activity pages',
      'Most Popular!',
    ],
  },
  premium: {
    name: 'Premium',
    price: 29.99,
    mails: 5,
    features: [
      '4-5 mail deliveries per month',
      'Small gifts included',
      'Birthday mail celebration',
      'Bonus challenges',
      'Priority support',
      'Exclusive Posty merchandise',
    ],
  },
};

export const AGE_GROUPS: Record<AgeGroup, { label: string; minAge: number; maxAge: number }> = {
  '5-7': { label: 'Little Explorers (Ages 5-7)', minAge: 5, maxAge: 7 },
  '8-11': { label: 'Junior Achievers (Ages 8-11)', minAge: 8, maxAge: 11 },
  '12-14': { label: 'Rising Stars (Ages 12-14)', minAge: 12, maxAge: 14 },
  '15-17': { label: 'Future Leaders (Ages 15-17)', minAge: 15, maxAge: 17 },
};

export function getAgeGroup(age: number): AgeGroup {
  if (age >= 5 && age <= 7) return '5-7';
  if (age >= 8 && age <= 11) return '8-11';
  if (age >= 12 && age <= 14) return '12-14';
  return '15-17';
}

export function getPointsMultiplier(totalPoints: number): number {
  if (totalPoints >= 5000) return 3;
  if (totalPoints >= 2500) return 2;
  return 1;
}

// Helper function to check if free trial has expired
export function isFreePlanExpired(subscription?: Subscription): boolean {
  if (!subscription || subscription.plan !== 'free') return false;
  
  // Free plan expires when first mail is shipped
  if (subscription.firstMailShipped) return true;
  
  // Free plan expires after 30 days
  if (subscription.freeTrialExpiresAt) {
    const expirationDate = new Date(subscription.freeTrialExpiresAt);
    return new Date() > expirationDate;
  }
  
  return false;
}

// Helper function to check if user is eligible for free plan (first-time signup only)
export function isEligibleForFreePlan(subscription?: Subscription): boolean {
  // If no subscription, they are eligible (first-time signup)
  if (!subscription) return true;
  
  // If they have a subscription, only eligible if it was a first-time signup and they're currently on free
  if (subscription.signupType === 'first' && subscription.plan === 'free') return true;
  
  // Returning users or users who've had paid plans are not eligible
  return false;
}
