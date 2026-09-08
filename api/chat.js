// ============================================================
// SECURITY CHECKS
// ============================================================

const rateLimit = new Map();
const blockedIPs = [
  '104.23.221.135',
  '104.23.221.134',
  '104.23.223.107',
  '104.23.223.106',
  '34.76.117.34',
];

function isBlocked(ip) {
  return blockedIPs.includes(ip);
}

function isBot(userAgent) {
  if (!userAgent) return true;
  const bots = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java', 'go-http', 'node-fetch', 'axios', 'postman', 'insomnia', 'httpie'];
  const lowerUA = userAgent.toLowerCase();
  for (const bot of bots) {
    if (lowerUA.includes(bot)) return true;
  }
  return false;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - 60000;
  
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

async function sendAlert(type, ip, path) {
  try {
    const message = `
🚨 SECURITY ALERT - 9ATHYA.TN

Type: ${type}
IP: ${ip}
Path: ${path}
Time: ${new Date().toLocaleString('ar-TN')}
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
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  // Security checks
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const url = new URL(req.url);
  const path = url.pathname;

  // 1. Check blocked IPs
  if (isBlocked(ip)) {
    return res.status(403).json({ error: 'Access Denied - IP Blocked' });
  }

  // 2. Check bot
  if (isBot(userAgent)) {
    await sendAlert('BOT_DETECTED', ip, path);
    return res.status(403).json({ error: 'Bot detected - Access Denied' });
  }

  // 3. Check rate limit
  if (!checkRateLimit(ip)) {
    await sendAlert('RATE_LIMIT_ATTACK', ip, path);
    return res.status(429).json({ error: 'Too many requests - Please try again later' });
  }

  // ============================================================
  // YOUR ORIGINAL CHAT.JS LOGIC BELOW
  // ============================================================
  // ... (your existing code here)
  
  return res.status(200).json({ reply: 'Hello from 9ATHYA!' });
}
