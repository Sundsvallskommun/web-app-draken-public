import express from 'express';
import { useExpressServer } from 'routing-controllers';
import request from 'supertest';

import { assertDragonBuild } from '@/config/dragon-build';
import { configureSupportApplicationProfile, getSupportApplicationProfile } from '@/config/support-application-profile';
import { SupportApplicationPolicyService } from '@/services/support-application-policy.service';
import { startServer } from '@/shell/start-server';

import dragons from '../../../dragons.json';
import { APPLICATIONS } from './helpers/dragon-applications';
import { mockUser } from './helpers/http';
import { collectRegisteredRoutes } from './helpers/routes';

describe('individual dragon deployment boundaries', () => {
  it.each(Object.keys(dragons))('IAF refuses another runtime identity: %s', identity => {
    if (identity === 'IAF') expect(() => assertDragonBuild('IAF', identity)).not.toThrow();
    else expect(() => assertDragonBuild('IAF', identity)).toThrow('built for IAF');
  });

  it.each(['', 'iaf', 'UNKNOWN'])('refuses unknown identity %s', identity => {
    expect(() => assertDragonBuild('IAF', identity)).toThrow('Unknown dragon');
  });

  it.each(Object.entries(APPLICATIONS))('%s exposes only its composed API, even to an authenticated caller', async (id, { controllers }) => {
    const definition = dragons[id as keyof typeof dragons];
    const support = definition.domain === 'supportmanagement';
    const routes = collectRegisteredRoutes(controllers);
    expect(routes.some(route => route.path.startsWith('/supporterrands/'))).toBe(support);
    expect(routes.some(route => route.path.startsWith('/casedata/'))).toBe(!support);
    expect(routes.some(route => route.path.includes('/json-parameters/'))).toBe(['IAF', 'VOF'].includes(id));
    expect(new Set(controllers).size).toBe(controllers.length);

    const app = express();
    app.use((req, _res, next) => {
      Object.assign(req, { user: mockUser(), isAuthenticated: () => true });
      next();
    });
    useExpressServer(app, { controllers });
    expect((await request(app).get(support ? '/casedata/2281/errands/1' : '/supporterrands/2281/1')).status).toBe(404);
    if (support) expect((await request(app).get('/contracts')).status).toBe(404);
  });
});

describe('dragon-owned investigation composition', () => {
  it.each(Object.entries(APPLICATIONS))('%s selects its profile explicitly', (id, application) => {
    expect(Boolean(application.supportProfile)).toBe(dragons[id as keyof typeof dragons].domain === 'supportmanagement');
    if (!application.supportProfile) return;
    configureSupportApplicationProfile(application.supportProfile);
    const profile = getSupportApplicationProfile(id);
    expect(profile.application).toBe(id);
    expect(profile.documents).toHaveLength(['IAF', 'VOF'].includes(id) ? 3 : 0);
    expect(Boolean(new SupportApplicationPolicyService(undefined, profile).classificationPolicy)).toBe(['IAF', 'VOF'].includes(id));
    expect(getSupportApplicationProfile(id === 'IAF' ? 'VOF' : 'IAF').documents).toEqual([]);
  });
});

it('rejects a mismatched investigation profile before startup', async () => {
  vi.stubEnv('APPLICATION', 'IAF');
  try {
    await expect(startServer({ ...APPLICATIONS.IAF, supportProfile: APPLICATIONS.VOF.supportProfile })).rejects.toThrow(
      'does not belong to dragon IAF',
    );
  } finally {
    vi.unstubAllEnvs();
  }
});

it('validates application-owned API requirements before opening a server', async () => {
  vi.stubEnv('APPLICATION', 'IAF');
  vi.stubEnv('SUPPORTMANAGEMENT_API_TARGET', 'stable');
  try {
    await expect(startServer(APPLICATIONS.IAF)).rejects.toThrow('requires a different SupportManagement API target');
  } finally {
    vi.unstubAllEnvs();
  }
});

it('refuses to start an investigation dragon whose release did not declare the activation flag', async () => {
  vi.stubEnv('APPLICATION', 'IAF');
  vi.stubEnv('SUPPORTMANAGEMENT_API_TARGET', APPLICATIONS.IAF.supportProfile?.requiredSupportManagementApiTarget ?? 'stable');
  vi.stubEnv('NEXT_PUBLIC_USE_INVESTIGATION', '');
  try {
    await expect(startServer(APPLICATIONS.IAF)).rejects.toThrow('NEXT_PUBLIC_USE_INVESTIGATION must be declared true or false');
  } finally {
    vi.unstubAllEnvs();
  }
});

it('rejects an SM composition that omitted its registration policy before startup', async () => {
  vi.stubEnv('APPLICATION', 'KC');
  try {
    await expect(startServer({ ...APPLICATIONS.KC, supportProfile: undefined })).rejects.toThrow('requires an explicit application profile');
  } finally {
    vi.unstubAllEnvs();
  }
});

it('rejects a CaseData composition carrying SupportManagement policy', async () => {
  vi.stubEnv('APPLICATION', 'MEX');
  try {
    await expect(startServer({ ...APPLICATIONS.MEX, supportProfile: APPLICATIONS.KC.supportProfile })).rejects.toThrow(
      'must not configure a SupportManagement application profile',
    );
  } finally {
    vi.unstubAllEnvs();
  }
});

// The existing applications retain their reviewed taxonomy after moving ownership out of the shared service.
const existingRegistrationDefaults = {
  KC: {
    classification: {
      category: 'CONTACT_SUNDSVALL',
      type: 'UNCATEGORIZED',
    },
  },
  KA: {
    classification: {
      category: 'ADMINISTRATION',
      type: 'ADMINISTRATION/CONTACT_CENTER',
    },
    labels: {
      category: 'ADMINISTRATION',
      type: 'ADMINISTRATION/CONTACT_CENTER',
      subType: 'ADMINISTRATION/CONTACT_CENTER/GENERAL',
    },
  },
  LOP: {
    classification: {
      category: 'SALARY',
      type: 'SALARY.UNCATEGORIZED',
    },
    labels: {
      category: 'SALARY',
      type: 'SALARY/UNCATEGORIZED',
      subType: 'SALARY/UNCATEGORIZED/UNCATEGORIZED',
    },
  },
  IK: {
    classification: {
      category: 'KSK_SERVICE_CENTER',
      type: 'KSK_SERVICE_CENTER.UNCATEGORIZED',
    },
    labels: {
      category: 'KSK_SERVICE_CENTER',
      type: 'KSK_SERVICE_CENTER/UNCATEGORIZED',
    },
  },
  MSVA: {
    classification: {
      category: 'MSVA',
      type: 'MSVA.UNCATEGORIZED',
    },
  },
  ROB: {
    classification: {
      category: 'COMPLETE_RECRUITMENT',
      type: 'COMPLETE_RECRUITMENT.RETAKE',
    },
  },
  SE: {
    classification: {
      category: 'UNCATEGORIZED',
      type: 'UNCATEGORIZED/UNCATEGORISED',
    },
    labels: {
      category: 'UNCATEGORIZED',
      type: 'UNCATEGORIZED/UNCATEGORISED',
    },
  },
  BOU: {
    classification: {
      category: 'BOU',
      type: 'BOU/UNCATEGORIZED',
    },
    labels: {
      category: 'BOU',
      type: 'BOU/UNCATEGORIZED',
    },
  },
  LOK: {
    classification: {
      category: 'IAF',
      type: 'IAF/WORK_AND_LIVELIHOOD',
    },
    labels: {
      category: 'IAF',
      type: 'IAF/WORK_AND_LIVELIHOOD',
    },
  },
  IAF: {
    labels: {
      category: 'REPORT_TYPE',
      type: 'REPORT_TYPE/DEVIATION',
    },
    parameters: [
      {
        key: 'eventType',
        displayName: 'Rapporttyp',
        values: ['AVVIKELSE'],
      },
    ],
  },
  VOF: {
    labels: {
      category: 'REPORT_TYPE',
      type: 'REPORT_TYPE/DEVIATION',
    },
    parameters: [
      {
        key: 'eventType',
        displayName: 'Rapporttyp',
        values: ['AVVIKELSE'],
      },
    ],
  },
  AOT: {},
} as const;
it.each(Object.entries(existingRegistrationDefaults))('%s preserves registration defaults in its application profile', (id, defaults) => {
  expect(APPLICATIONS[id as keyof typeof APPLICATIONS].supportProfile?.registration).toEqual({ mode: 'enabled', defaults });
});
