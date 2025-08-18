import { useAppContext } from '@common/contexts/app.context';
import { getApplicationEnvironment } from '@common/services/application-service';
import { appConfig } from '@config/appconfig';
import { SupportContactsComponent } from '@supportmanagement/components/new-contacts/support-contacts.component';
import { SupportErrandBasicsAboutDisclosure } from '@supportmanagement/components/support-errand-basics-disclosure/support-errand-basics-about-disclosure.component';
import { SupportErrandBasicsRealEstateDisclosure } from '@supportmanagement/components/support-errand-basics-disclosure/support-errand-basics-realestate-disclosure.component';
import { SupportErrandBasicsRelationsDisclosure } from '@supportmanagement/components/support-errand-basics-disclosure/support-errand-basics-relations-disclosure/support-errand-basics-relations-disclosure.component';
import { ApiSupportErrand, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { Dispatch, SetStateAction } from 'react';

export const SupportErrandBasicsTab: React.FC<{
  errand: ApiSupportErrand;
  setUnsaved: (unsaved: boolean) => void;
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
  update: () => void;
}> = (props) => {
  const {
    supportErrand,
  }: {
    supportErrand: SupportErrand;
  } = useAppContext();

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
          supportErrand={supportErrand}
        />
      ) : null}

      {getApplicationEnvironment() === 'TEST' && appConfig.features.useRelations ? (
        <SupportErrandBasicsRelationsDisclosure supportErrand={supportErrand} />
      ) : null}
    </div>
  );
};
