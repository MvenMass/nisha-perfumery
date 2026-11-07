import type { FastifyBaseLogger } from 'fastify';

export type Mail = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Отправка писем (D-042). Сейчас — в лог, позже рядом встанет SMTP-реализация
 * с тем же интерфейсом; модули о способе доставки не знают.
 */
export type Mailer = {
  send: (mail: Mail) => Promise<void>;
};

export function createConsoleMailer(log: FastifyBaseLogger): Mailer {
  return {
    send: async (mail) => {
      log.info({ mail }, `Письмо для ${mail.to}: ${mail.subject}`);
    },
  };
}

/** Для тестов: письма складываются в массив, чтобы проверить содержимое и достать ссылки. */
export function createMemoryMailer(): Mailer & { sent: Mail[] } {
  const sent: Mail[] = [];
  return {
    sent,
    send: async (mail) => {
      sent.push(mail);
    },
  };
}
