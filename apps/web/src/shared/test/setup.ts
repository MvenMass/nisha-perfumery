import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Без глобальных afterEach Testing Library сама не размонтирует компоненты.
afterEach(() => {
  cleanup();
});
