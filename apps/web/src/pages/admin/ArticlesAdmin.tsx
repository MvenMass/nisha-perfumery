import { articleInputSchema } from '@nisha/contracts';
import type { AdminArticle, ArticleInput } from '@nisha/contracts';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import {
  useAdminArticle,
  useAdminArticles,
  useDeleteArticle,
  useSaveArticle,
} from '../../features/admin/content-api';
import { ApiError } from '../../shared/api/http';
import { formatDate } from '../../shared/lib/date';
import { fieldErrors } from '../../shared/lib/form';
import { useMeta } from '../../shared/lib/useMeta';
import { Badge } from '../../shared/ui/Badge/Badge';
import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { Checkbox } from '../../shared/ui/Checkbox/Checkbox';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Input } from '../../shared/ui/Field/Input';
import { Textarea } from '../../shared/ui/Field/Textarea';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './Admin.module.css';
import { ImageUploadField } from './ImageUploadField';

export function ArticlesAdmin() {
  useMeta('Журнал — админка');
  const articles = useAdminArticles();

  return (
    <section aria-labelledby="admin-articles-title" className={styles.main}>
      <div className={styles.head}>
        <h1 id="admin-articles-title" className={styles.title}>
          Журнал
        </h1>
        <ButtonLink to="/admin/articles/new" size="md">
          Новая статья
        </ButtonLink>
      </div>
      {articles.isPending ? (
        <Skeleton height={320} />
      ) : articles.isError ? (
        <EmptyState icon="alert" title="Не удалось загрузить статьи" />
      ) : (
        <ul className={styles.facts}>
          {articles.data.map((article) => (
            <li key={article.id} className={styles.fact}>
              <span>
                <Link to={`/admin/articles/${article.id}`} className={styles.link}>
                  {article.title}
                </Link>{' '}
                <span className={styles.muted}>· {article.tag}</span>
              </span>
              <span className={styles.actions}>
                {article.publishedAt && (
                  <span className={styles.muted}>{formatDate(article.publishedAt)}</span>
                )}
                <Badge tone={article.isPublished ? 'light' : 'outline'}>
                  {article.isPublished ? 'Опубликована' : 'Черновик'}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const EMPTY: ArticleInput = {
  slug: '',
  tag: '',
  title: '',
  lead: '',
  body: '',
  coverUrl: null,
  coverAlt: null,
  isPublished: false,
};

function ArticleForm({ article }: { article: AdminArticle | undefined }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ArticleInput>(() => {
    if (!article) return EMPTY;
    const { id: _id, publishedAt: _publishedAt, updatedAt: _updatedAt, ...input } = article;
    return input;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveArticle(article?.id);
  const remove = useDeleteArticle();
  const set = (key: keyof ArticleInput) => (event: { target: { value: string } }) =>
    setDraft((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = articleInputSchema.safeParse({ ...draft, coverAlt: draft.coverAlt ?? '' });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate(parsed.data, {
      onSuccess: (saved) => {
        if (!article) void navigate(`/admin/articles/${saved.id}`, { replace: true });
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'CONFLICT')
          setErrors({ slug: error.message });
      },
    });
  };

  return (
    <form className={styles.main} onSubmit={submit} noValidate>
      <div className={styles.grid}>
        <Input label="Заголовок" value={draft.title} error={errors.title} onChange={set('title')} />
        <Input label="Рубрика" value={draft.tag} error={errors.tag} onChange={set('tag')} />
        <Input
          label="Адрес"
          hint="Латиница и дефисы: /journal/адрес"
          value={draft.slug}
          error={errors.slug}
          onChange={set('slug')}
        />
      </div>
      <Textarea
        label="Лид"
        rows={2}
        value={draft.lead}
        error={errors.lead}
        onChange={set('lead')}
      />
      <Textarea
        label="Текст"
        hint="Абзацы — через пустую строку"
        rows={14}
        value={draft.body}
        error={errors.body}
        onChange={set('body')}
      />
      <div className={styles.grid}>
        <ImageUploadField
          label="Обложка"
          url={draft.coverUrl}
          onChange={(coverUrl) => setDraft((current) => ({ ...current, coverUrl }))}
        />
        <Input
          label="Что на обложке"
          value={draft.coverAlt ?? ''}
          onChange={(event) =>
            setDraft((current) => ({ ...current, coverAlt: event.target.value }))
          }
        />
      </div>
      <Checkbox
        label="Опубликовать в журнале"
        checked={draft.isPublished}
        onChange={(event) =>
          setDraft((current) => ({ ...current, isPublished: event.target.checked }))
        }
      />
      {save.isError && !errors.slug && (
        <p role="alert" className={styles.error}>
          {save.error instanceof ApiError ? save.error.message : 'Не получилось сохранить'}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className={styles.ok}>
          Сохранено.
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" size="lg" disabled={save.isPending}>
          {save.isPending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
        {article?.isPublished && (
          <Link to={`/journal/${article.slug}`} className={styles.link}>
            Открыть в журнале
          </Link>
        )}
        {article && (
          <Button
            variant="link"
            size="md"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(article.id, {
                onSuccess: () => void navigate('/admin/articles', { replace: true }),
              })
            }
          >
            Удалить статью
          </Button>
        )}
      </div>
    </form>
  );
}

export function ArticleEditor() {
  const { articleId } = useParams();
  const id = articleId === 'new' ? undefined : articleId;
  const article = useAdminArticle(id);
  useMeta(article.data ? `${article.data.title} — админка` : 'Новая статья — админка');

  return (
    <section aria-labelledby="article-editor-title" className={styles.main}>
      <Link to="/admin/articles" className={styles.link}>
        ← Все статьи
      </Link>
      <h1 id="article-editor-title" className={styles.title}>
        {article.data?.title ?? (id ? 'Статья' : 'Новая статья')}
      </h1>
      {id && article.isPending ? (
        <Skeleton height={480} />
      ) : id && article.isError ? (
        <EmptyState icon="alert" title="Статья не найдена" />
      ) : (
        <ArticleForm key={article.data?.id ?? 'new'} article={article.data} />
      )}
    </section>
  );
}
