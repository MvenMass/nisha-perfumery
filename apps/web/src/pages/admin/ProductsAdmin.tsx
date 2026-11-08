import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { formatSpecimenNumber } from '../../entities/product/lib/format';
import { useAdminProducts } from '../../features/admin/catalog-api';
import { formatPrice } from '../../shared/lib/money';
import { useDebouncedValue } from '../../shared/lib/useDebouncedValue';
import { useMeta } from '../../shared/lib/useMeta';
import { Badge } from '../../shared/ui/Badge/Badge';
import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Input } from '../../shared/ui/Field/Input';
import { Select } from '../../shared/ui/Field/Select';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './Admin.module.css';

type Status = 'published' | 'draft';
const isStatus = (value: string | null): value is Status =>
  value === 'published' || value === 'draft';

export function ProductsAdmin() {
  useMeta('Товары — админка');
  const [params, setParams] = useSearchParams();
  const raw = params.get('status');
  const status = isStatus(raw) ? raw : undefined;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebouncedValue(search.trim(), 300);
  const products = useAdminProducts({ q: q || undefined, status });

  const update = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  let content;
  if (products.isPending) {
    content = <Skeleton height={360} />;
  } else if (products.isError) {
    content = (
      <EmptyState
        icon="alert"
        title="Не удалось загрузить товары"
        action={
          <Button variant="outline" size="md" onClick={() => void products.refetch()}>
            Повторить
          </Button>
        }
      />
    );
  } else if (products.data.items.length === 0) {
    content = <EmptyState icon="stone" title="Образцов не нашлось" />;
  } else {
    content = (
      <div className={styles.tableWrap}>
        <table className={styles.table} aria-busy={products.isFetching}>
          <caption className="visually-hidden">Образцы</caption>
          <thead>
            <tr>
              <th scope="col">№</th>
              <th scope="col">
                <span className="visually-hidden">Снимок</span>
              </th>
              <th scope="col">Название</th>
              <th scope="col">Материал</th>
              <th scope="col" className={styles.right}>
                Цена от
              </th>
              <th scope="col" className={styles.right}>
                Остаток
              </th>
              <th scope="col">Статус</th>
            </tr>
          </thead>
          <tbody>
            {products.data.items.map((product) => (
              <tr key={product.id}>
                <td className={styles.num}>{formatSpecimenNumber(product.specimenNumber)}</td>
                <td>
                  {product.image ? (
                    <img src={product.image.url} alt="" className={styles.thumb} loading="lazy" />
                  ) : (
                    <span aria-hidden="true" className={styles.thumb} />
                  )}
                </td>
                <td>
                  <Link to={`/admin/products/${product.id}`} className={styles.link}>
                    {product.name}
                  </Link>
                  {product.isFeatured && (
                    <span className={styles.muted}> · срез на&nbsp;главной</span>
                  )}
                </td>
                <td>{product.materialName}</td>
                <td className={`${styles.num} ${styles.right}`}>
                  {product.priceFromKopecks === null ? '—' : formatPrice(product.priceFromKopecks)}
                </td>
                <td className={`${styles.num} ${styles.right}`}>
                  {product.totalStock}
                  <span className={styles.muted}> / {product.variantsCount}&nbsp;об.</span>
                </td>
                <td>
                  <Badge tone={product.isPublished ? 'light' : 'outline'}>
                    {product.isPublished ? 'На витрине' : 'Черновик'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section aria-labelledby="admin-products-title" className={styles.main}>
      <div className={styles.head}>
        <h1 id="admin-products-title" className={styles.title}>
          Товары
        </h1>
        <ButtonLink to="/admin/products/new" size="md">
          Новый образец
        </ButtonLink>
      </div>
      <div className={styles.toolbar}>
        <Input
          label="Поиск образцов"
          type="search"
          placeholder="Название, адрес или номер"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            update('q', event.target.value.trim() || undefined);
          }}
        />
        <Select
          label="Статус"
          value={status ?? ''}
          onChange={(event) => update('status', event.target.value || undefined)}
        >
          <option value="">Все</option>
          <option value="published">На витрине</option>
          <option value="draft">Черновики</option>
        </Select>
      </div>
      {content}
    </section>
  );
}
