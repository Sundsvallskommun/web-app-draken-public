import { DecisionOutcome, DecisionOutcomeKey, DecisionOutcomeLabel } from '@casedata/interfaces/decision';
import { GenericExtraParameters } from '@casedata/interfaces/extra-parameters';
import { CreateStakeholderDto } from '@casedata/interfaces/stakeholder';
import {
  beslutsmallMapping,
  getFinalDecisonWithHighestId,
  renderBeslutPdf,
  renderHtml,
  saveDecision,
} from '@casedata/services/casedata-decision-service';
import {
  getErrand,
  isErrandLocked,
  triggerErrandPhaseChange,
  updateErrandStatus,
  validateAction,
} from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@common/contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

import { IErrand } from '@casedata/interfaces/errand';
import { ErrandPhase } from '@casedata/interfaces/errand-phase';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { KopeAvtalsData } from '@casedata/interfaces/kopeavtals-data';
import { LagenhetsArrendeData } from '@casedata/interfaces/lagenhetsarrende-data';
import { Role } from '@casedata/interfaces/role';
import { validateAttachmentsForDecision } from '@casedata/services/casedata-attachment-service';
import { validateErrandForDecision, validateStatusForDecision } from '@casedata/services/casedata-errand-service';
import { sendDecisionMessage, sendMessage } from '@casedata/services/casedata-message-service';
import {
  getOwnerStakeholder,
  validateOwnerForSendingDecision,
  validateOwnerForSendingDecisionByEmail,
  validateOwnerForSendingDecisionByLetter,
} from '@casedata/services/casedata-stakeholder-service';
import { getErrandContract } from '@casedata/services/contract-service';
import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import { MessageClassification } from '@common/interfaces/message';
import { User } from '@common/interfaces/user';
import { isMEX, isPT } from '@common/services/application-service';
import { base64Decode } from '@common/services/helper-service';
import sanitized from '@common/services/sanitizer-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  Dialog,
  Divider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Select,
  Spinner,
  cx,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { CasedataMessageTabFormModel } from '../messages/message-composer.component';

export type ContactMeans = 'webmessage' | 'email' | 'digitalmail' | false;

export interface DecisionFormModel {
  id?: number;
  errandId?: number;
  errandNumber?: string;
  description: string;
  descriptionPlaintext: string;
  law: {};
  decisionTemplate: string;
  outcome: string;
  validFrom: string;
  validTo: string;
  decidedBy: CreateStakeholderDto;
  extraParameters?: GenericExtraParameters;
}

let formSchema = yup
  .object({
    id: yup.mixed(),
    description: yup.string(),
    descriptionPlaintext: yup.string(),
    errandId: yup.number(),
    law: yup.mixed(),
    outcome: yup
      .string()
      .required('Förslag till beslut måste anges')
      .test('outcomecheck', 'Förslag till beslut måste anges', (outcome) => {
        return outcome !== 'Välj beslut';
      }),
    validFrom: isPT()
      ? yup
          .date()
          .when('outcome', {
            is: (outcome: string) => outcome === 'Bifall',
            then: yup.date().typeError('Giltig från måste anges').required('Giltig från måste anges'),
          })
          .default(() => new Date())
      : yup.string(),
    validTo: isPT()
      ? yup
          .date()
          .when('outcome', {
            is: (outcome: string) => {
              return outcome === 'Bifall';
            },
            then: yup.date().required('Giltig till måste anges'),
          })
          .when('validFrom', {
            is: (validFrom: string) => !!validFrom,
            then: yup
              .date()
              .typeError('Giltig till måste anges')
              .min(yup.ref('validFrom'), 'Slutdatum måste vara efter startdatum'),
          })
      : yup.string(),
  })
  .required();

export const CasedataDecisionTab: React.FC<{
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = (props) => {
  const {
    municipalityId,
    user,
    errand,
    setErrand,
  }: { municipalityId: string; user: User; errand: IErrand; setErrand: (e: IErrand) => void } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveAndSendLoading, setIsSaveAndSendLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [selectedBeslut, setselectedBeslut] = useState<number>(1);
  const [textIsDirty, setTextIsDirty] = useState(false);
  const [richText, setRichText] = useState<string>('');
  const [error, setError] = useState<string>();
  const [selectedLaw, setSelectedLaw] = useState<number>(1);
  const quillRef = useRef(null);
  const saveConfirm = useConfirm();
  const toastMessage = useSnackbar();
  const [allowed, setAllowed] = useState(false);
  const [lawHeading, setLawHeading] = useState<string>('');
  const [existingContract, setExistingContract] = useState<KopeAvtalsData | LagenhetsArrendeData>(undefined);
  const [controlContractIsOpen, setControlContractIsOpen] = useState(false);

  const lawMapping = [
    {
      id: 1,
      heading: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
      sfs: 'Trafikförordningen (1998:1276)',
      chapter: '13',
      article: '8',
    },
  ];

  useEffect(() => {
    if (lawHeading) {
      setValue(
        'law',
        lawMapping.filter((law) => {
          return law.heading === lawHeading;
        })
      );
    }
  }, [lawHeading]);

  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    trigger,
    formState,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<DecisionFormModel>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      id: undefined,
      description: '',
      errandId: errand.id,
      errandNumber: errand.errandNumber,
      law: [lawMapping[0]],
      decisionTemplate: isPT() ? '' : beslutsmallMapping[0].label,
      outcome: 'Välj beslut',
      validFrom: '',
      validTo: '',
    },
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const description = watch().description;
  const outcome = watch().outcome as DecisionOutcome;
  const validFrom = watch().validFrom;
  const validTo = watch().validTo;

  useEffect(() => {
    if (errand) {
      getErrandContract(errand)
        .then((res) => {
          if (res) {
            setExistingContract(res);
          }
        })
        .catch(console.error);
    }
  }, [errand]);

  useEffect(() => {
    props.setUnsaved(formState.isDirty);
  }, [description, outcome, validFrom, validTo]);

  const triggerPhaseChange = () => {
    return triggerErrandPhaseChange(municipalityId, errand.id.toString())
      .then(() => getErrand(municipalityId, errand.id.toString()))
      .then((res) => setErrand(res.errand))
      .then(() => {
        setIsLoading(false);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Fasbytet inleddes',
          status: 'success',
        });
        setIsLoading(false);
      })
      .catch(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när fasbytet inleddes',
          status: 'error',
        });
        setIsLoading(false);
      });
  };

  const save = async (data: DecisionFormModel) => {
    try {
      setIsLoading(true);
      const rendered = await renderBeslutPdf(errand, data);
      const saved = await saveDecision(municipalityId, errand, data, 'FINAL', rendered.pdfBase64);
      setIsLoading(false);
      setError(undefined);
      props.setUnsaved(false);
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Beslutet sparades',
        status: 'success',
      });
      await getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: error.message,
        status: 'error',
      });
    } finally {
      setIsLoading(false);
      setError(undefined);
    }
  };

  const saveAndSend = async (data: DecisionFormModel) => {
    try {
      data.outcome = DecisionOutcomeKey[data.outcome];
      data.decidedBy = {
        type: 'PERSON',
        roles: [Role.ADMINISTRATOR],
        contactInformation: [
          {
            contactType: 'EMAIL',
            value: user.email,
          },
        ],
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ')[1],
        adAccount: user.username,
      } as CreateStakeholderDto;
      setIsSaveAndSendLoading(true);
      const rendered = await renderBeslutPdf(errand, data);
      const saved = await saveDecision(municipalityId, errand, data, 'FINAL', rendered.pdfBase64);
      const renderedHtml = await renderHtml(errand, data, 'decision');
      const owner = getOwnerStakeholder(errand);
      const recipient = owner?.emails?.[0]?.value;
      if (!recipient) {
        throw new Error('Ingen mottagare hittades');
      }
      const contactMeans: ContactMeans = errand.externalCaseId
        ? 'webmessage'
        : validateOwnerForSendingDecisionByEmail(errand)
        ? 'email'
        : validateOwnerForSendingDecisionByLetter(errand)
        ? 'digitalmail'
        : false;
      if (!contactMeans) {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Ärendeägaren har inga godkända kontaktsätt',
          status: 'error',
        });
        return;
      }
      const messageBody: CasedataMessageTabFormModel = {
        contactMeans,
        messageClassification: MessageClassification.Informationsmeddelande,
        emails: [{ value: recipient }],
        newEmail: '',
        phoneNumbers: [],
        newPhoneNumber: '',
        messageAttachments: [],
        messageBody: base64Decode(renderedHtml.htmlBase64),
        messageBodyPlaintext: data.descriptionPlaintext,
        attachUtredning: false,
        existingAttachments: [],
        addExisting: '',
        newAttachments: [],
        newItem: undefined,
        headerReplyTo: '',
        headerReferences: '',
      };
      const sentMessage = isMEX()
        ? await sendMessage(municipalityId, errand, messageBody)
        : isPT()
        ? await sendDecisionMessage(municipalityId, errand)
        : () => {
            throw new Error('Kontaktsätt saknas');
          };
      const updatedStatus = await updateErrandStatus(municipalityId, errand.id.toString(), ErrandStatus.Beslutad);
      const phaseChange = await triggerPhaseChange();
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Beslutet skickades',
        status: 'success',
      });
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: error.message,
        status: 'error',
      });
    } finally {
      setIsSaveAndSendLoading(false);
    }
  };

  const getPdfPreview = async () => {
    const createAndClickLink = (d: { pdfBase64: string; error?: string }) => {
      if (typeof d.error === 'undefined' && typeof d.pdfBase64 !== 'undefined') {
        const uri = `data:application/pdf;base64,${d.pdfBase64}`;
        const link = document.createElement('a');
        link.href = uri;
        link.setAttribute('download', `Beslut-${errand.errandNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        setIsPreviewLoading(false);
      } else {
        setIsPreviewLoading(false);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel förhandsgranskningen skapades',
          status: 'error',
        });
        console.error('Error when fetching preview');
      }
    };
    try {
      setIsPreviewLoading(true);
      const data = getValues();
      data.outcome = DecisionOutcomeKey[data.outcome];
      let pdfData: {
        pdfBase64: string;
        error?: string;
      };
      if (isErrandLocked(errand)) {
        const refresh = await getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
        const decision = getFinalDecisonWithHighestId(errand.decisions);
        if (!decision) {
          setIsPreviewLoading(false);
          throw new Error('Inget beslut hittades');
        }
        const pdfBase64 = decision?.attachments?.[0]?.file;
        if (!pdfBase64) {
          throw new Error('Ingen PDF hittades');
        }
        pdfData = {
          pdfBase64,
          error: !pdfBase64 ? 'Error when fetching existing pdf data' : undefined,
        };
      } else {
        pdfData = await renderBeslutPdf(errand, data);
        const saved = await saveDecision(municipalityId, errand, data, 'FINAL', pdfData.pdfBase64);
        const refresh = await getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
      }
      createAndClickLink(pdfData);
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: error.message,
        status: 'error',
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const onSubmit = () => {
    saveConfirm.showConfirmation('Spara beslut', 'Vill du spara detta beslut?').then((confirmed) => {
      if (confirmed) {
        const data = getValues();
        data.outcome = DecisionOutcomeKey[data.outcome];
        save(data);
        return Promise.resolve(true);
      }
    });
  };

  const onError = (e) => {
    console.error('Something went wrong when saving decision', e);
  };

  const onRichTextChange = (val) => {
    const editor = quillRef.current.getEditor();
    const length = editor.getLength();
    setRichText(val);
    setValue('description', sanitized(length > 1 ? val : undefined), { shouldDirty: true });
    setValue('descriptionPlaintext', quillRef.current.getEditor().getText());
    trigger('description');
  };

  const decisionsAppeal = (d) => {
    return errand.appeals.find((x) => x.decisionId === d);
  };

  const sortedDec = errand.decisions.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());

  useEffect(() => {
    const existingDecision = sortedDec.length !== 0 ? sortedDec[0] : undefined;

    setValue('errandId', errand.id);

    if (existingDecision && existingDecision.decisionType === 'FINAL') {
      if (!decisionsAppeal(existingDecision.id)) {
        setValue('id', existingDecision.id);
        setValue('description', existingDecision.description);
        setRichText(existingDecision.description);
        setLawHeading(existingDecision.law[0].heading);
        setValue('outcome', DecisionOutcomeLabel[existingDecision.decisionOutcome]);
        setValue('validFrom', dayjs(existingDecision.validFrom).format('YYYY-MM-DD'));
        setValue('validTo', dayjs(existingDecision.validTo).format('YYYY-MM-DD'));
      } else {
        setValue('id', undefined);
      }
    } else {
      setValue('id', undefined);
    }
    trigger();
  }, [errand]);

  const changeTemplate = (InTemplate) => {
    let content = 'Hej!<br><br>';

    if (InTemplate === 'Förfrågan arrende avslag privatperson') {
      content +=
        'Tack för din förfrågan. Vi kommer dock att avslå ditt önskemål om att arrendera mark från kommunen. Vi har i dagsläget inte resurser att prioritera förfrågningar som dessa om nya arrenden för privatpersoner. Vi måste prioritera ärenden som rör företag, föreningar och kommunala verksamheter. <br><br><em>Valbar:</em><br>I de fall privatpersoner använder kommunal mark som exempelvis angränsar till privat fastighet måste privat egendom avlägsnas om kommunen behöver tillträde till marken.';
    } else if (InTemplate === 'Förfrågan mark för småhus, nekande svar') {
      content +=
        'Tack för din förfrågan om att köpa mark för att bebygga med småhus.<br><br>Sundsvalls kommun har flera småhustomter till salu <a href="https://sundsvall.se/bygga-bo-och-miljo/bostader-bostadsomraden-mark-och-offentliga-lokaler/smahustomter" target="_blank">Småhustomter (sundsvall.se)</a>. På webbsidan kan du registrera din e-post för att få vårt nyhetsbrev som skickas ut i samband med att nya småhustomter släpps till försäljning. <br><br>Mark- och exploateringsavdelningen jobbar aktivt med att ta fram nya områden för småhustomter, du kan läsa om pågående planarbeten <a href="https://www.sundsvallvaxer.se/" target="_blank">Sundsvall växer (sundsvallvaxer.se)</a>. <br><br>Kommunen säljer inte mark för småhus utöver de småhustomter som vi erbjuder via hemsidan. I och med detta svar avslutas ditt ärende hos oss.';
    } else if (InTemplate === 'Förfrågan avskrivs') {
      content +=
        'Vi har mottagit din förfrågan avseende NN. Det ingår bl.a. i mark- och exploateringsavdelningens uppdrag att bedöma om mark ska arrenderas ut/försäljas. Vi har beslutat att tillsvidare inte handlägga den här typen av ärenden.<br><br>Ditt ärende avskrivs härmed.';
    }
    content +=
      '<br><br>Med vänliga hälsningar<br><br>Stadsbyggnadskontoret<br>Mark- och exploateringsavdelningen<br>Handläggare ' +
      errand.administratorName +
      '<br>';

    if (InTemplate === '') {
      content = '';
    }
    onRichTextChange(content);
  };

  const removeHTMLTags = (inputHTML) => {
    const regex = /(<([^>]+)>)/gi;
    const rawText = inputHTML.replace(regex, '');

    return rawText;
  };

  const sent = (decision) => {
    return (
      (errand.status === ErrandStatus.Beslutad ||
        errand.status === ErrandStatus.BeslutVerkstallt ||
        errand.status === ErrandStatus.ArendeAvslutat) &&
      sortedDec[0].id === decision.id
    );
  };

  const appealed = (decision) => {
    return (
      (errand.status === ErrandStatus.Beslutad ||
        errand.status === ErrandStatus.BeslutVerkstallt ||
        errand.status === ErrandStatus.BeslutOverklagat ||
        errand.status === ErrandStatus.ArendeAvslutat) &&
      (decisionsAppeal(decision?.id)?.status === 'COMPLETED' ||
        (decisionsAppeal(decision?.id)?.status === 'NEW' &&
          decisionsAppeal(decision?.id)?.timelinessReview === 'REJECTED'))
    );
  };

  return (
    <>
      {(errand.phase === ErrandPhase.verkstalla && errand.status !== ErrandStatus.UnderBeslut) ||
      errand.phase === ErrandPhase.uppfoljning ||
      errand.phase === ErrandPhase.canceled ||
      [ErrandStatus.Beslutad, ErrandStatus.BeslutVerkstallt, ErrandStatus.ArendeAvslutat].includes(
        errand.status as ErrandStatus
      ) ? (
        <div className="w-full py-24 px-32">
          <div className="w-full flex justify-between items-center flex-wrap">
            <h2 className="text-h4-sm md:text-h4-md">Beslut</h2>
          </div>

          <div className="py-8 w-full gap-24">
            <p className="w-4/5 pr-16">Här listas de beslut som har fattats kring ärendet</p>
          </div>
          <Divider className="pt-16" />

          <div className="mt-24">
            {errand.decisions.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()) &&
              errand.decisions.map((decision, id) => {
                if (decision.decisionType === 'FINAL') {
                  return (
                    <div className="flex m-16 items-start" key={`list-decision-${id}`}>
                      <div className="rounded-8 bg-vattjom-surface-accent mr-18">
                        <LucideIcon name="gavel" className="m-12 w-24 h-24" />
                      </div>
                      <div className="w-full">
                        <div className="flex justify-between">
                          <div className="flex">
                            <p className="font-bold my-0">
                              Beslut -{' '}
                              {Object.entries(DecisionOutcomeLabel).find((x) => x[0] === decision.decisionOutcome)[1]}
                            </p>

                            {appealed(decision) ? (
                              <div className="flex items-center">
                                <LucideIcon name="undo-2" size={16} className="ml-12 mr-4" />
                                <p className="text-small">Beslut överklagat</p>
                              </div>
                            ) : sent(decision) ? (
                              <div className="flex items-center">
                                <LucideIcon name="mail-check" size={16} className="ml-12 mr-4" />
                                <p className="text-small">Beslut skickat</p>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <LucideIcon name="pen" size={16} className="ml-12 mr-4" />
                                <p className="text-small">Beslut ej skickat</p>
                              </div>
                            )}
                          </div>

                          <div className="">{dayjs(decision.decidedAt).format('D MMM, HH:mm')}</div>
                        </div>
                        <div>{removeHTMLTags(decision.description)}</div>
                      </div>
                    </div>
                  );
                }
              })}
          </div>
        </div>
      ) : (
        <div className="w-full py-24 px-32">
          <div className="w-full flex justify-between items-center flex-wrap">
            <h2 className="text-h4-sm md:text-h4-md">Beslutstext</h2>
            <Button
              data-cy="decision-pdf-preview-button"
              color="vattjom"
              inverted={formState.isValid && allowed}
              size="sm"
              disabled={!formState.isValid || !allowed}
              onClick={getPdfPreview}
              rightIcon={isPreviewLoading ? <Spinner size={2} /> : <LucideIcon name="download" />}
            >
              {isErrandLocked(errand) ? 'Hämta PDF' : 'Förhandsgranska (pdf)'}
            </Button>
          </div>
          <div className="mt-24">
            <Input type="hidden" {...register('id')} />
            <div className="w-full mt-md flex justify-start gap-md mb-24">
              <FormControl data-cy="decision-outcome-dropdown" className="w-full">
                <FormLabel>Beslut</FormLabel>
                <Input data-cy="decision-outcome-input" type="hidden" {...register('outcome')} />
                <Select
                  className="w-full"
                  data-cy="decision-outcome-select"
                  size="sm"
                  onChange={(e) => {
                    setValue('outcome', e.currentTarget.value, { shouldDirty: true });
                    trigger();
                  }}
                  placeholder="Välj beslut"
                  disabled={isErrandLocked(errand)}
                  value={getValues('outcome')}
                >
                  <Select.Option data-cy="outcome-input-item" value={'Välj beslut'}>
                    Välj beslut
                  </Select.Option>
                  <Select.Option data-cy="outcome-input-item" value={'Bifall'}>
                    Bifall
                  </Select.Option>
                  <Select.Option data-cy="outcome-input-item" value={'Avslag'}>
                    Avslag
                  </Select.Option>
                  <Select.Option data-cy="outcome-input-item" value={'Ärendet avskrivs'}>
                    Ärendet avskrivs
                  </Select.Option>
                </Select>
                {errors.outcome && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>{errors.outcome.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>

              {isPT() && (
                <>
                  <FormControl className="w-full">
                    <FormLabel>Lagrum</FormLabel>
                    <Input
                      type="hidden"
                      {...register('law')}
                      value={lawMapping.find((l) => l.id === selectedLaw).heading}
                    />
                    <Select
                      className="w-full"
                      data-cy="law-select"
                      name="law"
                      size="sm"
                      onChange={(e) => {
                        setLawHeading(e.target.value);
                        trigger();
                      }}
                      placeholder="Välj lagrum"
                      value={lawHeading}
                    >
                      <Select.Option>Välj lagrum</Select.Option>
                      {lawMapping.map((law, index) => {
                        return (
                          <Select.Option key={index} value={law.heading}>
                            {law.heading}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  </FormControl>

                  <FormControl className="w-full">
                    <FormLabel>Beslut giltigt från</FormLabel>
                    <Input
                      type="date"
                      {...register('validFrom')}
                      size="sm"
                      placeholder="Välj datum"
                      data-cy="validFrom-input"
                    />
                  </FormControl>

                  <FormControl className="w-full">
                    <FormLabel>Beslut giltigt till</FormLabel>
                    <Input
                      type="date"
                      {...register('validTo')}
                      size="sm"
                      placeholder="Välj datum"
                      data-cy="validTo-input"
                    />
                  </FormControl>
                </>
              )}

              {isMEX() || isPT() ? (
                <FormControl className="w-full">
                  <FormLabel>Välj beslutsmall</FormLabel>
                  <Input
                    type="hidden"
                    {...register('decisionTemplate')}
                    value={beslutsmallMapping.find((l) => l.id === selectedBeslut).label}
                  />
                  <Select
                    className="w-full"
                    data-cy="decisionTemplate-select"
                    name="decisionTemplate"
                    size="sm"
                    onChange={(e) => {
                      setValue('decisionTemplate', e.currentTarget.value, { shouldDirty: true });
                      changeTemplate(e.currentTarget.value);
                    }}
                    placeholder="Välj beslutsmall"
                    value={getValues('decisionTemplate')}
                  >
                    <Select.Option value="">Välj beslutsmall</Select.Option>
                    {beslutsmallMapping.map((decisionTemplate, index) => (
                      <Select.Option key={index} value={decisionTemplate.label}>
                        {decisionTemplate.label}
                      </Select.Option>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
            </div>

            <Input data-cy="decision-description-input" type="hidden" {...register('description')} />
            <Input type="hidden" {...register('errandId')} />
            <div className={cx(`h-[48rem]`)} data-cy="decision-richtext-wrapper">
              <RichTextEditor
                ref={quillRef}
                containerLabel="decision"
                value={richText}
                isMaximizable={true}
                readOnly={isErrandLocked(errand)}
                toggleModal={() => {
                  setIsEditorModalOpen(!isEditorModalOpen);
                }}
                onChange={(value, delta, source, editor) => {
                  if (source === 'user') {
                    setTextIsDirty(true);
                  }
                  return onRichTextChange(value);
                }}
              />
            </div>
            <div className="my-sm text-error">
              {errors.description && formState.isDirty && (
                <FormErrorMessage>{errors.description?.message}</FormErrorMessage>
              )}
            </div>

            <div className="flex justify-start gap-md">
              <Button
                data-cy="save-decision-button"
                variant="secondary"
                color="primary"
                size="md"
                onClick={handleSubmit(onSubmit, onError)}
                disabled={isLoading || !formState.isValid || isErrandLocked(errand) || !allowed}
              >
                {isLoading ? 'Sparar' : 'Spara beslutstext'}
              </Button>
              <Button
                data-cy="decision-pdf-preview-button"
                color="vattjom"
                inverted={formState.isValid && allowed}
                size="md"
                disabled={!formState.isValid || !allowed}
                onClick={getPdfPreview}
                rightIcon={isPreviewLoading ? <Spinner size={2} /> : <LucideIcon name="download" />}
              >
                {isErrandLocked(errand) ? 'Hämta PDF' : 'Förhandsgranska (.pdf)'}
              </Button>
              <Button
                data-cy="save-and-send-decision-button"
                variant="primary"
                color="vattjom"
                size="md"
                disabled={
                  isSaveAndSendLoading ||
                  !formState.isValid ||
                  [ErrandStatus.Beslutad, ErrandStatus.BeslutVerkstallt, ErrandStatus.ArendeAvslutat].includes(
                    errand.status as ErrandStatus
                  ) ||
                  !validateErrandForDecision(errand) ||
                  !validateOwnerForSendingDecision(errand) ||
                  !validateAttachmentsForDecision(errand).valid ||
                  !allowed
                }
                onClick={() => {
                  if (existingContract) {
                    if (existingContract.status === 'DRAFT') {
                      setControlContractIsOpen(true);
                    } else {
                      saveConfirm
                        .showConfirmation('Spara och skicka', 'Vill du spara och skicka beslutet?')
                        .then((confirmed) => {
                          if (confirmed) {
                            saveAndSend(getValues());
                            return Promise.resolve(true);
                          }
                        });
                    }
                  } else {
                    saveConfirm
                      .showConfirmation('Spara och skicka', 'Vill du spara och skicka beslutet?')
                      .then((confirmed) => {
                        if (confirmed) {
                          saveAndSend(getValues());
                          return Promise.resolve(true);
                        }
                      });
                  }
                }}
                rightIcon={
                  isSaveAndSendLoading ? <Spinner size={2} className="mr-sm" /> : <LucideIcon name="send-horizontal" />
                }
              >
                {isSaveAndSendLoading ? 'Skickar' : 'Skicka beslut'}
              </Button>
            </div>
            {!validateOwnerForSendingDecision(errand) ? (
              <FormErrorMessage data-cy="attachment-error-message" className="mt-md text-error">
                För att skicka beslut måste ärendeägaren ha en giltig e-postadress eller ha registrerats med sitt
                personnummer.
              </FormErrorMessage>
            ) : null}
            {!validateAttachmentsForDecision(errand).valid && (
              <FormErrorMessage data-cy="attachment-error-message" className="mt-md text-error">
                Ärendet saknar följande bilagor: {validateAttachmentsForDecision(errand).reason}.
              </FormErrorMessage>
            )}
            {!validateStatusForDecision(errand).valid && (
              <FormErrorMessage data-cy="status-error-message" className="mt-md text-error">
                Ärendet har fel status för att beslut ska kunna fattas.
              </FormErrorMessage>
            )}
            <div className="mt-lg">{error && <FormErrorMessage>{error}</FormErrorMessage>}</div>
          </div>

          <Dialog show={controlContractIsOpen}>
            <Dialog.Content>
              <h1 className="text-h4">Avtal måste vara färdigt</h1>
              <p>
                För att skicka beslut behöver avtalet vara färdigt och följaktligen avmarkeras i &quot;markera som
                utkast&quot; under avtalsfliken
              </p>
            </Dialog.Content>
            <Dialog.Buttons>
              <Button variant="primary" onClick={() => setControlContractIsOpen(false)}>
                Ok
              </Button>
            </Dialog.Buttons>
          </Dialog>
        </div>
      )}
    </>
  );
};
