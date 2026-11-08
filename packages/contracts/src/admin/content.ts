import { z } from 'zod';

import { isoDateTimeSchema, kopecksSchema, slugSchema, uuidSchema } from '../common';

const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable();

/** Только снимки, загруженные в админке: чужие адреса в витрину не попадают. */
const uploadedImageUrl = z
  .string()
  .regex(/^\/uploads\/[\w/.-]+$/, 'Загрузите снимок через админку')
  .nullable();

/** Ссылка кнопки — путь внутри сайта, как проверяет и БД. */
const internalPath = z
  .string()
  .trim()
  .regex(/^\/(?!\/)/, 'Ссылка внутри сайта, например /catalog');

// --- Слайды ---

export const heroSlideInputSchema = z.object({
  label: requiredText(80, 'Нужна подпись глубины'),
  title: requiredText(120, 'Нужен заголовок'),
  text: requiredText(400, 'Нужен текст'),
  ctaLabel: requiredText(40, 'Нужна надпись кнопки'),
  ctaHref: internalPath,
  imageUrl: uploadedImageUrl,
  imageAlt: requiredText(300, 'Опишите снимок'),
  isPublished: z.boolean(),
});
export type HeroSlideInput = z.infer<typeof heroSlideInputSchema>;

export const adminHeroSlideSchema = z.object({
  id: uuidSchema,
  position: z.number().int(),
  label: z.string(),
  title: z.string(),
  text: z.string(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string(),
  isPublished: z.boolean(),
});
export type AdminHeroSlide = z.infer<typeof adminHeroSlideSchema>;

export const adminHeroSlidesResponseSchema = z.object({ items: z.array(adminHeroSlideSchema) });

/** PATCH /admin/slides/order — новый порядок слайдов. */
export const slidesOrderSchema = z.object({ ids: z.array(uuidSchema).max(20) });

// --- Статьи ---

export const articleInputSchema = z.object({
  slug: slugSchema,
  tag: requiredText(40, 'Нужна рубрика'),
  title: requiredText(160, 'Нужен заголовок'),
  lead: requiredText(400, 'Нужен лид'),
  /** Абзацы через пустую строку. */
  body: requiredText(20_000, 'Нужен текст'),
  coverUrl: uploadedImageUrl,
  coverAlt: optionalText(300),
  isPublished: z.boolean(),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

export const adminArticleSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  tag: z.string(),
  title: z.string(),
  lead: z.string(),
  body: z.string(),
  coverUrl: z.string().nullable(),
  coverAlt: z.string().nullable(),
  isPublished: z.boolean(),
  publishedAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema,
});
export type AdminArticle = z.infer<typeof adminArticleSchema>;

export const adminArticlesResponseSchema = z.object({ items: z.array(adminArticleSchema) });

// --- Заявки на консультацию ---

export const consultationStatusSchema = z.enum(['new', 'contacted', 'done']);
export type ConsultationStatus = z.infer<typeof consultationStatusSchema>;

export const adminConsultationSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  preferredTime: z.string().nullable(),
  comment: z.string().nullable(),
  status: consultationStatusSchema,
  createdAt: isoDateTimeSchema,
});
export type AdminConsultation = z.infer<typeof adminConsultationSchema>;

export const adminConsultationsQuerySchema = z.object({
  status: consultationStatusSchema.optional(),
});

export const adminConsultationsResponseSchema = z.object({
  items: z.array(adminConsultationSchema),
});

export const consultationStatusUpdateSchema = z.object({ status: consultationStatusSchema });

// --- Настройки магазина ---

export const storeSettingsInputSchema = z.object({
  freeDeliveryThresholdKopecks: kopecksSchema,
  courierPriceKopecks: kopecksSchema,
  pickupPointPriceKopecks: kopecksSchema,
  /** Срок строкой: «1–5». */
  courierDays: z
    .string()
    .trim()
    .regex(/^\d+(–\d+)?$/, 'Например, 1–5'),
  pickupPointDays: z
    .string()
    .trim()
    .regex(/^\d+(–\d+)?$/, 'Например, 2–6'),
  lowStockThreshold: z
    .number({ error: 'Введите целое число' })
    .int('Введите целое число')
    .min(1, 'Не меньше 1')
    .max(100, 'Не больше 100'),
  boutiqueAddress: requiredText(200, 'Нужен адрес бутика'),
  boutiqueHours: requiredText(120, 'Нужны часы работы'),
});
export type StoreSettingsInput = z.infer<typeof storeSettingsInputSchema>;

export const adminStoreSettingsSchema = z.object({
  freeDeliveryThresholdKopecks: z.number().int(),
  courierPriceKopecks: z.number().int(),
  pickupPointPriceKopecks: z.number().int(),
  courierDays: z.string(),
  pickupPointDays: z.string(),
  lowStockThreshold: z.number().int(),
  boutiqueAddress: z.string(),
  boutiqueHours: z.string(),
});

/** POST /admin/uploads — снимок для слайда или обложки статьи. */
export const uploadResponseSchema = z.object({ url: z.string() });
