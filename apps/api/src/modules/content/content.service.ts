import type {
  Article,
  ArticlePreview,
  ArticlesResponse,
  ConsultationRequest,
  HeroSlide,
} from '@nisha/contracts';
import { and, asc, count, desc, eq } from 'drizzle-orm';

import type { Database } from '../../database/client';
import { articles, consultationRequests, heroSlides } from '../../database/schema';
import { AppError } from '../../shared/errors';

type ArticleRow = typeof articles.$inferSelect;

const image = (url: string | null, alt: string | null) => (url ? { url, alt: alt ?? '' } : null);

function toPreview(row: ArticleRow): ArticlePreview {
  return {
    slug: row.slug,
    tag: row.tag,
    title: row.title,
    lead: row.lead,
    cover: image(row.coverUrl, row.coverAlt),
    // Опубликованная статья всегда с датой (CHECK в БД).
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
  };
}

/** Абзацы разделены пустой строкой; разметки нет — текст выводится как есть. */
export const toParagraphs = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');

export async function findPublishedSlides(db: Database): Promise<HeroSlide[]> {
  const rows = await db
    .select()
    .from(heroSlides)
    .where(eq(heroSlides.isPublished, true))
    .orderBy(asc(heroSlides.position));
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    title: row.title,
    text: row.text,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    image: image(row.imageUrl, row.imageAlt),
  }));
}

export async function listArticles(
  db: Database,
  page: { limit: number; offset: number },
): Promise<ArticlesResponse> {
  const published = eq(articles.isPublished, true);
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(articles)
      .where(published)
      .orderBy(desc(articles.publishedAt))
      .limit(page.limit)
      .offset(page.offset),
    db.select({ value: count() }).from(articles).where(published),
  ]);
  return { items: rows.map(toPreview), total: total?.value ?? 0 };
}

export async function getArticle(db: Database, slug: string): Promise<Article> {
  const [row] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.isPublished, true)));
  if (!row) throw new AppError('NOT_FOUND', 'Такой статьи нет');
  return { ...toPreview(row), paragraphs: toParagraphs(row.body) };
}

export async function createConsultation(db: Database, input: ConsultationRequest): Promise<void> {
  await db.insert(consultationRequests).values({
    name: input.name,
    phone: input.phone,
    email: input.email ?? null,
    preferredTime: input.preferredTime ?? null,
    comment: input.comment ?? null,
  });
}
