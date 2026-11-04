import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Без глобальных afterEach Testing Library сама не размонтирует компоненты.
afterEach(() => {
  cleanup();
});

// jsdom не умеет прокручивать окно; Sheet восстанавливает прокрутку после закрытия.
if (typeof window !== 'undefined') {
  window.scrollTo = () => undefined;
}
