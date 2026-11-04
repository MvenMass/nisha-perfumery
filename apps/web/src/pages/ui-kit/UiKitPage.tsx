import { Container } from '../../shared/ui/Container/Container';
import { Footer } from '../../widgets/footer/Footer';
import { Header } from '../../widgets/header/Header';
import { BrandSection } from './BrandSection';
import { ControlsSection } from './ControlsSection';
import { FoundationsSection } from './FoundationsSection';
import { NavigationSection } from './NavigationSection';
import { SheetSection } from './SheetSection';
import styles from './UiKitPage.module.css';

// Витрина дизайн-системы. Маршрут /_ui существует только в dev-сборке (см. app/App.tsx).
export function UiKitPage() {
  return (
    <>
      <Header cartCount={3} />
      <Container as="main" className={styles.main}>
        <div className={styles.intro}>
          <h1 className={styles.title}>Дизайн-система</h1>
          <p className={styles.lead}>
            Все компоненты и&nbsp;состояния из&nbsp;макетов docs/design. Проверяйте на&nbsp;360, 768
            и&nbsp;1440&nbsp;px, клавиатурой и&nbsp;с&nbsp;reduced motion.
          </p>
        </div>
        <FoundationsSection />
        <ControlsSection />
        <NavigationSection />
        <BrandSection />
        <SheetSection />
      </Container>
      <Footer socials={{ instagram: '#', telegram: '#', pinterest: '#' }} />
    </>
  );
}
