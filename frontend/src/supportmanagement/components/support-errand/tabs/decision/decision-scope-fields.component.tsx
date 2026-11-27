import { useJsonSchemaByName } from '@common/components/json/hooks/useJsonSchemaByName';
import { Checkbox, FormControl, FormErrorMessage, FormHelperText, FormLabel, Input, Select } from '@sk-web-gui/react';
import { ALCOHOL_DECISION_SCHEMA } from '@supportmanagement/services/support-decision-parameters-service';
import {
  BEVERAGES,
  BEVERAGES_LABEL_KEY,
  CATEGORY_CODE_LABEL_KEY,
  type DecisionScope,
  getCategoryCodeOptions,
  isHalfFilled,
  type ServingHoursSlot,
  type SlotSpec,
  type TimeRange,
} from '@supportmanagement/services/support-decision-scope-service';
import { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const ScopeBlock: FC<{ id: string; heading: string; children: ReactNode }> = ({ id, heading, children }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8 pt-12" data-cy={`decision-${id}`}>
      <h4 className="text-small font-bold m-0">{heading}</h4>
      <p className="text-small text-dark-secondary m-0">{t('common:decision.scope.help')}</p>
      {children}
    </div>
  );
};

/** The beverages the permit grants; what the application asked for until the handler changes it. */
export const DecisionBeveragesField: FC<{
  value: string[];
  onChangeBeverages: (beverages: string[]) => void;
  onChangeCategoryCode: (categoryCode: string) => void;
  disabled: boolean;
  municipalityId: string;
}> = ({ value, onChangeBeverages, onChangeCategoryCode, disabled, municipalityId }) => {
  const { t } = useTranslation();

  const { schema } = useJsonSchemaByName(municipalityId, ALCOHOL_DECISION_SCHEMA.name);
  const categoryCodeOptions = getCategoryCodeOptions(schema);

  return (
    <ScopeBlock id="beverages" heading={t('common:decision.scope.beverages.heading')}>
      <FormControl id="decision-beverages" fieldset>
        <FormLabel>{t(BEVERAGES_LABEL_KEY)}</FormLabel>
        <Checkbox.Group value={value} onChange={(chosen) => onChangeBeverages(chosen.map(String))}>
          {BEVERAGES.map((beverage) => (
            <Checkbox key={beverage} value={beverage} disabled={disabled} data-cy={`decision-beverages-${beverage}`}>
              {t(`common:decision.scope.beverages.${beverage}`)}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </FormControl>

      <FormControl id="decision-category-code">
        <FormLabel>{t(CATEGORY_CODE_LABEL_KEY)}</FormLabel>
        <FormHelperText>{t('common:decision.scope.beverages.categoryCode.description')}</FormHelperText>
        <Select
          disabled={disabled}
          className="mt-8 max-w-[28rem]"
          onChange={(chosen) => onChangeCategoryCode(chosen.target.value)}
        >
          <Select.Option key="" value="">
            {t('common:decision.scope.beverages.categoryCode.defaultValue')}
          </Select.Option>
          {categoryCodeOptions.map((cat) => {
            return (
              <Select.Option key={cat.value} value={cat.value}>
                {`${cat.value} - ${cat.title}`}
              </Select.Option>
            );
          })}
        </Select>
      </FormControl>
    </ScopeBlock>
  );
};

/** The serving hours the permit grants, one range per slot the errand type has. */
export const DecisionServingHoursFields: FC<{
  slots: SlotSpec[];
  value: DecisionScope['servingHours'];
  onChange: (slot: ServingHoursSlot, range: TimeRange) => void;
  disabled: boolean;
}> = ({ slots, value, onChange, disabled }) => {
  const { t } = useTranslation();

  return (
    <ScopeBlock id="serving-hours" heading={t('common:decision.scope.serving_hours.heading')}>
      {slots.map((spec) => {
        const range = value[spec.slot] ?? { from: '', to: '' };
        const invalid = isHalfFilled(range);
        return (
          <FormControl
            key={spec.slot}
            id={`decision-serving-hours-${spec.slot}`}
            fieldset
            invalid={invalid}
            className="w-full"
          >
            <FormLabel>{t(spec.labelKey)}</FormLabel>
            <div className="grid grid-cols-2 gap-16 max-w-[28rem]">
              <Input
                type="time"
                className="w-full"
                aria-label={`${t(spec.labelKey)}, ${t('common:decision.scope.serving_hours.from')}`}
                value={range.from}
                onChange={(event) => onChange(spec.slot, { ...range, from: event.target.value })}
                disabled={disabled}
                invalid={invalid}
                data-cy={`decision-serving-hours-${spec.slot}-from`}
              />
              <Input
                type="time"
                className="w-full"
                aria-label={`${t(spec.labelKey)}, ${t('common:decision.scope.serving_hours.to')}`}
                value={range.to}
                onChange={(event) => onChange(spec.slot, { ...range, to: event.target.value })}
                disabled={disabled}
                invalid={invalid}
                data-cy={`decision-serving-hours-${spec.slot}-to`}
              />
            </div>
            {invalid ? (
              <FormErrorMessage>{t('common:decision.scope.serving_hours.half_filled')}</FormErrorMessage>
            ) : null}
          </FormControl>
        );
      })}
    </ScopeBlock>
  );
};
