import { useMeta } from '../../shared/lib/useMeta';
import { ButtonLink } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { SectionLabel } from '../../shared/ui/SectionLabel/SectionLabel';
import { StrataDivider } from '../../shared/ui/StrataDivider/StrataDivider';
import styles from './NotFoundPage.module.css';

type NotFoundPageProps = {
  title?: string | undefined;
  text?: string | undefined;
};

// Общая страница «не нашли»: неизвестный адрес, снятый с продажи или несуществующий товар.
export function NotFoundPage({
  title = 'Такой породы здесь нет',
  text = 'Возможно, ссылка устарела или образец сняли с продажи. Загляните в каталог — там все ароматы дома.',
}: NotFoundPageProps) {
  useMeta('Страница не найдена');
  return (
    <Container className={styles.page}>
      <SectionLabel>Глубина −404&nbsp;м · пустая порода</SectionLabel>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.text}>{text}</p>
      <StrataDivider
        depth="−404 м"
        label="Пустота"
        layers={[
          { height: 1, color: 'lineStrong' },
          { height: 4, color: 'walnut' },
          { height: 2, color: 'stone' },
        ]}
      />
      <div className={styles.actions}>
        <ButtonLink to="/catalog" iconEnd="arrow-right">
          В&nbsp;каталог
        </ButtonLink>
        <ButtonLink to="/" variant="outline">
          На&nbsp;главную
        </ButtonLink>
      </div>
    </Container>
  );
}
