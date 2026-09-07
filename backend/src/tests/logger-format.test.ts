import { logger } from '@/utils/logger';

it('discards raw messages and extra Winston metadata before transports', () => {
  const sensitive = 'synthetic-private-case-and-token';
  const record = logger.format.transform(
    {
      level: 'error',
      [Symbol.for('level')]: 'error',
      message: sensitive,
      exception: true,
      stack: sensitive,
      error: new Error(sensitive),
      process: { argv: [sensitive] },
      trace: [{ file: sensitive }],
    },
    logger.format.options,
  );
  expect(record).toMatchObject({ level: 'error' });
  expect(record).not.toHaveProperty('exception');
  expect(JSON.stringify(record)).toContain('logging.invalid_record');
  expect(JSON.stringify(record)).not.toContain(sensitive);
  if (typeof record !== 'object') throw new Error('Expected a formatted log record');
  expect(record[Symbol.for('message')]).toContain('INVALID_DIAGNOSTIC_RECORD');
  expect(record[Symbol.for('level')]).toBe('error');
  expect(logger.exitOnError).toBe(true);
});

it('preserves the safe diagnostic record on ordinary failures', () => {
  const message = JSON.stringify({ event: 'http.request.failed', errorCode: 'HTTP_ERROR', status: 403 });
  const record = logger.format.transform({ level: 'error', message }, logger.format.options);
  if (typeof record !== 'object') throw new Error('Expected a formatted log record');
  expect(JSON.parse(String(record.message))).toEqual(JSON.parse(message));
});
