import { CasedataContractAttachmentUpload } from '@casedata/components/errand/tabs/contract/casedata-contract-attachment-upload';
import { Contract } from '@casedata/interfaces/contracts';
import { IErrand } from '@casedata/interfaces/errand';
import { KopeAvtalsData, KopeavtalStakeholder, KopeavtalsTemplate } from '@casedata/interfaces/kopeavtals-data';
import {
  LagenhetsArendeTemplate,
  LagenhetsArrendeData,
  LagenhetsArrendeStakeholder,
} from '@casedata/interfaces/lagenhetsarrende-data';
import { Role } from '@casedata/interfaces/role';
import { getErrand, isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { getStakeholdersByRelation } from '@casedata/services/casedata-stakeholder-service';
import {
  CasedataContractAttachment,
  ContractData,
  ContractType,
  casedataStakeholderToContractStakeholder,
  contractStakeholderToKopeavtalStakeholder,
  defaultKopeavtal,
  defaultLagenhetsarrende,
  deleteSignedContractAttachment,
  fetchSignedContractAttachment,
  getContractType,
  getErrandContract,
  renderContractPdf,
  saveContract,
  saveContractToErrand,
} from '@casedata/services/contract-service';
import { User } from '@common/interfaces/user';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Input,
  RadioButton,
  Spinner,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ContractNavigation } from './contract-navigation';
import { KopeAvtal } from './kopeavtal';
import { Lagenhetsarrende } from './lagenhetsarrende';

interface CasedataContractProps {
  update: () => void;
  setUnsaved: Dispatch<SetStateAction<boolean>>;
}

interface ContractStatus {
  status?: 'DRAFT' | 'ACTIVE';
}

// TODO
// Suggestion for improvement:
// In the contract components, some of the form fields (namely the checkboxes) are generated
// from a list of items and using a render function. The rest of the form fields (radiobuttons,
// text fields, etc) are manually created. It would be good to generate all form fields from lists
// from lists, kind of like is done for extraParameters on the Uppgifter tab. To do this, one
// has to decide on a common interface for all form fields, and then create a function that
// generates the form fields based on this interface.

export const CasedataContractTab: React.FC<CasedataContractProps> = (props) => {
  const {
    municipalityId,
    errand,
    setErrand,
    user,
  }: { municipalityId: string; errand: IErrand; setErrand: Dispatch<SetStateAction<IErrand>>; user: User } =
    useAppContext();
  const [fields, setFields] = useState<UppgiftField[]>([]);
  const [loading, setIsLoading] = useState<string>();
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [existingContract, setExistingContract] = useState<KopeAvtalsData | LagenhetsArrendeData>(undefined);
  const [sellers, setSellers] = useState<KopeavtalStakeholder[]>([]);
  const [buyers, setBuyers] = useState<KopeavtalStakeholder[]>([]);
  const [leaseholders, setLeaseholders] = useState<LagenhetsArrendeStakeholder[]>([]);
  const [grantors, setGrantors] = useState<LagenhetsArrendeStakeholder[]>([]);
  const toastMessage = useSnackbar();
  const removeConfirm = useConfirm();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  const updateStakeholdersFromErrand = () => {
    const _sellers: KopeavtalStakeholder[] = getStakeholdersByRelation(errand, Role.SELLER)
      .map(casedataStakeholderToContractStakeholder)
      .map(contractStakeholderToKopeavtalStakeholder);
    const _buyers: KopeavtalStakeholder[] = getStakeholdersByRelation(errand, Role.BUYER)
      .map(casedataStakeholderToContractStakeholder)
      .map(contractStakeholderToKopeavtalStakeholder);
    const _leaseholders: LagenhetsArrendeStakeholder[] = getStakeholdersByRelation(errand, Role.LEASEHOLDER)
      .map(casedataStakeholderToContractStakeholder)
      .map(contractStakeholderToKopeavtalStakeholder);
    const _grantors: LagenhetsArrendeStakeholder[] = getStakeholdersByRelation(errand, Role.PROPERTY_OWNER)
      .map(casedataStakeholderToContractStakeholder)
      .map(contractStakeholderToKopeavtalStakeholder);
    setSellers(_sellers || []);
    setBuyers(_buyers || []);
    setLeaseholders(_leaseholders || []);
    setGrantors(_grantors || []);
  };

  const getStakeholdersFromContract = (contract: KopeAvtalsData | LagenhetsArrendeData) => {
    let _sellers: KopeavtalStakeholder[] = [];
    let _buyers: KopeavtalStakeholder[] = [];
    let _leaseholders: LagenhetsArrendeStakeholder[] = [];
    let _grantors: LagenhetsArrendeStakeholder[] = [];
    if (contract.contractType === ContractType.PURCHASE_AGREEMENT) {
      _sellers = (contract as KopeAvtalsData).sellers;
      _buyers = (contract as KopeAvtalsData).buyers;
    } else if (contract.contractType === ContractType.LAND_LEASE) {
      _leaseholders = (contract as LagenhetsArrendeData).leaseholders || [];
      _grantors = (contract as LagenhetsArrendeData).grantors || [];
    }
    setSellers(_sellers);
    setBuyers(_buyers);
    setLeaseholders(_leaseholders);
    setGrantors(_grantors);
  };

  useEffect(() => {
    if (existingContract?.contractId) {
      getStakeholdersFromContract(existingContract);
    } else {
      updateStakeholdersFromErrand();
    }
  }, [errand, existingContract]);

  const contractForm = useForm<ContractData & ContractStatus & KopeavtalsTemplate & LagenhetsArendeTemplate>({
    defaultValues:
      existingContract?.contractType === ContractType.PURCHASE_AGREEMENT
        ? defaultKopeavtal
        : existingContract?.contractType === ContractType.LAND_LEASE
        ? defaultLagenhetsarrende
        : { ...defaultKopeavtal, ...defaultLagenhetsarrende, contractType: ContractType.PURCHASE_AGREEMENT },
    mode: 'onChange',
  });

  const changeBadgeColor = (inId) => {
    let element = document.getElementById(inId);
    if (element !== null) {
      if (element.style.backgroundColor.includes('gray')) {
        element.style.backgroundColor = 'black';
      } else {
        element.style.backgroundColor = 'lightgray';
      }
    }
  };

  const onSave = async (data: ContractData) => {
    setIsLoading('Sparar avtal...');
    return saveContract(data)
      .then(async (res: Contract) => {
        await saveContractToErrand(municipalityId, res.contractId, errand);
        return res;
      })
      .then((res) => {
        setIsLoading(undefined);
        props.setUnsaved(false);
        getErrand(municipalityId, errand.id.toString())
          .then((res) => {
            setErrand(res.errand);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Avtalet sparades',
              status: 'success',
            });
            setIsLoading(undefined);
          })
          .catch((e) => {
            setIsLoading(undefined);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Något gick fel när avtalet skulle sparas',
              status: 'error',
            });
          });
      });
  };

  const onRenderContract = async (contractData: ContractData) => {
    setIsPreviewLoading(true);

    const saved =
      allowed && !isErrandLocked(errand) ? await saveContract(contractData) : getContractType(existingContract);
    if (allowed && !isErrandLocked(errand)) {
      await saveContractToErrand(municipalityId, saved.contractId, errand);
    }

    const pdf = await renderContractPdf(errand, saved, existingContract?.status === 'DRAFT' ? true : false);

    const createAndClickLink = (d: { pdfBase64: string; error?: string }) => {
      if (typeof d.error === 'undefined' && typeof d.pdfBase64 !== 'undefined') {
        const byteCharacters = atob(d.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsPreviewLoading(false);
      } else {
        setIsPreviewLoading(false);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när pdf:en genererades',
          status: 'error',
        });
        console.error('Error when fetching preview');
      }
    };

    createAndClickLink(pdf);
  };

  useEffect(() => {
    if (errand) {
      getErrandContract(errand)
        .then((res) => {
          if (res) {
            setExistingContract(res);
            contractForm.setValue('contractType', res.contractType);
            contractForm.reset(res);
          }
        })
        .catch(console.error)
        .finally(() => {
          contractForm.setValue('externalReferenceId', errand.id.toString());
        });
    }
  }, [errand]);

  const contractType = contractForm.watch('contractType') as ContractType;

  const downloadDocument = (a: CasedataContractAttachment) => {
    const uri = `data:${a.metaData.mimeType};base64,${a.attachmentData.content}`;
    const link = document.createElement('a');
    const filename = a.metaData.filename;
    link.href = uri;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
  };

  const { status } = contractForm.watch();

  return (
    <FormProvider {...contractForm}>
      <form
        onChange={() => {
          props.setUnsaved(true);
        }}
      >
        <div className="w-full py-24 px-32">
          <div className="flex">
            <div className="w-4/5">
              <div className="flex justify-between items-end mb-md">
                <p>
                  <strong>{existingContract ? `Avtal ${existingContract.contractId}` : 'Nytt avtal'}</strong>
                </p>
                <div className="flex">
                  <Button
                    data-cy="preview-contract"
                    variant="primary"
                    color="vattjom"
                    inverted={!isPreviewLoading}
                    loading={isPreviewLoading}
                    loadingText="Genererar pdf..."
                    disabled={
                      isPreviewLoading ||
                      (isErrandLocked(errand) && !existingContract) ||
                      (!allowed && !existingContract)
                    }
                    size="sm"
                    rightIcon={<LucideIcon name="external-link" />}
                    onClick={() => {
                      onRenderContract(contractForm.getValues());
                    }}
                  >
                    Förhandsgranska avtal (pdf)
                  </Button>
                </div>
              </div>

              {existingContract?.attachmentMetaData?.[0] ? (
                <div className="flex gap-12 justify-between">
                  <div className="flex gap-12">
                    <div>
                      <p>
                        <strong> {existingContract?.attachmentMetaData[0].filename}</strong>
                      </p>
                      {existingContract?.attachmentMetaData[0].note && (
                        <p>Anteckning: {existingContract?.attachmentMetaData[0].note}</p>
                      )}
                    </div>
                  </div>
                  <div className="justify-self-end">
                    <Button
                      data-cy="add-attachment-button"
                      disabled={isErrandLocked(errand)}
                      color="vattjom"
                      rightIcon={<LucideIcon name="external-link" />}
                      inverted={allowed}
                      size="sm"
                      className="mr-8"
                      onClick={() => {
                        const attachment = fetchSignedContractAttachment(
                          municipalityId,
                          existingContract?.contractId,
                          existingContract?.attachmentMetaData[0].id
                        );
                        attachment.then((res) => downloadDocument(res.data));
                      }}
                    >
                      Förhandsgranska signerat avtal (pdf)
                    </Button>
                    <Button
                      data-cy="add-attachment-button"
                      disabled={isErrandLocked(errand) || !allowed}
                      color="error"
                      rightIcon={<LucideIcon name="trash" />}
                      inverted={allowed}
                      size="sm"
                      onClick={() => {
                        removeConfirm
                          .showConfirmation(
                            'Ta bort signerat avtal?',
                            'Vill du ta bort denna bilaga?',
                            'Ja',
                            'Nej',
                            'info',
                            'info'
                          )
                          .then((confirmed) => {
                            if (confirmed) {
                              deleteSignedContractAttachment(
                                municipalityId,
                                existingContract?.contractId,
                                existingContract?.attachmentMetaData[0].id
                              )
                                .then(() => {
                                  getErrand(municipalityId, errand.id.toString()).then((res) => {
                                    setErrand(res.errand);
                                  });
                                })
                                .then(() => {
                                  toastMessage({
                                    position: 'bottom',
                                    closeable: false,
                                    message: 'Bilagan togs bort',
                                    status: 'success',
                                  });
                                })
                                .catch(() => {
                                  toastMessage({
                                    position: 'bottom',
                                    closeable: false,
                                    message: 'Något gick fel när bilagan togs bort',
                                    status: 'error',
                                  });
                                });
                            }
                          });
                      }}
                    ></Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-end mb-md">
                  <p>
                    <strong>Signerat avtal {existingContract?.contractId}</strong>
                  </p>
                  <div className="flex">
                    <CasedataContractAttachmentUpload contractId={existingContract?.contractId} />
                  </div>
                </div>
              )}

              <FormControl id="contractType" className="my-md">
                <FormLabel>Typ av avtal</FormLabel>
                <RadioButton.Group className="space-x-4" inline>
                  <RadioButton
                    data-cy="purchaseType"
                    {...contractForm.register('contractType')}
                    value={ContractType.PURCHASE_AGREEMENT}
                    name="contractType"
                    defaultChecked={contractForm.getValues().contractType === ContractType.PURCHASE_AGREEMENT}
                    onChange={() => {
                      contractForm.setValue('contractType', ContractType.PURCHASE_AGREEMENT);
                    }}
                  >
                    Köpeavtal
                  </RadioButton>
                  <RadioButton
                    data-cy="apartmentType"
                    {...contractForm.register('contractType')}
                    value={ContractType.LAND_LEASE}
                    name="contractType"
                    defaultChecked={contractForm.getValues().contractType === ContractType.LAND_LEASE}
                    onChange={() => {
                      contractForm.setValue('contractType', ContractType.LAND_LEASE);
                    }}
                  >
                    Lägenhetsarrende
                  </RadioButton>
                </RadioButton.Group>
              </FormControl>

              <FormControl id="isDraft" className="my-md">
                <FormLabel>
                  Status för avtal {loading !== undefined && existingContract === undefined && <Spinner size={4} />}
                </FormLabel>
                {loading === undefined && (
                  <Checkbox
                    disabled={isErrandLocked(errand) || !allowed}
                    checked={contractForm.getValues().status === 'DRAFT' ? true : false}
                    value={contractForm.getValues().status}
                    onChange={() => {
                      contractForm.setValue(
                        'status',
                        contractForm.getValues()?.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'
                      );
                      contractForm.trigger('status');
                      onSave(contractForm.getValues());
                    }}
                    indeterminate={false}
                  >
                    Markera som utkast
                  </Checkbox>
                )}
              </FormControl>
              <Input type="hidden" readOnly name="id" {...contractForm.register('contractId')} />
              {contractType === ContractType.PURCHASE_AGREEMENT ? (
                <KopeAvtal
                  changeBadgeColor={changeBadgeColor}
                  onSave={onSave}
                  existingContract={(existingContract as KopeAvtalsData) || defaultKopeavtal}
                  sellers={sellers}
                  buyers={buyers}
                  updateStakeholders={updateStakeholdersFromErrand}
                />
              ) : contractType === ContractType.LAND_LEASE ? (
                <Lagenhetsarrende
                  changeBadgeColor={changeBadgeColor}
                  onSave={onSave}
                  existingContract={(existingContract as LagenhetsArrendeData) || defaultLagenhetsarrende}
                  leaseholders={leaseholders}
                  grantors={grantors}
                  updateStakeholders={updateStakeholdersFromErrand}
                />
              ) : null}
            </div>

            <ContractNavigation contractType={contractType} />
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
