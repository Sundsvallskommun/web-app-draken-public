export const mockEnv = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  application_name: process.env.NEXT_PUBLIC_APPLICATION ?? '',
  mockPersonNumber: '199001012385',
  mockInvalidPersonNumber: '199001012386',
  mockNonexistentPersonNumber: '199909092380',
  // Test person number (Skatteverket) used by the PT errand fixture's owner.
  mockPtPersonNumber: '199001162396',
  mockOrganizationNumber: '556026-9986',
  mockInvalidOrganizationNumber: '556026-9987',
  mockEmail: 'a@example.com',
  mockRecipientEmail: ' mail@example.com',
  mockPhoneNumber: '0701740635',
  mockPhoneNumberCountryCode: '+46701740635',
  // Distinct from mockPhoneNumber so two stakeholders in the same view don't share a number
  // (avoids strict-mode collisions when asserting per-stakeholder phone). PTS test range.
  mockSecondaryPhoneNumber: '0701740636',
  mockAdUsername: 'abc01abc',
} as const;
