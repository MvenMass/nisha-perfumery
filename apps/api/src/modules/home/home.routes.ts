import { homeResponseSchema } from '@nisha/contracts';
import type { HomeResponse } from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Database } from '../../database/client';
import { findBestsellers, findFeaturedSlug } from '../catalog/catalog.repository';
import { getProduct, toListItem } from '../catalog/catalog.service';
import { findPublishedSlides, listArticles } from '../content/content.service';

// Четыре этикетки в «Образцах породы» — как в home.html.
const BESTSELLERS_LIMIT = 4;
// Три статьи в превью журнала — как в home.html.
const JOURNAL_LIMIT = 3;

export async function getHome(db: Database): Promise<HomeResponse> {
  const [bestsellers, featuredSlug, slides, journal] = await Promise.all([
    findBestsellers(db, BESTSELLERS_LIMIT),
    findFeaturedSlug(db),
    findPublishedSlides(db),
    listArticles(db, { limit: JOURNAL_LIMIT, offset: 0 }),
  ]);
  return {
    bestsellers: bestsellers.map(toListItem),
    featured: featuredSlug ? await getProduct(db, featuredSlug) : null,
    slides,
    articles: journal.items,
  };
}

export const homeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/home', { schema: { response: { 200: homeResponseSchema } } }, () => getHome(app.db));
};
