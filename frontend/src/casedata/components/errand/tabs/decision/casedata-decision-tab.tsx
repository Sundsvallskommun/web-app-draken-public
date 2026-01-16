'use client';

import { GenericExtraParameters } from '@casedata/interfaces/extra-parameters';
import { CreateStakeholderDto } from '@casedata/interfaces/stakeholder';
import {
  beslutsmallMapping,
  getFinalDecisonWithHighestId,
  getLawMapping,
  renderBeslutPdf,
  renderHtml,
  saveDecision,
} from '@casedata/services/casedata-decision-service';
import {
  getErrand,
  isErrandLocked,
  updateErrandStatus,
  validateAction,
} from '@casedata/services/casedata-errand-service';
import { AppContextInterface, useAppContext } from '@common/contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import type { RJSFSchema } from '@rjsf/utils';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { useSaveCasedataErrand } from '@casedata/hooks/useSaveCasedataErrand';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
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
import { triggerErrandPhaseChange } from '@casedata/services/process-service';
import { updateServiceStatuses } from '@casedata/services/asset-service';
import { getLatestRjsfSchema } from '@common/components/json/utils/schema-utils';
import { Law } from '@common/data-contracts/case-data/data-contracts';
import { MessageClassification } from '@common/interfaces/message';
import { isMEX, isPT } from '@common/services/application-service';
import { base64Decode } from '@common/services/helper-service';
import sanitized from '@common/services/sanitizer-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  Combobox,
  Dialog,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Select,
  cx,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import dynamic from 'next/dynamic';
import { CasedataMessageTabFormModel } from '../messages/message-composer.component';
import { ServiceListComponent } from '../services/casedata-service-list.component';
import { useErrandServices } from '../services/useErrandService';
import { SendDecisionDialogComponent } from './send-decision-dialog.component';
import { ContractData } from '@casedata/interfaces/contract-data';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

export type ContactMeans = 'webmessage' | 'email' | 'digitalmail' | false;

export interface DecisionFormModel {
  id?: string;
  errandId?: number;
  errandNumber?: string;
  personalNumber?: string;
  errandCaseType?: string;
  description: string;
  descriptionPlaintext: string;
  law: Law[];
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
    errandCaseType: yup.string(),
    law: isPT() ? yup.array().min(1, 'Lagrum måste anges') : yup.array(),
    outcome: yup
      .string()
      .required('Beslut måste anges')
      .test('outcomecheck', 'Beslut måste anges', (outcome) => {
        return outcome !== '' && outcome !== 'Välj beslut';
      }),
    validFrom: isPT()
      ? yup.string().when('outcome', ([outcome]: [string], schema: yup.StringSchema) => {
          return outcome === 'APPROVAL' ? schema.required('Giltig från måste anges') : schema.notRequired();
        })
      : yup.string(),

    validTo: isPT()
      ? yup
          .string()
          .when('outcome', ([outcome]: [string], schema: yup.StringSchema) => {
            return outcome === 'APPROVAL' ? schema.required('Giltig till måste anges') : schema.notRequired();
          })
          .test({
            name: 'validTo-after-validFrom',
            message: 'Slutdatum måste vara efter startdatum',
            test: (value, context) => {
              if (context.parent.outcome !== 'APPROVAL') return true;
              if (!value || !context.parent.validFrom) return true;
              return Date.parse(context.parent.validFrom) < Date.parse(value);
            },
          })
      : yup.string(),
  })
  .required();

export const CasedataDecisionTab: React.FC<{
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  onRefetchServices?: (refetch: () => void) => void;
}> = (props) => {
  const { municipalityId, user, errand, setErrand }: AppContextInterface = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveAndSendLoading, setIsSaveAndSendLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [dialogIsOpen, setDialogIsOpen] = useState<boolean>(false);
  const selectedBeslut = 1;
  const [error, setError] = useState<string>();
  const quillRef = useRef(null);
  const saveConfirm = useConfirm();
  const toastMessage = useSnackbar();
  const [allowed, setAllowed] = useState(false);
  const [existingContract, setExistingContract] = useState<ContractData>(undefined);
  const [controlContractIsOpen, setControlContractIsOpen] = useState(false);
  const [serviceSchema, setServiceSchema] = useState<RJSFSchema | null>(null);

  const [initialLawValues] = useState<string[]>(() => {
    const sortedDec = [...errand.decisions].sort(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
    );
    const existingDecision = sortedDec[0];

    if (existingDecision?.decisionType === 'FINAL' && existingDecision.law?.length > 0) {
      return existingDecision.law.map((law) => law.heading);
    }

    return getLawMapping(errand).map((law) => law.heading);
  });

  const ownerPartyId = getOwnerStakeholder(errand)?.personId;
  const assetType = 'FTErrandAssets';

  useEffect(() => {
    (async () => {
      const { schema } = await getLatestRjsfSchema(municipalityId, assetType);
      setServiceSchema(schema);
    })();
  }, [municipalityId, assetType]);

  const { services, refetch: refetchServices } = useErrandServices({
    municipalityId,
    partyId: ownerPartyId,
    errandNumber: errand.errandNumber,
    assetType: assetType,
    schema: serviceSchema,
  });

  useEffect(() => {
    if (props.onRefetchServices && refetchServices) {
      props.onRefetchServices(refetchServices);
    }
  }, [props, refetchServices]);

  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<DecisionFormModel>({
    resolver: yupResolver(formSchema) as unknown as Resolver<DecisionFormModel>,
    defaultValues: {
      id: undefined,
      description: '',
      errandId: errand.id,
      errandNumber: errand.errandNumber,
      personalNumber: getOwnerStakeholder(errand)?.personalNumber,
      errandCaseType: errand.caseType,
      law: [],
      decisionTemplate: isPT() ? '' : beslutsmallMapping[0].label,
      outcome: '',
      validFrom: '',
      validTo: '',
    },
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const { description, descriptionPlaintext, outcome, validFrom, validTo } = watch();

  useEffect(() => {
    if (errand) {
      getErrandContract(errand)
        .then((res) => {
          if (res) {
            setExistingContract(res);
          }
        })
        .catch(() => {
          setExistingContract(undefined);
        });
    }
  }, [errand]);

  useEffect(() => {
    props.setUnsaved(formState.isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, outcome, validFrom, validTo]);

  const triggerPhaseChange = () => {
    return triggerErrandPhaseChange(municipalityId, errand)
      .then(() => getErrand(municipalityId, errand.id.toString()))
      .then((res) => setErrand(res.errand))
      .then(() => {
        setIsLoading(false);
        toastMessage(
          getToastOptions({
            message: 'Fasbytet inleddes',
            status: 'success',
          })
        );
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
      const rendered = await renderBeslutPdf(errand, data, services);
      await saveDecision(municipalityId, errand, data, 'FINAL', rendered.pdfBase64);
      setIsLoading(false);
      setError(undefined);
      props.setUnsaved(false);
      toastMessage(
        getToastOptions({
          message: 'Beslutet sparades',
          status: 'success',
        })
      );
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
      const rendered = await renderBeslutPdf(errand, data, services);
      await saveDecision(municipalityId, errand, data, 'FINAL', rendered.pdfBase64);

      // Update service statuses based on decision outcome
      if (ownerPartyId) {
        await updateServiceStatuses(municipalityId, ownerPartyId, errand.errandNumber, data.outcome);
      }

      const renderedHtml = await renderHtml(errand, data, 'decision');
      const owner = getOwnerStakeholder(errand);
      const recipientEmail = owner?.emails?.[0]?.value;
      const contactMeans: ContactMeans = errand.externalCaseId
        ? 'webmessage'
        : validateOwnerForSendingDecisionByEmail(errand)
        ? 'email'
        : validateOwnerForSendingDecisionByLetter(errand)
        ? 'digitalmail'
        : false;
      if (contactMeans === 'email' && !recipientEmail) {
        throw new Error('Ingen e-postadress för mottagare hittades');
      }
      if (!contactMeans) {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Ärendeägaren har inga godkända kontaktsätt',
          status: 'error',
        });
        return;
      }
      const messageData: CasedataMessageTabFormModel = {
        contactMeans,
        messageClassification: MessageClassification.Informationsmeddelande,
        emails: [{ value: recipientEmail }],
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
      if (isMEX()) {
        await sendMessage(municipalityId, errand, messageData);
      } else if (isPT() && municipalityId === '2260') {
        // PT Ånge - do nothing, they handle sending themselves
      } else if (isPT()) {
        await sendDecisionMessage(municipalityId, errand);
      } else {
        throw new Error('Kontaktsätt saknas');
      }
      await updateErrandStatus(municipalityId, errand.id.toString(), ErrandStatus.Beslutad);
      await triggerPhaseChange();
      toastMessage(
        getToastOptions({
          message: 'Beslutet skickades',
          status: 'success',
        })
      );
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
      let pdfData: {
        pdfBase64: string;
        error?: string;
      };
      if (isErrandLocked(errand) || isSent()) {
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
        pdfData = await renderBeslutPdf(errand, data, services);
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
  const saveCasedataErrand = useSaveCasedataErrand(false);

  const handleSaveAndSend = async () => {
    const values = getValues();
    await saveAndSend(values);
    setDialogIsOpen(false);
  };

  const onSubmit = () => {
    return saveConfirm
      .showConfirmation('Spara beslut', 'Vill du spara detta beslut?', 'Ja', 'Nej', 'info', 'info')
      .then(async (confirmed) => {
        if (confirmed) {
          setIsLoading(true);
          await saveCasedataErrand();
          const data = getValues();
          await save(data);

          return Promise.resolve(true);
        }
      });
  };
  const onError = (e) => {
    console.error('Something went wrong when saving decision', e);
  };

  const onRichTextChange = (delta?) => {
    setValue('description', sanitized(delta.ops[0].retain > 1 ? quillRef.current.root.innerHTML : undefined), {
      shouldDirty: true,
    });
    setValue('descriptionPlaintext', quillRef.current.getText());
    trigger('description');
  };

  const sortedDec = [...errand.decisions].sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
  const existingDecision = sortedDec.length !== 0 ? sortedDec[0] : undefined;

  useEffect(() => {
    setValue('errandId', errand.id);

    if (existingDecision && existingDecision.decisionType === 'FINAL') {
      setValue('id', existingDecision.id.toString(), { shouldDirty: false });
      setValue('description', existingDecision.description, { shouldDirty: false });
      setValue('outcome', existingDecision.decisionOutcome, { shouldDirty: false });
      setValue('validFrom', dayjs(existingDecision.validFrom).format('YYYY-MM-DD'), { shouldDirty: false });
      setValue('validTo', dayjs(existingDecision.validTo).format('YYYY-MM-DD'), { shouldDirty: false });

      if (existingDecision.law && existingDecision.law.length > 0) {
        setValue('law', existingDecision.law, { shouldDirty: false });
      }
    } else {
      setValue('id', undefined, { shouldDirty: false });
    }

    props.setUnsaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand.id]);

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
    onRichTextChange();
  };

  const isSent = () => {
    return (
      errand.status?.statusType === ErrandStatus.Beslutad ||
      errand.status?.statusType === ErrandStatus.BeslutVerkstallt ||
      errand.status?.statusType === ErrandStatus.ArendeAvslutat
    );
  };

  return (
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
          loading={isPreviewLoading}
          loadingText="Hämtar PDF"
          rightIcon={<LucideIcon name="download" />}
        >
          {isErrandLocked(errand) || isSent() ? 'Hämta PDF' : 'Förhandsgranska PDF'}
        </Button>
      </div>
      <div className="mt-24">
        <Input type="hidden" {...register('id')} />
        <Input type="hidden" {...register('decidedBy')} value={user.username} />
        <div className="w-full mt-md flex justify-start gap-md mb-24">
          <FormControl data-cy="decision-outcome-dropdown" className="w-full">
            <FormLabel>Beslut</FormLabel>
            <Input data-cy="decision-outcome-input" type="hidden" {...register('outcome')} />
            <Select
              className={`w-full`}
              data-cy="decision-outcome-select"
              size="sm"
              onChange={(e) => {
                setValue('outcome', e.currentTarget.value, { shouldDirty: true });
                trigger();
              }}
              placeholder="Välj beslut"
              disabled={isErrandLocked(errand) || isSent()}
              value={getValues('outcome') ? getValues('outcome') : ''}
            >
              <Select.Option data-cy="outcome-input-item" value={''}>
                Välj utfall
              </Select.Option>
              <Select.Option data-cy="outcome-input-item" value={'APPROVAL'}>
                Bifall
              </Select.Option>
              <Select.Option data-cy="outcome-input-item" value={'REJECTION'}>
                Avslag
              </Select.Option>
              <Select.Option data-cy="outcome-input-item" value={'CANCELLATION'}>
                Ärendet avskrivs
              </Select.Option>
            </Select>
            {errors.outcome && <FormErrorMessage className="text-error">{errors.outcome.message}</FormErrorMessage>}
          </FormControl>

          {isPT() && (
            <>
              <FormControl className="w-full ">
                <FormLabel>Lagrum</FormLabel>
                <Combobox
                  multiple
                  placeholder="Välj lagrum"
                  value={initialLawValues}
                  size="sm"
                  onSelect={(e) => {
                    const selected = e.target.value as string[];
                    const newLaws = getLawMapping(errand).filter((law) => selected.includes(law.heading));
                    setValue('law', newLaws, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                    props.setUnsaved(true);
                  }}
                >
                  <Combobox.Input />
                  <Combobox.List>
                    {getLawMapping(errand).map((law, index) => (
                      <Combobox.Option key={index} value={law.heading}>
                        {law.heading}
                      </Combobox.Option>
                    ))}
                  </Combobox.List>
                </Combobox>
                {errors.law && <FormErrorMessage className="text-error">{errors.law.message}</FormErrorMessage>}
              </FormControl>

              <FormControl className="w-full">
                <FormLabel>Beslut giltigt från</FormLabel>
                <Input
                  type="date"
                  {...register('validFrom')}
                  size="sm"
                  disabled={isSent() || outcome !== 'APPROVAL'}
                  placeholder="Välj datum"
                  data-cy="validFrom-input"
                />
                {errors.validFrom && (
                  <FormErrorMessage className="text-error">{errors.validFrom.message}</FormErrorMessage>
                )}
              </FormControl>

              <FormControl className="w-full">
                <FormLabel>Beslut giltigt till</FormLabel>
                <Input
                  type="date"
                  {...register('validTo')}
                  size="sm"
                  disabled={isSent() || outcome !== 'APPROVAL'}
                  placeholder="Välj datum"
                  data-cy="validTo-input"
                />
                {errors.validTo && <FormErrorMessage className="text-error">{errors.validTo.message}</FormErrorMessage>}
              </FormControl>
            </>
          )}

          {isMEX() ? (
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
          <TextEditor
            className={cx(`mb-md h-[80%] max-w-[95.9rem]`)}
            onChange={(e) => {
              setValue('description', e.target.value.markup, {
                shouldDirty: true,
              });
              setValue('descriptionPlaintext', e.target.value.plainText);
              trigger('description');
            }}
            value={{ markup: description, plainText: descriptionPlaintext }}
          />
        </div>
        <div className="my-sm text-error">
          {errors.description && formState.isDirty && (
            <FormErrorMessage>{errors.description?.message}</FormErrorMessage>
          )}
        </div>

        {isPT() ? (
          <div className="pb-20">
            <h4 className="text-h6 mb-sm border-b">Här listas de insatser som bifalls</h4>
            <ServiceListComponent services={services} readOnly />
          </div>
        ) : null}

        <div className="flex justify-start gap-md">
          <Button
            data-cy="save-decision-button"
            variant="secondary"
            color="primary"
            size="md"
            onClick={handleSubmit(onSubmit, onError)}
            loading={isLoading}
            loadingText="Sparar"
            disabled={isErrandLocked(errand) || !allowed || isSent()}
          >
            Spara beslutstext
          </Button>
          <Button
            data-cy="decision-pdf-preview-button"
            color="vattjom"
            inverted={formState.isValid && allowed}
            size="md"
            disabled={!formState.isValid || !allowed}
            onClick={getPdfPreview}
            loading={isPreviewLoading}
            loadingText="Hämtar PDF"
            rightIcon={<LucideIcon name="download" />}
          >
            {isErrandLocked(errand) || isSent() ? 'Hämta PDF' : 'Förhandsgranska PDF'}
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
                errand.status.statusType as ErrandStatus
              ) ||
              !validateErrandForDecision(errand) ||
              !validateOwnerForSendingDecision(errand) ||
              !validateAttachmentsForDecision(errand).valid ||
              !allowed
            }
            onClick={() => {
              if (existingContract && existingContract.status === 'DRAFT') {
                setControlContractIsOpen(true);
              } else {
                setDialogIsOpen(true);
              }
            }}
            rightIcon={<LucideIcon name="send-horizontal" />}
            loading={isSaveAndSendLoading}
            loadingText="Skickar beslut"
          >
            Skicka beslut
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

      <SendDecisionDialogComponent
        dialogIsOpen={dialogIsOpen}
        setDialogIsOpen={setDialogIsOpen}
        saveAndSend={handleSaveAndSend}
      />

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
  );
};
