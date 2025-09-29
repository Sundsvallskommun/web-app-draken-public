import { BaseRelationsTable } from '@common/components/linked-errands-disclosure/relation-tables/base-relation-table.component';
import { CaseStatusLabelComponent } from '@common/components/case-status-label/case-status-label.component';
import { CaseStatusResponse, findOperationUsingNamespace } from '@common/services/casestatus-service';
import { relationsFromLabels } from '@common/services/relations-service';
import { SortMode, Table } from '@sk-web-gui/react';
import React from 'react';
import { CaseLabels } from '@casedata/interfaces/case-label';

interface RelationsFromTableProps {
  errands: CaseStatusResponse[];
  title: string;
  dataCy: string;
}

const headers = relationsFromLabels.map((header, index) => (
  <Table.HeaderColumn key={`header-${index}`} sticky={true}>
    {header.screenReaderOnly ? (
      <span className="sr-only">{header.label}</span>
    ) : header.sortable ? (
      <Table.SortButton isActive={true} sortOrder={'ASC' as SortMode} onClick={() => {}}>
        {header.label}
      </Table.SortButton>
    ) : (
      header.label
    )}
  </Table.HeaderColumn>
));

export const RelationsFromTable: React.FC<RelationsFromTableProps> = ({ errands, title, dataCy }) => {
  return (
    <BaseRelationsTable
      errands={errands}
      headers={headers}
      title={title}
      dataCy={dataCy}
      renderRow={(errand) => (
        <>
          <Table.HeaderColumn scope="row" className="w-[22rem] overflow-hidden text-ellipsis table-caption">
            <CaseStatusLabelComponent externalStatus={errand?.externalStatus} />
          </Table.HeaderColumn>
          <Table.Column className="w-[16rem]">{CaseLabels.ALL[errand.caseType] ?? errand.caseType}</Table.Column>
          <Table.Column className="w-[10rem]">{findOperationUsingNamespace(errand.namespace)}</Table.Column>
          <Table.Column className="w-[14.5rem]">{errand.errandNumber}</Table.Column>
          <Table.Column className="w-[16.4rem]" />
        </>
      )}
    />
  );
};
