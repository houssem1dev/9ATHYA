// ============================================================
// MIDDLEWARE.JS - Bot & DDoS Protection
// Fixed Version - No invalid matcher patterns
// ============================================================

// Simple rate limiter (in-memory)
const rateLimit = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute
  
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
  
  if (validRequests.length >= 20) { // 20 requests per minute
    return false;
  }
  
  validRequests.push(now);
  rateLimit.set(ip, validRequests);
  return true;
}

// Bot detection
function isBot(userAgent) {
  if (!userAgent) return true;
  
  const bots = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
    'python', 'java', 'go-http', 'node-fetch', 'axios',
    'postman', 'insomnia', 'httpie', 'perl', 'ruby',
    'php', 'scrapy', 'puppeteer', 'headless', 'selenium',
    'googlebot', 'bingbot', 'slurp', 'duckduckbot',
    'baiduspider', 'yandexbot', 'facebookexternalhit',
    'linkedinbot', 'twitterbot', 'telegrambot'
  ];
  
  const lowerUA = userAgent.toLowerCase();
  for (const bot of bots) {
    if (lowerUA.includes(bot)) {
      return true;
    }
  }
  return false;
}

// Blocked IPs
const BLOCKED_IPS = [
  '104.23.221.135',
  '104.23.221.134',
  '104.23.223.107',
  '104.23.223.106',
  '34.76.117.34',
];

// Main middleware handler
export default function middleware(request) {
  // Get client IP
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 1. Block specific IPs
  if (BLOCKED_IPS.includes(ip)) {
    return new Response('Access Denied', { 
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow',
      }
    });
  }
  
  // 2. Block bots
  if (isBot(userAgent)) {
    return new Response('Bot detected - Access Denied', { 
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow',
      }
    });
  }
  
  // 3. Rate limiting
  if (!checkRateLimit(ip)) {
    return new Response('Too many requests - Please try again later', { 
      status: 429,
      headers: {
        'Content-Type': 'text/plain',
        'Retry-After': '60',
        'X-Robots-Tag': 'noindex, nofollow',
      }
    });
  }
  
  // 4. Block sensitive paths
  const blockedPaths = ['.env', '.git', 'vercel.json', 'package.json', 'middleware.js'];
  for (const blocked of blockedPaths) {
    if (path.includes(blocked)) {
      return new Response('Forbidden', { 
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          'X-Robots-Tag': 'noindex, nofollow',
        }
      });
    }
  }
  
  // 5. Block direct access to API files
  if (path === '/chat.js' || path === '/api/chat.js') {
    return new Response('Forbidden', { 
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow',
      }
    });
  }
  
  // Allow the request to continue
  return null;
}

// ============================================================
// FIXED CONFIG - Only use valid patterns starting with "/"
// ============================================================
export const config = {
  // Only run middleware on specific paths
  // All patterns must start with "/"
  matcher: [
    '/',           // Home page
    '/api/:path*', // All API routes
    '/chat',       // Chat endpoint
  ],
  // Use Node.js runtime for better compatibility
  runtime: 'nodejs',
};
