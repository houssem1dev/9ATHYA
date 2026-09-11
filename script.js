(function() {
    'use strict';

    // ============================================================
    // CONFIG
    // ============================================================
    const DELIVERY_PRICE_PER_KM = 0.500;
    const MIN_DELIVERY_PRICE = 1.800;
    const SERVICE_FEE = 3.000;

    // ✅ حدود الحماية
    const AI_MIN_INTERVAL_MS = 1500;        // 1.5 ثانية بين كل رسالة AI
    const SUBMIT_MIN_INTERVAL_MS = 30000;   // 30 ثانية بين كل طلب
    const AI_MAX_MESSAGE_LENGTH = 500;      // 500 حرف كحد أقصى
    const AI_MIN_MESSAGE_LENGTH = 2;        // 2 حرف كحد أدنى
    const MAX_CART_ITEMS = 50;              // 50 منتج كحد أقصى في السلة
    const MAX_CART_QUANTITY = 999;          // 999 وحدة كحد أقصى
    const MAX_SHOPS = 10;                   // 10 متاجر كحد أقصى

    let clientCoords = null;
    let isSubmitting = false;

    // ✅ تتبع آخر الطلبات
    let lastAiCallTime = 0;
    let lastSubmitTime = 0;

    // ============================================================
    // AI CONFIG
    // ============================================================
    const AI_API_URL = '/api/chat';
    let aiChatHistory = [];
    let isAiProcessing = false;

    // ============================================================
    // TOAST
    // ============================================================
    function showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        toast.className = `toast toast-${type}`;
        
        // ✅ استخدام textContent بدلاً من innerHTML لمنع XSS
        const iconSpan = document.createElement('span');
        iconSpan.textContent = icons[type] || 'ℹ️';
        
        const msgSpan = document.createElement('span');
        msgSpan.style.flex = '1';
        msgSpan.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', function() { toast.remove(); });
        
        toast.appendChild(iconSpan);
        toast.appendChild(msgSpan);
        toast.appendChild(closeBtn);
        
        container.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, duration);
    }

    // ============================================================
    // ✅ Helper: Sanitize Text
    // ============================================================
    function sanitizeText(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, ' ');
    }

    // ============================================================
    // ✅ Helper: Validate Phone
    // ============================================================
    function validatePhone(phone) {
        if (!phone) return false;
        return /^(?:\+216)?[234579]\d{7}$/.test(phone.replace(/\s+/g, ''));
    }

    // ============================================================
    // ✅ Helper: Escape for textContent
    // ============================================================
    function cleanInput(str) {
        if (!str) return '';
        return String(str).replace(/[<>]/g, '').trim();
    }

    // ============================================================
    // AI FUNCTIONS
    // ============================================================
    function getFallbackResponse(userMessage) {
        const msg = userMessage.toLowerCase();

        if (msg.includes('منتج') || msg.includes('متوف') || msg.includes('شنو')) {
            return `📦 **المنتجات المتوفرة عندنا:**

🥬 **خضرة:** طماطم، فلفل، بصل، بطاطا، جزر، خس، قرع، فقّوس، زبدّة
🍎 **غلة:** تفاح، موز، برتقال، ليمون، بطيخ، دلاع، شمام
🌾 **مواد أساسية:** زيت زيتون، سكر، سميدة، خبز، حليب، قهوة، بهارات، رز، ماء، دقيق
🫘 **بقول:** عدس، حمص، لوبيا، جلبانة
🥩 **بروتينات:** لحم مفروم، دجاج، لحم بقري، تونة، سردين، سمك
🥛 **ألبان:** بيض، جبن، زبدة، لبن، ياغورت
🥫 **مواد غذائية:** طماطم مصبرة، زيت قلي، مايونيز، كاتشب، شوكولاتة

شنو تحب تطلب؟ 😊`;
        }

        if (msg.includes('توصيل') || msg.includes('سعر') || msg.includes('كم')) {
            return `🚗 **أسعار التوصيل:**
- 0.500 دت/كم (الحد الأدنى 1.800 DT)
- رسوم الشركة: 3.000 DT
- يُحسب السعر حسب المسافة الفعلية`;
        }

        if (msg.includes('كيف') || msg.includes('طلب') || msg.includes('طريقة')) {
            return `📝 **كيف تطلب من 9ATHYA.TN؟**

1️⃣ اختر المنتجات من القائمة
2️⃣ حدد الكمية المطلوبة
3️⃣ اضغط "أضف للسلة"
4️⃣ اكتب اسم المحل والمنطقة
5️⃣ حدد موقعك للتوصيل
6️⃣ املأ اسمك ورقم هاتفك
7️⃣ اضغط "تأكيد الطلب"`;
        }

        if (msg.includes('صحي') || msg.includes('نصيحة') || msg.includes('وجبة')) {
            return `🥗 **نصيحة غذائية:**

جرب وجبة تونسية صحية:
- سلطة مشكلة (خس + طماطم + فلفل + زيت زيتون)
- طاجين بالخضرة (قرع + بطاطا + بيض)
- سمك مشوي مع سلطة
- فواكه موسمية للتحلية`;
        }

        return `🤔 شكراً على سؤالك!

أنا مساعد 9ATHYA الذكي. أقدر نجاوب على أسئلة عن:
- 🛒 **المنتجات** المتوفرة
- 🚗 **أسعار التوصيل**
- 📝 **كيفية الطلب**
- 🥗 **نصائح غذائية**

شنو تحب تسأل بالضبط؟`;
    }

    async function sendAiMessage(userMessage) {
        // ✅ 1. تحقق من Rate Limit محلي
        const now = Date.now();
        if (now - lastAiCallTime < AI_MIN_INTERVAL_MS) {
            showToast('⏳ الرجاء الانتظار قليلاً قبل إرسال رسالة أخرى', 'warning');
            return;
        }

        if (isAiProcessing) return;

        // ✅ 2. تحقق من المدخلات
        const trimmed = cleanInput(userMessage);
        if (trimmed.length < AI_MIN_MESSAGE_LENGTH) {
            showToast('الرجاء كتابة سؤال أطول', 'warning');
            return;
        }
        if (trimmed.length > AI_MAX_MESSAGE_LENGTH) {
            showToast(`الرسالة طويلة جداً (${AI_MAX_MESSAGE_LENGTH} حرف كحد أقصى)`, 'warning');
            return;
        }

        lastAiCallTime = now;

        const messagesContainer = document.getElementById('aiMessages');
        const inputField = document.getElementById('aiInput');
        const sendBtn = document.getElementById('aiSendBtn');

        if (!messagesContainer || !inputField || !sendBtn) return;

        // ✅ إضافة رسالة المستخدم باستخدام textContent
        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'message user';
        userMsgDiv.textContent = trimmed;
        messagesContainer.appendChild(userMsgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        inputField.value = '';

        // ✅ مؤشر الكتابة
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant';
        typingDiv.id = 'typingIndicator';
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        for (let i = 0; i < 3; i++) {
            typingIndicator.appendChild(document.createElement('span'));
        }
        typingDiv.appendChild(typingIndicator);
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        isAiProcessing = true;
        inputField.disabled = true;
        sendBtn.disabled = true;

        try {
            const response = await fetch(AI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: trimmed,
                    history: aiChatHistory
                })
            });

            const typingEl = document.getElementById('typingIndicator');
            if (typingEl) typingEl.remove();

            let aiReply;

            if (!response.ok) {
                aiReply = getFallbackResponse(trimmed);
                showToast('⚠️ استخدمت الردود المحلية', 'warning');
            } else {
                const data = await response.json();
                aiReply = data.reply || getFallbackResponse(trimmed);
            }

            // ✅ تحديث السجل
            aiChatHistory.push({ role: 'user', content: trimmed });
            aiChatHistory.push({ role: 'assistant', content: aiReply });
            if (aiChatHistory.length > 20) {
                aiChatHistory = aiChatHistory.slice(-20);
            }

            // ✅ عرض الرد باستخدام textContent
            const aiMsgDiv = document.createElement('div');
            aiMsgDiv.className = 'message assistant';
            aiMsgDiv.textContent = aiReply;
            messagesContainer.appendChild(aiMsgDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

        } catch (error) {
            console.error('AI Error:', error);
            const typingEl = document.getElementById('typingIndicator');
            if (typingEl) typingEl.remove();
            
            const fallbackReply = getFallbackResponse(trimmed);
            const aiMsgDiv = document.createElement('div');
            aiMsgDiv.className = 'message assistant';
            aiMsgDiv.textContent = fallbackReply;
            messagesContainer.appendChild(aiMsgDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            showToast('⚠️ مشكلة في الاتصال، استخدمت الردود المحلية', 'error');
        } finally {
            isAiProcessing = false;
            inputField.disabled = false;
            sendBtn.disabled = false;
            inputField.focus();
        }
    }

    // ============================================================
    // AI UI CONTROLS
    // ============================================================
    const aiToggle = document.getElementById('aiToggle');
    const aiChatWindow = document.getElementById('aiChatWindow');
    const aiCloseBtn = document.getElementById('aiCloseBtn');
    const aiInput = document.getElementById('aiInput');
    const aiSendBtn = document.getElementById('aiSendBtn');
    const quickSuggestions = document.getElementById('quickSuggestions');

    if (aiToggle && aiChatWindow) {
        aiToggle.addEventListener('click', function() {
            aiChatWindow.classList.toggle('open');
            if (aiChatWindow.classList.contains('open') && aiInput) {
                aiInput.focus();
            }
        });
    }

    if (aiCloseBtn && aiChatWindow) {
        aiCloseBtn.addEventListener('click', function() { 
            aiChatWindow.classList.remove('open'); 
        });
    }

    if (aiSendBtn) {
        aiSendBtn.addEventListener('click', function() { 
            if (aiInput) sendAiMessage(aiInput.value); 
        });
    }

    if (aiInput) {
        aiInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAiMessage(aiInput.value);
            }
        });
    }

    if (quickSuggestions) {
        quickSuggestions.addEventListener('click', function(e) {
            const btn = e.target.closest('button');
            if (btn && btn.dataset.msg) {
                sendAiMessage(btn.dataset.msg);
            }
        });
    }

    document.addEventListener('click', function(e) {
        if (aiChatWindow && aiChatWindow.classList.contains('open')) {
            const isToggle = aiToggle ? aiToggle.contains(e.target) : false;
            const isWindow = aiChatWindow.contains(e.target);
            if (!isToggle && !isWindow) {
                aiChatWindow.classList.remove('open');
            }
        }
    });

    // ============================================================
    // MENU DATA - جميع المنتجات (كاملة)
    // ============================================================
    const menuData = {
        vegetables: [
            { id: 'v1', name: 'طماطم', pricePerUnit: 2.500, unit: 'كغ', image: '🍅', description: 'طماطم طازجة',
                quickQuantities: [1, 2, 5] },
            { id: 'v2', name: 'فلفل', pricePerUnit: 3.500, unit: 'كغ', image: '🌶️',
                description: 'فلفل أخضر وحار', quickQuantities: [1, 2, 5] },
            { id: 'v3', name: 'بصل', pricePerUnit: 1.500, unit: 'كغ', image: '🧅', description: 'بصل أحمر وأبيض',
                quickQuantities: [1, 2, 5] },
            { id: 'v4', name: 'بطاطا', pricePerUnit: 2.200, unit: 'كغ', image: '🥔', description: 'بطاطا محلية',
                quickQuantities: [1, 5, 10] },
            { id: 'v5', name: 'جزر', pricePerUnit: 2.200, unit: 'كغ', image: '🥕', description: 'جزر طازج',
                quickQuantities: [1, 2, 5] },
            { id: 'v6', name: 'خس', pricePerUnit: 5.200, unit: 'رأس', image: '🥬', description: 'خس طازج',
                quickQuantities: [1, 2, 3] },
            { id: 'v7', name: 'قرع', pricePerUnit: 3.000, unit: 'كغ', image: '🎃', description: 'قرع طازج',
                quickQuantities: [1, 2, 5] },
            { id: 'v8', name: 'فقّوس', pricePerUnit: 3.800, unit: 'كغ', image: '🥒', description: 'فقّوس طازج',
                quickQuantities: [1, 2, 5] },
            { id: 'v9', name: 'زبدّة', pricePerUnit: 4.200, unit: 'كغ', image: '🥒', description: 'زبدّة طازجة',
                quickQuantities: [1, 2, 5] }
        ],
        fruits: [
            { id: 'f1', name: 'تفاح', pricePerUnit: 6.250, unit: 'كغ', image: '🍎', description: 'تفاح أحمر وأخضر',
                quickQuantities: [1, 2, 5] },
            { id: 'f2', name: 'موز', pricePerUnit: 15.000, unit: 'كغ', image: '🍌', description: 'موز طازج',
                quickQuantities: [1, 2, 5] },
            { id: 'f3', name: 'برتقال', pricePerUnit: 2.700, unit: 'كغ', image: '🍊', description: 'برتقال محلي',
                quickQuantities: [1, 3, 5] },
            { id: 'f4', name: 'ليمون', pricePerUnit: 5.200, unit: 'كغ', image: '🍋', description: 'ليمون طازج',
                quickQuantities: [1, 2, 5] },
            { id: 'f5', name: 'بطيخ', pricePerUnit: 2.500, unit: 'كغ', image: '🍉', description: 'بطيخ أحمر',
                quickQuantities: [1, 3, 5] },
            { id: 'f6', name: 'دلاع', pricePerUnit: 2.900, unit: 'كغ', image: '🍉', description: 'دلاع طازج',
                quickQuantities: [1, 3, 5] },
            { id: 'f7', name: 'شمام', pricePerUnit: 3.800, unit: 'كغ', image: '🍈', description: 'شمام طازج',
                quickQuantities: [1, 2, 5] }
        ],
        staples: [
            { id: 's1', name: 'زيت زيتون', pricePerUnit: 14.500, unit: 'لتر', image: '🫒',
                description: 'زيت زيتون بكر', quickQuantities: [1, 5, 10] },
            { id: 's2', name: 'سكر', pricePerUnit: 2.900, unit: 'كغ', image: '🧂', description: 'سكر أبيض',
                quickQuantities: [1, 2, 5] },
            { id: 's3', name: 'سميدة', pricePerUnit: 0.850, unit: 'كغ', image: '🌾', description: 'سميدة خشنة',
                quickQuantities: [1, 2, 5] },
            { id: 's4', name: 'خبز', pricePerUnit: 0.250, unit: 'رغيف', image: '🍞', description: 'خبز طازج',
                quickQuantities: [1, 5, 10] },
            { id: 's5', name: 'حليب', pricePerUnit: 1.300, unit: 'لتر', image: '🥛', description: 'حليب طازج',
                quickQuantities: [1, 2, 6] },
            { id: 's6', name: 'قهوة', pricePerUnit: 11.500, unit: 'كغ', image: '☕',
                description: 'قهوة طازجة - جودة عالية', quickQuantities: [0.5, 1, 2] },
            { id: 's7', name: 'بهارات', pricePerUnit: 7.000, unit: 'كغ', image: '🌶️',
                description: 'بهارات متنوعة', quickQuantities: [0.5, 1, 2] },
            { id: 's8', name: 'رز أبيض', pricePerUnit: 4.200, unit: 'كغ', image: '🍚', description: 'رز أبيض',
                quickQuantities: [1, 2, 5] },
            { id: 's9', name: 'ماء (1.5 لتر)', pricePerUnit: 0.850, unit: 'قارورة', image: '💧',
                description: 'ماء معدني', quickQuantities: [1, 6, 12] },
            { id: 's10', name: 'دقيق', pricePerUnit: 0.900, unit: 'كغ', image: '🌾', description: 'دقيق أبيض',
                quickQuantities: [1, 5, 10] }
        ],
        grains: [
            { id: 'g1', name: 'عدس', pricePerUnit: 4.800, unit: 'كغ', image: '🫘', description: 'عدس أخضر وأحمر',
                quickQuantities: [1, 2, 5] },
            { id: 'g2', name: 'حمص', pricePerUnit: 5.200, unit: 'كغ', image: '🫛', description: 'حمص جاف',
                quickQuantities: [1, 2, 5] },
            { id: 'g3', name: 'لوبيا', pricePerUnit: 8.000, unit: 'كغ', image: '🫘', description: 'لوبيا بيضاء وحمراء',
                quickQuantities: [1, 2, 5] },
            { id: 'g4', name: 'جلبانة', pricePerUnit: 5.500, unit: 'كغ', image: '🫛', description: 'جلبانة جافة',
                quickQuantities: [1, 2, 5] }
        ],
        meat: [
            { id: 'm1', name: 'لحم مفروم', pricePerUnit: 19.000, unit: 'كغ', image: '🥩',
                description: 'لحم بقري مفروم طازج', quickQuantities: [0.5, 1, 2] },
            { id: 'm2', name: 'دجاج فيليه', pricePerUnit: 17.500, unit: 'كغ', image: '🍗',
                description: 'فيليه دجاج طازج', quickQuantities: [0.5, 1, 2] },
            { id: 'm3', name: 'لحم بقري', pricePerUnit: 43.000, unit: 'كغ', image: '🥩',
                description: 'لحم بقري طازج', quickQuantities: [0.5, 1, 2] },
            { id: 'm4', name: 'تونة', pricePerUnit: 8.000, unit: 'علبة', image: '🐟', description: 'تونة معلبة',
                quickQuantities: [1, 2, 5] },
            { id: 'm5', name: 'دجاج كامل', pricePerUnit: 10.000, unit: 'كغ', image: '🍗', description: 'دجاج كامل طازج',
                quickQuantities: [1, 2, 3] },
            { id: 'm6', name: 'أسكالوب دجاج', pricePerUnit: 19.500, unit: 'كغ', image: '🍗',
                description: 'إسكالوب دجاج طازج', quickQuantities: [0.5, 1, 2] },
            { id: 'm7', name: 'ستيك بقري', pricePerUnit: 39.500, unit: 'كغ', image: '🥩',
                description: 'ستيك لحم بقري طازج', quickQuantities: [0.5, 1, 2] },
            { id: 'm8', name: 'سردين', pricePerUnit: 7.000, unit: 'كغ', image: '🐟', description: 'سردين طازج',
                quickQuantities: [1, 2, 5] },
            { id: 'm9', name: 'سمك', pricePerUnit: 15.000, unit: 'كغ', image: '🐟', description: 'سمك طازج متنوع',
                quickQuantities: [1, 2, 5] }
        ],
        dairy: [
            { id: 'd1', name: 'بيض (12 حبة)', pricePerUnit: 4.750, unit: 'طبق', image: '🥚', description: 'بيض طازج',
                quickQuantities: [1, 2, 3] },
            { id: 'd2', name: 'جبن محلي', pricePerUnit: 37.330, unit: 'كغ', image: '🧀', description: 'جبن أبيض وصفراء',
                quickQuantities: [0.25, 0.5, 1] },
            { id: 'd3', name: 'زبدة', pricePerUnit: 6.000, unit: 'قطعة', image: '🧈', description: 'زبدة طبيعية',
                quickQuantities: [1, 2, 5] },
            { id: 'd4', name: 'جبن بكوات', pricePerUnit: 8.000, unit: 'علبة', image: '🧀',
                description: 'جبن شرائح معلب', quickQuantities: [1, 2, 3] },
            { id: 'd5', name: 'لبن', pricePerUnit: 1.200, unit: 'لتر', image: '🥛', description: 'لبن طازج',
                quickQuantities: [1, 2, 6] },
            { id: 'd6', name: 'ياغورت', pricePerUnit: 0.800, unit: 'حبة', image: '🍶', description: 'ياغورت طبيعي',
                quickQuantities: [1, 6, 12] }
        ],
        conserves: [
            { id: 'c1', name: 'طماطم مصبرة', pricePerUnit: 5.000, unit: 'علبة', image: '🥫',
                description: 'طماطم مصبرة', quickQuantities: [1, 3, 6] },
            { id: 'c2', name: 'زيت قلي', pricePerUnit: 8.000, unit: 'لتر', image: '🛢️',
                description: 'زيت نباتي للقلي', quickQuantities: [1, 2, 5] },
            { id: 'c3', name: 'مايونيز', pricePerUnit: 4.200, unit: 'علبة', image: '🥄', description: 'مايونيز',
                quickQuantities: [1, 2, 3] },
            { id: 'c4', name: 'كاتشب', pricePerUnit: 3.800, unit: 'علبة', image: '🍅', description: 'صلصة كاتشب',
                quickQuantities: [1, 2, 3] },
            { id: 'c5', name: 'شوكولاتة', pricePerUnit: 3.200, unit: 'قطعة', image: '🍫', description: 'شوكولاتة',
                quickQuantities: [1, 3, 6] }
        ]
    };

    // ✅ Registry للمنتجات
    const itemRegistry = {};
    Object.values(menuData).forEach(catArray => {
        catArray.forEach(item => { 
            itemRegistry[item.id] = item; 
        });
    });

    // ✅ السلة
    const cart = [];

    // ============================================================
    // ✅ Helper: Get Shop Data
    // ============================================================
    function getShopData() {
        const entries = document.querySelectorAll('.shop-entry');
        const shops = [];
        entries.forEach(entry => {
            const nameInput = entry.querySelector('.shop-name-input');
            const zoneInput = entry.querySelector('.shop-zone-input');
            if (nameInput && zoneInput) {
                const name = cleanInput(nameInput.value);
                const zone = cleanInput(zoneInput.value);
                if (name.length > 0 || zone.length > 0) {
                    shops.push({ 
                        name: name || 'غير محدد', 
                        zone: zone || 'غير محدد' 
                    });
                }
            }
        });
        return shops;
    }

    // ============================================================
    // GEOLOCATION
    // ============================================================
    function getClientLocation() {
        const addressInput = document.getElementById('userAdresse');
        const statusEl = document.getElementById('locationStatus');
        const btn = document.getElementById('getLocationBtn');

        if (!navigator.geolocation) {
            if (addressInput) {
                addressInput.value = '';
                addressInput.placeholder = 'اكتب عنوانك يدوياً';
                addressInput.disabled = false;
            }
            if (statusEl) statusEl.textContent = '⚠️ متصفحك لا يدعم تحديد الموقع';
            showToast('متصفحك لا يدعم تحديد الموقع', 'warning');
            return;
        }

        if (statusEl) statusEl.textContent = '⏳ جاري تحديد موقعك...';
        if (addressInput) {
            addressInput.className = 'form-input loading';
            addressInput.value = '⏳ جاري التحديد...';
            addressInput.disabled = true;
        }
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ جاري...';
        }

        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                clientCoords = [lat, lng];

                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`)
                    .then(response => response.json())
                    .then(data => {
                        if (addressInput) {
                            if (data && data.display_name) {
                                let address = data.display_name;
                                if (address.length > 80) address = address.substring(0, 80) + '...';
                                addressInput.value = address;
                                addressInput.className = 'form-input success';
                                addressInput.disabled = false;
                                if (statusEl) statusEl.textContent = `✅ ${address}`;
                                showToast('تم تحديد موقعك بنجاح', 'success');
                            } else {
                                addressInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                                addressInput.className = 'form-input success';
                                addressInput.disabled = false;
                                if (statusEl) {
                                    statusEl.textContent = `✅ تم التحديد (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                                }
                            }
                        }
                        if (btn) {
                            btn.disabled = false;
                            btn.textContent = '📍 تحديد موقعي';
                        }
                    })
                    .catch(() => {
                        if (addressInput) {
                            addressInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                            addressInput.className = 'form-input success';
                            addressInput.disabled = false;
                            if (statusEl) {
                                statusEl.textContent = `✅ تم التحديد (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                            }
                        }
                        if (btn) {
                            btn.disabled = false;
                            btn.textContent = '📍 تحديد موقعي';
                        }
                    });
            },
            function(error) {
                if (addressInput) {
                    addressInput.value = '';
                    addressInput.placeholder = 'اكتب عنوانك يدوياً';
                    addressInput.className = 'form-input error';
                    addressInput.disabled = false;
                }
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '📍 تحديد موقعي';
                }
                if (statusEl) statusEl.textContent = `❌ ${error.message}`;
                showToast(`فشل تحديد الموقع: ${error.message}`, 'error');
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }

    const locationBtn = document.getElementById('getLocationBtn');
    if (locationBtn) {
        locationBtn.addEventListener('click', getClientLocation);
    }

    // ============================================================
    // SHOPS
    // ============================================================
    const addShopBtn = document.getElementById('addShopBtn');
    if (addShopBtn) {
        addShopBtn.addEventListener('click', function() {
            const container = document.getElementById('shops-container');
            if (!container) return;

            // ✅ حد أقصى للمتاجر
            if (container.children.length >= MAX_SHOPS) {
                showToast(`⚠️ لا يمكن إضافة أكثر من ${MAX_SHOPS} متاجر`, 'warning');
                return;
            }

            const entry = document.createElement('div');
            entry.className = 'shop-entry';

            const count = container.children.length + 1;
            const numberSpan = document.createElement('span');
            numberSpan.className = 'shop-number';
            numberSpan.textContent = count;

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'shop-name-input';
            nameInput.placeholder = 'اسم المحل (اختياري)';
            nameInput.maxLength = 50;

            const zoneInput = document.createElement('input');
            zoneInput.type = 'text';
            zoneInput.className = 'shop-zone-input';
            zoneInput.placeholder = 'المنطقة';
            zoneInput.maxLength = 50;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-shop';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', function() {
                if (container.children.length > 1) {
                    entry.remove();
                    container.querySelectorAll('.shop-entry').forEach((el, i) => {
                        const numSpan = el.querySelector('.shop-number');
                        if (numSpan) numSpan.textContent = i + 1;
                    });
                    updateCartDisplay();
                    showToast('تم حذف المحل', 'info');
                } else {
                    showToast('⚠️ لازم يكون على الأقل محل واحد', 'warning');
                }
            });

            entry.appendChild(numberSpan);
            entry.appendChild(nameInput);
            entry.appendChild(zoneInput);
            entry.appendChild(removeBtn);
            container.appendChild(entry);
            updateCartDisplay();
            showToast('تم إضافة محل جديد', 'success');
        });
    }

    // ============================================================
    // CATEGORY
    // ============================================================
    function filterCategory(category) {
        const sections = document.querySelectorAll('.category-section');
        if (category === 'all') {
            sections.forEach(section => {
                section.classList.remove('hidden');
                section.style.display = 'block';
            });
        } else {
            sections.forEach(section => {
                section.classList.add('hidden');
                section.style.display = 'none';
            });
            const targetSection = document.getElementById(`${category}-section`);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                targetSection.style.display = 'block';
            }
        }
    }

    document.querySelectorAll('.category-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterCategory(this.dataset.category);
        });
    });

    // ============================================================
    // RENDER MENU
    // ============================================================
    function renderMenu() {
        Object.keys(menuData).forEach(category => {
            const container = document.getElementById(`${category}-menu`);
            if (container) renderCategory(container, menuData[category]);
        });
        filterCategory('all');
    }

    function renderCategory(container, items) {
        if (!container) return;
        container.innerHTML = '';
        
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'menu-card';

            // Header
            const headerDiv = document.createElement('div');
            headerDiv.className = 'item-header';

            const imgDiv = document.createElement('div');
            imgDiv.className = 'item-image';
            imgDiv.textContent = item.image;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'item-info';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'item-name';
            nameDiv.textContent = item.name;

            const priceDiv = document.createElement('div');
            priceDiv.className = 'item-unit-price';
            priceDiv.textContent = item.pricePerUnit.toFixed(3) + ' ';

            const priceSpan = document.createElement('span');
            priceSpan.textContent = `DT/${item.unit}`;
            priceDiv.appendChild(priceSpan);

            infoDiv.appendChild(nameDiv);
            infoDiv.appendChild(priceDiv);
            headerDiv.appendChild(imgDiv);
            headerDiv.appendChild(infoDiv);

            // Description
            const descDiv = document.createElement('div');
            descDiv.style.cssText = 'color:#666;font-size:0.85rem;margin-bottom:8px;';
            descDiv.textContent = item.description;

            // Quantity Selector
            const qtySelector = document.createElement('div');
            qtySelector.className = 'quantity-selector';

            const qtyLabel = document.createElement('span');
            qtyLabel.style.cssText = 'font-weight:700;color:#666;';
            qtyLabel.textContent = 'الكمية:';

            const quantityInput = document.createElement('input');
            quantityInput.type = 'number';
            quantityInput.className = 'quantity-input';
            quantityInput.value = '1';
            quantityInput.min = '0.1';
            quantityInput.step = '0.1';
            quantityInput.max = String(MAX_CART_QUANTITY);

            const qtyUnit = document.createElement('span');
            qtyUnit.className = 'quantity-unit';
            qtyUnit.textContent = item.unit;

            const totalItemPrice = document.createElement('span');
            totalItemPrice.className = 'total-item-price';
            totalItemPrice.textContent = `= ${item.pricePerUnit.toFixed(3)} DT`;

            qtySelector.appendChild(qtyLabel);
            qtySelector.appendChild(quantityInput);
            qtySelector.appendChild(qtyUnit);
            qtySelector.appendChild(totalItemPrice);

            // Quick Quantities
            const quickBtnsDiv = document.createElement('div');
            quickBtnsDiv.className = 'quick-quantity-btns';
            item.quickQuantities.forEach(qty => {
                const qBtn = document.createElement('button');
                qBtn.className = 'quick-qty-btn';
                qBtn.textContent = `${qty} ${item.unit}`;
                qBtn.dataset.qty = qty;
                quickBtnsDiv.appendChild(qBtn);
            });

            // Add to Cart Button
            const addToCartBtn = document.createElement('button');
            addToCartBtn.className = 'add-to-cart-btn';
            addToCartBtn.textContent = '🛒 أضف للسلة';

            card.appendChild(headerDiv);
            card.appendChild(descDiv);
            card.appendChild(qtySelector);
            card.appendChild(quickBtnsDiv);
            card.appendChild(addToCartBtn);

            // ✅ Update Price
            function updatePrice() {
                const qty = parseFloat(quantityInput.value) || 0;
                totalItemPrice.textContent = `= ${(qty * item.pricePerUnit).toFixed(3)} DT`;
            }

            quantityInput.addEventListener('input', updatePrice);

            card.querySelectorAll('.quick-qty-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    quantityInput.value = this.dataset.qty;
                    updatePrice();
                });
            });

            addToCartBtn.addEventListener('click', function() {
                // ✅ التحقق من الحد الأقصى للسلة
                if (cart.length >= MAX_CART_ITEMS) {
                    showToast(`⚠️ السلة ممتلئة (${MAX_CART_ITEMS} منتج كحد أقصى)`, 'warning');
                    return;
                }

                const qty = parseFloat(quantityInput.value) || 0;
                if (qty <= 0 || qty > MAX_CART_QUANTITY) {
                    showToast('⚠️ الكمية غير صالحة', 'warning');
                    return;
                }

                const totalPrice = qty * item.pricePerUnit;

                cart.push({
                    cartId: item.id + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                    id: item.id,
                    name: item.name,
                    image: item.image,
                    unit: item.unit,
                    quantity: qty,
                    unitPrice: item.pricePerUnit,
                    totalPrice: totalPrice
                });

                updateCartDisplay();
                quantityInput.value = 1;
                updatePrice();
                showToast(`✅ تم إضافة ${item.name} إلى السلة`, 'success');
            });

            container.appendChild(card);
        });
    }

    // ============================================================
    // CART DISPLAY
    // ============================================================
    function updateCartDisplay() {
        const cartList = document.getElementById('cart-items');
        const cartCount = document.getElementById('cart-count');
        const totalPriceEl = document.getElementById('total-price');
        const shopsDisplay = document.getElementById('shops-display');

        if (cartList) cartList.innerHTML = '';

        let subtotal = 0;
        const shops = getShopData();

        // Shops Display
        if (shopsDisplay) {
            if (shops.length === 0) {
                shopsDisplay.textContent = 'أضف متاجر';
            } else {
                shopsDisplay.innerHTML = shops.map(s =>
                    `<span class="shop-item">${sanitizeText(s.name)}${s.zone && s.zone !== 'غير محدد' ? ' (' + sanitizeText(s.zone) + ')' : ''}</span>`
                ).join(' ');
            }
        }

        // Cart Items
        if (cart.length === 0) {
            if (cartList) {
                const emptyLi = document.createElement('li');
                emptyLi.style.cssText = 'text-align:center;color:#999;padding:15px;';
                emptyLi.textContent = 'السلة فارغة 🛒';
                cartList.appendChild(emptyLi);
            }
            if (cartCount) cartCount.textContent = '0';
        } else {
            cart.forEach((item, index) => {
                subtotal += item.totalPrice;
                if (cartList) {
                    const li = document.createElement('li');
                    
                    const headerDiv = document.createElement('div');
                    headerDiv.className = 'cart-item-header';

                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'cart-item-name';
                    nameSpan.textContent = `${item.image} ${item.name}`;

                    const priceSpan = document.createElement('span');
                    priceSpan.className = 'cart-item-price';
                    priceSpan.textContent = `${item.totalPrice.toFixed(3)} DT`;

                    headerDiv.appendChild(nameSpan);
                    headerDiv.appendChild(priceSpan);

                    const detailsDiv = document.createElement('div');
                    detailsDiv.className = 'cart-item-details';
                    detailsDiv.textContent = `${item.quantity} ${item.unit} × ${item.unitPrice.toFixed(3)} DT`;

                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-btn';
                    removeBtn.style.marginTop = '3px';
                    removeBtn.textContent = 'حذف';
                    removeBtn.addEventListener('click', function() {
                        cart.splice(index, 1);
                        updateCartDisplay();
                        showToast('تم حذف المنتج من السلة', 'info');
                    });

                    li.appendChild(headerDiv);
                    li.appendChild(detailsDiv);
                    li.appendChild(removeBtn);
                    cartList.appendChild(li);
                }
            });
            if (cartCount) cartCount.textContent = cart.length;
        }

        // Total
        if (totalPriceEl) {
            totalPriceEl.textContent = (subtotal + SERVICE_FEE).toFixed(3) + ' DT';
        }

        const feesLine = document.getElementById('fees-line');
        if (feesLine) {
            feesLine.textContent = SERVICE_FEE.toFixed(3) + ' DT رسوم الشركة';
        }
    }

    // ============================================================
    // ✅ SUBMIT ORDER
    // ============================================================
    const submitBtn = document.getElementById('submitOrder');
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            // ✅ التحقق من Rate Limit للإرسال
            const now = Date.now();
            if (now - lastSubmitTime < SUBMIT_MIN_INTERVAL_MS) {
                const remaining = Math.ceil((SUBMIT_MIN_INTERVAL_MS - (now - lastSubmitTime)) / 1000);
                showToast(`⏳ الرجاء الانتظار ${remaining} ثانية قبل إرسال طلب آخر`, 'warning');
                return;
            }

            if (isSubmitting) {
                showToast('جاري إرسال الطلب...', 'info');
                return;
            }

            const name = document.getElementById('userName');
            const phone = document.getElementById('userPhone');
            const adresse = document.getElementById('userAdresse');
            const notes = document.getElementById('userNotes');
            const shops = getShopData();

            const nameVal = name ? cleanInput(name.value) : '';
            const phoneVal = phone ? cleanInput(phone.value) : '';
            const adresseVal = adresse ? cleanInput(adresse.value) : '';
            const notesVal = notes ? cleanInput(notes.value) : '';

            // ✅ التحقق من المدخلات
            if (!nameVal || nameVal.length < 2) {
                showToast('⚠️ اكتب اسمك الكامل', 'warning');
                if (name) name.focus();
                return;
            }
            if (nameVal.length > 50) {
                showToast('⚠️ الاسم طويل جداً (50 حرف كحد أقصى)', 'warning');
                return;
            }
            if (!phoneVal || !validatePhone(phoneVal)) {
                showToast('⚠️ رقم هاتف تونسي صحيح (8 أرقام)', 'warning');
                if (phone) phone.focus();
                return;
            }
            if (!adresseVal || adresseVal.includes('⏳') || adresseVal.includes('جاري')) {
                showToast('⚠️ انتظر تحديد موقعك أو اكتب عنوانك', 'warning');
                if (adresse) adresse.focus();
                return;
            }
            if (adresseVal.length > 200) {
                showToast('⚠️ العنوان طويل جداً', 'warning');
                return;
            }
            if (notesVal.length > 200) {
                showToast('⚠️ الملاحظات طويلة جداً (200 حرف كحد أقصى)', 'warning');
                return;
            }
            if (cart.length === 0) {
                showToast('🥲 السلة فارغة - أضف منتجات', 'warning');
                return;
            }
            if (shops.length === 0) {
                showToast('⚠️ أضف محل واحد على الأقل', 'warning');
                return;
            }

            // ✅ التحقق من الأسعار (منع التلاعب)
            let verifiedSubtotal = 0;
            let orderDetails = '';
            for (let i = 0; i < cart.length; i++) {
                const cartItem = cart[i];
                const officialItem = itemRegistry[cartItem.id];
                
                if (!officialItem) {
                    showToast('⚠️ منتج غير معروف - يرجى تحديث الصفحة', 'error');
                    return;
                }
                
                if (Math.abs(cartItem.unitPrice - officialItem.pricePerUnit) > 0.001) {
                    showToast('⚠️ خطأ في الأسعار - يرجى تحديث الصفحة', 'error');
                    return;
                }
                
                if (cartItem.quantity <= 0 || cartItem.quantity > MAX_CART_QUANTITY) {
                    showToast('⚠️ كمية غير صالحة', 'error');
                    return;
                }

                const verifiedItemTotal = cartItem.quantity * officialItem.pricePerUnit;
                verifiedSubtotal += verifiedItemTotal;
                orderDetails +=
                    `${i+1}. ${officialItem.name} - ${cartItem.quantity} ${officialItem.unit} × ${officialItem.pricePerUnit.toFixed(3)} DT = ${verifiedItemTotal.toFixed(3)} DT\n`;
            }

            const totalAmount = verifiedSubtotal + SERVICE_FEE;

            const orderMessage = `
🛒 طلب توصيل - 9ATHYA.TN
👤 ${sanitizeText(nameVal)}
📞 ${sanitizeText(phoneVal)}
📍 ${sanitizeText(adresseVal)}
📝 ${sanitizeText(notesVal || 'لا يوجد')}
🏪 ${shops.map((s, i) => `${i+1}. ${sanitizeText(s.name)}${s.zone && s.zone !== 'غير محدد' ? ' (' + sanitizeText(s.zone) + ')' : ''}`).join('\n')}
📋 ${orderDetails}
💳 رسوم الشركة: ${SERVICE_FEE.toFixed(3)} DT
🚗 التوصيل: ${DELIVERY_PRICE_PER_KM.toFixed(3)} دت/كم (الحد الأدنى ${MIN_DELIVERY_PRICE.toFixed(3)} DT)
💰 المجموع (بدون التوصيل): ${totalAmount.toFixed(3)} DT
⏰ ${new Date().toLocaleString('ar-TN')}
        `;

            // ✅ تحديث وقت آخر إرسال
            lastSubmitTime = now;

            const submitBtnEl = document.getElementById('submitOrder');
            isSubmitting = true;
            if (submitBtnEl) {
                submitBtnEl.disabled = true;
                submitBtnEl.textContent = '⏳ جاري الإرسال...';
            }

            const formData = new FormData();
            formData.append('name', sanitizeText(nameVal));
            formData.append('phone', sanitizeText(phoneVal));
            formData.append('adresse', sanitizeText(adresseVal));
            formData.append('message', orderMessage);
            formData.append('shops', shops.map(s => 
                sanitizeText(s.name) + (s.zone && s.zone !== 'غير محدد' ? ' (' + sanitizeText(s.zone) + ')' : '')
            ).join(', '));
            formData.append('total', totalAmount.toFixed(3) + ' DT');
            formData.append('notes', sanitizeText(notesVal || 'لا يوجد'));
            formData.append('_captcha', 'false');
            formData.append('_template', 'table');
            formData.append('_subject', '🛒 طلب جديد من ' + sanitizeText(nameVal) + ' - 9ATHYA.TN');

            fetch('https://formsubmit.co/ajax/houssemkessentini77@gmail.com', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('فشل الإرسال - الكود: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                showToast('✅ تم إرسال طلبك بنجاح! سنتصل بك قريباً', 'success');
                cart.length = 0;
                updateCartDisplay();
                if (name) name.value = '';
                if (phone) phone.value = '';
                if (notes) notes.value = '';
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('❌ عذراً، حدث خطأ في الإرسال. حاول مرة أخرى', 'error');
            })
            .finally(() => {
                isSubmitting = false;
                if (submitBtnEl) {
                    submitBtnEl.disabled = false;
                    submitBtnEl.textContent = '📨 تأكيد الطلب';
                }
            });
        });
    }

    // ============================================================
    // INIT
    // ============================================================
    renderMenu();
    updateCartDisplay();

    // ✅ مراقبة تغييرات المتاجر
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('shop-name-input') || 
            e.target.classList.contains('shop-zone-input')) {
            updateCartDisplay();
        }
    });

    console.log('✅ 9ATHYA.TN - يعمل 100%');
    console.log('📧 الإرسال عبر AJAX - بدون فتح صفحة');
    console.log('🤖 AI Assistant يستخدم API آمن في الخادم');
    console.log('🛡️ الحماية: Rate Limit + Input Validation + XSS Protection');

})();
