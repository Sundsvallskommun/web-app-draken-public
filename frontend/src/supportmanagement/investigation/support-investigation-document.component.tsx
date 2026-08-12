'use client';

import { ArrayObjectFieldTemplate } from '@common/components/json/fields/array-object-field-template.componant';
import SchemaForm from '@common/components/json/schema/schema-form.component';
import { getLatestRjsfSchema, getRjsfSchema, getUiSchemaForSchema } from '@common/components/json/utils/schema-utils';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { Alert, Label, Spinner } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import type { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { InvestigationDocumentDefinition, InvestigationFormData } from './investigation-document';
import {
  getHslRiskValue,
  getInvestigationRenderingSchema,
  normalizeInvestigationFormData,
} from './investigation-form-data';
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
  etag?: string;
}

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
  const errandId = useSupportStore((state) => state.supportErrand?.id);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [documentState, setDocumentState] = useState<InvestigationDocumentState>();
  const [notice, setNotice] = useState<{ type: 'error' | 'warning' | 'success'; message: string }>();
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const setDocumentDirty = useCallback(
    (nextDirty: boolean) => {
      setIsDirty(nextDirty);
      onDirtyChange(nextDirty);
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
          formData: normalizeInvestigationFormData(
            definition.key,
            loadedSchema.schema,
            storedDocument?.document.value ?? {}
          ),
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

    void loadDocument();
    return () => {
      cancelled = true;
      onDirtyChange(false);
    };
  }, [definition.key, errandId, municipalityId, onDirtyChange, setDocumentDirty]);

  const renderingSchema = useMemo(
    () =>
      documentState
        ? getInvestigationRenderingSchema(definition.key, documentState.schema, documentState.formData)
        : undefined,
    [definition.key, documentState]
  );
  const hslRiskValue =
    definition.key === 'utredning-enhetschef' && documentState ? getHslRiskValue(documentState.formData) : undefined;

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

    const normalizedData = normalizeInvestigationFormData(definition.key, documentState.schema, formData);
    setDocumentState((current) => (current ? { ...current, formData: normalizedData } : current));
    setIsSaving(true);
    setNotice(undefined);

    try {
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
              etag: saved.etag,
            }
          : current
      );
      setDocumentDirty(false);
      setNotice({ type: 'success', message: 'Utredningen har sparats.' });
      onSaved(saved.document);
    } catch (error) {
      const message = isSupportInvestigationConflict(error)
        ? 'Utredningen har ändrats av någon annan. Dina ändringar finns kvar här. Ladda om ärendet och jämför innan du sparar igen.'
        : (error as AxiosError<{ message?: string }>).response?.data?.message ??
          'Utredningen kunde inte sparas. Dina ändringar finns kvar och du kan försöka igen.';
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
            {isDirty && (
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
        uiSchema={documentState.uiSchema}
        idPrefix={definition.key}
        arrayFieldTemplate={ArrayObjectFieldTemplate}
        formData={documentState.formData}
        onChange={(formData) => {
          if (isSaving) return;
          const normalizedData = normalizeInvestigationFormData(definition.key, documentState.schema, formData);
          setDocumentState((current) => (current ? { ...current, formData: normalizedData } : current));
          setDocumentDirty(true);
          setNotice(undefined);
        }}
        onSubmit={(formData) => void save(formData)}
        readonly={readonly || isSaving}
        submitButtonOptions={{
          label: 'Spara utredning',
          leadingIcon: false,
          loading: isSaving,
          disabled: !isDirty,
        }}
      />
    </section>
  );
}
