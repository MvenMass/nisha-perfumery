import type {
  CatalogFiltersResponse,
  CatalogQuery,
  ProductDetail,
  ProductListItem,
  ProductListResponse,
} from '@nisha/contracts';

import type { Database } from '../../database/client';
import { AppError } from '../../shared/errors';
import {
  findFilterFacets,
  findProductBySlug,
  findProductParts,
  findProducts,
  findRelated,
  findStoreSettings,
} from './catalog.repository';
import type { ListItemRow } from './catalog.repository';

const RELATED_LIMIT = 4;

export function toListItem(row: ListItemRow): ProductListItem {
  const { materialSlug, materialName, ...rest } = row;
  return { ...rest, material: { slug: materialSlug, name: materialName } };
}

export async function listProducts(
  db: Database,
  query: CatalogQuery,
): Promise<ProductListResponse> {
  const { rows, total } = await findProducts(db, query);
  return { items: rows.map(toListItem), total, limit: query.limit, offset: query.offset };
}

export async function getCatalogFilters(db: Database): Promise<CatalogFiltersResponse> {
  const facets = await findFilterFacets(db);
  const { min, max } = facets.price ?? { min: null, max: null };
  return {
    categories: facets.categoryRows,
    materials: facets.materialRows,
    collections: facets.collectionRows,
    densities: facets.densityRows,
    volumes: facets.volumeRows,
    // min / max приходят из pg строкой — тип integer, но агрегат без mapWith.
    price:
      min === null || max === null ? null : { minKopecks: Number(min), maxKopecks: Number(max) },
  };
}

async function requireVisibleProduct(db: Database, slug: string) {
  const row = await findProductBySlug(db, slug);
  // Черновик и несуществующий товар неразличимы снаружи: оба — 404.
  if (!row) throw new AppError('NOT_FOUND', 'Такого образца нет');
  return row;
}

export async function getProduct(db: Database, slug: string): Promise<ProductDetail> {
  const { product, material, collection } = await requireVisibleProduct(db, slug);
  const [parts, settings] = await Promise.all([
    findProductParts(db, product.id),
    findStoreSettings(db),
  ]);

  const notes: ProductDetail['notes'] = { top: [], heart: [], base: [] };
  for (const note of parts.notes) notes[note.level].push(note.name);

  return {
    id: product.id,
    slug: product.slug,
    specimenNumber: product.specimenNumber,
    name: product.name,
    collection: collection?.slug ? { slug: collection.slug, name: collection.name ?? '' } : null,
    material,
    categories: parts.categories,
    origin: product.origin,
    density: product.density,
    concentration: product.concentration,
    longevityHours: product.longevityHours,
    description: product.description,
    story: product.story,
    notes,
    layers: {
      topMinutes: product.topMinutes,
      heartMinutes: product.heartMinutes,
      baseMinutes: product.baseMinutes,
    },
    variants: parts.variants.map((variant) => ({
      id: variant.id,
      volumeMl: variant.volumeMl,
      sku: variant.sku,
      priceKopecks: variant.priceKopecks,
      stock: variant.stock,
      isLowStock: variant.stock > 0 && variant.stock <= settings.lowStockThreshold,
    })),
    images: parts.images,
    isBestseller: product.isBestseller,
    isNew: product.isNew,
  };
}

export async function getRelatedProducts(db: Database, slug: string): Promise<ProductListItem[]> {
  const { product } = await requireVisibleProduct(db, slug);
  const rows = await findRelated(db, product, RELATED_LIMIT);
  return rows.map(toListItem);
}
