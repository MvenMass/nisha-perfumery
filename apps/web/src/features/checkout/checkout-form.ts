import { addressInputSchema, contactSchema } from '@nisha/contracts';
import type { CreateOrderRequest, DeliveryMethod, User } from '@nisha/contracts';

import { fieldErrors } from '../../shared/lib/form';

export const NEW_ADDRESS = 'new';

/** Черновик формы оформления — всё, что покупатель ввёл и выбрал (D-030). */
export type CheckoutDraft = {
  contact: { name: string; phone: string; email: string };
  method: DeliveryMethod;
  /** id сохранённого адреса или NEW_ADDRESS — адрес вводится в поля. */
  addressId: string;
  newAddress: { city: string; street: string; apartment: string; comment: string };
  saveAddress: boolean;
  pickupPointId: string | null;
};

export function initialDraft(
  user: User | null,
  defaultAddressId: string | undefined,
): CheckoutDraft {
  return {
    contact: { name: user?.name ?? '', phone: user?.phone ?? '', email: user?.email ?? '' },
    method: 'courier',
    addressId: defaultAddressId ?? NEW_ADDRESS,
    newAddress: { city: '', street: '', apartment: '', comment: '' },
    saveAddress: true,
    pickupPointId: null,
  };
}

type OrderFields = Pick<CreateOrderRequest, 'contact' | 'delivery' | 'comment'>;

export type CheckoutValidation =
  { ok: true; request: OrderFields } | { ok: false; errors: Record<string, string> };

/**
 * Проверка теми же схемами, что на сервере (CONVENTIONS.md, правило 8). Ключи ошибок —
 * «contact.email», «address.street», «pickupPoint»: по ним подписываются поля.
 */
export function validateCheckout(draft: CheckoutDraft, isGuest: boolean): CheckoutValidation {
  const errors: Record<string, string> = {};
  const contact = contactSchema.safeParse(draft.contact);
  if (!contact.success) {
    for (const [field, message] of Object.entries(fieldErrors(contact.error))) {
      errors[`contact.${field}`] = message;
    }
  }

  let delivery: CreateOrderRequest['delivery'] | undefined;
  let comment: string | undefined;
  if (draft.method === 'boutique') {
    delivery = { method: 'boutique' };
  } else if (draft.method === 'pickup_point') {
    if (draft.pickupPointId)
      delivery = { method: 'pickup_point', pickupPointId: draft.pickupPointId };
    else errors.pickupPoint = 'Выберите пункт выдачи';
  } else if (draft.addressId !== NEW_ADDRESS) {
    delivery = { method: 'courier', address: { addressId: draft.addressId } };
    comment = draft.newAddress.comment.trim() || undefined;
  } else {
    const address = addressInputSchema.safeParse({
      // Название нужно для списка сохранённых адресов; при оформлении его не спрашиваем.
      label: draft.newAddress.street.trim().slice(0, 40) || 'Адрес',
      city: draft.newAddress.city,
      street: draft.newAddress.street,
      apartment: draft.newAddress.apartment,
      comment: draft.newAddress.comment,
    });
    if (address.success) {
      delivery = {
        method: 'courier',
        address: { newAddress: address.data, save: !isGuest && draft.saveAddress },
      };
    } else {
      for (const [field, message] of Object.entries(fieldErrors(address.error))) {
        errors[`address.${field}`] = message;
      }
    }
  }

  if (!contact.success || !delivery || Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    request: { contact: contact.data, delivery, ...(comment ? { comment } : {}) },
  };
}

/**
 * Шаг индикатора 01–03 (D-030): первый незаполненный блок. Ошибки не показываются —
 * индикатор только подсказывает, сколько осталось.
 */
export function currentStep(draft: CheckoutDraft): 0 | 1 | 2 {
  if (!contactSchema.safeParse(draft.contact).success) return 0;
  const result = validateCheckout(draft, false);
  return result.ok ? 2 : 1;
}
