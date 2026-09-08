// ============================================================
// MIDDLEWARE.JS - Bot & DDoS Detection & Blocking
// Simplified & Working Version
// ============================================================

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  // Rate limiting
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 20, // 20 requests per minute per IP
  
  // Blocked IPs
  BLOCKED_IPS: new Set([
    '104.23.221.135',
    '104.23.221.134',
    '104.23.223.107',
    '104.23.223.106',
    '34.76.117.34',
  ]),
  
  // Bot User-Agent patterns
  BOT_USER_AGENTS: [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
    'python', 'java', 'go-http', 'node-fetch', 'axios',
    'postman', 'insomnia', 'httpie', 'perl', 'ruby',
    'php', 'scrapy', 'puppeteer', 'headless', 'selenium',
    'phantomjs', 'jakarta', 'httpclient', 'apache-httpclient',
    'googlebot', 'bingbot', 'slurp', 'duckduckbot',
    'baiduspider', 'yandexbot', 'facebookexternalhit',
    'linkedinbot', 'twitterbot', 'telegrambot'
  ],
};

// ============================================================
// RATE LIMITER
// ============================================================
const rateLimit = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;
  
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
  
  if (validRequests.length >= CONFIG.MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  validRequests.push(now);
  rateLimit.set(ip, validRequests);
  return true;
}

// ============================================================
// BOT DETECTION
// ============================================================
function isBot(userAgent) {
  if (!userAgent) return true;
  
  const lowerUA = userAgent.toLowerCase();
  
  for (const sig of CONFIG.BOT_USER_AGENTS) {
    if (lowerUA.includes(sig)) {
      return true;
    }
  }
  
  return false;
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default function middleware(req) {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  const userAgent = req.headers.get('user-agent') || '';
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Check blocked IPs
  if (CONFIG.BLOCKED_IPS.has(ip)) {
    return new Response('Access Denied', { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Check for bot
  if (isBot(userAgent)) {
    return new Response('Bot detected - Access Denied', { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Check rate limit
  if (!checkRateLimit(ip)) {
    return new Response('Too many requests - Please try again later', { 
      status: 429,
      headers: { 
        'Content-Type': 'text/plain',
        'Retry-After': '60'
      }
    });
  }
  
  // Block sensitive paths
  const blockedPaths = ['.env', '.git', 'vercel.json', 'package.json'];
  for (const blocked of blockedPaths) {
    if (path.includes(blocked)) {
      return new Response('Forbidden', { status: 403 });
    }
  }
  
  // Allow the request to continue
  return null;
}

// ============================================================
// MATCHER CONFIG
// ============================================================
export const config = {
  matcher: [
    '/(.*)',
    '!/_next/static/(.*)',
    '!/favicon.ico',
    '!/robots.txt',
  ],
};
