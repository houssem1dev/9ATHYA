import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import cookieSession from 'cookie-session';
import helmet from 'helmet';
import { Pool } from 'pg';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import nodemailer from 'nodemailer';

const app = express();
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: isProduction ? { rejectUnauthorized: true } : false });
const requestLimiter = new RateLimiterMemory({ points: 60, duration: 60 });
const authLimiter = new RateLimiterMemory({ points: 8, duration: 900 });
const profitRate = 0.12;
const mailer = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT || 587) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }) : null;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'https://9-athya.vercel.app/auth/google/callback';

const databaseConfigured = Boolean(process.env.DATABASE_URL);
const sessionConfigured = Boolean(process.env.SESSION_SECRET);

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], connectSrc: ["'self'"], fontSrc: ["'self'", 'https://fonts.gstatic.com'], styleSrc: ["'self'", 'https://fonts.googleapis.com'], imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"] } } }));
app.use(compression());
app.use(express.json({ limit: '20kb' }));
app.use(cookieSession({ name: '9athya_session', keys: [process.env.SESSION_SECRET || 'development-only-secret'], httpOnly: true, secure: isProduction, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 }));
app.use((req, res, next) => { if (req.path === '/api/orders' && req.headers.origin === 'null') { res.setHeader('Access-Control-Allow-Origin', 'null'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); if (req.method === 'OPTIONS') return res.sendStatus(204); } next(); });
app.use(async (req, res, next) => { try { await requestLimiter.consume(req.ip); next(); } catch { res.status(429).json({ error: 'طلبات كثيرة، حاول بعد شوية.' }); } });
app.get('/', (_req, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.get('/styles.css', (_req, res) => res.sendFile(path.join(rootDir, 'styles.css')));
app.get('/app.js', (_req, res) => res.sendFile(path.join(rootDir, 'app.js')));

function clean(value, max) { return String(value ?? '').trim().slice(0, max); }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function validPhone(value) { return /^(?:\+216)?[2459]\d{7}$/.test(value.replace(/[\s-]/g, '')); }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(`${salt}:${key.toString('hex')}`))); }
function verifyPassword(password, stored) { const [salt, hash] = String(stored || '').split(':'); if (!salt || !hash) return Promise.resolve(false); return hashPassword(password, salt).then((candidate) => crypto.timingSafeEqual(Buffer.from(candidate.split(':')[1], 'hex'), Buffer.from(hash, 'hex'))); }
function requireAuth(req, res, next) { if (!req.session?.userId) return res.status(401).json({ error: 'يلزم تسجيل الدخول.' }); next(); }
function requireGoogleConfig(res) { if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) { res.status(503).send('Google login موش مفعّل بعد.'); return false; } return true; }
function createGoogleState() { const payload = Buffer.from(JSON.stringify({ nonce: crypto.randomBytes(18).toString('hex'), expires: Date.now() + 10 * 60 * 1000 })).toString('base64url'); const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url'); return `${payload}.${signature}`; }
function verifyGoogleState(state) { try { const [payload, signature] = String(state).split('.'); if (!payload || !signature) return false; const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url'); if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false; return JSON.parse(Buffer.from(payload, 'base64url').toString()).expires > Date.now(); } catch { return false; } }

app.get('/api/health', async (_req, res) => { if (!databaseConfigured || !sessionConfigured) return res.status(503).json({ ok: false, error: 'Production environment is not configured.' }); try { await pool.query('SELECT 1'); res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); } });
app.get('/api/me', requireAuth, async (req, res) => { const result = await pool.query('SELECT id, name, email, phone, area FROM users WHERE id = $1', [req.session.userId]); if (!result.rowCount) return res.status(401).json({ error: 'الجلسة غير صالحة.' }); res.json(result.rows[0]); });

app.get('/auth/google', (req, res) => {
  if (!requireGoogleConfig(res)) return;
  const state = createGoogleState();
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: googleCallbackUrl, response_type: 'code', scope: 'openid email profile', state, access_type: 'online', prompt: 'select_account' });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get('/auth/google/callback', async (req, res) => {
  if (!requireGoogleConfig(res)) return;
  if (!req.query.code || !req.query.state || !verifyGoogleState(req.query.state)) return res.status(400).send('Google login request غير صالحة.');
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: String(req.query.code), client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: googleCallbackUrl, grant_type: 'authorization_code' }) });
    if (!tokenResponse.ok) return res.status(401).send('ما نجّمش نثبت حساب Google.');
    const tokens = await tokenResponse.json();
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (!profileResponse.ok) return res.status(401).send('ما نجّمش نجيب معلومات حساب Google.');
    const profile = await profileResponse.json();
    if (!profile.email || !profile.email_verified) return res.status(400).send('يلزم إيميل Google موثّق.');
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [profile.email.toLowerCase()]);
    const user = existing.rowCount ? existing.rows[0] : (await pool.query('INSERT INTO users (name, email, phone, area, google_id) VALUES ($1,$2,$3,$4,$5) RETURNING id', [clean(profile.name || profile.email.split('@')[0], 100), profile.email.toLowerCase(), '', 'صفاقس', profile.sub])).rows[0];
    req.session.userId = user.id;
    res.redirect('/');
  } catch (error) { console.error('Google login failed:', error.message); res.status(500).send('صار مشكل في الدخول بحساب Google.'); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    await authLimiter.consume(req.ip);
    const name = clean(req.body.name, 100); const email = clean(req.body.email, 160).toLowerCase(); const phone = clean(req.body.phone, 20); const area = clean(req.body.area, 160); const password = String(req.body.password || '');
    if (!name || !validEmail(email) || !validPhone(phone) || !area || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'ثبت من المعطيات وكلمة سر من 8 أحرف على الأقل.' });
    const passwordHash = await hashPassword(password);
    const result = await pool.query('INSERT INTO users (name, email, phone, area, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, phone, area', [name, email, phone, area, passwordHash]);
    if (mailer && process.env.NOTIFY_EMAIL) await mailer.sendMail({ from: process.env.SMTP_USER, to: process.env.NOTIFY_EMAIL, subject: 'حساب جديد على 9ATHYA', text: JSON.stringify(result.rows[0], null, 2) }).catch((error) => console.error('Account notification failed:', error.message));
    req.session.userId = result.rows[0].id; res.status(201).json(result.rows[0]);
  } catch (error) { if (error?.code === '23505') return res.status(409).json({ error: 'الإيميل مستعمل من قبل.' }); res.status(500).json({ error: 'صار مشكل في التسجيل.' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    await authLimiter.consume(req.ip);
    const email = clean(req.body.email, 160).toLowerCase(); const password = String(req.body.password || '');
    const result = await pool.query('SELECT id, name, email, phone, area, password_hash FROM users WHERE email = $1', [email]);
    if (!result.rowCount || !(await verifyPassword(password, result.rows[0].password_hash))) return res.status(401).json({ error: 'الإيميل أو كلمة السر غالطة.' });
    const { password_hash: _passwordHash, ...user } = result.rows[0]; req.session.userId = user.id; res.json(user);
  } catch { res.status(429).json({ error: 'حاول بعد شوية.' }); }
});

app.post('/api/auth/logout', (req, res) => { req.session = null; res.status(204).end(); });

app.post('/api/orders', async (req, res) => {
  try {
    const productName = clean(req.body.productName, 160); const unit = clean(req.body.unit, 40); const address = clean(req.body.deliveryAddress, 160); const note = clean(req.body.note, 300); const customerName = clean(req.body.customerName, 100); const customerPhone = clean(req.body.customerPhone, 20); const quantity = Number(req.body.quantity); const subtotal = Number(req.body.subtotal); const details = typeof req.body.details === 'object' && req.body.details ? req.body.details : {};
    if (!productName || !unit || !customerName || !validPhone(customerPhone) || !address || !Number.isInteger(quantity) || quantity < 1 || quantity > 12 || !Number.isFinite(subtotal) || subtotal < 0 || subtotal > 100000) return res.status(400).json({ error: 'ثبت من الاسم، رقم الهاتف، العنوان وتفاصيل الطلب.' });
    const profit = Number((subtotal * profitRate).toFixed(2)); const total = Number((subtotal + profit).toFixed(2));
    const result = await pool.query('INSERT INTO orders (user_id, customer_name, customer_phone, product_name, quantity, unit, details, delivery_address, note, subtotal, platform_profit, total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id, created_at', [null, customerName, customerPhone, productName, quantity, unit, details, address, note, subtotal, profit, total]);
    if (mailer && process.env.NOTIFY_EMAIL) await mailer.sendMail({ from: process.env.SMTP_USER, to: process.env.NOTIFY_EMAIL, subject: `طلب جديد #${result.rows[0].id} على 9ATHYA`, text: JSON.stringify({ orderId: result.rows[0].id, customerName, customerPhone, productName, quantity, unit, details, deliveryAddress: address, note, subtotal, platformProfit: profit, total }, null, 2) }).catch((error) => console.error('Order notification failed:', error.message));
    res.status(201).json({ orderId: result.rows[0].id, createdAt: result.rows[0].created_at });
  } catch (error) { console.error('Order creation failed:', error.message); res.status(500).json({ error: 'ما نجّمش نسجّل الطلب توا.' }); }
});

if (process.env.VERCEL !== '1') app.listen(port, () => console.log(`9ATHYA server listening on port ${port}`));

export default app;
