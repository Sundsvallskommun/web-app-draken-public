import { LinkedErrandsDisclosure } from '@common/components/linked-errands-disclosure/linked-errands-disclosure.component';
import { appConfig } from '@config/appconfig';
import { useSupportStore } from '@stores/support-store';
import { SupportContactsComponent } from '@supportmanagement/components/new-contacts/support-contacts.component';
import { SupportErrandBasicsAboutDisclosure } from '@supportmanagement/components/support-errand-basics-disclosure/support-errand-basics-about-disclosure.component';
import { SupportErrandBasicsRealEstateDisclosure } from '@supportmanagement/components/support-errand-basics-disclosure/support-errand-basics-realestate-disclosure.component';
import { ApiSupportErrand, supportErrandIsEmpty } from '@supportmanagement/services/support-errand-service';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';
import { Dispatch, FC, SetStateAction } from 'react';
export const SupportErrandBasicsTab: FC<{
  errand: ApiSupportErrand;
  setUnsaved: (unsaved: boolean) => void;
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
  update: () => void;
}> = (props) => {
  const supportErrand = useSupportStore((s) => s.supportErrand);

  const owner = supportErrand ? getSupportOwnerStakeholder(supportErrand) : undefined;

  return (
    <div className="pt-xl pb-64 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Grundinformation</h2>
        <span>Fyll i följande uppgifter för att säkerställa att vi har all nödvändig information om ärendet.</span>
      </div>

      <SupportErrandBasicsAboutDisclosure errand={props.errand} setUnsaved={props.setUnsaved} update={props.update} />

      {supportErrand?.id ? (
        <SupportContactsComponent
          registeringNewErrand={typeof supportErrand?.id === 'undefined'}
          setUnsaved={props.setUnsaved}
          update={() => {}}
        />
      ) : null}

      {appConfig.features.useFacilities ? (
        <SupportErrandBasicsRealEstateDisclosure
          setUnsavedFacility={props.setUnsavedFacility}
          supportErrand={supportErrand!}
        />
      ) : null}

      {appConfig.features.useRelations ? (
        <div className="mt-md">
          <LinkedErrandsDisclosure
            errand={supportErrand!}
            disabled={supportErrandIsEmpty(supportErrand!)}
            relatedPerson={owner ? { id: owner.externalId ?? '', type: owner.stakeholderType ?? '' } : undefined}
          />
        </div>
      ) : null}
    </div>
  );
};
