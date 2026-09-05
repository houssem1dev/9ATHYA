<?php
// ============================================================
// index.php - المدخل الرئيسي للتطبيق
// ============================================================

// تعريف ثابت الأمان
define('ALLOW_ACCESS', true);

// ============================================================
// 1. تضمين الملفات المطلوبة
// ============================================================
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/includes/security.php';
require_once __DIR__ . '/includes/functions.php';

// ============================================================
// 2. بدء الجلسة
// ============================================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ============================================================
// 3. إعدادات الأمان الإضافية
// ============================================================
// منع Clickjacking
preventClickjacking();

// منع التخزين المؤقت
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// ============================================================
// 4. معالجة الطلبات
// ============================================================
$response = handleRequest();
if ($response) {
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}

// ============================================================
// 5. عرض التطبيق
// ============================================================
?>
<!DOCTYPE html>
<html lang="ar-TN" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    
    <!-- ===== رؤوس الأمان ===== -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://formsubmit.co https://nominatim.openstreetmap.org; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://formsubmit.co https://nominatim.openstreetmap.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self';">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
    
    <title>9ATHYA.TN | خدمة توصيل</title>
    
    <!-- ===== CSS مضغوط ===== -->
    <link rel="stylesheet" href="css/style.min.css?v=<?php echo APP_VERSION; ?>">
</head>
<body>

<!-- ===== المحتوى الرئيسي ===== -->
<div class="main-container">
    <!-- سيتم تحميل المحتوى ديناميكياً -->
    <div id="app"></div>
</div>

<!-- ===== Toast Container ===== -->
<div class="toast-container" id="toastContainer" role="alert" aria-live="polite"></div>

<!-- ===== الكود المحمي والمشوش ===== -->
<script>
// ============================================================
// 1. حماية العميل - منع الفحص
// ============================================================
(function() {
    'use strict';
    
    // ============================================================
    // 1.1 منع النقر بزر الماوس الأيمن
    // ============================================================
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showToast('🚫 تم تعطيل فحص العناصر', 'warning');
        return false;
    });
    
    // ============================================================
    // 1.2 منع اختصارات لوحة المفاتيح
    // ============================================================
    document.addEventListener('keydown', function(e) {
        // منع F12
        if (e.key === 'F12') {
            e.preventDefault();
            showToast('🚫 تم تعطيل أدوات المطورين', 'warning');
            return false;
        }
        
        // منع Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
            e.preventDefault();
            showToast('🚫 تم تعطيل أدوات المطورين', 'warning');
            return false;
        }
        
        // منع Ctrl+U (عرض المصدر)
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            showToast('🚫 تم تعطيل عرض المصدر', 'warning');
            return false;
        }
        
        // منع Ctrl+S (حفظ الصفحة)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            showToast('🚫 تم تعطيل حفظ الصفحة', 'warning');
            return false;
        }
    });
    
    // ============================================================
    // 1.3 منع السحب والتحديد
    // ============================================================
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // ============================================================
    // 1.4 منع استخدام أدوات التطوير من خلال Console
    // ============================================================
    console.log('%c🔒 9ATHYA.TN - محمي', 'font-size:20px; color:#e74c3c; font-weight:bold;');
    console.log('%c🚫 أدوات المطورين معطلة', 'font-size:14px; color:#999;');
    
    // ============================================================
    // 1.5 كشف محاولات فتح Console
    // ============================================================
    let devtoolsOpen = false;
    const element = new Image();
    Object.defineProperty(element, 'id', {
        get: function() {
            devtoolsOpen = true;
            showToast('🚫 تم اكتشاف محاولة فتح أدوات المطورين', 'error');
            // يمكن إضافة إجراءات إضافية هنا
            return '';
        }
    });
    requestAnimationFrame(function check() {
        devtoolsOpen = false;
        console.log('%c', element);
        if (devtoolsOpen) {
            // تم فتح أدوات المطورين
            document.body.innerHTML = '<div style="text-align:center;padding:50px;color:#e74c3c;font-size:24px;">🚫 تم تعطيل أدوات المطورين</div>';
        }
        requestAnimationFrame(check);
    });
    
    // ============================================================
    // 2. تحميل التطبيق
    // ============================================================
    function loadApp() {
        // سيتم تحميل الكود الأساسي للتطبيق
        // يتم تخزينه في متغير مؤقت لمنع الوصول المباشر
        const appData = {
            version: '<?php echo APP_VERSION; ?>',
            config: {
                deliveryPricePerKm: <?php echo DELIVERY_PRICE_PER_KM; ?>,
                minDeliveryPrice: <?php echo MIN_DELIVERY_PRICE; ?>,
                serviceFee: <?php echo SERVICE_FEE; ?>
            }
        };
        
        // بدء التطبيق
        initApp(appData);
    }
    
    // ============================================================
    // 3. عرض الإشعارات (بديل عن alert)
    // ============================================================
    window.showToast = function(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${icons[type] || 'ℹ️'}</span>
            <span style="flex:1;">${message}</span>
            <button class="toast-close" aria-label="إغلاق">×</button>
        `;
        
        container.appendChild(toast);
        
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', function() {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        });
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    };
    
    // ============================================================
    // 4. تحميل التطبيق عند جاهزية الصفحة
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadApp);
    } else {
        loadApp();
    }
    
})();
</script>

<!-- ===== الكود المشوش للتطبيق ===== -->
<script src="js/app.min.js?v=<?php echo APP_VERSION; ?>"></script>

</body>
</html>
