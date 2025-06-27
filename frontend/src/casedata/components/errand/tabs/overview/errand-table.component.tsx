import { Relations } from '@common/services/relations-service';
import { Table } from '@sk-web-gui/react';
import { StatusLabelComponent } from '@supportmanagement/components/ongoing-support-errands/components/supporterrands-table.component';
import React from 'react';

interface ErrandsTableProps {
  errands: any[];
  headers: React.ReactNode;
  linkedStates: Relations[];
  title: string;
  dataCy: string;
}

export const ErrandsTable: React.FC<ErrandsTableProps> = ({ errands, headers, title, dataCy }) => {
  return (
    <>
      <h3 className="py-[1.2rem]">{title}</h3>
      <Table data-cy={dataCy} aria-describedby={`${dataCy}-table`} scrollable>
        {!errands.length ? (
          <caption id={`${dataCy}TableCaption`} className="my-32">
            Det finns inga ärenden
          </caption>
        ) : (
          <>
            <Table.Header>{headers}</Table.Header>
            <Table.Body>
              {errands.map((errand, index) => (
                <Table.Row key={`row-${index}`}>
                  <Table.HeaderColumn scope="row" className="w-[22rem] overflow-hidden text-ellipsis table-caption">
                    {StatusLabelComponent(errand.status, errand.resolution)}
                  </Table.HeaderColumn>
                  <Table.Column>{errand.stakeholder.firstName + ' ' + errand.stakeholder.lastName}</Table.Column>
                  <Table.Column>{errand.errandNumber}</Table.Column>
                  <Table.Column className="w-[15.4rem]" />
                </Table.Row>
              ))}
            </Table.Body>
          </>
        )}
      </Table>
    </>
  );
};
