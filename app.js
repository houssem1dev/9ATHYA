const bookingModal = document.getElementById('bookingModal');
const offerModal = document.getElementById('offerModal');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
const serviceGrid = document.getElementById('serviceGrid');
const feeRate = 0.06;
let selectedCategory = 'all';
let selectedPrice = 45;
let hours = 1;

const serviceData = [
  { category: 'home', name: 'تصليح وتركيب كهرباء منزلية', price: 45, provider: 'وليد بن عمار', place: 'المنزه، تونس', tag: 'متاح اليوم', accent: 'orange' },
  { category: 'home', name: 'سباكة وسحب الماء', price: 35, provider: 'فراس الحامدي', place: 'سليانة', tag: 'سريع جدًا', accent: 'red' },
  { category: 'digital', name: 'تصميم logo وهوية بصرية', price: 80, provider: 'سارة القروي', place: 'عن بعد', tag: 'اختيار 9ATHYA', accent: 'blue' },
  { category: 'digital', name: 'تسويق رقمي وSEO', price: 120, provider: 'يوسف المولدي', place: 'سوسة', tag: 'نتيجة مضمونة', accent: 'green' },
  { category: 'learn', name: 'دروس انجليزية conversation', price: 25, provider: 'نسرين العياري', place: 'المرسى، تونس', tag: 'متاح هذا الأسبوع', accent: 'green' },
  { category: 'learn', name: 'دروس فيزياء ورياضيات', price: 30, provider: 'إياد بوشوشة', place: 'تونس العاصمة', tag: 'أستاذ مميز', accent: 'yellow' },
  { category: 'events', name: 'تصوير مناسبات واحتفالات', price: 150, provider: 'مالك فوتو', place: 'سيدي بوسعيد', tag: 'باقي 2 مواعيد', accent: 'purple' },
  { category: 'events', name: 'تنسيق حفلات ومناسبات', price: 200, provider: 'سامي ونجوم', place: 'تونس', tag: 'الخدمة الأكثر طلبا', accent: 'pink' },
  { category: 'transport', name: 'نقل أثاث داخل المدن', price: 70, provider: 'سليم النوري', place: 'أريانة', tag: 'مخصص للأعمال', accent: 'orange' },
  { category: 'beauty', name: 'تجميل ومكياج حفل', price: 90, provider: 'هدى اللطيف', place: 'بن عروس', tag: 'مستوى فخم', accent: 'pink' },
  { category: 'beauty', name: 'تصفيف شعر ولبس', price: 40, provider: 'رغدة المان', place: 'المنستير', tag: 'سريع ومريح', accent: 'blue' },
  { category: 'wellness', name: 'تمارين شخصية ودايت', price: 55, provider: 'آية القيس', place: 'تونس', tag: 'مقترح صحي', accent: 'green' },
  { category: 'wellness', name: 'علاج تدليك وراحة', price: 65, provider: 'سارة عبد الله', place: 'سوسة', tag: 'استرخاء كامل', accent: 'yellow' },
  { category: 'repair', name: 'إصلاح أجهزات منزلية', price: 50, provider: 'خالد الجبالي', place: 'تونس', tag: 'حرفي موثوق', accent: 'orange' },
  { category: 'repair', name: 'نجارة وترميم أثاث', price: 75, provider: 'حسن الباوي', place: 'الكاف', tag: 'ترميم احترافي', accent: 'purple' }
];

function getCategoryLabel(category) {
  const map = {
    all: 'الكل',
    home: 'الدار',
    digital: 'ديجيتال',
    learn: 'دروس',
    events: 'مناسبات',
    transport: 'نقل',
    beauty: 'تجميل',
    wellness: 'صحة',
    repair: 'حرفي'
  };
  return map[category] || 'أخرى';
}

function getCategoryFromName(name) {
  const lower = name.toLowerCase();
  if (/(تصليح|سباكة|نجار|دهان|تركيب|خدمة المنزل|رجل|مقاول|منزل|دار|حرفي|إصلاح)/.test(lower)) return 'home';
  if (/(تصميم|logo|seo|تسويق|ويب|برمجة|تطبيق|ديجيتال|market|marketing|site|ui|ux)/.test(lower)) return 'digital';
  if (/(دروس|تعليم|رياضيات|فيزياء|انجليزي|محاضرة|مدرس|معلّم|تعلم)/.test(lower)) return 'learn';
  if (/(حفلة|مناسبة|تصوير|تصوير|عرض|فرح|زفاف|بلوك|ديكور|مشهد)/.test(lower)) return 'events';
  if (/(نقل|شحن|توصيل|تجهيز|مركبة|سيارة|أثاث)/.test(lower)) return 'transport';
  if (/(تجميل|مكياج|تصفيف|شعر|بشر|تزيين|جلدية|حلاقة)/.test(lower)) return 'beauty';
  if (/(تمارين|دايت|تدليك|علاج|صحة|تغذية|عناية|مقعدة|تأهيل|استرخاء)/.test(lower)) return 'wellness';
  if (/(إصلاح|ترميم|نجارة|أجهزة|مراوح|ثلاجة|غسالة|فني|خدمة)/.test(lower)) return 'repair';
  return 'digital';
}

function renderServiceCard(service) {
  return `
    <article class="service-card" data-category="${service.category}" data-name="${service.name}" data-price="${service.price}" data-provider="${service.provider}" data-place="${service.place}">
      <div class="service-photo photo-${service.accent}"><span>${service.tag}</span><button class="save-btn" aria-label="حفظ الخدمة">♡</button></div>
      <div class="service-content">
        <div class="provider-line"><span class="provider-avatar ${service.accent}">${service.provider.charAt(0)}</span><span>${service.provider} <b>✓</b></span><small>${service.place}</small></div>
        <h3>${service.name}</h3>
        <div class="rating"><strong>★ 4.9</strong><span>(مراجعات)</span><strong class="price">من ${service.price} د.ت</strong></div>
      </div>
    </article>
  `;
}

function renderServices() {
  const term = searchInput.value.trim().toLowerCase();
  const visibleServices = serviceData.filter((service) => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    const matchesSearch = !term || service.name.toLowerCase().includes(term) || service.provider.toLowerCase().includes(term) || service.place.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  serviceGrid.innerHTML = visibleServices.map(renderServiceCard).join('');
  emptyState.hidden = visibleServices.length > 0;

  const totalButton = document.querySelector('[data-category="all"] small');
  if (totalButton) totalButton.textContent = String(serviceData.length);
}

function openModal(modal) {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModals() {
  document.querySelectorAll('.modal-backdrop').forEach((modal) => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  });
}

document.querySelectorAll('[data-open-offer]').forEach((button) => {
  button.addEventListener('click', () => openModal(offerModal));
});

document.querySelectorAll('[data-close-modal]').forEach((button) => {
  button.addEventListener('click', closeModals);
});

document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeModals();
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModals();
});

serviceGrid.addEventListener('click', (event) => {
  const saveButton = event.target.closest('.save-btn');
  if (saveButton) {
    saveButton.textContent = saveButton.textContent === '♡' ? '♥' : '♡';
    saveButton.style.color = saveButton.textContent === '♥' ? '#ff8b53' : '#fff';
    return;
  }

  const card = event.target.closest('.service-card');
  if (!card) return;

  selectedPrice = Number(card.dataset.price);
  hours = 1;
  document.getElementById('modalTitle').textContent = card.dataset.name;
  document.getElementById('modalProvider').textContent = `مع ${card.dataset.provider} · ${card.dataset.place}`;
  updateBookingTotal();
  openModal(bookingModal);
});

function updateBookingTotal() {
  const serviceCost = selectedPrice * hours;
  const fee = serviceCost * feeRate;
  document.getElementById('hoursValue').textContent = hours;
  document.getElementById('serviceCost').textContent = `${serviceCost.toFixed(2)} د.ت`;
  document.getElementById('feeCost').textContent = `${fee.toFixed(2)} د.ت`;
  document.getElementById('totalCost').textContent = `${(serviceCost + fee).toFixed(2)} د.ت`;
}

document.getElementById('increaseHours').addEventListener('click', () => {
  hours = Math.min(12, hours + 1);
  updateBookingTotal();
});

document.getElementById('decreaseHours').addEventListener('click', () => {
  hours = Math.max(1, hours - 1);
  updateBookingTotal();
});

document.getElementById('confirmBooking').addEventListener('click', () => {
  const button = document.getElementById('confirmBooking');
  button.innerHTML = 'وصلنا الطلب ✓';
  setTimeout(closeModals, 900);
  setTimeout(() => {
    button.innerHTML = 'ابعث الطلب <span>←</span>';
  }, 1000);
});

document.getElementById('submitOffer').addEventListener('click', async () => {
  const name = document.getElementById('offerName').value.trim();
  const email = document.getElementById('offerEmail').value.trim();
  const price = document.getElementById('offerPrice').value.trim();
  const message = document.getElementById('offerMessage').value.trim();

  if (!name || !email) {
    if (!name) document.getElementById('offerName').focus();
    else document.getElementById('offerEmail').focus();
    return;
  }

  const submitButton = document.getElementById('submitOffer');
  submitButton.disabled = true;
  submitButton.innerHTML = 'يتم الإرسال...';

  const newService = {
    category: getCategoryFromName(name),
    name,
    price: Number(price) || 50,
    provider: name.split(' ')[0] || 'مستقل',
    place: 'تونس',
    tag: 'خدمة جديدة',
    accent: 'orange'
  };

  const payload = {
    name,
    email,
    price: price || 'غير محدد',
    message: message || 'لا توجد رسالة إضافية.',
    page: window.location.href,
    referrer: document.referrer || 'direct',
    userAgent: navigator.userAgent,
    sentAt: new Date().toISOString(),
    _subject: 'طلب خدمة جديد من 9ATHYA',
    _captcha: 'false'
  };

  try {
    const response = await fetch('https://formsubmit.co/ajax/HOUSSEMKESSENTINI77@GMAIL.COM', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('HTTP error');
    }

    serviceData.unshift(newService);
    renderServices();

    submitButton.innerHTML = 'تم إرسال طلبك ✓';
    document.getElementById('offerName').value = '';
    document.getElementById('offerEmail').value = '';
    document.getElementById('offerPrice').value = '';
    document.getElementById('offerMessage').value = '';
    setTimeout(closeModals, 1100);
  } catch (error) {
    submitButton.innerHTML = 'فشل الإرسال — جرّب مرة أخرى';
    console.error('Form submission failed:', error);
  } finally {
    setTimeout(() => {
      submitButton.disabled = false;
      submitButton.innerHTML = 'انشر خدمتك <span>↗</span>';
    }, 1200);
  }
});

function filterServices() {
  renderServices();
}

document.querySelectorAll('.category').forEach((button) => {
  button.addEventListener('click', () => {
    selectedCategory = button.dataset.category;
    document.querySelectorAll('.category').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    renderServices();
  });
});

searchInput.addEventListener('input', filterServices);
document.getElementById('filterToggle').addEventListener('click', () => {
  searchInput.focus();
});

const allServicesButton = document.querySelector('.all-services');
if (allServicesButton) {
  allServicesButton.addEventListener('click', () => {
    selectedCategory = 'all';
    searchInput.value = '';
    document.querySelectorAll('.category').forEach((item) => item.classList.remove('active'));
    const allBtn = document.querySelector('[data-category="all"]');
    if (allBtn) allBtn.classList.add('active');
    renderServices();
  });
}

renderServices();

