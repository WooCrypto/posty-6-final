import { Platform } from 'react-native';

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getApiBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return window.location.origin;
  }
  return process.env.EXPO_PUBLIC_API_URL || 'https://vibecode.replit.app';
};

export const sendVerificationEmail = async (
  email: string, 
  code: string, 
  userName: string
): Promise<{ success: boolean; error?: string }> => {
  console.log('[EmailService] Sending verification email to:', email);
  
  try {
    const baseUrl = getApiBaseUrl();
    console.log('[EmailService] Using API URL:', baseUrl);
    const response = await fetch(`${baseUrl}/api/send-verification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
        userName,
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('[EmailService] Email sent successfully');
      return { success: true };
    } else {
      console.error('[EmailService] Failed to send email:', data.error);
      return { success: false, error: data.error };
    }
    
  } catch (error: any) {
    console.error('[EmailService] Error sending email:', error);
    return { success: false, error: error.message };
  }
};
