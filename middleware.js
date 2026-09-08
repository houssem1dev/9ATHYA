// ============================================================
// MIDDLEWARE.JS - Bot & DDoS Detection & Blocking
// Single file solution - Place in root folder
// ============================================================

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  // Rate limiting
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 20, // 20 requests per minute per IP
  
  // Block lists
  BLOCKED_IPS: new Set([
    '104.23.221.135',
    '104.23.221.134',
    '104.23.223.107',
    '104.23.223.106',
    '34.76.117.34',
    // Add more IPs as you discover them
  ]),
  
  // Bot detection patterns
  BOT_USER_AGENTS: [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
    'python', 'java', 'go-http', 'node-fetch', 'axios',
    'postman', 'insomnia', 'httpie', 'perl', 'ruby',
    'php', 'scrapy', 'puppeteer', 'headless', 'selenium',
    'phantomjs', 'webkit', 'gecko', 'trident', 'presto',
    'jakarta', 'httpclient', 'apache-httpclient', 'okhttp',
    'googlebot', 'bingbot', 'slurp', 'duckduckbot',
    'baiduspider', 'yandexbot', 'facebookexternalhit',
    'linkedinbot', 'twitterbot', 'telegrambot', 'whatsapp'
  ],
  
  // Blocked ASNs (optional)
  BLOCKED_ASNS: new Set([
    // 'AS15169', // Google - sometimes used by attackers
    // 'AS54113', // Fastly
  ]),
  
  // Allowed countries (optional - only allow Tunisia)
  ALLOWED_COUNTRIES: new Set([
    'TN', // Tunisia
    // Add more if needed
  ]),
  
  // Challenge threshold - if request count exceeds this, show challenge
  CHALLENGE_THRESHOLD: 5, // requests per minute before showing challenge
};

// ============================================================
// RATE LIMITER (In-memory)
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
  
  // Check if under attack (spike detection)
  if (validRequests.length > CONFIG.MAX_REQUESTS_PER_WINDOW * 2) {
    // More than double the limit - immediate block
    return { allowed: false, reason: 'ATTACK_DETECTED', isAttack: true };
  }
  
  if (validRequests.length >= CONFIG.MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, reason: 'RATE_LIMIT_EXCEEDED', isAttack: false };
  }
  
  validRequests.push(now);
  rateLimit.set(ip, validRequests);
  return { allowed: true, count: validRequests.length };
}

// ============================================================
// BOT DETECTION
// ============================================================
function isBot(userAgent) {
  if (!userAgent) return true; // No user agent = suspicious
  
  const lowerUA = userAgent.toLowerCase();
  
  // Check for bot signatures
  for (const sig of CONFIG.BOT_USER_AGENTS) {
    if (lowerUA.includes(sig)) {
      return true;
    }
  }
  
  // Check for missing browser features
  const isBrowser = userAgent.includes('Mozilla') || 
                    userAgent.includes('Chrome') || 
                    userAgent.includes('Safari') ||
                    userAgent.includes('Firefox') ||
                    userAgent.includes('Edge') ||
                    userAgent.includes('Opera');
  
  if (!isBrowser && userAgent.length > 0) {
    return true; // Non-browser user agent
  }
  
  return false;
}

// ============================================================
// REQUEST PATTERN ANALYSIS (Detects DDoS patterns)
// ============================================================
const requestPatterns = new Map();

function analyzeRequestPattern(ip, path) {
  const now = Date.now();
  const windowStart = now - 5000; // 5 second window
  
  let pattern = requestPatterns.get(ip) || { paths: [], timestamps: [] };
  
  // Clean old entries
  pattern.timestamps = pattern.timestamps.filter(t => t > windowStart);
  pattern.paths = pattern.paths.filter((p, i) => pattern.timestamps[i] > windowStart);
  
  // Check for path flooding (same path many times)
  const samePathCount = pattern.paths.filter(p => p === path).length;
  if (samePathCount > 5) {
    return { suspicious: true, reason: 'PATH_FLOODING' };
  }
  
  // Check for rapid requests
  if (pattern.timestamps.length > 10) {
    return { suspicious: true, reason: 'RAPID_REQUESTS' };
  }
  
  pattern.paths.push(path);
  pattern.timestamps.push(now);
  requestPatterns.set(ip, pattern);
  
  return { suspicious: false };
}

// ============================================================
// MAIN MIDDLEWARE HANDLER
// ============================================================
export default async function middleware(request) {
  const startTime = Date.now();
  
  // Get request info
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.headers.get('x-vercel-ip-country') ||
             'unknown';
  
  const userAgent = request.headers.get('user-agent') || '';
  const path = new URL(request.url).pathname;
  const method = request.method;
  
  // ============================================================
  // LAYER 1: Check Blocked IPs
  // ============================================================
  if (CONFIG.BLOCKED_IPS.has(ip)) {
    console.log(`🛑 Blocked IP: ${ip} (IP blocklist)`);
    return new Response('Access Denied - Your IP has been blocked', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow',
      }
    });
  }
  
  // ============================================================
  // LAYER 2: Check Allowed Countries (Optional)
  // ============================================================
  const country = request.headers.get('x-vercel-ip-country') || '';
  if (CONFIG.ALLOWED_COUNTRIES.size > 0 && !CONFIG.ALLOWED_COUNTRIES.has(country)) {
    console.log(`🌍 Blocked country: ${country} from IP: ${ip}`);
    return new Response('Access Denied - Your country is not allowed', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow',
      }
    });
  }
  
  // ============================================================
  // LAYER 3: Bot Detection
  // ============================================================
  if (isBot(userAgent)) {
    console.log(`🤖 Bot detected: ${userAgent} from IP: ${ip}`);
    
    // Log bot activity for analysis
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'BOT_BLOCKED',
      ip,
      userAgent,
      path,
      method
    }));
    
    // Return a challenge page instead of blocking completely
    return new Response(getChallengePage(ip, 'bot'), {
      status: 403,
      headers: {
        'Content-Type': 'text/html',
        'X-Robots-Tag': 'noindex, nofollow',
        'Retry-After': '3600',
      }
    });
  }
  
  // ============================================================
  // LAYER 4: Rate Limiting
  // ============================================================
  const rateResult = checkRateLimit(ip);
  
  if (!rateResult.allowed) {
    console.log(`⚠️ Rate limit exceeded: ${ip} (${rateResult.reason})`);
    
    // Log the attack
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'RATE_LIMIT_EXCEEDED',
      ip,
      path,
      method,
      reason: rateResult.reason,
      isAttack: rateResult.isAttack || false
    }));
    
    // If it's a real attack, block with a challenge
    if (rateResult.isAttack) {
      return new Response(getChallengePage(ip, 'attack'), {
        status: 429,
        headers: {
          'Content-Type': 'text/html',
          'X-Robots-Tag': 'noindex, nofollow',
          'Retry-After': '3600',
        }
      });
    }
    
    // Otherwise, return a simple rate limit response
    return new Response(`Too many requests. Please wait a moment and try again.`, {
      status: 429,
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow',
        'Retry-After': '60',
      }
    });
  }
  
  // ============================================================
  // LAYER 5: Request Pattern Analysis (DDoS detection)
  // ============================================================
  if (path.includes('/api/')) {
    const patternResult = analyzeRequestPattern(ip, path);
    
    if (patternResult.suspicious) {
      console.log(`🚨 Suspicious pattern detected: ${patternResult.reason} from IP: ${ip}`);
      
      return new Response('Suspicious activity detected. Please try again later.', {
        status: 429,
        headers: {
          'Content-Type': 'text/plain',
          'X-Robots-Tag': 'noindex, nofollow',
          'Retry-After': '300',
        }
      });
    }
  }
  
  // ============================================================
  // LAYER 6: Method Validation
  // ============================================================
  const allowedMethods = ['GET', 'POST', 'OPTIONS'];
  if (!allowedMethods.includes(method)) {
    return new Response('Method not allowed', {
      status: 405,
      headers: {
        'Content-Type': 'text/plain',
        'Allow': 'GET, POST, OPTIONS',
      }
    });
  }
  
  // ============================================================
  // LAYER 7: Path Security
  // ============================================================
  // Block access to sensitive files
  const blockedPaths = [
    '.env', '.git', '.json', '.config', 'vercel.json',
    'package.json', 'package-lock.json', 'node_modules'
  ];
  
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
  
  // ============================================================
  // LAYER 8: Request Size Limiting
  // ============================================================
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  if (contentLength > 10 * 1024 * 1024) { // 10MB limit
    return new Response('Payload too large', {
      status: 413,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  }
  
  // ============================================================
  // ALL CHECKS PASSED - Allow request
  // ============================================================
  console.log(`✅ Request allowed: ${ip} | ${method} ${path} | ${Date.now() - startTime}ms`);
  
  // Continue to the actual route
  return null; // Let Vercel handle the request
}

// ============================================================
// CHALLENGE PAGE HTML
// ============================================================
function getChallengePage(ip, type) {
  const messages = {
    bot: {
      title: '🤖 Bot Detected',
      message: 'Our system has detected automated traffic from your IP address.',
      action: 'Please use a real browser to access this site.'
    },
    attack: {
      title: '🚨 Attack Detected',
      message: 'Our security system has detected a potential attack from your IP address.',
      action: 'This IP has been temporarily blocked for security reasons.'
    }
  };
  
  const info = messages[type] || messages.bot;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Blocked</title>
  <style>
    body {
      background: #1a1a2e;
      color: #eee;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      background: #16213e;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      text-align: center;
      border: 1px solid #0f3460;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }
    h1 {
      color: #e94560;
      margin-bottom: 10px;
    }
    .ip {
      background: #0f3460;
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      margin: 15px 0;
      color: #00d2ff;
    }
    .details {
      color: #aaa;
      font-size: 0.9rem;
      margin: 15px 0;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      background: #e94560;
      color: white;
      padding: 12px 30px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      margin-top: 20px;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #c73652;
    }
    .footer {
      margin-top: 20px;
      font-size: 0.8rem;
      color: #666;
    }
    .ref {
      font-size: 0.7rem;
      color: #555;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🛡️</div>
    <h1>${info.title}</h1>
    <div class="ip">Your IP: ${ip}</div>
    <div class="details">
      <p>${info.message}</p>
      <p>${info.action}</p>
      <p>If you believe this is a mistake, please try again later.</p>
    </div>
    <div class="ref">Reference ID: ${Date.now().toString(36)}</div>
    <div class="footer">Protected by 9ATHYA Security</div>
  </div>
</body>
</html>
  `;
}

// ============================================================
// EXPORT CONFIG (Optional)
// ============================================================
export const config = {
  matcher: [
    '/(.*)', // Match all paths
    '!/_next/static/(.*)', // Exclude Next.js static files
    '!/favicon.ico',
    '!/robots.txt',
  ],
};
