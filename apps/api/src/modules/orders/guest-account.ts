import type { Contact } from '@nisha/contracts';
import { eq } from 'drizzle-orm';

import type { DbExecutor } from '../../database/client';
import { users } from '../../database/schema';

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
