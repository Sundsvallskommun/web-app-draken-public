import Facilities from '@common/components/facilities/facilities';
import { FacilityDTO } from '@common/interfaces/facilities';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Disclosure } from '@sk-web-gui/react';
import { SupportErrand, supportErrandIsEmpty } from '@supportmanagement/services/support-errand-service';

import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

export const SupportErrandBasicsRealEstateDisclosure: React.FC<{
  supportErrand: SupportErrand;
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
}> = (props) => {
  const [facilities, setFacilities] = useState<FacilityDTO[]>([]);
  const { setValue, watch, getValues } = useFormContext();

  const {
    supportErrand,
  }: {
    supportErrand: SupportErrand;
  } = useAppContext();

  const fac = watch('facilities');

  useState(() => {
    let facilitiesFromErrande = [] as FacilityDTO[];
    const estates = props.supportErrand?.parameters?.filter((obj) => obj.key === 'propertyDesignation')[0]?.values;

    if (estates !== undefined) {
      estates.forEach((facility) => {
        let obj = {} as FacilityDTO;
        obj.address = { propertyDesignation: facility };
        facilitiesFromErrande.push(obj);
      });

      setFacilities(facilitiesFromErrande);
    }
  });

  useEffect(() => {
    setValue('facilities', facilities, {
      shouldValidate: true,
    });
  }, []);

  return (
    <div className="mt-md">
      <Disclosure
        disabled={supportErrandIsEmpty(supportErrand)}
        variant="alt"
        icon={<LucideIcon name="map-pin" />}
        header="Fastigheter"
        data-cy={`facility-disclosure`}
      >
        <Facilities setValue={setValue} setUnsaved={props.setUnsavedFacility} facilities={facilities}></Facilities>
      </Disclosure>
    </div>
  );
};
