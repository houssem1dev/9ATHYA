// ============================================================
// CHAT.JS - With Timeout Protection
// ============================================================

// ============================================================
// SIMPLE SECURITY
// ============================================================

const rateLimit = new Map();
const BLOCKED_IPS = [
  '104.23.221.135', '104.23.221.134', '104.23.223.107',
  '104.23.223.106', '34.76.117.34'
];

function isBlocked(ip) {
  if (!ip) return false;
  return BLOCKED_IPS.includes(ip);
}

function isBot(userAgent) {
  if (!userAgent) return false;
  const bots = ['bot', 'crawler', 'python', 'curl', 'wget', 'go-http', 'axios', 'postman', 'java'];
  const ua = userAgent.toLowerCase();
  return bots.some(bot => ua.includes(bot));
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

// ============================================================
// QUICK FALLBACK RESPONSES (When Gemini times out)
// ============================================================

function getFallbackResponse(message) {
  const msg = message.toLowerCase();
  
  if (msg.includes('مرحبا') || msg.includes('سلام') || msg.includes('اهلا')) {
    return '👋 أهلاً بك في 9ATHYA.TN! كيف نقدر نساعدك اليوم؟';
  }
  
  if (msg.includes('منتج') || msg.includes('متوف') || msg.includes('شنو')) {
    return `📦 المنتجات المتوفرة عندنا:
🥬 خضرة: طماطم، فلفل، بصل، بطاطا، جزر، خس، قرع، فقّوس، زبدّة
🍎 غلة: تفاح، موز، برتقال، ليمون، بطيخ، دلاع، شمام
🌾 مواد أساسية: زيت زيتون، سكر، سميدة، خبز، حليب، قهوة، بهارات، رز، ماء، دقيق
🫘 بقول: عدس، حمص، لوبيا، جلبانة
🥩 بروتينات: لحم مفروم، دجاج، لحم بقري، تونة، سردين، سمك
🥛 ألبان: بيض، جبن، زبدة، لبن، ياغورت
🥫 مواد غذائية: طماطم مصبرة، زيت قلي، مايونيز، كاتشب، شوكولاتة`;
  }
  
  if (msg.includes('توصيل') || msg.includes('سعر') || msg.includes('كم')) {
    return `🚗 أسعار التوصيل: 0.500 دت/كم (الحد الأدنى 1.800 DT)، رسوم الشركة 3.000 DT.`;
  }
  
  if (msg.includes('كيف') || msg.includes('طلب') || msg.includes('طريقة')) {
    return `📝 كيفية الطلب: اختر المنتجات، حدد الكمية، أضف للسلة، املأ معلوماتك، اضغط تأكيد الطلب.`;
  }
  
  return 'شكراً لسؤالك! أنا مساعد 9ATHYA. شنو تحب تسأل بالضبط؟ (المنتجات، التوصيل، أو طريقة الطلب)';
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
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  console.log(`🔍 ${method} ${path} from ${ip}`);

  // ============================================================
  // SECURITY CHECKS
  // ============================================================

  if (isBlocked(ip)) {
    console.log(`🛑 Blocked IP: ${ip}`);
    return new Response('Access Denied - IP Blocked', { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  if (isBot(userAgent)) {
    console.log(`🤖 Bot detected: ${ip}`);
    sendAlert('BOT_DETECTED', ip, path);
    return new Response('Bot detected - Access Denied', { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  if (!checkRateLimit(ip)) {
    console.log(`⚠️ Rate limit exceeded: ${ip}`);
    sendAlert('RATE_LIMIT_ATTACK', ip, path);
    return new Response('Too many requests - Please try again later', { 
      status: 429,
      headers: { 'Content-Type': 'text/plain', 'Retry-After': '60' }
    });
  }

  // ============================================================
  // ONLY POST
  // ============================================================
  if (method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // ============================================================
  // PARSE BODY
  // ============================================================
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response('Invalid JSON', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  const { message, history } = body;

  if (!message || message.trim().length < 2) {
    return new Response('Message too short', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  console.log(`✅ Request from: ${ip} | Message: ${message.substring(0, 50)}...`);

  // ============================================================
  // CHECK API KEY (But don't fail if missing - use fallback)
  // ============================================================
  const apiKey = process.env.GEMINI_API_KEY;
  
  // If no API key, return fallback response immediately
  if (!apiKey) {
    console.warn('⚠️ No API key, using fallback response');
    const fallbackReply = getFallbackResponse(message);
    return new Response(JSON.stringify({ 
      reply: fallbackReply,
      source: 'fallback',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ============================================================
  // BUILD CONTEXT (SIMPLIFIED)
  // ============================================================
  let context = `أنت مساعد لموقع 9ATHYA.TN للتوصيل في تونس. أجب باللهجة التونسية العامية، كن مفيداً وودوداً ومختصراً.\n\n`;

  if (history && Array.isArray(history)) {
    const limitedHistory = history.slice(-3);
    for (const msg of limitedHistory) {
      if (msg.role === 'user') {
        context += `المستخدم: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        context += `المساعد: ${msg.content}\n`;
      }
    }
  }

  context += `المستخدم: ${message.trim()}\nالمساعد:`;

  // ============================================================
  // CALL GEMINI WITH 5 SECOND TIMEOUT
  // ============================================================
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds

    console.log('⏳ Calling Gemini API...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: context }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
            topP: 0.9,
            topK: 40
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini error:', response.status, errorText);
      // Use fallback
      const fallbackReply = getFallbackResponse(message);
      return new Response(JSON.stringify({ 
        reply: fallbackReply,
        source: 'fallback',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || getFallbackResponse(message);

    console.log('✅ Gemini response received');

    return new Response(JSON.stringify({ 
      reply: aiReply,
      source: 'gemini',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    
    // Always return a fallback response, never fail
    const fallbackReply = getFallbackResponse(message);
    return new Response(JSON.stringify({ 
      reply: fallbackReply,
      source: 'fallback',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
