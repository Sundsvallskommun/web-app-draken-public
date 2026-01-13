import { isErrandLocked } from '@casedata/services/casedata-errand-service';
import { EstateInformation, EstateInfoSearch } from '@common/interfaces/estate-details';
import { FacilityDTO } from '@common/interfaces/facilities';
import { isKC } from '@common/services/application-service';
import {
  getFacilityByAddress,
  getFacilityByDesignation,
  getFacilityInfo,
  makeFacility,
  removeMunicipalityName,
} from '@common/services/facilities-service';
import { useAppContext } from '@contexts/app.context';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Link,
  RadioButton,
  SearchField,
  Spinner,
  Table,
  useSnackbar,
} from '@sk-web-gui/react';
import { isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import { useEffect, useState } from 'react';
import { useForm, UseFormSetValue } from 'react-hook-form';
import { FacilityDetails } from './facilities-details';
import { useDebounceEffect } from '@common/utils/useDebounceEffect';

export const Facilities: React.FC<{
  setValue: UseFormSetValue<any>;
  setUnsaved: (unsaved: boolean) => void;
  facilities: FacilityDTO[];
  onSave?: (estates: FacilityDTO[]) => Promise<void>;
}> = (props) => {
  const { setValue, setUnsaved } = props;
  const toastMessage = useSnackbar();

  const {
    supportErrand,
    errand,
  }: {
    supportErrand;
    errand;
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<string>('');
  const [searchResult, setSearchResult] = useState<EstateInfoSearch[]>([]);
  const [realEstates, setRealEstates] = useState<FacilityDTO[]>([]);
  const [showSpinner, setShowSpinner] = useState<boolean>(false);
  const [internalUnsaved, setInternalUnsaved] = useState<boolean>(false);

  const { register } = useForm();

  const [selectedEstate, setSelectedEstate] = useState<EstateInformation>();

  useEffect(() => {
    setRealEstates(props.facilities);
  }, [props.facilities]);

  const onSearchHandler = (inQuery) => {
    if (inQuery.length > 2) {
      setShowSpinner(true);
      if (searchType === 'ADDRESS') {
        getFacilityByAddress(inQuery)
          .then((res) => {
            setSearchResult(res.data);
            setShowSpinner(false);
          })
          .catch((e) => {
            setSearchResult([]);
            setShowSpinner(false);
          });
      } else {
        getFacilityByDesignation(inQuery)
          .then((res) => {
            setSearchResult(res.data);
            setShowSpinner(false);
          })
          .catch((e) => {
            setSearchResult([]);
            setShowSpinner(false);
          });
      }
    }
  };

  useDebounceEffect(
    () => {
      setSearchResult([]);
      onSearchHandler(searchQuery);
    },
    500,
    [searchQuery]
  );

  const openEstateInfo = (inEstate: string, inIndex: number) => {
    const spinnerElement = document.getElementById('realEstate-spinner-' + inIndex);
    const linkElement = document.getElementById('realEstate-link-' + inIndex);

    if (spinnerElement && linkElement) {
      spinnerElement.style.display = 'flex';
      linkElement.style.display = 'none';
    }
    getFacilityInfo(inEstate)
      .then((res) => {
        setSelectedEstate(res.data);
      })
      .catch((e) => {
        toastMessage({
          message: 'Kunde inte hämta fastighetsinformation',
          status: 'error',
        });
      })
      .finally(() => {
        if (spinnerElement && linkElement) {
          spinnerElement.style.display = 'none';
          linkElement.style.display = 'block';
        }
      });
  };

  const ResultList: React.FC<{ result: EstateInfoSearch[] }> = ({ result }) => {
    const data = result ?? [];
    return searchResult.length > 0 ? (
      <SearchField.SuggestionsList data-cy="suggestion-list" className="w-full" key={`searchList-${searchQuery}`}>
        {data.map((estate, index) => (
          <SearchField.SuggestionsOption
            key={`searchHit-${searchQuery}-${index}`}
            value={searchType === 'ADDRESS' ? `${estate.address}` : estate.designation}
            onChange={(event) => {
              event.stopPropagation();
              setRealEstates([...realEstates, makeFacility(estate)]);
              setValue('facilities', [...realEstates, makeFacility(estate)], { shouldDirty: true });
              setInternalUnsaved(true);
              setUnsaved(true);
            }}
            data-cy={`searchHit-${index}`}
          >
            {searchType === 'ADDRESS' ? `${estate.address}` : removeMunicipalityName(estate.designation)}
          </SearchField.SuggestionsOption>
        ))}
      </SearchField.SuggestionsList>
    ) : null;
  };

  return (
    <div>
      <FormControl className="w-full lg:w-[85%] my-lg">
        <FormLabel>Sök och lägg till fastigheter</FormLabel>

        <fieldset className="flex flex-row gap-12" data-cy="radio-button-group">
          <RadioButton
            disabled={isKC() ? isSupportErrandLocked(supportErrand) : isErrandLocked(errand)}
            value="PROPERTY"
            onClick={(e) => {
              const target = e.target as HTMLTextAreaElement;
              setSearchType(target.value);
              setSearchResult([]);
            }}
            name="sk-example"
            defaultChecked
            data-cy="search-property-radio-button"
          >
            Sök på fastighetsbeteckning
          </RadioButton>
          <RadioButton
            value="ADDRESS"
            disabled={isKC() ? isSupportErrandLocked(supportErrand) : isErrandLocked(errand)}
            onClick={(e) => {
              const target = e.target as HTMLTextAreaElement;
              setSearchType(target.value);
              setSearchResult([]);
            }}
            name="sk-example"
            data-cy="search-address-radio-button"
          >
            Sök på adress
          </RadioButton>
        </fieldset>
        <Input type="text" {...register('propertyDesignation')} hidden />

        <SearchField.Suggestions autofilter={false}>
          <SearchField.SuggestionsInput
            disabled={isKC() ? isSupportErrandLocked(supportErrand) : isErrandLocked(errand)}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
            }}
            data-cy="facility-search"
            showSearchButton={false}
          />
          <ResultList result={searchResult} />
        </SearchField.Suggestions>
        {showSpinner ? (
          <div className="m-lg flex gap-16" data-cy="search-spinner">
            <Spinner size={2} />
            <span>Söker</span>
          </div>
        ) : null}

        <FacilityDetails
          label="Fastighetsinformation"
          closeHandler={() => {
            setSelectedEstate(undefined);
          }}
          show={selectedEstate !== undefined}
          estate={selectedEstate}
        />
      </FormControl>
      <div>
        <Table background={true} data-cy="estate-table">
          <Table.Header>
            <Table.HeaderColumn>Fastigheter</Table.HeaderColumn>
            <Table.HeaderColumn>
              <span className="sr-only">Visa fastighetsinformation</span>
            </Table.HeaderColumn>
            <Table.HeaderColumn>
              <span className="sr-only">Ta bort</span>
            </Table.HeaderColumn>
          </Table.Header>
          <Table.Body data-cy={`facility-table`}>
            {realEstates === undefined || realEstates.length === 0 ? (
              <Table.Row>
                <Table.Column>Inga fastigheter tillagda</Table.Column>
              </Table.Row>
            ) : (
              <>
                {realEstates.map((realEstate, index) => (
                  <Table.Row key={`realEstate-${index}`} data-cy={`realEstate-${index}`}>
                    <Table.Column className="font-bold">{realEstate.address?.propertyDesignation}</Table.Column>
                    <Table.Column>
                      <div className="w-96 flex justify-center">
                        <Spinner id={`realEstate-spinner-${index}`} size={2} className="hidden" />
                        <Link
                          disabled={isKC() ? isSupportErrandLocked(supportErrand) : isErrandLocked(errand)}
                          id={`realEstate-link-${index}`}
                          variant="tertiary"
                          href="#"
                          onClick={() => openEstateInfo(realEstate.address?.propertyDesignation, index)}
                        >
                          Visa fastighetsinformation
                        </Link>
                      </div>
                    </Table.Column>
                    <Table.Column>
                      <Button
                        variant="tertiary"
                        disabled={isKC() ? isSupportErrandLocked(supportErrand) : isErrandLocked(errand)}
                        onClick={() => {
                          setRealEstates((realEstates) => realEstates.filter((item) => item !== realEstate));
                          setValue(
                            'facilities',
                            realEstates.filter((item) => item !== realEstate),
                            { shouldDirty: true }
                          );
                          setInternalUnsaved(true);
                          setUnsaved(true);
                        }}
                        size="sm"
                        data-cy={`remove-estate-${index}`}
                      >
                        Ta bort
                      </Button>
                    </Table.Column>
                  </Table.Row>
                ))}
              </>
            )}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
};

export default Facilities;
