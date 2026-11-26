import Facilities from '@common/components/facilities/facilities';
import { PropertyMap, type PropertyRow } from '@common/components/property-map';
import { FacilityDTO } from '@common/interfaces/facilities';
import { getFacilityByDesignation, makeFacility } from '@common/services/facilities-service';
import { Disclosure } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import {
  isSupportErrandLocked,
  SupportErrand,
  supportErrandIsEmpty,
} from '@supportmanagement/services/support-errand-service';
import { MapPin } from 'lucide-react';
import { Dispatch, FC, SetStateAction, useEffect, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

/** The facilities saved on the errand, in the shape the Facilities table and the save expect. */
const facilitiesFromErrand = (errand?: SupportErrand): FacilityDTO[] => {
  const valuesOf = (key: string) => errand?.parameters?.find((obj) => obj.key === key)?.values;
  const districtnames = valuesOf('districtname');
  const streets = valuesOf('street');
  return (valuesOf('propertyDesignation') ?? []).map((designation, index) => ({
    address: { propertyDesignation: designation, street: streets?.[index] || '' },
    extraParameters: { districtname: districtnames?.[index] || '' },
  }));
};

/**
 * The list being edited in the form. Every reset(errand) (on load, after save) drops `facilities` from the
 * form, since the errand has no such field; the errand is set together with each reset, so its saved list
 * is then the current one.
 */
const editedFacilities = (formValue: unknown, errand?: SupportErrand): FacilityDTO[] =>
  (formValue as FacilityDTO[] | undefined) ?? facilitiesFromErrand(errand);

export const SupportErrandBasicsRealEstateDisclosure: FC<{
  supportErrand: SupportErrand;
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
}> = (props) => {
  const { setValue, getValues } = useFormContext();
  const supportErrand = useSupportStore((s) => s.supportErrand);

  // The form holds the list being edited; Facilities and the map both change it there.
  useEffect(() => {
    setValue('facilities', facilitiesFromErrand(props.supportErrand), {
      shouldValidate: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoised: Facilities copies this list into its own state whenever it is a new array.
  const formFacilities: unknown = useWatch({ name: 'facilities' });
  const facilities = useMemo(() => editedFacilities(formFacilities, supportErrand), [formFacilities, supportErrand]);
  const isAdded = (row: PropertyRow) => facilities.some((f) => f.address?.propertyDesignation === row.fullDesignation);

  // The map only knows the designation; the estate search fills in street and district the same
  // way a search hit in Facilities does.
  const addFromMap = async (row: PropertyRow) => {
    const designation = row.fullDesignation;
    const hits = await getFacilityByDesignation(row.designation)
      .then((res) => res.data)
      .catch(() => []);
    const estate = hits.find((hit) => hit.designation === designation);
    const facility = makeFacility(estate ?? { designation, address: '', objectidentifier: '' });

    // Read after the lookup, so a change made while it ran is kept.
    const current = editedFacilities(getValues('facilities'), supportErrand);
    if (current.some((f) => f.address?.propertyDesignation === designation)) return;
    setValue('facilities', [...current, facility], { shouldDirty: true });
    props.setUnsavedFacility(true);
  };

  return (
    <div className="mt-md">
      <Disclosure disabled={supportErrandIsEmpty(supportErrand!)} variant="alt" data-cy={`facility-disclosure`}>
        <Disclosure.Header>
          <Disclosure.Icon icon={<MapPin />} />
          <Disclosure.Title>Fastigheter</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          <PropertyMap onAdd={isSupportErrandLocked(supportErrand!) ? undefined : addFromMap} isAdded={isAdded} />
          <Facilities setValue={setValue} setUnsaved={props.setUnsavedFacility} facilities={facilities}></Facilities>
        </Disclosure.Content>
      </Disclosure>
    </div>
  );
};
