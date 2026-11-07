import { z } from 'zod';

import { emailSchema, uuidSchema } from './common';

// Верхняя граница защищает argon2 от гигантских строк; нижняя — минимальная разумная длина.
export const passwordSchema = z
  .string()
  .min(8, 'Пароль — не короче 8 символов')
  .max(128, 'Пароль — не длиннее 128 символов');

export const personNameSchema = z.string().trim().min(1, 'Укажите имя').max(100);

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: personNameSchema,
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

// При входе длину пароля не проверяем на минимум: это подсказало бы правила старых паролей.
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Введите пароль').max(128),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const userRoleSchema = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: uuidSchema,
  email: z.email(),
  name: z.string(),
  phone: z.string().nullable(),
  role: userRoleSchema,
  /** false — гостевой аккаунт после оформления заказа, пароль ещё не задан (D-022). */
  hasPassword: z.boolean(),
});
export type User = z.infer<typeof userSchema>;

/** GET /auth/csrf — токен для заголовка x-csrf-token (дублирует cookie, D-006). */
export const csrfResponseSchema = z.object({ token: z.string().min(16) });
export type CsrfResponse = z.infer<typeof csrfResponseSchema>;

/** POST /auth/register и /auth/login. */
export const authResponseSchema = z.object({ user: userSchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;

/** GET /auth/me — null, если сессии нет. */
export const meResponseSchema = z.object({
  user: userSchema.nullable(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;
