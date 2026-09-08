// ============================================================
// CHAT.JS - Complete Working Version with Security
// ============================================================

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

    const response = await fetch('https://formsubmit.co/ajax/houssemkessentini77@gmail.com', {
      method: 'POST',
      body: formData,
    });
    
    if (response.ok) {
      console.log('✅ Alert sent:', type);
    } else {
      console.error('❌ Alert failed:', await response.text());
    }
  } catch (error) {
    console.error('❌ Alert error:', error);
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  // Get request info
  const ip = req.headers.get('x-forwarded-for') || 
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

  // 1. Check blocked IPs
  if (isBlocked(ip)) {
    console.log(`🛑 Blocked IP: ${ip}`);
    return new Response('Access Denied - IP Blocked', { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // 2. Check bot
  if (isBot(userAgent)) {
    console.log(`🤖 Bot detected: ${ip}`);
    await sendAlert('BOT_DETECTED', ip, path);
    return new Response('Bot detected - Access Denied', { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // 3. Check rate limit
  if (!checkRateLimit(ip)) {
    console.log(`⚠️ Rate limit exceeded: ${ip}`);
    await sendAlert('RATE_LIMIT_ATTACK', ip, path);
    return new Response('Too many requests - Please try again later', { 
      status: 429,
      headers: { 
        'Content-Type': 'text/plain',
        'Retry-After': '60'
      }
    });
  }

  // ============================================================
  // ONLY ALLOW POST REQUESTS
  // ============================================================
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // ============================================================
  // GET API KEY FROM ENVIRONMENT
  // ============================================================
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not set');
    return new Response('AI service not configured', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // ============================================================
  // PARSE REQUEST BODY
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

  // Validate message
  if (!message || message.trim().length < 2) {
    return new Response('Message too short', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  if (message.length > 2000) {
    return new Response('Message too long', { 
      status: 413,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  console.log(`✅ Request from: ${ip} | Message: ${message.substring(0, 50)}...`);

  // ============================================================
  // BUILD CONTEXT FOR GEMINI
  // ============================================================
  let context = `أنت مساعد ذكي لموقع 9ATHYA.TN، وهو موقع خدمة توصيل منتجات غذائية في تونس.

المنتجات المتوفرة:
🥬 خضرة: طماطم (2.500 دت/كغ)، فلفل (3.500 دت/كغ)، بصل (1.500 دت/كغ)، بطاطا (2.200 دت/كغ)، جزر (2.200 دت/كغ)، خس (5.200 دت/رأس)، قرع (3.000 دت/كغ)، فقّوس (3.800 دت/كغ)، زبدّة (4.200 دت/كغ)
🍎 غلة: تفاح (6.250 دت/كغ)، موز (15.000 دت/كغ)، برتقال (2.700 دت/كغ)، ليمون (5.200 دت/كغ)، بطيخ (2.500 دت/كغ)، دلاع (2.900 دت/كغ)، شمام (3.800 دت/كغ)
🌾 مواد أساسية: زيت زيتون (14.500 دت/لتر)، سكر (2.900 دت/كغ)، سميدة (0.850 دت/كغ)، خبز (0.250 دت/رغيف)، حليب (1.300 دت/لتر)، قهوة (11.500 دت/كغ)، بهارات (7.000 دت/كغ)، رز (4.200 دت/كغ)، ماء (0.850 دت/قارورة)، دقيق (0.900 دت/كغ)
🫘 بقول: عدس (4.800 دت/كغ)، حمص (5.200 دت/كغ)، لوبيا (8.000 دت/كغ)، جلبانة (5.500 دت/كغ)
🥩 بروتينات: لحم مفروم (19.000 دت/كغ)، دجاج فيليه (17.500 دت/كغ)، لحم بقري (43.000 دت/كغ)، تونة (8.000 دت/علبة)، دجاج كامل (10.000 دت/كغ)، أسكالوب دجاج (19.500 دت/كغ)، ستيك بقري (39.500 دت/كغ)، سردين (7.000 دت/كغ)، سمك (15.000 دت/كغ)
🥛 ألبان: بيض (4.750 دت/طبق)، جبن محلي (37.330 دت/كغ)، زبدة (6.000 دت/قطعة)، جبن بكوات (8.000 دت/علبة)، لبن (1.200 دت/لتر)، ياغورت (0.800 دت/حبة)
🥫 مواد غذائية: طماطم مصبرة (5.000 دت/علبة)، زيت قلي (8.000 دت/لتر)، مايونيز (4.200 دت/علبة)، كاتشب (3.800 دت/علبة)، شوكولاتة (3.200 دت/قطعة)

أسعار التوصيل: 0.500 دت/كم بحد أدنى 1.800 DT، رسوم الشركة 3.000 DT.

أجب باللهجة التونسية العامية، كن مفيداً وودوداً. ساعد الزبون في اختيار المنتجات، قدم نصائح، وأجب عن أسئلته.
إذا سأل عن السعر أو المنتجات، أعطه تفاصيل دقيقة من القائمة أعلاه.
إذا سأل عن كيفية الطلب، اشرح له الخطوات.
كن مختصراً ولكن غنياً بالمعلومات.\n\n`;

  // Add history
  if (history && Array.isArray(history)) {
    const limitedHistory = history.slice(-10);
    for (const msg of limitedHistory) {
      if (msg.role === 'user') {
        context += `المستخدم: ${msg.content.substring(0, 500)}\n`;
      } else if (msg.role === 'assistant') {
        context += `المساعد: ${msg.content.substring(0, 500)}\n`;
      }
    }
  }

  context += `المستخدم: ${message.trim()}\nالمساعد:`;

  // ============================================================
  // CALL GEMINI API
  // ============================================================
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: context }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            topP: 0.9,
            topK: 40
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', errorData);
      return new Response('AI service error', { 
        status: response.status,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const data = await response.json();
    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع معالجة طلبك.';

    return new Response(JSON.stringify({ reply: aiReply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server Error:', error);
    if (error.name === 'AbortError') {
      return new Response('Request timeout', { 
        status: 504,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    return new Response('Internal server error', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
