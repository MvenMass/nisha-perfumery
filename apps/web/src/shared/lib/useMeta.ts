import { useEffect } from 'react';

const SITE = 'Ниша';

function setDescription(content: string) {
  let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'description';
    document.head.append(tag);
  }
  tag.content = content;
}

/** Заголовок вкладки и описание страницы. title без названия магазина: «Каталог» → «Каталог — Ниша». */
export function useMeta(title: string | undefined, description?: string) {
  useEffect(() => {
    if (title === undefined) return;
    document.title = `${title} — ${SITE}`;
    if (description) setDescription(description);
  }, [title, description]);
}
