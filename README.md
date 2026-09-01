# 9ATHYA

## Production setup

1. Create a PostgreSQL database and run `schema.sql`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a random `SESSION_SECRET`.
3. Set SMTP variables to enable order notifications; credentials stay on the server.
4. Run `npm ci` then `npm start` behind HTTPS. Set `NODE_ENV=production`.

The browser never receives passwords or database credentials. Accounts use server sessions and scrypt password hashes; orders are validated and rate-limited on the server.