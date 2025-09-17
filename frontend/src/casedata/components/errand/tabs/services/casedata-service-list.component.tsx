'use client';

import { IErrand } from '@casedata/interfaces/errand';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getServicesFromBackend } from './casedata-service-domain';
import { Service, ServiceListItem } from './casedata-service-item.component';

type ServiceWithKey = Service & { fieldId: string };
type Props = {
  errand: IErrand;
  append?: (value: Service | Service[]) => void;
  services?: ServiceWithKey[];
  onEdit?: (service: Service) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
};

const EMPTY: ServiceWithKey[] = [];

export const ServiceListComponent: React.FC<Props> = ({ errand, append, services, onEdit, onRemove, readOnly }) => {
  const isReadOnly = readOnly === true || !append;

  const editableServices = useMemo(() => services ?? EMPTY, [services]);

  const servicesRef = useRef<ServiceWithKey[]>(editableServices);
  useEffect(() => {
    servicesRef.current = editableServices;
  }, [editableServices]);

  const appendRef = useRef<typeof append>(append);
  useEffect(() => {
    appendRef.current = append;
  }, [append]);

  const removedIdsRef = useRef<Set<string>>(new Set());
  const handleRemove = (id: string) => {
    removedIdsRef.current.add(id);
    onRemove?.(id);
  };

  const [items, setItems] = useState<ServiceWithKey[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const fromBackend = await getServicesFromBackend(errand);
      if (cancelled) return;

      if (isReadOnly) {
        const mapped: ServiceWithKey[] = fromBackend.map((s) => ({
          ...s,
          fieldId: s.id ?? `${s.restyp}-${s.startDate}-${s.endDate}`,
        }));
        setItems(mapped);
        return;
      }

      const existingIds = new Set(servicesRef.current.map((s) => s.id));
      const toAdd: Service[] = [];
      for (const svc of fromBackend) {
        if (!existingIds.has(svc.id) && !removedIdsRef.current.has(svc.id)) {
          toAdd.push(svc);
        }
      }
      if (toAdd.length > 0) {
        appendRef.current?.(toAdd);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReadOnly, errand?.id, errand?.errandNumber]);

  const list = isReadOnly ? items : editableServices;

  return (
    <div className="mt-32">
      {list.map((service) => (
        <ServiceListItem
          key={service.fieldId}
          service={service}
          readOnly={isReadOnly}
          onEdit={isReadOnly ? undefined : onEdit}
          onRemove={isReadOnly ? undefined : handleRemove}
        />
      ))}
    </div>
  );
};
