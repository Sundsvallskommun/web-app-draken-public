import { ErrandSection, ErrandSectionLookProvider } from '@common/components/errand-section/errand-section.component';
import { LinkedErrandsDisclosure } from '@common/components/linked-errands-disclosure/linked-errands-disclosure.component';
import { appConfig } from '@config/appconfig';
import { useSupportStore } from '@stores/index';
import { SupportContactsComponent } from '@supportmanagement/components/new-contacts/support-contacts.component';
import { SupportErrandCompanySection } from '@supportmanagement/components/support-errand/pbi/support-errand-company-section.component';
import { SupportErrandBasicsAboutDisclosure } from '@supportmanagement/components/support-errand-basics-disclosure/support-errand-basics-about-disclosure.component';
import { SupportErrandBasicsRealEstateDisclosure } from '@supportmanagement/components/support-errand-basics-disclosure/support-errand-basics-realestate-disclosure.component';
import { ApiSupportErrand, isOrganizationExternalIdType } from '@supportmanagement/services/support-errand-service';
import { Building2 } from 'lucide-react';
import { Dispatch, FC, SetStateAction } from 'react';

import { SupportActionPointsSection } from '../control-points/support-action-points-section.component';
import { SupportControlPointsSection } from '../control-points/support-control-points-section.component';
import { SupportMessagesTab } from './messages/support-messages-tab';
import { SupportErrandAttachmentsTab } from './support-errand-attachments-tab';
export const SupportErrandBasicsTab: FC<{
  errand: ApiSupportErrand;
  setUnsaved: (unsaved: boolean) => void;
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
  update: () => void;
}> = (props) => {
  const supportErrand = useSupportStore((s) => s.supportErrand);

  const organizationPartyId = supportErrand?.stakeholders?.find(
    (stakeholder) => stakeholder.role === 'PRIMARY' && isOrganizationExternalIdType(stakeholder.externalIdType)
  )?.externalId;

  return (
    <ErrandSectionLookProvider value="box">
      <div className="pt-xl pb-64 px-40 flex flex-col">
        {/* <div className="flex flex-col gap-md mb-32">
          <PrototypeBanner>Prototyp – layouten prövas fram och ser inte ut så här i färdig version</PrototypeBanner>
          <h2 className="text-h2-md">Grundinformation</h2>
          <span>Fyll i följande uppgifter för att säkerställa att vi har all nödvändig information om ärendet.</span>
        </div> */}

        <SupportErrandBasicsAboutDisclosure errand={props.errand} setUnsaved={props.setUnsaved} update={props.update} />

        {supportErrand?.id ? (
          <SupportContactsComponent
            registeringNewErrand={typeof supportErrand?.id === 'undefined'}
            setUnsaved={props.setUnsaved}
            update={() => {}}
          />
        ) : null}

        {appConfig.features.useCompanyInformation && supportErrand?.id ? (
          <div className="mt-md">
            <ErrandSection icon={<Building2 />} title="Företagsinformation">
              <SupportErrandCompanySection organizationPartyId={organizationPartyId} />
            </ErrandSection>
          </div>
        ) : null}

        {appConfig.features.useFacilities ? (
          <SupportErrandBasicsRealEstateDisclosure
            setUnsavedFacility={props.setUnsavedFacility}
            supportErrand={supportErrand!}
          />
        ) : null}
        {supportErrand?.id ? (
          <div className="mt-md">
            <SupportControlPointsSection />
          </div>
        ) : null}

        {supportErrand?.id ? (
          <div className="mt-md">
            <SupportActionPointsSection />
          </div>
        ) : null}

        {appConfig.features.useMessagesSection && supportErrand?.id ? (
          <div className="mt-md">
            <SupportMessagesTab variant="section" />
          </div>
        ) : null}

        {appConfig.features.useAttachmentsSection && supportErrand?.id ? (
          <div className="mt-md">
            <SupportErrandAttachmentsTab variant="section" />
          </div>
        ) : null}

        {appConfig.features.useRelations ? (
          <div className="mt-md">
            <LinkedErrandsDisclosure errand={supportErrand!} />
          </div>
        ) : null}
      </div>
    </ErrandSectionLookProvider>
  );
};
