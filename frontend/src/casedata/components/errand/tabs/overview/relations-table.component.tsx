import { CaseStatusLabelComponent } from '@common/components/case-status-label/case-status-label.component';
import { Relation } from '@common/services/relations-service';
import { Table } from '@sk-web-gui/react';
import { SupportStatusLabelComponent } from '@supportmanagement/components/ongoing-support-errands/components/support-status-label.component';
import React from 'react';

interface RelationsTableProps {
  errands: any[];
  headers: React.ReactNode;
  linkedStates: Relation[];
  title: string;
  dataCy: string;
}

export const RelationsTable: React.FC<RelationsTableProps> = ({ errands, headers, title, dataCy }) => {
  console.log('Rendering RelationsTable with errands:', errands);
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
                    <CaseStatusLabelComponent status={errand.status} />
                  </Table.HeaderColumn>
                  <Table.Column>
                    {errand?.stakeholder
                      ? errand?.stakeholder?.firstName + ' ' + errand?.stakeholder?.lastName
                      : '(saknas)'}
                  </Table.Column>
                  <Table.Column>{errand?.errandNumber}</Table.Column>
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
