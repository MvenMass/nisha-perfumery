import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node26',
  sourcemap: true,
  clean: true,
  // contracts — пакет на исходниках TS (D-035), поэтому вшиваем его в бандл;
  // остальные зависимости ставятся в образ через pnpm deploy.
  noExternal: ['@nisha/contracts'],
});
