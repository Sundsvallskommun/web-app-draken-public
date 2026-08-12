import type { RJSFSchema, UiSchema } from '@rjsf/utils';

import investigationSchemaCases from '../schemas/fixtures/investigation-schema-cases.json';
import managerSchemaRequest from '../schemas/utredning-enhetschef.schema-request.json';
import managerUiSchemaRequest from '../schemas/utredning-enhetschef.ui-schema-request.json';
import hslSchemaRequest from '../schemas/utredning-hsl.schema-request.json';
import hslUiSchemaRequest from '../schemas/utredning-hsl.ui-schema-request.json';
import solLssSchemaRequest from '../schemas/utredning-sol-lss.schema-request.json';
import solLssUiSchemaRequest from '../schemas/utredning-sol-lss.ui-schema-request.json';
import { InvestigationFormData, InvestigationSchemaKey } from './investigation-schema-lab.types';

interface JsonSchemaRequest {
  name: string;
  version: string;
  description: string;
  value: RJSFSchema;
}

interface UiSchemaRequest {
  description: string;
  value: UiSchema;
}

export interface InvestigationSchemaDefinition {
  key: InvestigationSchemaKey;
  tabLabel: string;
  ownerLabel: string;
  description: string;
  schemaId: string;
  schemaVersion: string;
  schema: RJSFSchema;
  uiSchema: UiSchema;
  exampleFormData: InvestigationFormData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJsonSchemaRequest(value: unknown, expectedName: InvestigationSchemaKey): JsonSchemaRequest {
  if (
    !isRecord(value) ||
    value.name !== expectedName ||
    typeof value.version !== 'string' ||
    typeof value.description !== 'string' ||
    !isRecord(value.value)
  ) {
    throw new Error(`Ogiltig lokal JSON-schemaartefakt för ${expectedName}.`);
  }

  return {
    name: expectedName,
    version: value.version,
    description: value.description,
    value: value.value,
  };
}

function readUiSchemaRequest(value: unknown, expectedName: InvestigationSchemaKey): UiSchemaRequest {
  if (!isRecord(value) || typeof value.description !== 'string' || !isRecord(value.value)) {
    throw new Error(`Ogiltig lokal UI-schemaartefakt för ${expectedName}.`);
  }

  return {
    description: value.description,
    value: value.value,
  };
}

function readExampleFormData(value: unknown, expectedName: InvestigationSchemaKey): InvestigationFormData {
  if (!isRecord(value) || !isRecord(value[expectedName]) || !isRecord(value[expectedName].valid)) {
    throw new Error(`Ogiltig lokal exempelfixture för ${expectedName}.`);
  }

  return value[expectedName].valid;
}

function createSchemaDefinition({
  key,
  tabLabel,
  ownerLabel,
  schemaRequestValue,
  uiSchemaRequestValue,
}: {
  key: InvestigationSchemaKey;
  tabLabel: string;
  ownerLabel: string;
  schemaRequestValue: unknown;
  uiSchemaRequestValue: unknown;
}): InvestigationSchemaDefinition {
  const schemaRequest = readJsonSchemaRequest(schemaRequestValue, key);
  const uiSchemaRequest = readUiSchemaRequest(uiSchemaRequestValue, key);
  const exampleFormData = readExampleFormData(investigationSchemaCases, key);

  return {
    key,
    tabLabel,
    ownerLabel,
    description:
      typeof schemaRequest.value.description === 'string' ? schemaRequest.value.description : schemaRequest.description,
    schemaId: `2281_${schemaRequest.name}_${schemaRequest.version}`,
    schemaVersion: schemaRequest.version,
    schema: schemaRequest.value,
    uiSchema: uiSchemaRequest.value,
    exampleFormData,
  };
}

export const investigationSchemaDefinitions: readonly InvestigationSchemaDefinition[] = [
  createSchemaDefinition({
    key: 'utredning-enhetschef',
    tabLabel: 'Utredning enhetschef',
    ownerLabel: 'Enhetschef',
    schemaRequestValue: managerSchemaRequest,
    uiSchemaRequestValue: managerUiSchemaRequest,
  }),
  createSchemaDefinition({
    key: 'utredning-sol-lss',
    tabLabel: 'Utredning SoL/LSS',
    ownerLabel: 'LEX-utredare',
    schemaRequestValue: solLssSchemaRequest,
    uiSchemaRequestValue: solLssUiSchemaRequest,
  }),
  createSchemaDefinition({
    key: 'utredning-hsl',
    tabLabel: 'Utredning HSL',
    ownerLabel: 'MAS/MAR',
    schemaRequestValue: hslSchemaRequest,
    uiSchemaRequestValue: hslUiSchemaRequest,
  }),
];

export function getInvestigationSchemaDefinition(schemaKey: InvestigationSchemaKey): InvestigationSchemaDefinition {
  const definition = investigationSchemaDefinitions.find(({ key }) => key === schemaKey);
  if (!definition) throw new Error(`Utredningsschema saknas för ${schemaKey}.`);

  return definition;
}
