'use client';

import { CustomerPermitChoice } from '@common/components/customer-menu/customer-permit-choice.component';
import type { Asset } from '@common/interfaces/asset';
import {
  linkInspectionToPermit,
  permitName,
  permitOfInspection,
  permitsInEffect,
} from '@common/services/customer-inspection-service';
import { getCustomerAssets } from '@common/services/customer-service';
import { getResolvedRelations } from '@common/services/relations-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { Button, Disclosure, Link, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useUserStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import dayjs from 'dayjs';
import { FileCheck } from 'lucide-react';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const formatDate = (date?: string | null): string => (date ? dayjs(date).format('YYYY-MM-DD') : '');

const errandHref = (errandNumber: string): string => `${process.env.NEXT_PUBLIC_BASEPATH}/arende/${errandNumber}`;

const permitHolderPartyId = (errand: SupportErrand): string | undefined =>
  errand.stakeholders?.find((stakeholder) => stakeholder.role === 'PRIMARY')?.externalId;

export const SupportErrandPermitSection: FC<{ errand: SupportErrand }> = ({ errand }) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const namespace = useMetadataStore((s) => s.supportMetadata?.namespace);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const [permit, setPermit] = useState<Asset>();
  const [candidates, setCandidates] = useState<Asset[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reads, setReads] = useState(0);

  const errandId = errand.id;
  const partyId = permitHolderPartyId(errand);

  useEffect(() => {
    if (!municipalityId || !errandId || !partyId) return;
    let cancelled = false;

    void Promise.all([
      getResolvedRelations('source', municipalityId, errandId, 'ASC'),
      getCustomerAssets(municipalityId, partyId).catch(() => [] as Asset[]),
    ]).then(([{ relations }, assets]) => {
      if (cancelled) return;
      const linkedErrandIds = relations.map((relation) => relation.target.resourceId);
      setPermit(permitOfInspection(assets, linkedErrandIds));
      setCandidates(permitsInEffect(assets));
    });

    return () => {
      cancelled = true;
    };
  }, [municipalityId, errandId, partyId, reads]);

  const link = async (chosen: Asset) => {
    if (!municipalityId || !errandId) return;

    setBusy(true);
    const linked = await linkInspectionToPermit(municipalityId, errandId, chosen, namespace);
    setBusy(false);

    if (!linked) {
      toastMessage(getToastOptions({ message: t('common:inspection_permit.link_failed'), status: 'error' }));
      return;
    }

    setChoosing(false);
    setReads((read) => read + 1);
    toastMessage(getToastOptions({ message: t('common:inspection_permit.linked'), status: 'success' }));
  };

  const validity = (): string => {
    const from = formatDate(permit?.issued);
    const to = formatDate(permit?.validTo);
    if (!from) return '';
    if (!to) return t('common:inspection_permit.validity_open', { from });
    return t('common:inspection_permit.validity', { from, to });
  };

  if (!partyId) return null;

  return (
    <div className="mt-md">
      <Disclosure variant="alt" initalOpen data-cy="inspection-permit-disclosure">
        <Disclosure.Header>
          <Disclosure.Icon icon={<FileCheck />} />
          <Disclosure.Title>{t('common:inspection_permit.heading')}</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          {permit ? (
            <div className="flex flex-col gap-4" data-cy="inspection-permit">
              <span className="font-bold">{permitName(permit)}</span>
              <span className="text-small text-dark-secondary">{validity()}</span>
              {permit.sourceErrandNumber ? (
                <Link href={errandHref(permit.sourceErrandNumber)} target="_blank" data-cy="inspection-permit-link">
                  {t('common:inspection_permit.open', { errandNumber: permit.sourceErrandNumber })}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-12" data-cy="inspection-permit-missing">
              <span>{t('common:inspection_permit.none')}</span>
              {canEdit && candidates.length > 0 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setChoosing(true)}
                  data-cy="inspection-permit-choose"
                >
                  {t('common:inspection_permit.link')}
                </Button>
              ) : null}
            </div>
          )}
        </Disclosure.Content>
      </Disclosure>

      <CustomerPermitChoice
        show={choosing}
        permits={candidates}
        busy={busy}
        title={t('common:inspection_permit.choose_title')}
        description={t('common:inspection_permit.choose_description')}
        onClose={() => setChoosing(false)}
        onChoose={(chosen) => void link(chosen)}
      />
    </div>
  );
};
