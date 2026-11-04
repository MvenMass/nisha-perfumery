import { useState } from 'react';

import { Button, ButtonLink } from '../../shared/ui/Button/Button';
import { Checkbox } from '../../shared/ui/Checkbox/Checkbox';
import { Input } from '../../shared/ui/Field/Input';
import { Select } from '../../shared/ui/Field/Select';
import { Textarea } from '../../shared/ui/Field/Textarea';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { QuantityStepper } from '../../shared/ui/QuantityStepper/QuantityStepper';
import { RadioCard } from '../../shared/ui/RadioCard/RadioCard';
import { Demo, kitStyles as styles, Section } from './Section';

const DELIVERY = [
  { value: 'courier', icon: 'truck', title: 'Курьером', description: '1–5 дней', aside: '490 ₽' },
  {
    value: 'pickup',
    icon: 'box',
    title: 'В пункт выдачи',
    description: '2–6 дней',
    aside: '290 ₽',
  },
  {
    value: 'boutique',
    icon: 'pin',
    title: 'Самовывоз из бутика',
    description: 'Можно попробовать на месте',
    aside: 'бесплатно',
  },
] as const;

export function ControlsSection() {
  const [favorite, setFavorite] = useState(false);
  const [quantity, setQuantity] = useState(2);
  const [delivery, setDelivery] = useState<string>('courier');
  const [category, setCategory] = useState(true);

  return (
    <Section id="controls" title="Кнопки и формы">
      <Demo title="Button">
        <div className={styles.row}>
          <Button iconEnd="arrow-right">Смотреть образцы</Button>
          <Button variant="outline">Показать ещё</Button>
          <Button variant="link" iconEnd="arrow-right">
            Читать журнал
          </Button>
          <Button size="xl">Добавить в&nbsp;корзину</Button>
          <Button size="md" variant="outline">
            Сообщить
          </Button>
          <Button disabled>Недоступно</Button>
          <ButtonLink to="/catalog" variant="outline" size="md">
            В&nbsp;каталог (ссылка)
          </ButtonLink>
        </div>
      </Demo>

      <Demo title="IconButton">
        <div className={styles.row}>
          <IconButton icon="search" label="Поиск" />
          <IconButton icon="bag" label="Корзина, 3 товара" badge={3} />
          <IconButton icon="plus" variant="primary" label="В корзину: Базальт" />
          <IconButton
            icon="heart"
            variant="outline"
            size={56}
            label="В избранное"
            pressed={favorite}
            onClick={() => setFavorite((value) => !value)}
          />
          <IconButton icon="close" label="Удалить: Базальт" />
        </div>
      </Demo>

      <Demo title="Поля">
        <div className={styles.formGrid}>
          <Input label="Имя и&nbsp;фамилия" autoComplete="name" placeholder="Анна Морозова" />
          <Input label="Телефон" type="tel" autoComplete="tel" defaultValue="+7 " />
          <Input
            label="Электронная почта"
            type="email"
            defaultValue="name@example"
            error="Проверьте адрес: не хватает домена"
          />
          <Input label="Город" hint="Доставляем по России" defaultValue="Москва" />
          <Select label="Сортировка" compact defaultValue="popular">
            <option value="popular">Популярные</option>
            <option value="cheap">Сначала дешевле</option>
            <option value="expensive">Сначала дороже</option>
            <option value="new">Новинки</option>
          </Select>
          <Input label="Неактивное поле" disabled defaultValue="Нельзя изменить" />
        </div>
        <Textarea label="Комментарий курьеру" />
      </Demo>

      <Demo title="Checkbox">
        <div className={`${styles.stack} ${styles.narrow}`}>
          <Checkbox
            label="Женские ароматы"
            count={7}
            checked={category}
            onChange={(event) => setCategory(event.target.checked)}
          />
          <Checkbox label="Мужские ароматы" count={6} />
          <Checkbox
            label="Высокая"
            adornment={
              <span aria-hidden="true" className={styles.densityBars}>
                <span className={styles.densityBar} />
                <span className={styles.densityBar} />
                <span className={styles.densityBar} />
              </span>
            }
          />
          <Checkbox label="Недоступно" disabled />
        </div>
      </Demo>

      <Demo title="RadioCard">
        <fieldset className={styles.stack}>
          <legend className="visually-hidden">Способ доставки</legend>
          {DELIVERY.map((option) => (
            <RadioCard
              key={option.value}
              name="delivery"
              value={option.value}
              icon={option.icon}
              title={option.title}
              description={option.description}
              aside={option.aside}
              checked={delivery === option.value}
              onChange={() => setDelivery(option.value)}
            />
          ))}
        </fieldset>
      </Demo>

      <Demo title="QuantityStepper">
        <div className={styles.row}>
          <QuantityStepper value={quantity} max={3} itemName="Базальт" onChange={setQuantity} />
          <QuantityStepper value={1} max={10} size="lg" onChange={() => undefined} />
        </div>
      </Demo>
    </Section>
  );
}
