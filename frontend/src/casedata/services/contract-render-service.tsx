import React, { useEffect } from 'react';
import { Table, Checkbox, FormControl, FormLabel, Input, DatePicker } from '@sk-web-gui/react';

function renderContractTermCheckboxList({ getValues, setValue, register }) {
  const RenderRow = ({ key, header, conditionText, date, extraField }) => {
    const isChecked = !!getValues(key);

    useEffect(() => {
      if (isChecked) {
        setValue(key, {
          header,
          conditionText,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isChecked, key, header, conditionText, setValue]);

    return (
      <Table.Row key={key}>
        <Table.Column className="flex flex-col items-start">
          <FormControl className="my-md" data-cy={`${key}-checkbox`}>
            <Checkbox
              defaultChecked={!!getValues(key)}
              onChange={(val) => {
                setValue(
                  key,
                  val.target.checked
                    ? {
                        header,
                        conditionText,
                      }
                    : undefined
                );
              }}
            >
              {conditionText ? <strong>{header}</strong> : header}
            </Checkbox>
            {key === 'markfororeningarTerms.condition.testDone' && getValues(key) ? (
              <>
                <strong>Ange Datum för provtagning</strong>
                <DatePicker
                  onChange={(date) => setValue('markfororeningarTerms.condition.testDone.date', date)}
                  {...register('markfororeningarTerms.condition.testDone.date')}
                ></DatePicker>
              </>
            ) : null}
            <span>{conditionText}</span>
          </FormControl>
          {extraField ? (
            <FormControl className="mb-md">
              <FormLabel>{extraField.header}</FormLabel>
              <Input type="number" {...register(extraField.key)} placeholder={extraField.placeholder} />
            </FormControl>
          ) : null}
        </Table.Column>
      </Table.Row>
    );
  };
  return RenderRow;
}

export default renderContractTermCheckboxList;
