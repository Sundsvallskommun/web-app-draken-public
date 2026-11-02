'use client';

import { PriorityComponent } from '@common/components/priority/priority.component';
import { prettyTime } from '@common/services/helper-service';
import { sanitized } from '@common/services/sanitizer-service';
import { appConfig } from '@config/appconfig';
import { Alert, Button } from '@sk-web-gui/react';
import {
  getLegacyClassificationSummary,
  showsLegacyClassification,
} from '@supportmanagement/services/legacy-classification-service';
import {
  Channels,
  findPriorityLabelForPriorityKey,
  getCategorizationLabels,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getLabelDisplayName } from '@supportmanagement/services/support-label-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';

import { getMissingFieldsNote, hasVisibleText } from './forward-errand-summary-fields';

/** One labelled value of the summary. */
const SummaryField: React.FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col">
    <span className="font-bold text-small">{label}</span>
    {children}
  </div>
);

/**
 * Read-only summary of the data carried over when an errand is transferred (errand type, number,
 * priority, channel, registration time, description and parties). Shared by the casedata (MEX)
 * forward and the namespace handover so both look identical. Fields the errand lacks are left out and
 * named in one note instead, so it is clear they will not be carried over.
 */
export const ForwardErrandSummary: React.FC<{ errand?: SupportErrand; metadata?: SupportMetadata }> = ({
  errand,
  metadata,
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isDescriptionClamped, setIsDescriptionClamped] = useState(false);
  const descriptionRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = descriptionRef.current;
    if (element && !showFullDescription) {
      setIsDescriptionClamped(element.scrollHeight > element.clientHeight);
    }
  }, [showFullDescription, errand?.description]);

  const stakeholders = [...(errand?.customer ?? []), ...(errand?.contacts ?? [])];

  let errandTypeText: string | undefined;
  if (!appConfig.features.useLabelCategorization) {
    errandTypeText =
      metadata?.categories
        ?.find((category) => category.name === errand?.category)
        ?.types?.find((type) => type.name === errand?.type)?.displayName || errand?.type;
  } else if (showsLegacyClassification(errand!)) {
    // LEGACY_CLASSIFICATION
    errandTypeText = getLegacyClassificationSummary(errand!, metadata);
  } else {
    errandTypeText = getCategorizationLabels(errand!)
      .map((label) => getLabelDisplayName(label, metadata))
      .join(' - ');
  }

  const channelText = Channels[errand?.channel as keyof typeof Channels];
  const hasDescription = hasVisibleText(errand?.description);
  const hasStakeholders = stakeholders.length > 0;

  const overviewFields = [
    { label: 'Ärendetyp', isPresent: !!errandTypeText, value: <span className="text-small">{errandTypeText}</span> },
    { label: 'Inkom via', isPresent: !!channelText, value: <span className="text-small">{channelText}</span> },
    {
      label: 'Registrerades',
      isPresent: !!errand?.created,
      value: <span className="text-small">{prettyTime(errand?.created || '')}</span>,
    },
    {
      label: 'Ärendenummer',
      isPresent: !!errand?.errandNumber,
      value: <span className="text-small">{errand?.errandNumber}</span>,
    },
    {
      label: 'Prioritet',
      isPresent: !!errand?.priority,
      value: (
        <div className="flex text-small items-center gap-4">
          <PriorityComponent priority={findPriorityLabelForPriorityKey(errand?.priority || '')} />
        </div>
      ),
    },
  ];
  const missingFieldsNote = getMissingFieldsNote([
    ...overviewFields.filter((field) => !field.isPresent).map((field) => field.label),
    ...(hasDescription ? [] : ['Ärendebeskrivning']),
    ...(hasStakeholders ? [] : ['Parter']),
  ]);

  return (
    <>
      <div className="flex flex-row flex-wrap gap-x-80 gap-y-16">
        {overviewFields
          .filter((field) => field.isPresent)
          .map((field) => (
            <SummaryField key={field.label} label={field.label}>
              {field.value}
            </SummaryField>
          ))}
      </div>
      {hasDescription && (
        <SummaryField label="Ärendebeskrivning">
          <span
            ref={descriptionRef}
            className={`text-small ${showFullDescription ? '' : 'line-clamp-3'}`}
            dangerouslySetInnerHTML={{ __html: sanitized(errand?.description || '') }}
          />
        </SummaryField>
      )}
      {hasDescription && (isDescriptionClamped || showFullDescription) && (
        <Button
          size="sm"
          className="w-fit"
          variant="tertiary"
          rightIcon={showFullDescription ? <ChevronUp /> : <ChevronDown />}
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? 'Visa mindre' : 'Visa mer'}
        </Button>
      )}

      {hasStakeholders && <span className="font-bold text-small">Parter</span>}
      {hasStakeholders && (
        <div className="flex flex-col gap-24 mb-12">
          {stakeholders.map((stakeholder, index) => {
            const role = metadata?.roles?.find((r) => r.name === stakeholder.role)?.displayName;
            const name =
              stakeholder.stakeholderType === 'ORGANIZATION'
                ? `${stakeholder.organizationName || ''}`
                : `${stakeholder.firstName || ''} ${stakeholder.lastName || ''}`;
            const idNumber =
              stakeholder.stakeholderType === 'ORGANIZATION'
                ? stakeholder.organizationNumber || stakeholder.externalId
                : stakeholder.personNumber;
            return (
              <div key={`stakeholder-${index}`} className="flex flex-col gap-4">
                <span className="text-small">
                  {name}
                  {idNumber ? `, ${idNumber}` : ''} ({role || stakeholder.role})
                </span>
                {stakeholder.address && (
                  <span className="text-small">
                    {stakeholder.address} {stakeholder.zipCode} {stakeholder.city}
                  </span>
                )}
                {stakeholder.emails?.map((email, idx) => (
                  <span key={`email-${idx}`} className="text-small">
                    {email.value}
                  </span>
                ))}
                {stakeholder.phoneNumbers?.map((phone, idx) => (
                  <span key={`phone-${idx}`} className="text-small">
                    {phone.value}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {missingFieldsNote && (
        <Alert type="info" className="mt-16" data-cy="forward-missing-fields">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Title>Uppgifter som saknas</Alert.Content.Title>
            <Alert.Content.Description>{missingFieldsNote}</Alert.Content.Description>
          </Alert.Content>
        </Alert>
      )}
    </>
  );
};
