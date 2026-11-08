import type { StoreInfo } from '@nisha/contracts';

import { useStoreInfo } from '../../entities/store/queries';
import { formatPrice } from '../../shared/lib/money';
import { plural } from '../../shared/lib/plural';
import { NBSP } from '../../shared/lib/typograph';
import { useMeta } from '../../shared/lib/useMeta';
import { Accordion } from '../../shared/ui/Accordion/Accordion';
import { Container } from '../../shared/ui/Container/Container';
import { Prose } from '../../shared/ui/Prose/Prose';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { STATIC_PAGES } from './static-content';
import type { StaticPageKey } from './static-content';
import styles from './StaticPage.module.css';

const days = (range: string) => {
  const last = Number(/(\d+)\D*$/.exec(range)?.[1] ?? 0);
  return `${range}${NBSP}${plural(last, ['день', 'дня', 'дней'])}`;
};

/** Цены и сроки — из настроек магазина: те же, что посчитает оформление. */
function DeliveryFacts({ store }: { store: StoreInfo }) {
  return (
    <>
      <h2>Способы доставки</h2>
      <ul>
        <li>
          Курьером{NBSP}— {days(store.courierDays)}, {formatPrice(store.courierPriceKopecks)}.
        </li>
        <li>
          В{NBSP}пункт выдачи СДЭК{NBSP}— {days(store.pickupPointDays)},{' '}
          {formatPrice(store.pickupPointPriceKopecks)}.
        </li>
        <li>
          Самовывоз из{NBSP}бутика{NBSP}— бесплатно: {store.boutiqueAddress}, {store.boutiqueHours}.
        </li>
      </ul>
      <p>
        Доставка бесплатна для заказов от{NBSP}
        {formatPrice(store.freeDeliveryThresholdKopecks)}.
      </p>
    </>
  );
}

function ContactFacts({ store }: { store: StoreInfo }) {
  return (
    <>
      <h2>Бутик</h2>
      <p>
        {store.boutiqueAddress}
        <br />
        {store.boutiqueHours}
      </p>
    </>
  );
}

/** Одна страница-шаблон для «О доме», «Доставки», «Возврата», «Контактов», FAQ и условий. */
export function StaticPage({ page }: { page: StaticPageKey }) {
  const content = STATIC_PAGES[page];
  useMeta(content.title.replace(/\u00A0/g, ' '), content.lead);
  const store = useStoreInfo();

  return (
    <Container className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>{content.title}</h1>
        <p className={styles.lead}>{content.lead}</p>
      </div>
      <Prose>
        {'store' in content &&
          (store.data ? (
            content.store === 'delivery' ? (
              <DeliveryFacts store={store.data} />
            ) : (
              <ContactFacts store={store.data} />
            )
          ) : (
            <Skeleton height={120} />
          ))}
        {'blocks' in content &&
          content.blocks.map((block, index) => (
            // Блоки статичны, их порядок не меняется.
            <section key={index} className={styles.block}>
              {'heading' in block && <h2>{block.heading}</h2>}
              {'paragraphs' in block &&
                block.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {'items' in block && (
                <ol className={styles.steps}>
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              )}
            </section>
          ))}
      </Prose>
      {'faq' in content && (
        <div className={styles.faq}>
          {content.faq.map((item) => (
            <Accordion key={item.question} title={item.question}>
              <p className={styles.answer}>{item.answer}</p>
            </Accordion>
          ))}
        </div>
      )}
    </Container>
  );
}
