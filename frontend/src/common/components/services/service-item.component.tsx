import { AssetStatus, assetStatusLabels, assetTypeLabels } from '@common/interfaces/asset';
import sanitized from '@common/services/sanitizer-service';
import { canDeleteErrandServiceAsset, Service } from '@common/services/service-assets-service';
import { Button, Label } from '@sk-web-gui/react';
import { Car, Cog, ExternalLink, ListChecks, Pencil, PlusCircle } from 'lucide-react';
import NextLink from 'next/link';
import { FC, ReactNode } from 'react';

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

const Chips: FC<{ items?: string[]; emptyText: string }> = ({ items, emptyText }) => {
  if (!items || items.length === 0) {
    return <span className="text-base text-dark-disabled italic">{emptyText}</span>;
  }
  return (
    <div className="flex flex-wrap gap-6">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="inline-flex items-center text-small bg-vattjom-background-200 text-dark-primary rounded-full px-10 py-4"
        >
          {item}
        </span>
      ))}
    </div>
  );
};

const Section: FC<{ icon?: ReactNode; label: string; children: ReactNode }> = ({ icon, label, children }) => (
  <div>
    <div className="flex items-center gap-6 text-small font-bold text-dark-secondary mb-8 uppercase tracking-wide">
      {icon}
      {label}
    </div>
    {children}
  </div>
);

type ServiceTitleRenderer = (service: Service) => string;
type ServiceBodyRenderer = FC<{ service: Service }>;

const FtBody: ServiceBodyRenderer = ({ service }) => (
  <>
    <Section icon={<Car size={14} />} label="Färdsätt">
      <Chips items={service?.transportMode} emptyText="Inget valt färdsätt" />
    </Section>
    <Section icon={<Cog size={14} />} label="Hjälpmedel">
      <Chips items={service?.aids} emptyText="Inga valda hjälpmedel" />
    </Section>
    <Section icon={<PlusCircle size={14} />} label="Tillägg">
      <Chips items={service?.addon} emptyText="Inga valda tillägg" />
    </Section>
  </>
);

const ftTitle: ServiceTitleRenderer = (service) =>
  `${service.restyp.join(', ')}${service.isWinterService ? ' (Vinterfärdtjänst)' : ''}`;

type ServiceRenderer = {
  title: ServiceTitleRenderer;
  body?: ServiceBodyRenderer;
};

const FT_RENDERER: ServiceRenderer = { title: ftTitle, body: FtBody };

const ParkingPermitBody: ServiceBodyRenderer = ({ service }) => (
  <Section label="Kortnummer">
    <span className="text-base text-dark-primary">{service.assetId ?? '—'}</span>
  </Section>
);

const PARKING_PERMIT_RENDERER: ServiceRenderer = {
  title: () => assetTypeLabels.PARKINGPERMIT,
  body: ParkingPermitBody,
};

const renderers: Record<string, ServiceRenderer> = {
  ParatransitPermitLocal: FT_RENDERER,
  ParatransitPermitNational: FT_RENDERER,
  PARKINGPERMIT: PARKING_PERMIT_RENDERER,
};

const defaultRenderer: ServiceRenderer = {
  title: (service) => service.assetType ?? 'Insats',
};

const resolveRenderer = (service: Service): ServiceRenderer =>
  (service.assetType && renderers[service.assetType]) || defaultRenderer;

interface Props {
  service: Service;
  onRemove?: (id: string) => void;
  onEdit?: (id: string) => void;
  readOnly?: boolean;
  currentErrandId?: string;
  sourceErrandLinkHref?: (service: Service) => string | undefined;
  isRemoving?: boolean;
}

export const ServiceListItem: FC<Props> = ({
  service,
  onRemove,
  onEdit,
  readOnly,
  currentErrandId,
  sourceErrandLinkHref,
  isRemoving,
}) => {
  const canRemove = canDeleteErrandServiceAsset(service);
  const linkHref =
    readOnly && (!currentErrandId || service.sourceErrandId !== currentErrandId)
      ? sourceErrandLinkHref?.(service)
      : undefined;
  const showSourceErrandLink = !!linkHref && !!service.sourceErrandNumber;
  const showFooter = !readOnly && (onEdit || onRemove);
  const renderer = resolveRenderer(service);
  const title = renderer.title(service);
  const Body = renderer.body;
  const buildValidityText = (): string => {
    if (service?.validTo) return `${service.issued} – ${service.validTo}`;
    if (service?.issued) return `fr.o.m. ${service.issued}`;
    return '';
  };
  const validityText = buildValidityText();

  return (
    <div
      data-cy="service-item"
      className="w-full rounded-cards border border-divider bg-background-content mb-16 overflow-hidden"
    >
      <div className="flex items-start gap-16 p-20 border-b border-divider">
        <div className="p-12 bg-vattjom-background-300 rounded-lg flex items-center justify-center shrink-0">
          <ListChecks size={24} className="text-dark-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-16 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-dark-primary">{title}</div>
              {service.status && (
                <div className="mt-8">
                  <Label rounded inverted color={statusColor(service.status)}>
                    {assetStatusLabels[service.status] ?? service.status}
                  </Label>
                </div>
              )}
            </div>
            {validityText && (
              <div className="text-small text-dark-secondary whitespace-nowrap text-right">
                <div className="font-bold">Giltigt</div>
                <div>{validityText}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-20 p-20">
        {Body && <Body service={service} />}

        {service?.comment && (
          <Section label="Kommentar">
            <div
              className="text-base text-dark-primary break-words whitespace-pre-wrap leading-relaxed overflow-hidden [word-break:break-word]"
              dangerouslySetInnerHTML={{ __html: sanitized(service.comment) }}
            />
          </Section>
        )}

        {showSourceErrandLink && (
          <div className="text-md">
            <NextLink
              href={linkHref!}
              className="inline-flex items-center gap-4 text-vattjom-link hover:underline"
              data-cy="service-source-errand-link"
            >
              <ExternalLink size={14} />
              <span>Tillhör ärende {service.sourceErrandNumber}</span>
            </NextLink>
          </div>
        )}
      </div>

      {showFooter && (
        <div className="px-20 py-16 bg-background-200 flex items-center justify-between gap-16 border-t border-divider flex-wrap">
          <div className="flex gap-12 flex-wrap">
            {onEdit && (
              <Button
                data-cy="edit-service-button"
                size="sm"
                color="vattjom"
                variant="secondary"
                leftIcon={<Pencil size={16} />}
                onClick={() => onEdit(service.id)}
                disabled={!!isRemoving}
              >
                Redigera insats
              </Button>
            )}
            {onRemove && canRemove && (
              <Button
                data-cy="remove-service-button"
                size="sm"
                color="vattjom"
                onClick={() => onRemove(service.id)}
                loading={!!isRemoving}
                disabled={!!isRemoving}
              >
                Ta bort insats
              </Button>
            )}
          </div>
          {service.schemaVersion && (
            <span className="text-small text-dark-secondary bg-vattjom-background-200 rounded px-6 py-2">
              v{service.schemaVersion}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
