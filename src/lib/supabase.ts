import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Database features will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type User = {
  id: string;
  email: string;
  name: string;
  google_id?: string;
  passcode: string;
  subscription: 'free' | 'basic' | 'standard' | 'premium';
  profile_image?: string;
  created_at: string;
  updated_at: string;
};

export type Child = {
  id: string;
  user_id: string;
  name: string;
  birthday: string;
  gender: 'boy' | 'girl' | 'other';
  avatar: string;
  profile_image?: string;
  points: number;
  level: number;
  streak: number;
  created_at: string;
  updated_at: string;
};

export type ShippingAddress = {
  id: string;
  user_id: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  child_id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  duration_minutes: number;
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  proof_image?: string;
  completed_at?: string;
  approved_at?: string;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
};

export type Reward = {
  id: string;
  child_id: string;
  title: string;
  description: string;
  points_cost: number;
  image_url?: string;
  redeemed_at?: string;
  shipped_at?: string;
  created_at: string;
};

export async function isSupabaseConfigured(): Promise<boolean> {
  return !!(supabaseUrl && supabaseAnonKey);
}
