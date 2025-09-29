import sanitized from '@common/services/sanitizer-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button } from '@sk-web-gui/react';
import React from 'react';
import { Service } from './casedata-service-mapper';

interface Props {
  service: Service;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export const ServiceListItem: React.FC<Props> = ({ service: service, onRemove, readOnly }) => {
  return (
    <div className="w-full py-24 border-b border-gray-200">
      <div className="flex items-start gap-18">
        <div className="p-12 bg-vattjom-background-300 rounded-lg flex items-center justify-start">
          <LucideIcon name="list-checks" size={24} className="text-primary-900" />
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <div className="flex justify-between items-center">
            <div className="text-base font-bold text-primary-900 dark:text-white">
              {service.restyp}
              {service.winter ? ' (Vinterfärdtjänst)' : ''}
            </div>
            <div className="text-md font-normal text-primary-700 dark:text-white whitespace-nowrap">
              {service?.validityType === 'tillsvidare'
                ? `Insatsen gäller från och med ${service?.startDate}`
                : `Insatsen gäller ${service?.startDate} - ${service?.endDate}`}
            </div>
          </div>

          <div className="flex gap-16 items-center text-md">
            <div className="flex items-center gap-4 text-primary-900 dark:text-white">
              <LucideIcon name="car" size={16} />
              <span>{service?.transport}</span>
            </div>
            <div className="flex items-center gap-4 text-primary-700 dark:text-white">
              <LucideIcon name="cog" size={16} />
              <span>{service?.aids?.length > 0 ? service?.aids?.join(', ') : 'Inga valda hjälpmedel'}</span>
            </div>
          </div>

          <div
            className="text-primary-900 dark:text-white text-base break-words whitespace-pre-wrap leading-relaxed overflow-hidden"
            style={{ wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: sanitized(service?.comment) }}
          />

          {!readOnly && (
            <div className="pt-16 flex gap-16">
              <Button size="sm" variant="secondary" onClick={() => onRemove?.(service.id)}>
                Ta bort
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
