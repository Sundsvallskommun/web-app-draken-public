// Shared test values for the backend unit tests, mirroring the `env` block in
// frontend/cypress.config.ts. Tests must not hardcode person numbers, organization
// numbers, phone numbers or party ids - import them from here instead, so there is a
// single place to check that no production-like identifier ever enters the repo.

// IMPORTANT
// The value below is a test person number from Skatteverket, it is not a real person number
export const mockPersonNumber = '199001012385';
// The same test person number in its 10-digit form. Note its third digit is 0, which is what
// tells the errand search it is a person number rather than an organization number.
export const mockPersonNumberShort = '9001012385';
// The value below is an invalid test person number for testing validation, it is not a real person number
export const mockInvalidPersonNumber = '199001012386';
// The value below is a non existing test person number for testing validation, it is not a real person number
export const mockNonexistentPersonNumber = '199909092380';

// The value below is an organization number for testing validation, it is not a real organization number.
// Its third digit is 6, which is what tells the errand search it is an organization number.
export const mockOrganizationNumber = '556026-9986';
// The same test organization number without the separator, as it arrives from a search field.
export const mockOrganizationNumberDigits = '5560269986';
// The value below is an invalid test organization number for testing validation, it is not a real organization number
export const mockInvalidOrganizationNumber = '556026-9987';

// The value below is a test phone number from Post- och telestyrelsen, it is not a real phone number
export const mockPhoneNumber = '0701740635';
// The value below is a test phone number from Post- och telestyrelsen, it is not a real phone number
export const mockPhoneNumberCountryCode = '+46701740635';
// A second test phone number from Post- och telestyrelsen, it is not a real phone number
export const mockSecondaryPhoneNumber = '0701740636';

// The values below are test emails, they are not real emails
export const mockEmail = 'a@example.com';
export const mockRecipientEmail = 'mail@example.com';

// The value below is a test username, it is not a real username
export const mockAdUsername = 'abc01abc';

// Party ids are opaque UUIDs assigned by the citizen/legal entity services. These are
// syntactically valid but arbitrary, they do not identify anyone.
export const mockCitizenPartyId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
// A second citizen party id, so two stakeholders on the same errand do not share one
export const mockSecondaryCitizenPartyId = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
export const mockOrganizationPartyId = '11111111-2222-4333-8444-555555555555';

// Test names and addresses, they do not identify anyone
export const mockFirstName = 'Anna';
export const mockLastName = 'Andersson';
export const mockOrganizationName = 'Testbolaget AB';
export const mockStreet = 'Storgatan 1';
export const mockZipCode = '851 85';
export const mockCity = 'Sundsvall';
export const mockCareOf = 'c/o Testsson';

// Errand identifiers used across the support-errand tests
export const mockSupportErrandId = 'errand-1';
export const mockSupportErrandNumber = 'KC-2026-000001';
export const mockCasedataErrandId = 99;
export const mockCasedataErrandNumber = 'MEX-2026-000001';
export const mockAttachmentId = 'att-1';
export const mockRelationId = 'relation-1';
export const mockConversationId = 'conversation-1';
export const mockDepartment = 'MEX';
// The message id Messaging returns, plus a decision and its attachment (CaseData numbers both)
export const mockMessageId = 'message-1';
export const mockDecisionId = 1;
export const mockDecisionAttachmentId = 2;

// Attachment fixtures
export const mockFileName = 'brev.pdf';
export const mockMultiDotFileName = 'rapport.v2.pdf';
export const mockMimeType = 'application/pdf';
export const mockFileContent = 'Hej';

// Property designations, they are not real properties
export const mockPropertyDesignation = 'SUNDSVALL BÖLE 1:1';
export const mockSecondaryPropertyDesignation = 'SUNDSVALL HAGA 2:3';

// The values below are seeded as env vars by src/tests/setup.ts before any module loads
// (@/config snapshots process.env at import time), and are imported by the tests that
// assert against them, so the two cannot drift.
export const mockMunicipalityId = '2281';
export const mockSupportNamespace = 'CONTACTCENTER';
export const MOCK_DEVELOPER_GROUP = 'draken_developers';
export const MOCK_ADMIN_GROUP = 'draken_admins';
export const MOCK_SUPERADMIN_GROUP = 'draken_superadmins';
export const MOCK_AUTHORIZED_GROUPS = 'draken_users,draken_developers';
