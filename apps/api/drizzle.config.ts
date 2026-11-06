import { defineConfig } from 'drizzle-kit';

// generate не подключается к БД; DATABASE_URL нужен только командам вроде drizzle-kit studio.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  strict: true,
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
