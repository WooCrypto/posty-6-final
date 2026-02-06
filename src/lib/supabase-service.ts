import { supabase, isSupabaseConfigured } from './supabase';
import { User, Child, ShippingAddress, Task, SubscriptionPlan, TaskCategory, TaskStatus, AgeGroup, Badge } from './types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    return bcrypt.compare(password, storedHash);
  } catch {
    return false;
  }
}

export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  google_id?: string;
  passcode: string;
  subscription: string;
  profile_image?: string;
  created_at: string;
  updated_at: string;
}

export interface DbChild {
  id: string;
  user_id: string;
  name: string;
  birthday: string;
  gender: string;
  avatar: string;
  profile_image?: string;
  points: number;
  level: number;
  streak: number;
  last_task_date?: string;
  mail_meter_progress?: number;
  mail_verification_code?: string | null;
  mail_verification_sent_at?: string | null;
  mail_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbShippingAddress {
  id: string;
  user_id: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  child_id: string;
  title: string;
  description?: string;
  category: string;
  points: number;
  duration_minutes: number;
  status: string;
  proof_image?: string;
  proof_timer_seconds?: number;
  completed_at?: string;
  approved_at?: string;
  rejected_reason?: string;
  is_custom: boolean;
  task_date: string;
  created_at: string;
  updated_at: string;
}

function calculateAge(birthday: string): number {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getAgeGroupFromAge(age: number): '5-7' | '8-11' | '12-14' | '15-17' {
  if (age <= 7) return '5-7';
  if (age <= 11) return '8-11';
  if (age <= 14) return '12-14';
  return '15-17';
}

export const supabaseService = {
  async registerUser(email: string, password: string, name: string): Promise<{ success: boolean; user?: DbUser; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const passwordHash = await hashPassword(password);
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: uuidv4(),
          email: email.toLowerCase(),
          name,
          password_hash: passwordHash,
          passcode: '1234',
          subscription: 'free',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase register error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, user: data };
    } catch (err: any) {
      console.error('Register error:', err);
      return { success: false, error: err.message };
    }
  },

  async registerWithGoogle(email: string, name: string, googleId: string): Promise<{ success: boolean; user?: DbUser; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: uuidv4(),
          email: email.toLowerCase(),
          name,
          google_id: googleId,
          passcode: '1234',
          subscription: 'free',
          email_verified: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase Google register error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, user: data };
    } catch (err: any) {
      console.error('Google register error:', err);
      return { success: false, error: err.message };
    }
  },

  async loginUser(email: string, password: string): Promise<{ success: boolean; user?: DbUser; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !user) {
        return { success: false, error: 'User not found' };
      }

      if (!user.password_hash) {
        return { success: false, error: 'Please use Google Sign-In' };
      }

      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        return { success: false, error: 'Invalid password' };
      }

      return { success: true, user };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err.message };
    }
  },

  async checkUserExists(email: string): Promise<{ exists: boolean; hasPassword: boolean; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { exists: false, hasPassword: false, error: 'Supabase not configured' };
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, password_hash')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !user) {
        return { exists: false, hasPassword: false };
      }

      return { exists: true, hasPassword: !!user.password_hash };
    } catch (err: any) {
      console.error('Check user exists error:', err);
      return { exists: false, hasPassword: false, error: err.message };
    }
  },

  async createPasswordResetToken(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // First, get the user ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !user) {
        return { success: false, error: 'User not found' };
      }

      // Delete any existing tokens for this email
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('email', email.toLowerCase());

      // Hash the code before storing (using bcrypt)
      const codeHash = await hashPassword(code);
      
      // Create new token with 15 minute expiry
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('password_reset_tokens')
        .insert({
          id: uuidv4(),
          user_id: user.id,
          email: email.toLowerCase(),
          code_hash: codeHash,
          expires_at: expiresAt,
          used: false,
        });

      if (error) {
        console.error('Create reset token error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Create reset token error:', err);
      return { success: false, error: err.message };
    }
  },

  async verifyPasswordResetCode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Get the most recent valid token for this email
      const { data: tokens, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Verify code error:', error);
        return { success: false, error: error.message };
      }

      if (!tokens || tokens.length === 0) {
        return { success: false, error: 'Code expired or invalid. Please request a new code.' };
      }

      const token = tokens[0];
      
      // Verify the code hash
      const isValid = await verifyPassword(code, token.code_hash);
      if (!isValid) {
        return { success: false, error: 'Invalid verification code' };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Verify code error:', err);
      return { success: false, error: err.message };
    }
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // First verify the code is still valid
      const verifyResult = await this.verifyPasswordResetCode(email, code);
      if (!verifyResult.success) {
        return verifyResult;
      }

      const passwordHash = await hashPassword(newPassword);
      
      // Update the password
      const { error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
        .eq('email', email.toLowerCase());

      if (error) {
        console.error('Reset password error:', error);
        return { success: false, error: error.message };
      }

      // Mark the token as used
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('email', email.toLowerCase())
        .eq('used', false);

      return { success: true };
    } catch (err: any) {
      console.error('Reset password error:', err);
      return { success: false, error: err.message };
    }
  },

  async updatePassword(email: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !user) {
        return { success: false, error: 'User not found' };
      }

      const isValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      const newPasswordHash = await hashPassword(newPassword);

      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) {
        return { success: false, error: 'Failed to update password' };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Update password error:', err);
      return { success: false, error: err.message };
    }
  },

  // Email Verification Functions
  async sendEmailVerification(email: string, code: string, userName: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Store the verification code in the database
      const { error } = await supabase
        .from('users')
        .update({
          email_verification_code: code,
          email_verification_sent_at: new Date().toISOString(),
          email_verified: false,
        })
        .eq('email', email.toLowerCase());

      if (error) {
        console.error('Store verification code error:', error);
        return { success: false, error: error.message };
      }

      // Send the actual email via Resend API
      const { sendVerificationEmail } = await import('./email-service');
      const emailResult = await sendVerificationEmail(email, code, userName);
      
      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.error);
        // Still return success since code is stored - user can request resend
      }

      return { success: true };
    } catch (err: any) {
      console.error('Send verification error:', err);
      return { success: false, error: err.message };
    }
  },

  async verifyEmailCode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Get the user's verification code
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('email_verification_code, email_verification_sent_at')
        .eq('email', email.toLowerCase())
        .single();

      if (fetchError || !user) {
        return { success: false, error: 'User not found' };
      }

      // Check if code matches
      if (user.email_verification_code !== code) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Check if code is expired (valid for 1 hour)
      if (user.email_verification_sent_at) {
        const sentAt = new Date(user.email_verification_sent_at);
        const now = new Date();
        const hourInMs = 60 * 60 * 1000;
        if (now.getTime() - sentAt.getTime() > hourInMs) {
          return { success: false, error: 'Verification code has expired. Please request a new code.' };
        }
      }

      // Mark email as verified
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email_verified: true,
          email_verification_code: null,
          email_verification_sent_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email.toLowerCase());

      if (updateError) {
        return { success: false, error: 'Failed to verify email' };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Verify email error:', err);
      return { success: false, error: err.message };
    }
  },

  async resendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Get user info
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('name, email_verified')
        .eq('email', email.toLowerCase())
        .single();

      if (fetchError || !user) {
        return { success: false, error: 'User not found' };
      }

      if (user.email_verified) {
        return { success: false, error: 'Email is already verified' };
      }

      // Generate new code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Send new verification email
      return await this.sendEmailVerification(email, code, user.name);
    } catch (err: any) {
      console.error('Resend verification error:', err);
      return { success: false, error: err.message };
    }
  },

  async isEmailVerified(email: string): Promise<{ verified: boolean; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { verified: false, error: 'Supabase not configured' };
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('email_verified, google_id')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !user) {
        return { verified: false, error: 'User not found' };
      }

      // Google Sign-In users are automatically verified
      if (user.google_id) {
        return { verified: true };
      }

      return { verified: user.email_verified || false };
    } catch (err: any) {
      console.error('Check email verified error:', err);
      return { verified: false, error: err.message };
    }
  },

  async loginWithGoogle(email: string, googleId: string): Promise<{ success: boolean; user: DbUser | null; error?: string; errorCode?: 'NOT_FOUND' | 'GOOGLE_ID_MISMATCH' | 'NOT_CONFIGURED' | 'NETWORK_ERROR' }> {
    console.log('[SupabaseService.loginWithGoogle] Starting for email:', email);
    
    if (!(await isSupabaseConfigured())) {
      console.log('[SupabaseService.loginWithGoogle] Supabase not configured');
      return { success: false, user: null, error: 'Supabase not configured', errorCode: 'NOT_CONFIGURED' };
    }

    try {
      // Use maybeSingle() to handle zero or one result without error
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      console.log('[SupabaseService.loginWithGoogle] Query result - hasUser:', !!user, 'hasError:', !!error);

      // Any error at all is treated as a network error - don't allow registration
      if (error) {
        console.error('[SupabaseService.loginWithGoogle] Query error:', error);
        return { success: false, user: null, error: error.message, errorCode: 'NETWORK_ERROR' };
      }

      // With maybeSingle(), null user means definitively not found
      if (!user) {
        console.log('[SupabaseService.loginWithGoogle] User not found');
        return { success: false, user: null, error: 'User not found', errorCode: 'NOT_FOUND' };
      }

      if (user.google_id && user.google_id !== googleId) {
        console.log('[SupabaseService.loginWithGoogle] Google ID mismatch');
        return { success: false, user: null, error: 'This email is linked to a different Google account', errorCode: 'GOOGLE_ID_MISMATCH' };
      }

      // Link Google account to existing email/password user
      if (!user.google_id) {
        console.log('[SupabaseService.loginWithGoogle] Linking Google account...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ google_id: googleId })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('[SupabaseService.loginWithGoogle] Failed to link Google account:', updateError);
          return { success: false, user: null, error: 'Failed to link Google account', errorCode: 'NETWORK_ERROR' };
        }
        console.log('[SupabaseService.loginWithGoogle] Google account linked successfully');
      }

      console.log('[SupabaseService.loginWithGoogle] Login successful, returning user');
      // IMPORTANT: success=true guarantees user is defined
      return { success: true, user };
    } catch (err: any) {
      console.error('[SupabaseService.loginWithGoogle] Exception:', err);
      return { success: false, user: null, error: err.message, errorCode: 'NETWORK_ERROR' };
    }
  },

  async getUserByEmail(email: string): Promise<DbUser | null> {
    if (!(await isSupabaseConfigured())) return null;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      return error ? null : data;
    } catch {
      return null;
    }
  },

  async updateUser(userId: string, updates: Partial<DbUser>): Promise<boolean> {
    if (!(await isSupabaseConfigured())) return false;

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      return !error;
    } catch {
      return false;
    }
  },

  async getChildren(userId: string): Promise<DbChild[]> {
    if (!(await isSupabaseConfigured())) {
      throw new Error('Database not configured');
    }

    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[SupabaseService.getChildren] Query failed:', error);
      throw new Error(`Failed to load children: ${error.message}`);
    }

    return data || [];
  },

  async addChild(userId: string, name: string, birthday: string, gender: string = 'other', avatar: string = 'dog'): Promise<DbChild | null> {
    if (!(await isSupabaseConfigured())) return null;

    try {
      // SECURITY: Verify child limit from database before adding
      const limitCheck = await this.verifyChildLimitFromDb(userId);
      if (!limitCheck.allowed) {
        console.warn(`[Supabase] Child limit exceeded: ${limitCheck.current}/${limitCheck.max}. Rejecting add.`);
        return null;
      }

      const { data, error } = await supabase
        .from('children')
        .insert({
          id: uuidv4(),
          user_id: userId,
          name,
          birthday,
          gender,
          avatar,
          points: 0,
          level: 1,
          streak: 0,
        })
        .select()
        .single();

      return error ? null : data;
    } catch {
      return null;
    }
  },

  async updateChild(childId: string, updates: Partial<DbChild>): Promise<boolean> {
    if (!(await isSupabaseConfigured())) return false;

    try {
      const { error } = await supabase
        .from('children')
        .update(updates)
        .eq('id', childId);

      return !error;
    } catch {
      return false;
    }
  },

  async removeChild(childId: string): Promise<boolean> {
    if (!(await isSupabaseConfigured())) return false;

    try {
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId);

      return !error;
    } catch {
      return false;
    }
  },

  async getShippingAddress(userId: string): Promise<DbShippingAddress | null> {
    if (!(await isSupabaseConfigured())) return null;

    try {
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();

      return error ? null : data;
    } catch {
      return null;
    }
  },

  async setShippingAddress(userId: string, address: ShippingAddress): Promise<boolean> {
    if (!(await isSupabaseConfigured())) return false;

    try {
      await supabase
        .from('shipping_addresses')
        .update({ is_primary: false })
        .eq('user_id', userId);

      const { error } = await supabase
        .from('shipping_addresses')
        .upsert({
          id: uuidv4(),
          user_id: userId,
          street: address.street,
          city: address.city,
          state: address.state,
          zip_code: address.zipCode,
          country: address.country,
          is_primary: true,
        });

      return !error;
    } catch {
      return false;
    }
  },

  async getTasks(childId: string): Promise<DbTask[]> {
    if (!(await isSupabaseConfigured())) return [];

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false });

      return error ? [] : data || [];
    } catch {
      return [];
    }
  },

  async getTodaysTasks(childId: string): Promise<DbTask[]> {
    if (!(await isSupabaseConfigured())) return [];

    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('child_id', childId)
        .eq('task_date', today);

      return error ? [] : data || [];
    } catch {
      return [];
    }
  },

  async addTask(task: Omit<DbTask, 'created_at' | 'updated_at'>): Promise<DbTask | null> {
    if (!(await isSupabaseConfigured())) return null;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();

      return error ? null : data;
    } catch {
      return null;
    }
  },

  async updateTask(taskId: string, updates: Partial<DbTask>): Promise<boolean> {
    if (!(await isSupabaseConfigured())) return false;

    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      return !error;
    } catch {
      return false;
    }
  },

  async deleteTask(taskId: string): Promise<boolean> {
    if (!(await isSupabaseConfigured())) return false;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      return !error;
    } catch {
      return false;
    }
  },

  async uploadProfileImage(type: 'user' | 'child', id: string, imageUri: string): Promise<string | null> {
    if (!(await isSupabaseConfigured())) return null;

    try {
      const fileName = `profile-images/${type}/${id}_${Date.now()}.jpg`;
      
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const { data, error } = await supabase.storage
        .from('task-proofs')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('[Supabase] Profile image upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('task-proofs')
        .getPublicUrl(fileName);

      console.log('[Supabase] Profile image uploaded:', urlData?.publicUrl);
      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('[Supabase] Profile image upload failed:', err);
      return null;
    }
  },

  async uploadTaskProofImage(taskId: string, imageUri: string): Promise<string | null> {
    if (!(await isSupabaseConfigured())) return null;

    try {
      const fileName = `task-proofs/${taskId}_${Date.now()}.jpg`;
      
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const { data, error } = await supabase.storage
        .from('task-proofs')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('task-proofs')
        .getPublicUrl(fileName);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('Upload task proof error:', err);
      return null;
    }
  },

  async loadFullUserData(userId: string): Promise<{
    user: DbUser | null;
    children: DbChild[];
    shippingAddress: DbShippingAddress | null;
  }> {
    const [userResult, children, shippingAddress] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      this.getChildren(userId),
      this.getShippingAddress(userId),
    ]);

    return {
      user: userResult.data,
      children,
      shippingAddress,
    };
  },

  dbTaskToAppTask(dbTask: DbTask, ageGroup: AgeGroup = '8-11'): Task {
    // Normalize task_date to YYYY-MM-DD format (handles both "2026-02-04" and "2026-02-04T00:00:00.000Z")
    const normalizedDueDate = dbTask.task_date ? dbTask.task_date.split('T')[0] : '';
    
    return {
      id: dbTask.id,
      childId: dbTask.child_id,
      title: dbTask.title,
      description: dbTask.description || '',
      category: dbTask.category as TaskCategory,
      points: dbTask.points,
      status: dbTask.status as TaskStatus,
      dueDate: normalizedDueDate,
      completedAt: dbTask.completed_at,
      approvedAt: dbTask.approved_at,
      isCustom: dbTask.is_custom,
      ageGroup,
      requiresProof: true,
      proofPhotoUri: dbTask.proof_image,
      proofTimerSeconds: dbTask.proof_timer_seconds,
    };
  },

  dbChildToAppChild(dbChild: DbChild): Child {
    const age = calculateAge(dbChild.birthday);
    return {
      id: dbChild.id,
      name: dbChild.name,
      age,
      gender: dbChild.gender === 'boy' || dbChild.gender === 'girl' ? dbChild.gender : undefined,
      avatar: dbChild.profile_image || dbChild.avatar,
      ageGroup: getAgeGroupFromAge(age),
      points: dbChild.points,
      totalPoints: dbChild.points,
      streakDays: dbChild.streak,
      lastCompletedDate: dbChild.last_task_date,
      level: dbChild.level,
      badges: [],
      mailMeterProgress: dbChild.mail_meter_progress ?? 0,
      createdAt: dbChild.created_at,
      mailVerificationCode: dbChild.mail_verification_code || undefined,
      mailVerificationSentAt: dbChild.mail_verification_sent_at || undefined,
      mailVerified: dbChild.mail_verified || false,
    };
  },

  dbUserToAppUser(dbUser: DbUser, children: Child[], shippingAddress: ShippingAddress | null, subscriptionData?: {
    plan: SubscriptionPlan;
    status: string;
    startDate?: string;
    nextBillingDate?: string;
    mailsPerMonth: number;
    priceCents: number;
    freeTrialExpiresAt?: string;
    subscriptionId?: string;
  } | null): User {
    const planLimits: Record<string, { mailsPerMonth: number; price: number }> = {
      free: { mailsPerMonth: 0, price: 0 },
      basic: { mailsPerMonth: 2, price: 9.99 },
      standard: { mailsPerMonth: 4, price: 19.99 },
      premium: { mailsPerMonth: 5, price: 29.99 },
    };

    let subscription: User['subscription'] = undefined;
    
    if (subscriptionData) {
      subscription = {
        id: subscriptionData.subscriptionId || `sub-${dbUser.id}`,
        plan: subscriptionData.plan,
        status: subscriptionData.status as 'active' | 'cancelled' | 'paused',
        startDate: subscriptionData.startDate || dbUser.created_at,
        nextBillingDate: subscriptionData.nextBillingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        mailsPerMonth: subscriptionData.mailsPerMonth,
        price: subscriptionData.priceCents / 100,
        freeTrialExpiresAt: subscriptionData.freeTrialExpiresAt,
      };
    } else if (dbUser.subscription && dbUser.subscription !== 'none') {
      // Create subscription for all plans including free
      const plan = dbUser.subscription as SubscriptionPlan;
      const limits = planLimits[plan] || planLimits.free;
      subscription = {
        id: `sub-${dbUser.id}`,
        plan,
        status: 'active',
        startDate: dbUser.created_at,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        mailsPerMonth: limits.mailsPerMonth,
        price: limits.price,
      };
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatar: dbUser.profile_image,
      role: 'parent',
      createdAt: dbUser.created_at,
      children,
      passcode: dbUser.passcode,
      shippingAddress: shippingAddress || undefined,
      subscription,
    };
  },

  // Payment and subscription management functions
  async recordPayment(
    userId: string,
    planId: string,
    amountCents: number,
    stripePaymentId?: string,
    stripeCustomerId?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const paymentId = uuidv4();
      const { error } = await supabase
        .from('payments')
        .insert({
          id: paymentId,
          user_id: userId,
          stripe_payment_id: stripePaymentId,
          stripe_customer_id: stripeCustomerId,
          plan: planId,
          amount_cents: amountCents,
          currency: 'usd',
          status: 'succeeded',
          metadata: metadata || {},
        });

      if (error) {
        console.error('Error recording payment:', error);
        return { success: false, error: error.message };
      }

      return { success: true, paymentId };
    } catch (err: any) {
      console.error('Payment record error:', err);
      return { success: false, error: err.message };
    }
  },

  async updateUserSubscription(
    userId: string,
    plan: SubscriptionPlan,
    stripePaymentId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!(await isSupabaseConfigured())) {
      return { success: false, error: 'Supabase not configured' };
    }

    const planLimits: Record<SubscriptionPlan, { maxChildren: number; mailsPerMonth: number; priceCents: number }> = {
      free: { maxChildren: 1, mailsPerMonth: 0, priceCents: 0 },
      basic: { maxChildren: 1, mailsPerMonth: 2, priceCents: 999 },
      standard: { maxChildren: 3, mailsPerMonth: 4, priceCents: 1999 },
      premium: { maxChildren: 999, mailsPerMonth: 5, priceCents: 2999 },
    };

    const limits = planLimits[plan];

    try {
      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({ subscription: plan, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (userError) {
        console.error('Error updating user subscription:', userError);
        return { success: false, error: userError.message };
      }

      // Upsert subscription details
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan,
          status: 'active',
          price_cents: limits.priceCents,
          mails_per_month: limits.mailsPerMonth,
          max_children: limits.maxChildren,
          stripe_subscription_id: stripePaymentId,
          start_date: new Date().toISOString(),
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (subError) {
        console.error('Error upserting subscription:', subError);
        // Non-critical - continue even if this fails
      }

      return { success: true };
    } catch (err: any) {
      console.error('Subscription update error:', err);
      return { success: false, error: err.message };
    }
  },

  async getSubscriptionFromDb(userId: string): Promise<{
    plan: SubscriptionPlan;
    maxChildren: number;
    status: string;
  } | null> {
    if (!(await isSupabaseConfigured())) return null;

    try {
      // First try subscriptions table
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!subError && subData) {
        return {
          plan: subData.plan as SubscriptionPlan,
          maxChildren: subData.max_children,
          status: subData.status,
        };
      }

      // Fallback to users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription')
        .eq('id', userId)
        .single();

      if (!userError && userData) {
        const planLimits: Record<string, number> = { free: 1, basic: 1, standard: 3, premium: 999 };
        return {
          plan: userData.subscription as SubscriptionPlan,
          maxChildren: planLimits[userData.subscription] || 1,
          status: 'active',
        };
      }

      return null;
    } catch {
      return null;
    }
  },

  async getFullSubscription(userId: string): Promise<{
    plan: SubscriptionPlan;
    status: string;
    startDate?: string;
    nextBillingDate?: string;
    mailsPerMonth: number;
    priceCents: number;
    freeTrialExpiresAt?: string;
    subscriptionId?: string;
  } | null> {
    if (!(await isSupabaseConfigured())) return null;

    const planLimits: Record<string, { mailsPerMonth: number; priceCents: number }> = {
      free: { mailsPerMonth: 0, priceCents: 0 },
      basic: { mailsPerMonth: 2, priceCents: 999 },
      standard: { mailsPerMonth: 4, priceCents: 1999 },
      premium: { mailsPerMonth: 5, priceCents: 2999 },
    };

    try {
      // First try subscriptions table for full details
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!subError && subData) {
        console.log('[Supabase] Loaded subscription from subscriptions table:', subData.plan);
        return {
          plan: subData.plan as SubscriptionPlan,
          status: subData.status || 'active',
          startDate: subData.start_date,
          nextBillingDate: subData.next_billing_date,
          mailsPerMonth: subData.mails_per_month ?? planLimits[subData.plan]?.mailsPerMonth ?? 0,
          priceCents: subData.price_cents ?? planLimits[subData.plan]?.priceCents ?? 0,
          freeTrialExpiresAt: subData.free_trial_expires_at,
          subscriptionId: subData.id,
        };
      }

      // Fallback to users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription, created_at')
        .eq('id', userId)
        .single();

      if (!userError && userData && userData.subscription && userData.subscription !== 'none') {
        const plan = userData.subscription as SubscriptionPlan;
        const limits = planLimits[plan] || planLimits.free;
        console.log('[Supabase] Loaded subscription from users table:', plan);
        return {
          plan,
          status: 'active',
          startDate: userData.created_at,
          mailsPerMonth: limits.mailsPerMonth,
          priceCents: limits.priceCents,
        };
      }

      console.log('[Supabase] No subscription found for user');
      return null;
    } catch (err) {
      console.error('[Supabase] Error loading subscription:', err);
      return null;
    }
  },

  async verifyChildLimitFromDb(userId: string): Promise<{ allowed: boolean; current: number; max: number }> {
    if (!(await isSupabaseConfigured())) {
      return { allowed: true, current: 0, max: 999 }; // Fallback allows (local validation will catch)
    }

    try {
      // Get current child count
      const { data: children, error: childError } = await supabase
        .from('children')
        .select('id')
        .eq('user_id', userId);

      const currentCount = childError ? 0 : (children?.length || 0);

      // Get subscription limit
      const subscription = await this.getSubscriptionFromDb(userId);
      const maxChildren = subscription?.maxChildren || 1;

      return {
        allowed: currentCount < maxChildren,
        current: currentCount,
        max: maxChildren,
      };
    } catch {
      return { allowed: true, current: 0, max: 999 };
    }
  },

  // Achievement and Badge functions
  async getAchievements(childId: string): Promise<{ achievementType: string; unlockedAt: string }[]> {
    if (!(await isSupabaseConfigured())) return [];

    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('achievement_type, unlocked_at')
        .eq('child_id', childId);

      if (error) {
        console.error('[Supabase] Error loading achievements:', error);
        return [];
      }

      return (data || []).map(a => ({
        achievementType: a.achievement_type,
        unlockedAt: a.unlocked_at,
      }));
    } catch (err) {
      console.error('[Supabase] Error loading achievements:', err);
      return [];
    }
  },

  async unlockAchievement(childId: string, achievementType: string): Promise<boolean> {
    if (!(await isSupabaseConfigured())) return false;

    try {
      const { error } = await supabase
        .from('achievements')
        .upsert({
          child_id: childId,
          achievement_type: achievementType,
          unlocked_at: new Date().toISOString(),
        }, { onConflict: 'child_id,achievement_type' });

      if (error) {
        console.error('[Supabase] Error unlocking achievement:', error);
        return false;
      }

      console.log('[Supabase] Achievement unlocked:', achievementType);
      return true;
    } catch (err) {
      console.error('[Supabase] Error unlocking achievement:', err);
      return false;
    }
  },

  async getBadges(childId: string): Promise<Badge[]> {
    if (!(await isSupabaseConfigured())) return [];

    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('child_id', childId)
        .order('earned_at', { ascending: false });

      if (error) {
        console.error('[Supabase] Error loading badges:', error);
        return [];
      }

      return (data || []).map(b => ({
        id: b.id,
        name: b.name,
        icon: b.icon,
        description: b.description || '',
        earnedAt: b.earned_at,
        type: b.badge_type as 'achievement' | 'level' | 'mascot',
        mascot: b.mascot as 'posty' | 'rosie' | 'milo' | 'skye' | undefined,
      }));
    } catch (err) {
      console.error('[Supabase] Error loading badges:', err);
      return [];
    }
  },

  async addBadge(childId: string, badge: {
    name: string;
    icon: string;
    description: string;
    type: 'achievement' | 'level' | 'mascot';
    mascot?: 'posty' | 'rosie' | 'milo' | 'skye';
    levelEarned?: number;
  }): Promise<boolean> {
    if (!(await isSupabaseConfigured())) return false;

    try {
      const { error } = await supabase
        .from('badges')
        .upsert({
          child_id: childId,
          badge_type: badge.type,
          name: badge.name,
          icon: badge.icon,
          description: badge.description,
          mascot: badge.mascot,
          level_earned: badge.levelEarned,
          earned_at: new Date().toISOString(),
        }, { onConflict: 'child_id,name' });

      if (error) {
        console.error('[Supabase] Error adding badge:', error);
        return false;
      }

      console.log('[Supabase] Badge added:', badge.name);
      return true;
    } catch (err) {
      console.error('[Supabase] Error adding badge:', err);
      return false;
    }
  },

  async redeemBadge(badgeId: string): Promise<boolean> {
    if (!(await isSupabaseConfigured())) return false;

    try {
      const { error } = await supabase
        .from('badges')
        .update({ redeemed: true, redeemed_at: new Date().toISOString() })
        .eq('id', badgeId);

      if (error) {
        console.error('[Supabase] Error redeeming badge:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Supabase] Error redeeming badge:', err);
      return false;
    }
  },
};
