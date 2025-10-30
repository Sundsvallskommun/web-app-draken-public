import { LinkedErrandsDisclosure } from '@common/components/linked-errands-disclosure/linked-errands-disclosure.component';
import { useAppContext } from '@common/contexts/app.context';
import { appConfig } from '@config/appconfig';
import { SupportContactsComponent } from '@supportmanagement/components/new-contacts/support-contacts.component';
import { SupportErrandBasicsAboutDisclosure } from '@supportmanagement/components/support-errand-basics-disclosure/support-errand-basics-about-disclosure.component';
import { SupportErrandBasicsRealEstateDisclosure } from '@supportmanagement/components/support-errand-basics-disclosure/support-errand-basics-realestate-disclosure.component';

export const SupportErrandBasicsTab: React.FC<{
  setUnsaved: (unsaved: boolean) => void;
}> = (props) => {
  const { supportErrand } = useAppContext();

  return (
    <>
      <div className="mb-32">
        <span>Fyll i följande uppgifter för att säkerställa att vi har all nödvändig information om ärendet.</span>
      </div>

      <SupportErrandBasicsAboutDisclosure />

      <SupportContactsComponent setUnsaved={props.setUnsaved} />

      {appConfig.features.useFacilities && <SupportErrandBasicsRealEstateDisclosure />}

      {appConfig.features.useRelations && (
        <div className="mt-md">
          <LinkedErrandsDisclosure errand={supportErrand} />
        </div>
      )}
    </>
  );
};
