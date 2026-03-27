'use client';

import { useAppContext } from '@common/contexts/app.context';
import {
  buildErrorReport,
  collectEnvironmentInfo,
  ErrorDetails,
  ErrorReportFormData,
  getAppVersion,
  getLogBuffer,
} from '@common/services/error-reporting';
import { submitErrorReport } from '@common/services/error-report-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  Disclosure,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Modal,
  Select,
  Textarea,
  useSnackbar,
} from '@sk-web-gui/react';
import { Info } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

const errorReportSchema = yup.object().shape({
  description: yup.string().required('Beskriv vad som hände').min(10, 'Ange minst 10 tecken'),
  expectedBehavior: yup.string().required('Beskriv vad du förväntade dig').min(10, 'Ange minst 10 tecken'),
  stepsToReproduce: yup.string().required('Beskriv stegen för att återskapa felet').min(10, 'Ange minst 10 tecken'),
  severity: yup
    .string()
    .oneOf(['low', 'medium', 'high', 'critical'] as const)
    .required('Välj allvarlighetsgrad'),
});

interface ErrorReportModalProps {
  show: boolean;
  onClose: () => void;
  errorDetails?: ErrorDetails | null;
}

export function ErrorReportModal({ show, onClose, errorDetails }: ErrorReportModalProps) {
  const { user } = useAppContext();
  const pathname = usePathname();
  const toastMessage = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [autoInfo, setAutoInfo] = useState<{
    browser: string;
    os: string;
    url: string;
    screenResolution: string;
    viewportSize: string;
    windowSize: string;
    zoomLevel: number;
    application: string;
    logCount: number;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ErrorReportFormData>({
    resolver: yupResolver(errorReportSchema) as any,
    defaultValues: {
      description: '',
      expectedBehavior: '',
      stepsToReproduce: '',
      severity: 'medium',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (show) {
      const env = collectEnvironmentInfo();
      const logs = getLogBuffer();
      const zoomLevel = Math.round(window.devicePixelRatio * 100);

      setAutoInfo({
        browser: env.browser,
        os: env.os,
        url: window.location.href,
        screenResolution: env.screenResolution,
        viewportSize: env.viewportSize,
        windowSize: `${window.outerWidth}x${window.outerHeight}`,
        zoomLevel,
        application: process.env.NEXT_PUBLIC_APPLICATION ?? 'unknown',
        logCount: logs.length,
      });

      if (errorDetails) {
        reset({
          description: `${errorDetails.name}: ${errorDetails.message}`,
          expectedBehavior: '',
          stepsToReproduce: '',
          severity: 'high',
        });
      } else {
        reset({
          description: '',
          expectedBehavior: '',
          stepsToReproduce: '',
          severity: 'medium',
        });
      }
    }
  }, [show, errorDetails, reset]);

  const onSubmit = async (formData: ErrorReportFormData) => {
    setIsLoading(true);

    try {
      const environment = collectEnvironmentInfo();
      const logBuffer = getLogBuffer();
      const basePath = window.location.pathname.split('/')[1] ?? '';
      const appVersion = await getAppVersion(basePath);

      const payload = buildErrorReport({
        formData,
        userInfo: {
          username: user.username ?? 'unknown',
          fullName: user.name ?? 'unknown',
        },
        errorDetails: errorDetails ?? undefined,
        applicationName: process.env.NEXT_PUBLIC_APPLICATION ?? 'unknown',
        logBuffer,
        environment,
        appVersion,
        url: window.location.href,
        route: pathname ?? '',
      });

      const result = await submitErrorReport(payload);

      if (result.data.status === 'failed') {
        toastMessage({
          position: 'bottom',
          closeable: true,
          message: result.data.message,
          status: 'warning',
        });
      } else {
        toastMessage(
          getToastOptions({
            message: result.data.message,
            status: 'success',
          }),
        );
      }
      handleClose();
    } catch {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Kunde inte skicka felrapporten. Försök igen.',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setAutoInfo(null);
    onClose();
  };

  return (
    <Modal show={show} label="Rapportera fel" className="w-[56rem]" onClose={handleClose}>
      <Modal.Content>
        <div className="sk-alert sk-alert-info sk-alert-md mb-lg" role="status">
          <Info className="sk-alert-icon w-[2rem] h-[2rem]" aria-hidden="true" />
          <div className="sk-alert-content sk-alert-content-md">
            <p className="sk-alert-content-description">
              Teknisk information samlas in automatiskt för att underlätta felsökning.
            </p>
          </div>
        </div>

        <form className="flex flex-col gap-lg" onSubmit={handleSubmit(onSubmit)}>
          <FormControl id="description" className="w-full" required>
            <FormLabel>Vad hände?</FormLabel>
            <Textarea rows={4} placeholder="Beskriv vad som gick fel..." {...register('description')} />
            {errors.description && <FormErrorMessage>{errors.description.message}</FormErrorMessage>}
          </FormControl>

          <FormControl id="expectedBehavior" className="w-full" required>
            <FormLabel>Vad förväntade du dig?</FormLabel>
            <Textarea rows={3} placeholder="Beskriv vad du förväntade dig skulle hända..." {...register('expectedBehavior')} />
            {errors.expectedBehavior && <FormErrorMessage>{errors.expectedBehavior.message}</FormErrorMessage>}
          </FormControl>

          <FormControl id="stepsToReproduce" className="w-full" required>
            <FormLabel>Steg för att återskapa felet</FormLabel>
            <Textarea
              rows={3}
              placeholder="1. Gå till...&#10;2. Klicka på...&#10;3. ..."
              {...register('stepsToReproduce')}
            />
            {errors.stepsToReproduce && <FormErrorMessage>{errors.stepsToReproduce.message}</FormErrorMessage>}
          </FormControl>

          <FormControl id="severity" className="w-full" required>
            <FormLabel>Allvarlighetsgrad</FormLabel>
            <Select className="w-full" {...register('severity')}>
              <Select.Option value="low">Låg - Kosmetiskt eller mindre problem</Select.Option>
              <Select.Option value="medium">Medel - Funktionalitet påverkas delvis</Select.Option>
              <Select.Option value="high">Hög - Viktig funktion fungerar inte</Select.Option>
              <Select.Option value="critical">Kritisk - Systemet är oanvändbart</Select.Option>
            </Select>
          </FormControl>

          {autoInfo && (
            <Disclosure variant="alt" className="mt-sm">
              <Disclosure.Header>
                <Disclosure.Title>Visa automatiskt insamlad information</Disclosure.Title>
                <Disclosure.Button />
              </Disclosure.Header>
              <Disclosure.Content>
                <dl className="grid grid-cols-[auto_1fr] gap-x-md gap-y-xs text-small p-md">
                  <dt className="font-bold">Användare</dt>
                  <dd>{user.name} ({user.username})</dd>
                  <dt className="font-bold">Applikation</dt>
                  <dd>{autoInfo.application}</dd>
                  <dt className="font-bold">Webbläsare</dt>
                  <dd>{autoInfo.browser}</dd>
                  <dt className="font-bold">Operativsystem</dt>
                  <dd>{autoInfo.os}</dd>
                  <dt className="font-bold">Skärmupplösning</dt>
                  <dd>{autoInfo.screenResolution}</dd>
                  <dt className="font-bold">Fönsterstorlek</dt>
                  <dd>{autoInfo.windowSize}</dd>
                  <dt className="font-bold">Viewport</dt>
                  <dd>{autoInfo.viewportSize}</dd>
                  <dt className="font-bold">Zoomnivå</dt>
                  <dd>{autoInfo.zoomLevel}%</dd>
                  <dt className="font-bold">URL</dt>
                  <dd className="break-all">{autoInfo.url}</dd>
                  <dt className="font-bold">Tidpunkt</dt>
                  <dd>{new Date().toLocaleString('sv-SE')}</dd>
                  <dt className="font-bold">Loggmeddelanden</dt>
                  <dd>{autoInfo.logCount} st</dd>
                </dl>
              </Disclosure.Content>
            </Disclosure>
          )}
        </form>
      </Modal.Content>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
        <Button
          variant="primary"
          color="vattjom"
          disabled={isLoading || !isValid}
          loading={isLoading}
          loadingText="Skickar rapport..."
          onClick={handleSubmit(onSubmit)}
        >
          Skicka rapport
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
