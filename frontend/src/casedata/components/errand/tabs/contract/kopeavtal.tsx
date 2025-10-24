import { KopeAvtalsData, KopeavtalStakeholder, KopeavtalsTemplate } from '@casedata/interfaces/kopeavtals-data';
import { MEXRelation } from '@casedata/interfaces/role';
import { validateAction } from '@casedata/services/casedata-errand-service';
import { getErrandPropertyDesignations } from '@casedata/services/casedata-facilities-service';
import { getSSNFromPersonId, getStakeholderRelation } from '@casedata/services/casedata-stakeholder-service';
import renderContractTermCheckboxList from '@casedata/services/contract-render-service';
import { getContractStakeholderName, saveDoneMarksOnErrande } from '@casedata/services/contract-service';
import sanitized from '@common/services/sanitizer-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  Checkbox,
  Disclosure,
  FormControl,
  FormLabel,
  Icon,
  Input,
  Modal,
  RadioButton,
  Table,
} from '@sk-web-gui/react';
import { ChangeEvent, useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { ContractTextEditorWrapper } from './contract-text-editor-wrapper';

export const KopeAvtal: React.FC<{
  changeBadgeColor;
  onSave;
  existingContract: KopeAvtalsData;
  sellers: KopeavtalStakeholder[];
  buyers: KopeavtalStakeholder[];
  updateStakeholders: () => void;
}> = ({ changeBadgeColor, onSave, existingContract, sellers, buyers, updateStakeholders }) => {
  const { errand, user } = useAppContext();
  const { register, watch, setValue, control, getValues, trigger } = useFormContext<
    KopeavtalsTemplate & KopeAvtalsData
  >();

  const [showOverlatelse, setShowOverlatelse] = useState(false);
  const [editOverlatelse, setEditOverlatelse] = useState(false);

  const [showKopeskilling, setShowKopeskilling] = useState(false);
  const [editKopeskilling, setEditKopeskilling] = useState(false);

  const [showTilltrade, setShowTilltrade] = useState(false);
  const [editTilltrade, setEditTilltrade] = useState(false);

  const [showMarkfororeningar, setShowMarkfororeningar] = useState(false);
  const [editMarkfororeningar, setEditMarkfororeningar] = useState(false);

  const [showSkog, setShowSkog] = useState(false);
  const [editSkog, setEditSkog] = useState(false);

  const [showForpliktelser, setShowForpliktelser] = useState(false);
  const [editForpliktelser, setEditForpliktelser] = useState(false);

  const [showUtgifter, setShowUtgifter] = useState(false);
  const [editUtgifter, setEditUtgifter] = useState(false);

  const [showFastighetsbildning, setShowFastighetsbildning] = useState(false);
  const [editFastighetsbildning, setEditFastighetsbildning] = useState(false);

  const [showOther, setShowOther] = useState(false);
  const [editOther, setEditOther] = useState(false);

  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState<string>('');

  const [textIsDirty, setTextIsDirty] = useState(false);
  const [loading, setIsLoading] = useState<boolean>();
  const [allowed, setAllowed] = useState(false);
  const [signatures, setSignatures] = useState<String[]>([]);

  const [doneMark, setDoneMark] = useState<string[]>([]);
  const [unsaved, setUnsaved] = useState<boolean>(false);

  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  useEffect(() => {
    buyers.forEach(async (b: KopeavtalStakeholder, idx) => {
      const ssn = await getSSNFromPersonId(b.partyId);
      b.personalNumber = ssn;
      setValue('buyers', buyers);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyers]);

  const { fields: buyersFields, replace: replaceBuyers } = useFieldArray({
    control,
    keyName: 'buyerId',
    name: 'buyers',
  });

  useEffect(() => {
    sellers.forEach(async (s: KopeavtalStakeholder, idx) => {
      const ssn = await getSSNFromPersonId(s.partyId);
      s.personalNumber = ssn;
      setValue('sellers', sellers);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellers]);

  const { fields: sellersFields, replace: replaceSellers } = useFieldArray({
    control,
    keyName: 'sellerId',
    name: 'sellers',
  });

  useEffect(() => {
    setValue('propertyDesignations', getErrandPropertyDesignations(errand));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  useEffect(() => {
    replaceSellers(sellers);
    replaceBuyers(buyers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyers, sellers]);

  useEffect(() => {
    if (existingContract) {
      setValue('overlatelseforklaring', existingContract.overlatelseforklaring);
      setValue('kopeskilling', existingContract.kopeskilling);
      setValue('tilltrade', existingContract.tilltrade);
      setValue('markfororeningar', existingContract.markfororeningar);
      setValue('skog', existingContract.skog);
      setValue('forpliktelser', existingContract.forpliktelser);
      setValue('utgifter', existingContract.utgifter);
      setValue('fastighetsbildning', existingContract.fastighetsbildning);
      setValue('other', existingContract.other);
      setValue('signature', existingContract.signature);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingContract]);

  const {
    overlatelseforklaring,
    kopeskilling,
    tilltrade,
    markfororeningar,
    skog,
    forpliktelser,
    utgifter,
    fastighetsbildning,
    other,
  } = watch();

  useEffect(() => {
    setSignature(watch().signature);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch().signature]);

  useEffect(() => {
    const doneMarkedElements =
      errand.extraParameters.find((parameters) => parameters.key === 'kopeavtal')?.values || [];
    setDoneMark(doneMarkedElements);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (unsaved) {
      saveDoneMarksOnErrande(errand, 'kopeavtal', doneMark);
      setUnsaved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneMark]);

  const markSectionAsDone = (inSection: string) => {
    if (doneMark.findIndex((temp) => temp === inSection) === -1) {
      setDoneMark((prevArray) => [...prevArray, inSection]);
    } else {
      setDoneMark((prevArray) => prevArray.filter((item) => item !== inSection));
    }
    setUnsaved(true);
  };

  const renderSignatures = (relationType) => {
    return signatures
      .map((signature) => {
        const stakeholder = errand.stakeholders.find((temp) => temp.id === signature);
        const relation = getStakeholderRelation(stakeholder) ? MEXRelation[getStakeholderRelation(stakeholder)] : '';
        if (relation === relationType) {
          return `<div style="display:inline-block;margin-right:20px;">
              <p><b>${relation}</b></p><br>
              <p>Ort och datum:</p><br>
              <p>.........................................................</p>
              <p>${
                stakeholder.firstName
                  ? `${stakeholder.firstName} ${stakeholder.lastName}`
                  : `${stakeholder.organizationName}`
              }</p><br><br>
              </div>`;
        }
        return '';
      })
      .join('');
  };

  const renderEmptySignatures = (relation, rows) => {
    let emptyRows = '';
    for (let i = 0; i < rows; i++) {
      emptyRows += `<div style="display:inline-block;margin-right:20px;">
              <p><b>${relation}</b></p><br>
              <p>Ort och datum:</p><br>
              <p>.........................................................</p>
              <br style="margin-top:2.5px;"></p><br><br>
              </div>`;
    }
    return emptyRows;
  };

  const saveButton = (inSection) => {
    return (
      <div className="my-md">
        {loading ? (
          <Button disabled={true}>Sparar</Button>
        ) : (
          <div>
            <Button
              disabled={!allowed}
              onClick={() => {
                setIsLoading(true);
                onSave({ ...getValues(), signature }).then(() => {
                  setIsLoading(undefined);
                  setTextIsDirty(false);
                });
              }}
            >
              Spara
            </Button>
            <div className="mt-24">
              <Checkbox
                onClick={() => {
                  markSectionAsDone(inSection);
                }}
                checked={doneMark.findIndex((temp) => temp === inSection) !== -1 ? true : false}
              >
                Markera avsnittet som komplett
              </Checkbox>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="users" />} />}
        header={<h2 className="text-h4-sm md:text-h4-md">Parter</h2>}
        data-cy="parties-disclosure"
        labelColor={sellersFields?.length > 0 && buyersFields.length > 0 ? 'success' : `warning`}
        initalOpen={true}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-parties`);
        }}
      >
        <div className="flex flex-col gap-16">
          <Table dense background data-cy="seller-table">
            <Table.Header>
              <Table.HeaderColumn>Säljare</Table.HeaderColumn>
              <Table.HeaderColumn>Adress</Table.HeaderColumn>
              <Table.HeaderColumn>Ägarandel</Table.HeaderColumn>
            </Table.Header>
            <Table.Body>
              {sellersFields.length > 0 ? (
                sellersFields.map((s, idx) => (
                  <Table.Row key={`seller-${idx}`}>
                    <Table.Column className="flex flex-col items-start justify-center !gap-0">
                      <div>
                        <strong>{getContractStakeholderName(s)}</strong>
                      </div>
                      <div>
                        {s.type === 'COMPANY' || s.type === 'ASSOCIATION' ? s.organizationNumber : s.personalNumber}
                      </div>
                    </Table.Column>
                    <Table.Column className="flex flex-col items-start justify-center !gap-0">
                      {s.street && s.zip && s.city ? (
                        <>
                          <div>
                            <strong>{s.street}</strong>
                          </div>
                          <div>{s.careof}</div>
                          <div>
                            {s.zip} {s.city}
                          </div>
                        </>
                      ) : (
                        <strong>(saknas)</strong>
                      )}
                    </Table.Column>
                    <Table.Column>
                      <Input
                        size="sm"
                        key={`partOwnership-${s.sellerId}`}
                        {...register(`sellers.${idx}.partOwnership`)}
                      />
                    </Table.Column>
                  </Table.Row>
                ))
              ) : (
                <Table.Row>
                  <Table.Column className="flex flex-col items-start justify-center !gap-0">
                    <div>
                      <strong>(saknas)</strong>
                    </div>
                  </Table.Column>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
          <Table dense background data-cy="buyer-table">
            <Table.Header>
              <Table.HeaderColumn>Köpare</Table.HeaderColumn>
              <Table.HeaderColumn>Adress</Table.HeaderColumn>
              <Table.HeaderColumn>Ägarandel</Table.HeaderColumn>
            </Table.Header>
            <Table.Body>
              {buyersFields.length > 0 ? (
                buyersFields.map((b, idx) => (
                  <Table.Row key={`buyer-${idx}`}>
                    <Table.Column className="flex flex-col items-start justify-center !gap-0">
                      <div>
                        <strong>{getContractStakeholderName(b)}</strong>
                      </div>
                      <div>
                        {b.type === 'COMPANY' || b.type === 'ASSOCIATION' ? b.organizationNumber : b.personalNumber}
                      </div>
                    </Table.Column>
                    <Table.Column className="flex flex-col items-start justify-center !gap-0">
                      <div>
                        <strong>{b.street}</strong>
                      </div>
                      <div>{b.careof}</div>
                      <div>
                        {b.zip} {b.city}
                      </div>
                    </Table.Column>
                    <Table.Column>
                      <Input size="sm" key={b.buyerId} {...register(`buyers.${idx}.partOwnership`)} />
                    </Table.Column>
                  </Table.Row>
                ))
              ) : (
                <Table.Row>
                  <Table.Column className="flex flex-col items-start justify-center !gap-0">
                    <div>
                      <strong>(saknas)</strong>
                    </div>
                  </Table.Column>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
          <div>
            <Button
              size="sm"
              variant="tertiary"
              onClick={() => {
                updateStakeholders();
                setTimeout(async () => {
                  await onSave(getValues());
                }, 0);
              }}
            >
              Läs in från ärende
            </Button>
          </div>
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="clipboard-list" />} />}
        data-cy="transfer-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Överlåtelseförklaring</h2>}
        label={doneMark.findIndex((temp) => temp === 'overlatelseforklaring') !== -1 ? 'Komplett' : ''}
        initalOpen={watch().overlatelseforklaring?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-overlatelse`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowOverlatelse(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-transfer"
              onChange={() => {
                setEditOverlatelse(!editOverlatelse);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showOverlatelse}
            onClose={() => setShowOverlatelse(false)}
            className="w-[56rem]"
            label={'Villkor för överlåtelseförklaring'}
          >
            <Modal.Content>
              <Table data-cy="table-propertyDesignations-top" dense background>
                <Table.Header>
                  <Table.HeaderColumn>Fastigheter som säljaren överlåter till köparen</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  <Table.Row>
                    <Table.Column className="max-w-max">
                      <strong>
                        {getErrandPropertyDesignations(errand).length > 0
                          ? getErrandPropertyDesignations(errand).join(', ')
                          : '(saknas)'}
                      </strong>
                    </Table.Column>
                  </Table.Row>
                </Table.Body>
              </Table>
              <FormControl id="includeBuildingsOnProperties" className="my-md">
                <FormLabel>Ska byggnader belägna på ovan fastigheter ingå i överlåtelsen?</FormLabel>
                <RadioButton.Group className="space-x-4" inline>
                  <RadioButton
                    data-cy="yes-includeBuilding"
                    {...register('overlatelseforklaringTerms.includeBuildingsOnProperties')}
                    value={'true'}
                    onClick={() => {
                      setValue('overlatelseforklaringTerms.includeBuildingsOnProperties', 'true');
                    }}
                  >
                    Ja
                  </RadioButton>
                  <RadioButton
                    data-cy="no-includeBuilding"
                    {...register('overlatelseforklaringTerms.includeBuildingsOnProperties')}
                    value={'false'}
                    onClick={() => {
                      setValue('overlatelseforklaringTerms.includeBuildingsOnProperties', 'false');
                    }}
                  >
                    Nej
                  </RadioButton>
                </RadioButton.Group>
              </FormControl>
              <FormControl id="mapAttachments" className="w-full">
                <FormLabel>Ange kartbilaga/or där områdets läge är skrafferat och märkt</FormLabel>
                <Input {...register('overlatelseforklaringTerms.mapAttachments')} />
              </FormControl>
              <FormControl id="mapAttachmentReference" className="w-full">
                <FormLabel>Ange referenser till hur området skrafferat och märkt i bilagan/or</FormLabel>
                <Input {...register('overlatelseforklaringTerms.mapAttachmentReference')} />
              </FormControl>
              <FormControl id="includeBuildingsInArea" className="my-md">
                <FormLabel>Ska byggnader belägna på området ingå i överlåtelsen?</FormLabel>
                <RadioButton.Group className="space-x-4" inline>
                  <RadioButton
                    data-cy="yes-includeBuildingsInArea"
                    name="includeBuildingsInArea"
                    {...register('overlatelseforklaringTerms.includeBuildingsInArea')}
                    value="true"
                    onClick={() => setValue('overlatelseforklaringTerms.includeBuildingsInArea', 'true')}
                  >
                    Ja
                  </RadioButton>
                  <RadioButton
                    data-cy="no-includeBuildingsInArea"
                    name="includeBuildingsInArea"
                    {...register('overlatelseforklaringTerms.includeBuildingsInArea')}
                    value="false"
                    onClick={() => setValue('overlatelseforklaringTerms.includeBuildingsInArea', 'false')}
                  >
                    Nej
                  </RadioButton>
                </RadioButton.Group>
              </FormControl>
              <Button
                size="md"
                onClick={() => {
                  const content = `Fastigheter som säljaren överlåter till köparen: <strong>${
                    getErrandPropertyDesignations(errand).length > 0
                      ? getErrandPropertyDesignations(errand).join(', ')
                      : '(saknas)'
                  }</strong>

Ska byggnader belägna på ovan fastigheter ingå i överlåtelsen? ${
                    getValues().overlatelseforklaringTerms.includeBuildingsOnProperties === 'true' ? 'Ja' : 'Nej'
                  }

Kartbilaga/or där områdets läge är skrafferat och märkt: ${
                    getValues().overlatelseforklaringTerms.mapAttachments || '(saknas)'
                  }

Referenser till hur området skrafferat och märkt i bilagan/or: ${
                    getValues().overlatelseforklaringTerms.mapAttachmentReference || '(saknas)'
                  }

Ska byggnader belägna på området ingå i överlåtelsen? ${
                    getValues().overlatelseforklaringTerms.includeBuildingsInArea === 'true' ? 'Ja' : 'Nej'
                  }`;
                  setValue('overlatelseforklaring', content);
                  setShowOverlatelse(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="overlatelse" className="w-full">
            {/* <FormLabel>Kompletterande information om villkor (fritext)</FormLabel> */}
            <Input data-cy="utredning-description-input" type="hidden" {...register('overlatelseforklaring')} />
            <div className="h-[42rem] -mb-48" data-cy="transfer-richtext-wrapper">
              <ContractTextEditorWrapper
                val={overlatelseforklaring}
                label="overlatelseforklaring"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                readOnly={!editOverlatelse}
              />
            </div>
          </FormControl>
          {saveButton('overlatelseforklaring')}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="wallet" />} />}
        data-cy="purchase-price-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Köpeskilling och betalning</h2>}
        label={doneMark.findIndex((temp) => temp === 'kopeskilling') !== -1 ? 'Komplett' : ''}
        initalOpen={watch().kopeskilling?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-payment`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowKopeskilling(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-purchase-price"
              onChange={() => {
                setEditKopeskilling(!editKopeskilling);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showKopeskilling}
            onClose={() => setShowKopeskilling(false)}
            className="w-[56rem]"
            label={'Villkor för köpeskilling och betalning'}
          >
            <Modal.Content>
              <FormControl id="kopeskillingTerms.amountNumber" className="w-full">
                <FormLabel>Ange belopp för köpeskillingen i siffror</FormLabel>
                <Input data-cy="kopeskilling-amountNumber" {...register('kopeskillingTerms.amountNumber')} />
                <small>Exempel: 300 000 kr</small>
              </FormControl>
              <FormControl id="kopeskillingTerms.amountText" className="w-full">
                <FormLabel>Belopp för köpeskillingen i text</FormLabel>
                <Input data-cy="kopeskilling-amountText" {...register('kopeskillingTerms.amountText')} />
                {/* <small>Exempel: TREHUNDRATUSEN KRONOR</small> */}
              </FormControl>
              <Table dense background data-cy="table-kopeskillingTerms">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för köpeskilling</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'kopeskillingTerms.paymentCondition1',
                      value: 'onDate',
                      header: 'Betalning på angivet datum',
                      conditionText: '',
                    },
                    {
                      key: 'kopeskillingTerms.paymentCondition2',
                      value: 'thirtyDays',
                      header: 'Betalning inom 30 dagar efter beslut',
                      conditionText:
                        'Köpeskillingen ska erläggas senast 30 dagar efter det att kommunens beslut om detta förvärv vunnit laga kraft. På betalningsdagen upprättar säljaren köpebrev som växlas mellan parterna',
                    },
                    {
                      key: 'kopeskillingTerms.paymentCondition3',
                      value: 'fourWeeks',
                      header: 'Betalning inom fyra veckor efter undertecknat avtal',
                      conditionText:
                        'Köpeskillingen ska erläggas senast fyra veckor efter det att parterna undertecknat detta avtal.',
                    },
                    {
                      key: 'kopeskillingTerms.paymentCondition4',
                      value: 'other',
                      header: 'Köpebrev ska upprättas med kvittens på köpeskillingen',
                      conditionText: '',
                    },
                  ].map(({ key, value, header, conditionText }) => (
                    <Table.Row key={key}>
                      <Table.Column>
                        <FormControl className="my-md">
                          <RadioButton
                            name={key}
                            value={value}
                            checked={getValues(key as any) === value}
                            onClick={() => {
                              setValue(key as any, value);
                              setValue('kopeskillingTerms.condition', {
                                header,
                                conditionText,
                              });
                            }}
                          >
                            <strong>{header}</strong>
                          </RadioButton>
                          <span>{conditionText}</span>
                        </FormControl>
                      </Table.Column>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const content = `Belopp för köpeskillingen i text: <strong>${
                    getValues().kopeskillingTerms.amountText || '(saknas)'
                  }</strong>

Belopp för köpeskillingen i siffror: <strong>${getValues().kopeskillingTerms.amountNumber || '(saknas)'}</strong>

Villkor för köpeskilling: <strong>${getValues().kopeskillingTerms.condition?.header || '(saknas)'}</strong>
<br /><br /><p>${getValues().kopeskillingTerms.condition?.conditionText || '(saknas)'}</p>
                    
                    `;

                  setValue('kopeskilling', content);
                  setShowKopeskilling(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="kopeskilling" className="w-full">
            <Input type="hidden" {...register('kopeskilling')} />
            <div className="h-[42rem] -mb-48" data-cy="purchase-price-richtext-wrapper">
              <ContractTextEditorWrapper
                val={kopeskilling}
                label="kopeskilling"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                readOnly={!editKopeskilling}
              />
            </div>
          </FormControl>
          {saveButton('kopeskilling')}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="calendar" />} />}
        data-cy="access-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Tillträde</h2>}
        label={doneMark.findIndex((temp) => temp === 'tilltrade') !== -1 ? 'Komplett' : ''}
        initalOpen={watch().tilltrade?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-access`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowTilltrade(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-access"
              onChange={() => {
                setEditTilltrade(!editTilltrade);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showTilltrade}
            onClose={() => setShowTilltrade(false)}
            className="w-[56rem]"
            label={'Villkor för tillträde'}
          >
            <Modal.Content>
              <FormControl id="timeOfAccess">
                <RadioButton.Group data-cy="timeOfAccess-radioGroup" onChange={(e) => {}}>
                  <RadioButton
                    checked={getValues().tilltradeTerms?.timeOfAccess === 'onDate'}
                    name="timeOfAccess"
                    value="onDate"
                    onClick={() => {
                      setValue('tilltradeTerms.timeOfAccess', 'onDate');
                    }}
                  >
                    Tillträde sker på ett specifikt datum
                  </RadioButton>
                  <RadioButton
                    checked={getValues().tilltradeTerms?.timeOfAccess === 'whenPaid'}
                    name="timeOfAccess"
                    value="whenPaid"
                    onClick={() => {
                      setValue('tilltradeTerms.timeOfAccess', 'whenPaid');
                      setValue('tilltradeTerms.accessDate', '');
                    }}
                  >
                    Tillträde sker när köpeskillingen erlagts
                  </RadioButton>
                </RadioButton.Group>
              </FormControl>
              <FormControl
                id="accessDate"
                className="w-full"
                disabled={getValues().tilltradeTerms?.timeOfAccess === 'whenPaid'}
              >
                <FormLabel>Ange datum för tillträde</FormLabel>
                <Input
                  type="date"
                  value={getValues().tilltradeTerms?.accessDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setValue('tilltradeTerms.accessDate', e.target.value);
                  }}
                />
              </FormControl>
              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const content = `<strong>Tillträde</strong>
                  <p>Tillträde sker ${
                    getValues().tilltradeTerms?.timeOfAccess === 'onDate'
                      ? 'på datum: ' + getValues().tilltradeTerms?.accessDate
                      : 'när köpeskillingen erlagts'
                  }</p>`;
                  setValue('tilltrade', content);
                  setShowTilltrade(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="tilltrade" className="w-full">
            <Input type="hidden" {...register('tilltrade')} />
            <div className="h-[42rem] -mb-48" data-cy="access-richtext-wrapper">
              <ContractTextEditorWrapper
                val={tilltrade}
                label="tilltrade"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                readOnly={!editTilltrade}
              />
            </div>
          </FormControl>
          {saveButton('tilltrade')}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="mountain-snow" />} />}
        data-cy="soil-pollution-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Markföroreningar</h2>}
        label={doneMark.findIndex((temp) => temp === 'markfororeningar') !== -1 ? 'Komplett' : ''}
        initalOpen={watch().markfororeningar?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-pollution`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowMarkfororeningar(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-soil-pollution"
              onChange={() => {
                setEditMarkfororeningar(!editMarkfororeningar);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showMarkfororeningar}
            onClose={() => setShowMarkfororeningar(false)}
            className="w-[56rem]"
            label={'Villkor för markförorningar'}
          >
            <Modal.Content>
              <FormControl id="detailPlan" className="w-full">
                <FormLabel>Ange vilken detaljplan som gäller</FormLabel>
                <Input {...register('markfororeningarTerms.detailPlan')} />
              </FormControl>
              <FormControl id="propertyOrArea" className="w-full">
                <FormLabel>Ange om ärendet gäller en fastighet eller ett område</FormLabel>
                <Input {...register('markfororeningarTerms.propertyOrArea')} />
              </FormControl>
              <Table data-cy="pollution-conditions-table" dense background>
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för markföroreningar</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'markfororeningarTerms.condition.pollutionGuaranteeBuildable',
                      header: 'Garanti för bebyggbarhet vid markföroreningar',
                      conditionText:
                        'Säljaren garanterar att området är lämpligt att bebygga enligt föroreningar i angiven detaljplan med avseende på markföroreningar. I det fallet att markföroreningar upptäcks efter köpet, som medför att marken inte längre är lämplig att bebygga enligt angiven detaljplan åligger det säljaren att bekosta avhjälpandet av dessa, så att marken återigenär lämplig att bebygga enligt angiven detaljplan. Detta åtagande är giltigt under fem år från tillträdesdagen.',
                    },
                    {
                      key: 'markfororeningarTerms.condition.pollutionGuaranteeExtended',
                      header: 'Utvidgad garanti vid upptäckta markföroreningar',
                      conditionText:
                        'Säljaren garanterar att fastigheten/området är lämpligt att bebygga enligt angiven detaljplan, med avseende på markföroreningar. I det fallet att ytterligare (inom sanerat område) markföroreningar upptäcks efter köpet, som medför att marken inte längre är lämplig att bebygga enligt angiven detaljplan, åligger det säljaren att bekosta avhjälpandet av dessa, så att marken återigen är lämplig att bebygga enligt angiven detaljplan. Detta åtagande är giltigt under fem år från tillträdesdagen.',
                    },
                    {
                      key: 'markfororeningarTerms.condition.pollutionGuaranteeInspected',
                      header: 'Överlåtelse i befintligt skick med undersökningsplikt',
                      conditionText:
                        'Fastigheten/området överlåts i befintligt skick. Köparen har beretts tillfälle att fullgöra sin undersökningsplikt enligt 10 kap. miljöbalken och 4 kap. jordabalken. Köparen är medveten om att fastigheten/området kan vara förorenat och att detta kan leda till kostnader för köparen vid en eventuell efterbehandling av fastigheten/området. Köparen godtar fastighetens/områdets skick och avstår med bindande verkan från alla anspråk gentemot säljaren på grund av markföroreningar eller fel och brister i övrigt i fastigheten/området.',
                    },
                  ].map(renderContractTermCheckboxList({ getValues, setValue, register }))}
                </Table.Body>
              </Table>

              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const content = `<strong>Markföroreningar</strong>
                  <p>Detaljplan: ${getValues().markfororeningarTerms.detailPlan || '(saknas)'}</p>
                  <p>Fastighet/område: ${getValues().markfororeningarTerms.propertyOrArea || '(saknas)'}</p>
                  <br />
                  
                  ${
                    getValues().markfororeningarTerms.condition.pollutionGuaranteeBuildable
                      ? `<strong>${
                          getValues().markfororeningarTerms.condition.pollutionGuaranteeBuildable.header
                        }</strong><p>${
                          getValues().markfororeningarTerms.condition.pollutionGuaranteeBuildable.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().markfororeningarTerms.condition.pollutionGuaranteeExtended
                      ? `<strong>${
                          getValues().markfororeningarTerms.condition.pollutionGuaranteeExtended.header
                        }</strong><p>${
                          getValues().markfororeningarTerms.condition.pollutionGuaranteeExtended.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().markfororeningarTerms.condition.pollutionGuaranteeInspected
                      ? `<strong>${
                          getValues().markfororeningarTerms.condition.pollutionGuaranteeInspected.header
                        }</strong><p>${
                          getValues().markfororeningarTerms.condition.pollutionGuaranteeInspected.conditionText
                        }</p><br />`
                      : ''
                  }
                  `;

                  setValue('markfororeningar', content);
                  setShowMarkfororeningar(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="markfororeningar" className="w-full">
            <Input type="hidden" {...register('markfororeningar')} />
            <div className="h-[42rem] -mb-48" data-cy="soil-pollution-richtext-wrapper">
              <ContractTextEditorWrapper
                val={markfororeningar}
                label="markfororeningar"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                readOnly={!editMarkfororeningar}
              />
            </div>
          </FormControl>
          {saveButton('markfororeningar')}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="trees" />} />}
        data-cy="forest-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Skog</h2>}
        label={doneMark.findIndex((temp) => temp === 'skog') !== -1 ? 'Komplett' : ''}
        initalOpen={watch().skog?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-forest`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowSkog(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-forest"
              onChange={() => {
                setEditSkog(!editSkog);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal show={showSkog} onClose={() => setShowSkog(false)} className="w-[56rem]" label={'Villkor för skog'}>
            <Modal.Content>
              <Table dense background data-cy="forest-conditions-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för skog</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'skogTerms.condition.noClaims',
                      header: 'Inga anspråk vid eventuella skogsavvikelser',
                      conditionText:
                        'Köparen avsäger sig från alla anspråk mot säljaren för eventuella skogsavvikelser gentemot verkliga förhållanden som kan finnas i de skogliga uppgifter säljaren redovisat för köparen',
                    },
                    {
                      key: 'skogTerms.condition.huntingRights',
                      header: 'Jakträtt gäller till angivet datum',
                      conditionText:
                        'Köparen godtar att den jakträttsupplåtelse som säljaren träffat och som löper tom 20XX-XX-XX, ska få gälla till detta datum',
                    },
                    {
                      key: 'skogTerms.condition.noLogging',
                      header: 'Garanti mot avverkningar efter skogsvärdering',
                      conditionText:
                        'Fastigheten överlåts i befintligt skick med därå växande skog. Säljaren garanterar att det, efter det att fastigheten skogsvärderats 20XX-XX-XX, inte har utförts avverkningar på fastigheten.',
                    },
                    {
                      key: 'skogTerms.condition.noUnsoldLoggingRights',
                      header: 'Garanti mot försålda och oavverkade avverkningsrätter',
                      conditionText:
                        'Säljaren garanterar att det inte finns träffade avtal om försålda och oavverkade avverkningsrätter inom den överlåtna fastigheten.',
                    },
                    {
                      key: 'skogTerms.condition.takeOverAllAgreements',
                      header: 'Köparen tar över alla avtal och rättigheter',
                      conditionText:
                        'Fastigheten överlåts i befintligt skick med därå växande skog. Säljaren garanterar att det, efter det att fastigheten skogsvärderats 20XX-XX-XX, inte har utförts avverkningar på fastigheten.',
                    },
                  ].map(renderContractTermCheckboxList({ getValues, setValue, register }))}
                </Table.Body>
              </Table>
              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const content = `
                  ${
                    getValues().skogTerms.condition.noClaims
                      ? `<p><strong>${getValues().skogTerms.condition.noClaims.header}</strong></p><p>${
                          getValues().skogTerms.condition.noClaims.conditionText
                        }</p><br />`
                      : ''
                  }
                                    ${
                                      getValues().skogTerms.condition.huntingRights
                                        ? `<p><strong>${
                                            getValues().skogTerms.condition.huntingRights.header
                                          }</strong></p><p>${
                                            getValues().skogTerms.condition.huntingRights.conditionText
                                          }</p><br />`
                                        : ''
                                    }
                  ${
                    getValues().skogTerms.condition.noLogging
                      ? `<p><strong>${getValues().skogTerms.condition.noLogging.header}</strong></p><p>${
                          getValues().skogTerms.condition.noLogging.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().skogTerms.condition.noUnsoldLoggingRights
                      ? `<p><strong>${getValues().skogTerms.condition.noUnsoldLoggingRights.header}</strong></p><p>${
                          getValues().skogTerms.condition.noUnsoldLoggingRights.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().skogTerms.condition.takeOverAllAgreements
                      ? `<p><strong>${getValues().skogTerms.condition.takeOverAllAgreements.header}</strong></p><p>${
                          getValues().skogTerms.condition.takeOverAllAgreements.conditionText
                        }</p><br />`
                      : ''
                  }`;

                  setValue('skog', content);
                  setShowSkog(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="skog" className="w-full">
            <Input type="hidden" {...register('skog')} />
            <div className="h-[42rem] -mb-48" data-cy="forest-richtext-wrapper">
              <ContractTextEditorWrapper
                val={skog}
                label="skog"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                readOnly={!editSkog}
              />
            </div>
          </FormControl>
          {saveButton('skog')}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="file-check" />} />}
        data-cy="sellers-obligation-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Säljarens förpliktelser</h2>}
        label={doneMark.findIndex((temp) => temp === 'forpliktelser') !== -1 ? 'Komplett' : ''}
        initalOpen={watch().forpliktelser?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-seller-obligations`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowForpliktelser(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-sellers-obligation"
              onChange={() => {
                setEditForpliktelser(!editForpliktelser);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showForpliktelser}
            onClose={() => setShowForpliktelser(false)}
            className="w-[56rem]"
            label={'Villkor för säljarens förpliktelser'}
          >
            <Modal.Content>
              <Table dense background data-cy="sellers-conditions-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för säljarens förpliktelser</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'forpliktelserTerms.condition.insurance',
                      header: 'Säljaren förbinder sig att hålla fastigheten försäkrad till och med tillträdesdagen.',
                      conditionText: '',
                    },
                  ].map(renderContractTermCheckboxList({ getValues, setValue, register }))}
                </Table.Body>
              </Table>
              <Table dense background data-cy="cleaning-conditions-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för rengöring</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'forpliktelserTerms.condition.cleaning',
                      header:
                        'På tillträdelsedagen ska säljaren tillse att fastigheten/området är urplockat och utrymt.',
                      conditionText: '',
                    },
                  ].map(renderContractTermCheckboxList({ getValues, setValue, register }))}
                </Table.Body>
              </Table>
              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const content = `
                  ${
                    getValues().forpliktelserTerms.condition.insurance
                      ? `<p><strong>${getValues().forpliktelserTerms.condition.insurance.header}</strong></p><p>${
                          getValues().forpliktelserTerms.condition.insurance.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().forpliktelserTerms.condition.cleaning
                      ? `<p><strong>${getValues().forpliktelserTerms.condition.cleaning.header}</strong></p><p>${
                          getValues().forpliktelserTerms.condition.cleaning.conditionText
                        }</p><br />
                          `
                      : ''
                  }`;

                  setValue('forpliktelser', content);
                  setShowForpliktelser(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="forpliktelser" className="w-full">
            <Input type="hidden" {...register('forpliktelser')} />
            <div className="h-[42rem] -mb-48" data-cy="sellers-obligation-richtext-wrapper">
              <ContractTextEditorWrapper
                val={forpliktelser}
                label="forpliktelser"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                readOnly={!editForpliktelser}
              />
            </div>
          </FormControl>
          {saveButton('forpliktelser')}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="calculator" />} />}
        data-cy="expenses-costs-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Utgifter och kostnader</h2>}
        label={doneMark.findIndex((temp) => temp === 'utgifter') !== -1 ? 'Komplett' : ''}
        initalOpen={watch().utgifter?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-expenses`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowUtgifter(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-expenses-costs"
              onChange={() => {
                setEditUtgifter(!editUtgifter);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showUtgifter}
            onClose={() => setShowUtgifter(false)}
            className="w-[56rem]"
            label={'Villkor för utgifter och kostnader'}
          >
            <Modal.Content>
              <Table dense background data-cy="expenses-costs-conditions-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för utgifter och kostnader</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'utgifterTerms.condition.fees',
                      header: 'Köparen ska ersätta säljarens personliga kringkostnader',
                      conditionText:
                        'Köparen ska ersätta säljaren med [summa] kr som personlig ersättning enligt expropriationslagens regler. XX XXX kr annan ersättning för flyttkostnader, förtida lösen av lån med mera. Utbetalningarna sker samtidigt med köpeskillingen',
                    },
                    {
                      key: 'utgifterTerms.condition.taxes',
                      header: 'Säljaren betalar skatter och avgifter fram till tillträde',
                      conditionText:
                        'Säljaren betalar alla skatter, avgifter och andra utgifter för fastigheten/området för tiden före tillträdesdagen även om de förfaller till betalning senare. Vad avser kommunal fastighetsavgift är parterna införstådda med att betalningsskyldigheten åvilar den av dem som är ägare av fastigheten den 1 januari respektive år.',
                    },
                    {
                      key: 'utgifterTerms.condition.regulation',
                      header: 'Köparen betalar för kostnader vid fastighetsreglering',
                      conditionText:
                        'Detta avtal får läggas till grund för ansökan om fastighetsreglering. Köparen betalar Lantmäteriets förrättningskostnader. Genomförs fastighetsbildningen ska förvärvet inte lagfaras.',
                    },
                    {
                      key: 'utgifterTerms.condition.lagfart',
                      header: 'Köparen betalar för lagfart och pantbrev efter utfärdat köpebrev',
                      conditionText:
                        'Lagfart får inte sökas på denna handling utan först sedan köpebrev utfärdats. Samtliga kostnader för lagfart och pantbrev betalas av köparen.',
                    },
                  ].map(renderContractTermCheckboxList({ getValues, setValue, register }))}
                </Table.Body>
              </Table>
              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const content = `
                  ${
                    getValues().utgifterTerms.condition.fees
                      ? `<p><strong>${getValues().utgifterTerms.condition.fees.header}</strong></p><p>${
                          getValues().utgifterTerms.condition.fees.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().utgifterTerms.condition.taxes
                      ? `<p><strong>${getValues().utgifterTerms.condition.taxes.header}</strong></p><p>${
                          getValues().utgifterTerms.condition.taxes.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().utgifterTerms.condition.regulation
                      ? `<p><strong>${getValues().utgifterTerms.condition.regulation.header}</strong></p><p>${
                          getValues().utgifterTerms.condition.regulation.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().utgifterTerms.condition.lagfart
                      ? `<p><strong>${getValues().utgifterTerms.condition.lagfart.header}</strong></p><p>${
                          getValues().utgifterTerms.condition.lagfart.conditionText
                        }</p><br />`
                      : ''
                  }`;

                  setValue('utgifter', content);
                  setShowUtgifter(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="utgifter" className="w-full">
            <Input type="hidden" {...register('utgifter')} />
            <div className="h-[42rem] -mb-48" data-cy="expenses-costs-richtext-wrapper">
              <ContractTextEditorWrapper
                val={utgifter}
                label="utgifter"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                readOnly={!editUtgifter}
              />
            </div>
          </FormControl>
          {saveButton('utgifter')}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="home" />} />}
        data-cy="property-formation-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Fastighetsbildning</h2>}
        label={doneMark.findIndex((temp) => temp === 'fastighetsbildning') !== -1 ? 'Komplett' : ''}
        initalOpen={watch().fastighetsbildning?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-property`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowFastighetsbildning(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-property-formation"
              onChange={() => {
                setEditFastighetsbildning(!editFastighetsbildning);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showFastighetsbildning}
            onClose={() => setShowFastighetsbildning(false)}
            className="w-[56rem]"
            label={'Villkor för fastighetsbildning'}
          >
            <Modal.Content>
              <Table dense background data-cy="property-formation-conditions-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för fastighetsbildning</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'fastighetsbildningTerms.condition.kringkostnader',
                      header: 'Köparen ersätter säljarens kringkostnader vid köp',
                      conditionText:
                        'Detta avtal ska ligga till grund för beslut om fastighetsreglering vilket bekostas av köparen, säljaren ansöker om fastighetsbildning.',
                    },
                    {
                      key: 'fastighetsbildningTerms.condition.taxes',
                      header: 'Säljaren betalar skatter och avgifter fram till tillträde',
                      conditionText:
                        'Detta avtal får ligga till grund för beslut om fastighetsreglering vilket bekostas av köparen, säljaren ansöker om fastighetsbildning.',
                    },
                    {
                      key: 'fastighetsbildningTerms.condition.regulation',
                      header: 'Köparen betalar för kostnader vid fastighetsreglering',
                      conditionText:
                        'Detta avtal får ligga till grund för beslut om ledningsrätt för befintliga underjordiska ledningar inom fastigheten/området, tidigare val gäller även här, vilket bekostas av ledningsägaren',
                    },
                  ].map(renderContractTermCheckboxList({ getValues, setValue, register }))}
                </Table.Body>
              </Table>
              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const content = `
                  ${
                    getValues().fastighetsbildningTerms.condition.kringkostnader
                      ? `<p><strong>${
                          getValues().fastighetsbildningTerms.condition.kringkostnader.header
                        }</strong></p><p>${
                          getValues().fastighetsbildningTerms.condition.kringkostnader.conditionText
                        }</p><br />`
                      : ''
                  }
                          ${
                            getValues().fastighetsbildningTerms.condition.taxes
                              ? `<p><strong>${
                                  getValues().fastighetsbildningTerms.condition.taxes.header
                                }</strong></p><p>${
                                  getValues().fastighetsbildningTerms.condition.taxes.conditionText
                                }</p><br />`
                              : ''
                          }
                              ${
                                getValues().fastighetsbildningTerms.condition.regulation
                                  ? `<p><strong>${
                                      getValues().fastighetsbildningTerms.condition.regulation.header
                                    }</strong></p><p>${
                                      getValues().fastighetsbildningTerms.condition.regulation.conditionText
                                    }</p><br />`
                                  : ''
                              }`;
                  setValue('fastighetsbildning', content);
                  setShowFastighetsbildning(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="fastighetsbildning" className="w-full">
            <Input type="hidden" {...register('fastighetsbildning')} />
            <div className="h-[42rem] -mb-48" data-cy="property-formation-richtext-wrapper">
              <ContractTextEditorWrapper
                val={fastighetsbildning}
                label="fastighetsbildning"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                readOnly={!editFastighetsbildning}
              />
            </div>
          </FormControl>
          {saveButton('fastighetsbildning')}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="info" />} />}
        data-cy="other-conditions-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Övriga villkor</h2>}
        label={doneMark.findIndex((temp) => temp === 'other') !== -1 ? 'Komplett' : ''}
        initalOpen={watch().other?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-other`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowOther(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-other-conditions"
              onChange={() => {
                setEditOther(!editOther);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal show={showOther} onClose={() => setShowOther(false)} className="w-[56rem]" label={'Övriga villkor'}>
            <Modal.Content>
              <Table dense background data-cy="other-conditions-conditions-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj övriga villkor</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'otherTerms.condition.inspected',
                      header: 'Köparen har godkänt skick och gränser genom besiktning',
                      conditionText:
                        'Köparen har besiktat fastigheten/området och godtar dess skick och gränser och avsäger sig med bindande verkan från alla anspråk mot säljaren för fel eller brister på fastigheten.',
                    },
                    {
                      key: 'otherTerms.condition.asis',
                      header: 'Fastigheten/Området överlåts i befintligt skick',
                      conditionText:
                        'Fastigheten/Området överlåts i befintligt skick, samt fri från penninginteckningar, oinskrivna nyttjanderätter och servitut.',
                    },
                    {
                      key: 'otherTerms.condition.fees',
                      header: 'Ansvarsfördelning för utgifter före och efter tillträde',
                      conditionText:
                        'Säljaren ansvarar för alla utgifter för tiden före tillträdesdagen och köparen för tiden därefter.',
                    },
                    {
                      key: 'otherTerms.condition.keys',
                      header: 'Säljaren ansvarar för uppsägning av abonnemang och överlämning av nycklar',
                      conditionText:
                        'Det åligger säljaren att säga upp gällande vatten-, el- och sophämtningsabonnemang för fastigheten. Nycklar tillhörande fastigheten ska överlämnas till köparen på tillträdesdagen.',
                    },
                    {
                      key: 'otherTerms.condition.deedPaidByBuyer',
                      header: 'Lagfartskostnaden ska betalas av köparen.',
                      conditionText: '',
                    },
                  ].map(renderContractTermCheckboxList({ getValues, setValue, register }))}
                </Table.Body>
              </Table>
              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const content = `
                  ${
                    getValues().otherTerms.condition.inspected
                      ? `<p><strong>${getValues().otherTerms.condition.inspected.header}</strong></p><p>${
                          getValues().otherTerms.condition.inspected.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().otherTerms.condition.asis
                      ? `<p><strong>${getValues().otherTerms.condition.asis.header}</strong></p><p>${
                          getValues().otherTerms.condition.asis.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().otherTerms.condition.fees
                      ? `<p><strong>${getValues().otherTerms.condition.fees.header}</strong></p><p>${
                          getValues().otherTerms.condition.fees.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().otherTerms.condition.keys
                      ? `<p><strong>${getValues().otherTerms.condition.keys.header}</strong></p><p>${
                          getValues().otherTerms.condition.keys.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().otherTerms.condition.deedPaidByBuyer
                      ? `<p><strong>${getValues().otherTerms.condition.deedPaidByBuyer.header}</strong></p><p>${
                          getValues().otherTerms.condition.deedPaidByBuyer.conditionText
                        }</p><br />`
                      : ''
                  }`;
                  setValue('other', content);
                  setShowOther(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="other" className="w-full">
            <Input type="hidden" {...register('other')} />
            <div className="h-[42rem] -mb-48" data-cy="other-conditions-richtext-wrapper">
              <ContractTextEditorWrapper
                val={other}
                label="other"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                readOnly={!editOther}
              />
            </div>
          </FormControl>
          {saveButton('other')}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="pen" />} />}
        data-cy="signature-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Underskrifter</h2>}
        label={doneMark.findIndex((temp) => temp === 'signature') !== -1 ? 'Komplett' : ''}
        initalOpen={watch().signature?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-signature`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowSignature(true)}
            >
              Välj villkor för underskrifter
            </Button>
          </div>
          <Modal
            show={showSignature}
            onClose={() => setShowSignature(false)}
            className="w-[56rem]"
            label={'Hänvisning till underskrifter'}
          >
            <Modal.Content>
              <Table dense background data-cy="signature-table-option">
                <Table.Header>
                  <Table.HeaderColumn>Välj hänvisning för underskrifter</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'signatureTerms.condition.example',
                      header: 'Avtalsexemplar',
                      conditionText:
                        'Detta avtal har upprättats i två likalydande exemplar varav säljare och köpare tagit varsitt. ',
                    },
                  ].map(renderContractTermCheckboxList({ getValues, setValue, register }))}
                </Table.Body>
              </Table>

              <Table dense background data-cy="signature-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj vilka intressenter som ska skriva under</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  <>
                    {errand.stakeholders.map((b, idx) => (
                      <Table.Row key={`persons-to-sign-${idx}`}>
                        <Table.Column>
                          <Checkbox
                            value={b.id}
                            checked={signatures.indexOf(b.id) > -1}
                            onChange={(event) => {
                              let name = b.id;
                              if (event.target.checked) {
                                setSignatures([...signatures, name]);
                              } else {
                                setSignatures((signatures) => signatures.filter((item) => item !== name));
                              }
                            }}
                          />
                          {b.firstName ? `${b.firstName} ${b.lastName} ` : `${b.organizationName}`}{' '}
                          {getStakeholderRelation(b) ? `(${MEXRelation[getStakeholderRelation(b)]})` : ''}
                        </Table.Column>
                      </Table.Row>
                    ))}
                  </>
                </Table.Body>
              </Table>

              <FormControl id="areaSize" className="w-full">
                <FormLabel>Ange antal av extra underskriftsrader för fastighetsägare</FormLabel>
                <Input
                  type="number"
                  value={getValues().signatureTerms.condition.emptyRowSeller?.conditionText}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setValue('signatureTerms.condition.emptyRowSeller.conditionText', e.target.value);
                  }}
                />
                <FormLabel>Ange antal av extra underskriftsrader för arrendator</FormLabel>
                <Input
                  type="number"
                  value={getValues().signatureTerms.condition.emptyRowBuyer?.conditionText}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setValue('signatureTerms.condition.emptyRowBuyer.conditionText', e.target.value);
                  }}
                />
              </FormControl>
              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  let content = ``;

                  content += `                  
                  ${
                    getValues().signatureTerms.condition.example
                      ? `<p>${getValues().signatureTerms.condition.example.conditionText}</p><br />`
                      : ''
                  }
                  `;

                  content += `<br />`;

                  content +=
                    `<div>` +
                    renderSignatures(MEXRelation.SELLER) +
                    renderEmptySignatures(
                      MEXRelation.SELLER,
                      parseInt(getValues().signatureTerms.condition.emptyRowSeller?.conditionText)
                    ) +
                    `</div>`;
                  content +=
                    `<div>` +
                    renderSignatures(MEXRelation.BUYER) +
                    renderEmptySignatures(
                      MEXRelation.BUYER,
                      parseInt(getValues().signatureTerms.condition.emptyRowBuyer?.conditionText)
                    ) +
                    `</div>`;

                  setSignature(content);
                  setShowSignature(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="signature" className="w-full">
            <div className="h-[42rem] -mb-20 text-sm overflow-auto" data-cy="signature-richtext-wrapper">
              <div dangerouslySetInnerHTML={{ __html: sanitized(signature) }} />
            </div>
          </FormControl>
          {saveButton('signature')}
        </div>
      </Disclosure>
    </>
  );
};
