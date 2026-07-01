import { isKC, isROB } from '@common/services/application-service';
import { downloadPdf, exportSingleSupportErrand } from '@common/services/export-service';
import { appConfig } from '@config/appconfig';
import { Button, Checkbox, FormControl, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import { Priority } from '@supportmanagement/interfaces/priority';
import {
  Channels,
  getLabelCategory,
  getLabelSubType,
  getLabelType,
  Status,
} from '@supportmanagement/services/support-errand-service';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface SupportExportParameters {
  basicInformation: boolean;
  errandInformation: boolean;
  attachments: boolean;
}

export const SidebarSupportExport: React.FC = () => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportAttachments = useSupportStore((s) => s.supportAttachments);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const errand = supportErrand!;
  const [isExportLoading, setIsExportLoading] = useState<boolean>(false);
  const exportConfirm = useConfirm();
  const toastMessage = useSnackbar();

  const { register, getValues } = useForm<SupportExportParameters>({
    defaultValues: {
      basicInformation: true,
      errandInformation: true,
      attachments: true,
    },
  });

  const isErrandNotClosed = () => {
    return errand.status !== Status.SOLVED;
  };

  const handleSubmit = () => {
    setIsExportLoading(true);

    const includeParameters = Object.entries(getValues())
      .map(([key, value]) => value && key)
      .filter(Boolean) as string[];

    // TODO: Remove `applicationsUsingClassification` and the classification-based
    // resolution below once all applications have migrated to the labels structure.
    // For now only Kontakt Sundsvall (KC) and ROB classify errands with category/type
    // (resolved from `supportMetadata.categories`); the rest already use labels.
    const applicationsUsingClassification = [isKC, isROB];
    const usesClassification = applicationsUsingClassification.some((isApplication) => isApplication());

    const errandCategory = supportMetadata?.categories?.find(
      (category) => category.name === errand.classification?.category
    );
    const errandType = errandCategory?.types?.find((type) => type.name === errand.classification?.type);

    const options = {
      applicationName: appConfig.applicationName,
      attachments: (supportAttachments ?? []).map((attachment) => ({
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
      })),
      caseLabel: usesClassification ? errandType?.displayName : getLabelType(errand)?.displayName,
      category: usesClassification
        ? errandCategory?.displayName
        : getLabelCategory(errand, supportMetadata!)?.displayName,
      subTypeLabel: usesClassification ? undefined : getLabelSubType(errand)?.displayName,
      channelLabel: errand.channel ? Channels[errand.channel as keyof typeof Channels] : undefined,
      statusLabel:
        supportMetadata?.statuses?.find((status) => status.name === errand.status)?.displayName ?? errand.status,
      priorityLabel: errand.priority ? Priority[errand.priority as keyof typeof Priority] : undefined,
    };

    exportSingleSupportErrand(municipalityId, errand, options, includeParameters)
      .then((pdf) => {
        downloadPdf(
          pdf,
          `${errand.errandNumber}.pdf`,
          () => setIsExportLoading(false),
          () => {
            setIsExportLoading(false);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Något gick fel när ärendeexporten genererades',
              status: 'error',
            });
          }
        );
      })
      .catch(() => {
        setIsExportLoading(false);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när ärendet skulle exporteras',
          status: 'error',
        });
      });
  };

  return (
    <div>
      <div className="mb-24">
        <span className="text-base md:text-large xl:text-lead font-semibold">Exportera ärende</span>
      </div>

      <FormControl className="w-full">
        <Checkbox {...register('basicInformation')} key="basicInformation" data-cy="basicInformation">
          Inkludera grunduppgifter
        </Checkbox>
        <Checkbox {...register('errandInformation')} key="errandInformation" data-cy="errandInformation">
          Inkludera ärendeuppgifter
        </Checkbox>
        <Checkbox {...register('attachments')} key="attachments" data-cy="attachments">
          Inkludera bilageförteckning
        </Checkbox>

        <Button
          onClick={async () => {
            const confirmed = await exportConfirm.showConfirmation(
              'Exportera ärende?',
              `${
                isErrandNotClosed()
                  ? 'Detta ärende är inte avslutat. Vill du ändå exportera ärendet?'
                  : 'Vill du exportera ärendet?'
              }`,
              'Ja',
              'Nej',
              'info'
            );
            if (confirmed) {
              handleSubmit();
            }
          }}
          className="mt-24"
          color="vattjom"
          loading={isExportLoading}
          data-cy="export-button"
        >
          Exportera ärende
        </Button>
      </FormControl>
    </div>
  );
};
