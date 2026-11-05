import type { RJSFSchema } from '@rjsf/utils';
import { describe, expect, test } from 'vitest';

import {
  attachmentRequirementsOfSchema,
  missingAttachments,
  requiredAttachments,
} from './support-attachment-requirement-service';
import type { SupportAttachment } from './support-attachment-service';

const attachment = (purpose?: string): SupportAttachment => ({
  id: `attachment-${purpose ?? 'none'}`,
  fileName: 'fil.pdf',
  mimeType: 'application/pdf',
  ...(purpose ? { purpose: { id: 'purpose-id', name: purpose } } : {}),
});

/** The declaration of the published folköl schemas, read from the jsonschema service 2026-11-05. */
const FOLKOL_SCHEMA: RJSFSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  'x-attachments': [
    {
      key: 'POWER_OF_ATTORNEY',
      label: 'Fullmakt',
      requiredWhen: {
        properties: { arDuFirmatecknare: { const: 'NEJ' } },
        required: ['arDuFirmatecknare'],
      },
    },
    {
      key: 'SELF_MONITORING_PROGRAM',
      label: 'Egenkontrollprogram',
      requiredWhen: {
        properties: { egenkontrollprogramFolkol: { const: 'JA' } },
        required: ['egenkontrollprogramFolkol'],
      },
    },
    { key: 'FOOD_BUSINESS_REGISTRATION', label: 'Livsmedelsregistrering från miljökontoret' },
  ],
} as RJSFSchema;

const keysOf = (requirements: { key: string }[]) => requirements.map((requirement) => requirement.key);

describe('attachmentRequirementsOfSchema', () => {
  test('reads what the errand type asks for', () => {
    expect(keysOf(attachmentRequirementsOfSchema(FOLKOL_SCHEMA))).toEqual([
      'POWER_OF_ATTORNEY',
      'SELF_MONITORING_PROGRAM',
      'FOOD_BUSINESS_REGISTRATION',
    ]);
  });

  test('a schema that asks for no attachments has none', () => {
    expect(attachmentRequirementsOfSchema({ type: 'object' })).toEqual([]);
    expect(attachmentRequirementsOfSchema(undefined)).toEqual([]);
    expect(attachmentRequirementsOfSchema({ 'x-attachments': {} } as RJSFSchema)).toEqual([]);
  });

  test('skips a malformed entry instead of dropping the whole list', () => {
    const schema = {
      'x-attachments': [
        { label: 'Utan nyckel' },
        { key: 'WITHOUT_LABEL' },
        'inte ens ett objekt',
        { key: 'FLOOR_PLAN', label: 'Planritning' },
      ],
    } as RJSFSchema;

    expect(keysOf(attachmentRequirementsOfSchema(schema))).toEqual(['FLOOR_PLAN']);
  });
});

describe('requiredAttachments', () => {
  test('asks for nothing while the answers have not been given', () => {
    expect(requiredAttachments(FOLKOL_SCHEMA, {})).toEqual([]);
    expect(requiredAttachments(FOLKOL_SCHEMA, undefined)).toEqual([]);
  });

  test('asks for the attachment the answer calls for', () => {
    expect(keysOf(requiredAttachments(FOLKOL_SCHEMA, { arDuFirmatecknare: 'NEJ' }))).toEqual(['POWER_OF_ATTORNEY']);
  });

  test('leaves the attachment alone when the answer points the other way', () => {
    expect(requiredAttachments(FOLKOL_SCHEMA, { arDuFirmatecknare: 'JA' })).toEqual([]);
  });

  test('asks for several when several answers call for them', () => {
    const answers = { arDuFirmatecknare: 'NEJ', egenkontrollprogramFolkol: 'JA' };

    expect(keysOf(requiredAttachments(FOLKOL_SCHEMA, answers))).toEqual([
      'POWER_OF_ATTORNEY',
      'SELF_MONITORING_PROGRAM',
    ]);
  });

  test('never asks for an attachment the schema declared without a condition', () => {
    const answers = { arDuFirmatecknare: 'NEJ', egenkontrollprogramFolkol: 'JA' };

    expect(keysOf(requiredAttachments(FOLKOL_SCHEMA, answers))).not.toContain('FOOD_BUSINESS_REGISTRATION');
  });

  test('treats a condition it cannot compile as not triggered', () => {
    const schema = {
      'x-attachments': [{ key: 'BROKEN', label: 'Trasig', requiredWhen: { type: 'inte-en-typ' } }],
    } as RJSFSchema;

    expect(requiredAttachments(schema, { anything: true })).toEqual([]);
  });
});

describe('missingAttachments', () => {
  const answers = { arDuFirmatecknare: 'NEJ', egenkontrollprogramFolkol: 'JA' };

  test('counts an uploaded attachment with the right purpose as delivered', () => {
    const delivered = [attachment('POWER_OF_ATTORNEY'), attachment('SELF_MONITORING_PROGRAM')];

    expect(missingAttachments(FOLKOL_SCHEMA, answers, delivered)).toEqual([]);
  });

  test('names what is still missing', () => {
    expect(keysOf(missingAttachments(FOLKOL_SCHEMA, answers, [attachment('POWER_OF_ATTORNEY')]))).toEqual([
      'SELF_MONITORING_PROGRAM',
    ]);
  });

  test('an attachment without a purpose answers for nothing', () => {
    expect(keysOf(missingAttachments(FOLKOL_SCHEMA, answers, [attachment()]))).toEqual([
      'POWER_OF_ATTORNEY',
      'SELF_MONITORING_PROGRAM',
    ]);
  });

  test('an errand with no attachments at all misses everything asked for', () => {
    expect(keysOf(missingAttachments(FOLKOL_SCHEMA, answers, undefined))).toEqual([
      'POWER_OF_ATTORNEY',
      'SELF_MONITORING_PROGRAM',
    ]);
  });

  test('misses nothing while the form is unanswered', () => {
    expect(missingAttachments(FOLKOL_SCHEMA, {}, undefined)).toEqual([]);
  });
});
