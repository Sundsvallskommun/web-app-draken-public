// Shared identifiers for backend tests. setup.ts seeds these as env vars before
// any module loads, and tests assert against the same values — import from here
// instead of re-declaring so the two can't drift.

export const MOCK_DEVELOPER_GROUP = 'draken_developers';
export const MOCK_ADMIN_GROUP = 'draken_admins';
export const MOCK_SUPERADMIN_GROUP = 'draken_superadmins';
export const MOCK_AUTHORIZED_GROUPS = 'draken_users,draken_developers';
