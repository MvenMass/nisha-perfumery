import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { useProductSearch } from '../../entities/product/api/queries';
import { toCatalogSearch, emptyCatalogFilters } from '../../entities/product/lib/catalog-search';
import {
  formatSpecimenNumber,
  productHref,
  specimensCount,
} from '../../entities/product/lib/format';
import { formatPrice } from '../../shared/lib/money';
import { useDebouncedValue } from '../../shared/lib/useDebouncedValue';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Field/Input';
import { Sheet } from '../../shared/ui/Sheet/Sheet';
import styles from './SearchSheet.module.css';

const RESULTS_LIMIT = 6;
const MIN_LENGTH = 2;

type SearchSheetProps = {
  open: boolean;
  onClose: () => void;
};

/** Быстрый поиск из шапки: название, номер образца, материал или нота. */
export function SearchSheet({ open, onClose }: SearchSheetProps) {
  const [text, setText] = useState('');
  const query = useDebouncedValue(text.trim(), 250);
  const search = useProductSearch(query, RESULTS_LIMIT);
  const navigate = useNavigate();

  const catalogLink = `/catalog?${toCatalogSearch({ ...emptyCatalogFilters, q: query }).toString()}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (text.trim().length < MIN_LENGTH) return;
    const q = text.trim();
    onClose();
    void navigate(`/catalog?${toCatalogSearch({ ...emptyCatalogFilters, q }).toString()}`);
  };

  const close = () => {
    onClose();
    setText('');
  };

  let results = null;
  if (query.length < MIN_LENGTH) {
    results = <p className={styles.hint}>Например: ладан, базальт или номер образца «03».</p>;
  } else if (search.isError) {
    results = <p className={styles.hint}>Поиск сейчас не отвечает. Попробуйте ещё раз.</p>;
  } else if (search.data && search.data.total === 0) {
    results = (
      <p className={styles.hint}>
        По&nbsp;запросу «{query}» образцов нет. Попробуйте ноту: «ирис», «дым» или&nbsp;«кедр».
      </p>
    );
  } else if (search.data) {
    results = (
      <>
        <ul className={styles.results}>
          {search.data.items.map((item) => (
            <li key={item.id}>
              <Link to={productHref(item.slug)} className={styles.result} onClick={close}>
                <span className={styles.number}>
                  №&nbsp;{formatSpecimenNumber(item.specimenNumber)}
                </span>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.meta}>
                  {item.material.name} · от&nbsp;{formatPrice(item.priceFromKopecks)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {search.data.total > search.data.items.length && (
          <Link to={catalogLink} className={styles.all} onClick={close}>
            Все результаты: {specimensCount(search.data.total)}
          </Link>
        )}
      </>
    );
  }

  return (
    <Sheet open={open} onClose={close} title="Поиск" closeLabel="Закрыть поиск" side="right">
      <form role="search" className={styles.form} onSubmit={submit}>
        <Input
          label="Что ищем?"
          type="search"
          value={text}
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
        />
        <Button type="submit" size="lg" variant="outline">
          Найти
        </Button>
      </form>
      <div aria-live="polite" aria-busy={search.isFetching} className={styles.body}>
        {results}
      </div>
    </Sheet>
  );
}
