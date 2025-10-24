import { isErrandLocked } from '@casedata/services/casedata-errand-service';
import { EstateInformation, EstateInfoSearch } from '@common/interfaces/estate-details';
import { FacilityDTO } from '@common/interfaces/facilities';
import {
  getFacilityByAddress,
  getFacilityByDesignation,
  getFacilityInfo,
  makeFacility,
  removeMunicipalityName,
} from '@common/services/facilities-service';
import { appConfig } from '@config/appconfig';
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

export const Facilities: React.FC<{
  setValue: UseFormSetValue<any>;
  facilities: FacilityDTO[];
  onSave?: (estates: FacilityDTO[]) => Promise<void>;
}> = (props) => {
  const { setValue } = props;
  const toastMessage = useSnackbar();

  const { supportErrand, errand, setUnsavedFacility } = useAppContext();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<string>('PROPERTY');
  const [searchResult, setSearchResult] = useState<EstateInfoSearch[]>([]);
  const [realEstates, setRealEstates] = useState<FacilityDTO[]>([]);
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const { register } = useForm();

  const [selectedEstate, setSelectedEstate] = useState<EstateInformation>();
  const searchValue = '';

  const disabled = appConfig.isSupportManagement ? isSupportErrandLocked(supportErrand) : isErrandLocked(errand);

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

  return (
    <div>
      <FormControl className="w-full lg:w-[85%] my-lg">
        <FormLabel>Sök och lägg till fastigheter</FormLabel>

        <fieldset className="flex flex-row gap-12" data-cy="radio-button-group">
          <RadioButton
            disabled={disabled}
            value="PROPERTY"
            checked={searchType === 'PROPERTY'}
            onChange={(e) => {
              setSearchType(e.target.value);
              setSearchResult([]);
            }}
            data-cy="search-property-radio-button"
          >
            Sök på fastighetsbeteckning
          </RadioButton>
          <RadioButton
            value="ADDRESS"
            disabled={disabled}
            checked={searchType === 'ADDRESS'}
            onChange={(e) => {
              setSearchType(e.target.value);
              setSearchResult([]);
            }}
            data-cy="search-address-radio-button"
          >
            Sök på adress
          </RadioButton>
        </fieldset>
        <Input type="text" {...register('propertyDesignation')} hidden />

        <SearchField.Suggestions autofilter={true}>
          <SearchField.SuggestionsInput
            disabled={disabled}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              onSearchHandler(event.target.value);
            }}
            data-cy="facility-search"
            showSearchButton={false}
          />
          <>
            {/* TODO add spinner to search  */}
            {searchResult.length >= 0 && (
              <SearchField.SuggestionsList data-cy="suggestion-list" className="w-full">
                {searchResult.map((estate, index) => (
                  <SearchField.SuggestionsOption
                    key={`searchHit-${index}`}
                    value={searchValue}
                    onChange={(event) => {
                      event.stopPropagation();
                      setRealEstates([...realEstates, makeFacility(estate)]);
                      setValue('facilities', [...realEstates, makeFacility(estate)], { shouldDirty: true });
                      setUnsavedFacility(true);
                    }}
                    data-cy={`searchHit-${index}`}
                  >
                    {searchType === 'ADDRESS' ? `${estate.address}` : removeMunicipalityName(estate.designation)}
                  </SearchField.SuggestionsOption>
                ))}
              </SearchField.SuggestionsList>
            )}
          </>
        </SearchField.Suggestions>

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
                          disabled={disabled}
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
                        disabled={disabled}
                        onClick={() => {
                          setRealEstates((realEstates) => realEstates.filter((item) => item !== realEstate));
                          setValue(
                            'facilities',
                            realEstates.filter((item) => item !== realEstate),
                            { shouldDirty: true }
                          );
                          setUnsavedFacility(true);
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
