import React from 'react';
import { Table, Checkbox, FormControl, FormLabel, Input } from '@sk-web-gui/react';

function renderContractTermCheckboxList({ getValues, setValue, register }) {
  const renderRow = ({ key, header, conditionText, extraField }) => (
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

  return renderRow;
}

export default renderContractTermCheckboxList;
