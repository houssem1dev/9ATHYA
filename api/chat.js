

// --- Config ---
const RATE_LIMIT_WINDOW_MS = 60000;      // 60 ثانية
const RATE_LIMIT_MAX_REQUESTS = 8;        // 8 طلبات كحد أقصى
const MAX_MESSAGE_LENGTH = 500;
const MAX_BODY_SIZE = 2000;               // 2KB
const MAX_HISTORY_LENGTH = 6;


const rateLimitMap = new Map();
const suspiciousIPs = new Map();

// --- Helper: Get Client IP ---
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || 
         req.headers['cf-connecting-ip'] || 
         'unknown';
}

// --- Helper: Validate User-Agent ---
function isValidUserAgent(ua) {
  if (!ua || typeof ua !== 'string') return false;
  if (ua.length < 20 || ua.length > 500) return false;
  
  const suspiciousPatterns = [
    /curl/i, /wget/i, /python/i, /java/i, /go-http/i,
    /scanner/i, /bot/i, /spider/i, /crawler/i, /nikto/i,
    /sqlmap/i, /nmap/i, /masscan/i, /zgrab/i, /nuclei/i
  ];
  
  return !suspiciousPatterns.some(p => p.test(ua));
}

// --- Helper: Check Rate Limit ---
function checkRateLimit(ip) {
  if (!ip || ip === 'unknown') return true;
  
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  
  // تنظيف السجلات القديمة
  if (rateLimitMap.size > 1000) {
    for (const [key, timestamps] of rateLimitMap) {
      const valid = timestamps.filter(t => t > windowStart);
      if (valid.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, valid);
      }
    }
  }
  
  const requests = rateLimitMap.get(ip) || [];
  const validRequests = requests.filter(t => t > windowStart);
  
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    // تتبع IPs المشبوهة
    const count = (suspiciousIPs.get(ip) || 0) + 1;
    suspiciousIPs.set(ip, count);
    return false;
  }
  
  validRequests.push(now);
  rateLimitMap.set(ip, validRequests);
  return true;
}

// --- Helper: Log Suspicious Activity ---
function logSuspicious(data) {
  // هذا يظهر في Vercel Logs
  console.error('[SUSPICIOUS]', JSON.stringify({
    timestamp: new Date().toISOString(),
    ...data
  }));
}

// --- Helper: Fallback Responses ---
function getFallbackReply(message) {
  const msg = (message || '').toLowerCase();
  
  if (msg.includes('مرحبا') || msg.includes('سلام') || msg.includes('أهلا')) {
    return '👋 أهلاً بك في 9ATHYA.TN! كيف نقدر نساعدك؟';
  }
  if (msg.includes('منتج') || msg.includes('متوف') || msg.includes('شنو')) {
    return '📦 عندنا خضرة، غلة، مواد أساسية، بقول، بروتينات، ألبان، ومواد غذائية. شنو تحب تطلب؟';
  }
  if (msg.includes('توصيل') || msg.includes('سعر') || msg.includes('كم')) {
    return '🚗 التوصيل: 0.500 دت/كم (الحد الأدنى 1.800 DT) + رسوم الشركة 3.000 DT.';
  }
  if (msg.includes('كيف') || msg.includes('طلب') || msg.includes('طريقة')) {
    return '📝 اختر المنتجات، حدد الكمية، أضف للسلة، املأ معلوماتك، اضغط تأكيد الطلب.';
  }
  if (msg.includes('صحي') || msg.includes('نصيحة') || msg.includes('وجبة')) {
    return '🥗 جرب سلطة مشكلة أو طاجين بالخضرة أو سمك مشوي. كل شي طازج!';
  }
  return 'شكراً لسؤالك! أنا مساعد 9ATHYA. اسألني عن المنتجات، التوصيل، أو كيفية الطلب.';
}

// --- Helper: Send Alert (اختياري - عبر Webhook) ---
async function sendAlert(type, ip, path) {
  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if (!webhookUrl) return;
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨 **${type}**\n> IP: \`${ip}\`\n> Path: \`${path}\`\n> Time: ${new Date().toISOString()}`
      })
    });
  } catch (e) {
    // لا نريد أن يفشل الطلب بسبب الإشعار
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  const startTime = Date.now();
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const method = req.method;
  const host = req.headers.host || '';
  const referer = req.headers.referer || '';
  const contentType = req.headers['content-type'] || '';
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  
  // --- 1. التحقق من الطريقة ---
  if (method !== 'POST' && method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // --- 2. التحقق من User-Agent ---
  if (!isValidUserAgent(userAgent)) {
    logSuspicious({ ip, reason: 'INVALID_USER_AGENT', ua: userAgent });
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // --- 3. التحقق من Content-Length ---
  if (contentLength > MAX_BODY_SIZE) {
    logSuspicious({ ip, reason: 'PAYLOAD_TOO_LARGE', size: contentLength });
    return res.status(413).json({ error: 'Payload too large' });
  }
  
  // --- 4. التحقق من Rate Limit ---
  if (!checkRateLimit(ip)) {
    logSuspicious({ ip, reason: 'RATE_LIMIT_EXCEEDED' });
    sendAlert('RATE_LIMIT_EXCEEDED', ip, '/api/chat');
    return res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: 60
    });
  }
  
  // --- 5. GET: حالة API ---
  if (method === 'GET') {
    return res.status(200).json({ 
      status: 'ok',
      message: '9ATHYA API is running'
    });
  }
  
  // --- 6. التحقق من Content-Type ---
  if (!contentType.includes('application/json')) {
    logSuspicious({ ip, reason: 'INVALID_CONTENT_TYPE', ct: contentType });
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  
  // --- 7. التحقق من Referer (اختياري - قد يكون فارغاً في بعض الحالات) ---
  if (referer && host) {
    try {
      const refUrl = new URL(referer);
      if (refUrl.hostname !== host) {
        logSuspicious({ ip, reason: 'INVALID_REFERER', referer });
        // لا نرفض الطلب، لكن نسجله
      }
    } catch (e) {
      // Referer غير صالح
    }
  }
  
  // --- 8. قراءة الـ Body ---
  let body;
  try {
    // Vercel يدعم req.body مباشرة
    body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  
  // --- 9. التحقق من Message ---
  const { message, history } = body || {};
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  const trimmedMessage = message.trim();
  
  if (trimmedMessage.length < 2 || trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ 
      error: `Message must be between 2 and ${MAX_MESSAGE_LENGTH} characters` 
    });
  }
  
  // --- 10. التحقق من History ---
  let safeHistory = [];
  if (Array.isArray(history)) {
    safeHistory = history
      .filter(m => m && typeof m === 'object' && (m.role === 'user' || m.role === 'assistant'))
      .filter(m => typeof m.content === 'string' && m.content.length < 500)
      .slice(-MAX_HISTORY_LENGTH);
  }
  
  // --- 11. محاولة استخدام Gemini ---
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      // لا API key → استخدم fallback
      return res.status(200).json({ 
        reply: getFallbackReply(trimmedMessage),
        source: 'fallback'
      });
    }
    
    // بناء السياق
    let context = 'أنت مساعد لموقع 9ATHYA.TN. أجب باللهجة التونسية بإيجاز.\n\n';
    
    for (const msg of safeHistory) {
      if (msg.role === 'user') {
        context += `المستخدم: ${msg.content}\n`;
      } else {
        context += `المساعد: ${msg.content}\n`;
      }
    }
    context += `المستخدم: ${trimmedMessage}\nالمساعد:`;
    
    // استدعاء Gemini
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: context }] }],
          generationConfig: { 
            temperature: 0.7, 
            maxOutputTokens: 150 
          }
        }),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      logSuspicious({ 
        ip, 
        reason: 'GEMINI_API_ERROR', 
        status: response.status 
      });
      return res.status(200).json({ 
        reply: getFallbackReply(trimmedMessage),
        source: 'fallback'
      });
    }
    
    const data = await response.json();
    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text 
      || getFallbackReply(trimmedMessage);
    
    // تسجيل النجاح
    console.log(`[OK] ${ip} | ${Date.now() - startTime}ms | ${trimmedMessage.substring(0, 30)}`);
    
    return res.status(200).json({ 
      reply: aiReply,
      source: 'gemini'
    });
    
  } catch (error) {
    // في حالة أي خطأ → استخدم fallback
    logSuspicious({ 
      ip, 
      reason: 'GEMINI_EXCEPTION', 
      error: error.message 
    });
    
    return res.status(200).json({ 
      reply: getFallbackReply(trimmedMessage),
      source: 'fallback'
    });
  }
}
