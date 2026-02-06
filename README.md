# Posty MagicMail Club

A subscription-based mobile application where children complete daily tasks to earn real physical mail rewards delivered to their home. Built with Expo SDK 53 and React Native.

## Overview

Posty MagicMail Club blends fun & playful design for kids with discipline, education, and entrepreneur mindset for parents. The experience feels like: **A fun mail adventure that secretly builds disciplined, confident, future-ready kids.**

### Mascot
- **Posty**: A friendly mail-carrier dog who guides kids through tasks and celebrates rewards (uses custom mascot image)

## Features

### For Parents
- Create account and manage subscription plans
- **Edit Profile** - Update parent name from profile settings
- **Forgot Password** - Recover account access via email verification
- Add multiple child profiles (up to 5 children)
- **Delete Child Profiles** - Remove child profiles with passcode verification (cannot delete the last one)
- **Passcode-Protected Task Approval** - PIN required to approve completed tasks
- Add custom tasks for children
- **AI Regenerate Tasks** - Generate new tasks with AI (requires passcode)
- Track progress across all children
- Manage shipping address for mail rewards
- Secure passcode system to switch modes
- **Back Navigation** - Go back during signup to edit information

### For Children
- Age-appropriate daily tasks
- **Proof of Work** - Take photos or use timer to prove task completion
- **AI Task Verification** - Google Gemini AI verifies photo proof
- Points and rewards system
- **Gift Card Rewards** - Redeem points for Amazon, Visa, Roblox, iTunes gift cards
- Mail Meter progress tracking
- **Daily Login Bonus** - Earn 25 points for logging in each day
- Streak counter with bonus multipliers
- Level progression
- Badges and achievements

### Technical Features
- **Persistent Login** - Users stay logged in across app restarts
- **Google Sign-In** - Sign in with Google account using expo-auth-session
- **RevenueCat Integration** - In-app subscriptions for iOS and Android
- **Stripe Card Payments** - Pay with card option for web and mobile users
  - Product IDs: $9.99 (prod_TqCxtjPfefJnaZ), $19.99 (prod_TqCzdLTx9BO8FM), $29.99 (prod_TqD0QqP9zVhndh)
- **Google Gemini AI** - AI-powered task verification and personalized messages
- **Subscription Limits** - Child profile limits enforced based on plan (free: 1, basic: 1, standard: 3, premium: unlimited)

## Subscription Plans

| Plan | Price | Children | Features |
|------|-------|----------|----------|
| **Free Trial** | FREE | 1 child | 1 month, certificate & stickers |
| Basic | $9.99/month | 1 child | Daily tasks, mail rewards, basic badges |
| Standard | $19.99/month | Up to 3 | + Custom tasks, AI verification |
| Premium | $29.99/month | Unlimited | + Gift card rewards |

## Task System

Tasks are auto-generated daily based on age groups:

### Ages 5-7 (Little Explorers)
- Coloring, reading with parent, cleaning toys, gratitude drawing

### Ages 8-11 (Junior Achievers)
- Chores, reading, writing prompts, kindness challenges

### Ages 12-14 (Rising Stars)
- Journaling, fitness challenges, mindset prompts, focus challenges

### Ages 15-17 (Future Leaders)
- Goal setting, budgeting basics, entrepreneur challenges

## Points System

- Tasks earn points based on difficulty
- Points multipliers: 2x at 2,500 total points, 3x at 5,000 total points
- **Daily Login Bonus**: 25 points for logging in each day
- Mail Meter fills as tasks are approved
- 100% Mail Meter = mail delivery unlocked!

## Gift Card Rewards

Kids can save up points to redeem for real gift cards:
- **Amazon Gift Card** - 500 points
- **Visa Gift Card** - 500 points
- **Roblox Gift Card** - 300 points
- **iTunes/Apple Gift Card** - 400 points

## App Structure

```
src/
├── app/                    # Expo Router screens
│   ├── auth/              # Login, registration, forgot password
│   ├── setup/             # Onboarding flow
│   ├── parent/            # Parent dashboard screens
│   │   └── (tabs)/        # Home, Children, Activity, Profile
│   ├── child/             # Child dashboard screens
│   │   └── (tabs)/        # Home, Tasks, Rewards, Me
│   ├── paywall.tsx        # Subscription paywall (with free trial)
│   ├── passcode.tsx       # Parent PIN verification
│   ├── terms.tsx          # Terms of Service
│   └── privacy.tsx        # Privacy Policy
├── components/            # Reusable UI components
│   ├── PostyMascot.tsx    # Animated mascot component
│   └── AppFooter.tsx      # Social links & legal footer
└── lib/                   # Utilities and state
    ├── store.ts           # Zustand state management
    ├── types.ts           # TypeScript types
    ├── task-generator.ts  # Daily task generation
    ├── gemini.ts          # Google Gemini AI service
    ├── revenuecatClient.ts # RevenueCat subscription wrapper
    ├── stripeClient.ts    # Stripe card payments client
    └── subscriptionLimits.ts # Plan limits & enforcement
```

## Key Features

### Parent Mode
- View all children's progress
- **Passcode-protected task approval**
- Manage subscription and shipping
- Add custom tasks
- AI Regenerate Tasks (requires passcode verification)
- Change passcode

### Child Mode
- Complete daily tasks
- **Add proof with photo or timer**
- View points and streaks
- Track Mail Meter progress
- **Redeem points for gift cards**
- View achievements and badges
- Daily login bonus (+25 points)
- **Logout** - Children can log out from the profile tab

### Passcode System
- 4-digit PIN to switch from child to parent mode
- **Required for approving tasks**
- Required for AI Task Regeneration
- **Forgot Passcode** - Full email verification flow to reset passcode
- Email current passcode for safekeeping

### Safety Features
- **COPPA Compliant** - Minimal data collection, no sharing of children's info
- **Parent-Controlled** - All approvals require parent verification with PIN
- **No Social Features** - Children cannot communicate with others
- **Parent Safety Promise** - Displayed during subscription selection
- **Parent Consent Checkbox** - Required before subscribing

## Environment Variables

- `EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY` - Google Gemini AI API key
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` - Google OAuth Web Client ID (for Google Sign-In)
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` - Google OAuth iOS Client ID (optional)
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` - Google OAuth Android Client ID (optional)
- `EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY` - RevenueCat test API key
- `EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY` - RevenueCat iOS production key
- `EXPO_PUBLIC_VIBECODE_REVENUECAT_GOOGLE_KEY` - RevenueCat Android production key
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key for card payments
- `EXPO_PUBLIC_STRIPE_SECRET_KEY` - Stripe secret key for card payments
- `EXPO_PUBLIC_PAYMENT_SERVER_URL` - Backend URL for Stripe payment processing (optional)

## Social Media
- Instagram: @postymagicmail
- Facebook: @PostyMagicMailClub
- X (Twitter): @magicmailclub
- YouTube: @PostyMagicMailClub
- TikTok: @postymagic

## Tech Stack

- **Framework**: Expo SDK 53 with React Native
- **Routing**: Expo Router (file-based)
- **State**: Zustand with AsyncStorage persistence
- **Styling**: NativeWind (TailwindCSS)
- **Animations**: React Native Reanimated
- **Icons**: Lucide React Native
- **Subscriptions**: RevenueCat
- **AI**: Google Gemini 3 Pro

## Getting Started

The app starts on the welcome screen. New users can:
1. Create a parent account
2. Add child profiles with name and age
3. Select a subscription plan (with parent consent)
4. Enter shipping address
5. Start completing tasks!

## Navigation Flow

```
Welcome → Register → Add Child → Select Plan → Paywall → Shipping → Complete
                                                              ↓
                                                    Parent Dashboard
                                                              ↓
                                         Switch to Child → Child Dashboard
                                                              ↓
                                              Passcode → Parent Dashboard
```

### Authentication
- Users can log back in with their registered email and password
- Forgot Password feature available for account recovery
- Credentials are stored locally and persist across sessions

## Legal

- [Terms of Service](https://postymail.club/terms)
- [Privacy Policy](https://postymail.club/privacy)

© 2026 Posty Magic Mail Club
