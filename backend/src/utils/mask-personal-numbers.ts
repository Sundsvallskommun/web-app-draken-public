import { luhnCheck } from './util';

const MASK = '[personnummer]';

// 12 or 10 digits, optionally with "-" or "+" (or its URL encoding) before the last four.
const PERSONAL_NUMBER_CANDIDATE = /(?<!\d)(?:\d{2})?\d{6}(?:-|\+|%2B)?\d{4}(?!\d)/gi;

/** Organization numbers have 20 or more where a personal number has its month, so they are kept. */
const isPersonalNumber = (candidate: string): boolean => {
  const digits = candidate.replace(/%2B/i, '').replace(/\D/g, '');
  const tenDigits = digits.length === 12 ? digits.slice(2) : digits;
  const month = Number(tenDigits.slice(2, 4));
  return month >= 1 && month <= 12 && luhnCheck(tenDigits);
};

/**
 * Replaces personal numbers in a text, such as a logged request URL or error message. Only valid
 * personal (and coordination) numbers are masked, so ids, dates and organization numbers stay readable.
 */
export const maskPersonalNumbers = (text: string): string =>
  text.replace(PERSONAL_NUMBER_CANDIDATE, candidate => (isPersonalNumber(candidate) ? MASK : candidate));
