import TextEditor from '@common/components/dynamic-text-editor';
import { Warning, WarningType } from '@common/data-contracts/supportmanagement/data-contracts';
import { Alert, Divider, FormControl, FormLabel, Select } from '@sk-web-gui/react';
import { useMetadataStore } from '@stores/index';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';

import { ForwardErrandSummary } from '../forward-errand-summary.component';
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

/** Step 2 – renders the handover preview: auto-copied fields, required mappings, fields that can not
 * be copied, what to include and how to handle the source errand. */
export const HandoverReview: React.FC<{ handover: SupportHandoverState; supportErrand: SupportErrand }> = ({
  handover,
  supportErrand,
}) => {
  const supportMetadata = useMetadataStore((state) => state.supportMetadata);
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

      {/* Samma sektion och komponent som vid MEX-överlämning */}
      <div className="flex flex-col gap-8" data-cy="handover-autocopy">
        <h4 className="text-h4-md py-12">Uppgifter från ärendet som överlämnas</h4>
        <ForwardErrandSummary errand={supportErrand} metadata={supportMetadata} />
      </div>

      {/* Namespace-bundna fält som måste mappas (det enda som skiljer mot MEX). Three-level-namespaces
          klassificeras via label-trädet, two-level via kategori/typ – precis som i registreringsvyn. */}
      <div className="flex flex-col gap-16">
        {handover.targetUsesLabels ? (
          <HandoverThreeLevelClassification
            sourceErrand={supportErrand}
            targetMetadata={handover.targetMetadata}
            value={handover.threeLevelLabels}
            onChange={handover.setThreeLevelLabels}
          />
        ) : (
          classificationMapping && (
            <div className="flex flex-row gap-16 flex-wrap">
              <FormControl id="handover-category" className="grow">
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
              <FormControl id="handover-type" className="grow">
                <FormLabel className="font-semibold">Typ</FormLabel>
                <Select
                  className="w-full"
                  data-cy="handover-type-select"
                  disabled={!handover.mapping.category}
                  value={handover.mapping.type}
                  onChange={(event) => handover.setMappingType(event.target.value)}
                >
                  <Select.Option value="">Välj typ</Select.Option>
                  {typeCandidates.map((type) => (
                    <Select.Option key={type} value={type}>
                      {typeDisplayName(handover.mapping.category, type)}
                    </Select.Option>
                  ))}
                </Select>
              </FormControl>
            </div>
          )
        )}

        {contactReasonMapping && contactReasonMapping.candidates.length > 0 && (
          <FormControl id="handover-contactreason" className="w-full">
            <div className="flex items-center gap-8">
              <FormLabel className="font-semibold">Kontaktorsak</FormLabel>
              {contactReasonMapping.suggested && handover.mapping.contactReason === contactReasonMapping.suggested && (
                <HandoverAutoSuggestIndicator />
              )}
            </div>
            <Select
              className="w-full"
              data-cy="handover-contactreason-select"
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

      <Divider />
      {/* Meddelande – skickas som intern konversation på det nya ärendet (likt MEX) */}
      <div className="flex flex-col gap-8">
        <h4 className="text-h4-md">Meddelande</h4>
        <span className="text-small">Skriv ett meddelande om du vill skicka med mer information på ärendet.</span>
        <div data-cy="handover-message-wrapper">
          <TextEditor
            readOnly={false}
            className="mb-50 h-[15rem]"
            value={{ plainText: handover.messageBodyPlaintext, markup: handover.message }}
            onChange={(event) => {
              handover.setMessage(event.target.value.markup ?? '');
              handover.setMessageBodyPlaintext(event.target.value.plainText ?? '');
            }}
          />
        </div>
      </div>
    </div>
  );
};
