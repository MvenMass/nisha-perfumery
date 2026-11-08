import { z } from 'zod';

import { productListItemSchema } from './catalog';
import { articlePreviewSchema, heroSlideSchema } from './content';
import { productDetailSchema } from './product';

/** GET /home — данные главной из БД; остальные тексты главной живут в коде. */
export const homeResponseSchema = z.object({
  bestsellers: z.array(productListItemSchema),
  /** Аромат для «Среза» (is_featured); null — администратор никого не отметил. */
  featured: productDetailSchema.nullable(),
  /** Опубликованные слайды первого экрана по порядку. */
  slides: z.array(heroSlideSchema),
  /** Три последние статьи журнала. */
  articles: z.array(articlePreviewSchema),
});
export type HomeResponse = z.infer<typeof homeResponseSchema>;
