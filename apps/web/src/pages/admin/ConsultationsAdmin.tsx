import { consultationStatusSchema } from '@nisha/contracts';
import type { ConsultationStatus } from '@nisha/contracts';
import { useState } from 'react';

import { useConsultations, useSetConsultationStatus } from '../../features/admin/content-api';
import { formatDate } from '../../shared/lib/date';
import { useMeta } from '../../shared/lib/useMeta';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Select } from '../../shared/ui/Field/Select';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './Admin.module.css';

const LABELS: Record<ConsultationStatus, string> = {
  new: 'Новая',
  contacted: 'Связались',
  done: 'Готово',
};

/** Заявки на консультацию в бутике: кто, когда удобно, что уже сделали. */
export function ConsultationsAdmin() {
  useMeta('Заявки — админка');
  const [filter, setFilter] = useState<ConsultationStatus | 'all'>('new');
  const requests = useConsultations(filter);
  const setStatus = useSetConsultationStatus();

  let content;
  if (requests.isPending) content = <Skeleton height={240} />;
  else if (requests.isError)
    content = <EmptyState icon="alert" title="Не удалось загрузить заявки" />;
  else if (requests.data.length === 0) content = <EmptyState icon="clock" title="Заявок нет" />;
  else
    content = (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="visually-hidden">Заявки на консультацию</caption>
          <thead>
            <tr>
              <th scope="col">Дата</th>
              <th scope="col">Имя и контакты</th>
              <th scope="col">Удобное время</th>
              <th scope="col">Комментарий</th>
              <th scope="col">Статус</th>
            </tr>
          </thead>
          <tbody>
            {requests.data.map((request) => (
              <tr key={request.id}>
                <td className={styles.num}>{formatDate(request.createdAt)}</td>
                <td>
                  {request.name}
                  <br />
                  <a href={`tel:${request.phone.replace(/[^\d+]/g, '')}`} className={styles.link}>
                    {request.phone}
                  </a>
                  {request.email && (
                    <>
                      <br />
                      <span className={styles.muted}>{request.email}</span>
                    </>
                  )}
                </td>
                <td>{request.preferredTime ?? '—'}</td>
                <td>{request.comment ?? '—'}</td>
                <td>
                  <Select
                    label={<span className="visually-hidden">Статус заявки {request.name}</span>}
                    value={request.status}
                    disabled={setStatus.isPending}
                    onChange={(event) => {
                      const parsed = consultationStatusSchema.safeParse(event.target.value);
                      if (parsed.success) setStatus.mutate({ id: request.id, status: parsed.data });
                    }}
                  >
                    {consultationStatusSchema.options.map((option) => (
                      <option key={option} value={option}>
                        {LABELS[option]}
                      </option>
                    ))}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <section aria-labelledby="admin-requests-title" className={styles.main}>
      <div className={styles.head}>
        <h1 id="admin-requests-title" className={styles.title}>
          Заявки на консультацию
        </h1>
      </div>
      <div className={styles.toolbar}>
        <Select
          label="Показать"
          value={filter}
          onChange={(event) => {
            const value = event.target.value;
            const parsed = consultationStatusSchema.safeParse(value);
            setFilter(parsed.success ? parsed.data : 'all');
          }}
        >
          <option value="all">Все</option>
          {consultationStatusSchema.options.map((option) => (
            <option key={option} value={option}>
              {LABELS[option]}
            </option>
          ))}
        </Select>
      </div>
      {content}
    </section>
  );
}
