import type { DbExecutor } from '../../database/client';
import { passwordTokens } from '../../database/schema';
import { hashToken, newToken } from '../../shared/token';
import type { Mailer } from '../mailer/mailer';

/*
 * Ссылка «Задать пароль» для гостевого аккаунта (D-060): приходит после гостевого заказа
 * и при попытке зарегистрироваться на адрес, по которому уже оформляли заказы.
 */

const SET_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
