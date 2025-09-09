import { CaseLabels } from '@casedata/interfaces/case-label';
import { BaseRelationsTable } from '@common/components/linked-errands-disclosure/relation-tables/base-relation-table.component';
import { CaseStatusLabelComponent } from '@common/components/case-status-label/case-status-label.component';
import { CaseStatusResponse, findOperationUsingNamespace } from '@common/services/casestatus-service';
import { Relation, relationsToLabels } from '@common/services/relations-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, SortMode, Table } from '@sk-web-gui/react';
import React from 'react';

interface RelationsToTableProps {
  errands: CaseStatusResponse[];
  linkedStates: Relation[];
  handleLinkClick: (index: string) => void;
  title: string;
  dataCy: string;
}

const LinkButtonComponent: React.FC<{ isLinked: boolean; onClick: () => void }> = ({ isLinked, onClick }) => {
  return (
    <div className="flex justify-center">
      <Button
        variant={isLinked ? 'secondary' : 'primary'}
        color={'primary'}
        size="sm"
        className="w-full justify-start"
        onClick={onClick}
        leftIcon={<LucideIcon name={isLinked ? 'link-2-off' : 'link-2'} size={16} />}
      >
        {isLinked ? 'Bryt koppling' : 'Koppla'}
      </Button>
    </div>
  );
};

const headers = relationsToLabels.map((header, index) => (
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

export const RelationsToTable: React.FC<RelationsToTableProps> = ({
  errands,
  linkedStates,
  handleLinkClick,
  title,
  dataCy,
}) => {
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
          <Table.Column className="w-[16rem]">{CaseLabels.ALL[errand.caseType] ?? errand.caseType}</Table.Column>
          <Table.Column className="w-[10rem]">{findOperationUsingNamespace(errand.namespace)}</Table.Column>
          <Table.Column className="w-[14.5rem]">{errand.errandNumber}</Table.Column>
          <Table.Column className="w-[16.4rem]">
            <LinkButtonComponent
              isLinked={linkedStates.some((relation) => relation.target.resourceId === errand.caseId)}
              onClick={() => handleLinkClick(errand.caseId)}
            />
          </Table.Column>
        </>
      )}
    />
  );
};
