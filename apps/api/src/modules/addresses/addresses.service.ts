import type { Address, AddressesResponse, AddressInput } from '@nisha/contracts';
import { and, count, desc, eq, ne } from 'drizzle-orm';

import type { Database, DbExecutor } from '../../database/client';
import { addresses } from '../../database/schema';
import { AppError } from '../../shared/errors';

const MAX_ADDRESSES = 20;

type AddressRow = typeof addresses.$inferSelect;

const toAddress = (row: AddressRow): Address => ({
  id: row.id,
  label: row.label,
  city: row.city,
  street: row.street,
  apartment: row.apartment,
  comment: row.comment,
  isDefault: row.isDefault,
});

export async function listAddresses(db: Database, userId: string): Promise<AddressesResponse> {
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  return { items: rows.map(toAddress) };
}

/** Адрес по умолчанию один (частичный уникальный индекс): прежний снимается в той же транзакции. */
async function clearDefault(db: DbExecutor, userId: string, exceptId?: string) {
  await db
    .update(addresses)
    .set({ isDefault: false })
    .where(
      and(
        eq(addresses.userId, userId),
        eq(addresses.isDefault, true),
        exceptId ? ne(addresses.id, exceptId) : undefined,
      ),
    );
}

const values = (input: AddressInput) => ({
  label: input.label,
  city: input.city,
  street: input.street,
  apartment: input.apartment ?? null,
  comment: input.comment ?? null,
});

/**
 * Сохраняет адрес по общим правилам: первый становится адресом по умолчанию, не больше 20.
 * onLimit: 'skip' — для галочки «Сохранить» при оформлении: заказ важнее, чем лишний адрес.
 */
export async function insertAddress(
  db: DbExecutor,
  userId: string,
  input: AddressInput,
  onLimit: 'throw' | 'skip' = 'throw',
): Promise<Address | undefined> {
  const [total] = await db
    .select({ value: count() })
    .from(addresses)
    .where(eq(addresses.userId, userId));
  const existing = total?.value ?? 0;
  if (existing >= MAX_ADDRESSES) {
    if (onLimit === 'skip') return undefined;
    throw new AppError('CONFLICT', `Можно сохранить не больше ${MAX_ADDRESSES} адресов`);
  }
  const isDefault = input.isDefault || existing === 0;
  if (isDefault) await clearDefault(db, userId);
  const [row] = await db
    .insert(addresses)
    .values({ userId, ...values(input), isDefault })
    .returning();
  if (!row) throw new Error('Адрес не сохранился');
  return toAddress(row);
}

export async function createAddress(
  db: Database,
  userId: string,
  input: AddressInput,
): Promise<Address> {
  return db.transaction(async (tx) => {
    const address = await insertAddress(tx, userId, input);
    if (!address) throw new Error('Адрес не сохранился');
    return address;
  });
}

export async function updateAddress(
  db: Database,
  userId: string,
  id: string,
  input: AddressInput,
): Promise<Address> {
  return db.transaction(async (tx) => {
    if (input.isDefault) await clearDefault(tx, userId, id);
    const [row] = await tx
      .update(addresses)
      .set({ ...values(input), ...(input.isDefault ? { isDefault: true } : {}) })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();
    if (!row) throw new AppError('NOT_FOUND', 'Адрес не найден');
    return toAddress(row);
  });
}

export async function deleteAddress(db: Database, userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning({ id: addresses.id });
  if (deleted.length === 0) throw new AppError('NOT_FOUND', 'Адрес не найден');
}
