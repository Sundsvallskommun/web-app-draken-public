'use client';

import { useJsonSchemaByName } from '@common/components/json/hooks/useJsonSchemaByName';
import SchemaForm from '@common/components/json/schema/schema-form.component';
import { getSchemaFormErrors, type SchemaFormError } from '@common/components/json/utils/schema-form-error-handling';
import { getToastOptions } from '@common/utils/toast-message-settings';
import type { RJSFValidationError } from '@rjsf/utils';
import { Alert, Spinner, Switch, useSnackbar } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import {
  jsonParameterForSchema,
  ORIGINAL_KEY_SUFFIX,
  upsertJsonParameter,
} from '@supportmanagement/services/support-errand-schema-service';
import {
  getSupportErrandById,
  isSupportErrandLocked,
  saveSupportErrandJsonParameters,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { hasSupportProcessPassedStep, SupportProcessStep } from '@supportmanagement/services/support-process-service';
import { FC, useCallback, useEffect, useState } from 'react';

interface SupportErrandTypeFormProps {
  supportErrand: SupportErrand;
  municipalityId: string;
  /** The schema the errand type selects, derived from the errand's labels. */
  schemaName: string;
}

/**
 * The Ärendeuppgifter form for the errand's type, stored as a JSON parameter keyed by schema name.
 * An application filed in an e-service keeps the schema version it was filed under. The answers can
 * be changed until the errand has passed the investigation; from then on they stand as investigated. The
 * copy Katla keeps of them as filed (`<key>_original`) can be shown, read-only, in their place.
 */
export const SupportErrandTypeForm: FC<SupportErrandTypeFormProps> = ({
  supportErrand,
  municipalityId,
  schemaName,
}) => {
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const toastMessage = useSnackbar();
  const storedParameter = jsonParameterForSchema(supportErrand, schemaName);
  const originalParameter = jsonParameterForSchema(supportErrand, `${schemaName}${ORIGINAL_KEY_SUFFIX}`);
  const [showsOriginal, setShowsOriginal] = useState(false);
  const { schema, uiSchema, schemaId, loading, error, notFound } = useJsonSchemaByName(
    municipalityId,
    schemaName,
    storedParameter?.schemaId
  );
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<readonly SchemaFormError[]>([]);
  const idPrefix = schemaName.replace(/[^\w-]/g, '_');

  const storedValue = JSON.stringify(storedParameter?.value ?? {});
  useEffect(() => {
    const parsed: unknown = JSON.parse(storedValue);
    setFormData(parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {});
  }, [storedValue, schemaName]);

  const readOnly =
    isSupportErrandLocked(supportErrand) ||
    hasSupportProcessPassedStep(SupportProcessStep.INVESTIGATION, supportErrand.process);

  const handleSubmit = useCallback(
    async (payload: Record<string, unknown>) => {
      const errandId = supportErrand.id;
      if (!schemaId || !errandId) return;

      setValidationErrors([]);
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

  const handleError = useCallback(
    (errors: RJSFValidationError[]) => {
      setValidationErrors(schema ? getSchemaFormErrors(schema, errors, idPrefix) : []);
    },
    [idPrefix, schema]
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
    <>
      {originalParameter ? (
        <Switch
          className="mb-md"
          checked={showsOriginal}
          onChange={(e) => setShowsOriginal(e.target.checked)}
          data-cy="type-form-original-toggle"
        >
          Visa uppgifter från ansökan
        </Switch>
      ) : null}
      <SchemaForm
        schema={schema}
        uiSchema={uiSchema ?? undefined}
        formData={showsOriginal ? originalParameter?.value : formData}
        onChange={(data: Record<string, unknown>) => !showsOriginal && setFormData(data)}
        onSubmit={handleSubmit}
        onError={handleError}
        validationErrors={validationErrors}
        idPrefix={idPrefix}
        sectionOpening="first"
        disabled={readOnly || showsOriginal}
        submitButtonOptions={{ label: 'Spara ärendeuppgifter', leadingIcon: false, loading: submitting }}
      />
    </>
  );
};
