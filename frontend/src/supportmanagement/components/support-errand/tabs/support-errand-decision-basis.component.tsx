import { getMostSpecificLabelType, type SupportErrand } from '@supportmanagement/services/support-errand-service';
import { getLabelDisplayName } from '@supportmanagement/services/support-label-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import {
  formatAddress,
  formatPremisesAddress,
  getPremisesAddress,
} from '@supportmanagement/services/support-premises-address-service';
import { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface BasisRow {
  key: string;
  label: string;
  value: ReactNode;
}

const BasisSection: FC<{ id: string; heading: string; children: ReactNode }> = ({ id, heading, children }) => (
  <section className="border-1 rounded-12 px-16 pt-12 pb-16" data-cy={`decision-basis-${id}`}>
    <h3 className="text-base font-bold text-vattjom-surface-primary mb-4">{heading}</h3>
    {children}
  </section>
);

const BasisRows: FC<{ section: string; rows: BasisRow[] }> = ({ section, rows }) => {
  const { t } = useTranslation();

  return (
    <dl className="m-0 text-small">
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[20rem_1fr] gap-x-24 py-6 border-b-1 border-divider">
          <dt className="text-dark-secondary">{row.label}</dt>
          <dd className="m-0 break-words" data-cy={`decision-basis-${section}-${row.key}`}>
            {row.value || t('common:decision.empty_value')}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const BasisNote: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="text-small text-dark-secondary italic m-0 pt-6">{children}</p>
);

// Filled in on the form, so they wait for the decision on how the app reads the form's keys.
const FORM_SECTIONS = ['operation', 'serving_hours', 'serving', 'financing'];

/**
 * What the decision is based on, gathered from the errand so it can be read where the decision is
 * made. Only what the errand itself holds is shown; the sections taken from the form are placeholders.
 */
export const SupportErrandDecisionBasis: FC<{
  supportErrand: SupportErrand;
  supportMetadata: SupportMetadata | undefined;
  /** Rendered in the premises section. */
  premisesHandling?: ReactNode;
}> = ({ supportErrand, supportMetadata, premisesHandling }) => {
  const { t } = useTranslation();

  const owner = supportErrand.customer?.[0];
  const premises = getPremisesAddress(supportErrand, supportMetadata?.namespace);

  const errandRows: BasisRow[] = [
    {
      key: 'type',
      label: t('common:decision.basis.errand.type'),
      value: getLabelDisplayName(getMostSpecificLabelType(supportErrand), supportMetadata),
    },
    { key: 'number', label: t('common:decision.basis.errand.number'), value: supportErrand.errandNumber },
  ];

  const holderRows: BasisRow[] = owner
    ? [
        ...(owner.stakeholderType === 'ORGANIZATION'
          ? [
              {
                key: 'organization',
                label: t('common:decision.basis.holder.organization'),
                value: owner.organizationName,
              },
              {
                key: 'organization-number',
                label: t('common:decision.basis.holder.organization_number'),
                value: owner.organizationNumber,
              },
            ]
          : [
              {
                key: 'name',
                label: t('common:decision.basis.holder.name'),
                value: [owner.firstName, owner.lastName].filter(Boolean).join(' '),
              },
            ]),
        {
          key: 'address',
          label: t('common:decision.basis.holder.address'),
          value: formatAddress({ streetAddress: owner.address, postalCode: owner.zipCode, postalArea: owner.city }),
        },
        {
          key: 'phone',
          label: t('common:decision.basis.holder.phone'),
          value: owner.phoneNumbers?.map((phoneNumber) => phoneNumber.value).join(', '),
        },
        {
          key: 'email',
          label: t('common:decision.basis.holder.email'),
          value: owner.emails?.map((email) => email.value).join(', '),
        },
      ]
    : [];

  const premisesRows: BasisRow[] = [
    {
      key: 'address',
      label: premises
        ? t(`common:decision.basis.premises.address_from.${premises.source}`)
        : t('common:decision.basis.premises.address'),
      value: premises ? formatPremisesAddress(premises) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-16" data-cy="decision-basis">
      <div>
        <h2 className="text-h2-md mb-8">{t('common:decision.basis.heading')}</h2>
        <p className="m-0 text-dark-secondary">{t('common:decision.basis.intro')}</p>
      </div>

      <BasisSection id="errand" heading={t('common:decision.basis.errand.heading')}>
        <BasisRows section="errand" rows={errandRows} />
      </BasisSection>

      <BasisSection id="holder" heading={t('common:decision.basis.holder.heading')}>
        {owner ? (
          <BasisRows section="holder" rows={holderRows} />
        ) : (
          <BasisNote>{t('common:decision.basis.holder.missing')}</BasisNote>
        )}
      </BasisSection>

      {FORM_SECTIONS.map((section) => (
        <BasisSection key={section} id={section} heading={t(`common:decision.basis.${section}`)}>
          <BasisNote>{t('common:decision.basis.from_form')}</BasisNote>
        </BasisSection>
      ))}

      <BasisSection id="premises" heading={t('common:decision.basis.premises.heading')}>
        <BasisRows section="premises" rows={premisesRows} />
        {premisesHandling}
        <BasisNote>{t('common:decision.basis.premises.rest')}</BasisNote>
      </BasisSection>

      <BasisSection id="referrals" heading={t('common:decision.basis.referrals')}>
        <BasisNote>{t('common:decision.basis.not_built')}</BasisNote>
      </BasisSection>

      <p
        className="text-small text-dark-secondary border-1 border-dashed rounded-12 p-16 m-0"
        data-cy="decision-basis-investigation"
      >
        {t('common:decision.basis.investigation')}
      </p>
    </div>
  );
};
