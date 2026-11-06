import { z } from 'zod';

// Клиент ветвится по коду, а не по тексту сообщения (D-018).
// Новые коды добавляются вместе с функциональностью, которой они нужны.
export const errorCodeSchema = z.enum([
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  // Уникальность: email занят, подписка уже есть.
  'CONFLICT',
  'OUT_OF_STOCK',
  'RATE_LIMITED',
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
