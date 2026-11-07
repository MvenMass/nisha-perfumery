import { describe, expect, it } from 'vitest';

import { deliveryPrice } from './delivery';

const pricing = {
  freeDeliveryThresholdKopecks: 1_000_000,
  courierPriceKopecks: 49_000,
  pickupPointPriceKopecks: 29_000,
};

describe('deliveryPrice', () => {
  it('берёт цену способа, пока сумма ниже порога', () => {
    expect(deliveryPrice('courier', 650_000, pricing)).toEqual({
      priceKopecks: 49_000,
      untilFreeKopecks: 350_000,
    });
    expect(deliveryPrice('pickup_point', 650_000, pricing).priceKopecks).toBe(29_000);
  });

  it('бесплатна от порога включительно', () => {
    expect(deliveryPrice('courier', 1_000_000, pricing)).toEqual({
      priceKopecks: 0,
      untilFreeKopecks: 0,
    });
  });

  it('самовывоз из бутика всегда бесплатен', () => {
    expect(deliveryPrice('boutique', 100, pricing)).toEqual({
      priceKopecks: 0,
      untilFreeKopecks: 0,
    });
  });
});
