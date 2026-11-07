import { authResponseSchema, errorResponseSchema, meResponseSchema } from '@nisha/contracts';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { passwordTokens, users } from '../../database/schema';
import { createTestApp, CSRF, signUp } from '../../shared/test-app';
import type { TestApp } from '../../shared/test-app';
import { issuePasswordToken } from './password-link';
import { SESSION_COOKIE } from './session';

let ctx: TestApp;
let ip = 0;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.close();
});

function post(url: string, payload: object, cookies: Record<string, string> = CSRF.cookies) {
  return ctx.app.inject({
    method: 'POST',
    url,
    payload,
    cookies,
    headers: CSRF.headers,
    remoteAddress: `10.8.0.${(ip += 1)}`,
  });
}

/** Гостевой аккаунт без пароля — такой создаёт оформление заказа без входа. */
async function guestAccount(email: string): Promise<string> {
  const [user] = await ctx.testDb.db
    .insert(users)
    .values({ email, name: 'Гость', phone: null })
    .returning();
  if (!user) throw new Error('Гость не создан');
  return user.id;
}

const linkToken = (text: string) => /token=([\w-]+)/.exec(text)?.[1] ?? '';

describe('«Задать пароль» по ссылке', () => {
  it('задаёт пароль, открывает сессию, после чего входит по паролю', async () => {
    const userId = await guestAccount('guest1@nisha.test');
    const token = await issuePasswordToken(ctx.testDb.db, userId);

    const response = await post('/api/auth/set-password', { token, password: 'stone-and-smoke' });
    expect(response.statusCode, response.body).toBe(200);
    expect(authResponseSchema.parse(response.json()).user).toMatchObject({
      email: 'guest1@nisha.test',
      hasPassword: true,
    });
    const session = response.cookies.find((cookie) => cookie.name === SESSION_COOKIE);
    expect(session?.value).toBeTruthy();

    const login = await post('/api/auth/login', {
      email: 'guest1@nisha.test',
      password: 'stone-and-smoke',
    });
    expect(login.statusCode).toBe(200);
  });

  it('ссылка одноразовая', async () => {
    const userId = await guestAccount('guest2@nisha.test');
    const token = await issuePasswordToken(ctx.testDb.db, userId);
    expect(
      (await post('/api/auth/set-password', { token, password: 'first-password' })).statusCode,
    ).toBe(200);

    const again = await post('/api/auth/set-password', { token, password: 'second-password' });
    expect(again.statusCode).toBe(400);
    expect(errorResponseSchema.parse(again.json()).error.message).toMatch(/устарела/);
  });

  it('просроченная ссылка не работает', async () => {
    const userId = await guestAccount('guest3@nisha.test');
    const token = await issuePasswordToken(ctx.testDb.db, userId, new Date('2020-01-01T00:00:00Z'));
    const response = await post('/api/auth/set-password', { token, password: 'stone-and-smoke' });
    expect(response.statusCode).toBe(400);
  });

  it('в базе хранится только хеш ссылки', async () => {
    const userId = await guestAccount('guest4@nisha.test');
    const token = await issuePasswordToken(ctx.testDb.db, userId);
    const rows = await ctx.testDb.db
      .select()
      .from(passwordTokens)
      .where(eq(passwordTokens.userId, userId));
    expect(rows.map((row) => row.tokenHash)).not.toContain(token);
  });
});

describe('регистрация на адрес гостевого аккаунта', () => {
  it('не присваивает аккаунт, а отправляет ссылку владельцу адреса', async () => {
    await guestAccount('guest5@nisha.test');
    const response = await post('/api/auth/register', {
      email: 'guest5@nisha.test',
      password: 'attacker-password',
      name: 'Кто-то',
    });
    expect(response.statusCode).toBe(409);
    expect(response.cookies.find((cookie) => cookie.name === SESSION_COOKIE)).toBeUndefined();

    const mail = ctx.mails.find((item) => item.to === 'guest5@nisha.test');
    const token = linkToken(mail?.text ?? '');
    expect(token).not.toBe('');
    const [user] = await ctx.testDb.db
      .select()
      .from(users)
      .where(eq(users.email, 'guest5@nisha.test'));
    expect(user?.passwordHash).toBeNull();
  });
});

describe('PATCH /api/auth/me', () => {
  it('меняет имя и телефон, без входа — 401', async () => {
    const cookies = await signUp(ctx.app, 'profile@nisha.test');
    const response = await ctx.app.inject({
      method: 'PATCH',
      url: '/api/auth/me',
      cookies,
      headers: CSRF.headers,
      payload: { name: 'Анна Петрова', phone: '+7 900 111-22-33' },
    });
    expect(response.statusCode).toBe(200);
    const me = await ctx.app.inject({ method: 'GET', url: '/api/auth/me', cookies });
    expect(meResponseSchema.parse(me.json()).user).toMatchObject({
      name: 'Анна Петрова',
      phone: '+7 900 111-22-33',
    });

    const guest = await ctx.app.inject({
      method: 'PATCH',
      url: '/api/auth/me',
      ...CSRF,
      payload: { name: 'X', phone: null },
    });
    expect(guest.statusCode).toBe(401);
  });
});
