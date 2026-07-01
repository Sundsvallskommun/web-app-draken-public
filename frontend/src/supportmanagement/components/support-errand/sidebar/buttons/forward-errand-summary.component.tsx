'use client';

import { PriorityComponent } from '@common/components/priority/priority.component';
import { prettyTime } from '@common/services/helper-service';
import sanitized from '@common/services/sanitizer-service';
import { appConfig } from '@config/appconfig';
import { Button } from '@sk-web-gui/react';
import {
  Channels,
  findPriorityLabelForPriorityKey,
  getLabelCategory,
  getLabelType,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Read-only summary of the data carried over when an errand is transferred (errand type, number,
 * priority, channel, registration time, description and parties). Shared by the casedata (MEX)
 * forward and the namespace handover so both look identical.
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

  return (
    <>
      <div className="flex flex-row gap-80">
        <div className="flex flex-col">
          <span className="font-bold text-small">Ärendetyp</span>
          <span className="text-small">
            {appConfig.features.useThreeLevelCategorization
              ? `${getLabelCategory(errand!, metadata!)?.displayName || ''}${
                  getLabelType(errand!)?.displayName ? ` - ${getLabelType(errand!)?.displayName}` : ''
                }`
              : metadata?.categories
                  ?.find((category) => category.name === errand?.category)
                  ?.types?.find((type) => type.name === errand?.type)?.displayName || errand?.type}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-small">Ärendenummer</span>
          <span className="text-small">{errand?.errandNumber}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-small">Prioritet</span>
          <div className="flex text-small items-center gap-4">
            <PriorityComponent priority={findPriorityLabelForPriorityKey(errand?.priority || '')} />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-small">Inkom via</span>
          <span className="text-small">{Channels[errand?.channel as keyof typeof Channels]}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-small">Registrerat</span>
          <span className="text-small">{prettyTime(errand?.created || '')}</span>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-small">Ärendebeskrivning</span>
        <span
          ref={descriptionRef}
          className={`text-small ${showFullDescription ? '' : 'line-clamp-3'}`}
          dangerouslySetInnerHTML={{ __html: sanitized(errand?.description || '') }}
        />
      </div>
      {errand?.description && (isDescriptionClamped || showFullDescription) && (
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

      <span className="font-bold text-small">Parter</span>
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
    </>
  );
};
