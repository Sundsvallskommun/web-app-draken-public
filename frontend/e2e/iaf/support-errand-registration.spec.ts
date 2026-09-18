import { expect, test } from '../fixtures/base.fixture';
import { defaultInvestigationProfile, errandNumber, installIafApiMock } from './fixtures/investigation-flow.mock';

/** The profile as a drake that asks before the errand exists reports it. */
const registrationProfile = () => ({
  ...defaultInvestigationProfile(),
  registration: { mode: 'enabled' as const, form: true },
});

const registrationOptions = {
  reportTypes: [
    { labelId: 'deviation', displayName: 'Avvikelse', resourcePath: 'REPORT_TYPE/DEVIATION' },
    { labelId: 'abuse', displayName: 'Missförhållande', resourcePath: 'REPORT_TYPE/ABUSE' },
  ],
  locations: [{ labelId: 'unit', displayName: 'Hemtjänst Norr', resourcePath: 'LOCATION/VOF/HEMTJANST_NORR' }],
  priorities: ['HIGH', 'MEDIUM', 'LOW'],
};

const visitRegistration = async (
  page: Parameters<typeof installIafApiMock>[0],
  dismissCookieConsent: () => Promise<void>
) => {
  // /registrera is a protected route: the proxy redirects to the login page without a session.
  await page.context().addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
  await page.goto('registrera');
  await dismissCookieConsent();
};

test.describe('Registrering i IAF/VOF', () => {
  test('frågar vad som hänt och var innan ärendet skapas', async ({ page, dismissCookieConsent }) => {
    const trace = await installIafApiMock(page, {
      investigationProfileResponse: registrationProfile(),
      registrationOptions,
    });

    await visitRegistration(page, dismissCookieConsent);

    const form = page.locator('[data-cy="support-registration-form"]');
    await expect(form).toBeVisible();
    // Nothing is created by opening the page; every other support drake would have done exactly that.
    expect(trace.registrations).toHaveLength(0);

    // Both report types are offered, and only the handler's own place.
    await expect(form.locator('[data-cy="registration-report-type"] option')).toHaveText([
      'Välj',
      'Avvikelse',
      'Missförhållande',
    ]);
    await expect(form.locator('[data-cy="registration-location"] option')).toHaveText(['Välj', 'Hemtjänst Norr']);

    const submit = form.locator('[data-cy="registration-submit"]');
    await expect(submit).toBeDisabled();

    await form.locator('[data-cy="registration-report-type"]').selectOption('abuse');
    await expect(submit).toBeDisabled();
    await form.locator('[data-cy="registration-location"]').selectOption('unit');
    await form.locator('[data-cy="registration-priority"]').selectOption('HIGH');
    await expect(submit).toBeEnabled();

    await submit.click();

    await expect
      .poll(() => trace.registrations)
      .toEqual([{ reportTypeLabelId: 'abuse', locationLabelId: 'unit', priority: 'HIGH' }]);
    await expect(page).toHaveURL(new RegExp(`/arende/${errandNumber}$`, 'u'));
  });

  // An errand has to belong to a place, so a handler configured for none is told why rather than
  // shown a form whose mandatory choice is empty.
  test('säger ifrån när kontot saknar plats', async ({ page, dismissCookieConsent }) => {
    const trace = await installIafApiMock(page, {
      investigationProfileResponse: registrationProfile(),
      registrationOptions: { ...registrationOptions, locations: [] },
    });

    await visitRegistration(page, dismissCookieConsent);

    await expect(page.locator('[data-cy="registration-without-location"]')).toContainText('ingen plats kopplad');
    await expect(page.locator('[data-cy="support-registration-form"]')).toHaveCount(0);
    expect(trace.registrations).toHaveLength(0);
  });
});
