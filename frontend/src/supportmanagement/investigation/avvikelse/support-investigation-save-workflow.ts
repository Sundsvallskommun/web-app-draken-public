import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import type { AxiosError } from 'axios';

import type {
  IafVofInvestigationClassificationLabelTree,
  IafVofInvestigationClassificationLegalBaseRule,
} from './iaf-vof-investigation-classification-policy';
import type { InvestigationDocumentKey, InvestigationFormData } from './investigation-document';
import {
  applyIafLabelClassificationSelection,
  createIafLabelClassificationModel,
  getIafLabelClassificationSelection,
  getPersistedIafLabelClassificationState,
  type IafLabelClassificationModel,
  type IafLabelClassificationUpdate,
} from './label-classification';
import {
  buildSupportInvestigationClassificationRequest,
  isSupportInvestigationClassificationConflict,
  saveSupportInvestigationClassification,
  type SupportInvestigationClassificationResponse,
} from './support-investigation-classification-service';
import {
  isSupportInvestigationConflict,
  type SavedSupportInvestigationDocument,
  saveSupportInvestigationDocument,
} from './support-investigation-service';

export interface InvestigationClassificationDraft {
  readonly labels: Label[];
  readonly category: string;
  readonly type: string;
  readonly subType: string;
  readonly classificationHasSubTypes: boolean;
}

export interface PreparedInvestigationClassification {
  readonly model: IafLabelClassificationModel;
  readonly update: IafLabelClassificationUpdate;
}

interface PrepareClassificationInput {
  readonly required: boolean;
  readonly dirty: boolean;
  readonly labelTree?: IafVofInvestigationClassificationLabelTree;
  readonly labelStructure: readonly Label[] | undefined;
  readonly legalBases: readonly string[];
  readonly legalBaseRules: readonly IafVofInvestigationClassificationLegalBaseRule[];
  readonly persistedClassification: InvestigationClassificationDraft;
  readonly triggerValidation: () => Promise<boolean>;
  readonly getDraft: () => InvestigationClassificationDraft;
}

const persistedClassificationError = (
  state: ReturnType<typeof getPersistedIafLabelClassificationState>
): string | undefined => {
  if (state === 'known-valid' || state === 'legacy-unknown') return undefined;
  if (state === 'known-disallowed-legal-base') {
    return 'Den befintliga kategoriseringen stämmer inte med valda lagrum. Välj en giltig avvikelsetyp och underkategori.';
  }
  if (state === 'known-missing-required-type') return 'Välj underkategori innan utredningen sparas.';
  return 'Välj avvikelsetyp och underkategori innan utredningen sparas.';
};

export async function prepareInvestigationClassification({
  required,
  dirty,
  labelTree,
  labelStructure,
  legalBases,
  legalBaseRules,
  persistedClassification,
  triggerValidation,
  getDraft,
}: PrepareClassificationInput): Promise<PreparedInvestigationClassification | undefined> {
  if (!required) return undefined;

  if (!dirty && labelTree) {
    const persistedState = getPersistedIafLabelClassificationState(
      labelStructure,
      labelTree,
      legalBases,
      persistedClassification,
      legalBaseRules
    );
    const errorMessage = persistedClassificationError(persistedState);
    if (errorMessage) {
      await triggerValidation();
      throw new Error(errorMessage);
    }
    return undefined;
  }

  if (!dirty) return undefined;
  if (!labelTree) {
    throw new Error('Klassificeringsprofilens labelträd saknas. Ladda om sidan innan utredningen sparas.');
  }
  if (!(await triggerValidation())) {
    throw new Error('Välj avvikelsetyp och underkategori innan utredningen sparas.');
  }

  const draft = getDraft();
  const model = createIafLabelClassificationModel(labelStructure, labelTree, legalBases, legalBaseRules);
  const selection = getIafLabelClassificationSelection(model, draft.labels, draft);

  return {
    model,
    update: applyIafLabelClassificationSelection(model, draft.labels, selection),
  };
}

interface SaveDocumentStepInput {
  readonly municipalityId: string;
  readonly errandId: string;
  readonly documentKey: InvestigationDocumentKey;
  readonly schemaId: string;
  readonly value: InvestigationFormData;
  readonly persisted: boolean;
  readonly etag?: string;
  readonly parentErrandVersion: number | undefined;
  readonly documentDirty: boolean;
  readonly classificationDirty: boolean;
  readonly documentSavedPendingClassification: boolean;
}

export async function saveInvestigationDocumentStep({
  municipalityId,
  errandId,
  documentKey,
  schemaId,
  value,
  persisted,
  etag,
  parentErrandVersion,
  documentDirty,
  classificationDirty,
  documentSavedPendingClassification,
}: SaveDocumentStepInput): Promise<SavedSupportInvestigationDocument | undefined> {
  const mustCreateDocumentBeforeClassification = !persisted && classificationDirty;
  const shouldWriteDocument = documentDirty || mustCreateDocumentBeforeClassification;
  if (documentSavedPendingClassification || !shouldWriteDocument) return undefined;

  if (
    typeof parentErrandVersion !== 'number' ||
    !Number.isSafeInteger(parentErrandVersion) ||
    parentErrandVersion < 0
  ) {
    throw new Error('Ärendets version saknas. Ladda om ärendet innan utredningen sparas.');
  }

  return saveSupportInvestigationDocument(
    municipalityId,
    errandId,
    documentKey,
    { schemaId, value },
    parentErrandVersion,
    etag
  );
}

interface SaveClassificationStepInput {
  readonly municipalityId: string;
  readonly errandId: string;
  readonly documentKey: InvestigationDocumentKey;
  readonly prepared?: PreparedInvestigationClassification;
  readonly parentErrandVersion: number | undefined;
  readonly documentETag: string | undefined;
}

export async function saveInvestigationClassificationStep({
  municipalityId,
  errandId,
  documentKey,
  prepared,
  parentErrandVersion,
  documentETag,
}: SaveClassificationStepInput): Promise<SupportInvestigationClassificationResponse | undefined> {
  if (!prepared) return undefined;
  const request = buildSupportInvestigationClassificationRequest(
    prepared.update,
    parentErrandVersion,
    documentKey,
    documentETag
  );
  return saveSupportInvestigationClassification(municipalityId, errandId, request);
}

export function investigationSaveSuccessMessage(documentSaved: boolean, classificationSaved: boolean): string {
  if (documentSaved && classificationSaved) return 'Utredningen och ärendets klassificering har sparats.';
  if (classificationSaved) return 'Ärendets klassificering har sparats.';
  return 'Utredningen har sparats.';
}

interface SaveErrorMessageInput {
  readonly error: unknown;
  readonly documentSavedForClassification: boolean;
  readonly classificationDirty: boolean;
  readonly classificationRequired: boolean;
}

export function investigationSaveErrorMessage({
  error,
  documentSavedForClassification,
  classificationDirty,
  classificationRequired,
}: SaveErrorMessageInput): string {
  const classificationConflict = isSupportInvestigationClassificationConflict(error);
  if (classificationConflict && documentSavedForClassification && classificationDirty) {
    return 'Utredningen har sparats, men ärendets klassificering har ändrats av någon annan. Dina kategoriseringsval finns kvar här. Ladda om ärendet och jämför innan du sparar klassificeringen igen.';
  }
  if (classificationConflict && classificationDirty) {
    return 'Ärendets klassificering har ändrats av någon annan. Dina kategoriseringsval finns kvar här. Ladda om ärendet och jämför innan du sparar igen.';
  }
  if (documentSavedForClassification && classificationDirty) {
    return 'Utredningen har sparats, men ärendets klassificering kunde inte synkroniseras. Försök igen; nästa försök uppdaterar bara klassificeringen.';
  }
  if (isSupportInvestigationConflict(error)) {
    return 'Utredningen har ändrats av någon annan. Dina ändringar finns kvar här. Ladda om ärendet och jämför innan du sparar igen.';
  }

  const apiMessage = (error as AxiosError<{ message?: string }>).response?.data?.message;
  if (apiMessage) return apiMessage;
  if (error instanceof Error) return error.message;
  if (classificationRequired && classificationDirty) {
    return 'Ärendets klassificering kunde inte sparas. Dina ändringar finns kvar och du kan försöka igen.';
  }
  return 'Utredningen kunde inte sparas. Dina ändringar finns kvar och du kan försöka igen.';
}
