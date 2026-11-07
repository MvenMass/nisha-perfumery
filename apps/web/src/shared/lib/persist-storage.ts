import { createJSONStorage } from 'zustand/middleware';

/*
 * localStorage для persist-сторов. Safari в приватном режиме и браузеры с заблокированными
 * данными сайта бросают исключение на обращение к нему — тогда сторы работают в памяти
 * до перезагрузки, а не роняют страницу.
 */

function warn(action: string, error: unknown): void {
  console.warn(`localStorage недоступен (${action}), данные останутся до перезагрузки`, error);
}

export const persistStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    try {
      return window.localStorage.getItem(name);
    } catch (error) {
      warn('чтение', error);
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      window.localStorage.setItem(name, value);
    } catch (error) {
      warn('запись', error);
    }
  },
  removeItem: (name: string) => {
    try {
      window.localStorage.removeItem(name);
    } catch (error) {
      warn('удаление', error);
    }
  },
}));
