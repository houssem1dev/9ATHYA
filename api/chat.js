// ============================================================
// CHAT.JS - Complete Working Version with Security
// ============================================================

// --- Simple Rate Limiter ---
const rateLimit = new Map();

// --- Blocked IPs ---
const BLOCKED_IPS = [
  '104.23.221.135', '104.23.221.134', '104.23.223.107',
  '104.23.223.106', '34.76.117.34'
];

function isBlocked(ip) {
  if (!ip) return false;
  return BLOCKED_IPS.includes(ip);
}

function checkRateLimit(ip) {
  if (!ip) return true;
  const now = Date.now();
  const windowStart = now - 60000;
  
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

function sendAlert(type, ip, path) {
  console.log(`🚨 ALERT: ${type} | IP: ${ip} | Path: ${path}`);
}

// --- Fallback Responses ---
function getFallbackReply(message) {
  const msg = message.toLowerCase();
  if (msg.includes('مرحبا') || msg.includes('سلام')) {
    return '👋 أهلاً بك في 9ATHYA.TN! كيف نقدر نساعدك؟';
  }
  if (msg.includes('منتج') || msg.includes('متوف')) {
    return '📦 عندنا خضرة، غلة، مواد أساسية، بقول، بروتينات، ألبان، ومواد غذائية. شنو تحب تطلب؟';
  }
  if (msg.includes('توصيل') || msg.includes('سعر')) {
    return '🚗 التوصيل: 0.500 دت/كم (الحد الأدنى 1.800 DT) + رسوم الشركة 3.000 DT.';
  }
  if (msg.includes('كيف') || msg.includes('طلب')) {
    return '📝 اختر المنتجات، حدد الكمية، أضف للسلة، املأ معلوماتك، اضغط تأكيد الطلب.';
  }
  return 'شكراً لسؤالك! أنا مساعد 9ATHYA. شنو تحب تسأل بالضبط؟';
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  // Get request info
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             req.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const path = new URL(req.url).pathname;
  const method = req.method;

  console.log(`🔍 ${method} ${path} from ${ip}`);

  // --- Security Checks ---
  if (isBlocked(ip)) {
    console.log(`🛑 Blocked IP: ${ip}`);
    return new Response('Access Denied - IP Blocked', { status: 403 });
  }

  if (!checkRateLimit(ip)) {
    console.log(`⚠️ Rate limit exceeded: ${ip}`);
    sendAlert('RATE_LIMIT_ATTACK', ip, path);
    return new Response('Too many requests - Please try again later', { 
      status: 429,
      headers: { 'Retry-After': '60' }
    });
  }

  // --- Handle GET ---
  if (method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'ok',
      message: '9ATHYA API is running. Use POST to send messages.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // --- Only POST ---
  if (method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // --- Parse Body ---
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { message, history } = body;
  if (!message || message.trim().length < 2) {
    return new Response('Message too short', { status: 400 });
  }

  console.log(`✅ Request from: ${ip} | Message: ${message.substring(0, 50)}...`);

  // --- Try Gemini ---
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ No API key, using fallback');
      return new Response(JSON.stringify({ 
        reply: getFallbackReply(message),
        source: 'fallback'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build context
    let context = `أنت مساعد لموقع 9ATHYA.TN. أجب باللهجة التونسية.\n\n`;
    
    if (history && Array.isArray(history)) {
      const limited = history.slice(-3);
      for (const msg of limited) {
        if (msg.role === 'user') context += `المستخدم: ${msg.content}\n`;
        if (msg.role === 'assistant') context += `المساعد: ${msg.content}\n`;
      }
    }
    context += `المستخدم: ${message.trim()}\nالمساعد:`;

    // Call Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: context }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
        })
      }
    );

    if (!response.ok) {
      console.warn('⚠️ Gemini error, using fallback');
      return new Response(JSON.stringify({ 
        reply: getFallbackReply(message),
        source: 'fallback'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || getFallbackReply(message);

    return new Response(JSON.stringify({ 
      reply: aiReply,
      source: 'gemini'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ 
      reply: getFallbackReply(message),
      source: 'fallback'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
