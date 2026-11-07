import { z } from 'zod';

const databaseUrlSchema = z
  .url()
  .refine((value) => /^postgres(ql)?:\/\//.test(value), 'Ожидается адрес postgres://…');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1).default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // Единственный origin, которому разрешены запросы с cookie (CORS).
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: databaseUrlSchema,
  // Secure-cookie по умолчанию только в production: Safari не принимает их на http://localhost.
  COOKIE_SECURE: z.stringbool().optional(),
  // Пока есть только мок-провайдер; ЮKassa добавится значением этого же enum.
  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
});

export type Env = z.infer<typeof envSchema>;

export function cookieSecure(env: Env): boolean {
  return env.COOKIE_SECURE ?? env.NODE_ENV === 'production';
}

// Скриптам миграций и сида нужна только БД — остальные переменные сервера им не важны.
const databaseEnvSchema = z.object({ DATABASE_URL: databaseUrlSchema });

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

function parse<T extends z.ZodType>(schema: T, source: NodeJS.ProcessEnv): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Неверные переменные окружения:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return parse(envSchema, source);
}

export function loadDatabaseEnv(source: NodeJS.ProcessEnv = process.env): DatabaseEnv {
  return parse(databaseEnvSchema, source);
}
