// ============================================================
// CHAT.JS - Serverless Function with DDoS Protection
// Reads GEMINI_API_KEY from Vercel Environment Variables
// ============================================================

// Simple in-memory rate limiter (per IP)
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute

function getClientIP(req) {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         req.headers.get('x-vercel-ip-country') ||
         'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  for (const [key, timestamps] of rateLimit) {
    const validTimestamps = timestamps.filter(t => t > windowStart);
    if (validTimestamps.length === 0) {
      rateLimit.delete(key);
    } else {
      rateLimit.set(key, validTimestamps);
    }
  }
  
  const requests = rateLimit.get(ip) || [];
  const validRequests = requests.filter(t => t > windowStart);
  
  if (validRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  validRequests.push(now);
  rateLimit.set(ip, validRequests);
  return true;
}

// Blocklist for known bad IPs
const blocklist = new Set([
  // Add known malicious IPs here if needed
]);

function isBlocked(ip) {
  return blocklist.has(ip);
}

function logSecurityEvent(eventType, ip, details, req) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    eventType,
    ip,
    details,
    userAgent: req.headers.get('user-agent') || 'unknown',
    referer: req.headers.get('referer') || 'unknown'
  }));
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  const ip = getClientIP(req);

  // Check blocklist
  if (isBlocked(ip)) {
    logSecurityEvent('BLOCKLIST_HIT', ip, { reason: 'IP is blocklisted' }, req);
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Your IP has been blocked'
    });
  }

  // Rate limiting
  if (!checkRateLimit(ip)) {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', ip, { 
      limit: MAX_REQUESTS_PER_WINDOW,
      window: RATE_LIMIT_WINDOW / 1000 + ' seconds'
    }, req);
    return res.status(429).json({ 
      error: 'Too many requests',
      message: 'Please wait a moment and try again.',
      retryAfter: 60,
      limit: MAX_REQUESTS_PER_WINDOW
    });
  }

  // Get request body
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const { message, history } = body;

  // Validate message
  if (!message || message.trim().length < 2) {
    return res.status(400).json({ 
      error: 'Message is too short',
      minLength: 2
    });
  }

  // Prevent large payload attacks
  if (message.length > 2000) {
    logSecurityEvent('PAYLOAD_TOO_LARGE', ip, { 
      length: message.length,
      maxAllowed: 2000
    }, req);
    return res.status(413).json({ 
      error: 'Message too long',
      maxLength: 2000,
      received: message.length
    });
  }

  // Validate history
  if (history && !Array.isArray(history)) {
    return res.status(400).json({ error: 'History must be an array' });
  }

  // ============================================================
  // 🔑 GET API KEY FROM VERCEL ENVIRONMENT VARIABLES
  // ============================================================
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not set in Vercel environment variables');
    logSecurityEvent('MISSING_API_KEY', ip, { error: 'API key not configured' }, req);
    return res.status(500).json({ 
      error: 'AI service not configured',
      message: 'Please contact support'
    });
  }

  console.log(`✅ Request from IP: ${ip} | Message: ${message.substring(0, 50)}...`);

  try {
    // Build the conversation context
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
إذا سأل عن كيفية الطلب، اشرح له الخطوات (اختيار المنتجات، إضافة الكمية، تحديد الموقع، ملء المعلومات، تأكيد الطلب).
كن مختصراً ولكن غنياً بالمعلومات.\n\n`;

    // Add conversation history (limit to prevent memory issues)
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

    // Call Gemini API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: context }]
              }
            ],
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
        return res.status(response.status).json({
          error: 'AI service error',
          details: errorData
        });
      }

      const data = await response.json();
      const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع معالجة طلبك. حاول مرة أخرى.';

      return res.status(200).json({
        reply: aiReply,
        timestamp: new Date().toISOString()
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        logSecurityEvent('REQUEST_TIMEOUT', ip, { timeout: '15 seconds' }, req);
        return res.status(504).json({ 
          error: 'Request timeout',
          message: 'The AI service took too long to respond. Please try again.'
        });
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('Server Error:', error);
    logSecurityEvent('SERVER_ERROR', ip, { 
      error: error.message,
      stack: error.stack
    }, req);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again later.'
    });
  }
}
