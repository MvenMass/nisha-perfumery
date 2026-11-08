import { randomUUID } from 'node:crypto';

import type {
  AdminArticle,
  AdminConsultation,
  AdminHeroSlide,
  ArticleInput,
  ConsultationStatus,
  HeroSlideInput,
  StoreSettingsInput,
} from '@nisha/contracts';
import { asc, desc, eq, max, sql } from 'drizzle-orm';

import type { Database } from '../../database/client';
import { articles, consultationRequests, heroSlides, storeSettings } from '../../database/schema';
import { AppError } from '../../shared/errors';
import { uniqueViolation } from '../../shared/pg';
import { findStoreSettings } from '../catalog/catalog.repository';
import { MAIN_WIDTH, prepareImage } from '../storage/images';
import type { Storage } from '../storage/storage';

// --- Слайды ---

type SlideRow = typeof heroSlides.$inferSelect;

const toAdminSlide = (row: SlideRow): AdminHeroSlide => ({
  id: row.id,
  position: row.position,
  label: row.label,
  title: row.title,
  text: row.text,
  ctaLabel: row.ctaLabel,
  ctaHref: row.ctaHref,
  imageUrl: row.imageUrl,
  imageAlt: row.imageAlt,
  isPublished: row.isPublished,
});

export async function listSlides(db: Database): Promise<AdminHeroSlide[]> {
  const rows = await db.select().from(heroSlides).orderBy(asc(heroSlides.position));
  return rows.map(toAdminSlide);
}

export async function saveSlide(
  db: Database,
  id: string | null,
  input: HeroSlideInput,
): Promise<AdminHeroSlide> {
  if (id) {
    const [row] = await db.update(heroSlides).set(input).where(eq(heroSlides.id, id)).returning();
    if (!row) throw new AppError('NOT_FOUND', 'Слайд не найден');
    return toAdminSlide(row);
  }
  // Новый слайд — в конец карусели.
  const [last] = await db.select({ value: max(heroSlides.position) }).from(heroSlides);
  const [row] = await db
    .insert(heroSlides)
    .values({ ...input, position: (last?.value ?? -1) + 1 })
    .returning();
  if (!row) throw new Error('Слайд не сохранился');
  return toAdminSlide(row);
}

/** Порядок карусели: передаются все слайды в нужном порядке. */
export async function reorderSlides(db: Database, ids: string[]): Promise<AdminHeroSlide[]> {
  return db.transaction(async (tx) => {
    const current = await tx.select({ id: heroSlides.id }).from(heroSlides);
    const known = new Set(current.map((row) => row.id));
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      throw new AppError('VALIDATION_FAILED', 'Передайте все слайды ровно по одному разу');
    }
    for (const [position, id] of ids.entries()) {
      await tx.update(heroSlides).set({ position }).where(eq(heroSlides.id, id));
    }
    const rows = await tx.select().from(heroSlides).orderBy(asc(heroSlides.position));
    return rows.map(toAdminSlide);
  });
}

export async function deleteSlide(db: Database, id: string): Promise<void> {
  const deleted = await db.delete(heroSlides).where(eq(heroSlides.id, id)).returning();
  if (deleted.length === 0) throw new AppError('NOT_FOUND', 'Слайд не найден');
}

// --- Статьи ---

type ArticleRow = typeof articles.$inferSelect;

const toAdminArticle = (row: ArticleRow): AdminArticle => ({
  id: row.id,
  slug: row.slug,
  tag: row.tag,
  title: row.title,
  lead: row.lead,
  body: row.body,
  coverUrl: row.coverUrl,
  coverAlt: row.coverAlt,
  isPublished: row.isPublished,
  publishedAt: row.publishedAt?.toISOString() ?? null,
  updatedAt: row.updatedAt.toISOString(),
});

export async function listAdminArticles(db: Database): Promise<AdminArticle[]> {
  const rows = await db
    .select()
    .from(articles)
    .orderBy(sql`${articles.publishedAt} DESC NULLS FIRST`, desc(articles.createdAt));
  return rows.map(toAdminArticle);
}

export async function getAdminArticle(db: Database, id: string): Promise<AdminArticle> {
  const [row] = await db.select().from(articles).where(eq(articles.id, id));
  if (!row) throw new AppError('NOT_FOUND', 'Статья не найдена');
  return toAdminArticle(row);
}

export async function saveArticle(
  db: Database,
  id: string | null,
  input: ArticleInput,
): Promise<AdminArticle> {
  // Дата ставится при первой публикации и не меняется: от неё порядок журнала.
  const publishedAt = input.isPublished ? sql`coalesce(${articles.publishedAt}, now())` : null;
  try {
    if (id) {
      const [row] = await db
        .update(articles)
        .set({
          ...input,
          publishedAt: input.isPublished ? publishedAt : sql`${articles.publishedAt}`,
        })
        .where(eq(articles.id, id))
        .returning();
      if (!row) throw new AppError('NOT_FOUND', 'Статья не найдена');
      return toAdminArticle(row);
    }
    const [row] = await db
      .insert(articles)
      .values({ ...input, publishedAt: input.isPublished ? sql`now()` : null })
      .returning();
    if (!row) throw new Error('Статья не сохранилась');
    return toAdminArticle(row);
  } catch (error) {
    if (uniqueViolation(error) === 'articles_slug_unique') {
      throw new AppError('CONFLICT', 'Такой адрес статьи уже занят', { field: 'slug' });
    }
    throw error;
  }
}

export async function deleteArticle(db: Database, id: string): Promise<void> {
  const deleted = await db.delete(articles).where(eq(articles.id, id)).returning();
  if (deleted.length === 0) throw new AppError('NOT_FOUND', 'Статья не найдена');
}

// --- Заявки на консультацию ---

export async function listConsultations(
  db: Database,
  status: ConsultationStatus | undefined,
): Promise<AdminConsultation[]> {
  const rows = await db
    .select()
    .from(consultationRequests)
    .where(status ? eq(consultationRequests.status, status) : undefined)
    .orderBy(desc(consultationRequests.createdAt))
    .limit(200);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    preferredTime: row.preferredTime,
    comment: row.comment,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function setConsultationStatus(
  db: Database,
  id: string,
  status: ConsultationStatus,
): Promise<void> {
  const updated = await db
    .update(consultationRequests)
    .set({ status })
    .where(eq(consultationRequests.id, id))
    .returning({ id: consultationRequests.id });
  if (updated.length === 0) throw new AppError('NOT_FOUND', 'Заявка не найдена');
}

// --- Настройки магазина ---

export async function getSettings(db: Database): Promise<StoreSettingsInput> {
  const { id: _id, updatedAt: _updatedAt, ...settings } = await findStoreSettings(db);
  return settings;
}

export async function updateSettings(
  db: Database,
  input: StoreSettingsInput,
): Promise<StoreSettingsInput> {
  await db.update(storeSettings).set(input).where(eq(storeSettings.id, 1));
  return getSettings(db);
}

// --- Снимки для слайдов и статей ---

/** Снимок контента: те же проверки и размеры, что у товаров; в ответ — адрес основного размера. */
export async function uploadContentImage(storage: Storage, buffer: Buffer): Promise<string> {
  const files = await prepareImage(buffer);
  const base = `content/${randomUUID()}`;
  for (const file of files) await storage.put(`${base}-${file.suffix}`, file.data);
  return storage.url(`${base}-${MAIN_WIDTH}.jpg`);
}
