import type {
  LoginRequest,
  RegisterRequest,
  SetPasswordRequest,
  UpdateProfileRequest,
  User,
} from '@nisha/contracts';
import { and, eq, gt, isNull } from 'drizzle-orm';

import type { Database } from '../../database/client';
import { passwordTokens, users } from '../../database/schema';
import { AppError } from '../../shared/errors';
import { hashPassword, verifyPassword } from '../../shared/password';
import { hashToken } from '../../shared/token';
import type { Mailer } from '../mailer/mailer';
import { issuePasswordToken, sendSetPasswordMail } from './password-link';
import { toPublicUser } from './session';

const WRONG_CREDENTIALS = 'Неверный email или пароль';

// Для неизвестного email argon2 всё равно проверяет пароль — против этого хеша.
// Иначе по времени ответа можно было бы узнать, зарегистрирован ли адрес.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword('nisha-timing-equalizer'));

export async function registerUser(
  deps: { db: Database; mailer: Mailer; webOrigin: string },
  input: RegisterRequest,
): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  const [created] = await deps.db
    .insert(users)
    .values({ email: input.email, name: input.name, passwordHash })
    .onConflictDoNothing({ target: users.email })
    .returning();
  if (created) return toPublicUser(created);

  // Адрес занят гостевым аккаунтом: присвоить его регистрацией нельзя — иначе любой, кто знает
  // чужой email, увидел бы чужие заказы. Владельцу уходит ссылка «Задать пароль» (D-060).
  const [existing] = await deps.db.select().from(users).where(eq(users.email, input.email));
  if (existing && existing.passwordHash === null) {
    const token = await issuePasswordToken(deps.db, existing.id);
    await sendSetPasswordMail(deps.mailer, {
      email: existing.email,
      token,
      webOrigin: deps.webOrigin,
    });
    throw new AppError(
      'CONFLICT',
      'На этот адрес уже оформляли заказ. Мы отправили письмо со ссылкой, чтобы задать пароль.',
      { field: 'email' },
    );
  }
  throw new AppError('CONFLICT', 'Этот email уже зарегистрирован', { field: 'email' });
}

export async function authenticate(db: Database, input: LoginRequest): Promise<User> {
  const [user] = await db.select().from(users).where(eq(users.email, input.email));
  const hash = user?.passwordHash ?? (await getDummyHash());
  const valid = await verifyPassword(hash, input.password);
  // Гостевой аккаунт без пароля войти не может, даже если пароль совпал с «пустышкой».
  if (!user?.passwordHash || !valid) throw new AppError('UNAUTHORIZED', WRONG_CREDENTIALS);
  return toPublicUser(user);
}

/** Пароль по одноразовой ссылке из письма: после этого гостевой аккаунт — обычный. */
export async function setPasswordByToken(
  db: Database,
  input: SetPasswordRequest,
  now = new Date(),
): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const [link] = await tx
      .select()
      .from(passwordTokens)
      .where(
        and(
          eq(passwordTokens.tokenHash, hashToken(input.token)),
          isNull(passwordTokens.usedAt),
          gt(passwordTokens.expiresAt, now),
        ),
      )
      .for('update');
    if (!link) {
      throw new AppError(
        'VALIDATION_FAILED',
        'Ссылка устарела или уже использована. Оформите заказ или зарегистрируйтесь заново.',
      );
    }
    await tx.update(passwordTokens).set({ usedAt: now }).where(eq(passwordTokens.id, link.id));
    const [user] = await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, link.userId))
      .returning();
    if (!user) throw new AppError('NOT_FOUND', 'Аккаунт не найден');
    return toPublicUser(user);
  });
}

export async function updateProfile(
  db: Database,
  userId: string,
  input: UpdateProfileRequest,
): Promise<User> {
  const [user] = await db
    .update(users)
    .set({ name: input.name, phone: input.phone })
    .where(eq(users.id, userId))
    .returning();
  if (!user) throw new AppError('NOT_FOUND', 'Аккаунт не найден');
  return toPublicUser(user);
}
