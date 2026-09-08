// ============================================================
// MIDDLEWARE.JS - Complete Security Monitor
// FIXED: Removed invalid matcher patterns
// ============================================================

// Simple rate limiter (in-memory)
const rateLimit = new Map();
const requestStats = {
  total: 0,
  bots: 0,
  attacks: 0,
};

// Blocked IPs
const BLOCKED_IPS = [
  '104.23.221.135',
  '104.23.221.134',
  '104.23.223.107',
  '104.23.223.106',
  '34.76.117.34',
];

// Bot patterns
const BOT_PATTERNS = [
  'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
  'python', 'java', 'go-http', 'node-fetch', 'axios',
  'postman', 'insomnia', 'httpie', 'perl', 'ruby',
  'php', 'scrapy', 'puppeteer', 'headless', 'selenium',
  'googlebot', 'bingbot', 'slurp', 'duckduckbot',
  'baiduspider', 'yandexbot', 'facebookexternalhit'
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function isBlockedIP(ip) {
  return BLOCKED_IPS.includes(ip);
}

function isBot(userAgent) {
  if (!userAgent) return true;
  const lowerUA = userAgent.toLowerCase();
  for (const pattern of BOT_PATTERNS) {
    if (lowerUA.includes(pattern)) {
      return true;
    }
  }
  return false;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - 60000;
  
  // Clean old entries
  for (const [key, timestamps] of rateLimit) {
    const valid = timestamps.filter(t => t > windowStart);
    if (valid.length === 0) {
      rateLimit.delete(key);
    } else {
      rateLimit.set(key, valid);
    }
  }
  
  const requests = rateLimit.get(ip) || [];
  const validRequests = requests.filter(t => t > windowStart);
  
  if (validRequests.length >= 20) {
    return false;
  }
  
  validRequests.push(now);
  rateLimit.set(ip, validRequests);
  return true;
}

// Send email alert
async function sendAlert(type, ip, path) {
  try {
    const message = `
🚨 SECURITY ALERT - 9ATHYA.TN

Type: ${type}
IP: ${ip}
Path: ${path}
Time: ${new Date().toLocaleString('ar-TN')}

Attacks: ${requestStats.attacks}
Bots: ${requestStats.bots}
Total: ${requestStats.total}
    `.trim();

    const formData = new FormData();
    formData.append('email', 'houssemkessentini77@gmail.com');
    formData.append('subject', '🚨 9ATHYA Security Alert');
    formData.append('message', message);
    formData.append('_captcha', 'false');
    formData.append('_template', 'table');

    await fetch('https://formsubmit.co/ajax/houssemkessentini77@gmail.com', {
      method: 'POST',
      body: formData,
    });
    
    console.log('✅ Alert sent:', type);
  } catch (error) {
    console.error('❌ Alert error:', error);
  }
}

// ============================================================
// MAIN MIDDLEWARE
// ============================================================
export default async function middleware(request) {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  console.log(`🔍 ${method} ${path} from ${ip}`);

  // 1. Check blocked IPs
  if (isBlockedIP(ip)) {
    console.log(`🛑 Blocked IP: ${ip}`);
    return new Response('Access Denied - IP Blocked', { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // 2. Check bot
  if (isBot(userAgent)) {
    console.log(`🤖 Bot detected: ${ip}`);
    requestStats.bots++;
    await sendAlert('BOT_DETECTED', ip, path);
    return new Response('Bot detected - Access Denied', { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // 3. Check rate limit
  if (!checkRateLimit(ip)) {
    console.log(`⚠️ Rate limit exceeded: ${ip}`);
    requestStats.attacks++;
    await sendAlert('RATE_LIMIT_ATTACK', ip, path);
    return new Response('Too many requests - Please try again later', { 
      status: 429,
      headers: { 
        'Content-Type': 'text/plain',
        'Retry-After': '60'
      }
    });
  }

  // 4. Block sensitive paths
  const blockedPaths = ['.env', '.git', 'vercel.json', 'package.json'];
  for (const blocked of blockedPaths) {
    if (path.includes(blocked)) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  // 5. Update stats
  requestStats.total++;

  // Allow request
  return null;
}

// ============================================================
// ✅ FIXED MIDDLEWARE CONFIG
// ============================================================
export const config = {
  // Only use valid patterns that start with "/"
  matcher: [
    '/',
    '/api/:path*',
    '/chat',
  ],
  // Use Node.js runtime
  runtime: 'nodejs',
};

console.log('🔐 9ATHYA Security Monitor Active');
console.log('✅ Middleware ready - Node.js runtime');
