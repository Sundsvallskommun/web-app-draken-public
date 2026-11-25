'use client';

import { Disclosure, Link } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import {
  getSupportActionErrandOrigin,
  inspectionErrandIdOf,
  originIsEmpty,
  type SupportActionErrandOrigin,
} from '@supportmanagement/services/support-action-errand-service';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { ClipboardList } from 'lucide-react';
import { FC, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const errandHref = (errandNumber: string): string => `${process.env.NEXT_PUBLIC_BASEPATH}/arende/${errandNumber}`;

const OriginFact: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col">
    <span className="font-bold text-small">{label}</span>
    <span className="text-small">{children}</span>
  </div>
);

const ErrandLink: FC<{ errandNumber: string }> = ({ errandNumber }) => (
  <Link href={errandHref(errandNumber)} target="_blank">
    {errandNumber}
  </Link>
);

const OriginFacts: FC<{ origin: SupportActionErrandOrigin }> = ({ origin }) => {
  const { t } = useTranslation();
  const permitIsNamed = !!origin.permitType || !!origin.permitErrandNumber;

  return (
    <div className="flex flex-row flex-wrap gap-40" data-cy="action-errand-origin">
      {origin.inspectionErrandNumber ? (
        <OriginFact label={t('common:action_errand.origin.inspection')}>
          <ErrandLink errandNumber={origin.inspectionErrandNumber} />
        </OriginFact>
      ) : null}
      {origin.inspectionDate ? (
        <OriginFact label={t('common:action_errand.origin.date')}>{origin.inspectionDate}</OriginFact>
      ) : null}
      {origin.summary ? (
        <OriginFact label={t('common:action_errand.origin.summary')}>{origin.summary}</OriginFact>
      ) : null}
      {permitIsNamed ? (
        <OriginFact label={t('common:action_errand.origin.permit')}>
          {origin.permitType ? `${origin.permitType} ` : null}
          {origin.permitErrandNumber ? <ErrandLink errandNumber={origin.permitErrandNumber} /> : null}
        </OriginFact>
      ) : null}
    </div>
  );
};

/**
 * Where the action errand comes from: the inspection it was raised from, and the permit that inspection is about.
 * The inspection is read on every load rather than copied, so a protocol corrected afterwards shows as corrected.
 */
export const SupportErrandOriginSection: FC<{ errand: SupportErrand }> = ({ errand }) => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [origin, setOrigin] = useState<SupportActionErrandOrigin>();

  const inspectionErrandId = inspectionErrandIdOf(errand);

  useEffect(() => {
    if (!municipalityId || !inspectionErrandId) return;
    let cancelled = false;

    void getSupportActionErrandOrigin(municipalityId, inspectionErrandId).then((read) => {
      if (!cancelled) setOrigin(read);
    });

    return () => {
      cancelled = true;
    };
  }, [municipalityId, inspectionErrandId]);

  const facts = (): ReactNode => {
    if (!origin) return null;
    if (originIsEmpty(origin)) {
      return <span className="text-small">{t('common:action_errand.origin.unreadable')}</span>;
    }
    return <OriginFacts origin={origin} />;
  };

  if (!inspectionErrandId) return null;

  return (
    <div className="mt-md">
      <Disclosure variant="alt" initalOpen data-cy="action-errand-origin-disclosure">
        <Disclosure.Header>
          <Disclosure.Icon icon={<ClipboardList />} />
          <Disclosure.Title>{t('common:action_errand.origin.heading')}</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>{facts()}</Disclosure.Content>
      </Disclosure>
    </div>
  );
};
