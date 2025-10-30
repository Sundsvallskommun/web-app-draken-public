import Facilities from '@common/components/facilities/facilities';
import { FacilityDTO } from '@common/interfaces/facilities';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Disclosure } from '@sk-web-gui/react';
import { supportErrandIsEmpty } from '@supportmanagement/services/support-errand-service';

import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

export const SupportErrandBasicsRealEstateDisclosure: React.FC<{}> = () => {
  const [facilities, setFacilities] = useState<FacilityDTO[]>([]);
  const { setValue } = useFormContext();

  const { supportErrand } = useAppContext();

  useState(() => {
    let facilitiesFromErrande = [] as FacilityDTO[];
    const estates = supportErrand?.parameters?.filter((obj) => obj.key === 'propertyDesignation')[0]?.values;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Facilities setValue={setValue} facilities={facilities} />
      </Disclosure>
    </div>
  );
};
