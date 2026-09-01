const bookingModal = document.getElementById('bookingModal');
const offerModal = document.getElementById('offerModal');
const accountModal = document.getElementById('accountModal');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
const serviceGrid = document.getElementById('serviceGrid');
const profitRate = 0.12;
let selectedCategory = 'all';
let selectedPrice = 45;
let hours = 0;
let selectedService = null;
let pendingOrder = false;
let submittingOrder = false;
let currentUser = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
}

function getSavedUser() {
  return currentUser;
}

const serviceData = [
  { category: 'vegetables', name: 'بطاطا بالكيلو', price: 2.8, provider: 'سوق الحومة', place: 'ساقية الزيت', tag: 'متوفر اليوم', accent: 'orange', visual: '🥔', unit: 'كيلو', details: 'بطاطا بيضاء للطبخ، مغسولة ومختارة حبة بحبة.', options: [{ label: 'الحجم', values: ['صغيرة', 'متوسطة', 'كبيرة'] }] },
  { category: 'vegetables', name: 'تفاح بالكيلو', price: 7, provider: 'غلة الحومة', place: 'صفاقس المدينة', tag: 'طازج اليوم', accent: 'red', visual: '🍎', unit: 'كيلو', details: 'تفاح أحمر مقرمش، مناسب للفطور والعصير.', options: [{ label: 'درجة النضج', values: ['مقرمش', 'عادي', 'طري'] }] },
  { category: 'vegetables', name: 'بنان بالكيلو', price: 6, provider: 'غلة الحومة', place: 'صفاقس المدينة', tag: 'طازج اليوم', accent: 'yellow', visual: '🍌', unit: 'كيلو', details: 'بنان حلو، يتسلّم أخضر شوية أو مستوي حسب اختيارك.', options: [{ label: 'النضج', values: ['أخضر شوية', 'مستوي'] }] },
  { category: 'vegetables', name: 'طماطم للسلطة بالكيلو', price: 5, provider: 'خضرة الحومة', place: 'قرمدة، صفاقس', tag: 'قطف اليوم', accent: 'pink', visual: '🍅', unit: 'كيلو', details: 'طماطم حمراء للسلطة والشكشوكة، قطف صباحي.', options: [{ label: 'الاختيار', values: ['لينة للسلطة', 'صلبة للطبخ'] }] },
  { category: 'chicken', name: 'دجاج عربي منظف', price: 16, provider: 'دجاجة الدار', place: 'الربض، صفاقس', tag: 'طازج اليوم', accent: 'yellow', visual: '🍗', unit: 'دجاجة', details: 'دجاج عربي منظف ومفرّغ، الوزن التقريبي بين 1 و1.3 كلغ.', options: [{ label: 'التقطيع', values: ['كامل', 'مقطّع 8 قطع', 'صدر فقط'] }] },
  { category: 'chicken', name: 'بيض بلدي · 12 حبة', price: 8, provider: 'فلاح الحومة', place: 'العين، صفاقس', tag: 'من عند الفلاح', accent: 'red', visual: '🥚', unit: 'طبق', details: '12 بيضة بلدية طازجة، مجمّعة هذا الصباح.', options: [{ label: 'الحجم', values: ['متوسط', 'كبير'] }] },
  { category: 'groceries', name: 'زيت زيتون من الدار', price: 28, provider: 'دار الزيتونة', place: 'قرمدة، صفاقس', tag: 'موسم جديد', accent: 'gold', visual: '🫒', unit: 'لتر', details: 'زيت زيتون بكر ممتاز، معبّى في قارورة 1 لتر.', options: [{ label: 'الحجم', values: ['1 لتر', '2 لتر', '5 لتر'] }] },
  { category: 'groceries', name: 'قفة مواد أساسية', price: 42, provider: 'قفة صفاقسية', place: 'طينة، صفاقس', tag: 'اختار محتواها', accent: 'blue', visual: '🛒', unit: 'قفة', details: 'إنت تختار محتوى القفة: المواد الأساسية والكمية حسب حاجتك.', priceByValue: { 'صغيرة': 32, 'عائلية': 42 }, options: [{ label: 'حجم القفة', values: ['صغيرة', 'عائلية'] }, { label: 'المحتوى', type: 'checks', values: ['مقرونة', 'كسكسي', 'سكر', 'قهوة', 'طماطم مصبّرة', 'زيت نباتي'] }] },
  { category: 'bakery', name: 'خبز طابونة سخون', price: 3, provider: 'فرن الحومة', place: 'باب الجبلي، صفاقس', tag: 'سخون توا', accent: 'orange', visual: '🥖', unit: 'خبزة', details: 'خبز طابونة يخرج سخون، مناسب للدار والفطور.', options: [{ label: 'التحضير', values: ['عادي', 'بالزيتون'] }] },
  { category: 'bakery', name: 'كسكروت تونسي', price: 8, profit: 2, provider: 'مذاق الدار', place: 'ساقية الداير', tag: 'اختار حشوتك', accent: 'pink', visual: '🥪', unit: 'كسكروت', details: 'خبز طابونة مع هريسة وسلطة، وإنت تختار الحشو والإضافات.', priceAdditions: { 'سلامي': 2, 'بيض': 0.8, 'دجاج': 3, 'مرقاز': 2.5, 'تون': 1.5, 'جبن': 1, 'بطاطا': 0.5, 'زيتون': 0.5, 'سلطة مشوية': 1 }, options: [{ label: 'الحشو', values: ['سلامي', 'بيض', 'دجاج', 'مرقاز', 'تون', 'اختيار آخر'] }, { label: 'الحرارة', values: ['عادي', 'حار'] }, { label: 'إضافات', values: ['من غير زيادة', 'جبن', 'بطاطا', 'زيتون', 'سلطة مشوية'] }] },
  { category: 'bakery', name: 'ملاوي', price: 6, profit: 1.5, provider: 'مذاق الدار', place: 'ساقية الداير', tag: 'اختار حشوتك', accent: 'pink', visual: '🫓', unit: 'ملاوي', details: 'ملاوي مورّق يتحضّر وقت الطلب، مع اختيار الحجم والحشو.', priceAdditions: { 'Double': 2, 'سلامي': 2, 'بيض': 0.8, 'دجاج': 3, 'مرقاز': 2.5, 'جبن': 1, 'تون': 1.5, 'بطاطا': 0.5, 'زيتون': 0.5, 'هريسة': 0.3 }, options: [{ label: 'الحجم', values: ['Normal', 'Double'] }, { label: 'الحشو', values: ['سلامي', 'بيض', 'دجاج', 'مرقاز', 'تون', 'جبن', 'اختيار آخر'] }, { label: 'الحرارة', values: ['عادي', 'حار'] }, { label: 'إضافات', values: ['من غير زيادة', 'بطاطا', 'زيتون', 'هريسة'] }] },
  { category: 'cleaning', name: 'سلة مواد تنظيف', price: 24, provider: 'دار نظيفة', place: 'المدينة، صفاقس', tag: 'عرض الحومة', accent: 'blue', visual: '🧼', unit: 'سلة', details: 'جافال، سائل أواني، مسحوق غسيل، منظف أرضية وإسفنجة.', options: [{ label: 'الرائحة', values: ['ليمون', 'لافندر', 'من غير عطر'] }] },
  { category: 'cleaning', name: 'صابون بلدي طبيعي', price: 7, provider: 'صنعة صفاقسية', place: 'حي البحري', tag: 'طبيعي 100%', accent: 'green', visual: '🧴', unit: 'قطعة', details: 'صابون بلدي بزيت الزيتون، مناسب لليدين والدار.', options: [{ label: 'العدد', values: ['قطعة واحدة', '3 قطع'] }] },
  { category: 'home', name: 'ماء معدني · 6 قوارير', price: 6, provider: 'قريب للدار', place: 'الحنشة، صفاقس', tag: 'يوصل للباب', accent: 'purple', visual: '💧', unit: 'باكو', details: 'باكو فيه 6 قوارير ماء معدني، 1.5 لتر للقارورة.', options: [{ label: 'العدد', values: ['باكو واحد', 'زوج باكات'] }] },
  { category: 'home', name: 'فحم وحطب للدار', price: 12, provider: 'حاجات الحومة', place: 'المحرس، صفاقس', tag: 'متوفر', accent: 'red', visual: '🪵', unit: 'كيس', details: 'فحم نظيف للشواء مع شوية حطب للإشعال، كيس متوسط.', options: [{ label: 'النوع', values: ['فحم فقط', 'فحم وحطب'] }] }
];

function getCategoryLabel(category) {
  const map = {
    all: 'الكل',
    home: 'حاجات الدار',
    vegetables: 'خضرة',
    chicken: 'دجاج وبيض',
    groceries: 'مواد غذائية',
    bakery: 'خبز ومخبوزات',
    cleaning: 'مواد تنظيف'
  };
  return map[category] || 'أخرى';
}

function getCategoryFromName(name) {
  const lower = name.toLowerCase();
  if (/(خضرة|بطاطا|بصل|طماطم|فلفل|سلطة)/.test(lower)) return 'vegetables';
  if (/(دجاج|بيض|لحم|كبدة)/.test(lower)) return 'chicken';
  if (/(خبز|ملاوي|كسكروت|مخبوز)/.test(lower)) return 'bakery';
  if (/(تنظيف|صابون|جافال|منظف)/.test(lower)) return 'cleaning';
  if (/(زيت|قفة|مواد غذائية|سكر|فارينة|مقرونة)/.test(lower)) return 'groceries';
  return 'home';
}

function renderServiceCard(service) {
  return `
    <article class="service-card" data-category="${escapeHtml(service.category)}" data-name="${escapeHtml(service.name)}" data-price="${Number(service.price)}" data-provider="${escapeHtml(service.provider)}" data-place="${escapeHtml(service.place)}">
      <div class="service-photo photo-${escapeHtml(service.accent)}"><span class="product-visual" aria-hidden="true">${escapeHtml(service.visual)}</span><span>${escapeHtml(service.tag)}</span><button class="save-btn" aria-label="حفظ الحاجة">♡</button></div>
      <div class="service-content">
        <div class="provider-line"><span class="provider-avatar ${escapeHtml(service.accent)}">${escapeHtml(service.provider.charAt(0))}</span><span>${escapeHtml(service.provider)} <b>✓</b></span><small>${escapeHtml(service.place)}</small></div>
        <h3>${escapeHtml(service.name)}</h3>
        <p class="service-detail">${escapeHtml(service.details)}</p>
        <div class="rating"><strong>★ 4.9</strong><span>${escapeHtml(service.unit || 'بالقطعة')}</span><strong class="price">السوم بعد تحديد الكمية</strong></div>
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

document.querySelectorAll('[data-open-account]').forEach((button) => {
  button.addEventListener('click', () => openModal(accountModal));
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

  selectedService = serviceData.find((service) => service.name === card.dataset.name);
  selectedPrice = selectedService.price;
  hours = 0;
  document.getElementById('modalTitle').textContent = card.dataset.name;
  document.getElementById('modalProvider').textContent = `مع ${card.dataset.provider} · ${card.dataset.place}`;
  document.getElementById('quantityLabel').textContent = `قدّاش تحب؟ (${selectedService.unit || 'بالقطعة'})`;
  document.getElementById('productDetails').textContent = selectedService.details;
  const savedUser = getSavedUser();
  document.getElementById('deliveryAddress').value = savedUser?.area || '';
  document.getElementById('productOptions').innerHTML = (selectedService.options || []).map((option, index) => option.type === 'checks' ? `
    <fieldset class="option-checks"><legend>${option.label}</legend>${option.values.map((value) => `<label><input type="checkbox" data-option-label="${option.label}" value="${value}">${value}</label>`).join('')}</fieldset>
  ` : `
    <label>${option.label}<select data-option-label="${option.label}" data-option-index="${index}">${option.values.map((value) => `<option value="${value}">${value}</option>`).join('')}</select></label>
  `).join('');
  document.getElementById('productOptions').addEventListener('change', () => {
    const pricedOption = [...document.querySelectorAll('#productOptions select')].find((select) => selectedService.priceByValue?.[select.value]);
    selectedPrice = selectedService.priceByValue?.[pricedOption?.value] || selectedService.price;
    updateBookingTotal();
  });
  updateBookingTotal();
  openModal(bookingModal);
});

function updateBookingTotal() {
  document.getElementById('confirmBooking').disabled = hours === 0;

  if (hours === 0) {
    document.getElementById('hoursValue').textContent = '—';
    document.getElementById('serviceCost').textContent = 'حدّد الكمية';
    document.getElementById('feeCost').textContent = '—';
    document.getElementById('totalCost').textContent = 'بعد تحديد الكمية';
    return;
  }

  const optionAdditions = [...document.querySelectorAll('#productOptions select')].reduce((total, select) => total + (selectedService?.priceAdditions?.[select.value] || 0), 0);
  const serviceCost = (selectedPrice + optionAdditions) * hours;
  const profit = serviceCost * profitRate;
  document.getElementById('hoursValue').textContent = hours;
  document.getElementById('serviceCost').textContent = `${serviceCost.toFixed(2)} د.ت`;
  document.getElementById('feeCost').textContent = `${profit.toFixed(2)} د.ت`;
  document.getElementById('totalCost').textContent = `${(serviceCost + profit).toFixed(2)} د.ت`;
}

document.getElementById('increaseHours').addEventListener('click', () => {
  hours = Math.min(12, hours + 1);
  updateBookingTotal();
});

document.getElementById('decreaseHours').addEventListener('click', () => {
  hours = Math.max(0, hours - 1);
  updateBookingTotal();
});

document.getElementById('confirmBooking').addEventListener('click', async () => {
  const button = document.getElementById('confirmBooking');
  if (submittingOrder) return;
  const user = getSavedUser();
  if (!user?.phone) {
    pendingOrder = true;
    closeModals();
    openModal(accountModal);
    document.getElementById('accountPhone').focus();
    return;
  }
  const note = document.getElementById('orderNote').value.trim();
  const deliveryMethod = 'توصيل للدار';
  const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
  if (!deliveryAddress) {
    document.getElementById('deliveryAddress').focus();
    return;
  }
  submittingOrder = true;
  button.disabled = true;
  button.innerHTML = 'يتم الإرسال...';

  try {
    const details = Object.fromEntries([...document.querySelectorAll('#productOptions select, #productOptions input[type="checkbox"]:checked')].map((input) => [input.dataset.optionLabel, input.value]));
    const optionAdditions = [...document.querySelectorAll('#productOptions select')].reduce((total, select) => total + (selectedService?.priceAdditions?.[select.value] || 0), 0);
    const subtotal = (selectedPrice + optionAdditions) * hours;
    const response = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ productName: selectedService.name, quantity: hours, unit: selectedService.unit || 'قطعة', details, deliveryAddress, note, subtotal })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || 'ما نجّمش نثبت الطلب توا.');
    }
    button.innerHTML = 'وصلنا الطلب ✓';
    setTimeout(closeModals, 900);
  } catch (error) {
    button.disabled = false;
    button.innerHTML = error.message || 'فشل الإرسال — جرّب مرة أخرى';
    console.error('Order submission failed:', error);
    submittingOrder = false;
  }
});

document.getElementById('submitAccount').addEventListener('click', async () => {
  const password = document.getElementById('accountPassword').value;
  const user = {
    name: document.getElementById('accountName').value.trim().slice(0, 100),
    email: document.getElementById('accountEmail').value.trim().slice(0, 160),
    phone: document.getElementById('accountPhone').value.trim().slice(0, 20),
    area: document.getElementById('accountArea').value.trim().slice(0, 160)
  };

  const validPhone = /^(?:\+216)?[2459]\d{7}$/.test(user.phone.replace(/[\s-]/g, ''));
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email);
  if (!user.name || !validEmail || !validPhone || password.length < 8 || password.length > 128) {
    if (!user.name) document.getElementById('accountName').focus();
    else if (!user.email) document.getElementById('accountEmail').focus();
    else if (!validPhone) document.getElementById('accountPhone').focus();
    else document.getElementById('accountPassword').focus();
    return;
  }

  const button = document.getElementById('submitAccount');
  button.disabled = true;
  button.innerHTML = 'يتم التسجيل...';

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ ...user, password })
    });

    if (!response.ok) throw new Error('HTTP error');
    currentUser = await response.json();
    button.innerHTML = 'الحساب حاضر ✓';
    setTimeout(() => {
      closeModals();
      if (pendingOrder) {
        pendingOrder = false;
        openModal(bookingModal);
      }
    }, 900);
  } catch (error) {
    button.innerHTML = error.message || 'فشل التسجيل — جرّب مرة أخرى';
    console.error('Account registration failed:', error);
  } finally {
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = 'نعمل حساب <span>↗</span>';
    }, 1200);
  }
});

document.getElementById('googleAccount').addEventListener('click', () => {
  const message = document.getElementById('accountMessage');
  message.textContent = 'زر Google حاضر. يلزم إعداد Google Client ID باش يتفعل الدخول الحقيقي.';
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
    price: Math.min(10000, Math.max(0.1, Number(price) || 50)),
    provider: name.split(' ')[0] || 'مستقل',
    place: 'صفاقس',
    tag: 'حاجة جديدة',
    accent: 'orange',
    visual: '📦',
    unit: 'حاجة',
    details: message || 'حاجة منزلية متوفرة للتوصيل داخل صفاقس.'
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
    _subject: 'حاجة جديدة على 9ATHYA',
    _captcha: 'false'
  };

  try {
    const response = await fetch(emailEndpoint, {
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

    submitButton.innerHTML = 'تمت إضافة الحاجة ✓';
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
      submitButton.innerHTML = 'زِد الحاجة <span>↗</span>';
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

fetch('/api/me', { credentials: 'same-origin' })
  .then((response) => response.ok ? response.json() : null)
  .then((user) => {
    currentUser = user;
    if (user) {
      document.getElementById('accountName').value = user.name || '';
      document.getElementById('accountEmail').value = user.email || '';
      document.getElementById('accountPhone').value = user.phone || '';
      document.getElementById('accountArea').value = user.area || '';
    }
  })
  .catch(() => { currentUser = null; });

renderServices();

