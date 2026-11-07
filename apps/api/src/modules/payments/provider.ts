import { randomUUID } from 'node:crypto';

/**
 * Платёжный провайдер. Сейчас один — мок; ЮKassa встанет рядом с тем же интерфейсом:
 * создать платёж у провайдера, а результат придёт уведомлением (payments.service).
 */
export type PaymentProvider = {
  name: string;
  createPayment: (input: { orderId: string; amountKopecks: number }) => Promise<{
    externalId: string;
  }>;
};

export const mockPaymentProvider: PaymentProvider = {
  name: 'mock',
  createPayment: async () => ({ externalId: `mock-${randomUUID()}` }),
};
