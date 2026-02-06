# Posty MagicMail Club

## Overview

Posty MagicMail Club is a subscription-based mobile application where children complete daily tasks to earn real physical mail rewards delivered to their home. The app features a dual-mode interface (Parent Mode and Child Mode) with a friendly mail-carrier dog mascot named "Posty" guiding kids through tasks and celebrating rewards.

The app blends fun & playful design for kids with discipline, education, and entrepreneur mindset development for parents. Core features include task management with AI verification, Magic Coins rewards system, streak tracking, level progression, and gift card redemptions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 53 with React Native 0.76.7
- **Routing**: Expo Router file-based routing (src/app/ directory)
- **State Management**: Zustand with persist middleware for local storage via AsyncStorage
- **Styling**: NativeWind + Tailwind CSS v3 for styling
- **Animations**: react-native-reanimated v3 (preferred over Animated from react-native)
- **Gestures**: react-native-gesture-handler
- **Icons**: lucide-react-native
- **Server State**: React Query (@tanstack/react-query) for async state management

### Application Structure
```
src/app/          — Expo Router file-based routes (src/app/_layout.tsx is root)
src/components/   — Reusable UI components
src/lib/          — Utilities, state management, API clients, and type definitions
```

### Backend Architecture
- **Database**: Supabase (PostgreSQL) for data persistence
  - Environment secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
  - Schema file: `supabase-schema.sql` (run in Supabase SQL Editor)
  - Tables: users, children, shipping_addresses, tasks, rewards, activity_log, payments, subscriptions, password_reset_tokens, achievements, badges
  - **IMPORTANT**: Run `supabase-schema.sql` in Supabase SQL Editor to create all tables including achievements and badges
- **Sync Pattern**: Background sync - local state updates immediately, Supabase syncs asynchronously
- **Authentication**: bcryptjs password hashing, custom auth with Supabase tables
- **Fallback**: App works offline with local AsyncStorage, syncs when Supabase available

### PWA Support (Web)
- **Manifest**: `public/manifest.json` with app name, icons, theme colors
- **Service Worker**: `public/sw.js` for offline caching and PWA install support
- **Install Prompt**: `src/components/InstallPrompt.tsx` component triggers "Add to Home Screen"
  - Handles Chrome/Android `beforeinstallprompt` event
  - Shows iOS Safari-specific instructions for manual install
  - Prompts appear after 3-5 seconds on first visit (dismissable, remembers for 7 days)
- **Meta Tags**: PWA meta tags in `src/app/+html.tsx` including apple-touch-icon

### Support Contact
- Phone: +1-(843) 418-1006 (10am - 9pm EST)
- Available in Parent Profile > Support section with tap-to-call functionality

### Authentication System
- Database-backed authentication with email/password (bcrypt hashed)
- Google Sign-In integration via expo-auth-session (also database-backed)
- **Email Verification for New Signups**:
  - 6-digit verification code sent to email after registration
  - Users cannot login until email is verified
  - Verification page at `/auth/verify-email` with Posty mascot
  - Codes expire after 1 hour
  - Resend code functionality with 60-second cooldown
  - Google Sign-In users are automatically verified
- Password recovery via 6-digit email verification codes
- Passcode-protected Parent Mode switching (4-digit PIN) with email recovery
- Persistent login across app restarts via AsyncStorage + JWT tokens
- API client at `src/lib/api.ts` handles all backend communication

### Email Service
- Email verification service at `src/lib/email-service.ts`
- SMTP configuration via environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`
- Verification codes logged to console for development (production would use actual SMTP or Supabase Edge Function)
- Database columns: `email_verified`, `email_verification_code`, `email_verification_sent_at` in users table

### Dual-Mode Interface
- **Parent Mode**: Manage children, approve tasks, configure settings, subscription management
- **Child Mode**: Complete tasks, earn Magic Coins, view rewards, track progress
- Secure passcode system to switch between modes

### Child Management
- **Gender Selection**: Boy/girl picker with kid-friendly emoji icons (👦👧)
  - Available in signup flow, Parent Mode Add Child, and Child Detail edit screen
  - Color-coded selection cards (blue for boy, pink for girl)
  - Gender synced to Supabase children table
  - Optional field - defaults to 'boy' if not specified

### Mascot Characters
- **Posty**: Main mascot - friendly mail-carrier dog in blue uniform
- **Rosie**: Second main character - pink dog with gifts
- **Milo**: Orange monkey explorer with maps and compass
- **Skye**: Blue bird with pink hat carrying gifts
- Mascots displayed on welcome page as "MEET THE CLUB" section
- Static images (no animations) for stability

### Seasonal Weather Effects
- Animated overlay effects based on current season:
  - Winter: Snow particles falling
  - Spring: Flower petals floating
  - Summer: Sparkle/sunshine effects
  - Fall: Falling leaves
- AI-powered season detection using Google Gemini with month-based fallback
- Weather effects component at `src/components/WeatherEffects.tsx`
- Toggle available in both Parent and Child profile screens

### Task System
- Age-appropriate daily task generation based on child age groups (5-7, 8-11, 12-14, 15-17)
- Photo proof of work with AI verification via Google Gemini
- Timer-based task completion tracking with seconds precision
- Custom task creation for parents (limited to 5 per day per child with points; unlimited without points)
- AI task regeneration (limited to 3 per day with points; 4th+ generates tasks with 0 points)
- **Task Sync to Supabase**: All tasks (generated, custom, regenerated) are synced to Supabase
  - Tasks persist across logins and devices
  - Date format normalized to YYYY-MM-DD for consistent filtering
  - refreshDailyTasks, addCustomTask, regenerateTasks all sync to database
- **Proof Storage**: Task proof photos uploaded to Supabase Storage with public URLs
  - Photos accessible across devices for parent approval
  - Timer seconds stored in `proof_timer_seconds` column
  - Tasks loaded from DB on login with proof data mapped correctly
- **Parent Task Approval**: Approve individual tasks or all pending tasks at once with passcode verification
- **Profile Photos**: Parent and child profile photos uploaded to Supabase Storage
  - Photos persist across sessions and devices
  - Stored in `profile_image` column for both users and children tables
  - Parents can set/change their photo in Edit Profile screen
  - Child photos can be set from the Child Detail screen (camera or library)

### Rewards System
- **Gift Card Rewards** (achievable over weeks of consistent effort):
  - Roblox Gift Card ($5): 25,000 pts
  - iTunes/Apple Gift Card ($10): 50,000 pts
  - Amazon Gift Card ($15): 75,000 pts
  - Visa Gift Card ($25): 125,000 pts
- **Physical Mail Claims**:
  - When mail meter reaches 100%, child can claim physical mail reward
  - **Parent passcode required** - Parents must enter 4-digit passcode to approve mail claims
  - Verification state synced to Supabase (mail_verification_code, mail_verification_sent_at, mail_verified columns)
  - Once verified, mail reward is queued for next shipping cycle
- **3-Week Shipping Cycle**:
  - Physical mail ships every 3 weeks from user's signup date
  - Shipping countdown displayed on child home, child rewards, and parent dashboard
  - Functions: `getNextShippingDate()`, `getDaysUntilShipping()`, `formatShippingDate()` in `src/lib/subscriptionLimits.ts`
  - Shows "X days until next mail ships" with actual ship date

### Achievements & Leveling System
- **Achievements**: Database-backed achievement tracking
  - 18 achievement types: task milestones, streak milestones, points milestones, level milestones, mail unlocks
  - Achievements auto-unlock when criteria met (checked on task approval, level-up, etc.)
  - Stored in `achievements` table, displayed as badges on child profile
  - Definitions in `ACHIEVEMENT_DEFINITIONS` in `src/lib/types.ts`
- **Mascot Sticker Badges**: Earned at each level up
  - 4 mascots rotate: Posty, Rosie, Milo, Skye
  - Each level (1-15) awards a unique mascot badge
  - Badges stored in `badges` table with `type: 'mascot'`
  - Definitions in `MASCOT_STICKERS` in `src/lib/types.ts`
- **Level Progression**: Based on total points (500 points per level)
- **Mail Meter Pie Chart**: Circular progress visualization using `ProgressPieChart` component

### Subscription & Payments
- **RevenueCat**: In-app purchases for iOS and Android native stores
- **Stripe**: Card payment processing for web and mobile fallback
- Plan tiers: Free (1 child), Basic ($9.99, 1 child), Standard ($19.99, 3 children), Premium ($29.99, unlimited)
- **Subscription Required for Tasks**: Users must select a subscription plan (even free) before children can complete tasks. A modal prompts kids to ask parents to select a plan if none is chosen.
- **Free Plan Restrictions**:
  - Limited to first-time signups only (1 child max)
  - Expires after 30 days or when first mail is shipped
  - Free plan users receive certificate and Posty Magic stickers only
  - Users cannot switch from paid plans to free (free plan visible but disabled in plan selection)
  - During signup, adding 2+ children prompts user to upgrade for all children or continue with 1 child on free plan

## External Dependencies

### Payment Services
- **RevenueCat** (react-native-purchases): Native in-app subscriptions
  - Environment variables: `EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY`, `EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY`, `EXPO_PUBLIC_VIBECODE_REVENUECAT_GOOGLE_KEY`
- **Stripe**: Card payment processing
  - Environment variables: `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_STRIPE_SECRET_KEY`
  - Product IDs configured for basic, standard, and premium plans

### AI Services
- **Google Gemini API**: Task verification from photos, personalized messages, task generation
  - Environment variable: `EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY`
  - Endpoint: gemini-3-pro-preview model

### Authentication
- **Google OAuth**: Sign-in with Google via expo-auth-session
  - Environment variables: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

### Local Storage
- **AsyncStorage**: Persistent state storage via Zustand persist middleware
- **expo-secure-store**: Available for sensitive data (tokens, credentials)

### Development Environment
- **Package Manager**: bun (not npm)
- **Dev Server**: Expo running on port 5000 (Replit)
- **Runtime**: Node.js 20 + bun 1.2
- **Workflow**: `bun run web` starts the Expo web server
- **Forbidden Files**: patches/, babel.config.js, metro.config.js, app.json, tsconfig.json, nativewind-env.d.ts