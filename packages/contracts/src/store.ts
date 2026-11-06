import { z } from 'zod';

import { kopecksSchema } from './common';

/** GET /store — публичные настройки магазина: доставка и бутик. */
export const storeInfoSchema = z.object({
  freeDeliveryThresholdKopecks: kopecksSchema,
  courierPriceKopecks: kopecksSchema,
  pickupPointPriceKopecks: kopecksSchema,
  /** Срок строкой из настроек: «1–5». */
  courierDays: z.string(),
  pickupPointDays: z.string(),
  boutiqueAddress: z.string(),
  boutiqueHours: z.string(),
});
export type StoreInfo = z.infer<typeof storeInfoSchema>;
