import { useStoreInfo } from '../../entities/store/queries';
import { useViewer } from '../../entities/user/queries';
import { ConsultationForm } from '../../features/consultation/ConsultationForm';
import { useMeta } from '../../shared/lib/useMeta';
import { Container } from '../../shared/ui/Container/Container';
import { Icon } from '../../shared/ui/Icon/Icon';
import { SectionLabel } from '../../shared/ui/SectionLabel/SectionLabel';
import { Skeleton } from '../../shared/ui/Skeleton/Skeleton';
import styles from './ConsultationPage.module.css';

export function ConsultationPage() {
  useMeta(
    'Консультация в бутике',
    'Запишитесь на консультацию: подберём аромат вживую в бутике «Ниши».',
  );
  const viewer = useViewer();
  const store = useStoreInfo();

  return (
    <Container className={styles.page}>
      <div className={styles.head}>
        <SectionLabel>Бутик</SectionLabel>
        <h1 className={styles.title}>Консультация</h1>
        <p className={styles.lead}>
          Полчаса с&nbsp;парфюмером: попробуем образцы на&nbsp;коже, поговорим о&nbsp;материалах
          и&nbsp;подберём аромат под настроение. Это бесплатно и&nbsp;ни&nbsp;к&nbsp;чему
          не&nbsp;обязывает.
        </p>
        {store.data && (
          <ul className={styles.facts}>
            <li>
              <Icon name="pin" size={20} />
              {store.data.boutiqueAddress}
            </li>
            <li>
              <Icon name="clock" size={20} />
              {store.data.boutiqueHours}
            </li>
          </ul>
        )}
      </div>
      {/* Пока не знаем, гость ли это, форму не показываем: иначе поля мигнут пустыми. */}
      {viewer === undefined ? <Skeleton height={360} /> : <ConsultationForm user={viewer} />}
    </Container>
  );
}
