import { expect, Page, test } from '@playwright/test';

const backendOrigin = 'http://localhost:3001';
const managerIdPrefix = 'utredning-enhetschef';
const solLssIdPrefix = 'utredning-sol-lss';
const hslIdPrefix = 'utredning-hsl';
const investigationTabNames = ['Utredning enhetschef', 'Utredning SoL/LSS', 'Utredning HSL'] as const;

async function openAllDisclosures(page: Page) {
  const activePanel = page.locator('[role="tabpanel"]:visible');
  const closedDisclosureButtons = activePanel.locator('.sk-disclosure-header-button[aria-expanded="false"]');

  for (let attempts = 0; attempts < 10 && (await closedDisclosureButtons.count()) > 0; attempts += 1) {
    await closedDisclosureButtons.first().click();
  }

  await expect(closedDisclosureButtons).toHaveCount(0);
}

async function expectActivePanelToStayWithinBoundaries(page: Page) {
  const documentWidths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  expect(documentWidths.scrollWidth).toBeLessThanOrEqual(documentWidths.clientWidth + 1);

  const overflowedBoundaries = await page
    .locator('[role="tabpanel"]:visible')
    .locator(
      'form, fieldset, [data-cy="schema-field-row"], [data-cy="schema-object-fieldset"], .sk-disclosure-body, .schema-text-editor, .ql-toolbar'
    )
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const htmlElement = element as HTMLElement;
        if (htmlElement.getClientRects().length === 0 || htmlElement.clientWidth === 0) return [];
        const boundary = htmlElement.getBoundingClientRect();
        return htmlElement.scrollWidth > htmlElement.clientWidth + 1
          ? [
              {
                element: htmlElement.id || htmlElement.className || htmlElement.tagName,
                clientWidth: htmlElement.clientWidth,
                scrollWidth: htmlElement.scrollWidth,
                leakingDescendants: [...htmlElement.querySelectorAll<HTMLElement>('*')].flatMap((descendant) => {
                  if (descendant.getClientRects().length === 0) return [];
                  const rect = descendant.getBoundingClientRect();
                  return rect.left < boundary.left - 1 ||
                    rect.right > boundary.right + 1 ||
                    descendant.scrollWidth > descendant.clientWidth + 1
                    ? [
                        {
                          element: descendant.id || descendant.className || descendant.tagName,
                          clientWidth: descendant.clientWidth,
                          left: Math.round(rect.left),
                          right: Math.round(rect.right),
                          scrollWidth: descendant.scrollWidth,
                        },
                      ]
                    : [];
                }),
              },
            ]
          : [];
      })
    );

  expect(overflowedBoundaries).toEqual([]);
}

async function expectVisibleTextEditorsToFillTheirFrames(page: Page) {
  const editors = page.locator('[role="tabpanel"]:visible .schema-text-editor:visible');
  await expect(editors.first()).toBeVisible();

  const metrics = await editors.evaluateAll((hosts) =>
    hosts.map((host) => {
      const container = host.querySelector<HTMLElement>('.ql-container');
      const editor = host.querySelector<HTMLElement>('.ql-editor');
      const hostRect = host.getBoundingClientRect();
      const containerRect = container?.getBoundingClientRect();
      const editorRect = editor?.getBoundingClientRect();

      return {
        id: editor?.id,
        hostHeight: hostRect.height,
        containerHeight: containerRect?.height ?? 0,
        containerBottomGap: containerRect ? Math.abs(hostRect.bottom - containerRect.bottom) : Number.POSITIVE_INFINITY,
        editorBottomGap:
          containerRect && editorRect ? Math.abs(containerRect.bottom - editorRect.bottom) : Number.POSITIVE_INFINITY,
      };
    })
  );

  for (const metric of metrics) {
    expect(metric.hostHeight, `${metric.id} saknar konfigurerad höjd`).toBeGreaterThan(0);
    expect(metric.containerHeight, `${metric.id} saknar synlig editorram`).toBeGreaterThan(0);
    expect(metric.containerBottomGap, `${metric.id} lämnar tomrum under editorramen`).toBeLessThanOrEqual(1);
    expect(metric.editorBottomGap, `${metric.id} lämnar en oklickbar yta i editorramen`).toBeLessThanOrEqual(1);
  }
}

test.skip(process.env.NEXT_PUBLIC_APPLICATION !== 'IAF', 'Schema-labben körs bara med IAF-profilen.');

test.beforeEach(async ({ page }) => {
  await page.route(`${backendOrigin}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path.endsWith('/featureflags')) {
      await route.fulfill({ json: [] });
      return;
    }

    if (path.endsWith('/me')) {
      await route.fulfill({
        json: {
          data: {
            name: 'Schema Labb',
            firstName: 'Schema',
            lastName: 'Labb',
            email: 'schema.labb@example.test',
            username: 'schema-labb',
            userSettings: { readNotificationsClearedDate: '' },
            permissions: {
              canEditCasedata: false,
              canEditSupportManagement: false,
              canViewAttestations: false,
              canEditAttestations: false,
            },
          },
          message: 'ok',
        },
      });
      return;
    }

    if (path.endsWith('/users/admins')) {
      await route.fulfill({ json: { data: [], message: 'ok' } });
      return;
    }

    if (path.includes('/supportmetadata/')) {
      await route.fulfill({ json: { categories: [] } });
      return;
    }

    await route.fulfill({ json: {} });
  });

  await page.goto('schema-lab/utredning');
});

test('is reachable with the standard IAF profile and renders three investigation schemas', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Lokal schema-labb · Utredning' })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(3);
  await expect(page.getByRole('tab', { name: 'Utredning enhetschef' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Utredning SoL/LSS' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Utredning HSL' })).toBeVisible();

  await expect(page.locator(`#${managerIdPrefix}_legalBases-group input:checked`)).toHaveCount(2);
  await expect(page.locator('[id$="_deviationType"]')).toHaveCount(0);
  await expect(page.locator('[id$="_deviationSubtype"]')).toHaveCount(0);
  await expect(page.locator(`#${managerIdPrefix}_riskAssessmentHsl_calculatedRiskValue`)).toHaveValue('6');
  await expect(page.locator('[data-cy="hsl-risk-threshold-alert"]')).toContainText('HSL-riskvärde 6');
  await expect(page.getByText('Enhetschefens samlade utredning.', { exact: true })).toBeVisible();

  const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
    const counts = new Map<string, number>();
    for (const element of elements) counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
    return [...counts.entries()].filter(([, count]) => count > 1);
  });
  expect(duplicateIds).toEqual([]);
});

test('updates risks and label choices when the manager changes legal bases', async ({ page }) => {
  const activePanel = page.locator('[role="tabpanel"]:visible');
  const legalBases = page.locator(`#${managerIdPrefix}_legalBases-group`);
  const hsl = legalBases.getByLabel(/^HSL –/u);
  const lss = legalBases.getByLabel(/^LSS –/u);
  const sol = legalBases.getByLabel(/^SoL –/u);
  const typeSelect = page.locator('[data-cy="label-classification-type"]');
  const templateSelect = page.locator(`#${managerIdPrefix}_investigationTemplate`);

  await expect(lss).toBeDisabled();
  await expect(templateSelect.locator('option:not([value=""])')).toHaveCount(3);
  await hsl.uncheck({ force: true });

  await expect(lss).toBeEnabled();
  await expect(templateSelect).toHaveValue('sol_lss');
  await expect(templateSelect.locator('option:not([value=""])')).toHaveCount(1);
  await expect(page.locator(`#${managerIdPrefix}_riskAssessmentHsl_probability`)).toHaveCount(0);
  await expect(page.locator(`#${managerIdPrefix}_riskAssessmentSolLss_probability`)).toBeVisible();
  await expect(page.locator(`#${managerIdPrefix}_suspectedMisconduct`)).toBeVisible();
  await expect(typeSelect.locator('option[value="hsl_fall"]')).toHaveCount(0);
  await expect(typeSelect).toHaveValue('');
  await expect(page.locator('[data-cy="label-classification-notice"]')).toContainText(
    'ärendeklassificering passade inte längre valda lagrum'
  );

  await sol.uncheck({ force: true });
  await expect(page.locator(`#${managerIdPrefix}_riskAssessmentSolLss_probability`)).toHaveCount(0);
  await expect(page.locator(`#${managerIdPrefix}_suspectedMisconduct`)).toHaveCount(0);
  await expect(templateSelect).toHaveCount(0);
  await expect(typeSelect).toBeDisabled();

  await activePanel.getByText('Visa lokalt JSON-värde', { exact: true }).click();
  const preview = page.locator('[data-cy="schema-form-data-preview"]:visible');
  await expect(preview).not.toContainText('riskAssessmentHsl');
  await expect(preview).not.toContainText('riskAssessmentSolLss');
  await expect(preview).not.toContainText('suspectedMisconduct');
  await expect(preview).not.toContainText('investigationTemplate');
});

test('mock roles make only the owned investigation editable', async ({ page }) => {
  await page.locator('[data-cy="utredning-sol-lss-tab"]').click();
  const activePanel = page.locator('[role="tabpanel"]:visible');
  await expect(page.locator(`#${solLssIdPrefix}_occurredDate`)).toHaveAttribute('readonly', '');
  await expect(page.locator(`#${solLssIdPrefix}_occurredDate`)).toBeEnabled();
  await expect(page.locator(`#${solLssIdPrefix}_legalBases`)).toHaveValue('SOL, LSS');
  await expect(activePanel.locator('[data-cy="schema-submit-button"]')).toHaveCount(0);

  await page.locator('[data-cy="investigation-lab-role"]').selectOption('lexInvestigator');
  await expect(page.locator(`#${solLssIdPrefix}_occurredDate`)).toBeEnabled();
  await expect(page.locator(`#${solLssIdPrefix}_occurredDate`)).not.toHaveAttribute('readonly', '');
  await expect(activePanel.locator('[data-cy="schema-submit-button"]')).toBeVisible();
});

test('keeps the schema lab inside inner and outer design boundaries', async ({ page }) => {
  for (const width of [320, 375, 767, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });

    for (const tabName of investigationTabNames) {
      await page.getByRole('tab', { name: tabName }).click();
      await openAllDisclosures(page);
      await expectActivePanelToStayWithinBoundaries(page);
    }
  }

  await page.setViewportSize({ width: 1920, height: 1000 });
  const outerWidth = await page
    .locator('[data-cy="investigation-schema-lab-content"]')
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(outerWidth).toBeLessThanOrEqual(1440);
});

test('makes each text editor frame and writing area fill its configured height', async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });

    for (const tabName of investigationTabNames) {
      await page.getByRole('tab', { name: tabName }).click();
      await openAllDisclosures(page);
      await expectVisibleTextEditorsToFillTheirFrames(page);
    }
  }
});

test('preserves WCAG reflow when text spacing is increased', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addStyleTag({
    content: `
      main, main * {
        line-height: 1.5 !important;
        letter-spacing: 0.12em !important;
        word-spacing: 0.16em !important;
      }
      main p {
        margin-bottom: 2em !important;
      }
    `,
  });

  for (const tabName of investigationTabNames) {
    await page.getByRole('tab', { name: tabName }).click();
    await openAllDisclosures(page);
    await expectActivePanelToStayWithinBoundaries(page);
  }
});

test('exposes labels, descriptions, state and disclosure controls accessibly', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'Utredningstext', exact: true });
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('aria-multiline', 'true');
  await expect(editor).toHaveAttribute(
    'aria-describedby',
    new RegExp(`${managerIdPrefix}_investigationText__description`)
  );
  await expect(page.locator(`#${managerIdPrefix}_investigationText__description`)).toBeVisible();

  await expect(page.getByRole('radiogroup', { name: 'Sannolikhet för inträffande *' }).first()).toBeVisible();
  await expect(page.getByRole('group', { name: /Vilket eller vilka lagrum gäller/u })).toBeVisible();

  const sectionButton = page.getByRole('button', { name: 'Kategorisering och dokumentation' });
  await expect(sectionButton).toHaveAttribute('aria-expanded', 'true');
  await sectionButton.focus();
  await page.keyboard.press('Enter');
  await expect(sectionButton).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Space');
  await expect(sectionButton).toHaveAttribute('aria-expanded', 'true');

  const visibleHeadingLevels = await page
    .locator('main h1:visible, main h2:visible, main h3:visible, main h4:visible')
    .evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
  expect(
    visibleHeadingLevels.every((level, index) => index === 0 || level - visibleHeadingLevels[index - 1] <= 1)
  ).toBe(true);

  await page.getByRole('button', { name: 'Spara utkast lokalt' }).click();
  await expect(page.getByRole('status')).toContainText('Utkastet är sparat');
});

test('calculates risk values and restores a locally saved draft after reload', async ({ page }) => {
  await page.locator(`#${managerIdPrefix}_riskAssessmentHsl_probability`).getByLabel(/^1 –/u).check();
  await page.locator(`#${managerIdPrefix}_riskAssessmentHsl_severity`).getByLabel(/^1 –/u).check();

  await expect(page.locator(`#${managerIdPrefix}_riskAssessmentHsl_calculatedRiskValue`)).toHaveValue('1');
  await expect(page.locator('[data-cy="hsl-risk-threshold-alert"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Spara utkast lokalt' }).click();
  await expect(page.locator('[data-cy="investigation-lab-notice"]')).toContainText('Utkastet är sparat');

  await page.reload();
  await expect(page.locator(`#${managerIdPrefix}_riskAssessmentHsl_calculatedRiskValue`)).toHaveValue('1');
});

test('keeps SupportManagement labels separate from investigation JSON', async ({ page }) => {
  const typeSelect = page.locator('[data-cy="label-classification-type"]');
  const subtypeSelect = page.locator('[data-cy="label-classification-subtype"]');

  await expect(page.getByLabel('Avvikelsetyp')).toBeVisible();
  await expect(page.getByLabel('Detaljerad typ av avvikelse')).toBeVisible();
  await expect(typeSelect.locator('option').first()).toHaveText('Välj ärendekategori');
  await expect(typeSelect).toHaveValue('hsl_fall');
  await typeSelect.selectOption('hsl_lakemedel');
  await expect(subtypeSelect).toHaveValue('');
  await subtypeSelect.selectOption('hsl_lakemedel_fel_dos');
  await page.getByRole('button', { name: 'Spara utkast lokalt' }).click();

  const storedValues = await page.evaluate(() => ({
    labels: window.localStorage.getItem('draken:investigation-schema-lab:supportmanagement-labels'),
    investigation: window.localStorage.getItem('draken:investigation-schema-lab:utredning-enhetschef'),
  }));

  expect(storedValues.labels).toContain('"typeCode":"hsl_lakemedel"');
  expect(storedValues.labels).toContain('"subtypeCode":"hsl_lakemedel_fel_dos"');
  expect(storedValues.investigation).not.toContain('deviationType');
  expect(storedValues.investigation).not.toContain('deviationSubtype');

  await page.reload();
  await expect(typeSelect).toHaveValue('hsl_lakemedel');
  await expect(subtypeSelect).toHaveValue('hsl_lakemedel_fel_dos');
});

test('sanitizes legacy label fields and ignores malformed local timestamps', async ({ page }) => {
  const activePanel = page.locator('[role="tabpanel"]:visible');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'draken:investigation-schema-lab:utredning-enhetschef',
      JSON.stringify({
        schemaKey: 'utredning-enhetschef',
        schemaVersion: '1.0',
        savedAt: '2026-08-11T10:00:00.000Z',
        formData: {
          legalBases: ['HSL'],
          deviationType: 'hsl_fall',
          deviationSubtype: 'hsl_fall_vid_forflyttning_med_personal',
        },
      })
    );
  });
  await page.reload();

  await expect(page.locator('[data-cy="investigation-lab-notice"]')).toContainText(
    'Labelägda fält hittades i det lokala utkastet'
  );
  await activePanel.getByText('Visa lokalt JSON-värde', { exact: true }).click();
  const managerPreview = page.locator('[data-cy="schema-form-data-preview"]:visible');
  await expect(managerPreview).not.toContainText('deviationType');
  await expect(managerPreview).not.toContainText('deviationSubtype');

  await page.getByRole('button', { name: 'Spara utkast lokalt' }).click();
  const sanitizedDraft = await page.evaluate(() =>
    window.localStorage.getItem('draken:investigation-schema-lab:utredning-enhetschef')
  );
  expect(sanitizedDraft).not.toContain('deviationType');
  expect(sanitizedDraft).not.toContain('deviationSubtype');

  await page.evaluate(() => {
    window.localStorage.setItem(
      'draken:investigation-schema-lab:utredning-hsl',
      JSON.stringify({
        schemaKey: 'utredning-hsl',
        schemaVersion: '1.0',
        savedAt: 'not-a-date',
        formData: { ivoNotification: 'no', public360CaseNumber: 'P360-legacy' },
      })
    );
  });
  await page.reload();
  await page.locator('[data-cy="utredning-hsl-tab"]').click();
  await expect(page.locator('[data-cy="investigation-lab-notice"]')).toContainText(
    'annan schemaversion eller är ogiltigt'
  );
  await expect(page.locator(`#${hslIdPrefix}_public360CaseNumber`)).toHaveValue('P360-2026-5678');
});

test('shows the IVO number only for a positive IVO notification', async ({ page }) => {
  await page.locator('[data-cy="investigation-lab-role"]').selectOption('masMar');
  await page.locator('[data-cy="utredning-hsl-tab"]').click();
  const activePanel = page.locator('[role="tabpanel"]:visible');
  await activePanel.getByText('Anmälan och dokumentation', { exact: true }).click();

  await expect(page.locator(`#${hslIdPrefix}_public360CaseNumber`)).toBeVisible();
  await expect(page.locator(`#${hslIdPrefix}_ivoCaseNumber`)).toBeVisible();

  await page.locator(`#${hslIdPrefix}_ivoNotification`).getByLabel('Nej').check();
  await expect(page.locator(`#${hslIdPrefix}_public360CaseNumber`)).toBeVisible();
  await expect(page.locator(`#${hslIdPrefix}_ivoCaseNumber`)).toHaveCount(0);

  await activePanel.getByText('Visa lokalt JSON-värde', { exact: true }).click();
  await expect(page.locator('[data-cy="schema-form-data-preview"]:visible')).not.toContainText('ivoCaseNumber');
  await page.getByRole('button', { name: 'Spara utkast lokalt' }).click();
  const storedHslDraft = await page.evaluate(() =>
    window.localStorage.getItem('draken:investigation-schema-lab:utredning-hsl')
  );
  expect(storedHslDraft).not.toContain('ivoCaseNumber');
});
