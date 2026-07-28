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

// authorizeGroups() splits AUTHORIZED_GROUPS at call time; seed it so tests that
// exercise authorization have a known allow-list.
process.env.AUTHORIZED_GROUPS = process.env.AUTHORIZED_GROUPS ?? MOCK_AUTHORIZED_GROUPS;

// config/index.ts destructures process.env into module-level consts at IMPORT time, and
// controllers read them when constructed. Seed the ones the support-errand controller
// builds its URLs from, so tests see stable, non-undefined values. Tests assert against
// these through mockMunicipalityId/mockSupportNamespace in helpers/mock-data.ts - keep
// the two in sync.
process.env.MUNICIPALITY_ID = process.env.MUNICIPALITY_ID ?? '2281';
process.env.SUPPORTMANAGEMENT_NAMESPACE = process.env.SUPPORTMANAGEMENT_NAMESPACE ?? 'CONTACTCENTER';

// apiURL() prefixes relative urls with API_BASE_URL; without it they start with 'undefined/'.
process.env.API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.test.local';