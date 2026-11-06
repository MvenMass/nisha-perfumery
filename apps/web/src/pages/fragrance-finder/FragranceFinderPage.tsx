import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { toCatalogSearch } from '../../entities/product/lib/catalog-search';
import { useMeta } from '../../shared/lib/useMeta';
import { Breadcrumbs } from '../../shared/ui/Breadcrumbs/Breadcrumbs';
import { Button } from '../../shared/ui/Button/Button';
import { Container } from '../../shared/ui/Container/Container';
import { RadioCard } from '../../shared/ui/RadioCard/RadioCard';
import { SectionLabel } from '../../shared/ui/SectionLabel/SectionLabel';
import { answersToFilters, QUESTIONS } from './finder';
import type { FinderAnswers } from './finder';
import styles from './FragranceFinderPage.module.css';

export function FragranceFinderPage() {
  useMeta('Подбор аромата', 'Три вопроса — и «Ниша» покажет образцы, которые подойдут именно вам.');
  const [answers, setAnswers] = useState<FinderAnswers>({});
  const navigate = useNavigate();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void navigate(`/catalog?${toCatalogSearch(answersToFilters(answers)).toString()}`);
  };

  return (
    <Container className={styles.page}>
      <Breadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Подбор аромата' }]} />
      <div className={styles.intro}>
        <SectionLabel>Три вопроса</SectionLabel>
        <h1 className={styles.title}>Найдём вашу породу</h1>
        <p className={styles.lead}>
          Отвечать на&nbsp;всё не&nbsp;обязательно: пропущенный вопрос просто не&nbsp;сужает выбор.
        </p>
      </div>
      <form className={styles.form} onSubmit={submit}>
        {QUESTIONS.map((question, index) => (
          <fieldset key={question.id} className={styles.question}>
            <legend className={styles.legend}>
              <span className={styles.step}>
                {String(index + 1).padStart(2, '0')} / {String(QUESTIONS.length).padStart(2, '0')}
              </span>
              {question.title}
            </legend>
            <div className={styles.options}>
              {question.options.map((option) => (
                <RadioCard
                  key={option.value}
                  name={question.id}
                  value={option.value}
                  title={option.title}
                  description={option.description}
                  checked={answers[question.id] === option.value}
                  onChange={() => setAnswers({ ...answers, [question.id]: option.value })}
                />
              ))}
            </div>
          </fieldset>
        ))}
        <Button type="submit" size="xl" iconEnd="arrow-right" className={styles.submit}>
          Показать образцы
        </Button>
      </form>
    </Container>
  );
}
