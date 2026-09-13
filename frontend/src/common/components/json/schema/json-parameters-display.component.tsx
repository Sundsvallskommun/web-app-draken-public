'use client';

import type { FacilityFieldContext } from '@common/components/json/fields/facility-search-field.componant';
import { useJsonSchema } from '@common/components/json/hooks/useJsonSchema';
import SchemaForm from '@common/components/json/schema/schema-form.component';
import { Alert, Spinner } from '@sk-web-gui/react';
import { FC } from 'react';

export interface DisplayJsonParameter {
  key: string;
  value?: unknown;
  schemaId: string;
  version?: number;
}

interface JsonParameterItemProps extends FacilityFieldContext {
  param: DisplayJsonParameter;
  municipalityId: string;
}

const JsonParameterItem: FC<JsonParameterItemProps> = ({ param, municipalityId, placeLabelStructure }) => {
  const { schema, uiSchema, loading, error } = useJsonSchema(municipalityId, param.schemaId);

  if (loading) {
    return (
      <div className="flex items-center gap-md py-md">
        <Spinner size={2} />
        <span>Laddar schema...</span>
      </div>
    );
  }

  if (error || !schema) {
    return (
      <Alert type="error" className="mb-16">
        <Alert.Icon />
        <Alert.Content>
          <Alert.Content.Description>
            Uppgifterna för {param.key} kunde inte visas eftersom schemat {param.schemaId} inte kunde laddas.
          </Alert.Content.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <div className="mb-16">
      <SchemaForm
        placeLabelStructure={placeLabelStructure}
        schema={schema}
        uiSchema={uiSchema ?? undefined}
        formData={param.value}
        disabled
      />
    </div>
  );
};

interface JsonParametersDisplayProps extends FacilityFieldContext {
  jsonParameters: DisplayJsonParameter[];
  municipalityId: string;
}

export const JsonParametersDisplay: FC<JsonParametersDisplayProps> = ({
  jsonParameters,
  municipalityId,
  placeLabelStructure,
}) => {
  if (!jsonParameters || jsonParameters.length === 0) {
    return null;
  }

  return (
    <div className="mt-16">
      {jsonParameters.map((param, idx) => (
        <JsonParameterItem
          key={`${param.key}-${param.schemaId}-${idx}`}
          param={param}
          placeLabelStructure={placeLabelStructure}
          municipalityId={municipalityId}
        />
      ))}
    </div>
  );
};
