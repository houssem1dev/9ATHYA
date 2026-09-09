// ============================================================
// DATA
// ============================================================
const products = {
    vegetables: [
        { id: 'v1', name: 'طماطم', price: 2.500, unit: 'كغ', emoji: '🍅' },
        { id: 'v2', name: 'فلفل', price: 3.500, unit: 'كغ', emoji: '🌶️' },
        { id: 'v3', name: 'بصل', price: 1.500, unit: 'كغ', emoji: '🧅' },
        { id: 'v4', name: 'بطاطا', price: 2.200, unit: 'كغ', emoji: '🥔' },
        { id: 'v5', name: 'جزر', price: 2.200, unit: 'كغ', emoji: '🥕' },
        { id: 'v6', name: 'خس', price: 5.200, unit: 'رأس', emoji: '🥬' },
        { id: 'v7', name: 'قرع', price: 3.000, unit: 'كغ', emoji: '🎃' },
        { id: 'v8', name: 'فقوس', price: 3.800, unit: 'كغ', emoji: '🥒' },
    ],
    fruits: [
        { id: 'f1', name: 'تفاح', price: 6.250, unit: 'كغ', emoji: '🍎' },
        { id: 'f2', name: 'موز', price: 15.000, unit: 'كغ', emoji: '🍌' },
        { id: 'f3', name: 'برتقال', price: 2.700, unit: 'كغ', emoji: '🍊' },
        { id: 'f4', name: 'ليمون', price: 5.200, unit: 'كغ', emoji: '🍋' },
        { id: 'f5', name: 'بطيخ', price: 2.500, unit: 'كغ', emoji: '🍉' },
        { id: 'f6', name: 'دلاع', price: 2.900, unit: 'كغ', emoji: '🍉' },
    ],
    staples: [
        { id: 's1', name: 'زيت زيتون', price: 14.500, unit: 'لتر', emoji: '🫒' },
        { id: 's2', name: 'سكر', price: 2.900, unit: 'كغ', emoji: '🧂' },
        { id: 's3', name: 'سميدة', price: 0.850, unit: 'كغ', emoji: '🌾' },
        { id: 's4', name: 'حليب', price: 1.300, unit: 'لتر', emoji: '🥛' },
        { id: 's5', name: 'رز', price: 4.200, unit: 'كغ', emoji: '🍚' },
        { id: 's6', name: 'قهوة', price: 11.500, unit: 'كغ', emoji: '☕' },
        { id: 's7', name: 'دقيق', price: 0.900, unit: 'كغ', emoji: '🌾' },
    ],
    grains: [
        { id: 'g1', name: 'عدس', price: 4.800, unit: 'كغ', emoji: '🫘' },
        { id: 'g2', name: 'حمص', price: 5.200, unit: 'كغ', emoji: '🫛' },
        { id: 'g3', name: 'لوبيا', price: 8.000, unit: 'كغ', emoji: '🫘' },
    ],
    meat: [
        { id: 'm1', name: 'لحم مفروم', price: 19.000, unit: 'كغ', emoji: '🥩' },
        { id: 'm2', name: 'دجاج فيليه', price: 17.500, unit: 'كغ', emoji: '🍗' },
        { id: 'm3', name: 'تونة', price: 8.000, unit: 'علبة', emoji: '🐟' },
        { id: 'm4', name: 'سردين', price: 7.000, unit: 'كغ', emoji: '🐟' },
        { id: 'm5', name: 'لحم بقري', price: 43.000, unit: 'كغ', emoji: '🥩' },
    ],
    dairy: [
        { id: 'd1', name: 'بيض (12)', price: 4.750, unit: 'طبق', emoji: '🥚' },
        { id: 'd2', name: 'جبن', price: 37.330, unit: 'كغ', emoji: '🧀' },
        { id: 'd3', name: 'زبدة', price: 6.000, unit: 'قطعة', emoji: '🧈' },
        { id: 'd4', name: 'لبن', price: 1.200, unit: 'لتر', emoji: '🥛' },
        { id: 'd5', name: 'ياغورت', price: 0.800, unit: 'حبة', emoji: '🍶' },
    ],
    conserves: [
        { id: 'c1', name: 'طماطم مصبرة', price: 5.000, unit: 'علبة', emoji: '🥫' },
        { id: 'c2', name: 'زيت قلي', price: 8.000, unit: 'لتر', emoji: '🛢️' },
        { id: 'c3', name: 'مايونيز', price: 4.200, unit: 'علبة', emoji: '🥄' },
        { id: 'c4', name: 'كاتشب', price: 3.800, unit: 'علبة', emoji: '🍅' },
    ]
};

// ============================================================
// STATE
// ============================================================
let cart = [];
let currentCategory = 'all';

// ============================================================
// RENDER PRODUCTS
// ============================================================
function renderProducts(category) {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '';

    let items = [];
    if (category === 'all') {
        Object.values(products).forEach(arr => items = items.concat(arr));
    } else {
        items = products[category] || [];
    }

    if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:30px;color:#999;">لا توجد منتجات في هذا القسم</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'products-grid';

    items.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';

        card.innerHTML = `
            <div class="product-image">${p.emoji}</div>
            <div class="product-name">${p.name}</div>
            <div class="product-price">${p.price.toFixed(3)} <span class="product-unit">DT/${p.unit}</span></div>
            <input type="number" class="qty-input" value="1" min="0.1" step="0.1" max="100">
            <button class="add-btn" data-id="${p.id}">🛒 أضف للسلة</button>
        `;

        grid.appendChild(card);
    });

    container.appendChild(grid);

    // Add event listeners
    container.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const card = this.closest('.product-card');
            const qtyInput = card.querySelector('.qty-input');
            const qty = parseFloat(qtyInput.value) || 1;

            let product = null;
            Object.values(products).forEach(arr => {
                const found = arr.find(p => p.id === id);
                if (found) product = found;
            });

            if (!product || qty <= 0) return;

            // Check if product already in cart
            const existing = cart.find(item => item.id === id);
            if (existing) {
                existing.quantity += qty;
                existing.total = existing.quantity * existing.price;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    emoji: product.emoji,
                    unit: product.unit,
                    price: product.price,
                    quantity: qty,
                    total: qty * product.price
                });
            }

            renderCart();
            showToast(`✅ تم إضافة ${product.name}`);
        });
    });
}

// ============================================================
// RENDER CART
// ============================================================
function renderCart() {
    const list = document.getElementById('cartList');
    const count = document.getElementById('cartCount');
    const totalEl = document.getElementById('totalPrice');

    if (cart.length === 0) {
        list.innerHTML = '<li class="empty-cart">🛒 السلة فارغة</li>';
        count.textContent = '0';
        totalEl.textContent = '0.000';
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.total;
        html += `
            <li>
                <span>${item.emoji} ${item.name} <span style="color:#999;font-size:0.85rem;">(${item.quantity} ${item.unit})</span></span>
                <span>
                    ${item.total.toFixed(3)} DT
                    <button class="remove-item" data-index="${index}">×</button>
                </span>
            </li>
        `;
    });

    list.innerHTML = html;
    count.textContent = cart.length;
    totalEl.textContent = total.toFixed(3);

    // Remove buttons
    list.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            cart.splice(index, 1);
            renderCart();
            showToast('🗑️ تم حذف المنتج');
        });
    });
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 25px;
        border-radius: 10px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ============================================================
// TABS
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentCategory = this.dataset.cat;
        renderProducts(currentCategory);
    });
});

// ============================================================
// ORDER BUTTON
// ============================================================
document.getElementById('orderBtn').addEventListener('click', function() {
    if (cart.length === 0) {
        showToast('⚠️ السلة فارغة! أضف منتجات أولاً.');
        return;
    }

    let msg = '🛒 طلب جديد - 9ATHYA.TN\n' + '='.repeat(30) + '\n\n';
    let total = 0;

    cart.forEach((item, i) => {
        msg += `${i+1}. ${item.emoji} ${item.name}\n`;
        msg += `   ${item.quantity} ${item.unit} × ${item.price.toFixed(3)} = ${item.total.toFixed(3)} DT\n\n`;
        total += item.total;
    });

    msg += '='.repeat(30) + '\n';
    msg += `💰 المجموع الكلي: ${total.toFixed(3)} DT\n`;
    msg += `📦 عدد المنتجات: ${cart.length}\n`;
    msg += `⏰ ${new Date().toLocaleString('ar-TN')}`;

    // Show order summary
    alert('✅ تم إرسال طلبك!\n\n' + msg);

    // Clear cart
    cart = [];
    renderCart();
    showToast('📨 تم إرسال الطلب بنجاح!');
});

// ============================================================
// ADD TOAST STYLES
// ============================================================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
document.head.appendChild(style);

// ============================================================
// INIT
// ============================================================
renderProducts('all');
renderCart();

console.log('✅ 9ATHYA.TN - شغالة 100%');
console.log(`📦 ${Object.values(products).flat().length} منتج متوفر`);
