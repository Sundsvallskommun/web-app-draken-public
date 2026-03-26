'use client';

import { useJsonSchema } from '@common/components/json/hooks/useJsonSchema';
import SchemaForm from '@common/components/json/schema/schema-form.component';
import { JsonParameter } from '@common/data-contracts/supportmanagement/data-contracts';
import { Spinner } from '@sk-web-gui/react';
import React from 'react';

interface JsonParameterItemProps {
  param: JsonParameter;
  municipalityId: string;
}

const JsonParameterItem: React.FC<JsonParameterItemProps> = ({ param, municipalityId }) => {
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
    return null;
  }

  return (
    <div className="mb-16">
      <SchemaForm schema={schema} uiSchema={uiSchema ?? undefined} formData={param.value} disabled />
    </div>
  );
};

interface JsonParametersDisplayProps {
  jsonParameters: JsonParameter[];
  municipalityId: string;
}

export const JsonParametersDisplay: React.FC<JsonParametersDisplayProps> = ({ jsonParameters, municipalityId }) => {
  if (!jsonParameters || jsonParameters.length === 0) {
    return null;
  }

  return (
    <div className="mt-16">
      {jsonParameters.map((param, idx) => (
        <JsonParameterItem key={`${param.key}-${param.schemaId}-${idx}`} param={param} municipalityId={municipalityId} />
      ))}
    </div>
  );
};
