'use client';

import type { FC } from 'react';

import { avvikelseClassificationContent } from './avvikelse-classification-content';
import {
  type AvvikelseGroupedClassificationSelection,
  LabelClassification,
  type LabelClassificationCatalog,
  type LabelClassificationSelection,
  type MissingAvvikelseGroupedClassificationChoice,
} from './label-classification';

/** One group's selector: the legal bases it is headed by and the categories it offers. */
export interface AvvikelseGroupedClassificationField {
  readonly key: string;
  /** The group's chosen legal bases, such as HSL, SoL, LSS or SoL/LSS. */
  readonly label: string;
  readonly catalog: LabelClassificationCatalog;
  /** The choice pointed out as missing, once a save has asked for it. */
  readonly missing?: MissingAvvikelseGroupedClassificationChoice['missing'];
}

/**
 * The categorization selectors, one per group of chosen legal bases. What the groups are and where a
 * choice is kept belongs to the caller, so the errand and the schema lab render the same selectors.
 */
export const AvvikelseGroupedClassificationFields: FC<{
  fields: readonly AvvikelseGroupedClassificationField[];
  selections: AvvikelseGroupedClassificationSelection;
  disabled?: boolean;
  onChange: (groupKey: string, selection: LabelClassificationSelection) => void;
}> = ({ fields, selections, disabled = false, onChange }) => (
  <div className="flex flex-col gap-lg">
    {fields.map(({ key, label, catalog, missing }) => (
      <fieldset key={key} className="flex min-w-0 flex-col gap-sm" data-cy={`avvikelse-label-categorization-${key}`}>
        <legend className="mb-sm text-label-large">{label}</legend>
        <LabelClassification
          catalog={catalog}
          value={selections[key] ?? {}}
          disabled={disabled}
          content={avvikelseClassificationContent}
          errors={{
            type: missing === 'type' ? 'Välj avvikelsetyp' : undefined,
            subtype: missing === 'subtype' ? 'Välj underkategori' : undefined,
          }}
          onChange={(selection) => onChange(key, selection)}
        />
      </fieldset>
    ))}
  </div>
);
