CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT 'صفاقس',
  password_hash TEXT,
  google_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 12),
  unit TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_address TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  subtotal NUMERIC(10,2) NOT NULL,
  platform_profit NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
