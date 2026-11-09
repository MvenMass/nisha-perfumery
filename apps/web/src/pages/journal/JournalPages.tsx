import { useRef } from 'react';
import { Link, useParams } from 'react-router';

import { useArticle, useArticles } from '../../entities/content/queries';
import { ApiError } from '../../shared/api/http';
import { formatDate } from '../../shared/lib/date';
import { useReveal } from '../../shared/lib/motion/useReveal';
import { typograph } from '../../shared/lib/typograph';
import { useMeta } from '../../shared/lib/useMeta';
import { Breadcrumbs } from '../../shared/ui/Breadcrumbs/Breadcrumbs';
import { Button } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { EmptyState } from '../../shared/ui/EmptyState/EmptyState';
import { Prose } from '../../shared/ui/Prose/Prose';
import { SectionLabel } from '../../shared/ui/SectionLabel/SectionLabel';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import { NotFoundPage } from '../../widgets/not-found/NotFoundPage';
import styles from './Journal.module.css';
import { Picture } from '../../shared/ui/Picture/Picture';

/** Журнал: статьи о материалах, мастерской и людях дома. Тексты — из админки. */
export function JournalPage() {
  useMeta('Журнал', 'Журнал парфюмерного дома «Ниша»: материалы, мастерская, интервью.');
  const articles = useArticles();
  const pageRef = useRef<HTMLDivElement>(null);
  useReveal(pageRef, [articles.isPending]);

  let content;
  if (articles.isPending) {
    content = (
      <ul className={styles.grid} aria-busy="true">
        {[0, 1, 2].map((key) => (
          <li key={key}>
            <Skeleton height={360} />
          </li>
        ))}
      </ul>
    );
  } else if (articles.isError) {
    content = (
      <EmptyState
        icon="alert"
        title="Не удалось загрузить журнал"
        action={
          <Button variant="outline" size="md" onClick={() => void articles.refetch()}>
            Повторить
          </Button>
        }
      />
    );
  } else if (articles.data.items.length === 0) {
    content = <EmptyState title="Скоро здесь появятся первые статьи" />;
  } else {
    content = (
      <ul className={styles.grid}>
        {articles.data.items.map((article) => (
          <li key={article.slug} className={styles.card}>
            {article.cover ? (
              <div data-reveal="media">
                <Picture
                  src={article.cover.url}
                  alt=""
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className={styles.cover}
                />
              </div>
            ) : (
              <span aria-hidden="true" className={styles.cover} />
            )}
            <SectionLabel tone="muted">
              {article.tag} · {formatDate(article.publishedAt)}
            </SectionLabel>
            <h2 className={styles.cardTitle}>
              <Link to={`/journal/${article.slug}`} className={styles.cardLink}>
                {typograph(article.title)}
              </Link>
            </h2>
            <p className={styles.lead}>{typograph(article.lead)}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Container ref={pageRef} className={styles.page}>
      <div className={styles.head}>
        <SectionLabel>Журнал</SectionLabel>
        <h1 className={styles.title} data-reveal="text">
          Искусство, скрытое в&nbsp;деталях
        </h1>
      </div>
      {content}
    </Container>
  );
}

export function ArticlePage() {
  const { slug = '' } = useParams();
  const article = useArticle(slug);
  useMeta(article.data?.title ?? 'Журнал', article.data?.lead);
  const pageRef = useRef<HTMLDivElement>(null);
  useReveal(pageRef, [article.data?.slug]);

  if (article.isPending) {
    return (
      <Container className={styles.page}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="80%" height={64} />
        <Skeleton height={320} />
      </Container>
    );
  }
  if (article.isError) {
    if (article.error instanceof ApiError && article.error.code === 'NOT_FOUND') {
      return <NotFoundPage title="Такой статьи нет" />;
    }
    return (
      <Container className={styles.page}>
        <EmptyState
          icon="alert"
          headingLevel="h1"
          title="Не удалось загрузить статью"
          action={
            <Button variant="outline" size="md" onClick={() => void article.refetch()}>
              Повторить
            </Button>
          }
        />
      </Container>
    );
  }

  const data = article.data;
  return (
    <Container ref={pageRef} as="section" className={styles.page}>
      <Breadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: 'Журнал', to: '/journal' },
          { label: data.title },
        ]}
      />
      <header className={styles.articleHead}>
        <SectionLabel>
          {data.tag} · {formatDate(data.publishedAt)}
        </SectionLabel>
        <h1 className={styles.articleTitle} data-reveal="text">
          {typograph(data.title)}
        </h1>
        <p className={styles.articleLead}>{typograph(data.lead)}</p>
      </header>
      {data.cover && (
        <div data-reveal="media" className={styles.articleCoverFrame}>
          <Picture
            src={data.cover.url}
            alt={data.cover.alt}
            sizes="(min-width: 1100px) 1040px, 100vw"
            priority
            className={styles.articleCover}
          />
        </div>
      )}
      <Prose>
        {data.paragraphs.map((paragraph, index) => (
          // Порядок абзацев неизменен, индекс — устойчивый ключ.
          <p key={index}>{typograph(paragraph)}</p>
        ))}
      </Prose>
      <Link to="/journal" className={styles.back}>
        ← Все статьи журнала
      </Link>
    </Container>
  );
}
