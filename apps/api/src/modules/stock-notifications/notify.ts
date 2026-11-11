import { and, eq, isNull } from 'drizzle-orm';

import type { Database } from '../../database/client';
import { products, stockNotifications } from '../../database/schema';
import type { Mailer } from '../mailer/mailer';

export type RestockResult = { sent: number; failed: Array<{ email: string; error: unknown }> };

/**
 * Письма «Снова в наличии» подписчикам товара (D-029, D-042). Каждое письмо отмечается
 * отдельно: если одно не ушло, остальные не страдают, а неотправленная подписка останется
 * активной и получит письмо при следующем пополнении.
 */
export async function notifyRestock(
  deps: { db: Database; mailer: Mailer; webOrigin: string },
  productId: string,
): Promise<RestockResult> {
  const [product] = await deps.db
    .select({ name: products.name, slug: products.slug })
    .from(products)
    .where(eq(products.id, productId));
  if (!product) return { sent: 0, failed: [] };

  const subscribers = await deps.db
    .select({ id: stockNotifications.id, email: stockNotifications.email })
    .from(stockNotifications)
    .where(and(eq(stockNotifications.productId, productId), isNull(stockNotifications.notifiedAt)));

  const result: RestockResult = { sent: 0, failed: [] };
  for (const subscriber of subscribers) {
    try {
      await deps.mailer.send({
        to: subscriber.email,
        subject: `«${product.name}» снова в наличии`,
        text: `Образец «${product.name}», о котором вы просили напомнить, снова можно заказать. Партии у нас небольшие, поэтому лучше не откладывать:\n${deps.webOrigin}/catalog/${product.slug}`,
      });
    } catch (error) {
      result.failed.push({ email: subscriber.email, error });
      continue;
    }
    await deps.db
      .update(stockNotifications)
      .set({ notifiedAt: new Date() })
      .where(eq(stockNotifications.id, subscriber.id));
    result.sent += 1;
  }
  return result;
}
