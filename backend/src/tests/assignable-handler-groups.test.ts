import { resolveAssignableHandlerGroups } from '@/config/assignable-handler-groups';

describe('assignable handler group configuration', () => {
  it.each([undefined, '', '   '])('uses the existing admin group when the list is %j', configuredGroups => {
    vi.stubEnv('ASSIGNABLE_HANDLER_GROUPS', undefined);
    expect(resolveAssignableHandlerGroups(configuredGroups, ' admins ')).toEqual(['admins']);
  });

  afterEach(() => vi.unstubAllEnvs());

  it('selects only the explicit groups and removes repeated group names case-insensitively', () => {
    const groups = resolveAssignableHandlerGroups(' Unit_Managers, LEX_Investigators, unit_managers, MAS_MAR ', 'admins');

    expect(groups).toEqual(['Unit_Managers', 'LEX_Investigators', 'MAS_MAR']);
    expect(Object.isFrozen(groups)).toBe(true);
  });

  it.each([',', 'one,', ',one', 'one, ,two'])('rejects an empty entry in %j', groups => {
    expect(() => resolveAssignableHandlerGroups(groups, 'admins')).toThrow('non-empty AD group names');
  });

  it('requires a default group when no explicit groups are configured', () => {
    expect(() => resolveAssignableHandlerGroups('', '')).toThrow('ADMIN_GROUP must be set');
  });

  it('reads every group of a comma-separated ADMIN_GROUP when no handler groups are configured', () => {
    expect(resolveAssignableHandlerGroups('', 'MOCK_UNIT_MANAGERS, MOCK_LEX_MANAGERS, mock_unit_managers')).toEqual([
      'MOCK_UNIT_MANAGERS',
      'MOCK_LEX_MANAGERS',
    ]);
  });
});
