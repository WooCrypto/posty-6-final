// Subscription limits and checks
import { SubscriptionPlan, Subscription } from './types';

export interface SubscriptionLimits {
  maxChildren: number;
  hasMailRewards: boolean;
  hasCustomTasks: boolean;
  hasAIVerification: boolean;
  hasGiftCardRewards: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan | 'free', SubscriptionLimits> = {
  free: {
    maxChildren: 1,
    hasMailRewards: false,
    hasCustomTasks: false,
    hasAIVerification: false,
    hasGiftCardRewards: false,
  },
  basic: {
    maxChildren: 1,
    hasMailRewards: true,
    hasCustomTasks: false,
    hasAIVerification: false,
    hasGiftCardRewards: false,
  },
  standard: {
    maxChildren: 3,
    hasMailRewards: true,
    hasCustomTasks: true,
    hasAIVerification: true,
    hasGiftCardRewards: false,
  },
  premium: {
    maxChildren: Infinity,
    hasMailRewards: true,
    hasCustomTasks: true,
    hasAIVerification: true,
    hasGiftCardRewards: true,
  },
};

export function getSubscriptionLimits(subscription?: Subscription): SubscriptionLimits {
  if (!subscription) {
    return PLAN_LIMITS.free;
  }
  return PLAN_LIMITS[subscription.plan] ?? PLAN_LIMITS.free;
}

export function canAddChild(subscription?: Subscription, currentChildCount: number = 0): boolean {
  const limits = getSubscriptionLimits(subscription);
  return currentChildCount < limits.maxChildren;
}

export function getChildLimitMessage(subscription?: Subscription): string {
  const limits = getSubscriptionLimits(subscription);
  if (limits.maxChildren === Infinity) {
    return 'Unlimited children';
  }
  if (limits.maxChildren === 1) {
    return '1 child profile';
  }
  return `Up to ${limits.maxChildren} children`;
}

export function getRecommendedPlanForChildren(childCount: number): SubscriptionPlan {
  if (childCount <= 1) return 'basic';
  if (childCount <= 3) return 'standard';
  return 'premium';
}

export function isFreePlan(subscription?: Subscription): boolean {
  // If no subscription or price is 0, it's a free plan
  if (!subscription) return true;
  // Check if it's using the basic plan but at a free trial price
  return subscription.price === 0 || subscription.price === 9.99; // Free trial uses basic plan pricing
}

export function hasSelectedPlan(subscription?: Subscription): boolean {
  // Check if user has actively selected any plan (including free)
  return !!subscription && !!subscription.plan;
}

export function getNextShippingDate(signupDate: string): Date {
  // Calculate next shipping date based on 3-week cycle from signup
  const signup = new Date(signupDate);
  const now = new Date();
  const cycleLength = 21; // 3 weeks in days
  
  // Calculate days since signup
  const daysSinceSignup = Math.floor((now.getTime() - signup.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate which cycle we're in and when the next one ends
  const currentCycle = Math.floor(daysSinceSignup / cycleLength);
  const nextCycleEndDay = (currentCycle + 1) * cycleLength;
  
  // Calculate the next shipping date
  const nextShippingDate = new Date(signup);
  nextShippingDate.setDate(signup.getDate() + nextCycleEndDay);
  
  return nextShippingDate;
}

export function getDaysUntilShipping(signupDate: string): number {
  const nextShipping = getNextShippingDate(signupDate);
  const now = new Date();
  const diffTime = nextShipping.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export function formatShippingDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
}
