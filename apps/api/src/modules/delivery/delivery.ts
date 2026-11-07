import type { DeliveryMethod } from '@nisha/contracts';

export type DeliveryPricing = {
  freeDeliveryThresholdKopecks: number;
  courierPriceKopecks: number;
  pickupPointPriceKopecks: number;
};

/**
 * Цена доставки (D-031) — только на сервере. Самовывоз бесплатен; курьер и пункт выдачи
 * бесплатны от порога из настроек магазина.
 */
export function deliveryPrice(
  method: DeliveryMethod,
  itemsTotalKopecks: number,
  pricing: DeliveryPricing,
): { priceKopecks: number; untilFreeKopecks: number } {
  if (method === 'boutique') return { priceKopecks: 0, untilFreeKopecks: 0 };
  const untilFreeKopecks = Math.max(pricing.freeDeliveryThresholdKopecks - itemsTotalKopecks, 0);
  if (untilFreeKopecks === 0) return { priceKopecks: 0, untilFreeKopecks: 0 };
  return {
    priceKopecks:
      method === 'courier' ? pricing.courierPriceKopecks : pricing.pickupPointPriceKopecks,
    untilFreeKopecks,
  };
}
