'use client';

import { useJsonSchemaByName } from '@common/components/json/hooks/useJsonSchemaByName';
import { Divider } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import {
  type AttachmentRequirement,
  missingAttachments,
  requiredAttachments,
} from '@supportmanagement/services/support-attachment-requirement-service';
import { jsonParameterForSchema, schemaNameForErrand } from '@supportmanagement/services/support-errand-schema-service';
import { isRecord } from '@supportmanagement/services/support-form-value-service';
import { Check, TriangleAlert } from 'lucide-react';
import { FC } from 'react';

const DELIVERED_TEXT = 'Inlämnad';

const MISSING_TEXT = 'Saknas';

const RequirementRow: FC<{ requirement: AttachmentRequirement; isMissing: boolean }> = ({ requirement, isMissing }) => (
  <li
    className="flex items-center gap-8 text-small"
    data-cy={`required-attachment-${requirement.key}`}
    data-missing={isMissing}
  >
    {isMissing ? <TriangleAlert size={16} className="text-error" /> : <Check size={16} />}
    <span>{requirement.label}</span>
    <span className={isMissing ? 'text-error' : 'text-dark-secondary'}>
      {isMissing ? MISSING_TEXT : DELIVERED_TEXT}
    </span>
  </li>
);

/**
 * What the errand type asks for in the way of attachments, read from its schema. Only the ones the
 * answers actually call for are listed, so a handler sees what is expected of this errand rather
 * than everything the type could ever ask for.
 */
export const SupportErrandRequiredAttachments: FC = () => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportAttachments = useSupportStore((s) => s.supportAttachments);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const schemaName = schemaNameForErrand(supportErrand, supportMetadata?.namespace);
  const storedParameter = jsonParameterForSchema(supportErrand, schemaName);
  const { schema } = useJsonSchemaByName(municipalityId, schemaName, storedParameter?.schemaId);

  const answers = isRecord(storedParameter?.value) ? storedParameter.value : undefined;
  const required = requiredAttachments(schema, answers);

  if (required.length === 0) {
    return null;
  }

  const missing = new Set(missingAttachments(schema, answers, supportAttachments).map((one) => one.key));

  return (
    <div className="mt-md" data-cy="required-attachments">
      <Divider className="pt-16" />
      <p className="pt-16 font-bold">Bilagor som ärendetypen kräver</p>
      <ul className="mt-8 flex flex-col gap-8">
        {required.map((requirement) => (
          <RequirementRow key={requirement.key} requirement={requirement} isMissing={missing.has(requirement.key)} />
        ))}
      </ul>
    </div>
  );
};
