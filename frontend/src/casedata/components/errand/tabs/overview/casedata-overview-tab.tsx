import CasedataForm from '@casedata/components/errand/tabs/overview/casedata-form.component';
import { IErrand } from '@casedata/interfaces/errand';
import { FormErrorMessage } from '@sk-web-gui/react';
import { Dispatch, SetStateAction, useRef, useState } from 'react';

interface CasedataOverviewProps {
  errand: IErrand;
  update: () => void;
  setUnsaved: Dispatch<SetStateAction<boolean>>;
  registeringNewErrand: boolean;
}

export const CasedataOverviewTab: React.FC<CasedataOverviewProps> = (props) => {
  const { errand, setUnsaved } = props;
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const modalFocus = useRef(null);
  const setModalFocus = () => {
    setTimeout(() => {
      modalFocus.current && modalFocus.current.focus();
    });
  };

  const [isErrandModalOpen, setIsErrandModalOpen] = useState(false);

  const closeErrandModal = () => {
    setIsErrandModalOpen(false);
  };
  const openErrandModal = () => {
    setIsErrandModalOpen(true);
    setModalFocus();
  };

  return (
    <div>
      <CasedataForm
        registeringNewErrand={typeof errand?.id === 'undefined'}
        setUnsaved={setUnsaved}
        update={() => {}}
        setFormIsValid={() => {}}
        errand={errand}
      />
      {error && <FormErrorMessage>Något gick fel är ärendet uppdaterades</FormErrorMessage>}
    </div>
  );
};
