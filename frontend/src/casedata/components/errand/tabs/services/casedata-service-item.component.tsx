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
          <LucideIcon name="list-checks" size={24} className="text-dark-secondary" />
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <div className="flex justify-between items-center">
            <div className="text-base font-bold text-dark-secondary">
              {service.restyp}
              {service.isWinterService ? ' (Vinterfärdtjänst)' : ''}
            </div>
            <div className="text-md font-normal text-dark-secondary whitespace-nowrap">
              {service?.validityType === 'tillsvidare'
                ? `Insatsen gäller från och med ${service?.startDate}`
                : `Insatsen gäller ${service?.startDate} - ${service?.endDate}`}
            </div>
          </div>

          <div className="flex gap-16 items-center text-md flex-wrap">
            <div className="flex items-center gap-4 text-dark-secondary">
              <LucideIcon name="car" size={16} />
              <span>{service?.transportMode?.length > 0 ? service?.transportMode?.join(', ') : 'Inget valt färdsätt'}</span>
            </div>
            <div className="flex items-center gap-4 text-dark-secondary">
              <LucideIcon name="cog" size={16} />
              <span>{service?.aids?.length > 0 ? service?.aids?.join(', ') : 'Inga valda hjälpmedel'}</span>
            </div>
            <div className="flex items-center gap-4 text-dark-secondary">
              <LucideIcon name="plus-circle" size={16} />
              <span>{service?.addon?.length > 0 ? service?.addon?.join(', ') : 'Inga valda tillägg'}</span>
            </div>
          </div>

          <div
            className="text-dark-secondary text-base break-words whitespace-pre-wrap leading-relaxed overflow-hidden"
            style={{ wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: sanitized(service?.comment) }}
          />

          {!readOnly && (
            <div className="pt-16 flex gap-16">
              <Button size="sm" color="vattjom" onClick={() => onRemove?.(service.id)}>
                Ta bort insats
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
