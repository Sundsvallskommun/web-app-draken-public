export const queryKeys = {
  user: {
    me: ['user', 'me'] as const,
    admins: ['user', 'admins'] as const,
  },
  featureFlags: ['featureFlags'] as const,
  supportMetadata: (municipalityId: string) => ['supportMetadata', municipalityId] as const,
  supportErrands: (municipalityId: string, filters?: Record<string, unknown>) =>
    ['supportErrands', municipalityId, filters] as const,
  supportErrand: (errandNumber: string) => ['supportErrand', errandNumber] as const,
  casedataErrands: (municipalityId: string, filters?: Record<string, unknown>) =>
    ['casedataErrands', municipalityId, filters] as const,
  casedataErrand: (errandNumber: string) => ['casedataErrand', errandNumber] as const,
  supportMessages: (errandId: string, municipalityId: string) =>
    ['supportMessages', errandId, municipalityId] as const,
  supportAttachments: (errandId: string, municipalityId: string) =>
    ['supportAttachments', errandId, municipalityId] as const,
} as const;
