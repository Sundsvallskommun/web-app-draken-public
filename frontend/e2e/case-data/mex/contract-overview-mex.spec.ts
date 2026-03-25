import { test, expect } from '../../fixtures/base.fixture';
import { mockNotifications } from '../../kontaktcenter/fixtures/mockSupportNotifications';
import { mockAdmins } from '../fixtures/mockAdmins';
import { mockContractAttachment } from '../fixtures/mockContract';
import {
  mockContractsList,
  mockContractsListEmpty,
  mockContractsListFiltered,
  mockContractDetailLeaseAgreement,
  mockContractDetailPurchaseAgreement,
  mockContractInvoices,
  mockContractInvoicesEmpty,
} from '../fixtures/mockContractsList';
import { mockErrands_base } from '../fixtures/mockErrands';
import { mockMe } from '../fixtures/mockMe';

test.describe('Contract Overview page', () => {
  test.beforeEach(async ({ page, mockRoute, dismissCookieConsent }) => {
    await mockRoute('**/users/admins', mockAdmins, { method: 'GET' });
    await mockRoute('**/me', mockMe, { method: 'GET' });
    await mockRoute('**/featureflags', [], { method: 'GET' });
    await mockRoute('**/errands*', mockErrands_base, { method: 'GET' }); // @getErrands
    await mockRoute('**/casedatanotifications/2281', mockNotifications, { method: 'GET' }); // @getNotifications
    await mockRoute('**/contracts?*', mockContractsList, { method: 'GET' }); // @getContracts
    await page.goto('oversikt');
    await page.waitForResponse((resp) => resp.url().includes('/errands') && resp.status() === 200);
    await dismissCookieConsent();
  });

  const navigateToContractOverview = async (page) => {
    await page.getByRole('button', { name: 'Avtalsöversikt' }).click();
    await page.waitForResponse((resp) => resp.url().includes('/contracts?') && resp.status() === 200);
  };

  test('can navigate to contract overview by clicking Avtalsöversikt button', async ({ page }) => {
    await page.getByRole('button', { name: 'Avtalsöversikt' }).click();
    await page.waitForResponse((resp) => resp.url().includes('/contracts?') && resp.status() === 200);
    await expect(page.locator('h1').filter({ hasText: 'Alla avtal' })).toBeVisible();
  });

  test('displays the contracts table with correct headers', async ({ page }) => {
    await navigateToContractOverview(page);
    await expect(page.locator('[data-cy="contracts-table"]')).toBeVisible();

    const expectedHeaders = [
      'Status',
      'Fastighetsbeteckning',
      'Distrikt',
      'Avtalstyp',
      'Undertyp',
      'Avtals-id',
      'Parter',
      'Avtalsperiod',
      'Uppsägningsdatum',
    ];

    for (const header of expectedHeaders) {
      await expect(page.locator('[data-cy="contracts-table"] th').filter({ hasText: header })).toBeVisible();
    }
  });

  test('displays contract data in the table', async ({ page }) => {
    await navigateToContractOverview(page);
    await expect(page.locator('[data-cy="contracts-table"] tbody tr')).toHaveCount(mockContractsList.content?.length);

    // Check first row data
    const firstRow = page.locator('[data-cy="contracts-table"] tbody tr').first();
    await expect(firstRow.getByText('TESTKOMMUN TESTFASTIGHET 1:1')).toBeVisible();
    await expect(firstRow.getByText('Testdistrikt Norra')).toBeVisible();
    await expect(firstRow.getByText('Arrende')).toBeVisible();
    await expect(firstRow.getByText('Båtplats')).toBeVisible();
    await expect(firstRow.getByText('2049-00001')).toBeVisible();
    await expect(firstRow.getByText('101')).toBeVisible();
    await expect(firstRow.getByText('Test Kommun AB')).toBeVisible();
    await expect(firstRow.getByText('Testföretag AB')).toBeVisible();
    await expect(firstRow.getByText('2024-01-01')).toBeVisible();
    await expect(firstRow.getByText('2025-12-31')).toBeVisible();
  });

  test('displays the filter bar', async ({ page }) => {
    await navigateToContractOverview(page);
    await expect(page.locator('[data-cy="contract-query-filter"]')).toBeVisible();
    // cy.get('[data-cy="show-filters-button"]').should('exist');
    await expect(page.locator('[data-cy="contract-type-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="contract-lease-type-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="contract-dates-filter"]')).toBeVisible();
    await expect(page.locator('[data-cy="contract-status-filter"]')).toBeVisible();
  });

  test('can use the search field', async ({ page, mockRoute }) => {
    await navigateToContractOverview(page);
    await page.locator('[data-cy="contract-query-filter"]').fill('BALDER');
    await mockRoute('**/contracts?*', mockContractsListFiltered, { method: 'GET' }); // @getFilteredContracts
    await page.locator('[data-cy="contract-query-filter"]').locator('..').locator('button').filter({ hasText: 'Sök' }).click();
    await page.waitForResponse((resp) => resp.url().includes('/contracts?') && resp.status() === 200);
    await expect(page.locator('[data-cy="contracts-table"] tbody tr')).toHaveCount(mockContractsListFiltered.content?.length);
  });

  test('can filter by contract type', async ({ page, mockRoute }) => {
    await navigateToContractOverview(page);
    await page.locator('[data-cy="contract-type-filter"]').click();
    await mockRoute('**/contracts?*', mockContractsListFiltered, { method: 'GET' }); // @getFilteredContracts
    await page.locator('[data-cy="contract-type-filter-LEASE_AGREEMENT"]').click({ force: true });
    await page.waitForResponse((resp) => resp.url().includes('/contracts?') && resp.status() === 200);
  });

  test('can filter by lease type (subtype)', async ({ page, mockRoute }) => {
    await navigateToContractOverview(page);
    await page.locator('[data-cy="contract-lease-type-filter"]').click();
    await mockRoute('**/contracts?*', mockContractsListFiltered, { method: 'GET' }); // @getFilteredContracts
    await page.locator('[data-cy="contract-lease-type-filter-LAND_LEASE_RESIDENTIAL"]').click({ force: true });
    await page.waitForResponse((resp) => resp.url().includes('/contracts?') && resp.status() === 200);
  });

  test('can filter by status', async ({ page, mockRoute }) => {
    await navigateToContractOverview(page);
    await page.locator('[data-cy="contract-status-filter"]').click();
    await mockRoute('**/contracts?*', mockContractsListFiltered, { method: 'GET' }); // @getFilteredContracts
    await page.locator('[data-cy="contract-status-filter-ACTIVE"]').click({ force: true });
    await page.waitForResponse((resp) => resp.url().includes('/contracts?') && resp.status() === 200);
  });

  test('can filter by date period', async ({ page, mockRoute }) => {
    await navigateToContractOverview(page);
    await page.locator('[data-cy="contract-dates-filter"]').click();
    await page.locator('[data-cy="contract-filter-startdate"]').fill('2024-01-01');
    await page.locator('[data-cy="contract-filter-enddate"]').fill('2024-12-31');
    await mockRoute('**/contracts?*', mockContractsListFiltered, { method: 'GET' }); // @getFilteredContracts
    await page.locator('[data-cy="contract-dates-apply"]').click();
    await page.waitForResponse((resp) => resp.url().includes('/contracts?') && resp.status() === 200);
  });

  test('displays empty state when no contracts found', async ({ page, mockRoute }) => {
    // Override the default intercept before navigating
    await mockRoute('**/contracts?*', mockContractsListEmpty, { method: 'GET' }); // @getContracts
    await page.getByRole('button', { name: 'Avtalsöversikt' }).click();
    await page.waitForResponse((resp) => resp.url().includes('/contracts?') && resp.status() === 200);
    await expect(page.getByText('Inga avtal hittades')).toBeVisible();
  });

  test('displays pagination controls', async ({ page }) => {
    await navigateToContractOverview(page);
    // Pagination controls are in the table footer area
    await expect(page.getByText('Sida:')).toBeVisible();
    await expect(page.getByText('Rader per sida:')).toBeVisible();
    await expect(page.getByText('Radhöjd:')).toBeVisible();
    await expect(page.locator('input#pageSize')).toBeVisible();
    await expect(page.locator('select#rowHeight')).toBeVisible();
  });

  test('can change rows per page', async ({ page, mockRoute }) => {
    await navigateToContractOverview(page);
    await page.locator('input#pageSize').clear();
    await page.locator('input#pageSize').fill('24');
    await mockRoute('**/contracts?*', mockContractsList, { method: 'GET' }); // @getContractsNewLimit
    await page.waitForResponse((resp) => resp.url().includes('/contracts?') && resp.url().includes('limit=24') && resp.status() === 200);
  });

  test('can change row height', async ({ page }) => {
    await navigateToContractOverview(page);
    await page.locator('select#rowHeight').selectOption('Tät');
    // The dense prop adds a data-dense attribute
    await expect(page.locator('[data-cy="contracts-table"]')).toHaveAttribute('data-dense', 'dense');
  });

  test('displays parties on separate lines', async ({ page }) => {
    await navigateToContractOverview(page);
    // Check that parties are displayed on separate lines (in separate divs)
    const firstRow = page.locator('[data-cy="contracts-table"] tbody tr').first();
    await expect(firstRow.locator('td').nth(6).locator('div > div')).toHaveCount(2);
    await expect(firstRow.locator('td').nth(6).locator('div > div').first()).toContainText('Test Kommun AB');
    await expect(firstRow.locator('td').nth(6).locator('div > div').last()).toContainText('Testföretag AB');
  });

  test('displays contract period dates on separate lines', async ({ page }) => {
    await navigateToContractOverview(page);
    // Check that dates are displayed on separate lines (in separate divs)
    const firstRow = page.locator('[data-cy="contracts-table"] tbody tr').first();
    await expect(firstRow.locator('td').nth(7).locator('div > div')).toHaveCount(2);
    await expect(firstRow.locator('td').nth(7).locator('div > div').first()).toContainText('2024-01-01');
    await expect(firstRow.locator('td').nth(7).locator('div > div').last()).toContainText('2025-12-31');
  });

  test('can sort by clicking sortable column headers', async ({ page, mockRoute }) => {
    await navigateToContractOverview(page);
    // Click on Avtalstyp header to sort
    await mockRoute('**/contracts?*', mockContractsList, { method: 'GET' }); // @getSortedContracts
    await page.locator('[data-cy="contracts-table"] th').filter({ hasText: 'Avtalstyp' }).click();
    await page.waitForResponse((resp) => resp.url().includes('/contracts?') && resp.status() === 200);
  });

  test.describe('Contract detail panel', () => {
    test.beforeEach(async ({ mockRoute }) => {
      // Intercept attachment requests to prevent 401 errors
      await mockRoute('**/contracts/**/attachments/**', mockContractAttachment, { method: 'GET' }); // @getContractAttachment
    });

    test('opens contract detail panel when clicking a row', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      // Click on the first contract row
      await page.locator('[data-cy="contract-row-0"]').click();

      // The detail panel should appear
      await expect(page.locator('[data-cy="close-contract-detail-wrapper"]')).toBeVisible();
    });

    test('displays correct contract type in panel header for lease agreement', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Header should show "Arrende" for lease agreement
      await expect(page.locator('[data-cy="contract-detail-panel"]').getByText('Arrende')).toBeVisible();
    });

    test('displays correct contract type in panel header for purchase agreement', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailPurchaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Header should show "Köpeavtal" for purchase agreement
      await expect(page.locator('[data-cy="contract-detail-panel"]').getByText('Köpeavtal')).toBeVisible();
    });

    test('displays parties disclosure with party tables for lease agreement', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Parties disclosure should be visible and initially open
      await expect(page.locator('[data-cy="parties-disclosure"]')).toBeVisible();

      // Upplåtare table should show lessor
      await expect(page.locator('[data-cy="Upplåtare-table"]')).toBeVisible();
      await expect(page.locator('[data-cy="Upplåtare-table"]').getByText('Sundsvalls Kommun')).toBeVisible();

      // Arrendatorer table should show lessees
      await expect(page.locator('[data-cy="Arrendatorer-table"]')).toBeVisible();
      await expect(page.locator('[data-cy="Arrendatorer-table"]').getByText('Anna Arrendator')).toBeVisible();
      await expect(page.locator('[data-cy="Arrendatorer-table"]').getByText('Bengt Arrendator')).toBeVisible();
    });

    test('displays parties disclosure with party tables for purchase agreement', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailPurchaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Parties disclosure should be visible
      await expect(page.locator('[data-cy="parties-disclosure"]')).toBeVisible();

      // Säljare table should show seller
      await expect(page.locator('[data-cy="Säljare-table"]')).toBeVisible();
      await expect(page.locator('[data-cy="Säljare-table"]').getByText('Sundsvalls Kommun')).toBeVisible();

      // Köpare table should show buyer
      await expect(page.locator('[data-cy="Köpare-table"]')).toBeVisible();
      await expect(page.locator('[data-cy="Köpare-table"]').getByText('Kalle Köpare')).toBeVisible();
    });

    test('displays area disclosure with property designations', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Area disclosure should be visible
      await expect(page.locator('[data-cy="area-disclosure"]')).toBeVisible();
      await page.locator('[data-cy="area-disclosure"]').click();

      // Property designations should be displayed
      await expect(page.locator('[data-cy="property-designation-checkboxgroup"]')).toBeVisible();
    });

    test('displays avtalstid disclosure for lease agreement', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Avtalstid disclosure should be visible for lease agreements
      await expect(page.locator('[data-cy="avtalstid-disclosure"]')).toBeVisible();
      await page.locator('[data-cy="avtalstid-disclosure"]').click();

      // Start and end date fields should exist
      await expect(page.locator('[data-cy="avtalstid-start"]')).toBeVisible();
      await expect(page.locator('[data-cy="avtalstid-end"]')).toBeVisible();
    });

    test('displays lopande avgift disclosure', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Löpande avgift disclosure should be visible
      await expect(page.locator('[data-cy="lopande-disclosure"]')).toBeVisible();
    });

    test('displays bilagor disclosure', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Bilagor disclosure should be visible
      await expect(page.locator('[data-cy="bilagor-disclosure"]')).toBeVisible();
    });

    test('form fields are read-only in contract detail panel', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Old contract ID input should be read-only
      await expect(page.locator('[data-cy="old-contract-id-input"]')).toHaveAttribute('readonly');

      // Open avtalstid disclosure and check date fields
      await page.locator('[data-cy="avtalstid-disclosure"]').click();
      await expect(page.locator('[data-cy="avtalstid-start"]')).toHaveAttribute('readonly');
      await expect(page.locator('[data-cy="avtalstid-end"]')).toHaveAttribute('readonly');
    });

    test('does not display save button in read-only mode', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Save button should not exist
      await expect(page.locator('[data-cy="save-contract-button"]')).not.toBeVisible();
    });

    test('does not display update parties button in read-only mode', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Update parties button should not exist
      await expect(page.locator('[data-cy="update-contract-parties"]')).not.toBeVisible();
    });

    test('closes contract detail panel when clicking close button', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Panel should be visible
      await expect(page.locator('[data-cy="contract-detail-panel"]')).toBeVisible();
      await expect(page.locator('[data-cy="close-contract-detail-wrapper"]')).toBeVisible();

      // Click close button
      await page.locator('[data-cy="close-contract-detail-wrapper"]').click();

      // Panel should be removed from DOM
      await expect(page.locator('[data-cy="contract-detail-panel"]')).not.toBeVisible();
    });

    test('shows backdrop when contract detail panel is open', async ({ page, mockRoute }) => {
      await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      await page.locator('[data-cy="contract-row-0"]').click();

      // Modal wrapper (backdrop) should be visible
      await expect(page.locator('.sk-modal-wrapper')).toBeVisible();
    });

    test('can click different contract rows to view different contracts', async ({ page, mockRoute }) => {
      // Use list with multiple contracts
      await mockRoute('**/contracts?*', mockContractsList, { method: 'GET' }); // @getContracts
      await navigateToContractOverview(page);

      // Click first row (lease agreement)
      await page.locator('[data-cy="contract-row-0"]').click();
      await expect(page.locator('[data-cy="contract-detail-panel"]').getByText('Arrende')).toBeVisible();

      // Close panel
      await page.locator('[data-cy="close-contract-detail-wrapper"]').click();
      await expect(page.locator('[data-cy="contract-detail-panel"]')).not.toBeVisible();

      // Click third row (purchase agreement)
      await page.locator('[data-cy="contract-row-2"]').click();
      await expect(page.locator('[data-cy="contract-detail-panel"]').getByText('Köpeavtal')).toBeVisible();
    });

    test.describe('Contract invoices (Fakturor)', () => {
      test('displays fakturor disclosure section', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await mockRoute('**/billing/**/contracts/**/invoices*', mockContractInvoices, { method: 'GET' }); // @getContractInvoices
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();

        // Fakturor disclosure should be visible
        await expect(page.locator('[data-cy="fakturor-disclosure"]')).toBeVisible();
      });

      test('displays invoices table when opening fakturor disclosure', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await mockRoute('**/billing/**/contracts/**/invoices*', mockContractInvoices, { method: 'GET' }); // @getContractInvoices
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="fakturor-disclosure"]').click();

        await page.waitForResponse((resp) => resp.url().includes('/invoices') && resp.status() === 200);

        // Invoices table should be visible
        await expect(page.locator('[data-cy="contract-invoices-table"]')).toBeVisible();
      });

      test('displays correct invoice data in table', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await mockRoute('**/billing/**/contracts/**/invoices*', mockContractInvoices, { method: 'GET' }); // @getContractInvoices
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="fakturor-disclosure"]').click();

        await page.waitForResponse((resp) => resp.url().includes('/invoices') && resp.status() === 200);

        // Check first invoice row
        await expect(page.locator('[data-cy="invoice-row-0"]')).toBeVisible();
        await expect(page.locator('[data-cy="invoice-status-0"]')).toContainText('Ny');
        await expect(page.locator('[data-cy="invoice-date-0"]')).toContainText('2024-01-15');
        await expect(page.locator('[data-cy="invoice-due-date-0"]')).toContainText('2024-02-15');
        await expect(page.locator('[data-cy="invoice-number-0"]')).toContainText('-');
      });

      test('displays correct status labels with correct colors', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await mockRoute('**/billing/**/contracts/**/invoices*', mockContractInvoices, { method: 'GET' }); // @getContractInvoices
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="fakturor-disclosure"]').click();

        await page.waitForResponse((resp) => resp.url().includes('/invoices') && resp.status() === 200);

        // Check status labels
        await expect(page.locator('[data-cy="invoice-status-0"]')).toContainText('Ny');
        await expect(page.locator('[data-cy="invoice-status-1"]')).toContainText('Godkänd');
        await expect(page.locator('[data-cy="invoice-status-2"]')).toContainText('Fakturerad');
        await expect(page.locator('[data-cy="invoice-status-3"]')).toContainText('Avslagen');
      });

      test('displays download PDF button for each invoice', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await mockRoute('**/billing/**/contracts/**/invoices*', mockContractInvoices, { method: 'GET' }); // @getContractInvoices
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="fakturor-disclosure"]').click();

        await page.waitForResponse((resp) => resp.url().includes('/invoices') && resp.status() === 200);

        // Check download buttons exist
        await expect(page.locator('[data-cy="invoice-download-pdf-0"]')).toBeVisible();
        await expect(page.locator('[data-cy="invoice-download-pdf-0"]')).toContainText('Hämta pdf');
        await expect(page.locator('[data-cy="invoice-download-pdf-1"]')).toBeVisible();
        await expect(page.locator('[data-cy="invoice-download-pdf-2"]')).toBeVisible();
        await expect(page.locator('[data-cy="invoice-download-pdf-3"]')).toBeVisible();
      });

      test('displays empty state when no invoices exist', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await mockRoute('**/billing/**/contracts/**/invoices*', mockContractInvoicesEmpty, { method: 'GET' }); // @getContractInvoices
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="fakturor-disclosure"]').click();

        await page.waitForResponse((resp) => resp.url().includes('/invoices') && resp.status() === 200);

        // Empty state message should be visible
        await expect(page.locator('[data-cy="invoices-empty"]')).toBeVisible();
        await expect(page.getByText('Inga fakturor finns kopplade till detta avtal')).toBeVisible();
      });

      test('displays loading state while fetching invoices', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        // Delay the response to observe loading state
        await page.route('**/billing/**/contracts/**/invoices*', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockContractInvoices),
          });
        });
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="fakturor-disclosure"]').click();

        // Loading state should be visible initially
        await expect(page.locator('[data-cy="invoices-loading"]')).toBeVisible();

        // Wait for loading to complete
        await page.waitForResponse((resp) => resp.url().includes('/invoices') && resp.status() === 200);

        // Loading state should be gone and table visible
        await expect(page.locator('[data-cy="invoices-loading"]')).not.toBeVisible();
        await expect(page.locator('[data-cy="contract-invoices-table"]')).toBeVisible();
      });
    });

    test.describe('Ändra avtalsuppgifter button', () => {
      // Full errand data with all required fields for mapErrandToIErrand
      const errandData = {
        id: 999,
        errandNumber: 'MEX-2024-000999',
        caseType: 'MEX_OTHER',
        channel: 'WEB_UI',
        phase: 'Aktualisering',
        priority: 'MEDIUM',
        status: {
          statusType: 'Ärende inkommit',
          description: 'Ärende inkommit',
        },
        statuses: [],
        municipalityId: '2281',
        description: 'Ändra avtalsuppgifter för avtal 2049-00010',
        stakeholders: [],
        extraParameters: [],
        notes: [],
        decisions: [],
        facilities: [],
        attachments: [],
        notifications: [],
        relatesTo: [],
        created: '2024-01-01T10:00:00.000Z',
        updated: '2024-01-01T10:00:00.000Z',
      };

      // POST /errands response needs data.data structure
      const mockCreatedErrandResponse = {
        data: errandData,
      };

      // GET /errand/:id response uses data.data structure
      const mockCreatedErrand = {
        data: errandData,
      };

      test('displays the Ändra avtalsuppgifter button in contract detail panel', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();

        await expect(page.locator('[data-cy="contract-detail-edit-button"]')).toBeVisible();
        await expect(page.locator('[data-cy="contract-detail-edit-button"]')).toContainText('Ändra avtalsuppgifter');
      });

      test('button is enabled when contract has contractId', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();

        await expect(page.locator('[data-cy="contract-detail-edit-button"]')).toBeEnabled();
      });

      test('shows confirmation dialog when clicking the button', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="contract-detail-edit-button"]').click();

        // Confirmation dialog should appear
        await expect(page.getByText('Ändra avtalsuppgifter')).toBeVisible();
        await expect(page.getByText('Vill du skapa ett nytt ärende för avtal 2049-00010?')).toBeVisible();
        await expect(page.getByText('Ja, skapa ärende')).toBeVisible();
        await expect(page.getByText('Avbryt')).toBeVisible();
      });

      test('does not create errand when clicking Avbryt in confirmation dialog', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        let postErrandCalled = false;
        await page.route('**/errands', async (route) => {
          if (route.request().method() === 'POST') {
            postErrandCalled = true;
          }
          await route.fallback();
        });
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="contract-detail-edit-button"]').click();

        // Click cancel button
        await page.getByText('Avbryt').click();

        // Dialog should close
        await expect(page.getByText('Vill du skapa ett nytt ärende för avtal')).not.toBeVisible();

        // POST should not have been called
        expect(postErrandCalled).toBe(false);
      });

      test('creates errand with correct data when confirming', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await mockRoute('**/errands', mockCreatedErrandResponse, { method: 'POST' }); // @postErrand
        await page.route(/2281\/errand\/999/, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockCreatedErrand),
          });
        }); // @getCreatedErrand
        await mockRoute('**/errands/**/extraparameters', { data: [], message: 'ok' }, { method: 'PATCH' }); // @patchExtraParameters
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="contract-detail-edit-button"]').click();

        // Confirm the dialog
        const requestPromise = page.waitForRequest((req) => req.url().includes('/errands') && req.method() === 'POST');
        await page.getByText('Ja, skapa ärende').click();

        // Wait for the POST request and verify the data
        const request = await requestPromise;
        const body = request.postDataJSON();
        expect(body).toHaveProperty('caseType', 'MEX_OTHER');
        expect(body).toHaveProperty('channel', 'WEB_UI');
        expect(body).toHaveProperty('phase', 'Aktualisering');
        expect(body).toHaveProperty('priority', 'MEDIUM');
        expect(body.description).toContain('Ändra avtalsuppgifter');
        expect(body.description).toContain('2049-00010');

        // Verify stakeholders from contract are included
        const stakeholders = body.stakeholders;
        expect(Array.isArray(stakeholders)).toBe(true);
        expect(stakeholders.length).toBeGreaterThan(0);

        // Verify LESSOR is mapped to GRANTOR
        const grantor = stakeholders.find((s: any) => s.roles?.includes('PROPERTY_OWNER'));
        expect(grantor).toBeDefined();
        expect(grantor.organizationName).toBe('Sundsvalls Kommun');

        // Verify LESSEE is mapped to LEASEHOLDER
        const leaseholders = stakeholders.filter((s: any) => s.roles?.includes('LEASEHOLDER'));
        expect(leaseholders.length).toBe(2);
      });

      test('saves contractId as extraParameter after creating errand', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await mockRoute('**/errands', mockCreatedErrandResponse, { method: 'POST' }); // @postErrand
        await page.route(/2281\/errand\/999/, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockCreatedErrand),
          });
        }); // @getCreatedErrand
        await mockRoute('**/errands/999/stakeholders', mockCreatedErrand, { method: 'PATCH' }); // @patchErrand
        await mockRoute('**/errands/**/extraparameters', { data: [], message: 'ok' }, { method: 'PATCH' }); // @patchExtraParameters
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="contract-detail-edit-button"]').click();

        // Confirm the dialog
        const extraParamsRequestPromise = page.waitForRequest(
          (req) => req.url().includes('/extraparameters') && req.method() === 'PATCH'
        );
        await page.getByText('Ja, skapa ärende').click();

        // Wait for extraParameters PATCH and verify contractId is included
        const extraParamsRequest = await extraParamsRequestPromise;
        const extraParams = extraParamsRequest.postDataJSON();
        const contractIdParam = extraParams.find((p: { key: string }) => p.key === 'contractId');
        expect(contractIdParam).toBeDefined();
        expect(contractIdParam.values).toContain('2049-00010');
      });

      test('shows success toast and navigates to new errand after creation', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await mockRoute('**/errands', mockCreatedErrandResponse, { method: 'POST' }); // @postErrand
        await page.route(/2281\/errand\/999/, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockCreatedErrand),
          });
        }); // @getCreatedErrand
        await mockRoute('**/errands/999/stakeholders', mockCreatedErrand, { method: 'PATCH' }); // @patchErrand
        await mockRoute('**/errands/**/extraparameters', { data: [], message: 'ok' }, { method: 'PATCH' }); // @patchExtraParameters
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="contract-detail-edit-button"]').click();

        // Confirm the dialog
        await page.getByText('Ja, skapa ärende').click();

        // Wait for the extra parameters PATCH
        await page.waitForResponse((resp) => resp.url().includes('/extraparameters') && resp.status() === 200);

        // Success toast should be shown
        await expect(page.getByText('Ärende skapat')).toBeVisible();

        // Should navigate to the new errand page
        await expect(page).toHaveURL(/\/arende\/MEX-2024-000999/);
      });

      test('shows error toast when errand creation fails', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        await mockRoute('**/errands', { error: 'Server error' }, { method: 'POST', status: 500 }); // @postErrandFail
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="contract-detail-edit-button"]').click();

        // Confirm the dialog
        await page.getByText('Ja, skapa ärende').click();

        await page.waitForResponse((resp) => resp.url().includes('/errands') && resp.status() === 500);

        // Error toast should be shown
        await expect(page.getByText('Något gick fel när ärendet skulle skapas')).toBeVisible();
      });

      test('shows loading state while creating errand', async ({ page, mockRoute }) => {
        await mockRoute('**/contracts?*', mockContractDetailLeaseAgreement, { method: 'GET' }); // @getContracts
        // Delay the response to observe loading state
        await page.route('**/errands', async (route) => {
          if (route.request().method() !== 'POST') {
            await route.fallback();
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockCreatedErrandResponse),
          });
        });
        await navigateToContractOverview(page);

        await page.locator('[data-cy="contract-row-0"]').click();
        await page.locator('[data-cy="contract-detail-edit-button"]').click();

        // Confirm the dialog
        await page.getByText('Ja, skapa ärende').click();

        // Button should show loading state
        await expect(page.locator('[data-cy="contract-detail-edit-button"]')).toContainText('Skapar ärende...');
        await expect(page.locator('[data-cy="contract-detail-edit-button"]')).toBeDisabled();
      });
    });
  });
});
