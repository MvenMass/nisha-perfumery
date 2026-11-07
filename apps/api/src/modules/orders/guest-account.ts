import type { Contact } from '@nisha/contracts';
import { eq } from 'drizzle-orm';

import type { DbExecutor } from '../../database/client';
import { passwordTokens, users } from '../../database/schema';
import { hashToken, newToken } from '../../shared/token';
import type { Mailer } from '../mailer/mailer';

const SET_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type OrderOwner = { userId: string; hasPassword: boolean };

/**
 * Владелец заказа без входа (D-022, D-060): аккаунт с email из контактов.
 * Нет такого — создаётся гостевой без пароля. Есть — заказ привязывается к нему, но входа
 * не происходит: знать чужой email недостаточно, чтобы увидеть чужие заказы.
 */
export async function resolveGuestOwner(db: DbExecutor, contact: Contact): Promise<OrderOwner> {
  await db
    .insert(users)
    .values({ email: contact.email, name: contact.name, phone: contact.phone })
    .onConflictDoNothing({ target: users.email });
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, contact.email));
  if (!user) throw new Error(`Не удалось найти или создать аккаунт ${contact.email}`);
  return { userId: user.id, hasPassword: user.passwordHash !== null };
}

/** Одноразовая ссылка «Задать пароль» для гостевого аккаунта; в БД — только хеш. */
export async function issuePasswordToken(
  db: DbExecutor,
  userId: string,
  now = new Date(),
): Promise<string> {
  const token = newToken();
  await db.insert(passwordTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + SET_PASSWORD_TTL_MS),
  });
  return token;
}

export async function sendSetPasswordMail(
  mailer: Mailer,
  options: { email: string; token: string; webOrigin: string; orderNumber?: number },
): Promise<void> {
  const link = `${options.webOrigin}/set-password?token=${encodeURIComponent(options.token)}`;
  const intro = options.orderNumber
    ? `Заказ № ${options.orderNumber} сохранён в вашем аккаунте «Ниши».`
    : 'Для этого адреса уже есть аккаунт «Ниши» без пароля.';
  await mailer.send({
    to: options.email,
    subject: 'Задайте пароль, чтобы видеть свои заказы',
    text: `${intro}\nЗадайте пароль по ссылке — она действует 7 дней:\n${link}`,
  });
}
