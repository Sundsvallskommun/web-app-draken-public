// Shared mock values for unit tests (src/**/*.test.ts) and the Playwright suite (e2e/).
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
  mockCompanyName: 'Testbolaget AB',
  // Fake addresses: no real street, and Swedish postal codes never start with 0. Postal codes keep the
  // space users often type, so code under test can show it normalizes.
  mockCompanyAddress: { street: 'Testgatan 1', postalCode: '000 01', city: 'Teststad' },
  // The premises (besöksadress) — distinct from the company address so tests can tell the sources apart.
  mockPremisesAddress: { street: 'Testgatan 2', postalCode: '000 02', city: 'Teststad' },
  // A non-owner stakeholder's address, distinct from both of the above.
  mockContactAddress: { street: 'Testgatan 3', postalCode: '000 03', city: 'Teststad' },
} as const;
