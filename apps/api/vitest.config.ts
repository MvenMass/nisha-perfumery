import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Локально DATABASE_URL берётся из корневого .env; в CI переменные уже заданы,
// а loadEnvFile не перезаписывает существующие.
const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  test: {
    // Создание базы и миграции занимают секунды.
    hookTimeout: 60_000,
    // Тесты ходят в настоящий PostgreSQL и считают argon2; когда файлы идут параллельно,
    // 5 секунд по умолчанию не хватает тесту сида, который дважды заполняет базу.
    testTimeout: 20_000,
  },
});
