import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';

export async function setupSecurity(app: FastifyInstance, webOrigin: string): Promise<void> {
  await app.register(helmet);
  // Cookie сессии отправляются только с нашего фронта.
  await app.register(cors, { origin: webOrigin, credentials: true });
}
