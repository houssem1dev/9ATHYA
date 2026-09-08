// ============================================================
// MIDDLEWARE.JS - Complete Security Monitor
// Bot Detection + DDoS Protection + Alerts (Email)
// ============================================================

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  // Rate limiting
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 20, // 20 requests per minute
  
  // Blocked IPs
  BLOCKED_IPS: [
    '104.23.221.135',
    '104.23.221.134',
    '104.23.223.107',
    '104.23.223.106',
    '34.76.117.34',
  ],
  
  // Bot User-Agent patterns
  BOT_PATTERNS: [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
    'python', 'java', 'go-http', 'node-fetch', 'axios',
    'postman', 'insomnia', 'httpie', 'perl', 'ruby',
    'php', 'scrapy', 'puppeteer', 'headless', 'selenium',
    'googlebot', 'bingbot', 'slurp', 'duckduckbot',
    'baiduspider', 'yandexbot', 'facebookexternalhit'
  ],
  
  // Alert email
  ALERT_EMAIL: 'houssemkessentini77@gmail.com',
};

// ============================================================
// DATA STORAGE
// ============================================================
const rateLimit = new Map();
const requestStats = {
  total: 0,
  bots: 0,
  attacks: 0,
  startTime: Date.now(),
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Check if IP is blocked
function isBlockedIP(ip) {
  return CONFIG.BLOCKED_IPS.includes(ip);
}

// Check if User-Agent is a bot
function isBot(userAgent) {
  if (!userAgent) return true;
  const lowerUA = userAgent.toLowerCase();
  for (const pattern of CONFIG.BOT_PATTERNS) {
    if (lowerUA.includes(pattern)) {
      return true;
    }
  }
  return false;
}

// Rate limiting check
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

// Send email alert
async function sendAlert(type, ip, path, details = '') {
  try {
    const message = `
🚨 SECURITY ALERT - 9ATHYA.TN 🚨

Type: ${type}
IP: ${ip}
Path: ${path}
Time: ${new Date().toLocaleString('ar-TN')}
Details: ${details}

📊 Statistics:
- Total Requests: ${requestStats.total}
- Bot Requests: ${requestStats.bots}
- Attacks Detected: ${requestStats.attacks}

🛡️ Action: Blocked

🔗 Check your site: https://www.9aadhiya.tech
    `.trim();

    const formData = new FormData();
    formData.append('email', CONFIG.ALERT_EMAIL);
    formData.append('subject', `🚨 SECURITY ALERT - ${type}`);
    formData.append('message', message);
    formData.append('_captcha', 'false');
    formData.append('_template', 'table');

    const response = await fetch('https://formsubmit.co/ajax/' + CONFIG.ALERT_EMAIL, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      console.log(`✅ Email alert sent: ${type}`);
      return true;
    } else {
      console.error('❌ Email failed:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Email error:', error);
    return false;
  }
}

// ============================================================
// MAIN MIDDLEWARE HANDLER
// ============================================================
export default async function middleware(request) {
  const startTime = Date.now();
  
  // Get request info
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  console.log(`🔍 Request: ${method} ${path} from ${ip}`);

  // ============================================================
  // LAYER 1: IP Blocklist
  // ============================================================
  if (isBlockedIP(ip)) {
    console.log(`🛑 Blocked IP: ${ip}`);
    return new Response('Access Denied - IP Blocked', { 
      status: 403,
      headers: { 
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow',
      }
    });
  }

  // ============================================================
  // LAYER 2: Bot Detection
  // ============================================================
  if (isBot(userAgent)) {
    console.log(`🤖 Bot detected: ${ip}`);
    requestStats.bots++;
    
    // Send alert for bot detection
    await sendAlert('BOT_DETECTED', ip, path, `User-Agent: ${userAgent}`);
    
    return new Response('Bot detected - Access Denied', { 
      status: 403,
      headers: { 
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow',
      }
    });
  }

  // ============================================================
  // LAYER 3: Rate Limiting
  // ============================================================
  if (!checkRateLimit(ip)) {
    console.log(`⚠️ Rate limit exceeded: ${ip}`);
    requestStats.attacks++;
    
    // Send alert for rate limit attack
    await sendAlert('RATE_LIMIT_ATTACK', ip, path, `${CONFIG.MAX_REQUESTS_PER_WINDOW} requests per minute`);
    
    return new Response('Too many requests - Please try again later', { 
      status: 429,
      headers: { 
        'Content-Type': 'text/plain',
        'Retry-After': '60',
        'X-Robots-Tag': 'noindex, nofollow',
      }
    });
  }

  // ============================================================
  // LAYER 4: Path Security
  // ============================================================
  const blockedPaths = ['.env', '.git', 'vercel.json', 'package.json', 'middleware.js', 'alert.js'];
  for (const blocked of blockedPaths) {
    if (path.includes(blocked)) {
      console.log(`🚫 Blocked path: ${path}`);
      return new Response('Forbidden', { 
        status: 403,
        headers: { 
          'Content-Type': 'text/plain',
          'X-Robots-Tag': 'noindex, nofollow',
        }
      });
    }
  }

  // ============================================================
  // LAYER 5: Method Validation
  // ============================================================
  const allowedMethods = ['GET', 'POST', 'OPTIONS', 'HEAD'];
  if (!allowedMethods.includes(method)) {
    return new Response('Method not allowed', {
      status: 405,
      headers: {
        'Content-Type': 'text/plain',
        'Allow': 'GET, POST, OPTIONS, HEAD',
      }
    });
  }

  // ============================================================
  // UPDATE STATS
  // ============================================================
  requestStats.total++;
  
  console.log(`✅ Request allowed: ${ip} | ${method} ${path} | ${Date.now() - startTime}ms`);

  // ============================================================
  // ALLOW REQUEST
  // ============================================================
  return null;
}

// ============================================================
// MIDDLEWARE CONFIG
// ============================================================
export const config = {
  matcher: [
    '/',
    '/api/:path*',
    '/chat',
  ],
  runtime: 'nodejs',
};

// ============================================================
// STARTUP LOG
// ============================================================
console.log('🔐 9ATHYA Security Monitor Active');
console.log(`📧 Alerts: ${CONFIG.ALERT_EMAIL}`);
console.log(`🛡️ Rate Limit: ${CONFIG.MAX_REQUESTS_PER_WINDOW}/min`);
console.log(`🚫 Blocked IPs: ${CONFIG.BLOCKED_IPS.length}`);
console.log('✅ Middleware ready');
