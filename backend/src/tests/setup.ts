// Vitest setupFiles bootstrap — runs before any module is imported, so env
// defaults are in place when config/logger/services initialize. Keep this to env
// bootstrapping only (no fixtures, no mocks).

// routing-controllers / class-validator decorators read metadata via reflect-metadata.
// Import it once for the whole test run so decorated classes can be imported in tests.
import 'reflect-metadata';

import { MOCK_ADMIN_GROUP, MOCK_AUTHORIZED_GROUPS, MOCK_DEVELOPER_GROUP, MOCK_SUPERADMIN_GROUP } from './helpers/mock-data';

process.env.LOG_DIR = process.env.LOG_DIR ?? 'logs';

process.env.APPLICATION = process.env.APPLICATION ?? 'KC';
process.env.DEVELOPER_GROUP = process.env.DEVELOPER_GROUP ?? MOCK_DEVELOPER_GROUP;
process.env.ADMIN_GROUP = process.env.ADMIN_GROUP ?? MOCK_ADMIN_GROUP;
process.env.SUPERADMIN_GROUP = process.env.SUPERADMIN_GROUP ?? MOCK_SUPERADMIN_GROUP;

process.env.AUTHORIZED_GROUPS = process.env.AUTHORIZED_GROUPS ?? MOCK_AUTHORIZED_GROUPS;
