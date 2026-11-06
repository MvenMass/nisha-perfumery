import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1).default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // Единственный origin, которому разрешены запросы с cookie (CORS).
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

// Отдельно от envSchema: пока HTTP-маршрутам не нужна БД, сервер не должен требовать DATABASE_URL.
// В этапе 4 схемы объединятся.
const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .url()
    .refine((value) => /^postgres(ql)?:\/\//.test(value), 'Ожидается адрес postgres://…'),
});

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
