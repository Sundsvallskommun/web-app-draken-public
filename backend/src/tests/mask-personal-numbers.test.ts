import { maskPersonalNumbers } from '@/utils/mask-personal-numbers';

import { mockInvalidPersonNumber, mockOrganizationNumber, mockPersonNumber, mockPersonNumberShort } from './helpers/mock-data';

describe('maskPersonalNumbers', () => {
  it('masks personal numbers with 12 or 10 digits, with or without a separator', () => {
    expect(maskPersonalNumbers(`citizen/2281/${mockPersonNumber}/guid`)).toBe('citizen/2281/[personnummer]/guid');
    expect(maskPersonalNumbers(`?query=${mockPersonNumberShort}&page=0`)).toBe('?query=[personnummer]&page=0');
    expect(maskPersonalNumbers(`${mockPersonNumberShort.slice(0, 6)}-${mockPersonNumberShort.slice(6)}`)).toBe('[personnummer]');
    expect(maskPersonalNumbers(`${mockPersonNumberShort.slice(0, 6)}%2B${mockPersonNumberShort.slice(6)}`)).toBe('[personnummer]');
  });

  it('masks every personal number in the text', () => {
    expect(maskPersonalNumbers(`firstName~'*${mockPersonNumber}*' or lastName~'*${mockPersonNumber}*'`)).toBe(
      "firstName~'*[personnummer]*' or lastName~'*[personnummer]*'",
    );
  });

  it('keeps organization numbers, numbers with a wrong check digit and longer digit runs', () => {
    expect(maskPersonalNumbers(mockOrganizationNumber)).toBe(mockOrganizationNumber);
    expect(maskPersonalNumbers(mockInvalidPersonNumber)).toBe(mockInvalidPersonNumber);
    expect(maskPersonalNumbers(`id ${mockPersonNumber}7`)).toBe(`id ${mockPersonNumber}7`);
  });

  it('keeps text without personal numbers as it is', () => {
    expect(maskPersonalNumbers('2026-11-02 10:15:00 info: GET /api/me 200')).toBe('2026-11-02 10:15:00 info: GET /api/me 200');
  });
});
