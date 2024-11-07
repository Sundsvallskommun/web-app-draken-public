import {
  LagenhetsArendeTemplate,
  LagenhetsArrendeData,
  LagenhetsArrendeStakeholder,
} from '@casedata/interfaces/lagenhetsarrende-data';
import { validateAction } from '@casedata/services/casedata-errand-service';
import { getErrandPropertyDesignations } from '@casedata/services/casedata-facilities-service';
import { getSSNFromPersonId, getStakeholderRelation } from '@casedata/services/casedata-stakeholder-service';
import renderContractTermCheckboxList from '@casedata/services/contract-render-service';

import { TermGroup } from '@casedata/interfaces/contracts';
import { IErrand } from '@casedata/interfaces/errand';
import { Relation } from '@casedata/interfaces/role';
import { getContractStakeholderName } from '@casedata/services/contract-service';
import { User } from '@common/interfaces/user';
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
  Select,
  Table,
} from '@sk-web-gui/react';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { ContractTextEditorWrapper } from './contract-text-editor-wrapper';

export const Lagenhetsarrende: React.FC<{
  changeBadgeColor;
  onSave;
  existingContract: LagenhetsArrendeData;
  leaseholders: LagenhetsArrendeStakeholder[];
  grantors: LagenhetsArrendeStakeholder[];
  updateStakeholders: () => void;
}> = ({ changeBadgeColor, onSave, existingContract, leaseholders, grantors, updateStakeholders }) => {
  const { municipalityId, errand, user }: { municipalityId: string; errand: IErrand; user: User } = useAppContext();
  const { register, watch, setValue, control, getValues, trigger } = useFormContext<
    LagenhetsArendeTemplate & LagenhetsArrendeData
  >();
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  const [showOmrade, setShowOmrade] = useState(false);
  const [editOmrade, setEditOmrade] = useState(false);
  const quillRefOmrade = useRef(null);
  const [omrade, setOmrade] = useState<string>('');

  const [showAndamal, setShowAndamal] = useState(false);
  const [editAndamal, setEditAndamal] = useState(false);
  const quillRefAndamal = useRef(null);
  const [andamal, setAndamal] = useState<string>('');

  const [showArrendetid, setShowArrendetid] = useState(false);
  const [editArrendetid, setEditArrendetid] = useState(false);
  const quillRefArrendetid = useRef(null);
  const [arrendetid, setArrendetid] = useState<string>('');

  const [showArrendeavgift, setShowArrendeavgift] = useState(false);
  const [editArrendeavgift, setEditArrendeavgift] = useState(false);
  const quillRefArrendeavgift = useRef(null);
  const [arrendeavgift, setArrendeavgift] = useState<string>('');

  const [showBygglov, setShowBygglov] = useState(false);
  const [editBygglov, setEditBygglov] = useState(false);
  const quillRefBygglov = useRef(null);
  const [bygglov, setBygglov] = useState<string>('');

  const [showOverlatelse, setShowOverlatelse] = useState(false);
  const [editOverlatelse, setEditOverlatelse] = useState(false);
  const quillRefOverlatelse = useRef(null);
  const [overlatelse, setOverlatelse] = useState<string>('');

  const [showInskrivning, setShowInskrivning] = useState(false);
  const [editInskrivning, setEditInskrivning] = useState(false);
  const quillRefInskrivning = useRef(null);
  const [inskrivning, setInskrivning] = useState<string>('');

  const [showSkick, setShowSkick] = useState(false);
  const [editSkick, setEditSkick] = useState(false);
  const quillRefSkick = useRef(null);
  const [skick, setSkick] = useState<string>('');

  const [showLedningar, setShowLedningar] = useState(false);
  const [editLedningar, setEditLedningar] = useState(false);
  const quillRefLedningar = useRef(null);
  const [ledningar, setLedningar] = useState<string>('');

  const [showKostnader, setShowKostnader] = useState(false);
  const [editKostnader, setEditKostnader] = useState(false);
  const quillRefKostnader = useRef(null);
  const [kostnader, setKostnader] = useState<string>('');

  const [showMarkfororeningar, setShowMarkfororeningar] = useState(false);
  const [editMarkfororeningar, setEditMarkfororeningar] = useState(false);
  const quillRefMarkfororeningar = useRef(null);
  const [markfororeningar, setMarkfororeningar] = useState<string>('');

  const [showUpphorande, setShowUpphorande] = useState(false);
  const [editUpphorande, setEditUpphorande] = useState(false);
  const quillRefUpphorande = useRef(null);
  const [upphorande, setUpphorande] = useState<string>('');

  const [showSkadaansvar, setShowSkadaansvar] = useState(false);
  const [editSkadaansvar, setEditSkadaansvar] = useState(false);
  const quillRefSkadaansvar = useRef(null);
  const [skadaansvar, setSkadaansvar] = useState<string>('');

  const quillRefAdditionalTerms = useRef(null);
  const [additionalTerms, setAdditionalTerms] = useState<TermGroup[]>([]);

  const [showSarskilda, setShowSarskilda] = useState(false);
  const [editSarskilda, setEditSarskilda] = useState(false);
  const quillRefSarskilda = useRef(null);
  const [sarskilda, setSarskilda] = useState<string>('');

  const [showJordabalken, setShowJordabalken] = useState(false);
  const [editJordabalken, setEditJordabalken] = useState(false);
  const quillRefJordabalken = useRef(null);
  const [jordabalken, setJordabalken] = useState<string>('');

  const [showSignature, setShowSignature] = useState(false);
  const [editSignature, setEditSignature] = useState(false);
  const quillRefSignature = useRef(null);
  const [signature, setSignature] = useState<string>('');

  const [textIsDirty, setTextIsDirty] = useState(false);
  const [loading, setIsLoading] = useState<boolean>();
  const [allowed, setAllowed] = useState(false);
  const [signatures, setSignatures] = useState<String[]>([]);

  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  useEffect(() => {
    leaseholders.forEach(async (s: LagenhetsArrendeStakeholder, idx) => {
      const ssn = await getSSNFromPersonId(municipalityId, s.partyId);
      s.personalNumber = ssn;
      setValue('leaseholders', leaseholders);
    });
  }, [leaseholders]);

  const { fields: leaseholdersFields, replace: replaceLeaseholders } = useFieldArray({
    control,
    keyName: 'leaseholderId',
    name: 'leaseholders',
  });

  useEffect(() => {
    grantors.forEach(async (s: LagenhetsArrendeStakeholder, idx) => {
      const ssn = await getSSNFromPersonId(municipalityId, s.partyId);
      s.personalNumber = ssn;
      setValue('grantors', grantors);
    });
  }, [grantors]);

  const { fields: grantorsFields, replace: replaceGrantholders } = useFieldArray({
    control,
    keyName: 'grantorId',
    name: 'grantors',
  });

  useEffect(() => {
    replaceLeaseholders(leaseholders);
    replaceGrantholders(grantors);
  }, [leaseholders, grantors]);

  useEffect(() => {
    setValue('propertyDesignations', getErrandPropertyDesignations(errand));
  }, [errand]);

  useEffect(() => {
    if (existingContract) {
      setValue('omrade', existingContract.omrade);
      setValue('andamal', existingContract.andamal);
      setValue('arrendetid', existingContract.arrendetid);
      setValue('arrendeavgift', existingContract.arrendeavgift);
      setValue('bygglov', existingContract.bygglov);
      setValue('overlatelse', existingContract.overlatelse);
      setValue('inskrivning', existingContract.inskrivning);
      setValue('skick', existingContract.skick);
      setValue('ledningar', existingContract.ledningar);
      setValue('kostnader', existingContract.kostnader);
      setValue('markfororeningar', existingContract.markfororeningar);
      setValue('upphorande', existingContract.upphorande);
      setValue('skadaansvar', existingContract.skadaansvar);
      setValue('additionalTerms', existingContract.additionalTerms);
      setValue('sarskilda', existingContract.sarskilda);
      setValue('jordabalken', existingContract.jordabalken);
      setValue('signature', existingContract.signature);
    }
  }, [existingContract]);

  useEffect(() => {
    setOmrade(watch().omrade);
  }, [watch().omrade]);

  useEffect(() => {
    setAndamal(watch().andamal);
  }, [watch().andamal]);

  useEffect(() => {
    setArrendetid(watch().arrendetid);
  }, [watch().arrendetid]);

  useEffect(() => {
    setArrendeavgift(watch().arrendeavgift);
  }, [watch().arrendeavgift]);

  useEffect(() => {
    setBygglov(watch().bygglov);
  }, [watch().bygglov]);

  useEffect(() => {
    setOverlatelse(watch().overlatelse);
  }, [watch().overlatelse]);

  useEffect(() => {
    setInskrivning(watch().inskrivning);
  }, [watch().inskrivning]);

  useEffect(() => {
    setSkick(watch().skick);
  }, [watch().skick]);

  useEffect(() => {
    setLedningar(watch().ledningar);
  }, [watch().ledningar]);

  useEffect(() => {
    setKostnader(watch().kostnader);
  }, [watch().kostnader]);

  useEffect(() => {
    setMarkfororeningar(watch().markfororeningar);
  }, [watch().markfororeningar]);

  useEffect(() => {
    setUpphorande(watch().upphorande);
  }, [watch().upphorande]);

  useEffect(() => {
    setAdditionalTerms(watch().additionalTerms);
  }, [watch().additionalTerms]);

  useEffect(() => {
    setSkadaansvar(watch().skadaansvar);
  }, [watch().skadaansvar]);

  useEffect(() => {
    setSarskilda(watch().sarskilda);
  }, [watch().sarskilda]);

  useEffect(() => {
    setJordabalken(watch().jordabalken);
  }, [watch().jordabalken]);

  useEffect(() => {
    setSignature(watch().signature);
  }, [watch().signature]);

  const saveButton = () => {
    return (
      <div className="my-md">
        {loading ? (
          <Button disabled={true}>Sparar</Button>
        ) : (
          <Button
            disabled={!allowed}
            onClick={() => {
              setIsLoading(true);
              onSave(getValues()).then(() => {
                setIsLoading(undefined);
                setTextIsDirty(false);
              });
            }}
          >
            Spara
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Disclosure
        data-cy="parties-disclosure"
        icon={<Icon icon={<LucideIcon name="users" />} />}
        header={<h2 className="text-h4-sm md:text-h4-md">Parter</h2>}
        // label={watch().omrade?.length ? 'Sparad' : ''}
        initalOpen={true}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-parties`);
        }}
      >
        <div className="flex flex-col gap-16">
          <Table dense background data-cy="grantor-table">
            <Table.Header>
              <Table.HeaderColumn>Fastighetsägare</Table.HeaderColumn>
              <Table.HeaderColumn>Adress</Table.HeaderColumn>
            </Table.Header>
            <Table.Body>
              {grantors?.length > 0 ? (
                grantors.map((b, idx) => (
                  <Table.Row key={`row-${idx}`}>
                    <Table.Column className="flex flex-col items-start justify-center !gap-0">
                      <div>
                        <strong>{getContractStakeholderName(b)}</strong>
                      </div>
                      <div>
                        {b.type === 'COMPANY' || b.type === 'ASSOCIATION' ? b.organizationNumber : b.personalNumber}
                      </div>
                    </Table.Column>
                    <Table.Column className="flex flex-col items-start justify-center !gap-0">
                      {b.street && b.zip && b.city ? (
                        <>
                          <div>
                            <strong>{b.street}</strong>
                          </div>
                          <div>{b.careof}</div>
                          <div>
                            {b.zip} {b.city}
                          </div>
                        </>
                      ) : (
                        <strong>(saknas)</strong>
                      )}
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
          <Table dense background data-cy="leaseholder-table">
            <Table.Header>
              <Table.HeaderColumn>Arrendatorer</Table.HeaderColumn>
              <Table.HeaderColumn>Adress</Table.HeaderColumn>
            </Table.Header>
            <Table.Body>
              {leaseholders?.length > 0 ? (
                leaseholders.map((b, idx) => (
                  <Table.Row key={`leaseholder-${idx}`}>
                    <Table.Column className="flex flex-col items-start justify-center !gap-0">
                      <div>
                        <strong>{getContractStakeholderName(b)}</strong>
                      </div>
                      <div>
                        {b.type === 'COMPANY' || b.type === 'ASSOCIATION' ? b.organizationNumber : b.personalNumber}
                      </div>
                    </Table.Column>
                    <Table.Column className="flex flex-col items-start justify-center !gap-0">
                      {b.street && b.zip && b.city ? (
                        <>
                          <div>
                            <strong>{b.street}</strong>
                          </div>
                          <div>{b.careof}</div>
                          <div>
                            {b.zip} {b.city}
                          </div>
                        </>
                      ) : (
                        <strong>(saknas)</strong>
                      )}
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
        icon={<Icon icon={<LucideIcon name="map-pin" />} />}
        data-cy="area-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Område</h2>}
        //label={existingContract.omrade?.length > 8 ? 'Färdigställt' : ''}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-area`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowOmrade(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-area"
              onChange={() => {
                setEditOmrade(!editOmrade);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showOmrade}
            onClose={() => setShowOmrade(false)}
            className="w-[56rem]"
            label={'Villkor för område'}
          >
            <Modal.Content>
              {/* <FormControl id="areaType" className="my-md">
                <FormLabel>Typ av område</FormLabel>
                <FormControl id="areaType">
                  <RadioButton.Group data-cy="areacheck-group" className="space-x-4" inline>
                    <RadioButton
                      checked={getValues().omradeTerms?.areaType === 'land'}
                      name="areaType"
                      value="land"
                      onClick={() => {
                        setValue('omradeTerms.areaType', 'land');
                      }}
                    >
                      Mark
                    </RadioButton>
                    <RadioButton
                      checked={getValues().omradeTerms?.areaType === 'landAndWater'}
                      name="areaType"
                      value="whenPaid"
                      onClick={() => {
                        setValue('omradeTerms.areaType', 'landAndWater');
                      }}
                    >
                      Mark och vatten
                    </RadioButton>
                  </RadioButton.Group>
                </FormControl>
              </FormControl> */}
              <FormControl>
                <FormLabel>
                  Ange vilka arrendeområdet ligger inom [[[fastighet/erna:]]] (hämtad från uppgifter)
                </FormLabel>
                {errand.facilities?.length > 0 ? (
                  getErrandPropertyDesignations(errand).map((p, idx) => (
                    <Checkbox
                      data-cy="property-designation-check"
                      key={`facility-${idx}`}
                      value={p}
                      defaultChecked={selectedProperties.includes(p)}
                      onChange={(e) => {
                        setSelectedProperties((old) => {
                          if (old.includes(e.target.value)) {
                            old.splice(0, 1);
                            return old;
                          } else {
                            return [...old, e.target.value];
                          }
                        });
                      }}
                    >
                      {p}
                    </Checkbox>
                  ))
                ) : (
                  <span>Inga fastighetsbeteckningar finns angivna på ärendet</span>
                )}
              </FormControl>
              <FormControl id="areaSize" className="w-full">
                <FormLabel>Områdets areal (cirka)</FormLabel>
                <Input
                  value={getValues().omradeTerms?.areaSize}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setValue('omradeTerms.areaSize', e.target.value);
                  }}
                />
              </FormControl>
              <FormControl id="mapAttachments" className="w-full">
                <FormLabel>Ange kartbilaga/or där områdets läge är skrafferat och märkt</FormLabel>
                <Input
                  value={getValues().omradeTerms?.mapAttachments}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setValue('omradeTerms.mapAttachments', e.target.value);
                  }}
                />
              </FormControl>
              {/* <FormControl id="mapAttachmentReference" className="w-full">
                <FormLabel>Ange referenser till hur området skrafferat och märkt i bilagan/or</FormLabel>
                <Input
                  value={getValues().omradeTerms?.mapAttachmentReference}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setValue('omradeTerms.mapAttachmentReference', e.target.value);
                  }}
                />
              </FormControl> */}
              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // const content = `<strong>Område</strong>
                  // <p>Typ av område: ${getValues().omradeTerms?.areaType}</p><br />
                  const content = `<p>Fastigheter: ${
                    selectedProperties?.length > 0 ? selectedProperties.join(', ') : '(saknas)'
                  }</p><br />
                  <p>Areal: ${getValues().omradeTerms?.areaSize}</p><br />
                  <p>Kartbilaga: ${getValues().omradeTerms?.mapAttachments}</p><br />`;
                  // <p>Referens till kartbilaga: ${getValues().omradeTerms?.mapAttachmentReference}</p><br />`;
                  setOmrade(content);
                  setShowOmrade(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="kopeskilling" className="w-full">
            <Input type="hidden" {...register('omrade')} />
            <div className="h-[42rem] -mb-48" data-cy="area-richtext-wrapper">
              <ContractTextEditorWrapper
                val={omrade}
                label="omrade"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setOmrade}
                readOnly={!editOmrade}
                editorRef={quillRefOmrade}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="info" />} />}
        data-cy="purpose-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Ändamål</h2>}
        // label={watch().andamal?.length ? 'Sparad' : ''}
        initalOpen={watch().andamal?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-purpose`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowAndamal(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-purpose"
              onChange={() => {
                setEditAndamal(!editAndamal);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showAndamal}
            onClose={() => setShowAndamal(false)}
            className="w-[56rem]"
            label={'Villkor för ändamål'}
          >
            <Modal.Content>
              <FormControl>
                <FormLabel>
                  Området får användas till följande ändamål{' '}
                  <span className="font-normal">(Välj ett eller flera ändamål)</span>
                </FormLabel>
                <div className="w-full my-md flex gap-12 justify-between">
                  <div className="grid grid-cols-3 gap-24">
                    {[
                      {
                        key: 'andamalTerms.condition.byggnad',

                        header: 'Byggnad',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.batplats',

                        header: 'Båtplats',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.idrattsandamal',

                        header: 'Idrottsändamål',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.led',

                        header: 'Led',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.parkering',

                        header: 'Parkering',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.skylt',

                        header: 'Skylt',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.snotipp',

                        header: 'Snötipp',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.tomtkomplement',

                        header: 'Tomtkomplement',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.upplag',

                        header: 'Upplag',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.uppstallning',

                        header: 'Uppställning',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.ytjordvarme',

                        header: 'Ytjordvärme',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.vag',

                        header: 'Väg',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.atervinningsstation',

                        header: 'Återvinningsstation',
                        conditionText: '',
                      },
                      {
                        key: 'andamalTerms.condition.other',

                        header: 'XXXX',
                        conditionText: '',
                      },
                    ].map(
                      (
                        {
                          key,
                          value,
                          header,
                          conditionText,
                        }: {
                          key:
                            | 'noClaims'
                            | 'huntingRights'
                            | 'noLogging'
                            | 'noUnsoldLoggingRights'
                            | 'takeOverAllAgreements';
                          value;
                          header;
                          conditionText;
                        },
                        idx,
                        ary
                      ) => (
                        <div className="flex flex-wrap" key={idx}>
                          <Checkbox
                            data-cy={`purpose-term-${header}`}
                            className="w=1/3"
                            defaultChecked={!!getValues(key as any)}
                            onChange={(val) => {
                              setValue(
                                key as any,
                                val.target.checked
                                  ? {
                                      header,
                                      conditionText,
                                    }
                                  : undefined
                              );
                            }}
                          >
                            {header}
                          </Checkbox>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </FormControl>
              {/* <FormControl id="purposeOtherInformation" className="w-full">
                <FormLabel>Förtydligande ändamålsinformation</FormLabel>
                <Textarea
                  rows={4}
                  className="w-full"
                  value={getValues('andamalTerms.clarification')}
                  {...register('andamalTerms.clarification')}
                ></Textarea>
              </FormControl> */}
              {/* <FormControl id="permitExists" className="my-md">
                <FormLabel>Finns bygglov?</FormLabel>
                <RadioButton.Group className="space-x-4" inline data-cy="bygglov-checkgroup">
                  <RadioButton
                    checked={getValues().andamalTerms.bygglovExists === 'true'}
                    name="bygglovExists"
                    value="true"
                    onClick={() => {
                      setValue('andamalTerms.bygglovExists', 'true');
                    }}
                  >
                    Ja
                  </RadioButton>
                  <RadioButton
                    checked={getValues().andamalTerms.bygglovExists === 'false'}
                    name="bygglovExists"
                    value="false"
                    onClick={() => {
                      setValue('andamalTerms.bygglovExists', 'false');
                    }}
                  >
                    Nej
                  </RadioButton>
                </RadioButton.Group>
              </FormControl> */}
              <Table dense background data-cy="buildPermits-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för ändamål</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'andamalTerms.condition.consent',
                      header: 'Fastighetsägarens medgivande',
                      conditionText: 'Området får ej utan fastighetsägarens medgivande användas till annat ändamål',
                    },
                    {
                      key: 'andamalTerms.condition.detailedplan',
                      header: 'Gällande detaljplan',
                      conditionText: 'Området ligger på allmän platsmark enligt gällande detaljplan.',
                    },
                  ].map(renderContractTermCheckboxList({ getValues, setValue, register }))}
                </Table.Body>
              </Table>

              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  let content = '<strong>Området får användas till följande ändamål</strong>';
                  getValues('andamalTerms.condition.byggnad') ? (content += '<p>Byggnad</p>') : '';
                  getValues('andamalTerms.condition.batplats') ? (content += '<p>Båtplats</p>') : '';
                  getValues('andamalTerms.condition.idrattsandamal') ? (content += '<p>Idrottsändamål</p>') : '';
                  getValues('andamalTerms.condition.led') ? (content += '<p>Led</p>') : '';
                  getValues('andamalTerms.condition.parkering') ? (content += '<p>Parkering</p>') : '';
                  getValues('andamalTerms.condition.skylt') ? (content += '<p>Skylt</p>') : '';
                  getValues('andamalTerms.condition.snotipp') ? (content += '<p>Snötipp</p>') : '';
                  getValues('andamalTerms.condition.tomtkomplement') ? (content += '<p>Tomtkomplement</p>') : '';
                  getValues('andamalTerms.condition.upplag') ? (content += '<p>Upplag</p>') : '';
                  getValues('andamalTerms.condition.uppstallning') ? (content += '<p>Uppställning</p>') : '';
                  getValues('andamalTerms.condition.ytjordvarme') ? (content += '<p>Ytjordvärme</p>') : '';
                  getValues('andamalTerms.condition.vag') ? (content += '<p>Väg</p>') : '';
                  getValues('andamalTerms.condition.atervinningsstation')
                    ? (content += '<p>Återvinningsstation</p>')
                    : '';
                  getValues('andamalTerms.condition.other') ? (content += '<p>XXXX</p>') : '';

                  // content += `<br />
                  // <strong>Förtydligande</strong><p>${getValues('andamalTerms.clarification')}</p><br />
                  // <p>Bygglov finns: ${getValues('andamalTerms.bygglovExists') ? 'Ja' : 'Nej'}</p>`;

                  getValues('andamalTerms.condition.consent')
                    ? (content += `<p>${getValues('andamalTerms.condition.consent').conditionText}</p>`)
                    : null;
                  getValues('andamalTerms.condition.detailedplan')
                    ? (content += `<p>${getValues('andamalTerms.condition.detailedplan').conditionText}</p>`)
                    : null;
                  setAndamal(content);
                  setShowAndamal(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="skog" className="w-full">
            <Input type="hidden" {...register('andamal')} />
            <div className="h-[42rem] -mb-48" data-cy="purpose-richtext-wrapper">
              <ContractTextEditorWrapper
                val={andamal}
                label="andamal"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setAndamal}
                readOnly={!editAndamal}
                editorRef={quillRefAndamal}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="calendar" />} />}
        data-cy="tenancy-period-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Arrendetid och uppsägning</h2>}
        // label={watch().arrendetid?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().arrendetid?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().arrendetid?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-arrendetid`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowArrendetid(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-tenancy-period"
              onChange={() => {
                setEditArrendetid(!editArrendetid);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showArrendetid}
            onClose={() => setShowArrendetid(false)}
            className="w-[56rem]"
            label={'Villkor för arrendetid och uppsägning'}
          >
            <Modal.Content>
              <div className="flex justify-between gap-32 items-end">
                <FormControl id="startDate" className="w-full">
                  <FormLabel>Området upplåts från</FormLabel>
                  <Input
                    type="date"
                    value={getValues().arrendetidTerms?.startDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setValue('arrendetidTerms.startDate', e.target.value);
                    }}
                  />
                </FormControl>
                <FormControl id="endDate" className="w-full">
                  <FormLabel>Området upplåts till</FormLabel>
                  <Input
                    type="date"
                    value={getValues().arrendetidTerms?.endDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setValue('arrendetidTerms.endDate', e.target.value);
                    }}
                  />
                </FormControl>
              </div>
              <div className="flex justify-between gap-32 items-end mb-md">
                <FormControl
                  id={`noticePeriod`}
                  className="flex-grow max-w-[45%]"
                  {...register('arrendetidTerms.monthsNotice')}
                >
                  <FormLabel>Ange uppsägningstid</FormLabel>
                  <Select className="w-full" onChange={(e) => setValue('arrendetidTerms.monthsNotice', e.target.value)}>
                    <Select.Option key="" value="">
                      Välj antal månader
                    </Select.Option>
                    <Select.Option value={1}>1</Select.Option>
                    <Select.Option value={2}>2</Select.Option>
                    <Select.Option value={3}>3</Select.Option>
                    <Select.Option value={6}>6</Select.Option>
                    <Select.Option value={12}>12</Select.Option>
                    <Select.Option value={24}>24</Select.Option>
                  </Select>
                </FormControl>
                <FormControl
                  id={`autoRenewal`}
                  className="flex-grow max-w-[45%]"
                  {...register('arrendetidTerms.autoRenewal')}
                >
                  <FormLabel>Ange tid för automatisk förlängning</FormLabel>
                  <Select className="w-full" onChange={(e) => setValue('arrendetidTerms.autoRenewal', e.target.value)}>
                    <Select.Option key="" value="">
                      Välj antal månader
                    </Select.Option>
                    <Select.Option value={1}>1</Select.Option>
                    <Select.Option value={2}>2</Select.Option>
                    <Select.Option value={3}>3</Select.Option>
                    <Select.Option value={6}>6</Select.Option>
                    <Select.Option value={12}>12</Select.Option>
                  </Select>
                </FormControl>
              </div>

              <Table dense background data-cy="buildPermits-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för arendetid och uppsägning</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'arrendetidTerms.condition.extension',
                      header: 'Information om automatisk förlängning',
                      conditionText:
                        'Om avtalet inte sägs upp förlängs arrendetiden automatiskt med XX månader i sänder med oförändrad uppsägningstid. Det betyder att om avtalet förlängs med ny arrendetid så ska avtalet sägas upp senast XX månader innan den nya arrendetidens utgång',
                    },
                    {
                      key: 'arrendetidTerms.condition.end',
                      header: 'Avtal upphör',
                      conditionText: 'Avtalet upphör vid avtalstidens utgång utan att uppsägning behöver ske.',
                    },
                    {
                      key: 'arrendetidTerms.condition.termination',
                      header: 'Skriftlig uppsägning',
                      conditionText: 'Uppsägning ska ske skriftligen.',
                    },
                  ].map(renderContractTermCheckboxList({ getValues, setValue, register }))}
                </Table.Body>
              </Table>

              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  let content = `<strong>Arrendetid och uppsägning</strong>
                  <p>Området upplåts ${getValues().arrendetidTerms?.startDate} till och med ${
                    getValues().arrendetidTerms?.endDate
                  }</p><br /> 
                  <p>Uppsägningstid: ${getValues().arrendetidTerms?.monthsNotice} ${
                    getValues().arrendetidTerms?.monthsNotice === '1' ? 'månad' : 'månader'
                  }</p>
                  <p>Uppsägningstiden är ömsesidig och avtalet ska sägas upp senast ${
                    getValues().arrendetidTerms?.monthsNotice
                  } ${
                    getValues().arrendetidTerms?.monthsNotice === '1' ? 'månad' : 'månader'
                  } före avtalstidens utgång.</p><br />
                  <p>Arrendetid vid förlängning: ${getValues().arrendetidTerms?.autoRenewal} månader</p><br />

                  <br />
                  ${
                    getValues('arrendetidTerms.condition.extension')
                      ? `<p>Om avtalet inte sägs upp förlängs arrendetiden automatiskt med ${
                          getValues().arrendetidTerms?.autoRenewal
                        } månader i sänder med oförändrad uppsägningstid. Det betyder att om avtalet förlängs med ny arrendetid så ska avtalet sägas upp senast ${
                          getValues().arrendetidTerms?.monthsNotice
                        } ${
                          getValues().arrendetidTerms?.monthsNotice === '1' ? 'månad' : 'månader'
                        } innan den nya arrendetidens utgång.</p>`
                      : ''
                  } 

                  <br /> 
                  ${
                    getValues('arrendetidTerms.condition.end')
                      ? `<p>${getValues('arrendetidTerms.condition.end').conditionText} </p><br />`
                      : ''
                  }
                  ${
                    getValues('arrendetidTerms.condition.termination')
                      ? `<p>${getValues('arrendetidTerms.condition.termination').conditionText} </p><br />`
                      : ''
                  }
                   `;
                  setArrendetid(content);
                  setShowArrendetid(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="skog" className="w-full">
            <Input type="hidden" {...register('arrendetid')} />
            <div className="h-[42rem] -mb-48" data-cy="tenancy-period-richtext-wrapper">
              <ContractTextEditorWrapper
                val={arrendetid}
                label="arrendetid"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setArrendetid}
                readOnly={!editArrendetid}
                editorRef={quillRefArrendetid}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="wallet" />} />}
        data-cy="lease-fee-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Arrendeavgift</h2>}
        // label={watch().arrendeavgift?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().arrendeavgift?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().arrendeavgift?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-arrendeavgift`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowArrendeavgift(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-lease-fee"
              onChange={() => {
                setEditArrendeavgift(!editArrendeavgift);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showArrendeavgift}
            onClose={() => setShowArrendeavgift(false)}
            label={'Villkor för arrendeavgift'}
            className="w-[56rem]"
          >
            <Modal.Content>
              <Table dense background data-cy="lease-fee-table">
                <Table.Header>
                  <Table.HeaderColumn>Villkor för arrendeavgift</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  <Table.Row data-cy="yearly-row">
                    <Table.Column className="!py-16 flex flex-col items-start justify-center !gap-18">
                      <FormControl>
                        <Checkbox
                          name="period"
                          value={'yearly'}
                          data-cy="yearly-row"
                          defaultChecked={getValues('arrendeavgiftTerms.yearly') === 'true'}
                          onChange={(e) => {
                            setValue(
                              'arrendeavgiftTerms.yearly',
                              getValues('arrendeavgiftTerms.yearly') === 'true' ? 'false' : 'true'
                            );
                          }}
                        >
                          <strong>Avgift per år</strong>
                        </Checkbox>
                      </FormControl>
                      <FormControl id="annualFee" className="flex-grow">
                        <FormLabel>Ange avgift per år</FormLabel>
                        <Input
                          type="text"
                          disabled={getValues('arrendeavgiftTerms.yearly') !== 'true'}
                          placeholder="SEK"
                          {...register('arrendeavgiftTerms.yearlyFee')}
                        />
                      </FormControl>
                    </Table.Column>
                  </Table.Row>
                  <Table.Row data-cy="byYear-row">
                    <Table.Column className="!py-16 flex flex-col items-start justify-center !gap-18">
                      <FormControl>
                        <Checkbox
                          name="period"
                          value={'byYear'}
                          data-cy="byYear-row"
                          defaultChecked={getValues('arrendeavgiftTerms.byYear') === 'true'}
                          onChange={(e) => {
                            setValue(
                              'arrendeavgiftTerms.byYear',
                              getValues('arrendeavgiftTerms.byYear') === 'true' ? 'false' : 'true'
                            );
                          }}
                        >
                          <strong>Avgift för årtal</strong>
                        </Checkbox>
                      </FormControl>
                      <div className="flex w-full justify-between">
                        <FormControl id="feeByYear" className="flex-grow max-w-[45%]">
                          <FormLabel>Ange avgift för årtal</FormLabel>
                          <Input
                            type="text"
                            disabled={getValues('arrendeavgiftTerms.byYear') !== 'true'}
                            placeholder="SEK"
                            {...register('arrendeavgiftTerms.feeByYear')}
                          />
                        </FormControl>
                        <FormControl id="associatedFeeYear" className="flex-grow max-w-[45%]">
                          <FormLabel>Ange årtal</FormLabel>
                          <Input
                            type="number"
                            disabled={getValues('arrendeavgiftTerms.byYear') !== 'true'}
                            {...register('arrendeavgiftTerms.associatedFeeYear')}
                          />
                        </FormControl>
                      </div>
                    </Table.Column>
                  </Table.Row>
                  <Table.Row data-cy="byLease-row">
                    <Table.Column className="!py-16 flex flex-col items-start justify-center !gap-18">
                      <FormControl>
                        <Checkbox
                          name="period"
                          value={'byLease'}
                          data-cy="byLease-row"
                          defaultChecked={getValues('arrendeavgiftTerms.byLease') === 'true'}
                          onChange={(e) => {
                            setValue(
                              'arrendeavgiftTerms.byLease',
                              getValues('arrendeavgiftTerms.byLease') === 'true' ? 'false' : 'true'
                            );
                          }}
                        >
                          <strong>Avgift för upplåtelsetid</strong>
                        </Checkbox>
                      </FormControl>
                      <FormControl id="feeByLease" className="flex-grow">
                        <FormLabel>Ange avgift för upplåtelsetid</FormLabel>
                        <Input
                          type="text"
                          disabled={getValues('arrendeavgiftTerms.byLease') !== 'true'}
                          placeholder="SEK"
                          {...register('arrendeavgiftTerms.feeByLease')}
                        />
                      </FormControl>
                    </Table.Column>
                  </Table.Row>
                  <Table.Row data-cy="previouslyPaid-row">
                    <Table.Column className="!py-16 flex flex-col items-start justify-center !gap-18">
                      <FormControl>
                        <Checkbox
                          name="period"
                          value={'previouslyPaid'}
                          data-cy="previouslyPaid-row"
                          defaultChecked={getValues('arrendeavgiftTerms.prepaid') === 'true'}
                          onChange={(e) => {
                            setValue(
                              'arrendeavgiftTerms.prepaid',
                              getValues('arrendeavgiftTerms.prepaid') === 'true' ? 'false' : 'true'
                            );
                          }}
                        >
                          <strong>För perioden 20XXx-xx – 20XX-xx-xx är avgiften erlagd av tidigare arrendator.</strong>
                        </Checkbox>
                      </FormControl>
                    </Table.Column>
                  </Table.Row>
                  <Table.Row data-cy="indexAdjustedFee-row">
                    <Table.Column className="!py-16 flex flex-col items-start justify-center !gap-18">
                      <FormControl>
                        <Checkbox
                          name="period"
                          value={'indexAdjustedFee'}
                          data-cy="indexAdjustedFee"
                          defaultChecked={false}
                          onChange={(e) => {
                            setValue(
                              'arrendeavgiftTerms.indexAdjustedFee',
                              getValues('arrendeavgiftTerms.indexAdjustedFee') === 'true' ? 'false' : 'true'
                            );
                          }}
                        >
                          <strong>Indexreglerad avgift</strong>
                        </Checkbox>
                      </FormControl>
                      <div className="flex justify-between gap-32 w-full">
                        <FormControl
                          id={`noticePeriod`}
                          className="flex-grow max-w-[45%]"
                          disabled={getValues('arrendeavgiftTerms.indexAdjustedFee') !== 'true'}
                          onChange={(e) => setValue('arrendeavgiftTerms.indexYear', e.target.value)}
                          // {...register('arrendeavgiftTerms.indexYear')}
                        >
                          <FormLabel>Välj årtal för beräkning</FormLabel>
                          <Select className="w-full">
                            <Select.Option key="" value="">
                              Välj årtal
                            </Select.Option>
                            <Select.Option value={2020}>2020</Select.Option>
                            <Select.Option value={2021}>2021</Select.Option>
                            <Select.Option value={2022}>2022</Select.Option>
                            <Select.Option value={2023}>2023</Select.Option>
                            <Select.Option value={2024}>2024</Select.Option>
                          </Select>
                        </FormControl>
                        <FormControl
                          id={`yearlyIndexAdjustedFee`}
                          className="flex-grow max-w-[45%]"
                          disabled={getValues('arrendeavgiftTerms.indexAdjustedFee') !== 'true'}
                        >
                          <FormLabel>Ange indexuppräkningstal</FormLabel>
                          <Input type="text" placeholder="SEK" {...register('arrendeavgiftTerms.indexFee')} />
                        </FormControl>
                      </div>
                    </Table.Column>
                  </Table.Row>
                </Table.Body>
              </Table>
              <FormControl id="paymentPeriod" className="my-sm">
                <FormLabel>Avgift ska betalas</FormLabel>
                <RadioButton.Group className="space-x-4" inline data-cy="paymentPeriod">
                  <RadioButton
                    name="paymentPeriod"
                    value="year"
                    defaultChecked={getValues('arrendeavgiftTerms.yearOrQuarter') === 'year'}
                    onChange={(e) => {
                      setValue('arrendeavgiftTerms.yearOrQuarter', 'year');
                    }}
                  >
                    Årsvis
                  </RadioButton>
                  <RadioButton
                    name="paymentPeriod"
                    value="quarter"
                    defaultChecked={getValues('arrendeavgiftTerms.yearOrQuarter') === 'quarter'}
                    onChange={(e) => {
                      setValue('arrendeavgiftTerms.yearOrQuarter', 'quarter');
                    }}
                  >
                    Kvartalsvis
                  </RadioButton>
                </RadioButton.Group>
              </FormControl>
              <FormControl id="paymentMode" className="my-sm">
                <FormLabel>Avgift ska erläggas</FormLabel>
                <RadioButton.Group className="space-x-4" inline data-cy="paymentMode">
                  <RadioButton
                    name="paymentMode"
                    value="pre"
                    defaultChecked={getValues('arrendeavgiftTerms.preOrPost') === 'pre'}
                    onChange={(e) => setValue('arrendeavgiftTerms.preOrPost', 'pre')}
                  >
                    I förskott
                  </RadioButton>
                  <RadioButton
                    name="paymentMode"
                    value="post"
                    defaultChecked={getValues('arrendeavgiftTerms.preOrPost') === 'post'}
                    onChange={(e) => setValue('arrendeavgiftTerms.preOrPost', 'post')}
                  >
                    I efterskott
                  </RadioButton>
                </RadioButton.Group>
              </FormControl>
              <Button
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  let content = ``;

                  getValues('arrendeavgiftTerms.yearly') === 'true' &&
                    (content += `<p>Avgift per år: ${getValues('arrendeavgiftTerms.yearlyFee')}</p><br />`);

                  getValues('arrendeavgiftTerms.byYear') === 'true' &&
                    (content += `<p>Avgift för årtal ${getValues(
                      'arrendeavgiftTerms.associatedFeeYear'
                    )} är ${getValues('arrendeavgiftTerms.feeByYear')}</p><br />`);

                  getValues('arrendeavgiftTerms.byLease') === 'true' &&
                    (content += `<p>Avgift för upplåtelsetid: ${getValues('arrendeavgiftTerms.feeByLease')}</p><br />`);

                  getValues('arrendeavgiftTerms.prepaid') === 'true' &&
                    (content += `<p>För perioden 20XXx-xx – 20XX-xx-xx är avgiften erlagd av tidigare arrendator.</p><br />`);

                  getValues('arrendeavgiftTerms.indexAdjustedFee') === 'true' &&
                    (content += `<p>Indexreglerad avgift: Ja</p><br />Avgiften ska i sin helhet indexregleras med hänsyn till konsumentprisindex (totalindex) enligt 1980 års indexserie. Basmånad för indexuppräkningen är oktober månad ${getValues(
                      'arrendeavgiftTerms.indexYear'
                    )} (indextal ${getValues(
                      'arrendeavgiftTerms.indexFee'
                    )}). Reglering av avgiften ska ske vid varje års början med hänsyn tagen till indextalet för oktober månad närmast årsskiftet. Avgiften ska dock aldrig sättas lägre än den i avtalet angivna grundavgiften.</p><br />`);

                  content += `<p>Avgiften ska erläggas ${
                    getValues('arrendeavgiftTerms.yearOrQuarter') === 'year' ? 'årsvis' : 'kvartalsvis'
                  } i ${getValues('arrendeavgiftTerms.preOrPost') === 'pre' ? 'förskott' : 'efterskott'}</p>`;

                  setArrendeavgift(content);
                  setShowArrendeavgift(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="skog" className="w-full">
            <Input type="hidden" {...register('arrendeavgift')} />
            <div className="h-[42rem] -mb-48" data-cy="lease-fee-richtext-wrapper">
              <ContractTextEditorWrapper
                val={arrendeavgift}
                label="arrendeavgift"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setArrendeavgift}
                readOnly={!editArrendeavgift}
                editorRef={quillRefArrendeavgift}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="shovel" />} />}
        data-cy="building-permits-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Bygglov och tillstånd</h2>}
        // label={watch().bygglov?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().bygglov?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().bygglov?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-bygglov`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowBygglov(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-building-permits"
              onChange={() => {
                setEditBygglov(!editBygglov);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showBygglov}
            onClose={() => setShowBygglov(false)}
            className="w-[56rem]"
            label={'Villkor för bygglov och tillstånd'}
          >
            <Modal.Content>
              <Table dense background data-cy="buildPermits-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för bygglov och tillstånd</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'bygglovTerms.condition.permitFees',
                      header: 'Arrendator står för tillståndskostnader',
                      conditionText:
                        'Arrendatorn är skyldig att skaffa och bekosta de tillstånd som krävs för verksamheten på området. Föreskrifter som meddelas av myndighet eller som följer av lag ska följas.',
                    },
                    {
                      key: 'bygglovTerms.condition.buildingOwnership',
                      header: 'Arrendator äger byggnader som står inom området',
                      conditionText:
                        'Arrendatorn äger byggnader som står inom området, bygglov beviljat enligt [[BYGG 20XX – XXXX]].',
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
                  <strong>Bygglov och tillstånd</strong><br /><br />
                  ${
                    getValues('bygglovTerms.condition.permitFees')
                      ? `<p><strong>${getValues('bygglovTerms.condition.permitFees').header}</strong></p><p>${
                          getValues('bygglovTerms.condition.permitFees').conditionText
                        }</p>`
                      : ''
                  }<br />
                  ${
                    getValues('bygglovTerms.condition.buildingOwnership')
                      ? `<p><strong>${getValues('bygglovTerms.condition.buildingOwnership').header}</strong></p><p>${
                          getValues('bygglovTerms.condition.buildingOwnership').conditionText
                        }</p>`
                      : ''
                  }<br />
                  `;

                  setBygglov(content);
                  setShowBygglov(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="skog" className="w-full">
            <Input type="hidden" {...register('bygglov')} />
            <div className="h-[42rem] -mb-48" data-cy="building-permits-richtext-wrapper">
              <ContractTextEditorWrapper
                val={bygglov}
                label="bygglov"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setBygglov}
                readOnly={!editBygglov}
                editorRef={quillRefBygglov}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="repeat" />} />}
        data-cy="assignment-subassignment-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Överlåtelse och underupplåtelse</h2>}
        // label={watch().overlatelse?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().overlatelse?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().overlatelse?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-subletting`);
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
              data-cy="manual-text-checkbox-assignment-subassignment"
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
            label={'Villkor för överlåtelse och underupplåtelse'}
          >
            <Modal.Content>
              <Table dense background data-cy="overlatelse-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för överlåtelse och underupplåtelse</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'overlatelseTerms.condition.subletting',

                      header: 'Överlåtelse och underupplåtelse',
                      conditionText:
                        'Arrendatorn får inte utan fastighetsägarens skriftliga godkännande överlåta eller på annat sätt överföra rättigheterna enligt detta avtal på annan.',
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
                    getValues().overlatelseTerms.condition.subletting
                      ? `<p>${getValues().overlatelseTerms.condition.subletting.header}</p><p>${
                          getValues().overlatelseTerms.condition.subletting.conditionText
                        }</p><br />`
                      : ''
                  }
                  
              `;

                  setOverlatelse(content);
                  setShowOverlatelse(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="overlatelse" className="w-full">
            <Input type="hidden" {...register('overlatelse')} />
            <div className="h-[42rem] -mb-48" data-cy="assignment-subassignment-richtext-wrapper">
              <ContractTextEditorWrapper
                val={overlatelse}
                label="overlatelse"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setOverlatelse}
                readOnly={!editOverlatelse}
                editorRef={quillRefOverlatelse}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        data-cy="enrollment-disclosure"
        icon={<Icon icon={<LucideIcon name="square-pen" />} />}
        header={<h2 className="text-h4-sm md:text-h4-md">Inskrivning</h2>}
        // label={watch().inskrivning?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().inskrivning?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().inskrivning?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-inskrivning`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Checkbox
              data-cy="manual-text-checkbox-enrollment"
              onChange={() => {
                setEditInskrivning(!editInskrivning);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <FormControl id="inskrivning" className="w-full">
            <Input type="hidden" {...register('inskrivning')} />
            <div className="h-[42rem] -mb-48" data-cy="enrollment-richtext-wrapper">
              <ContractTextEditorWrapper
                val={inskrivning}
                label="inskrivning"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setInskrivning}
                readOnly={!editInskrivning}
                editorRef={quillRefInskrivning}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="person-standing" />} />}
        data-cy="condition-care-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Skick och skötsel</h2>}
        // label={watch().skick?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().skick?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().skick?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-skick`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowSkick(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-condition-care"
              onChange={() => {
                setEditSkick(!editSkick);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showSkick}
            onClose={() => setShowSkick(false)}
            className="w-[56rem]"
            label={'Villkor för skick och skötsel'}
          >
            <Modal.Content>
              <Table dense background data-cy="conditionsCare-table">
                <Table.Header>
                  <Table.HeaderColumn>Villkor för skick och skötsel</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'skickTerms.condition.nuisance',
                      header: 'Ansvar för undvikande av olägenhet',
                      conditionText:
                        'Området upplåts i befintligt skick. Det åligger arrendatorn att hålla området i städat och vårdat skick och hålla god ordning i sin verksamhet inom området. Arrendatorn ska tillse att den verksamhet han bedriver inom området inte på något vis medför olägenhet för grannar eller någon annan samt för andra verksamheter i anslutning till området.',
                    },
                    {
                      key: 'skickTerms.condition.accessibility',
                      header: 'Skyldighet att upprätthålla framkomlighet för allmänheten',
                      conditionText:
                        'Arrendatorn är skyldig att bedriva sin verksamhet inom området så den inte hindrar allmänhetens framkomlighet intill arrendeområdet.',
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
                    getValues().skickTerms.condition.nuisance
                      ? `<p><strong>${getValues().skickTerms.condition.nuisance.header}</strong></p><p>${
                          getValues().skickTerms.condition.nuisance.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().skickTerms.condition.accessibility
                      ? `<p><strong>${getValues().skickTerms.condition.accessibility.header}</strong></p><p>${
                          getValues().skickTerms.condition.accessibility.conditionText
                        }</p><br />`
                      : ''
                  }
              `;

                  setSkick(content);
                  setShowSkick(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="skick" className="w-full">
            <Input type="hidden" {...register('skick')} />
            <div className="h-[42rem] -mb-48" data-cy="condition-care-richtext-wrapper">
              <ContractTextEditorWrapper
                val={skick}
                label="skick"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setSkick}
                readOnly={!editSkick}
                editorRef={quillRefSkick}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="slash" />} />}
        data-cy="wires-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Ledningar</h2>}
        // label={watch().ledningar?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().ledningar?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().ledningar?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-ledningar`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowLedningar(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-wires"
              onChange={() => {
                setEditLedningar(!editLedningar);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showLedningar}
            onClose={() => setShowLedningar(false)}
            className="w-[56rem]"
            label={'Villkor för Ledningar'}
          >
            <Modal.Content>
              <Table dense background data-cy="wires-table">
                <Table.Header>
                  <Table.HeaderColumn>Villkor för Ledningar</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'ledningarTerms.condition.ledningar',

                      header: 'Rätt till Ledningsunderhåll utan Ersättning',
                      conditionText:
                        'Fastighetsägaren förbehåller sig, och annan som får hans medgivande, rätt att anlägga och bibehålla luft- och markförlagda ledningar samt kablar på området. Fastighetsägaren har rätt att få tillträde till området för underhåll av sådana ledningar och kablar. Arrendatorn är skyldig att tåla detta intrång utan ersättning.',
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
                    getValues().ledningarTerms.condition.ledningar
                      ? `<p><strong>${getValues().ledningarTerms.condition.ledningar.header}</strong></p><p>${
                          getValues().ledningarTerms.condition.ledningar.conditionText
                        }</p><br />`
                      : ''
                  }

              `;

                  setLedningar(content);
                  setShowLedningar(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="inskrivning" className="w-full">
            <Input type="hidden" {...register('ledningar')} />
            <div className="h-[42rem] -mb-48" data-cy="wires-richtext-wrapper">
              <ContractTextEditorWrapper
                val={ledningar}
                label="ledningar"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setLedningar}
                readOnly={!editLedningar}
                editorRef={quillRefLedningar}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="calculator" />} />}
        data-cy="costs-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Kostnader</h2>}
        // label={watch().kostnader?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().kostnader?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().kostnader?.length > 0}
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
              onClick={() => setShowKostnader(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-costs"
              onChange={() => {
                setEditKostnader(!editKostnader);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showKostnader}
            onClose={() => setShowKostnader(false)}
            className="w-[56rem]"
            label={'Villkor för kostnader'}
          >
            <Modal.Content>
              <Table dense background data-cy="costs-table">
                <Table.Header>
                  <Table.HeaderColumn>Villkor för kostnader</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'kostnaderTerms.condition.kostnader',

                      header:
                        'Arrendatorn ansvarar för avgifter, drift och övriga kostnader som krävs för områdets nyttjande.',
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
                    getValues().kostnaderTerms.condition.kostnader
                      ? `<p>${getValues().kostnaderTerms.condition.kostnader.header}</p><p>${
                          getValues().kostnaderTerms.condition.kostnader.conditionText
                        }</p><br />`
                      : ''
                  }

              `;

                  setKostnader(content);
                  setShowKostnader(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="kostnader" className="w-full">
            <Input type="hidden" {...register('kostnader')} />
            <div className="h-[42rem] -mb-48" data-cy="costs-richtext-wrapper">
              <ContractTextEditorWrapper
                val={kostnader}
                label="kostnader"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setKostnader}
                readOnly={!editKostnader}
                editorRef={quillRefKostnader}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="mountain-snow" />} />}
        data-cy="soil-pollution-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Markföroreningar</h2>}
        // label={watch().markfororeningar?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().markfororeningar?.length > 0 ? 'success' : `warning`}
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
            label={'Villkor för skog'}
          >
            <Modal.Content>
              <Table dense background data-cy="soilPollution-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för skog</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'markfororeningarTerms.condition.pollutionAvoidance',
                      header: 'Ansvar för undvikande av föroreningar enligt Miljöbalken',
                      conditionText:
                        'Arrendatorn påminns om att som verkamhetsutövare är det dennes ansvar, enligt miljöbalkens bestämmelser, att tillse att ev. schaktmassor eller annat material som tillförs området inte innehåller någon förorening till skada för mark och vatten.',
                    },
                    {
                      key: 'markfororeningarTerms.condition.verificationResponsibility',
                      header: 'Ansvar för verifiering av föroreningsfri mark',
                      conditionText:
                        'Arrendatorn ansvarar att på egen bekostnad och genom markundersökningar kunna verifiera att området lämnas fritt från markföroreningar.',
                    },
                    {
                      key: 'markfororeningarTerms.condition.testDone',
                      header: 'Miljöprovtagning och rapport',
                      conditionText:
                        'Miljöprovtagning av området är utförd [[2024-XX-XX]]. Arrendatorn har tagit del av provtagningsrapporten.',
                    },
                    {
                      key: 'markfororeningarTerms.condition.testingAtEnd',
                      header: 'Krav på miljöprovtagning och provtagningplan vid avtalets upphörande',
                      conditionText:
                        'Det är arrendatorns skyldighet att visa att området lämnas fritt från föroreningar. Miljöprovtagning av området ska utföras i samband med att arrendet upphör om fastighetsägaren så kräver. En provtagningsplan ska inlämnas till fastighetsägaren för godkännande innan provtagning sker. Provtagningen bekostas av arrendatorn.',
                    },
                    {
                      key: 'markfororeningarTerms.condition.testingAtTransfer',
                      header: 'Rekommendation om provtagning vid tillträde',
                      conditionText:
                        'Fastighetsägaren rekommenderar att en provtagning av området görs vid tillträdet. En provtagningsplan ska inlämnas till fastighetsägaren för godkännande innan provtagning sker. Provtagningen bekostas av arrendatorn.',
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
                    getValues().markfororeningarTerms.condition.pollutionAvoidance
                      ? `<p><strong>${
                          getValues().markfororeningarTerms.condition.pollutionAvoidance.header
                        }</strong></p><p>${
                          getValues().markfororeningarTerms.condition.pollutionAvoidance.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().markfororeningarTerms.condition.verificationResponsibility
                      ? `<p><strong>${
                          getValues().markfororeningarTerms.condition.verificationResponsibility.header
                        }</strong></p><p>${
                          getValues().markfororeningarTerms.condition.verificationResponsibility.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().markfororeningarTerms.condition.testDone
                      ? `<p><strong>${getValues().markfororeningarTerms.condition.testDone.header}</strong></p><p>${
                          getValues().markfororeningarTerms.condition.testDone.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().markfororeningarTerms.condition.testingAtEnd
                      ? `<p><strong>${getValues().markfororeningarTerms.condition.testingAtEnd.header}</strong></p><p>${
                          getValues().markfororeningarTerms.condition.testingAtEnd.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().markfororeningarTerms.condition.testingAtTransfer
                      ? `<p><strong>${
                          getValues().markfororeningarTerms.condition.testingAtTransfer.header
                        }</strong></p><p>${
                          getValues().markfororeningarTerms.condition.testingAtTransfer.conditionText
                        }</p><br />`
                      : ''
                  }
                  `;

                  setMarkfororeningar(content);
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
                setState={setMarkfororeningar}
                readOnly={!editMarkfororeningar}
                editorRef={quillRefMarkfororeningar}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="undo" />} />}
        data-cy="termination-reinstatement-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Upphörande och återställning</h2>}
        // label={watch().upphorande?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().upphorande?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().upphorande?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-upphorande`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowUpphorande(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-termination-reinstatement"
              onChange={() => {
                setEditUpphorande(!editUpphorande);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showUpphorande}
            onClose={() => setShowUpphorande(false)}
            className="w-[56rem]"
            label={'Villkor för upphörande och återställning'}
          >
            <Modal.Content>
              <Table dense background data-cy="terminationReinstatement-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för upphörande och återställning</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'upphorandeTerms.condition.restorationCleaning',
                      header: 'Återställning och städning',
                      conditionText:
                        'Vid avtalets upphörande ska arrendatorn lämna området väl avstädat och återställt i skick som kan godkännas av fastighetsägaren. Om så inte sker kommer fastighetsägaren att ombesörja avstädningen på arrendatorns bekostnad. Detta gäller även om arrendatorn har flyttat från adressen som angivits i detta avtal.',
                    },
                    {
                      key: 'upphorandeTerms.condition.restorationBuildingRemoval',
                      header: 'Återställning och borttagning av byggnader',
                      conditionText:
                        'Vid avtalets upphörande ska arrendatorn lämna området väl avstädat och återställt i skick som kan godkännas av fastighetsägaren. Alla byggnader/anläggningar inom området ska tas bort. Om så inte sker kommer fastighetsägaren att ombesörja avstädningen på arrendatorns bekostnad. Detta gäller även om arrendatorn har avflyttat från den i detta avtal angivna adressen',
                    },
                    {
                      key: 'upphorandeTerms.condition.noRefundLeaseFee',
                      header: 'Ingen återbetalning av arrendeavgift vid förtida upphörande',
                      conditionText:
                        'Om arrendeavtalet upphör i förtid, oavsett anledning, återbetalas inte erlagd arrendeavgift understigande 750 kr',
                      /*extraField: {
                        key: 'upphorandeTerms.noRefundLeaseFeeAmount',
                        placeholder: 'SEK',
                        header: 'Ange belopp för återbetalning',
                      },*/
                    },
                    {
                      key: 'upphorandeTerms.condition.inspectionRequirements',
                      header: 'Besiktningskrav och friskrivning av ersättningsskyldighet',
                      conditionText:
                        'När avtalet upphör ska arrendatorn kalla fastighetsägaren till besiktning av området. Fastighetsägaren friskriver sig från eventuell skyldighet att vid avtalets upphörande ersätta arrendatorn dels med annat markområde, dels för kostnader som arrendatorn nedlagt inom området',
                    },
                    {
                      key: 'upphorandeTerms.condition.inspectionLandWater',
                      header: 'Besiktning och friskrivning för mark- och vattenområden',
                      conditionText:
                        'Vid avtalets upphörande ska arrendatorn kalla fastighetsägaren till besiktning av området. Fastighetsägaren friskriver sig från eventuell skyldighet att vid avtalets upphörande ersätta arrendatorn dels med annat mark- och vattenområde, dels för kostnader som arrendatorn nedlagt inom området',
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
                    getValues().upphorandeTerms.condition.restorationCleaning
                      ? `<p><strong>${
                          getValues().upphorandeTerms.condition.restorationCleaning.header
                        }</strong></p><p>${
                          getValues().upphorandeTerms.condition.restorationCleaning.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().upphorandeTerms.condition.restorationBuildingRemoval
                      ? `<p><strong>${
                          getValues().upphorandeTerms.condition.restorationBuildingRemoval.header
                        }</strong></p><p>${
                          getValues().upphorandeTerms.condition.restorationBuildingRemoval.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().upphorandeTerms.condition.noRefundLeaseFee
                      ? `<p><strong>${getValues().upphorandeTerms.condition.noRefundLeaseFee.header}</strong></p><p>${
                          getValues().upphorandeTerms.condition.noRefundLeaseFee.conditionText
                        }</p><br />
                      ${
                        getValues().upphorandeTerms.noRefundLeaseFeeAmount
                          ? `<p><strong>Belopp för återbetalning:</strong> ${
                              getValues().upphorandeTerms.noRefundLeaseFeeAmount
                            }</p><br />`
                          : ''
                      }
                        `
                      : ''
                  }
                  ${
                    getValues().upphorandeTerms.condition.inspectionRequirements
                      ? `<p><strong>${
                          getValues().upphorandeTerms.condition.inspectionRequirements.header
                        }</strong></p><p>${
                          getValues().upphorandeTerms.condition.inspectionRequirements.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().upphorandeTerms.condition.inspectionLandWater
                      ? `<p><strong>${
                          getValues().upphorandeTerms.condition.inspectionLandWater.header
                        }</strong></p><p>${
                          getValues().upphorandeTerms.condition.inspectionLandWater.conditionText
                        }</p><br />`
                      : ''
                  }
                  `;

                  setUpphorande(content);
                  setShowUpphorande(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="upphorande" className="w-full">
            <Input type="hidden" {...register('upphorande')} />
            <div className="h-[42rem] -mb-48" data-cy="termination-reinstatement-richtext-wrapper">
              <ContractTextEditorWrapper
                val={upphorande}
                label="upphorande"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setUpphorande}
                readOnly={!editUpphorande}
                editorRef={quillRefUpphorande}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="clipboard-list" />} />}
        data-cy="damages-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Skada och ansvar</h2>}
        // label={watch().skadaansvar?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().skadaansvar?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().skadaansvar?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-damages`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowSkadaansvar(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-damages"
              onChange={() => {
                setEditSkadaansvar(!editSkadaansvar);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showSkadaansvar}
            onClose={() => setShowSkadaansvar(false)}
            className="w-[56rem]"
            label={'Villkor för skada och ansvar'}
          >
            <Modal.Content>
              <Table dense background data-cy="damages-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för skada och ansvar</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'skadaansvarTerms.condition.skadeaterstallning',
                      header: 'Skadeåterställning och kostnadsansvar för arrendatorn',
                      conditionText:
                        'Arrendatorn ska för det fall det uppstår skador till följd av arrendatorns nyttjande av området ombesörja och bekosta återställande av skador. Fastighetsägaren äger annars rätt att vidta nödvändiga åtgärder på arrendatorns bekostnad.',
                    },
                    {
                      key: 'skadaansvarTerms.condition.skadestandsskyldighet',
                      header: 'Skadeståndsskyldighet och skydd mot tredjepartsanspråk för arrendatorn',
                      conditionText:
                        'Arrendatorn ska hålla fastighetsägaren fullt ut skadeslös för eventuella krav eller anspråk från myndighet eller tredje man till följd av den verksamhet arrendatorn bedriver på området, inklusive ansvar avseende miljöskada.',
                    },
                    {
                      key: 'skadaansvarTerms.condition.befrielse',
                      header: 'Befrielse från ansvar för fastighetsägaren vid myndighetsåtgärder',
                      conditionText:
                        'Fastighetsägaren svarar inte för olägenhet eller kostnader som orsakas arrendatorn till följd av myndighetsåtgärder eller liknande.',
                    },
                    {
                      key: 'skadaansvarTerms.condition.begransning',
                      header: 'Begränsning av fastighetsägarens ansvar för skador och krav mot arrendatorn',
                      conditionText:
                        'Fastighetsägaren är inte ansvarig för skada på arrendestället eller arrendatorn tillhörig egendom som orsakas av markens beskaffenhet, grundvattenförändringar, tredje man eller allmänheten. Om krav skulle riktas mot arrendatorns verksamhet ska arrendatorn skyndsamt underrätta fastighetsägaren om detta.',
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
                    getValues().skadaansvarTerms.condition.skadeaterstallning
                      ? `<p><strong>${
                          getValues().skadaansvarTerms.condition.skadeaterstallning.header
                        }</strong></p><p>${
                          getValues().skadaansvarTerms.condition.skadeaterstallning.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().skadaansvarTerms.condition.skadestandsskyldighet
                      ? `<p><strong>${
                          getValues().skadaansvarTerms.condition.skadestandsskyldighet.header
                        }</strong></p><p>${
                          getValues().skadaansvarTerms.condition.skadestandsskyldighet.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().skadaansvarTerms.condition.befrielse
                      ? `<p><strong>${getValues().skadaansvarTerms.condition.befrielse.header}</strong></p><p>${
                          getValues().skadaansvarTerms.condition.befrielse.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().skadaansvarTerms.condition.begransning
                      ? `<p><strong>${getValues().skadaansvarTerms.condition.begransning.header}</strong></p><p>${
                          getValues().skadaansvarTerms.condition.begransning.conditionText
                        }</p><br />`
                      : ''
                  }
                  `;

                  setSkadaansvar(content);
                  setShowSkadaansvar(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="skadaansvar" className="w-full">
            <Input type="hidden" {...register('skadaansvar')} />
            <div className="h-[42rem] -mb-48" data-cy="damages-richtext-wrapper">
              <ContractTextEditorWrapper
                val={skadaansvar}
                label="skadaansvar"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setSkadaansvar}
                readOnly={!editSkadaansvar}
                editorRef={quillRefSkadaansvar}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>

      <Disclosure
        icon={<Icon icon={<LucideIcon name="file-plus-2" />} />}
        data-cy="additional-terms-disclosure"
        header={
          <h2 className="text-h4-sm md:text-h4-md">
            {existingContract?.additionalTerms?.[0]?.header
              ? existingContract?.additionalTerms?.[0]?.header
              : 'Övriga villkor'}{' '}
          </h2>
        }
        // label={watch().skadaansvar?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().additionalTerms?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().additionalTerms?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-damages`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18">
            <FormControl className="flex w-full gap-18">
              <FormLabel>Rubrik</FormLabel>
              <Input
                {...register('additionalTerms.0.header')}
                className="mb-16"
                data-cy="additional-terms-heading"
              ></Input>
            </FormControl>
          </div>

          <FormControl id="additionalTerms" className="w-full">
            <Input type="hidden" {...register('additionalTerms')} />
            <div className="h-[42rem] -mb-48" data-cy="additional-terms-richtext-wrapper">
              <ContractTextEditorWrapper
                val={getValues('additionalTerms.0.terms.0.term')}
                label="additionalTerms.0.terms.0.term"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setAdditionalTerms}
                readOnly={false}
                editorRef={quillRefAdditionalTerms}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>

      <Disclosure
        icon={<Icon icon={<LucideIcon name="file-plus-2" />} />}
        data-cy="special-provisions-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Särskilda bestämmelser</h2>}
        // label={watch().sarskilda?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().sarskilda?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().sarskilda?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-special`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowSarskilda(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-special-provisions"
              onChange={() => {
                setEditSarskilda(!editSarskilda);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showSarskilda}
            onClose={() => setShowSarskilda(false)}
            className="w-[56rem]"
            label={'Villkor för särskilda bestämmelser'}
          >
            <Modal.Content>
              <Table dense background data-cy="special-provisions-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj villkor för särskilda bestämmelser</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'sarskildaTerms.condition.sarskilda',

                      header: 'Området får inte inhägnas eller bebyggas med någon form av byggnader.',
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
                    getValues().sarskildaTerms.condition.sarskilda
                      ? `<p>${getValues().sarskildaTerms.condition.sarskilda.header}</p><p>${
                          getValues().sarskildaTerms.condition.sarskilda.conditionText
                        }</p><br />`
                      : ''
                  }
                  `;
                  setSarskilda(content);
                  setShowSarskilda(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="sarskilda" className="w-full">
            <Input type="hidden" {...register('sarskilda')} />
            <div className="h-[42rem] -mb-48" data-cy="special-provisions-richtext-wrapper">
              <ContractTextEditorWrapper
                val={sarskilda}
                label="sarskilda"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setSarskilda}
                readOnly={!editSarskilda}
                editorRef={quillRefSarskilda}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="file-plus-2" />} />}
        data-cy="soilbeam-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Hänvisning till Jordabalken</h2>}
        // label={watch().jordabalken?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().jordabalken?.length > 0 ? 'success' : `warning`}
        initalOpen={watch().jordabalken?.length > 0}
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-jordabalk`);
        }}
      >
        <div className="flex flex-col gap-16">
          <div className="flex gap-18 justify-start">
            <Button
              color="vattjom"
              inverted={true}
              rightIcon={<LucideIcon name="pen" />}
              onClick={() => setShowJordabalken(true)}
            >
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-soilbeam"
              onChange={() => {
                setEditJordabalken(!editJordabalken);
              }}
            >
              Redigera text manuellt
            </Checkbox>
          </div>
          <Modal
            show={showJordabalken}
            onClose={() => setShowJordabalken(false)}
            className="w-[56rem]"
            label={'Hänvisning till Jordabalken'}
          >
            <Modal.Content>
              <Table dense background data-cy="soilbeam-table">
                <Table.Header>
                  <Table.HeaderColumn>Välj hänvisning till Jordabalken</Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {[
                    {
                      key: 'jordabalkenTerms.condition.jordabalken',

                      header: 'I övrigt gäller vad som stadgas i 7 eller 8 kap jordabalken om lägenhetsarrende.',
                      conditionText: '',
                    },
                    {
                      key: 'jordabalkenTerms.condition.replaces',

                      header:
                        'Detta avtal ersätter fr.o.m. 20XX-XX-XX det mellan parterna tidigare träffade avtalet daterat 1988-01-01 samt tillägg daterat 19XX-XX-XX.',
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
                    getValues().jordabalkenTerms.condition.jordabalken
                      ? `<p>${getValues().jordabalkenTerms.condition.jordabalken.header}</p><p>${
                          getValues().jordabalkenTerms.condition.jordabalken.conditionText
                        }</p><br />`
                      : ''
                  }
                  ${
                    getValues().jordabalkenTerms.condition.replaces
                      ? `<p>${getValues().jordabalkenTerms.condition.replaces.header}</p><p>${
                          getValues().jordabalkenTerms.condition.replaces.conditionText
                        }</p><br />`
                      : ''
                  }
                  `;
                  setJordabalken(content);
                  setShowJordabalken(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="jordabalken" className="w-full">
            <Input type="hidden" {...register('jordabalken')} />
            <div className="h-[42rem] -mb-48" data-cy="soilbeam-richtext-wrapper">
              <ContractTextEditorWrapper
                val={jordabalken}
                label="jordabalken"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setJordabalken}
                readOnly={!editJordabalken}
                editorRef={quillRefJordabalken}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
      <Disclosure
        icon={<Icon icon={<LucideIcon name="pen" />} />}
        data-cy="signature-disclosure"
        header={<h2 className="text-h4-sm md:text-h4-md">Underskrifter</h2>}
        // label={watch().jordabalken?.length > 0 ? <LucideIcon size={18} name="check" /> : ''}
        labelColor={watch().signature?.length > 0 ? 'success' : `warning`}
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
              Fyll i villkor
            </Button>
            <Checkbox
              data-cy="manual-text-checkbox-signature"
              onChange={() => {
                setEditSignature(!editSignature);
              }}
            >
              Redigera text manuellt
            </Checkbox>
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
                          {getStakeholderRelation(b) ? `(${Relation[getStakeholderRelation(b)]})` : ''}
                        </Table.Column>
                      </Table.Row>
                    ))}
                  </>
                </Table.Body>
              </Table>

              <FormControl id="areaSize" className="w-full">
                <FormLabel>Ange antal av extra underskriftsrader</FormLabel>
                <Input
                  type="number"
                  value={getValues().signatureTerms.condition.emptyRow?.conditionText}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setValue('signatureTerms.condition.emptyRow.conditionText', e.target.value);
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

                  signatures.forEach((signature, idx) => {
                    let stakeholder = errand.stakeholders.find((temp) => temp.id === signature);
                    content += `
                        <p><b>${
                          getStakeholderRelation(stakeholder) ? Relation[getStakeholderRelation(stakeholder)] : ''
                        }</b></p>
                        <p>${
                          stakeholder.firstName
                            ? `${stakeholder.firstName} ${stakeholder.lastName}`
                            : `${stakeholder.organizationName}`
                        }</p>
                        <br>
                        <br>
                        <p>Ort och datum:</p>
                        <br>
                        <p>........................................................................................................</p>
                        <br><br>
                        `;
                  });

                  let emptySignatures = parseInt(getValues().signatureTerms.condition.emptyRow?.conditionText);
                  for (let i = 0; i < emptySignatures; i++) {
                    content += `
                  <p><b></b></p>
                  <p></p>
                  <br>
                  <br>
                  <p>Ort och datum:</p>
                  <br>
                  <p>........................................................................................................</p>
                  <br><br>
                  `;
                  }

                  setSignature(content);
                  setShowSignature(false);
                }}
              >
                Importera
              </Button>
            </Modal.Content>
          </Modal>
          <FormControl id="signature" className="w-full">
            <Input type="hidden" {...register('signature')} />
            <div className="h-[42rem] -mb-48" data-cy="signature-richtext-wrapper">
              <ContractTextEditorWrapper
                val={signature}
                label="signature"
                setDirty={setTextIsDirty}
                setValue={setValue}
                trigger={trigger}
                setState={setSignature}
                readOnly={!editSignature}
                editorRef={quillRefSignature}
              />
            </div>
          </FormControl>
          {saveButton()}
        </div>
      </Disclosure>
    </>
  );
};
