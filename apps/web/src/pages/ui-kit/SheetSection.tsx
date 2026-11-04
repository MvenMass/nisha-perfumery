import { useState } from 'react';

import { Accordion } from '../../shared/ui/Accordion/Accordion';
import { Button } from '../../shared/ui/Button/Button';
import { Chip } from '../../shared/ui/Chip/Chip';
import { SectionLabel } from '../../shared/ui/SectionLabel/SectionLabel';
import { Sheet } from '../../shared/ui/Sheet/Sheet';
import { Demo, kitStyles as styles, Section } from './Section';

const SORTS = ['Популярные', 'Дешевле', 'Новинки'];

// Шторка фильтров по catalog-filters-mobile.html.
export function SheetSection() {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState('Популярные');

  return (
    <Section id="sheet" title="Шторка">
      <Demo title="Sheet: фильтры каталога (Esc, клик по подложке, фокус-ловушка)">
        <div className={styles.row}>
          <Button variant="outline" aria-haspopup="dialog" onClick={() => setOpen(true)}>
            Фильтры
          </Button>
        </div>
      </Demo>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Фильтры"
        closeLabel="Закрыть фильтры"
        footer={
          <>
            <Button variant="outline" onClick={() => setSort('Популярные')}>
              Сбросить
            </Button>
            <Button className={styles.footerButtons} onClick={() => setOpen(false)}>
              Показать 4&nbsp;образца
            </Button>
          </>
        }
      >
        <div className={styles.filterPanel}>
          <div className={styles.filterGroup}>
            <SectionLabel as="span">Сортировка</SectionLabel>
            <div className={styles.row}>
              {SORTS.map((item) => (
                <Chip key={item} pressed={sort === item} onClick={() => setSort(item)}>
                  {item}
                </Chip>
              ))}
            </div>
          </div>
          <Accordion title="Категория" count={1} variant="filter">
            <p className={styles.lead}>Женские ароматы</p>
          </Accordion>
          <Accordion title="Цена" variant="filter">
            <p className={styles.lead}>Диапазон цен</p>
          </Accordion>
          <Accordion title="Плотность" count={1} variant="filter">
            <p className={styles.lead}>Высокая</p>
          </Accordion>
        </div>
      </Sheet>
    </Section>
  );
}
