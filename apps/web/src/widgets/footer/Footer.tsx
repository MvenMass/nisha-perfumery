import { Link } from 'react-router';

import { Accordion } from '../../shared/ui/Accordion/Accordion';
import { Container } from '../../shared/ui/Container/Container';
import { Icon } from '../../shared/ui/Icon/Icon';
import type { IconName } from '../../shared/ui/Icon/Icon';
import styles from './Footer.module.css';

type FooterLink = { to: string; label: string };
type FooterSection = { title: string; links: readonly FooterLink[] };

// Разделы и ссылки — из home.html. Страницы появятся в этапах 4 и 8.
const SECTIONS: readonly FooterSection[] = [
  {
    title: 'Каталог',
    links: [
      { to: '/catalog?category=women', label: 'Женские ароматы' },
      { to: '/catalog?category=men', label: 'Мужские ароматы' },
      { to: '/catalog?category=home', label: 'Для дома' },
      { to: '/catalog?category=gift-sets', label: 'Подарочные наборы' },
      { to: '/catalog?category=samples', label: 'Пробники' },
    ],
  },
  {
    title: 'Информация',
    links: [
      { to: '/about', label: 'О доме' },
      { to: '/delivery', label: 'Доставка и оплата' },
      { to: '/returns', label: 'Возврат и обмен' },
      { to: '/contacts', label: 'Контакты' },
    ],
  },
  {
    title: 'Помощь',
    links: [
      { to: '/fragrance-finder', label: 'Подбор аромата' },
      { to: '/faq', label: 'Частые вопросы' },
      { to: '/how-to-order', label: 'Как заказать' },
    ],
  },
];

export type SocialLinks = Partial<Record<'instagram' | 'telegram' | 'pinterest', string>>;

const SOCIAL_LABELS: Record<keyof SocialLinks, string> = {
  instagram: 'Instagram',
  telegram: 'Telegram',
  pinterest: 'Pinterest',
};

type FooterProps = {
  /** Ссылки на соцсети из конфига; без ссылки иконка не показывается. */
  socials?: SocialLinks | undefined;
};

function LinkList({ links }: { links: readonly FooterLink[] }) {
  return (
    <ul className={styles.links}>
      {links.map((link) => (
        <li key={link.to}>
          <Link to={link.to} className={styles.link}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Footer({ socials = {} }: FooterProps) {
  const socialEntries = (Object.keys(SOCIAL_LABELS) as Array<keyof SocialLinks>).flatMap((key) => {
    const href = socials[key];
    return href ? [{ key, href }] : [];
  });

  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <span className={styles.logo}>НИША</span>
            <p className={styles.tagline}>Ароматы, которые становятся частью вашей истории.</p>
            {socialEntries.length > 0 && (
              <ul className={styles.socials}>
                {socialEntries.map(({ key, href }) => (
                  <li key={key}>
                    <a
                      href={href}
                      className={styles.social}
                      aria-label={SOCIAL_LABELS[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon name={key satisfies IconName} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.accordions}>
            {SECTIONS.map((section) => (
              <Accordion key={section.title} title={section.title}>
                <nav aria-label={section.title}>
                  <LinkList links={section.links} />
                </nav>
              </Accordion>
            ))}
          </div>

          <div className={styles.columns}>
            {SECTIONS.map((section) => (
              <nav key={section.title} aria-label={section.title} className={styles.column}>
                <p className={styles.columnTitle}>{section.title}</p>
                <LinkList links={section.links} />
              </nav>
            ))}
          </div>
        </div>

        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} Ниша, парфюмерный дом</span>
          <span>Глубина&nbsp;−240&nbsp;м · коренная порода</span>
        </div>
      </Container>
    </footer>
  );
}
