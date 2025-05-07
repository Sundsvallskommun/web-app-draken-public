import { useAppContext } from '@contexts/app.context';
import { Table } from '@sk-web-gui/react';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { useEffect, useMemo, useState } from 'react';
import { CParameter } from 'src/data-contracts/backend/data-contracts';

export const SupportErrandDetailsTab: React.FC<{}> = () => {
  const {
    supportErrand,
  }: {
    supportErrand: SupportErrand;
  } = useAppContext();

  const simpleParams = useMemo(
    () =>
      supportErrand.parameters.filter((p) => {
        return !p.displayName.includes('|');
      }),
    [supportErrand.parameters]
  );

  const tableParams = useMemo(
    () =>
      supportErrand?.parameters?.filter(
        (param) => param.displayName.includes('|') && param.displayName.split('|').length > 1
      ) || [],
    [supportErrand.parameters]
  );

  const tables: { label: string; header: string[]; rows: { key: string; value: string }[][] }[] = useMemo(
    () =>
      tableParams?.map((param) => {
        const header = param.displayName.split('|');
        const rows = param.values.map((row: string) => {
          const columns = row?.split('|') || [];
          return columns.map((column, idx) => {
            return {
              key: `${param.key}-${idx}`,
              value: column,
            };
          });
        });
        return {
          label: param.group || '',
          header: header,
          rows: rows,
        };
      }) || [],
    [tableParams]
  );

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Ärendeuppgifter</h2>
        <div className="rounded-lg gap-md p-16">
          <h3 className="text-h3-md mb-12">Grunduppgifter</h3>
          {supportErrand?.externalTags?.find((tag) => tag.key === 'caseId')?.value ? (
            <div className="flex flex-row gap-md">
              <strong>Ärendenummer i e-tjänst</strong>
              <span>{supportErrand.externalTags.find((tag) => tag.key === 'caseId')?.value}</span>
            </div>
          ) : null}
          {simpleParams
            .filter((param) => param.values?.length > 0)
            .map((param, idx) => (
              <div key={`first-${param.key}-${idx}`} className="flex flex-row gap-md my-sm">
                <div className="font-bold">{param.displayName}</div>
                <div>{param.values.join(', ')}</div>
              </div>
            ))}
        </div>

        {tables.map((table, idx) => (
          <div key={`table-${idx}`} className="p-16">
            <h3 className="text-h3-md mb-12">{table.label}</h3>
            <Table dense background>
              <Table.Header>
                {table.header.map((header, headerIdx) => (
                  <Table.HeaderColumn key={`header-${headerIdx}`} className="flex justify-start">
                    {header}
                  </Table.HeaderColumn>
                ))}
              </Table.Header>
              <Table.Body>
                {table.rows.map((row, rowIdx) => (
                  <Table.Row key={`row-${rowIdx}`}>
                    {row.map((cell) => (
                      <Table.Column key={cell.key} className="flex justify-start">
                        {cell.value}
                      </Table.Column>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        ))}
        <div className="my-md gap-xl"></div>
      </div>
    </div>
  );
};
