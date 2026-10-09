import { useJsonSchema } from '@common/components/json/hooks/useJsonSchema';
import { sanitized } from '@common/services/sanitizer-service';
import { Spinner, Table } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  type BasisCell,
  type BasisRow,
  buildDecisionBasisSections,
  getDecisionBasisForm,
} from '@supportmanagement/services/support-decision-basis-service';
import { getMostSpecificLabelType, type SupportErrand } from '@supportmanagement/services/support-errand-service';
import { getLabelDisplayName } from '@supportmanagement/services/support-label-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import {
  formatAddress,
  formatPremisesAddress,
  getPremisesAddress,
  hasServingPremises,
} from '@supportmanagement/services/support-premises-address-service';
import { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface DisplayRow {
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

const BasisRows: FC<{ section: string; rows: DisplayRow[] }> = ({ section, rows }) => {
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

/** The citizen uploaded; the attachments with that purpose are on the Bilagor tab. */
const AttachmentReference: FC<{ purpose: string }> = ({ purpose }) => {
  const { t } = useTranslation();
  const attachments = useSupportStore((s) => s.supportAttachments);
  const fileNames = attachments?.filter((candidate) => candidate.purpose?.name === purpose).map((a) => a.fileName);

  if (fileNames?.length) return <>{t('common:decision.basis.attachment', { fileName: fileNames.join(', ') })}</>;
  // Before the attachments have been fetched there is nothing to say against the upload.
  if (!attachments) return <>{t('common:decision.basis.attachment_pending')}</>;
  return <span className="text-error">{t('common:decision.basis.attachment_missing')}</span>;
};

const BasisTable: FC<{ cell: Extract<BasisCell, { kind: 'table' }> }> = ({ cell }) => (
  <Table dense>
    <Table.Header>
      {cell.columns.map((column) => (
        <Table.HeaderColumn key={column}>{column}</Table.HeaderColumn>
      ))}
    </Table.Header>
    <Table.Body>
      {cell.rows.map((row, index) => (
        // Filed rows have no identity of their own and may repeat; the table is never reordered.
        <Table.Row key={index /* NOSONAR */}>
          {cell.columns.map((column, position) => (
            <Table.Column key={column}>{row[position] || '-'}</Table.Column>
          ))}
        </Table.Row>
      ))}
    </Table.Body>
  </Table>
);

const cellContent = (cell: BasisCell | undefined): ReactNode => {
  switch (cell?.kind) {
    case 'text':
      return cell.text;
    case 'html':
      return <div className="[&>p]:m-0" dangerouslySetInnerHTML={{ __html: sanitized(cell.html) }} />;
    case 'table':
      return <BasisTable cell={cell} />;
    case 'attachment':
      return <AttachmentReference purpose={cell.purpose} />;
    default:
      return null;
  }
};

/**
 * What the decision is based on, gathered from the errand so it can be read where the decision is
 * made: the errand itself, its owner, and the answers filed on the form (see
 * support-decision-basis-service). A section the errand type has no questions for is left out.
 */
export const SupportErrandDecisionBasis: FC<{
  supportErrand: SupportErrand;
  supportMetadata: SupportMetadata | undefined;
  /** Rendered in the premises section. */
  premisesHandling?: ReactNode;
  /** Rendered in the serving premises section, when the form has one. */
  servingPremisesHandling?: ReactNode;
}> = ({ supportErrand, supportMetadata, premisesHandling, servingPremisesHandling }) => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const owner = supportErrand.customer?.[0];
  const serving = hasServingPremises(supportErrand);
  const premises = getPremisesAddress(supportErrand, supportMetadata?.namespace);
  const form = getDecisionBasisForm(supportErrand, supportMetadata?.namespace);
  // The version the answers were filed against, so option texts and table headers match what was asked.
  const { schema, loading } = useJsonSchema(municipalityId, form?.schemaId ?? '');

  const toDisplayRow = (row: BasisRow): DisplayRow => ({
    key: row.key,
    label: row.labelKey ? t(row.labelKey) : row.labelText ?? row.key,
    value: cellContent(row.cell),
  });

  const attachments = useSupportStore((s) => s.supportAttachments);
  const uploadedPurposes = (attachments ?? [])
    .map((attachment) => attachment.purpose?.name)
    .filter((name): name is string => !!name);

  const sections = form && !loading ? buildDecisionBasisSections(form.value, schema, uploadedPurposes) : [];
  const formSections = sections.filter((section) => section.id !== 'premises' && section.rows.length > 0);
  const premisesFormRows = sections.find((section) => section.id === 'premises')?.rows.map(toDisplayRow) ?? [];

  const errandRows: DisplayRow[] = [
    {
      key: 'type',
      label: t('common:decision.basis.errand.type'),
      value: getLabelDisplayName(getMostSpecificLabelType(supportErrand), supportMetadata),
    },
    { key: 'number', label: t('common:decision.basis.errand.number'), value: supportErrand.errandNumber },
  ];

  const holderRows: DisplayRow[] = owner
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

  const addressRow: DisplayRow = {
    key: 'address',
    label: premises
      ? t(`common:decision.basis.premises.address_from.${premises.source}`)
      : t('common:decision.basis.premises.address'),
    value: premises ? formatPremisesAddress(premises) : null,
  };
  // The address follows the name, the rest of the premises rows come after.
  const premisesRows = [
    ...premisesFormRows.filter((row) => row.key === 'name'),
    addressRow,
    ...premisesFormRows.filter((row) => row.key !== 'name'),
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

      {!form ? <BasisNote>{t('common:decision.basis.no_form')}</BasisNote> : null}

      {form && loading ? (
        <div className="flex items-center gap-8 text-small text-dark-secondary" data-cy="decision-basis-loading">
          <Spinner size={2} aria-hidden />
          {t('common:decision.basis.loading')}
        </div>
      ) : null}

      {formSections.map((section) => (
        <BasisSection key={section.id} id={section.id} heading={t(`common:decision.basis.${section.id}.heading`)}>
          <BasisRows section={section.id} rows={section.rows.map(toDisplayRow)} />
          {section.id === 'serving_premises' ? servingPremisesHandling : null}
        </BasisSection>
      ))}

      {serving ? (
        <BasisSection id="premises" heading={t('common:decision.basis.premises.heading')}>
          <BasisRows section="premises" rows={premisesRows} />
          {premisesHandling}
        </BasisSection>
      ) : null}

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
