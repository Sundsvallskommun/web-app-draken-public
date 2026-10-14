import { Checkbox, FormControl, FormLabel, Input, RadioButton, Textarea } from '@sk-web-gui/react';
import {
  COORDINATED,
  type CoordinatedParty,
  type InspectionProtocolDetails,
  ORDER,
  RESPONSIBLE,
  SUMMARY,
  VISIT,
  YES_NO,
} from '@supportmanagement/services/support-inspection-protocol-service';
import { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Details = InspectionProtocolDetails;
type TextKey = { [K in keyof Details]: Details[K] extends string ? K : never }[keyof Details];

const T = 'common:inspection_protocol.details';

const Card: FC<{ title: string; children: ReactNode; cy: string }> = ({ title, children, cy }) => (
  <section className="border-1 rounded-12 px-16 pt-12 pb-16 flex flex-col gap-12" data-cy={cy}>
    <h3 className="text-h4-md m-0">{title}</h3>
    {children}
  </section>
);

/** The paper protocol's other blocks, filled in on the page and sent along with the control points. */
export const SupportErrandInspectionProtocolDetails: FC<{
  details: Details;
  readOnly: boolean;
  onChange: (details: Details) => void;
  /** The summary block is shown after the control points, the rest before them. */
  part: 'before' | 'after';
}> = ({ details, readOnly, onChange, part }) => {
  const { t } = useTranslation();
  const set = (changes: Partial<Details>) => onChange({ ...details, ...changes });

  const text = (key: TextKey, label: string, type: 'text' | 'date' | 'time' = 'text', className = 'w-full') => (
    <FormControl id={`protocol-${key}`} className={className}>
      <FormLabel>{label}</FormLabel>
      <Input
        type={type}
        className="w-full"
        value={details[key]}
        disabled={readOnly}
        onChange={(event) => set({ [key]: event.target.value })}
        data-cy={`protocol-${key}`}
      />
    </FormControl>
  );

  const radios = <K extends keyof Details>(key: K, label: string, options: { value: Details[K]; label: string }[]) => (
    <FormControl id={`protocol-${key}`} fieldset className="w-full">
      <FormLabel>{label}</FormLabel>
      <RadioButton.Group inline>
        {options.map((option) => (
          <RadioButton
            key={String(option.value)}
            size="sm"
            name={`protocol-${key}`}
            value={String(option.value)}
            checked={details[key] === option.value}
            disabled={readOnly}
            onChange={() => set({ [key]: option.value } as Partial<Details>)}
            data-cy={`protocol-${key}-${String(option.value)}`}
          >
            {option.label}
          </RadioButton>
        ))}
      </RadioButton.Group>
    </FormControl>
  );

  const toggleCoordinated = (party: CoordinatedParty) =>
    set({
      coordinatedWith: details.coordinatedWith.includes(party)
        ? details.coordinatedWith.filter((candidate) => candidate !== party)
        : [...details.coordinatedWith, party],
    });

  const coordinatedParties: { party: CoordinatedParty; label: string }[] = [
    { party: COORDINATED.NONE, label: t(`${T}.coordinated_none`) },
    { party: COORDINATED.POLICE, label: t(`${T}.coordinated_police`) },
    { party: COORDINATED.TAX_AGENCY, label: t(`${T}.coordinated_tax_agency`) },
    { party: COORDINATED.RESCUE_SERVICE, label: t(`${T}.coordinated_rescue_service`) },
    { party: COORDINATED.ENVIRONMENT_HEALTH, label: t(`${T}.coordinated_environment_health`) },
    { party: COORDINATED.OTHER, label: t(`${T}.coordinated_other`) },
  ];

  const yesNo = [
    { value: YES_NO.YES, label: t(`${T}.yes`) },
    { value: YES_NO.NO, label: t(`${T}.no`) },
  ];

  if (part === 'after') {
    return (
      <>
        <Card title={t(`${T}.remarks_heading`)} cy="protocol-remarks">
          <Textarea
            className="w-full"
            rows={4}
            value={details.additionalRemarks}
            disabled={readOnly}
            onChange={(event) => set({ additionalRemarks: event.target.value })}
            data-cy="protocol-additionalRemarks"
          />
        </Card>
        <Card title={t(`${T}.summary_heading`)} cy="protocol-summary">
          {radios('summary', t(`${T}.summary_heading`), [
            { value: SUMMARY.APPROVED, label: t(`${T}.summary_approved`) },
            { value: SUMMARY.ACTION_REQUIRED, label: t(`${T}.summary_action_required`) },
            { value: SUMMARY.REVISIT, label: t(`${T}.summary_revisit`) },
            { value: SUMMARY.INVESTIGATION, label: t(`${T}.summary_investigation`) },
          ])}
          {details.summary === SUMMARY.ACTION_REQUIRED ? (
            <div className="flex flex-col gap-12">
              {text('summaryActionRequiredText', t(`${T}.summary_action_required_text`))}
              {text('followUpDate', t(`${T}.follow_up_date`), 'date', 'w-full max-w-[16rem]')}
            </div>
          ) : null}
          {details.summary === SUMMARY.REVISIT ? text('summaryRevisitText', t(`${T}.summary_revisit_text`)) : null}
          {details.summary === SUMMARY.INVESTIGATION
            ? text('investigationDate', t(`${T}.investigation_date`), 'date', 'w-full max-w-[16rem]')
            : null}
        </Card>
        <Card title={t(`${T}.inspectors_heading`)} cy="protocol-inspectors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            {text('inspector1NameAndTitle', t(`${T}.inspector`))}
            {text('inspector2NameAndTitle', t(`${T}.inspector`))}
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card title={t(`${T}.premises_heading`)} cy="protocol-premises">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {text('premisesName', t(`${T}.premises_name`))}
          {text('premisesAddress', t(`${T}.premises_address`))}
          {text('permitHolderName', t(`${T}.permit_holder`))}
          {text('permitHolderOrgNumber', t(`${T}.org_number`))}
        </div>
      </Card>
      <Card title={t(`${T}.visit_heading`)} cy="protocol-visit">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-16">
          {text('inspectionDate', t(`${T}.inspection_date`), 'date')}
          {text('visitStartTime', t(`${T}.visit_start`), 'time')}
          {text('visitEndTime', t(`${T}.visit_end`), 'time')}
          {text('guestCount', t(`${T}.guest_count`))}
        </div>
        {radios('visit', t(`${T}.visit`), [
          { value: VISIT.PREMISES, label: t(`${T}.visit_premises`) },
          { value: VISIT.CLOSED, label: t(`${T}.visit_closed`) },
        ])}
        <FormControl id="protocol-coordinated" fieldset className="w-full">
          <FormLabel>{t(`${T}.coordinated`)}</FormLabel>
          <div className="flex flex-wrap gap-16">
            {coordinatedParties.map(({ party, label }) => (
              <Checkbox
                key={party}
                size="sm"
                checked={details.coordinatedWith.includes(party)}
                disabled={readOnly}
                onChange={() => toggleCoordinated(party)}
                data-cy={`protocol-coordinated-${party}`}
              >
                {label}
              </Checkbox>
            ))}
          </div>
        </FormControl>
        {details.coordinatedWith.includes(COORDINATED.OTHER)
          ? text('coordinatedOtherText', t(`${T}.coordinated_other_text`), 'text', 'w-full max-w-[24rem]')
          : null}
      </Card>
      <Card title={t(`${T}.staffing_heading`)} cy="protocol-staffing">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_8rem] gap-16 items-end">
          {radios('securityGuard', t(`${T}.security_guard`), yesNo)}
          {details.securityGuard === YES_NO.YES ? text('securityGuardCount', t(`${T}.count`)) : <span />}
          {radios('entranceHost', t(`${T}.entrance_host`), yesNo)}
          {details.entranceHost === YES_NO.YES ? text('entranceHostCount', t(`${T}.count`)) : <span />}
        </div>
        {radios('responsiblePerson', t(`${T}.responsible_person`), [
          { value: RESPONSIBLE.PRESENT, label: t(`${T}.responsible_present`) },
          { value: RESPONSIBLE.ABSENT, label: t(`${T}.responsible_absent`) },
        ])}
        {radios('order', t(`${T}.order`), [
          { value: ORDER.WITHOUT_REMARKS, label: t(`${T}.order_without_remarks`) },
          { value: ORDER.WITH_REMARKS, label: t(`${T}.order_with_remarks`) },
        ])}
      </Card>
    </>
  );
};
