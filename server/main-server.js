const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 5000;
const EXPO_PORT = 5001;

app.use(cors());

const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(email) {
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

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function getResendClient() {
  const { Resend } = require('resend');
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('Resend not connected');
  }
  
  return {
    client: new Resend(connectionSettings.settings.api_key),
    fromEmail: connectionSettings.settings.from_email
  };
}

function getVerificationEmailHtml(code, userName) {
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
    <div style="text-align: center; padding: 30px 20px 20px;">
      <div style="width: 100px; height: 100px; margin: 0 auto 15px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(255,215,0,0.3);">
        <span style="font-size: 50px;">🐕</span>
      </div>
      <h1 style="color: #FFD700; font-size: 28px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); font-weight: 800;">POSTY</h1>
      <h2 style="color: #4FC3F7; font-size: 20px; margin: 5px 0 0; letter-spacing: 2px; font-weight: 700;">MAGIC MAIL CLUB</h2>
    </div>
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
    <div style="text-align: center; padding: 0 20px 25px;">
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 5px;">Complete fun tasks, earn points, and receive real mail rewards!</p>
      <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0;">© 2025 Posty Magic Mail Club. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}

app.use(express.json({ limit: '1mb' }));

app.post('/api/send-verification-email', async (req, res) => {
  try {
    const { email, code, userName } = req.body;
    
    if (!email || !code || !userName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: email, code, userName' 
      });
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    if (isRateLimited(email)) {
      return res.status(429).json({ 
        success: false, 
        error: 'Too many email requests. Please try again later.' 
      });
    }
    
    console.log('[EmailServer] Sending verification email to:', email);
    
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'Posty Magic Mail Club <onboarding@resend.dev>',
      to: [email],
      subject: 'Verify Your Email - Posty Magic Mail Club',
      html: getVerificationEmailHtml(code, userName),
    });
    
    if (error) {
      console.error('[EmailServer] Resend error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    console.log('[EmailServer] Email sent successfully:', data);
    res.json({ success: true, messageId: data?.id });
    
  } catch (error) {
    console.error('[EmailServer] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send email' 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const expoProxy = createProxyMiddleware({
  target: `http://localhost:${EXPO_PORT}`,
  changeOrigin: true,
  ws: true,
  logLevel: 'warn',
  onError: (err, req, res) => {
    console.error('[Proxy] Error:', err.message);
    if (res.writeHead) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Expo server starting up...');
    }
  }
});

app.use('/', expoProxy);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MainServer] Running on port ${PORT}`);
  console.log(`[MainServer] Proxying to Expo on port ${EXPO_PORT}`);
});
