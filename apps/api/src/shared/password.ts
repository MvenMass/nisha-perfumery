import argon2 from 'argon2';

// argon2id с параметрами по умолчанию библиотеки (OWASP); параметры хранятся в самом хеше,
// поэтому их можно поменять позже без миграции (D-005).
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
