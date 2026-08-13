'use client';

import { ArrayObjectFieldTemplate } from '@common/components/json/fields/array-object-field-template.componant';
import SchemaForm from '@common/components/json/schema/schema-form.component';
import { getLatestRjsfSchema, getRjsfSchema, getUiSchemaForSchema } from '@common/components/json/utils/schema-utils';
import type { Label as SupportLabel } from '@common/data-contracts/supportmanagement/data-contracts';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { Alert, Label, Spinner } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import { IafLabelCategorization } from '@supportmanagement/components/support-errand-basics-form/iaf-label-categorization.component';
import {
  applyIafLabelClassificationSelection,
  createIafLabelClassificationModel,
  getIafLabelClassificationSelection,
  getPersistedIafLabelClassificationState,
  type IafLabelClassificationModel,
  type IafLabelClassificationUpdate,
} from '@supportmanagement/investigation/label-classification';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import type { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';

import {
  getInvestigationClassificationSchemaContract,
  getInvestigationClassificationUiSchema,
  getInvestigationLegalBases,
  isInvestigationClassificationOwner,
  isReportedMisconductErrand,
  normalizeContextualInvestigationFormData,
} from './investigation-classification';
import type { InvestigationDocumentDefinition, InvestigationFormData } from './investigation-document';
import { getHslRiskValue, getInvestigationRenderingSchema } from './investigation-form-data';
import {
  buildSupportInvestigationClassificationRequest,
  isSupportInvestigationClassificationConflict,
  saveSupportInvestigationClassification,
  type SupportInvestigationClassificationRequest,
} from './support-investigation-classification-service';
import {
  getSupportInvestigationDocument,
  isSupportInvestigationConflict,
  saveSupportInvestigationDocument,
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

interface InvestigationClassificationDraft {
  labels: SupportLabel[];
  category: string;
  type: string;
  subType: string;
  classificationHasSubTypes: boolean;
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

function InvestigationAlert({ type, message }: { type: 'error' | 'warning' | 'success'; message: string }) {
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
}: SupportInvestigationDocumentProps) {
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
          : await getLatestRjsfSchema(municipalityId, definition.key);
        const uiSchema = await getUiSchemaForSchema(municipalityId, loadedSchema.schemaId);

        if (cancelled) return;
        setDocumentState({
          schema: loadedSchema.schema,
          uiSchema,
          schemaId: loadedSchema.schemaId,
          formData: normalizeContextualInvestigationFormData(
            definition.key,
            loadedSchema.schema,
            storedDocument?.document.value ?? {},
            reportedMisconduct
          ),
          persisted: Boolean(storedDocument),
          etag: storedDocument?.etag,
        });
        setLoadState('ready');
      } catch (error) {
        if (cancelled) return;
        console.error(`Failed to load investigation document ${definition.key}`, error);
        setLoadState('error');
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
  }, [definition.key, errandId, municipalityId, reportedMisconduct, resetClassification, setDocumentDirty]);

  const renderingSchema = useMemo(
    () =>
      documentState
        ? getInvestigationRenderingSchema(definition.key, documentState.schema, documentState.formData)
        : undefined,
    [definition.key, documentState]
  );
  const hslRiskValue =
    definition.key === 'utredning-enhetschef' && documentState ? getHslRiskValue(documentState.formData) : undefined;
  const classificationOwner = isInvestigationClassificationOwner(definition.key, supportErrand);
  const classificationSchemaContract = documentState
    ? getInvestigationClassificationSchemaContract(definition.key, documentState.schema)
    : undefined;
  const legalBases = documentState ? getInvestigationLegalBases(documentState.formData) : [];
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

  const save = async (formData: InvestigationFormData) => {
    if (!municipalityId || !errandId || readonly || isSaving) return;

    const normalizedData = normalizeContextualInvestigationFormData(
      definition.key,
      documentState.schema,
      formData,
      reportedMisconduct
    );
    setDocumentState((current) => (current ? { ...current, formData: normalizedData } : current));
    setIsSaving(true);
    setNotice(undefined);
    const classificationRequired = classificationOwner;
    let documentSavedForClassification = documentSavedPendingClassification;
    let savedDocument = false;
    let savedClassification = false;

    try {
      let classificationRequest: SupportInvestigationClassificationRequest | undefined;
      let classificationModel: IafLabelClassificationModel | undefined;
      let classificationUpdate: IafLabelClassificationUpdate | undefined;
      const persistedClassificationState =
        classificationRequired && !classificationDirty
          ? getPersistedIafLabelClassificationState(
              supportMetadata?.labels?.labelStructure,
              getInvestigationLegalBases(normalizedData),
              persistedClassification
            )
          : undefined;
      if (
        persistedClassificationState &&
        persistedClassificationState !== 'known-valid' &&
        persistedClassificationState !== 'legacy-unknown'
      ) {
        await triggerClassification(['category', 'type', 'subType']);
        throw new Error(
          persistedClassificationState === 'known-disallowed-legal-base'
            ? 'Den befintliga kategoriseringen stämmer inte med valda lagrum. Välj en giltig avvikelsetyp och underkategori.'
            : persistedClassificationState === 'known-missing-required-type'
            ? 'Välj underkategori innan utredningen sparas.'
            : 'Välj avvikelsetyp och underkategori innan utredningen sparas.'
        );
      }

      if (classificationRequired && classificationDirty) {
        const classificationValid = await triggerClassification(['category', 'type', 'subType']);
        if (!classificationValid) {
          throw new Error('Välj avvikelsetyp och underkategori innan utredningen sparas.');
        }
        const currentClassification = getClassificationValues();
        classificationModel = createIafLabelClassificationModel(
          supportMetadata?.labels?.labelStructure,
          getInvestigationLegalBases(normalizedData)
        );
        const selection = getIafLabelClassificationSelection(classificationModel, currentClassification.labels, {
          category: currentClassification.category,
          type: currentClassification.type,
          subType: currentClassification.subType,
        });
        classificationUpdate = applyIafLabelClassificationSelection(
          classificationModel,
          currentClassification.labels,
          selection
        );
        classificationRequest = buildSupportInvestigationClassificationRequest(
          classificationUpdate,
          supportErrand?.version
        );
      }

      const mustCreateDocumentBeforeClassification = !documentState.persisted && classificationDirty;
      if (!documentSavedPendingClassification && (isDirty || mustCreateDocumentBeforeClassification)) {
        const saved = await saveSupportInvestigationDocument(
          municipalityId,
          errandId,
          definition.key,
          { schemaId: documentState.schemaId, value: normalizedData },
          documentState.etag
        );
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
        savedDocument = true;
        setDocumentDirty(false);

        if (classificationDirty) {
          documentSavedForClassification = true;
          setDocumentSavedPendingClassification(true);
        }
      }

      if (classificationRequest && classificationUpdate && classificationDirty) {
        if (!classificationModel) {
          throw new Error('Klassificeringsmodellen kunde inte läsas in.');
        }
        const savedErrand = await saveSupportInvestigationClassification(
          municipalityId,
          errandId,
          classificationRequest
        );
        const savedSelection = getIafLabelClassificationSelection(
          classificationModel,
          savedErrand.labels,
          savedErrand.classification
        );
        const savedClassificationUpdate = applyIafLabelClassificationSelection(
          classificationModel,
          savedErrand.labels,
          savedSelection
        );
        const savedClassificationDraft: InvestigationClassificationDraft = {
          labels: savedErrand.labels,
          category: savedClassificationUpdate.category,
          type: savedClassificationUpdate.type,
          subType: savedClassificationUpdate.subType,
          classificationHasSubTypes: savedClassificationUpdate.requiresSubType,
        };
        savedClassification = true;

        useSupportStore.setState((state) => {
          if (!state.supportErrand || state.supportErrand.id !== errandId) return state;
          return {
            supportErrand: {
              ...state.supportErrand,
              classification: savedErrand.classification,
              labels: savedErrand.labels,
              category: savedClassificationUpdate.category,
              type: savedClassificationUpdate.type,
              subType: savedClassificationUpdate.subType,
              classificationHasSubTypes: savedClassificationUpdate.requiresSubType,
              version: savedErrand.version,
            },
          };
        });
        resetClassification(savedClassificationDraft);
        resetErrandField('classification', { defaultValue: savedErrand.classification });
        resetErrandField('labels', { defaultValue: savedClassificationDraft.labels });
        resetErrandField('category', { defaultValue: savedClassificationDraft.category });
        resetErrandField('type', { defaultValue: savedClassificationDraft.type });
        resetErrandField('subType', { defaultValue: savedClassificationDraft.subType });
        resetErrandField('classificationHasSubTypes', {
          defaultValue: savedClassificationDraft.classificationHasSubTypes,
        });
        resetErrandField('version', { defaultValue: savedErrand.version });
      }

      setDocumentSavedPendingClassification(false);
      setClassificationDirty(false);
      setDocumentDirty(false);
      setNotice({
        type: 'success',
        message:
          savedDocument && savedClassification
            ? 'Utredningen och ärendets klassificering har sparats.'
            : savedClassification
            ? 'Ärendets klassificering har sparats.'
            : 'Utredningen har sparats.',
      });
    } catch (error) {
      const apiMessage = (error as AxiosError<{ message?: string }>).response?.data?.message;
      const localMessage = error instanceof Error ? error.message : undefined;
      const classificationConflict = isSupportInvestigationClassificationConflict(error);
      const message =
        classificationConflict && documentSavedForClassification && classificationDirty
          ? 'Utredningen har sparats, men ärendets klassificering har ändrats av någon annan. Dina kategoriseringsval finns kvar här. Ladda om ärendet och jämför innan du sparar klassificeringen igen.'
          : classificationConflict && classificationDirty
          ? 'Ärendets klassificering har ändrats av någon annan. Dina kategoriseringsval finns kvar här. Ladda om ärendet och jämför innan du sparar igen.'
          : documentSavedForClassification && classificationDirty
          ? 'Utredningen har sparats, men ärendets klassificering kunde inte synkroniseras. Försök igen; nästa försök uppdaterar bara klassificeringen.'
          : isSupportInvestigationConflict(error)
          ? 'Utredningen har ändrats av någon annan. Dina ändringar finns kvar här. Ladda om ärendet och jämför innan du sparar igen.'
          : apiMessage ??
            localMessage ??
            (classificationRequired && classificationDirty
              ? 'Ärendets klassificering kunde inte sparas. Dina ändringar finns kvar och du kan försöka igen.'
              : 'Utredningen kunde inte sparas. Dina ändringar finns kvar och du kan försöka igen.');
      setNotice({ type: 'error', message });
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
          classificationOwner
            ? {
                errandClassification: (
                  <FormProvider {...classificationMethods}>
                    <IafLabelCategorization
                      supportMetadata={supportMetadata}
                      disabled={readonly || isSaving}
                      legalBases={legalBases}
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
