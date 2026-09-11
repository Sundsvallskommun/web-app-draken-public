'use client';

import { ArrayObjectFieldTemplate } from '@common/components/json/fields/array-object-field-template.componant';
import SchemaForm from '@common/components/json/schema/schema-form.component';
import { getSchemaFormErrors, type SchemaFormError } from '@common/components/json/utils/schema-form-error-handling';
import { getLatestRjsfSchema, getRjsfSchema, getUiSchemaForSchema } from '@common/components/json/utils/schema-utils';
import type { RJSFSchema, RJSFValidationError, UiSchema } from '@rjsf/utils';
import { Alert, Button, Label, Spinner } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import { AvvikelseLabelCategorization } from '@supportmanagement/investigation/avvikelse/avvikelse-label-categorization.component';
import {
  applyAvvikelseLabelClassificationSelection,
  getAvvikelseLabelClassificationSelection,
} from '@supportmanagement/investigation/avvikelse/label-classification';
import { getSupportAttachments } from '@supportmanagement/services/support-attachment-service';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { isAxiosError } from 'axios';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';

import { useInvestigationProfileStore } from '../investigation-profile-store';
import { HSL_RISK_ESCALATION_THRESHOLD } from './assignment/avvikelse-access-labels';
import { isWithLexInvestigation, shouldPromptLexAssignment } from './assignment/avvikelse-assignment-policy';
import { LexAssignmentPrompt } from './assignment/lex-assignment-prompt.component';
import { ReturnToManagerButton } from './assignment/return-to-manager-button.component';
import { AVVIKELSE_CLASSIFICATION_POLICY } from './avvikelse-classification-policy';
import {
  getInvestigationClassificationSchemaContract,
  getInvestigationClassificationUiSchema,
  getInvestigationLegalBaseRules,
  getInvestigationLegalBases,
  isInvestigationClassificationOwner,
  isReportedMisconductErrand,
  normalizeContextualInvestigationFormData,
} from './investigation-classification';
import {
  AVVIKELSE_DECISION_PROPOSAL_SOURCE,
  readInvestigationDecisionProposal,
  resolveDecisionProposalDegreeTitle,
} from './investigation-decision-proposal';
import { InvestigationDecisionProposal } from './investigation-decision-proposal.component';
import type { InvestigationDocumentDefinition, InvestigationFormData } from './investigation-document';
import {
  getHslRiskValue,
  getInvestigationCompletion,
  getInvestigationRenderingSchema,
  getInvestigationReports,
  getInvestigationServerTimestamps,
  investigationDefaultFormStateBehavior,
  investigationRequiredIndicator,
} from './investigation-form-data';
import { InvestigationReportControls } from './investigation-report-controls.component';
import {
  investigationSchemaDebugIsVisible,
  InvestigationSchemaDebugPanel,
} from './investigation-schema-debug-panel.component';
import { type SupportInvestigationClassificationResponse } from './support-investigation-classification-service';
import {
  decisionDocumentWording,
  type InvestigationClassificationDraft,
  investigationClassificationWriteBlock,
  investigationDocumentWording,
  investigationSaveErrorMessage,
  investigationSaveSuccessMessage,
  type PreparedInvestigationClassification,
  prepareInvestigationClassification,
  saveInvestigationClassificationStep,
  saveInvestigationDocumentStep,
} from './support-investigation-save-workflow';
import {
  createSupportInvestigationReport,
  getSupportInvestigationDocument,
  isSupportInvestigationAccessDenied,
  previewSupportInvestigationReport,
  type SavedSupportInvestigationDocument,
  saveSupportInvestigationDocument,
  type SupportInvestigationDocument as SavedInvestigationDocument,
} from './support-investigation-service';

type LoadState = 'loading' | 'ready' | 'error';

interface InvestigationDocumentState {
  schema: RJSFSchema;
  uiSchema: UiSchema;
  schemaId: string;
  formData: InvestigationFormData;
  /** The document as Support Management holds it; the lock and the report log read this, not the draft. */
  persistedFormData: InvestigationFormData;
  persisted: boolean;
  etag?: string;
}

/** Opens a rendered PDF in a new tab; the object URL is released once the tab has had time to load it. */
const openPdfInNewTab = (pdfBase64: string): void => {
  const bytes = Uint8Array.from(atob(pdfBase64), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const getClassificationDraft = (errand: SupportErrand | undefined): InvestigationClassificationDraft => ({
  labels: errand?.labels ?? [],
  category: errand?.category ?? '',
  type: errand?.type ?? '',
  subType: errand?.subType ?? '',
  classificationHasSubTypes: errand?.classificationHasSubTypes ?? false,
});

interface SupportInvestigationDocumentProps {
  definition: InvestigationDocumentDefinition;
  readable: boolean;
  readonly: boolean;
  classificationReadonly: boolean;
  refreshAccess: () => void;
  onDirtyChange: (isDirty: boolean) => void;
  onSaved: (document: SavedInvestigationDocument) => void;
}

function InvestigationAlert({
  type,
  message,
  dataCy = 'investigation-document-notice',
}: Readonly<{ type: 'error' | 'warning' | 'success'; message: string; dataCy?: string }>) {
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (type !== 'error') return;
    noticeRef.current?.focus({ preventScroll: true });
    noticeRef.current?.scrollIntoView({ block: 'start' });
  }, [message, type]);

  return (
    <div
      ref={noticeRef}
      tabIndex={-1}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <Alert type={type} className="mb-24" data-cy={dataCy}>
        <Alert.Icon />
        <Alert.Content>
          <Alert.Content.Description>{message}</Alert.Content.Description>
        </Alert.Content>
      </Alert>
    </div>
  );
}

export function SupportInvestigationDocument({
  definition,
  readable,
  readonly,
  classificationReadonly,
  refreshAccess,
  onDirtyChange,
  onSaved,
}: Readonly<SupportInvestigationDocumentProps>) {
  const municipalityId = useConfigStore((state) => state.municipalityId);
  const supportErrand = useSupportStore((state) => state.supportErrand);
  const supportMetadata = useMetadataStore((state) => state.supportMetadata);
  const { register: registerErrandField, resetField: resetErrandField } = useFormContext<SupportErrand>();
  const errandId = supportErrand?.id;
  const profile = useInvestigationProfileStore((state) => state.profile);
  const reportedMisconduct = isReportedMisconductErrand(supportErrand);
  const isDecision = (definition.placement ?? 'investigation') === 'decision';
  // The decision on a reported misconduct answers the investigator's proposal, so it is shown first.
  const showsDecisionProposal = isDecision && definition.appliesTo === 'reported-misconduct';
  // A document that answers another one waits for it: the BFF refuses the write, and the form
  // says why instead of offering a save that would fail.
  const prerequisite = definition.prerequisiteDocumentKey
    ? profile?.documents.find((document) => document.key === definition.prerequisiteDocumentKey)
    : undefined;
  const prerequisiteMissing =
    definition.prerequisiteDocumentKey !== undefined &&
    !supportErrand?.jsonParameters?.some((parameter) => parameter.key === definition.prerequisiteDocumentKey);
  // What the handler is told the document is. The investigation wording predates the decision tab.
  const wording = isDecision ? decisionDocumentWording : investigationDocumentWording;
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [documentState, setDocumentState] = useState<InvestigationDocumentState>();
  const [notice, setNotice] = useState<{ type: 'error' | 'warning' | 'success'; message: string }>();
  const [isSaving, setIsSaving] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<SchemaFormError[]>([]);
  const classificationFieldId = `${definition.key}_external_errandClassification`;
  const [isDirty, setIsDirty] = useState(false);
  const [classificationDirty, setClassificationDirty] = useState(false);
  const [documentSavedPendingClassification, setDocumentSavedPendingClassification] = useState(false);
  const [showLexAssignmentPrompt, setShowLexAssignmentPrompt] = useState(false);
  const classificationMethods = useForm<InvestigationClassificationDraft>({
    defaultValues: getClassificationDraft(supportErrand),
    mode: 'onChange',
  });
  const {
    getValues: getClassificationValues,
    reset: resetClassification,
    trigger: triggerClassification,
  } = classificationMethods;
  const persistedClassification = useMemo(() => getClassificationDraft(supportErrand), [supportErrand]);

  const setDocumentDirty = useCallback((nextDirty: boolean) => setIsDirty(nextDirty), []);

  useEffect(() => {
    onDirtyChange(isDirty || classificationDirty);
  }, [classificationDirty, isDirty, onDirtyChange]);

  useEffect(
    () => () => {
      onDirtyChange(false);
    },
    [onDirtyChange]
  );

  useEffect(() => {
    // Access may disappear during a refresh or be revoked. Keep the draft and RHF state;
    // only a component identity change (user/errand/document) ends their lifetime.
    if (!readable || documentState || loadState === 'error') return;
    let cancelled = false;

    const loadDocument = async () => {
      if (!municipalityId || !errandId) return;

      setLoadState('loading');
      setNotice(undefined);
      setValidationErrors([]);
      setDocumentDirty(false);
      setClassificationDirty(false);
      setDocumentSavedPendingClassification(false);

      try {
        const storedDocument = await getSupportInvestigationDocument(municipalityId, errandId, definition.key);
        const loadedSchema = storedDocument
          ? {
              schema: await getRjsfSchema(municipalityId, storedDocument.document.schemaId),
              schemaId: storedDocument.document.schemaId,
            }
          : await getLatestRjsfSchema(municipalityId, definition.schemaName);
        const uiSchema = await getUiSchemaForSchema(municipalityId, loadedSchema.schemaId);

        if (cancelled) return;
        const loadedFormData = normalizeContextualInvestigationFormData(
          definition.key,
          definition.schemaName,
          loadedSchema.schema,
          storedDocument?.document.value ?? {},
          reportedMisconduct
        );
        setDocumentState({
          schema: loadedSchema.schema,
          uiSchema,
          schemaId: loadedSchema.schemaId,
          formData: loadedFormData,
          // The stored document as is, server-owned values included; the form data above is
          // the client's normalized view of it.
          persistedFormData: storedDocument?.document.value ?? {},
          persisted: Boolean(storedDocument),
          etag: storedDocument?.etag,
        });
        setLoadState('ready');
      } catch (error) {
        if (cancelled) return;
        console.error(`Failed to load investigation document ${definition.key}`, error);
        setLoadState('error');
        if (isSupportInvestigationAccessDenied(error)) refreshAccess();
        setNotice({
          type: isSupportInvestigationAccessDenied(error) ? 'warning' : 'error',
          message: isSupportInvestigationAccessDenied(error)
            ? `Support Management nekade åtkomst till det här ${wording.kind}.`
            : `${wording.noun} kunde inte laddas. Försök igen eller kontakta support om felet kvarstår.`,
        });
      }
    };

    void loadDocument();
    return () => {
      cancelled = true;
    };
  }, [
    definition.key,
    definition.schemaName,
    errandId,
    municipalityId,
    reportedMisconduct,
    setDocumentDirty,
    wording,
    readable,
    documentState,
    loadState,
    refreshAccess,
  ]);

  useEffect(() => {
    if (!classificationDirty) resetClassification(persistedClassification);
  }, [classificationDirty, persistedClassification, resetClassification]);

  useEffect(() => {
    useInvestigationProfileStore.getState().setJsonParameterHandled(definition.key, readable && loadState === 'ready');
    return () => useInvestigationProfileStore.getState().setJsonParameterHandled(definition.key, false);
  }, [definition.key, readable, loadState]);

  // Schema documentation - the read/write state, the schema's own description, its owning role and
  // its id - is for working on the schemas, not on the errand. Test and development show all of it,
  // production none of it.
  const showSchemaMetadata = investigationSchemaDebugIsVisible();

  const renderingSchema = useMemo(() => {
    if (!documentState) return undefined;

    const schema = getInvestigationRenderingSchema(definition.schemaName, documentState.schema, documentState.formData);
    if (showSchemaMetadata) return schema;

    // FieldTemplate renders the root description above the form, so the schema's own documentation
    // is dropped here rather than hidden in the markup.
    const { description: _schemaDescription, ...schemaWithoutRootDescription } = schema;
    return schemaWithoutRootDescription;
  }, [definition.schemaName, documentState, showSchemaMetadata]);
  const hslRiskValue =
    definition.schemaName === 'utredning-enhetschef' && documentState
      ? getHslRiskValue(documentState.formData)
      : undefined;
  // The LEX investigation can be handed back only from the document that owns it, and only while the
  // errand is actually with LEX - the access label is what says so.
  const canReturnToManager =
    definition.schemaName === 'utredning-sol-lss' &&
    !readonly &&
    Boolean(errandId) &&
    isWithLexInvestigation(supportErrand?.labels, supportMetadata?.labels?.labelStructure);
  const classificationOwner = isInvestigationClassificationOwner(definition.key, supportErrand);
  const classificationLabelTree = classificationOwner ? AVVIKELSE_CLASSIFICATION_POLICY.labelTree : undefined;
  const classificationSchemaContract = documentState
    ? getInvestigationClassificationSchemaContract(definition.key, documentState.schema)
    : undefined;
  const legalBases = documentState ? getInvestigationLegalBases(documentState.formData) : [];
  const legalBaseRules = getInvestigationLegalBaseRules();
  const classificationPrerequisites = {
    required: classificationOwner,
    canEditClassification: !classificationReadonly,
    dirty: classificationDirty,
    labelTree: classificationLabelTree,
    labelStructure: supportMetadata?.labels?.labelStructure,
    legalBases,
    legalBaseRules,
    persistedClassification,
  };
  const classificationWriteBlock = investigationClassificationWriteBlock(classificationPrerequisites);
  // A document saved as completed is locked: the form turns read-only and only the report
  // controls act on it, until the owner unlocks it.
  const completion = documentState ? getInvestigationCompletion(documentState.schema) : undefined;
  const locked = Boolean(
    completion && documentState?.persisted && documentState.persistedFormData[completion.field] === 'yes'
  );
  const reports =
    documentState && completion ? getInvestigationReports(documentState.schema, documentState.persistedFormData) : [];
  const formReadonly = readonly || Boolean(classificationWriteBlock) || prerequisiteMissing || locked;
  const classificationUiSchema = useMemo(
    () =>
      documentState
        ? getInvestigationClassificationUiSchema(
            definition.key,
            documentState.schema,
            documentState.uiSchema,
            reportedMisconduct
          )
        : undefined,
    [definition.key, documentState, reportedMisconduct]
  );
  const serverTimestamps = documentState
    ? getInvestigationServerTimestamps(documentState.schema, documentState.persistedFormData)
    : [];

  useEffect(() => {
    if (!classificationOwner) return;

    registerErrandField('classification');
    registerErrandField('labels');
    registerErrandField('category');
    registerErrandField('type');
    registerErrandField('subType');
    registerErrandField('classificationHasSubTypes');
  }, [classificationOwner, registerErrandField]);

  // Do not leave a revoked document's values in the DOM. Hooks above keep its in-memory draft.
  if (!readable) return null;

  if (loadState === 'loading') {
    return (
      <div className="flex items-center gap-12 p-32" role="status">
        <Spinner size={2} />
        <span>Laddar {definition.tabLabel.toLocaleLowerCase('sv')}...</span>
      </div>
    );
  }

  if (loadState === 'error' || !documentState || !renderingSchema) {
    return (
      <div className="p-32">
        {notice && <InvestigationAlert {...notice} />}
        <Button
          variant="secondary"
          onClick={() => {
            setLoadState('loading');
            refreshAccess();
          }}
        >
          Försök igen
        </Button>
      </div>
    );
  }

  const applySavedDocument = (saved: SavedSupportInvestigationDocument) => {
    setDocumentState((current) =>
      current
        ? {
            ...current,
            // Normalized like a load, so the server's own properties do not read as edits.
            formData: normalizeContextualInvestigationFormData(
              definition.key,
              definition.schemaName,
              current.schema,
              saved.document.value,
              reportedMisconduct
            ),
            persistedFormData: saved.document.value,
            schemaId: saved.document.schemaId,
            persisted: true,
            etag: saved.etag,
          }
        : current
    );
    onSaved(saved.document);
    useSupportStore.setState((state) => {
      if (!state.supportErrand || state.supportErrand.id !== errandId) return state;
      return { supportErrand: { ...state.supportErrand, version: saved.parentErrandVersion } };
    });
    resetErrandField('version', { defaultValue: saved.parentErrandVersion });
    setDocumentDirty(false);
  };

  const applySavedClassification = (
    savedErrand: SupportInvestigationClassificationResponse,
    prepared: PreparedInvestigationClassification
  ) => {
    const savedSelection = getAvvikelseLabelClassificationSelection(
      prepared.model,
      savedErrand.labels,
      savedErrand.classification
    );
    const savedUpdate = applyAvvikelseLabelClassificationSelection(prepared.model, savedErrand.labels, savedSelection);
    const savedDraft: InvestigationClassificationDraft = {
      labels: savedErrand.labels,
      category: savedUpdate.category,
      type: savedUpdate.type,
      subType: savedUpdate.subType,
      classificationHasSubTypes: savedUpdate.requiresSubType,
    };

    useSupportStore.setState((state) => {
      if (!state.supportErrand || state.supportErrand.id !== errandId) return state;
      return {
        supportErrand: {
          ...state.supportErrand,
          classification: savedErrand.classification,
          labels: savedErrand.labels,
          category: savedDraft.category,
          type: savedDraft.type,
          subType: savedDraft.subType,
          classificationHasSubTypes: savedDraft.classificationHasSubTypes,
          version: savedErrand.version,
        },
      };
    });
    resetClassification(savedDraft);
    resetErrandField('classification', { defaultValue: savedErrand.classification });
    resetErrandField('labels', { defaultValue: savedDraft.labels });
    resetErrandField('category', { defaultValue: savedDraft.category });
    resetErrandField('type', { defaultValue: savedDraft.type });
    resetErrandField('subType', { defaultValue: savedDraft.subType });
    resetErrandField('classificationHasSubTypes', { defaultValue: savedDraft.classificationHasSubTypes });
    resetErrandField('version', { defaultValue: savedErrand.version });
  };

  /**
   * A saved unit manager investigation that assesses a suspected misconduct has to be handed to a
   * LEX manager, and the dialog that does it opens here rather than during the save itself - the
   * investigation is already stored, and the handover is a separate write against its new version.
   */
  const promptLexAssignmentIfNeeded = (savedFormData: InvestigationFormData) => {
    if (definition.schemaName !== 'utredning-enhetschef') return;

    const needsLexAssignment = shouldPromptLexAssignment({
      formData: savedFormData,
      labels: useSupportStore.getState().supportErrand?.labels,
      labelStructure: supportMetadata?.labels?.labelStructure,
    });
    if (needsLexAssignment) setShowLexAssignmentPrompt(true);
  };

  const reportFailureNotice = (error: unknown, fallback: string) => {
    if (isSupportInvestigationAccessDenied(error)) {
      refreshAccess();
      setNotice({ type: 'warning', message: `Support Management nekade åtkomst till det här ${wording.kind}.` });
      return;
    }
    const serverMessage = isAxiosError<{ message?: unknown }>(error) ? error.response?.data?.message : undefined;
    const message =
      typeof serverMessage === 'string' && serverMessage.trim()
        ? serverMessage
        : !isAxiosError(error) && error instanceof Error && error.message
        ? error.message
        : fallback;
    setNotice({ type: 'error', message });
  };

  const unlockDocument = async () => {
    if (!municipalityId || !errandId || !completion || !documentState.persisted || isReporting || isSaving) return;
    if (typeof supportErrand?.version !== 'number') {
      setNotice({ type: 'error', message: 'Ärendets version saknas. Ladda om ärendet innan utredningen låses upp.' });
      return;
    }
    setIsReporting(true);
    setNotice(undefined);
    try {
      const saved = await saveSupportInvestigationDocument(
        municipalityId,
        errandId,
        definition.key,
        { schemaId: documentState.schemaId, value: { ...documentState.persistedFormData, [completion.field]: 'no' } },
        supportErrand.version,
        documentState.etag
      );
      applySavedDocument(saved);
      setNotice({ type: 'success', message: `${wording.noun} är upplåst och kan ändras igen.` });
    } catch (error) {
      reportFailureNotice(error, `${wording.noun} kunde inte låsas upp. Försök igen.`);
    } finally {
      setIsReporting(false);
    }
  };

  const generateReport = async () => {
    if (!municipalityId || !errandId || !locked || isDirty || isReporting || isSaving) return;
    setIsReporting(true);
    setNotice(undefined);
    try {
      const created = await createSupportInvestigationReport(municipalityId, errandId, definition.key);
      applySavedDocument(created);
      setNotice({
        type: 'success',
        message: `Rapporten ${created.report.fileName} har skapats och lagts som en bilaga på ärendet.`,
      });
      const attachments = await getSupportAttachments(errandId, municipalityId);
      useSupportStore.getState().setSupportAttachments(attachments);
    } catch (error) {
      reportFailureNotice(error, 'Rapporten kunde inte skapas. Försök igen eller kontakta support om felet kvarstår.');
    } finally {
      setIsReporting(false);
    }
  };

  const previewReport = async () => {
    if (!municipalityId || !errandId || !locked || isDirty || isReporting) return;
    setIsReporting(true);
    setNotice(undefined);
    try {
      const preview = await previewSupportInvestigationReport(municipalityId, errandId, definition.key);
      openPdfInNewTab(preview.pdfBase64);
    } catch (error) {
      reportFailureNotice(error, 'Rapporten kunde inte förhandsgranskas. Försök igen.');
    } finally {
      setIsReporting(false);
    }
  };

  const save = async (formData: InvestigationFormData, schemaErrors: RJSFValidationError[] = []) => {
    if (!municipalityId || !errandId || !readable || formReadonly || isSaving) return;

    const normalizedData = normalizeContextualInvestigationFormData(
      definition.key,
      definition.schemaName,
      documentState.schema,
      formData,
      reportedMisconduct
    );
    setDocumentState((current) => (current ? { ...current, formData: normalizedData } : current));
    setIsSaving(true);
    setNotice(undefined);
    let documentSavedForClassification = documentSavedPendingClassification;

    try {
      const errors = getSchemaFormErrors(renderingSchema, schemaErrors, definition.key);
      let preparedClassification: PreparedInvestigationClassification | undefined;
      try {
        preparedClassification = await prepareInvestigationClassification({
          required: classificationOwner,
          canEditClassification: !classificationReadonly,
          dirty: classificationDirty,
          labelTree: classificationLabelTree,
          labelStructure: supportMetadata?.labels?.labelStructure,
          legalBases: getInvestigationLegalBases(normalizedData),
          legalBaseRules,
          persistedClassification,
          triggerValidation: () => triggerClassification(['category', 'type', 'subType']),
          getDraft: getClassificationValues,
        });
      } catch (error) {
        errors.push({
          fieldId: classificationFieldId,
          label: 'Kategorisering',
          message: error instanceof Error ? error.message : 'Kontrollera avvikelsetyp och underkategori.',
        });
      }
      setValidationErrors(errors);
      if (errors.length > 0) return;

      const savedDocument = await saveInvestigationDocumentStep({
        municipalityId,
        errandId,
        documentKey: definition.key,
        schemaId: documentState.schemaId,
        value: normalizedData,
        persisted: documentState.persisted,
        etag: documentState.etag,
        parentErrandVersion: supportErrand?.version,
        documentDirty: isDirty,
        classificationDirty,
        documentSavedPendingClassification,
      });
      if (savedDocument) applySavedDocument(savedDocument);

      if (savedDocument && classificationDirty) {
        documentSavedForClassification = true;
        setDocumentSavedPendingClassification(true);
      }

      const savedClassification = await saveInvestigationClassificationStep({
        municipalityId,
        errandId,
        documentKey: definition.key,
        prepared: preparedClassification,
        parentErrandVersion: savedDocument?.parentErrandVersion ?? supportErrand?.version,
        documentETag: savedDocument?.etag ?? documentState.etag,
      });
      if (savedClassification && preparedClassification) {
        applySavedClassification(savedClassification, preparedClassification);
      }

      setDocumentSavedPendingClassification(false);
      setClassificationDirty(false);
      setDocumentDirty(false);
      setNotice({
        type: 'success',
        message: investigationSaveSuccessMessage(Boolean(savedDocument), Boolean(savedClassification), wording),
      });

      promptLexAssignmentIfNeeded(normalizedData);
    } catch (error) {
      if (isSupportInvestigationAccessDenied(error)) refreshAccess();
      setNotice({
        type: 'error',
        message: investigationSaveErrorMessage({
          error,
          documentSavedForClassification,
          classificationDirty,
          classificationRequired: classificationOwner,
          wording,
        }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className="min-w-0 max-w-full p-16 sm:p-24 md:p-32"
      aria-labelledby={`${definition.key}-heading`}
      data-cy={`investigation-document-${definition.key}`}
    >
      <div className="mb-24 flex min-w-0 max-w-full flex-wrap items-start justify-between gap-16">
        <div className="min-w-0 max-w-[76rem]">
          <div className="mb-8 flex flex-wrap items-center gap-8">
            <h2 id={`${definition.key}-heading`} className="text-h3-md">
              {definition.tabLabel}
            </h2>
            {showSchemaMetadata && (
              <Label rounded inverted color={formReadonly ? 'bjornstigen' : 'gronsta'}>
                {formReadonly ? 'Skrivskyddad' : 'Redigerbar'}
              </Label>
            )}
            {(isDirty || classificationDirty) && (
              <Label rounded inverted color="vattjom">
                Osparade ändringar
              </Label>
            )}
          </div>
          {showSchemaMetadata && (
            <p className="mt-8 break-words text-small">
              Ansvarig roll: {definition.ownerLabel} · Schema:{' '}
              <code className="break-all">{documentState.schemaId}</code>
            </p>
          )}
          {serverTimestamps.map((timestamp) => (
            <p key={timestamp.name} className="mt-8 text-small" data-cy={`investigation-document-${timestamp.name}`}>
              {timestamp.label}:{' '}
              <time dateTime={timestamp.value}>{dayjs(timestamp.value).format('YYYY-MM-DD HH:mm')}</time>
            </p>
          ))}
        </div>
      </div>

      {notice && <InvestigationAlert {...notice} />}

      {locked && (
        <InvestigationAlert
          type="warning"
          dataCy="investigation-document-locked"
          message={`${wording.noun} är markerad som klar och är låst för ändringar. Lås upp den om du behöver ändra något.`}
        />
      )}

      {prerequisiteMissing && (
        <InvestigationAlert
          type="warning"
          dataCy="investigation-document-prerequisite"
          message={`${wording.noun} kan fattas först när ${
            prerequisite?.tabLabel ?? definition.prerequisiteDocumentKey
          } har sparats i ärendet.`}
        />
      )}

      {classificationWriteBlock && <InvestigationAlert type="warning" message={classificationWriteBlock} />}
      {!readonly && classificationOwner && classificationReadonly && !classificationWriteBlock && (
        <InvestigationAlert
          type="warning"
          message="Du kan ändra dokumentet men inte ärendets kategorisering. Ändringar av lagrum måste stämma med den befintliga kategoriseringen."
        />
      )}

      {classificationOwner && classificationSchemaContract === 'missing-declaration' && (
        <Alert type="warning" className="mb-24" data-cy="investigation-classification-schema-warning">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>
              Schemat saknar deklarationen för ärendeklassificering. Draken använder den centrala utredningsplaceringen
              så att kategoriseringen fortfarande kan läsas och sparas.
            </Alert.Content.Description>
          </Alert.Content>
        </Alert>
      )}

      {readonly && (
        <Alert type="info" className="mb-24">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>
              {wording.noun} kan läsas men inte ändras med din behörighet eller i ärendets nuvarande status.
            </Alert.Content.Description>
          </Alert.Content>
        </Alert>
      )}

      {showsDecisionProposal &&
        !prerequisiteMissing &&
        (() => {
          const proposal = readInvestigationDecisionProposal(supportErrand, profile);
          return (
            <InvestigationDecisionProposal
              proposal={proposal}
              degreeTitle={resolveDecisionProposalDegreeTitle(
                documentState.schema,
                AVVIKELSE_DECISION_PROPOSAL_SOURCE.decisionDegreeField,
                proposal?.degree
              )}
            />
          );
        })()}

      {hslRiskValue !== undefined && hslRiskValue >= HSL_RISK_ESCALATION_THRESHOLD && (
        <Alert type="warning" className="mb-24" data-cy="hsl-risk-threshold-alert">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Title>HSL-riskvärde {hslRiskValue}</Alert.Content.Title>
            <Alert.Content.Description>
              Gränsen {HSL_RISK_ESCALATION_THRESHOLD} är uppnådd och ska hanteras vidare enligt verksamhetens process.
            </Alert.Content.Description>
          </Alert.Content>
        </Alert>
      )}

      {canReturnToManager && (
        <div className="mb-24">
          <ReturnToManagerButton
            municipalityId={municipalityId}
            errandId={errandId!}
            expectedVersion={supportErrand?.version}
            disabled={isSaving || isDirty || classificationDirty}
          />
        </div>
      )}

      <SchemaForm
        schema={renderingSchema}
        validationErrors={validationErrors}
        onError={(errors) => void save(documentState.formData, errors)}
        defaultFormStateBehavior={investigationDefaultFormStateBehavior}
        uiSchema={classificationUiSchema}
        idPrefix={definition.key}
        requiredIndicator={investigationRequiredIndicator}
        arrayFieldTemplate={ArrayObjectFieldTemplate}
        formData={documentState.formData}
        onChange={(formData) => {
          if (formReadonly || isSaving) return;
          const normalizedData = normalizeContextualInvestigationFormData(
            definition.key,
            definition.schemaName,
            documentState.schema,
            formData,
            reportedMisconduct
          );
          const writeBlock = investigationClassificationWriteBlock({
            ...classificationPrerequisites,
            legalBases: getInvestigationLegalBases(normalizedData),
          });
          if (writeBlock) {
            setDocumentState((current) => (current ? { ...current, formData: { ...current.formData } } : current));
            setNotice({ type: 'warning', message: writeBlock });
            return;
          }
          if (JSON.stringify(normalizedData) === JSON.stringify(documentState.formData)) return;
          if (documentSavedPendingClassification) setDocumentSavedPendingClassification(false);
          setDocumentState((current) => (current ? { ...current, formData: normalizedData } : current));
          setDocumentDirty(true);
          setValidationErrors([]);
          setNotice(undefined);
        }}
        onSubmit={(formData) => void save(formData)}
        readonly={formReadonly || isSaving}
        externalFields={{
          ...(completion
            ? {
                investigationReport: (
                  <InvestigationReportControls
                    documentKey={definition.key}
                    locked={locked}
                    dirty={isDirty || classificationDirty}
                    busy={isReporting || isSaving}
                    canEdit={!readonly && !prerequisiteMissing}
                    reports={reports}
                    onGenerate={() => void generateReport()}
                    onPreview={() => void previewReport()}
                    onUnlock={() => void unlockDocument()}
                  />
                ),
              }
            : {}),
          ...(classificationOwner && classificationLabelTree
            ? {
                errandClassification: (
                  <div id={classificationFieldId} tabIndex={-1}>
                    <FormProvider {...classificationMethods}>
                      <AvvikelseLabelCategorization
                        supportMetadata={supportMetadata}
                        labelTree={classificationLabelTree}
                        disabled={formReadonly || classificationReadonly || isSaving}
                        legalBases={legalBases}
                        legalBaseRules={legalBaseRules}
                        onClassificationChange={() => {
                          setClassificationDirty(true);
                          setValidationErrors([]);
                          setNotice(undefined);
                        }}
                      />
                    </FormProvider>
                  </div>
                ),
              }
            : {}),
        }}
        submitButtonOptions={{
          label: isDecision ? 'Spara beslut' : 'Spara utredning',
          leadingIcon: false,
          loading: isSaving,
          disabled: !isDirty && !classificationDirty,
        }}
      />

      <InvestigationSchemaDebugPanel
        id={`${definition.key}-json-debug`}
        label={definition.tabLabel}
        formData={documentState.formData}
      />

      {showLexAssignmentPrompt && (
        <LexAssignmentPrompt
          show
          municipalityId={municipalityId}
          errandId={errandId!}
          expectedVersion={supportErrand?.version}
        />
      )}
    </section>
  );
}
