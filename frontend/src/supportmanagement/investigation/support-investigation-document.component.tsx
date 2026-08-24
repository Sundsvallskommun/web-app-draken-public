'use client';

import { ArrayObjectFieldTemplate } from '@common/components/json/fields/array-object-field-template.componant';
import SchemaForm from '@common/components/json/schema/schema-form.component';
import { getLatestRjsfSchema, getRjsfSchema, getUiSchemaForSchema } from '@common/components/json/utils/schema-utils';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { Alert, Label, Spinner } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import { IafLabelCategorization } from '@supportmanagement/components/support-errand-basics-form/iaf-label-categorization.component';
import {
  applyIafLabelClassificationSelection,
  getIafLabelClassificationSelection,
} from '@supportmanagement/investigation/label-classification';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';

import { IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY } from './iaf-vof-investigation-classification-policy';
import {
  getInvestigationClassificationSchemaContract,
  getInvestigationClassificationUiSchema,
  getInvestigationLegalBaseRules,
  getInvestigationLegalBases,
  isInvestigationClassificationOwner,
  isReportedMisconductErrand,
  normalizeContextualInvestigationFormData,
} from './investigation-classification';
import type { InvestigationDocumentDefinition, InvestigationFormData } from './investigation-document';
import { getHslRiskValue, getInvestigationRenderingSchema } from './investigation-form-data';
import { useInvestigationProfileStore } from './investigation-profile-store';
import { type SupportInvestigationClassificationResponse } from './support-investigation-classification-service';
import {
  type InvestigationClassificationDraft,
  investigationSaveErrorMessage,
  investigationSaveSuccessMessage,
  type PreparedInvestigationClassification,
  prepareInvestigationClassification,
  saveInvestigationClassificationStep,
  saveInvestigationDocumentStep,
} from './support-investigation-save-workflow';
import {
  getSupportInvestigationDocument,
  type SavedSupportInvestigationDocument,
  type SupportInvestigationDocument as SavedInvestigationDocument,
} from './support-investigation-service';

type LoadState = 'loading' | 'ready' | 'error';

interface InvestigationDocumentState {
  schema: RJSFSchema;
  uiSchema: UiSchema;
  schemaId: string;
  formData: InvestigationFormData;
  persisted: boolean;
  etag?: string;
}

const getClassificationDraft = (errand: SupportErrand | undefined): InvestigationClassificationDraft => ({
  labels: errand?.labels ?? [],
  category: errand?.category ?? '',
  type: errand?.type ?? '',
  subType: errand?.subType ?? '',
  classificationHasSubTypes: errand?.classificationHasSubTypes ?? false,
});

interface SupportInvestigationDocumentProps {
  definition: InvestigationDocumentDefinition;
  readonly: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  onSaved: (document: SavedInvestigationDocument) => void;
}

function InvestigationAlert({ type, message }: Readonly<{ type: 'error' | 'warning' | 'success'; message: string }>) {
  return (
    <div role={type === 'error' ? 'alert' : 'status'} aria-live={type === 'error' ? 'assertive' : 'polite'}>
      <Alert type={type} className="mb-24" data-cy="investigation-document-notice">
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
  readonly,
  onDirtyChange,
  onSaved,
}: Readonly<SupportInvestigationDocumentProps>) {
  const municipalityId = useConfigStore((state) => state.municipalityId);
  const supportErrand = useSupportStore((state) => state.supportErrand);
  const supportMetadata = useMetadataStore((state) => state.supportMetadata);
  const { register: registerErrandField, resetField: resetErrandField } = useFormContext<SupportErrand>();
  const errandId = supportErrand?.id;
  const reportedMisconduct = isReportedMisconductErrand(supportErrand);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [documentState, setDocumentState] = useState<InvestigationDocumentState>();
  const [notice, setNotice] = useState<{ type: 'error' | 'warning' | 'success'; message: string }>();
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [classificationDirty, setClassificationDirty] = useState(false);
  const [documentSavedPendingClassification, setDocumentSavedPendingClassification] = useState(false);
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
    let cancelled = false;

    const loadDocument = async () => {
      if (!municipalityId || !errandId) return;

      setLoadState('loading');
      useInvestigationProfileStore.getState().setDocumentLoadState(definition.key, 'loading');
      setNotice(undefined);
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
        setDocumentState({
          schema: loadedSchema.schema,
          uiSchema,
          schemaId: loadedSchema.schemaId,
          formData: normalizeContextualInvestigationFormData(
            definition.key,
            definition.schemaName,
            loadedSchema.schema,
            storedDocument?.document.value ?? {},
            reportedMisconduct
          ),
          persisted: Boolean(storedDocument),
          etag: storedDocument?.etag,
        });
        setLoadState('ready');
        useInvestigationProfileStore.getState().setDocumentLoadState(definition.key, 'ready');
      } catch (error) {
        if (cancelled) return;
        console.error(`Failed to load investigation document ${definition.key}`, error);
        setLoadState('error');
        useInvestigationProfileStore.getState().setDocumentLoadState(definition.key, 'error');
        setNotice({
          type: 'error',
          message: 'Utredningen kunde inte laddas. Försök igen eller kontakta support om felet kvarstår.',
        });
      }
    };

    resetClassification(getClassificationDraft(useSupportStore.getState().supportErrand));
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
    resetClassification,
    setDocumentDirty,
  ]);

  const renderingSchema = useMemo(
    () =>
      documentState
        ? getInvestigationRenderingSchema(definition.schemaName, documentState.schema, documentState.formData)
        : undefined,
    [definition.schemaName, documentState]
  );
  const hslRiskValue =
    definition.schemaName === 'utredning-enhetschef' && documentState
      ? getHslRiskValue(documentState.formData)
      : undefined;
  const classificationOwner = isInvestigationClassificationOwner(definition.key, supportErrand);
  const classificationLabelTree = classificationOwner
    ? IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY.labelTree
    : undefined;
  const classificationSchemaContract = documentState
    ? getInvestigationClassificationSchemaContract(definition.key, documentState.schema)
    : undefined;
  const legalBases = documentState ? getInvestigationLegalBases(documentState.formData) : [];
  const legalBaseRules = getInvestigationLegalBaseRules();
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

  useEffect(() => {
    if (!classificationOwner) return;

    registerErrandField('classification');
    registerErrandField('labels');
    registerErrandField('category');
    registerErrandField('type');
    registerErrandField('subType');
    registerErrandField('classificationHasSubTypes');
  }, [classificationOwner, registerErrandField]);

  if (loadState === 'loading') {
    return (
      <div className="flex items-center gap-12 p-32" role="status">
        <Spinner size={2} />
        <span>Laddar {definition.tabLabel.toLocaleLowerCase('sv')}...</span>
      </div>
    );
  }

  if (loadState === 'error' || !documentState || !renderingSchema) {
    return <div className="p-32">{notice && <InvestigationAlert {...notice} />}</div>;
  }

  const applySavedDocument = (saved: SavedSupportInvestigationDocument) => {
    setDocumentState((current) =>
      current
        ? {
            ...current,
            formData: saved.document.value,
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
    const savedSelection = getIafLabelClassificationSelection(
      prepared.model,
      savedErrand.labels,
      savedErrand.classification
    );
    const savedUpdate = applyIafLabelClassificationSelection(prepared.model, savedErrand.labels, savedSelection);
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

  const save = async (formData: InvestigationFormData) => {
    if (!municipalityId || !errandId || readonly || isSaving) return;

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
      const preparedClassification = await prepareInvestigationClassification({
        required: classificationOwner,
        dirty: classificationDirty,
        labelTree: classificationLabelTree,
        labelStructure: supportMetadata?.labels?.labelStructure,
        legalBases: getInvestigationLegalBases(normalizedData),
        legalBaseRules,
        persistedClassification,
        triggerValidation: () => triggerClassification(['category', 'type', 'subType']),
        getDraft: getClassificationValues,
      });
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
        message: investigationSaveSuccessMessage(Boolean(savedDocument), Boolean(savedClassification)),
      });
    } catch (error) {
      setNotice({
        type: 'error',
        message: investigationSaveErrorMessage({
          error,
          documentSavedForClassification,
          classificationDirty,
          classificationRequired: classificationOwner,
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
            <Label rounded inverted color={readonly ? 'bjornstigen' : 'gronsta'}>
              {readonly ? 'Skrivskyddad' : 'Redigerbar'}
            </Label>
            {(isDirty || classificationDirty) && (
              <Label rounded inverted color="vattjom">
                Osparade ändringar
              </Label>
            )}
          </div>
          {typeof documentState.schema.description === 'string' && (
            <p className="text-small text-dark-secondary">{documentState.schema.description}</p>
          )}
          <p className="mt-8 break-words text-small">
            Ansvarig roll: {definition.ownerLabel} · Schema: <code className="break-all">{documentState.schemaId}</code>
          </p>
        </div>
      </div>

      {notice && <InvestigationAlert {...notice} />}

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
              Utredningen kan läsas men inte ändras med din behörighet eller i ärendets nuvarande status.
            </Alert.Content.Description>
          </Alert.Content>
        </Alert>
      )}

      {hslRiskValue !== undefined && hslRiskValue >= 4 && (
        <Alert type="warning" className="mb-24" data-cy="hsl-risk-threshold-alert">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Title>HSL-riskvärde {hslRiskValue}</Alert.Content.Title>
            <Alert.Content.Description>
              Gränsen 4 är uppnådd och ska hanteras vidare enligt verksamhetens process.
            </Alert.Content.Description>
          </Alert.Content>
        </Alert>
      )}

      <SchemaForm
        schema={renderingSchema}
        uiSchema={classificationUiSchema}
        idPrefix={definition.key}
        arrayFieldTemplate={ArrayObjectFieldTemplate}
        formData={documentState.formData}
        onChange={(formData) => {
          if (isSaving) return;
          const normalizedData = normalizeContextualInvestigationFormData(
            definition.key,
            definition.schemaName,
            documentState.schema,
            formData,
            reportedMisconduct
          );
          if (JSON.stringify(normalizedData) === JSON.stringify(documentState.formData)) return;
          if (documentSavedPendingClassification) setDocumentSavedPendingClassification(false);
          setDocumentState((current) => (current ? { ...current, formData: normalizedData } : current));
          setDocumentDirty(true);
          setNotice(undefined);
        }}
        onSubmit={(formData) => void save(formData)}
        readonly={readonly || isSaving}
        externalFields={
          classificationOwner && classificationLabelTree
            ? {
                errandClassification: (
                  <FormProvider {...classificationMethods}>
                    <IafLabelCategorization
                      supportMetadata={supportMetadata}
                      labelTree={classificationLabelTree}
                      disabled={readonly || isSaving}
                      legalBases={legalBases}
                      legalBaseRules={legalBaseRules}
                      onClassificationChange={() => {
                        setClassificationDirty(true);
                        setNotice(undefined);
                      }}
                    />
                  </FormProvider>
                ),
              }
            : undefined
        }
        submitButtonOptions={{
          label: 'Spara utredning',
          leadingIcon: false,
          loading: isSaving,
          disabled: !isDirty && !classificationDirty,
        }}
      />
    </section>
  );
}
