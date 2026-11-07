import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { uuidV4 } from './uuid';

describe('uuidV4', () => {
  it('выдаёт корректные и разные UUID версии 4', () => {
    const values = Array.from({ length: 50 }, uuidV4);
    for (const value of values) {
      expect(z.uuid({ version: 'v4' }).safeParse(value).success).toBe(true);
    }
    expect(new Set(values).size).toBe(values.length);
  });
});
