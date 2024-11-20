import { useAppContext } from '@common/contexts/app.context';
import { SupportContactsComponent } from '@supportmanagement/components/new-contacts/support-contacts.component';
import { SupportErrandBasicsAboutDisclosure } from '@supportmanagement/components/support-errand-basics-disclosure/support-errand-basics-about-disclosure.component';
import { SupportErrandBasicsRealEstateDisclosure } from '@supportmanagement/components/support-errand-basics-disclosure/support-errand-basics-realestate-disclosure.component';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import { ApiSupportErrand, Status, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { isIK, isLOP } from '@common/services/application-service';
import { Dispatch, SetStateAction } from 'react';

export interface EscalationFormModel {
  id: string;
  assignedUserId?: string;
  status: Status;
  category: string;
  type: string;
  resolution: string;
  escalationEmail: string;
  escalationMessageBody: string;
  escalationMessageBodyPlaintext: string;
  existingAttachments: SupportAttachment[];
  addExisting: string;
}

export const SupportErrandBasicsTab: React.FC<{
  errand: ApiSupportErrand;
  setUnsaved: (unsaved: boolean) => void;
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
  update: () => void;
}> = (props) => {
  const {
    supportErrand,
  }: {
    municipalityId: string;
    supportErrand: SupportErrand;
    setSupportErrand: (e: SupportErrand) => void;
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

      {/* <SupportErrandBasicsOwnerDisclosure setUnsaved={props.setUnsaved} update={props.update} /> */}
      {/* <SupportErrandBasicsStakeholdersDisclosure setUnsaved={props.setUnsaved} update={props.update} /> */}

      {!isLOP() && !isIK() && (
        <SupportErrandBasicsRealEstateDisclosure
          setUnsavedFacility={props.setUnsavedFacility}
          supportErrand={supportErrand}
        />
      )}
    </div>
  );
};
