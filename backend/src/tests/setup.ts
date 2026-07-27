// Vitest setupFiles bootstrap — runs before any module is imported, so env
// defaults are in place when config/logger/services initialize. Keep this to env
// bootstrapping only (no fixtures, no mocks).

// routing-controllers / class-validator decorators read metadata via reflect-metadata.
// Import it once for the whole test run so decorated classes can be imported in tests.
import 'reflect-metadata';

// logger.ts resolves `join(__dirname, LOG_DIR)` and mkdirs it at import time.
// Give it a default so the real logger can initialize when a test pulls it in.
process.env.LOG_DIR = process.env.LOG_DIR ?? 'logs';

// ad-role.service.ts dereferences these group vars at IMPORT time to build
// `roleADMapping`; importing it (directly or via authorization.service) throws if
// they are unset. APPLICATION selects which mapping branch is built — a non
// PT/MEX value gives the support-management branch (developer/admin/superadmin),
// which the authorization tests assert against.
process.env.APPLICATION = process.env.APPLICATION ?? 'KC';
process.env.DEVELOPER_GROUP = process.env.DEVELOPER_GROUP ?? 'draken_developers';
process.env.ADMIN_GROUP = process.env.ADMIN_GROUP ?? 'draken_admins';
process.env.SUPERADMIN_GROUP = process.env.SUPERADMIN_GROUP ?? 'draken_superadmins';

// authorizeGroups() splits AUTHORIZED_GROUPS at call time; seed it so tests that
// exercise authorization have a known allow-list.
process.env.AUTHORIZED_GROUPS = process.env.AUTHORIZED_GROUPS ?? 'draken_users,draken_developers';
