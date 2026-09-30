import { Warning, WarningType } from '@common/data-contracts/supportmanagement/data-contracts';
import { Alert, FormControl, FormLabel, Select } from '@sk-web-gui/react';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';

import { HandoverAutoSuggestIndicator } from './handover-auto-suggest-indicator.component';
import { HandoverThreeLevelClassification } from './handover-three-level-classification.component';
import { SupportHandoverState } from './use-support-handover';

const warningText = (warning: Warning): string => {
  if (warning.type === WarningType.PARAMETER_SCHEMA_MISMATCH) {
    return `Parametern "${warning.key}" kan inte mappas: ${warning.detail ?? 'schema saknas i målnamespace'}`;
  }
  if (warning.type === WarningType.ROLE_NOT_IN_TARGET) {
    return `Rollen "${warning.value}" finns inte i målnamespace och kommer inte att kopieras.`;
  }
  return warning.detail ?? 'Varning';
};

const WarningBanners: React.FC<{ warnings: Warning[] }> = ({ warnings }) => {
  if (!warnings.length) {
    return null;
  }
  return (
    <div className="flex flex-col gap-8 mb-12">
      {warnings.map((warning, index) => (
        <Alert key={`warning-${index}`} type="warning" data-cy="handover-warning">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>{warningText(warning)}</Alert.Content.Description>
          </Alert.Content>
        </Alert>
      ))}
    </div>
  );
};

/**
 * Placeholder shown in the "Så ska ärendet registreras hos mottagaren" section before a receiving
 * namespace is chosen: the same two selects as the two-level mapping, disabled, so the modal keeps its
 * layout and the user sees what will be asked once a target is selected.
 */
export const HandoverClassificationPlaceholder: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-24" data-cy="handover-classification-placeholder">
    <FormControl id="handover-category-placeholder" className="w-full">
      <FormLabel className="font-semibold">Kategori</FormLabel>
      <Select className="w-full" disabled value="" aria-label="Välj kategori">
        <Select.Option value="">Välj kategori</Select.Option>
      </Select>
    </FormControl>
    <FormControl id="handover-type-placeholder" className="w-full">
      <FormLabel className="font-semibold">Ärendetyp</FormLabel>
      <Select className="w-full" disabled value="" aria-label="Välj ärendetyp">
        <Select.Option value="">Välj ärendetyp</Select.Option>
      </Select>
    </FormControl>
  </div>
);

/**
 * Step 2 – the namespace-bound fields that must be mapped for the receiving namespace (the only part of
 * the handover that differs from the MEX forward): preview warnings, classification and contact reason.
 * Three-level namespaces classify via the label tree, two-level via category/type – just like the
 * registration view. The errand summary and the message are rendered by the modal itself, shared with
 * the MEX forward.
 */
export const HandoverReview: React.FC<{ handover: SupportHandoverState; supportErrand: SupportErrand }> = ({
  handover,
  supportErrand,
}) => {
  const { preview } = handover;
  if (!preview) {
    return null;
  }

  // Display names for the target category/type, resolved from the target namespace metadata (the
  // preview only returns technical names). Falls back to the technical name when there is no match.
  const targetCategories = handover.targetMetadata?.categories ?? [];
  const categoryDisplayName = (name: string) =>
    targetCategories.find((category) => category.name === name)?.displayName || name;
  const typeDisplayName = (categoryName: string, typeName: string) =>
    targetCategories.find((category) => category.name === categoryName)?.types?.find((type) => type.name === typeName)
      ?.displayName || typeName;

  const mappingRequired = preview.mappingRequired;
  const warnings = preview.warnings ?? [];

  const classificationMapping = mappingRequired?.classification;
  const contactReasonMapping = mappingRequired?.contactReason;
  const typeCandidates = classificationMapping?.candidates?.[handover.mapping.category] ?? [];

  return (
    <div className="flex flex-col gap-16" data-cy="handover-review">
      <WarningBanners warnings={warnings} />

      {handover.targetUsesLabels ? (
        <HandoverThreeLevelClassification
          sourceErrand={supportErrand}
          targetMetadata={handover.targetMetadata}
          value={handover.threeLevelLabels}
          onChange={handover.setThreeLevelLabels}
        />
      ) : classificationMapping ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
          <FormControl id="handover-category" className="w-full">
            <div className="flex items-center gap-8">
              <FormLabel className="font-semibold">Kategori</FormLabel>
              {classificationMapping.suggestedCategory &&
                handover.mapping.category === classificationMapping.suggestedCategory && (
                  <HandoverAutoSuggestIndicator />
                )}
            </div>
            <Select
              className="w-full"
              data-cy="handover-category-select"
              aria-label="Välj kategori"
              value={handover.mapping.category}
              onChange={(event) => {
                handover.setMappingCategory(event.target.value);
                handover.setMappingType('');
              }}
            >
              <Select.Option value="">Välj kategori</Select.Option>
              {Object.keys(classificationMapping.candidates || {}).map((category) => (
                <Select.Option key={category} value={category}>
                  {categoryDisplayName(category)}
                </Select.Option>
              ))}
            </Select>
          </FormControl>
          <FormControl id="handover-type" className="w-full">
            <FormLabel className="font-semibold">Ärendetyp</FormLabel>
            <Select
              className="w-full"
              data-cy="handover-type-select"
              aria-label="Välj ärendetyp"
              disabled={!handover.mapping.category}
              value={handover.mapping.type}
              onChange={(event) => handover.setMappingType(event.target.value)}
            >
              <Select.Option value="">Välj ärendetyp</Select.Option>
              {typeCandidates.map((type) => (
                <Select.Option key={type} value={type}>
                  {typeDisplayName(handover.mapping.category, type)}
                </Select.Option>
              ))}
            </Select>
          </FormControl>
        </div>
      ) : (
        <HandoverClassificationPlaceholder />
      )}

      {contactReasonMapping && contactReasonMapping.candidates.length > 0 && (
        <FormControl id="handover-contactreason" className="w-full md:w-1/2 md:pr-12">
          <div className="flex items-center gap-8">
            <FormLabel className="font-semibold">Kontaktorsak</FormLabel>
            {contactReasonMapping.suggested && handover.mapping.contactReason === contactReasonMapping.suggested && (
              <HandoverAutoSuggestIndicator />
            )}
          </div>
          <Select
            className="w-full"
            data-cy="handover-contactreason-select"
            aria-label="Välj kontaktorsak"
            value={handover.mapping.contactReason}
            onChange={(event) => handover.setMappingContactReason(event.target.value)}
          >
            <Select.Option value="">Välj kontaktorsak</Select.Option>
            {contactReasonMapping.candidates.map((reason) => (
              <Select.Option key={reason} value={reason}>
                {reason}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
      )}
    </div>
  );
};
