import type { SupportApplicationProfileDocument } from '../supportmanagement/application/support-application-profile';

export type InvestigationDocumentKey = SupportApplicationProfileDocument['key'];

export type InvestigationFormData = Record<string, unknown>;

export type InvestigationDocumentDefinition = SupportApplicationProfileDocument;
