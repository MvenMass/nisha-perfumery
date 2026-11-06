import { z } from 'zod';

import { productListItemSchema } from './catalog';
import { productDetailSchema } from './product';

/** GET /home — данные главной из БД; статичные тексты живут в коде. */
export const homeResponseSchema = z.object({
  bestsellers: z.array(productListItemSchema),
  /** Аромат для «Среза» (is_featured); null — администратор никого не отметил. */
  featured: productDetailSchema.nullable(),
});
export type HomeResponse = z.infer<typeof homeResponseSchema>;
