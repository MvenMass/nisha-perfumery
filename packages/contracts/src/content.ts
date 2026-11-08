import { z } from 'zod';

import { personNameSchema } from './auth';
import {
  emailSchema,
  imageSchema,
  isoDateTimeSchema,
  paginationSchema,
  phoneSchema,
  slugSchema,
} from './common';

/** Слайд первого экрана главной (D-033: контент в БД и админке). */
export const heroSlideSchema = z.object({
  id: z.string(),
  label: z.string(),
  title: z.string(),
  text: z.string(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  /** null — снимка ещё нет: витрина показывает фон, а imageAlt описывает будущий кадр. */
  imageUrl: z.string().nullable(),
  imageAlt: z.string(),
});
export type HeroSlide = z.infer<typeof heroSlideSchema>;

export const articlePreviewSchema = z.object({
  slug: slugSchema,
  tag: z.string(),
  title: z.string(),
  lead: z.string(),
  cover: imageSchema.nullable(),
  publishedAt: isoDateTimeSchema,
});
export type ArticlePreview = z.infer<typeof articlePreviewSchema>;

/** Статья журнала: текст — абзацы без разметки, выводятся как текст, не как HTML. */
export const articleSchema = articlePreviewSchema.extend({
  paragraphs: z.array(z.string()),
});
export type Article = z.infer<typeof articleSchema>;

export const articlesQuerySchema = paginationSchema;

export const articlesResponseSchema = z.object({
  items: z.array(articlePreviewSchema),
  total: z.number().int().nonnegative(),
});
export type ArticlesResponse = z.infer<typeof articlesResponseSchema>;

export const articleParamsSchema = z.object({ slug: slugSchema });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? undefined : value))
    .optional();

/** POST /consultations — запись на консультацию в бутике. */
export const consultationRequestSchema = z.object({
  name: personNameSchema,
  phone: phoneSchema,
  email: z
    .union([z.literal(''), emailSchema])
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
  preferredTime: optionalText(120),
  comment: optionalText(1000),
});
export type ConsultationRequest = z.infer<typeof consultationRequestSchema>;
