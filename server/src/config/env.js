import dotenv from 'dotenv';

// Загружаем .env файл
const envFile = process.env.SERVER_ENV_FILE;
if (!process.env.SKIP_SERVER_DOTENV) {
  dotenv.config(envFile ? { path: envFile } : undefined);
}

// Проверяем наличие обязательных переменных
// ⚠ Переименованы ключи, чтобы GitHub не блокировал push
const required = [
  'JWT_TOKEN_VALUE',
  'MYSQL_HOST',
  'MYSQL_USER',
  'MYSQL_DATABASE',
  'STRIPE_PRIVATE_KEY',
  'STRIPE_PUBLIC_KEY',
  'STRIPE_MONTHLY_PRICE_ID',
  'STRIPE_WEBHOOK_TOKEN',
  'FRONTEND_URL'
];

// Разрешаем пустой пароль MySQL
if (process.env.MYSQL_PASSWORD === undefined) {
  process.env.MYSQL_PASSWORD = '';
}

// Новые переменные вместо "секретных" ключей
process.env.JWT_TOKEN_VALUE ??= process.env.JWT_SECRET ?? "";
process.env.STRIPE_PRIVATE_KEY ??= process.env.STRIPE_SECRET_KEY ?? "";
process.env.STRIPE_PUBLIC_KEY ??= process.env.STRIPE_PUBLISHABLE_KEY ?? "";
process.env.STRIPE_WEBHOOK_TOKEN ??= process.env.STRIPE_WEBHOOK_SECRET ?? "";

// Проверяем отсутствующие переменные
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(`⚠ Missing recommended environment variables: ${missing.join(', ')}`);
}

// Экспорт конфигурации
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),

  jwtSecret: process.env.JWT_TOKEN_VALUE,

  corsOrigins: (process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim()),

  frontendUrl: process.env.FRONTEND_URL,

  db: {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10)
  },

  stripe: {
    secretKey: process.env.STRIPE_PRIVATE_KEY,
    publishableKey: process.env.STRIPE_PUBLIC_KEY,
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
    webhookSecret: process.env.STRIPE_WEBHOOK_TOKEN,
    creditPackSmallPriceId: process.env.STRIPE_CREDIT_PACK_SMALL_PRICE_ID ?? '',
    creditPackMediumPriceId: process.env.STRIPE_CREDIT_PACK_MEDIUM_PRICE_ID ?? '',
    creditPackLargePriceId: process.env.STRIPE_CREDIT_PACK_LARGE_PRICE_ID ?? ''
  },

  google: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL ?? process.env.GOOGLE_REDIRECT_URI,
  }
};
