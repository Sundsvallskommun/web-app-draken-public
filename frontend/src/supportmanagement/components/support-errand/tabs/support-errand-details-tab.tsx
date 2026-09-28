import { JsonParametersDisplay } from '@common/components/json/schema/json-parameters-display.component';
import { useCompanyEngagements } from '@common/hooks/use-company-engagements';
import { useCompanyProfile } from '@common/hooks/use-company-profile';
import { appConfig } from '@config/appconfig';
import { Alert, Spinner, Table } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import { schemaNameForErrand } from '@supportmanagement/services/support-errand-schema-service';
import { isOpenEErrand } from '@supportmanagement/services/support-errand-service';
import { namespaceHasPbiRole } from '@supportmanagement/services/support-pbi-service';
import { useMemo, useState } from 'react';

import { SupportErrandBusinessDescriptionDrawer } from './support-errand-business-description-drawer.component';
import { SupportErrandCompanyEngagements } from './support-errand-company-engagements.component';
import { SupportErrandTypeForm } from './support-errand-type-form.component';
import { useSupportPbi } from './use-support-pbi';

export const SupportErrandDetailsTab: React.FC<{}> = () => {
  const _supportErrand = useSupportStore((s) => s.supportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = _supportErrand!;
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);

  const usesTypeForm = appConfig.features.useDetailsTab;
  const loadsTypeForm = usesTypeForm && !supportMetadata;
  const typeSchemaName = usesTypeForm ? schemaNameForErrand(supportErrand, supportMetadata?.namespace) : undefined;
  const showsTypeForm = !loadsTypeForm && !!typeSchemaName && !!municipalityId;
  const otherJsonParameters = useMemo(
    () => supportErrand.jsonParameters?.filter((parameter) => parameter.key !== typeSchemaName) ?? [],
    [supportErrand.jsonParameters, typeSchemaName]
  );
  const showsJsonParameters = !loadsTypeForm && otherJsonParameters.length > 0 && !!municipalityId;
  // Nothing to show under either heading: the type form needs a saved errand type, other documents need a filed parameter.
  const showsNoJsonParameters = !loadsTypeForm && !showsTypeForm && !showsJsonParameters;

  const organizationStakeholder = supportErrand.stakeholders?.find(
    (stakeholder) => stakeholder.role === 'PRIMARY' && stakeholder.externalIdType === 'COMPANY'
  );
  const organizationPartyId = organizationStakeholder?.externalId;
  const companyInformation = appConfig.features.useCompanyInformation ? organizationPartyId : undefined;
  const marksPbi = !!companyInformation && namespaceHasPbiRole(supportMetadata);
  const pbi = useSupportPbi(marksPbi);
  const plainEngagements = useCompanyEngagements(marksPbi ? undefined : companyInformation);
  const companyEngagements = pbi.candidates ?? plainEngagements;
  const showsCompanyEngagements = companyEngagements.length > 0;
  const companyProfile = useCompanyProfile(companyInformation);
  const [showsBusinessDescription, setShowsBusinessDescription] = useState(false);

  const simpleParams = useMemo(
    () =>
      supportErrand.parameters?.filter((p) => {
        return typeof p.displayName === 'string' && !p.displayName.includes('|') && !p.key.includes('recruitment@');
      }) || [],
    [supportErrand.parameters]
  );

  const tableParams = useMemo(
    () =>
      supportErrand?.parameters?.filter(
        (param) =>
          typeof param.displayName === 'string' &&
          param.displayName.includes('|') &&
          param.displayName.split('|').length > 1 &&
          !param.key.includes('recruitment@')
      ) || [],
    [supportErrand.parameters]
  );

  const tables: { label: string; header: string[]; rows: { key: string; value: string }[][] }[] = useMemo(
    () =>
      tableParams?.map((param) => {
        const header = param.displayName!.split('|');
        const rows = param.values!.map((row: string) => {
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
        {(isOpenEErrand(supportErrand) || simpleParams.length > 0) && (
          <div className="rounded-lg gap-md p-16">
            <h3 className="text-h3-md mb-12">Grunduppgifter</h3>
            {isOpenEErrand(supportErrand) ? (
              <div className="flex flex-row gap-md">
                <strong>Ärendenummer i e-tjänst</strong>
                <span>{supportErrand.externalTags?.find((tag) => tag.key === 'caseId')?.value}</span>
              </div>
            ) : null}
            {simpleParams
              .filter((param) => (param.values?.length ?? 0) > 0)
              .map((param, idx) => (
                <div key={`first-${param.key}-${idx}`} className="flex flex-row gap-md my-sm">
                  <div className="font-bold">{param.displayName}</div>
                  <div>{param.values?.join(', ')}</div>
                </div>
              ))}
          </div>
        )}

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
        {loadsTypeForm ? (
          <div className="flex items-center gap-md p-16">
            <Spinner size={2} />
            <span>Laddar ärendeuppgifter...</span>
          </div>
        ) : null}
        {showsNoJsonParameters ? (
          <Alert type="info" className="mx-16" data-cy="no-json-parameters-notice">
            <Alert.Icon />
            <Alert.Content>
              <Alert.Content.Description>
                Ärendet har inga ärendeuppgifter. Det kan bero på att ingen ärendetyp har valts och sparats ännu.
              </Alert.Content.Description>
            </Alert.Content>
          </Alert>
        ) : null}
        {showsTypeForm ? (
          <div className="p-16">
            <SupportErrandTypeForm
              supportErrand={supportErrand}
              municipalityId={municipalityId}
              schemaName={typeSchemaName}
            />
          </div>
        ) : null}
        {showsJsonParameters && municipalityId ? (
          <div className={showsCompanyEngagements ? 'px-16 pt-16' : 'p-16'}>
            <JsonParametersDisplay jsonParameters={otherJsonParameters as any} municipalityId={municipalityId} />
          </div>
        ) : null}
        {showsCompanyEngagements ? (
          <div className={showsJsonParameters ? 'px-16 pb-16' : 'p-16'}>
            <SupportErrandCompanyEngagements
              engagements={companyEngagements}
              initiallyOpen={!showsJsonParameters}
              companyName={companyProfile?.name ?? organizationStakeholder?.organizationName}
              onShowBusinessDescription={companyProfile ? () => setShowsBusinessDescription(true) : undefined}
              pbiMarking={pbi.marking}
              pbiNotice={pbi.notice}
            />
          </div>
        ) : null}
        {companyProfile ? (
          <SupportErrandBusinessDescriptionDrawer
            show={showsBusinessDescription}
            profile={companyProfile}
            onClose={() => setShowsBusinessDescription(false)}
          />
        ) : null}
      </div>
    </div>
  );
};
