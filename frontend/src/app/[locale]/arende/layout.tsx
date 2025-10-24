'use client';
import { defaultCaseDataErrandInformation, IErrand } from '@casedata/interfaces/errand';
import { isErrandLocked } from '@casedata/services/casedata-errand-service';
import BaseErrandLayout from '@common/components/layout/layout.component';
import { useAppContext } from '@common/contexts/app.context';
import { getAdminUsers, getMe } from '@common/services/user-service';
import { yupResolver } from '@hookform/resolvers/yup';
import { defaultSupportErrandInformation, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { default as NextLink } from 'next/link';
import { useRef } from 'react';
import WarnIfUnsavedChanges from '@common/utils/warnIfUnsavedChanges';
import { appConfig } from '@config/appconfig';

let smFormSchema = yup
  .object({
    id: yup.string(),
    category: yup.string().required('Välj ärendekategori'),
    type: yup.string().required('Välj ärendetyp'),
    channel: yup.string().required('Välj kanal'),
    description: yup.string(),
    parameters: yup.array(),
  })
  .required();

let cdFormSchema = yup
  .object({
    caseType: yup
      .string()
      .required('Ärendetyp måste anges')
      .test('notDefaultCasetype', 'Ärendetyp måste väljas', (val) => !!val && val !== 'Välj ärendetyp'),
    channel: yup.string(),
    description: yup.string(),
    municipalityId: yup.string().required('Kommun måste anges'),
    phase: yup.string(),
    priority: yup.string(),
    status: yup.object({
      statusType: yup.string(),
    }),
  })
  .required();

export default function ErrandLayout({ children }: { children: React.ReactNode }) {
  const initialFocus = useRef<HTMLBodyElement>(null);
  const setInitalFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };

  const {
    setMunicipalityId,
    setUser,
    setAdministrators,
    errand,
    unsavedChanges,
    unsavedFacility,
    unsavedContract,
    unsavedInvestigation,
    unsavedDecision,
  } = useAppContext();

  const supportManagementMethods = useForm<SupportErrand>({
    resolver: yupResolver(smFormSchema),
    defaultValues: defaultSupportErrandInformation,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const casedataMethods = useForm<IErrand>({
    resolver: yupResolver(cdFormSchema),
    defaultValues: defaultCaseDataErrandInformation,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
    disabled: isErrandLocked(errand),
  });

  useEffect(() => {
    getMe().then((user) => setUser(user));
    getAdminUsers().then((data) => setAdministrators(data));
    setMunicipalityId(process.env.NEXT_PUBLIC_MUNICIPALITY_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = appConfig.isSupportManagement
    ? supportManagementMethods.formState.isDirty
    : casedataMethods.formState.isDirty;

  //Possible unused now with restructuring files in application

  // useEffect(() => {
  //   if (supportManagementMethods?.getValues) {
  //     // Need to define these variables for validation/dirty check to work??
  //     const _ = Object.keys(supportManagementMethods.formState.dirtyFields).length;
  //     const __ = supportManagementMethods.formState.isDirty;
  //     setUnsavedChanges(
  //       Object.keys(supportManagementMethods.formState.dirtyFields).length === 0
  //         ? false
  //         : supportManagementMethods.formState.isDirty
  //     );
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [supportManagementMethods]);

  // useEffect(() => {
  //   if (casedataMethods?.getValues) {
  //     // Need to define these variables for validation/dirty check to work??
  //     const _ = Object.keys(casedataMethods.formState.dirtyFields).length;
  //     const __ = casedataMethods.formState.isDirty;
  //     setUnsavedChanges(
  //       Object.keys(casedataMethods.formState.dirtyFields).length === 0 ? false : casedataMethods.formState.isDirty
  //     );
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [casedataMethods]);

  return (
    <>
      <NextLink
        href="#content"
        passHref
        tabIndex={1}
        onClick={() => setInitalFocus()}
        className="sr-only focus:not-sr-only bg-primary-light border-2 border-black p-4 text-black inline-block focus:absolute focus:top-0 focus:left-0 focus:right-0 focus:m-auto focus:w-80 text-center"
      >
        Hoppa till innehåll
      </NextLink>
      <FormProvider {...supportManagementMethods} {...casedataMethods}>
        <WarnIfUnsavedChanges
          showWarning={
            isDirty || unsavedChanges || unsavedFacility || unsavedContract || unsavedInvestigation || unsavedDecision
          }
        >
          <BaseErrandLayout>
            <div className="grow shrink overflow-y-hidden">{children}</div>
          </BaseErrandLayout>
        </WarnIfUnsavedChanges>
      </FormProvider>
    </>
  );
}
