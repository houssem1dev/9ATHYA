// ============================================================
// api/chat.js - WORKING VERSION for Vercel
// ============================================================

// --- Simple In-Memory Rate Limiter ---
const rateLimit = new Map();

// --- Configuration ---
const BLOCKED_IPS = [
  '104.23.221.135', '104.23.221.134', '104.23.223.107',
  '104.23.223.106', '34.76.117.34'
];
const BOT_PATTERNS = ['bot', 'crawler', 'python', 'curl', 'wget', 'go-http', 'axios', 'postman'];

// --- Helper Functions ---
function isBlocked(ip) {
  if (!ip) return false;
  return BLOCKED_IPS.includes(ip);
}

function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(pattern => ua.includes(pattern));
}

function checkRateLimit(ip) {
  if (!ip) return true;
  const now = Date.now();
  const windowStart = now - 60000;
  
  // Clean old entries
  for (const [key, timestamps] of rateLimit) {
    const valid = timestamps.filter(t => t > windowStart);
    if (valid.length === 0) rateLimit.delete(key);
    else rateLimit.set(key, valid);
  }
  
  const requests = rateLimit.get(ip) || [];
  const validRequests = requests.filter(t => t > windowStart);
  
  if (validRequests.length >= 20) return false;
  
  validRequests.push(now);
  rateLimit.set(ip, validRequests);
  return true;
}

// --- Simple Email Alert ---
async function sendAlert(type, ip, path) {
  try {
    // Using node-fetch if available, but keep it simple
    console.log(`📧 ALERT: ${type} from ${ip} on ${path}`);
    // You can expand this to send real emails later
  } catch (error) {
    console.error('Alert failed:', error);
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  // --- Get Request Info ---
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             req.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const path = new URL(req.url).pathname;

  console.log(`🔍 ${req.method} ${path} from ${ip}`);

  // --- 1. Security Checks ---
  if (isBlocked(ip)) {
    console.log(`🛑 Blocked IP: ${ip}`);
    return new Response('Access Denied - IP Blocked', { status: 403 });
  }

  if (isBot(userAgent)) {
    console.log(`🤖 Bot detected: ${ip}`);
    await sendAlert('BOT_DETECTED', ip, path);
    return new Response('Bot detected - Access Denied', { status: 403 });
  }

  if (!checkRateLimit(ip)) {
    console.log(`⚠️ Rate limit exceeded: ${ip}`);
    await sendAlert('RATE_LIMIT_ATTACK', ip, path);
    return new Response('Too many requests - Please try again later', { 
      status: 429,
      headers: { 'Retry-After': '60' }
    });
  }

  // --- 2. Method Check ---
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // --- 3. Parse Body ---
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { message } = body;
  if (!message || message.trim().length < 2) {
    return new Response('Message too short', { status: 400 });
  }

  // --- 4. Get API Key ---
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not set');
    return new Response('AI service not configured', { status: 500 });
  }

  // --- 5. Call Gemini ---
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `أنت مساعد لموقع 9ATHYA.TN. أجب باللهجة التونسية. سؤال: ${message}` }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini error:', error);
      return new Response('AI service error', { status: response.status });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع معالجة طلبك.';

    // --- 6. Return Response ---
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
