'use client';

import { useJsonSchemaByName } from '@common/components/json/hooks/useJsonSchemaByName';
import SchemaForm from '@common/components/json/schema/schema-form.component';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { Alert, Spinner, useSnackbar } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import { jsonParameterForSchema, upsertJsonParameter } from '@supportmanagement/services/support-errand-schema-service';
import {
  getSupportErrandById,
  isEserviceErrand,
  isSupportErrandLocked,
  saveSupportErrandJsonParameters,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { FC, useCallback, useEffect, useState } from 'react';

interface SupportErrandTypeFormProps {
  supportErrand: SupportErrand;
  municipalityId: string;
  /** The schema the errand type selects, derived from the errand's labels. */
  schemaName: string;
}

/**
 * The Ärendeuppgifter form for the errand's type, stored as a JSON parameter keyed by schema name.
 * An application filed in an e-service is shown as filed — its own schema version, read-only.
 */
export const SupportErrandTypeForm: FC<SupportErrandTypeFormProps> = ({
  supportErrand,
  municipalityId,
  schemaName,
}) => {
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const toastMessage = useSnackbar();
  const storedParameter = jsonParameterForSchema(supportErrand, schemaName);
  const { schema, uiSchema, schemaId, loading, error, notFound } = useJsonSchemaByName(
    municipalityId,
    schemaName,
    storedParameter?.schemaId
  );
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  const storedValue = JSON.stringify(storedParameter?.value ?? {});
  useEffect(() => {
    const parsed: unknown = JSON.parse(storedValue);
    setFormData(parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {});
  }, [storedValue, schemaName]);

  const readOnly = isEserviceErrand(supportErrand) || isSupportErrandLocked(supportErrand);

  const handleSubmit = useCallback(
    async (payload: Record<string, unknown>) => {
      const errandId = supportErrand.id;
      if (!schemaId || !errandId) return;

      setSubmitting(true);
      try {
        await saveSupportErrandJsonParameters(
          errandId,
          municipalityId,
          upsertJsonParameter(supportErrand.jsonParameters, { key: schemaName, value: payload, schemaId })
        );
        const { errand, error: fetchError } = await getSupportErrandById(errandId, municipalityId);
        if (!fetchError) {
          setSupportErrand(errand);
        }
        toastMessage(getToastOptions({ message: 'Ärendeuppgifterna sparades.', status: 'success' }));
      } catch {
        toastMessage(
          getToastOptions({ message: 'Något gick fel när ärendeuppgifterna skulle sparas.', status: 'error' })
        );
      } finally {
        setSubmitting(false);
      }
    },
    [municipalityId, schemaId, schemaName, setSupportErrand, supportErrand, toastMessage]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-md py-md">
        <Spinner size={2} />
        <span>Laddar schema...</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <Alert type="info" data-cy="type-form-not-found-notice">
        <Alert.Icon />
        <Alert.Content>
          <Alert.Content.Description>Ärendetypen har inga ärendeuppgifter att fylla i.</Alert.Content.Description>
        </Alert.Content>
      </Alert>
    );
  }

  if (error || !schema) {
    return (
      <Alert type="error" className="mb-16">
        <Alert.Icon />
        <Alert.Content>
          <Alert.Content.Description>
            Ärendeuppgifterna kunde inte visas eftersom schemat {schemaName} inte kunde laddas.
          </Alert.Content.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <SchemaForm
      schema={schema}
      uiSchema={uiSchema ?? undefined}
      formData={formData}
      onChange={(data: Record<string, unknown>) => setFormData(data)}
      onSubmit={handleSubmit}
      idPrefix={schemaName.replace(/[^\w-]/g, '_')}
      sectionOpening="first"
      disabled={readOnly}
      submitButtonOptions={{ label: 'Spara ärendeuppgifter', leadingIcon: false, loading: submitting }}
    />
  );
};
