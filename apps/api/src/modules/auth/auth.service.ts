import type { LoginRequest, RegisterRequest, User } from '@nisha/contracts';
import { eq } from 'drizzle-orm';

import type { Database } from '../../database/client';
import { users } from '../../database/schema';
import { AppError } from '../../shared/errors';
import { hashPassword, verifyPassword } from '../../shared/password';
import { toPublicUser } from './session';

const WRONG_CREDENTIALS = 'Неверный email или пароль';

// Для неизвестного email argon2 всё равно проверяет пароль — против этого хеша.
// Иначе по времени ответа можно было бы узнать, зарегистрирован ли адрес.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword('nisha-timing-equalizer'));

export async function registerUser(db: Database, input: RegisterRequest): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  const [created] = await db
    .insert(users)
    .values({ email: input.email, name: input.name, passwordHash })
    .onConflictDoNothing({ target: users.email })
    .returning();
  // Гостевые аккаунты (без пароля) присваиваются через ссылку из письма — этап 7, D-022.
  if (!created) {
    throw new AppError('CONFLICT', 'Этот email уже зарегистрирован', { field: 'email' });
  }
  return toPublicUser(created);
}

export async function authenticate(db: Database, input: LoginRequest): Promise<User> {
  const [user] = await db.select().from(users).where(eq(users.email, input.email));
  const hash = user?.passwordHash ?? (await getDummyHash());
  const valid = await verifyPassword(hash, input.password);
  // Гостевой аккаунт без пароля войти не может, даже если пароль совпал с «пустышкой».
  if (!user?.passwordHash || !valid) throw new AppError('UNAUTHORIZED', WRONG_CREDENTIALS);
  return toPublicUser(user);
}
