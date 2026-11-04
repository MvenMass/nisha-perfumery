import type { ReactNode } from 'react';

import styles from './UiKitPage.module.css';

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={styles.section}>
      <h2 id={`${id}-title`} className={styles.sectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Demo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.stack}>
      <h3 className={styles.subTitle}>{title}</h3>
      {children}
    </div>
  );
}

export { styles as kitStyles };
