<?php
// ============================================================
// security.php - دوال الأمان والحماية
// ============================================================

if (!defined('ALLOW_ACCESS')) {
    die('🚫 الوصول غير مصرح به');
}

// ============================================================
// 1. تنقية المدخلات
// ============================================================
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

// ============================================================
// 2. التحقق من رقم الهاتف التونسي
// ============================================================
function validateTunisianPhone($phone) {
    $cleaned = preg_replace('/\s+/', '', $phone);
    return preg_match('/^(?:\+216)?[234579]\d{7}$/', $cleaned);
}

// ============================================================
// 3. التحقق من البريد الإلكتروني
// ============================================================
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// ============================================================
// 4. إنشاء رمز CSRF
// ============================================================
function generateCSRFToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    return $token;
}

// ============================================================
// 5. التحقق من رمز CSRF
// ============================================================
function verifyCSRFToken($token) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (!isset($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

// ============================================================
// 6. منع هجمات XSS
// ============================================================
function xssClean($data) {
    if (is_array($data)) {
        return array_map('xssClean', $data);
    }
    return htmlspecialchars($data, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

// ============================================================
// 7. التحقق من نوع المحتوى (Content-Type)
// ============================================================
function validateContentType() {
    $allowedTypes = ['application/json', 'application/x-www-form-urlencoded'];
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    foreach ($allowedTypes as $type) {
        if (strpos($contentType, $type) !== false) {
            return true;
        }
    }
    return false;
}

// ============================================================
// 8. منع هجمات Clickjacking
// ============================================================
function preventClickjacking() {
    header('X-Frame-Options: DENY');
    header('Content-Security-Policy: frame-ancestors none;');
}

// ============================================================
// 9. تسجيل محاولات الاختراق
// ============================================================
function logSecurityEvent($event, $details = '') {
    $logFile = __DIR__ . '/../logs/security.log';
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
    
    $logEntry = "[$timestamp] [$event] IP: $ip | User-Agent: $userAgent | Details: $details\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// ============================================================
// 10. منع هجمات الإرهاق (Rate Limiting)
// ============================================================
function checkRateLimit($key, $limit = 10, $timeWindow = 60) {
    $sessionKey = 'rate_limit_' . md5($key);
    
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION[$sessionKey])) {
        $_SESSION[$sessionKey] = ['count' => 1, 'first_request' => time()];
        return true;
    }
    
    $data = $_SESSION[$sessionKey];
    $elapsed = time() - $data['first_request'];
    
    if ($elapsed > $timeWindow) {
        $_SESSION[$sessionKey] = ['count' => 1, 'first_request' => time()];
        return true;
    }
    
    if ($data['count'] >= $limit) {
        logSecurityEvent('RATE_LIMIT_EXCEEDED', "Key: $key, Count: {$data['count']}");
        return false;
    }
    
    $_SESSION[$sessionKey]['count']++;
    return true;
}
?>
