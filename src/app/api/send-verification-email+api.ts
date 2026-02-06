import { Resend } from 'resend';

let connectionSettings: any;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return true;
  }
  
  record.count++;
  return false;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function getCredentials() {
  // First, try direct API key from environment variable (more reliable)
  const directApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Posty Magic Mail Club <noreply@magicmailclub.org>';
  
  if (directApiKey) {
    const maskedKey = `${directApiKey.substring(0, 8)}...${directApiKey.substring(directApiKey.length - 4)}`;
    console.log('[Resend] Using direct API key from environment variable');
    console.log('[Resend] API Key format:', maskedKey);
    console.log('[Resend] API Key starts with "re_":', directApiKey.startsWith('re_') ? 'YES' : 'NO - INVALID KEY FORMAT');
    console.log('[Resend] From email:', fromEmail);
    return { apiKey: directApiKey, fromEmail };
  }
  
  // Fallback to Replit connector
  console.log('[Resend] No direct API key found, trying Replit connector...');
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  
  if (!hostname) {
    console.error('[Resend] REPLIT_CONNECTORS_HOSTNAME not set and no RESEND_API_KEY');
    throw new Error('Resend configuration missing: Set RESEND_API_KEY environment variable or configure Replit Resend integration');
  }
  
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    console.error('[Resend] No REPL_IDENTITY or WEB_REPL_RENEWAL token found');
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const url = hostname.startsWith('http') ? hostname : 'https://' + hostname;
  const fullUrl = url + '/api/v2/connection?include_secrets=true&connector_names=resend';
  
  console.log('[Resend] Fetching credentials from:', fullUrl.replace(/\?.+/, '?...'));
  
  try {
    const response = await fetch(fullUrl, {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    });
    
    if (!response.ok) {
      console.error('[Resend] API response not OK:', response.status, response.statusText);
      throw new Error(`Resend API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    connectionSettings = data.items?.[0];
    
    if (!connectionSettings || !connectionSettings.settings?.api_key) {
      console.error('[Resend] No API key in response. Data:', JSON.stringify(data).slice(0, 200));
      throw new Error('Resend not connected - no API key found. Please set RESEND_API_KEY or configure the Resend integration.');
    }
    
    const apiKey = connectionSettings.settings.api_key;
    const connectorFromEmail = connectionSettings.settings.from_email || fromEmail;
    
    // Enhanced debugging - show API key format (masked) and from email
    const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'MISSING';
    console.log('[Resend] API Key format:', maskedKey);
    console.log('[Resend] API Key starts with "re_":', apiKey?.startsWith('re_') ? 'YES' : 'NO - INVALID KEY FORMAT');
    console.log('[Resend] From email configured:', connectorFromEmail);
    console.log('[Resend] Connection ID:', connectionSettings.id || 'unknown');
    
    if (!apiKey.startsWith('re_')) {
      console.error('[Resend] WARNING: API key does not start with "re_" - this is not a valid Resend API key!');
    }
    
    console.log('[Resend] Credentials loaded successfully');
    return { apiKey, fromEmail: connectorFromEmail };
  } catch (fetchError: any) {
    console.error('[Resend] Fetch error:', fetchError.message);
    throw new Error(`Failed to fetch Resend credentials: ${fetchError.message}`);
  }
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

const getVerificationEmailHtml = (code: string, userName: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Posty Magic Mail Club</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a1a2e; margin: 0; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
    <!-- Header with Posty -->
    <div style="text-align: center; padding: 30px 20px 20px;">
      <div style="width: 100px; height: 100px; margin: 0 auto 15px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(255,215,0,0.3);">
        <span style="font-size: 50px;">🐕</span>
      </div>
      <h1 style="color: #FFD700; font-size: 28px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); font-weight: 800;">POSTY</h1>
      <h2 style="color: #4FC3F7; font-size: 20px; margin: 5px 0 0; letter-spacing: 2px; font-weight: 700;">MAGIC MAIL CLUB</h2>
    </div>
    
    <!-- Content -->
    <div style="background: white; margin: 0 20px 20px; border-radius: 15px; padding: 25px; text-align: center;">
      <h3 style="color: #1a1a2e; font-size: 22px; margin: 0 0 10px;">Welcome, ${userName}!</h3>
      <p style="color: #666; font-size: 16px; margin: 0 0 25px; line-height: 1.5;">Posty is excited to have you join the Magic Mail Club! Please verify your email to get started on your adventure.</p>
      
      <p style="color: #888; font-size: 14px; margin: 0 0 10px;">Your verification code is:</p>
      
      <div style="background: linear-gradient(135deg, #FFD700 0%, #FFC107 100%); padding: 20px 30px; border-radius: 12px; display: inline-block; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(255,215,0,0.3);">
        <span style="font-size: 36px; font-weight: bold; color: #1a1a2e; letter-spacing: 8px;">${code}</span>
      </div>
      
      <p style="color: #888; font-size: 14px; margin: 0 0 15px;">This code expires in <strong>1 hour</strong>.</p>
      
      <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 10px;">
        <p style="color: #999; font-size: 12px; margin: 0;">If you didn't request this code, please ignore this email.</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 0 20px 25px;">
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 5px;">Complete fun tasks, earn points, and receive real mail rewards!</p>
      <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0;">© 2025 Posty Magic Mail Club. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code, userName } = body;
    
    if (!email || !code || !userName) {
      return Response.json(
        { success: false, error: 'Missing required fields: email, code, userName' },
        { status: 400 }
      );
    }
    
    if (!isValidEmail(email)) {
      return Response.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    if (isRateLimited(email)) {
      return Response.json(
        { success: false, error: 'Too many email requests. Please try again later.' },
        { status: 429 }
      );
    }
    
    console.log('[API] Sending verification email to:', email);
    
    let resendClient;
    let configuredFromEmail;
    
    try {
      const result = await getResendClient();
      resendClient = result.client;
      configuredFromEmail = result.fromEmail;
    } catch (configError: any) {
      console.error('[API] Resend configuration error:', configError.message);
      return Response.json(
        { 
          success: false, 
          error: 'Email service not configured. Please check Resend integration settings.',
          details: configError.message
        },
        { status: 503 }
      );
    }
    
    // Use configured from email, fallback to verified domain email
    const fromAddress = configuredFromEmail || 'Posty Magic Mail Club <postynoreply@magicmailclub.org>';
    
    console.log('[API] Using from address:', fromAddress);
    
    const { data, error } = await resendClient.emails.send({
      from: fromAddress,
      to: [email],
      subject: 'Verify Your Email - Posty Magic Mail Club',
      html: getVerificationEmailHtml(code, userName),
    });
    
    if (error) {
      console.error('[API] Resend send error - Full details:');
      console.error('[API] Error name:', error.name);
      console.error('[API] Error message:', error.message);
      console.error('[API] Error statusCode:', error.statusCode);
      console.error('[API] Full error object:', JSON.stringify(error, null, 2));
      console.error('[API] To email:', email);
      console.error('[API] From email used:', fromAddress);
      
      // Provide more specific error messages
      let userMessage = 'Failed to send verification email';
      if (error.statusCode === 401) {
        userMessage = 'Email service authentication failed. The API key may be invalid or expired. Please regenerate your Resend API key.';
        console.error('[API] 401 ERROR: API key is invalid or expired. Go to resend.com/api-keys to regenerate.');
      } else if (error.statusCode === 403) {
        userMessage = 'Email sending not authorized. Please verify your domain (magicmailclub.org) in Resend.';
        console.error('[API] 403 ERROR: Domain not verified or API key lacks permission for this domain.');
      } else if (error.statusCode === 422) {
        userMessage = 'Invalid email format or domain issue.';
        console.error('[API] 422 ERROR: Check the "from" email format and ensure domain is verified.');
      } else if (error.message) {
        userMessage = error.message;
      }
      
      return Response.json(
        { success: false, error: userMessage, statusCode: error.statusCode },
        { status: 500 }
      );
    }
    
    console.log('[API] Email sent successfully to:', email, 'MessageId:', data?.id);
    return Response.json({ success: true, messageId: data?.id });
    
  } catch (error: any) {
    console.error('[API] Error sending verification email:', error);
    return Response.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
