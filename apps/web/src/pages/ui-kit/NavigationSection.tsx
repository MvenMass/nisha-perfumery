import { useState } from 'react';

import { NBSP } from '../../shared/lib/typograph';
import { Accordion } from '../../shared/ui/Accordion/Accordion';
import { Badge, StatusBadge } from '../../shared/ui/Badge/Badge';
import { Breadcrumbs } from '../../shared/ui/Breadcrumbs/Breadcrumbs';
import { Chip, RemovableChip } from '../../shared/ui/Chip/Chip';
import { Stepper } from '../../shared/ui/Stepper/Stepper';
import { Tabs } from '../../shared/ui/Tabs/Tabs';
import { Demo, kitStyles as styles, Section } from './Section';

// Свотчи хранятся у материала в БД (CLAUDE.md); здесь — те же значения для примера.
const MATERIALS = [
  { name: 'Известняк', swatch: '#B8AA96' },
  { name: 'Травертин', swatch: '#887D70' },
  { name: 'Базальт', swatch: '#292725' },
  { name: 'Орех', swatch: '#5A3A28' },
  { name: 'Янтарь', swatch: '#A85A32' },
];

const ORDER_TABS = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'done', label: 'Завершённые' },
] as const;

export function NavigationSection() {
  const [materials, setMaterials] = useState(['Базальт', 'Орех']);
  const [volume, setVolume] = useState('50 мл');
  const [tab, setTab] = useState<(typeof ORDER_TABS)[number]['value']>('all');

  const toggleMaterial = (name: string) =>
    setMaterials((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );

  return (
    <Section id="navigation" title="Фильтры, статусы, навигация">
      <Demo title="Chip со свотчем">
        <div className={styles.row}>
          {MATERIALS.map((material) => (
            <Chip
              key={material.name}
              swatch={material.swatch}
              pressed={materials.includes(material.name)}
              onClick={() => toggleMaterial(material.name)}
            >
              {material.name}
            </Chip>
          ))}
        </div>
      </Demo>

      <Demo title="Chip-сегмент (объём) и без свотча (сортировка)">
        <div className={`${styles.row} ${styles.narrow}`}>
          {['30 мл', '50 мл', '100 мл'].map((value) => (
            <Chip
              key={value}
              variant="segment"
              pressed={volume === value}
              onClick={() => setVolume(value)}
            >
              {value.replace(' ', NBSP)}
            </Chip>
          ))}
        </div>
        <div className={styles.row}>
          <Chip pressed>Популярные</Chip>
          <Chip pressed={false}>Дешевле</Chip>
          <Chip pressed={false}>Новинки</Chip>
        </div>
      </Demo>

      <Demo title="RemovableChip">
        <div className={styles.row}>
          {materials.map((name) => (
            <RemovableChip key={name} label={name} onClick={() => toggleMaterial(name)} />
          ))}
          <RemovableChip label="50 мл" />
        </div>
      </Demo>

      <Demo title="Badge и StatusBadge">
        <div className={styles.row}>
          <Badge tone="accent">Бестселлер</Badge>
          <Badge tone="light">Новый образец</Badge>
          <Badge tone="outline">Нет в&nbsp;наличии</Badge>
        </div>
        <div className={styles.row}>
          <StatusBadge shape="fill">В&nbsp;пути</StatusBadge>
          <StatusBadge shape="outline">Доставлен</StatusBadge>
          <StatusBadge shape="dashed">Отменён</StatusBadge>
        </div>
      </Demo>

      <Demo title="Stepper">
        <Stepper
          label="Шаги оформления"
          variant="mono"
          current={1}
          steps={[{ label: '01 · Контакты' }, { label: '02 · Доставка' }, { label: '03 · Оплата' }]}
        />
        <Stepper
          label="Статус заказа"
          current={2}
          steps={[
            { label: 'Оформлен', meta: '02.11' },
            { label: 'Оплачен', meta: '02.11' },
            { label: `Передан в${NBSP}доставку`, meta: '03.11' },
            { label: 'Доставлен', meta: 'ожидается 06.11' },
          ]}
        />
      </Demo>

      <Demo title="Tabs">
        <Tabs
          items={ORDER_TABS}
          value={tab}
          onChange={setTab}
          label="Фильтр заказов"
          panelId="orders-panel"
        />
        <p id="orders-panel" role="tabpanel" className={styles.lead}>
          Выбрано: {ORDER_TABS.find((item) => item.value === tab)?.label}
        </p>
      </Demo>

      <Demo title="Breadcrumbs">
        <Breadcrumbs
          items={[
            { label: 'Главная', to: '/' },
            { label: 'Каталог', to: '/catalog' },
            { label: 'Базальт' },
          ]}
        />
      </Demo>

      <Demo title="Accordion">
        <div className={styles.narrow}>
          <Accordion title="Каталог">
            <p className={styles.lead}>Ссылки раздела подвала.</p>
          </Accordion>
          <Accordion title="Категория" count={1} variant="filter" defaultOpen>
            <p className={styles.lead}>Содержимое фильтра.</p>
          </Accordion>
        </div>
      </Demo>
    </Section>
  );
}
