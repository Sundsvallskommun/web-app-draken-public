import type { InvestigationProfileDocument } from '../supportmanagement/investigation/investigation-profile';

export type InvestigationDocumentKey = InvestigationProfileDocument['key'];

export type InvestigationFormData = Record<string, unknown>;

export type InvestigationDocumentDefinition = InvestigationProfileDocument;
