import { z } from 'zod';

import { uuidSchema } from './common';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

/** Адрес курьерской доставки: город, улица и дом, квартира (D-031). */
export const addressInputSchema = z.object({
  label: z.string().trim().min(1, 'Назовите адрес').max(40),
  city: z.string().trim().min(1, 'Укажите город').max(100),
  street: z.string().trim().min(1, 'Укажите улицу и дом').max(200),
  apartment: optionalText(20),
  comment: optionalText(500),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressInputSchema>;

export const addressSchema = z.object({
  id: uuidSchema,
  label: z.string(),
  city: z.string(),
  street: z.string(),
  apartment: z.string().nullable(),
  comment: z.string().nullable(),
  isDefault: z.boolean(),
});
export type Address = z.infer<typeof addressSchema>;
