import type { RelatedReport } from './related-reports';

/**
 * Example reports on the brukare, for the test environment: there the drake's reports can live in a Support Management
 * that CaseStatus does not read, so the real list stays empty. Shown only where the deployment turns on
 * `useRelatedReportsMock`. The numbers say they are examples.
 */
export const MOCK_RELATED_REPORTS: readonly RelatedReport[] = Object.freeze([
  {
    caseId: 'mock-related-report-1',
    errandNumber: 'MOCK-0001',
    externalStatus: 'Handläggning pågår',
    caseType: 'Fall',
    subcategory: 'Fall vid patientens egna aktiviteter',
  },
  {
    caseId: 'mock-related-report-2',
    errandNumber: 'MOCK-0002',
    externalStatus: 'Avslutat',
    caseType: 'Fall utan skada',
  },
  {
    caseId: 'mock-related-report-3',
    errandNumber: 'MOCK-0003',
    externalStatus: 'Inskickat',
    caseType: 'Fall',
    subcategory: 'Fall med personal - Hjälpmedel',
  },
]);
