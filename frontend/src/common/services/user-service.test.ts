import { describe, expect, test, vi } from 'vitest';

import { Admin, getInitialsFromADUsername } from './user-service';

vi.mock('@common/services/api-service', () => ({ apiService: { get: vi.fn() } }));
vi.mock('@config/appconfig', () => ({ appConfig: {} }));

const admin = (adAccount: string, firstName: string, lastName: string): Admin => ({
  displayName: `${lastName} ${firstName}`.trim(),
  firstName,
  lastName,
  adAccount,
  id: adAccount,
});

describe('getInitialsFromADUsername', () => {
  test('returns first name and last name initials', () => {
    expect(getInitialsFromADUsername('anna01', [admin('anna01', 'Anna Maria', 'Svensson')])).toBe('AS');
  });

  test('uses only the last name initial when the first name is missing', () => {
    expect(getInitialsFromADUsername('sven01', [admin('sven01', '', 'Svensson')])).toBe('S');
  });

  test('returns undefined when no admin has the username', () => {
    expect(getInitialsFromADUsername('unknown', [admin('anna01', 'Anna', 'Svensson')])).toBeUndefined();
  });
});
