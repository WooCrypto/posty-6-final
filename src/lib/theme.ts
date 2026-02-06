// Design System - Colors, spacing, and theme constants
export const colors = {
  // Primary brand colors
  primary: {
    blue: '#4A90E2',
    blueDark: '#2E6BB0',
    blueLight: '#7AB3F0',
    gold: '#FFD93D',
    goldDark: '#E6C235',
    goldLight: '#FFE566',
  },
  // Secondary colors
  secondary: {
    coral: '#FF6B6B',
    mint: '#4ECDC4',
    lavender: '#A78BFA',
    peach: '#FBBF77',
    sky: '#87CEEB',
  },
  // Neutral colors
  neutral: {
    white: '#FFFFFF',
    offWhite: '#F8FAFC',
    gray50: '#F8FAFC',
    gray100: '#F1F5F9',
    gray200: '#E2E8F0',
    gray300: '#CBD5E1',
    gray400: '#94A3B8',
    gray500: '#64748B',
    gray600: '#475569',
    gray700: '#334155',
    gray800: '#1E293B',
    gray900: '#0F172A',
    black: '#000000',
  },
  // Semantic colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  // Background gradients
  gradients: {
    primary: ['#4A90E2', '#7AB3F0'],
    gold: ['#FFD93D', '#FFE566'],
    sunset: ['#FF6B6B', '#FBBF77'],
    ocean: ['#4ECDC4', '#4A90E2'],
    purple: ['#A78BFA', '#7C3AED'],
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  // Font weights (for use with custom fonts)
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
};

// Posty mascot quotes for encouragement
export const postyQuotes = {
  taskComplete: [
    "Woof! Great job! You're amazing!",
    "Pawsome work! Keep it up!",
    "That's the spirit! Posty is proud!",
    "You did it! Time for a happy dance!",
    "Bark bark! Another task done!",
  ],
  mailUnlocked: [
    "Special delivery incoming! You earned it!",
    "Posty is packing your mail right now!",
    "Your mailbox is about to get exciting!",
    "A surprise is on its way to you!",
  ],
  streakMessages: {
    3: "3 days in a row! You're on fire!",
    7: "A whole week! Incredible dedication!",
    14: "Two weeks strong! You're unstoppable!",
    30: "30 days! You're a true champion!",
  },
  encouragement: [
    "You've got this!",
    "Posty believes in you!",
    "One step at a time!",
    "Every task makes you stronger!",
    "Let's make today amazing!",
  ],
  tips: [
    "Finish tasks early to earn bonus time for play!",
    "Reading for 15 minutes a day makes you super smart!",
    "Helping with chores shows you're responsible!",
    "Practice makes perfect - keep trying!",
    "Be kind to others and kindness comes back!",
    "Drinking water helps your brain work better!",
    "Taking breaks helps you focus more!",
    "A tidy room means a tidy mind!",
    "Say please and thank you - manners matter!",
    "Trying new things helps you grow!",
    "Mistakes help us learn - don't give up!",
    "Exercise makes your body and mind strong!",
    "Eating fruits and veggies gives you energy!",
    "Good sleep helps you do your best tomorrow!",
    "Sharing is caring - it feels great!",
    "Set small goals and celebrate when you reach them!",
    "Listen carefully - good listeners are great learners!",
    "Be patient - good things take time!",
    "Organize your stuff so you can find things easily!",
    "Compliment someone today - spread happiness!",
    "Ask questions - curious minds discover amazing things!",
    "Finish what you start - you'll feel proud!",
    "Save a little each week - watch it grow!",
    "Write down your ideas - they're valuable!",
    "Help a friend with their task today!",
  ],
};

export function getRandomQuote(category: keyof typeof postyQuotes): string {
  const quotes = postyQuotes[category];
  if (Array.isArray(quotes)) {
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
  return "You're doing great!";
}

export function getRotatingTip(): string {
  const tips = postyQuotes.tips;
  const now = new Date();
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  const tipIndex = Math.floor(minutesSinceMidnight / 10) % tips.length;
  return tips[tipIndex];
}

export function getDailyTip(): string {
  const tips = postyQuotes.tips;
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return tips[dayOfYear % tips.length];
}
