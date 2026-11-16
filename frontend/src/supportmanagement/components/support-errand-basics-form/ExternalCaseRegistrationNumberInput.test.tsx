// @vitest-environment jsdom
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { cleanup, render } from '@testing-library/react';
import { FC, PropsWithChildren } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, expect, test, vi } from 'vitest';

import { ExternalCaseRegistrationNumberInput } from './ExternalCaseRegistrationNumberInput';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const errand = (activity: string, municipality: string, processKey = 'alcohol-permit'): SupportErrand =>
  ({
    id: 'errand-1',
    status: 'ONGOING',
    parameters: [{ key: 'premisesMunicipalityId', values: [municipality] }],
    process: { processInstanceId: 'process-1', processStatus: 'WAITING', currentActivityId: activity, processKey },
  } as unknown as SupportErrand);

const renderFor = (supportErrand: SupportErrand) => {
  const Wrapper: FC<PropsWithChildren> = ({ children }) => {
    const methods = useForm<SupportErrand>({ defaultValues: supportErrand });
    return <FormProvider {...methods}>{children}</FormProvider>;
  };
  render(<ExternalCaseRegistrationNumberInput supportErrand={supportErrand} />, { wrapper: Wrapper });
  return document.querySelector('[data-cy="external-case-registration-number-input"]');
};

afterEach(cleanup);

test.each([
  ['before the review', 'registration_phase'],
  ['in the review', 'review_phase'],
])('a Timrå errand %s asks for the number', (_, activity) => {
  const input = renderFor(errand(activity, '2262')) as HTMLInputElement | null;
  expect(input).not.toBeNull();
  expect(input?.disabled).toBe(false);
});

test('a Timrå errand past the review shows the number, locked', () => {
  const input = renderFor(errand('investigation_phase', '2262')) as HTMLInputElement | null;
  expect(input).not.toBeNull();
  expect(input?.disabled).toBe(true);
});

test.each([
  ['a Sundsvall errand in the review', errand('review_phase', '2281')],
  ['a Timrå inspection in the review', errand('review_phase', '2262', 'internal-inspection')],
])('%s does not show the field', (_, supportErrand) => {
  expect(renderFor(supportErrand)).toBeNull();
});
