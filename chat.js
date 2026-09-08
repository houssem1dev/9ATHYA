export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;

  if (!message || message.trim().length < 2) {
    return res.status(400).json({ error: 'Message is too short' });
  }

  // Get API key from environment variables (SECURE!)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY not set in environment variables');
    return res.status(500).json({ error: 'AI service not configured' });
  }

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

    // Add conversation history
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        if (msg.role === 'user') {
          context += `المستخدم: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          context += `المساعد: ${msg.content}\n`;
        }
      });
    }

    context += `المستخدم: ${message.trim()}\nالمساعد:`;

    // Call Gemini API
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
        })
      }
    );

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

    // Save conversation for analytics (optional)
    // You can store this in a database or file

    return res.status(200).json({
      reply: aiReply,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
