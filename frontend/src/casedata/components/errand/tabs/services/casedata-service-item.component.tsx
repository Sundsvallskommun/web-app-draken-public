import { AssetStatus, assetStatusLabels } from '@casedata/interfaces/asset';
import { canDeleteErrandServiceAsset, Service } from '@casedata/services/casedata-service-assets-service';
import sanitized from '@common/services/sanitizer-service';
import { Button, Label } from '@sk-web-gui/react';
import { Car, Cog, ExternalLink, ListChecks, Pencil, PlusCircle } from 'lucide-react';
import NextLink from 'next/link';
import { FC } from 'react';

const statusColor = (status?: AssetStatus): string => {
  switch (status) {
    case 'ACTIVE':
      return 'gronsta';
    case 'DRAFT':
      return 'warning';
    case 'EXPIRED':
      return 'error';
    case 'BLOCKED':
      return 'error';
    case 'TEMPORARY':
      return 'info';
    default:
      return 'tertiary';
  }
};

interface Props {
  service: Service;
  onRemove?: (id: string) => void;
  onEdit?: (id: string) => void;
  readOnly?: boolean;
  currentErrandId?: string;
}

export const ServiceListItem: FC<Props> = ({ service, onRemove, onEdit, readOnly, currentErrandId }) => {
  const canRemove = canDeleteErrandServiceAsset(service);
  const showSourceErrandLink =
    readOnly && !!service.sourceErrandNumber && (!currentErrandId || service.sourceErrandId !== currentErrandId);

  return (
    <div data-cy="service-item" className="w-full py-24 border-b border-gray-200 last:border-b-0">
      <div className="flex items-start gap-18">
        <div className="p-12 bg-vattjom-background-300 rounded-lg flex items-center justify-start">
          <ListChecks size={24} className="text-dark-secondary" />
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <div className="flex justify-between items-center gap-12">
            <div className="flex items-center gap-8 flex-wrap">
              <div className="text-base font-bold text-dark-secondary">
                {service.restyp.join(', ')}
                {service.isWinterService ? ' (Vinterfärdtjänst)' : ''}
              </div>
              {service.status && (
                <Label
                  rounded
                  inverted
                  color={statusColor(service.status)}
                  className="max-h-full h-auto text-center whitespace-nowrap"
                >
                  {assetStatusLabels[service.status] ?? service.status}
                </Label>
              )}
            </div>
            <div className="text-md font-normal text-dark-secondary whitespace-nowrap">
              {service?.validTo
                ? `Insatsen gäller ${service.issued} - ${service.validTo}`
                : service?.issued
                ? `Insatsen gäller från och med ${service.issued}`
                : ''}
            </div>
          </div>

          <div className="flex gap-16 items-center text-md flex-wrap">
            <div className="flex items-center gap-4 text-dark-secondary">
              <Car size={16} />
              <span>
                {service?.transportMode?.length > 0 ? service?.transportMode?.join(', ') : 'Inget valt färdsätt'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-dark-secondary">
              <Cog size={16} />
              <span>{service?.aids?.length > 0 ? service?.aids?.join(', ') : 'Inga valda hjälpmedel'}</span>
            </div>
            <div className="flex items-center gap-4 text-dark-secondary">
              <PlusCircle size={16} />
              <span>{service?.addon?.length > 0 ? service?.addon?.join(', ') : 'Inga valda tillägg'}</span>
            </div>
          </div>

          <div
            className="text-dark-secondary text-base break-words whitespace-pre-wrap leading-relaxed overflow-hidden [word-break:break-word]"
            dangerouslySetInnerHTML={{ __html: sanitized(service?.comment) }}
          />

          {showSourceErrandLink && (
            <div className="text-md font-normal">
              <NextLink
                href={`/arende/${service.sourceErrandNumber}`}
                className="inline-flex items-center gap-4 text-vattjom-link hover:underline"
                data-cy="service-source-errand-link"
              >
                <ExternalLink size={14} />
                <span>Tillhör ärende {service.sourceErrandNumber}</span>
              </NextLink>
            </div>
          )}

          {!readOnly && (onEdit || onRemove) && (
            <div className="pt-16 flex gap-16 items-center">
              {onEdit && (
                <Button
                  data-cy="edit-service-button"
                  size="sm"
                  color="vattjom"
                  variant="secondary"
                  leftIcon={<Pencil size={16} />}
                  onClick={() => onEdit(service.id)}
                >
                  Redigera insats
                </Button>
              )}
              {onRemove && canRemove && (
                <Button data-cy="remove-service-button" size="sm" color="vattjom" onClick={() => onRemove(service.id)}>
                  Ta bort insats
                </Button>
              )}
              {service.schemaVersion && (
                <span className="text-small font-normal text-dark-secondary bg-vattjom-background-200 rounded px-6 py-2">
                  v{service.schemaVersion}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
