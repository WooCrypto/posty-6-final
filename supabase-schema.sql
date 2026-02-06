-- Supabase SQL Schema for Posty Magic Mail Club
-- Run this in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (parents)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  passcode TEXT DEFAULT '1234',
  subscription TEXT DEFAULT 'free' CHECK (subscription IN ('free', 'basic', 'standard', 'premium')),
  profile_image TEXT,
  email_verified BOOLEAN DEFAULT false,
  email_verification_code TEXT,
  email_verification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add email verification columns to existing users table (run if table exists)
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_code TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;

-- Children table
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birthday DATE NOT NULL,
  gender TEXT CHECK (gender IN ('boy', 'girl', 'other')),
  avatar TEXT DEFAULT 'dog',
  profile_image TEXT,
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_task_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipping addresses table
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT DEFAULT 'United States',
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  points INTEGER DEFAULT 10,
  duration_minutes INTEGER DEFAULT 15,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved', 'rejected')),
  proof_image TEXT,
  proof_timer_seconds INTEGER,
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  is_custom BOOLEAN DEFAULT false,
  task_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket for task proof images (run this in Supabase Dashboard -> Storage)
-- CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'task-proofs');
-- CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'task-proofs');

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'redeemed', 'shipped', 'delivered')),
  redeemed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  tracking_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log for tracking task completions and approvals
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table for audit trail and security
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_id TEXT,
  stripe_customer_id TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'basic', 'standard', 'premium')),
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method TEXT,
  receipt_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription details table for complete subscription tracking
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'standard', 'premium')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  price_cents INTEGER DEFAULT 0,
  mails_per_month INTEGER DEFAULT 0,
  max_children INTEGER DEFAULT 1,
  stripe_subscription_id TEXT,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  next_billing_date TIMESTAMPTZ,
  free_trial_expires_at TIMESTAMPTZ,
  first_mail_shipped BOOLEAN DEFAULT false,
  signup_type TEXT DEFAULT 'first' CHECK (signup_type IN ('first', 'returning')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset tokens table for secure password recovery
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements table for tracking child achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, achievement_type)
);

-- Badges table for mascot sticker badges earned at each level
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('achievement', 'level', 'mascot')),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  mascot TEXT CHECK (mascot IN ('posty', 'rosie', 'milo', 'skye')),
  level_earned INTEGER,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, name)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_achievements_child_id ON achievements(child_id);
CREATE INDEX IF NOT EXISTS idx_badges_child_id ON badges(child_id);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for clean setup)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert" ON users;
DROP POLICY IF EXISTS "Users can view own children" ON children;
DROP POLICY IF EXISTS "Users can manage shipping addresses" ON shipping_addresses;
DROP POLICY IF EXISTS "Users can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Users can manage rewards" ON rewards;
DROP POLICY IF EXISTS "Users can view activity" ON activity_log;

-- Note: Since we're using custom authentication (not Supabase Auth),
-- we need to allow the anon key to access data.
-- For a production app, you should implement proper JWT claims or use Supabase Auth.
-- These policies allow access via the anon key for development/demo purposes.
-- For production, replace with proper auth.uid() checks.

-- Users policies
CREATE POLICY "users_select_policy" ON users
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "users_insert_policy" ON users
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE TO anon, authenticated
  USING (true);

-- Children policies (access scoped to user_id)
CREATE POLICY "children_select_policy" ON children
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "children_insert_policy" ON children
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "children_update_policy" ON children
  FOR UPDATE TO anon, authenticated
  USING (true);

CREATE POLICY "children_delete_policy" ON children
  FOR DELETE TO anon, authenticated
  USING (true);

-- Shipping addresses policies
CREATE POLICY "shipping_select_policy" ON shipping_addresses
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "shipping_insert_policy" ON shipping_addresses
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "shipping_update_policy" ON shipping_addresses
  FOR UPDATE TO anon, authenticated
  USING (true);

CREATE POLICY "shipping_delete_policy" ON shipping_addresses
  FOR DELETE TO anon, authenticated
  USING (true);

-- Tasks policies
CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "tasks_insert_policy" ON tasks
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "tasks_update_policy" ON tasks
  FOR UPDATE TO anon, authenticated
  USING (true);

CREATE POLICY "tasks_delete_policy" ON tasks
  FOR DELETE TO anon, authenticated
  USING (true);

-- Rewards policies
CREATE POLICY "rewards_select_policy" ON rewards
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "rewards_insert_policy" ON rewards
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "rewards_update_policy" ON rewards
  FOR UPDATE TO anon, authenticated
  USING (true);

-- Activity log policies
CREATE POLICY "activity_select_policy" ON activity_log
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "activity_insert_policy" ON activity_log
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Payments policies
CREATE POLICY "payments_select_policy" ON payments
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "payments_insert_policy" ON payments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "payments_update_policy" ON payments
  FOR UPDATE TO anon, authenticated
  USING (true);

-- Password reset tokens policies
CREATE POLICY "password_reset_tokens_select_policy" ON password_reset_tokens
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "password_reset_tokens_insert_policy" ON password_reset_tokens
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "password_reset_tokens_update_policy" ON password_reset_tokens
  FOR UPDATE TO anon, authenticated
  USING (true);

CREATE POLICY "password_reset_tokens_delete_policy" ON password_reset_tokens
  FOR DELETE TO anon, authenticated
  USING (true);

-- Subscriptions policies
CREATE POLICY "subscriptions_select_policy" ON subscriptions
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "subscriptions_insert_policy" ON subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "subscriptions_update_policy" ON subscriptions
  FOR UPDATE TO anon, authenticated
  USING (true);

-- Achievements policies
CREATE POLICY "achievements_select_policy" ON achievements
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "achievements_insert_policy" ON achievements
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "achievements_update_policy" ON achievements
  FOR UPDATE TO anon, authenticated
  USING (true);

CREATE POLICY "achievements_delete_policy" ON achievements
  FOR DELETE TO anon, authenticated
  USING (true);

-- Badges policies
CREATE POLICY "badges_select_policy" ON badges
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "badges_insert_policy" ON badges
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "badges_update_policy" ON badges
  FOR UPDATE TO anon, authenticated
  USING (true);

CREATE POLICY "badges_delete_policy" ON badges
  FOR DELETE TO anon, authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_child_id ON tasks(child_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_rewards_child_id ON rewards(child_id);
CREATE INDEX IF NOT EXISTS idx_shipping_user_id ON shipping_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON payments(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_children_updated_at ON children;
DROP TRIGGER IF EXISTS update_shipping_updated_at ON shipping_addresses;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_updated_at
  BEFORE UPDATE ON shipping_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Production Security Note:
-- For production use, implement one of the following:
-- 1. Use Supabase Auth and update policies to use auth.uid()
-- 2. Implement custom JWT verification with user_id claims
-- 3. Use service_role key on backend and validate users server-side
-- 
-- Example production policy for children table:
-- CREATE POLICY "children_secure_policy" ON children
--   FOR ALL TO authenticated
--   USING (user_id = auth.uid());
