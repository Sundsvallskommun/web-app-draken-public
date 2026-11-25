import { Checkbox, Disclosure, FormControl, FormLabel, Input, RadioButton, Textarea } from '@sk-web-gui/react';
import type {
  InspectionProtocolTemplate,
  ProtocolField,
  ProtocolOption,
  ProtocolSection,
} from '@supportmanagement/inspection-protocols';
import type { InspectionProtocolValues } from '@supportmanagement/services/support-inspection-protocol-service';
import { FC } from 'react';

type TextField = Exclude<ProtocolField, { kind: 'choice' | 'multi' }>;
type ChoiceField = Extract<ProtocolField, { kind: 'choice' | 'multi' }>;

const COLUMNS: Record<NonNullable<ProtocolSection['columns']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  4: 'grid-cols-2 md:grid-cols-4',
};
// What Support Management takes as a parameter value.
const VALUE_MAX_LENGTH = 3000;

const isText = (field: ProtocolField): field is TextField => field.kind !== 'choice' && field.kind !== 'multi';

/** The template's sections, an accordion each: text fields in a grid, each choice on a row of its own with its follow-ups. */
export const InspectionProtocolFields: FC<{
  template: InspectionProtocolTemplate;
  values: InspectionProtocolValues;
  readOnly: boolean;
  onChange: (values: InspectionProtocolValues) => void;
  position: ProtocolSection['position'];
  /** Why an option cannot be chosen, where something outside the protocol stands in its way. */
  unavailable?: (fieldKey: string, optionValue: string) => string | undefined;
}> = ({ template, values, readOnly, onChange, position, unavailable }) => {
  const set = (key: string, value: string | string[]) => onChange({ ...values, [key]: value });

  const text = (field: TextField) => {
    const value = String(values[field.key] ?? '');
    return (
      <FormControl
        key={field.key}
        id={`protocol-${field.key}`}
        className={field.narrow ? 'w-full max-w-[16rem]' : 'w-full'}
      >
        <FormLabel>{field.label}</FormLabel>
        {field.kind === 'textarea' ? (
          <Textarea
            className="w-full"
            rows={4}
            maxLength={VALUE_MAX_LENGTH}
            value={value}
            disabled={readOnly}
            onChange={(event) => set(field.key, event.target.value)}
            data-cy={`protocol-${field.key}`}
          />
        ) : (
          <Input
            type={field.kind}
            className="w-full"
            maxLength={VALUE_MAX_LENGTH}
            value={value}
            disabled={readOnly}
            onChange={(event) => set(field.key, event.target.value)}
            data-cy={`protocol-${field.key}`}
          />
        )}
      </FormControl>
    );
  };

  const choice = (field: ChoiceField) => {
    const value = values[field.key];
    const chosen = (option: ProtocolOption) =>
      Array.isArray(value) ? value.includes(option.value) : value === option.value;
    const toggle = (option: ProtocolOption) => {
      const list = Array.isArray(value) ? value : [];
      set(field.key, chosen(option) ? list.filter((candidate) => candidate !== option.value) : [...list, option.value]);
    };
    // An explanation under an option needs a row of its own; the other choices stay on one line, as they were.
    const explained = field.options.some((option) => !!unavailable?.(field.key, option.value));
    return (
      <div key={field.key} className="col-span-full flex flex-col gap-12">
        <FormControl id={`protocol-${field.key}`} fieldset className="w-full">
          <FormLabel>{field.label}</FormLabel>
          {field.kind === 'choice' ? (
            <RadioButton.Group inline={!explained}>
              {field.options.map((option) => {
                const blocked = unavailable?.(field.key, option.value);
                return (
                  <RadioButton
                    key={option.value}
                    size="sm"
                    name={`protocol-${field.key}`}
                    value={option.value}
                    checked={chosen(option)}
                    disabled={readOnly || (!!blocked && !chosen(option))}
                    onChange={() => set(field.key, option.value)}
                    data-cy={`protocol-${field.key}-${option.value}`}
                  >
                    {option.label}
                    {blocked ? (
                      <span
                        className="block text-small text-dark-secondary"
                        data-cy={`protocol-${field.key}-${option.value}-unavailable`}
                      >
                        {blocked}
                      </span>
                    ) : null}
                  </RadioButton>
                );
              })}
            </RadioButton.Group>
          ) : (
            <div className="flex flex-wrap gap-16">
              {field.options.map((option) => (
                <Checkbox
                  key={option.value}
                  size="sm"
                  checked={chosen(option)}
                  disabled={readOnly}
                  onChange={() => toggle(option)}
                  data-cy={`protocol-${field.key}-${option.value}`}
                >
                  {option.label}
                </Checkbox>
              ))}
            </div>
          )}
        </FormControl>
        {field.options
          .filter((option) => chosen(option) && option.followUp?.length)
          .map((option) => (
            <div key={option.value} className="flex flex-col gap-12">
              {option.followUp!.map(text)}
            </div>
          ))}
      </div>
    );
  };

  return (
    <>
      {template.sections
        .filter((section) => section.position === position)
        .map((section) => (
          <Disclosure key={section.key} variant="alt" className="w-full" initalOpen data-cy={`protocol-${section.key}`}>
            <Disclosure.Header>
              <Disclosure.Title>{section.title}</Disclosure.Title>
              <Disclosure.Button />
            </Disclosure.Header>
            <Disclosure.Content>
              <div className={`grid gap-16 ${COLUMNS[section.columns ?? 1]}`}>
                {section.fields.map((field) => (isText(field) ? text(field) : choice(field)))}
              </div>
            </Disclosure.Content>
          </Disclosure>
        ))}
    </>
  );
};
