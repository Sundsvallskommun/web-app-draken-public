'use client';

import type { Statement } from '@common/data-contracts/supportmanagement/data-contracts';
import { Checkbox, FormControl, FormLabel, Input, Select, Textarea } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import {
  SUPPORT_PREMISES_RIGHT_OF_DISPOSALS,
  supportPremisesCapacity,
  type SupportPremisesExamination,
  supportPremisesExamination,
  supportPremisesFireSafety,
  supportPremisesVerksamhetsbeskrivning,
  withSupportPremisesExamination,
} from '@supportmanagement/services/support-premises-examination-service';
import { getSupportStatements } from '@supportmanagement/services/support-statement-service';
import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InvestigationFact } from '../investigation-fact.component';
import type { InvestigationSectionProps } from '../investigation-section-text.component';
import { InvestigationTextEditor } from '../investigation-text-editor.component';
import { useInvestigationSectionSave } from '../use-investigation-section-save';

const APPROVED = 'APPROVED';
const PENDING = 'PENDING';

export const SupportPremisesSection: FC<InvestigationSectionProps> = (props) => {
  const { section } = props;
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const [statements, setStatements] = useState<Statement[]>([]);
  const sectionSave = useInvestigationSectionSave(props, 'common:premises.toast.save_failed');
  const knownBefore = sectionSave.values.assessment === APPROVED;
  // Unchecking only takes back an approval; any other assessment is left as it is.
  const uncheckedAssessment = section.assessment === APPROVED ? PENDING : section.assessment ?? '';

  const errandId = supportErrand?.id;
  const modified = supportErrand?.modified;
  const namespace = supportMetadata?.namespace;

  const capacity = useMemo(() => supportPremisesCapacity(supportErrand, namespace), [supportErrand, namespace]);
  const verksamhetsBeskrivning = supportPremisesVerksamhetsbeskrivning(supportErrand, namespace);
  const fireSafety = useMemo(
    () => supportPremisesFireSafety(statements, supportMetadata),
    [statements, supportMetadata]
  );
  const examination = supportPremisesExamination(sectionSave.values.parameters);

  useEffect(() => {
    if (!errandId || !municipalityId) return undefined;

    let reading = true;
    getSupportStatements(errandId, municipalityId)
      .then((result) => {
        if (reading) setStatements(result);
      })
      .catch(() => {
        if (reading) setStatements([]);
      });

    return () => {
      reading = false;
    };
  }, [errandId, municipalityId, modified]);

  const write = (field: keyof SupportPremisesExamination, value: string) =>
    sectionSave.set('parameters', withSupportPremisesExamination(sectionSave.values.parameters, field, value));

  const seats = [
    capacity.indoorSeats ? t('common:premises.seats_indoor', { number: capacity.indoorSeats }) : undefined,
    capacity.outdoorSeats ? t('common:premises.seats_outdoor', { number: capacity.outdoorSeats }) : undefined,
  ]
    .filter(Boolean)
    .join(' / ');

  const threeColRow = 'flex flex-col md:flex-row gap-24 md:[&>*]:w-[calc((100%-2*theme(spacing.24))/3)]';

  return (
    <div className="flex flex-col gap-24" data-cy="premises-section">
      <div>
        <FormControl className="min-w-0">
          <FormLabel className="text-small font-bold text-dark-secondary">
            {t('common:premises.inspected_at')}
          </FormLabel>
          <div className="flex items-center gap-16">
            <Input
              type="date"
              disabled={sectionSave.readOnly}
              value={examination.inspectedAt}
              onChange={(event) => write('inspectedAt', event.target.value)}
              data-cy="premises-inspected-at"
            />
            <Checkbox
              disabled={sectionSave.readOnly}
              checked={knownBefore}
              onChange={(event) => sectionSave.set('assessment', event.target.checked ? APPROVED : uncheckedAssessment)}
              data-cy="premises-known-before"
            >
              {t('common:premises.known_before')}
            </Checkbox>
          </div>
        </FormControl>
      </div>
      <div className={threeColRow}>
        <FormControl id="premises-right-of-disposal" className="min-w-0 flex flex-col">
          <FormLabel className="text-small font-bold text-dark-secondary">
            {t('common:premises.right_of_disposal.label')}
          </FormLabel>
          <div className="flex gap-8">
            <Select
              disabled={sectionSave.readOnly}
              value={examination.rightOfDisposal}
              onChange={(event) => write('rightOfDisposal', event.target.value)}
              data-cy="premises-right-of-disposal"
            >
              <Select.Option value="">{t('common:premises.right_of_disposal.placeholder')}</Select.Option>
              {SUPPORT_PREMISES_RIGHT_OF_DISPOSALS.map((choice) => (
                <Select.Option key={choice.value} value={choice.value}>
                  {t(choice.translationKey)}
                </Select.Option>
              ))}
            </Select>
            <Input
              id="premises-right-of-disposal-note"
              aria-label={t('common:premises.right_of_disposal.note')}
              disabled={sectionSave.readOnly}
              value={examination.rightOfDisposalNote}
              placeholder={t('common:premises.right_of_disposal.note_placeholder')}
              onChange={(event) => write('rightOfDisposalNote', event.target.value)}
              data-cy="premises-right-of-disposal-note"
            />
          </div>
        </FormControl>
      </div>

      <div className={threeColRow}>
        <InvestigationFact label={t('common:premises.max_persons')}>
          <span data-cy="premises-max-persons">{capacity.maxPersons ?? t('common:premises.not_answered')}</span>
        </InvestigationFact>

        <InvestigationFact label={t('common:premises.seats')}>
          <span data-cy="premises-seats">{seats || t('common:premises.not_answered')}</span>
        </InvestigationFact>

        <InvestigationFact label={t('common:premises.fire_safety')}>
          <span data-cy="premises-fire-safety">
            {fireSafety
              ? `${fireSafety.outcome} (${fireSafety.counterparty})`
              : t('common:premises.fire_safety_pending')}
          </span>
        </InvestigationFact>
      </div>

      <div>
        <InvestigationFact label={t('common:premises.verksamhetsbeskrivning')}>
          <Textarea
            readOnly
            data-cy="premises-verksamhetsbeskrivning"
            rows={6}
            value={verksamhetsBeskrivning}
            placeholder={t('common:premises.not_answered')}
          ></Textarea>
        </InvestigationFact>
      </div>

      <FormControl className="w-full">
        <FormLabel className="text-small font-bold text-dark-secondary">
          {t('common:premises.previous_business')}
        </FormLabel>
        <Textarea
          className="w-full"
          rows={3}
          disabled={sectionSave.readOnly}
          value={examination.previousBusiness}
          placeholder={t('common:premises.previous_business_placeholder')}
          onChange={(event) => write('previousBusiness', event.target.value)}
          data-cy="premises-previous-business"
        />
      </FormControl>

      <FormControl className="w-full">
        <FormLabel className="text-small font-bold text-dark-secondary">{t('common:premises.serving_area')}</FormLabel>
        <Textarea
          className="w-full"
          rows={3}
          disabled={sectionSave.readOnly}
          value={examination.servingArea}
          placeholder={t('common:premises.serving_area_placeholder')}
          onChange={(event) => write('servingArea', event.target.value)}
          data-cy="premises-serving-area"
        />
      </FormControl>

      <InvestigationTextEditor
        name="premises"
        labelKey="common:premises.notes"
        placeholderKey="common:premises.notes_placeholder"
        value={sectionSave.values.text}
        readOnly={sectionSave.readOnly}
        onChange={(markup) => sectionSave.set('text', markup)}
      />

      <p className="text-small text-dark-secondary italic m-0">{t('common:premises.requirement_note')}</p>
      <p className="text-small text-dark-secondary italic m-0">{t('common:premises.also_in_decision')}</p>
    </div>
  );
};
