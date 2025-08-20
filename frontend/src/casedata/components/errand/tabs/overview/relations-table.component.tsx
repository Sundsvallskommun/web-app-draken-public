import { BaseRelationsTable } from '@common/components/base-relation-table/base-relation-table.component';
import { CaseStatusLabelComponent } from '@common/components/case-status-label/case-status-label.component';
import { CaseStatusResponse } from '@common/services/casestatus-service';
import { Table } from '@sk-web-gui/react';
import React from 'react';

interface RelationsTableProps {
  errands: CaseStatusResponse[];
  headers: React.ReactNode;
  title: string;
  dataCy: string;
}

export const RelationsTable: React.FC<RelationsTableProps> = ({ errands, headers, title, dataCy }) => {
  return (
    <BaseRelationsTable
      errands={errands}
      headers={headers}
      title={title}
      dataCy={dataCy}
      renderRow={(errand) => (
        <>
          <Table.HeaderColumn scope="row" className="w-[22rem] overflow-hidden text-ellipsis table-caption">
            <CaseStatusLabelComponent status={errand.status} />
          </Table.HeaderColumn>
          <Table.Column>
            {errand?.stakeholder ? errand?.stakeholder?.firstName + ' ' + errand?.stakeholder?.lastName : '(saknas)'}
          </Table.Column>
          <Table.Column>{errand?.errandNumber}</Table.Column>
          <Table.Column className="w-[15.4rem]" />
        </>
      )}
    />
  );
};
