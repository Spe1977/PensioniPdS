import { test, expect } from '@playwright/test';

test.describe('Scelta Pensione Page (Fase 2.2)', () => {
  test.beforeEach(async ({ page }) => {
    // Navighiamo alla home e poi andiamo a scelta-pensione, in modo da testare l'integrazione o ci andiamo direttamente
    await page.goto('/scelta-pensione');
  });

  test('dovrebbe mostrare le tre opzioni di simulazione', async ({ page }) => {
    await expect(page.locator('ion-radio[value="anzianita"]')).toBeVisible();
    await expect(page.locator('ion-radio[value="eta_anzianita"]')).toBeVisible();
    await expect(page.locator('ion-radio[value="limiti_eta"]')).toBeVisible();
  });

  test('non dovrebbe mostrare la scelta del limite ordinamentale inizialmente', async ({
    page,
  }) => {
    await expect(
      page.locator('ion-select[formControlName="limiteOrdinamentale"]'),
    ).not.toBeVisible();
  });

  test('dovrebbe mostrare la scelta del limite ordinamentale se si seleziona limiti_eta', async ({
    page,
  }) => {
    // Playwright needs to click on the ion-radio or its label. The radio acts as the clickable element.
    await page.locator('ion-radio[value="limiti_eta"]').click();
    await expect(page.locator('ion-select[formControlName="limiteOrdinamentale"]')).toBeVisible();
  });

  test('dovrebbe navigare a caricamento-dati se si sceglie anzianita e si preme Continua', async ({
    page,
  }) => {
    await page.locator('ion-radio[value="anzianita"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();
    await expect(page).toHaveURL(/.*\/caricamento-dati/);
  });

  test('dovrebbe navigare a caricamento-dati se si sceglie eta_anzianita e si preme Continua', async ({
    page,
  }) => {
    await page.locator('ion-radio[value="eta_anzianita"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();
    await expect(page).toHaveURL(/.*\/caricamento-dati/);
  });

  test('non dovrebbe navigare se si sceglie limiti_eta ma non si seleziona il limite e si preme Continua', async ({
    page,
  }) => {
    await page.locator('ion-radio[value="limiti_eta"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();
    await expect(page).not.toHaveURL(/.*\/caricamento-dati/);
  });

  test('dovrebbe navigare a caricamento-dati se si sceglie limiti_eta, si imposta il limite e si preme Continua', async ({
    page,
  }) => {
    await page.locator('ion-radio[value="limiti_eta"]').click();

    // Interact with ionic select. It opens an action-sheet.
    await page.locator('ion-select[formControlName="limiteOrdinamentale"]').click();

    // Wait for the action sheet to present and click the correct button
    const actionSheetButton = page.locator('ion-action-sheet .action-sheet-button', {
      hasText: '60 anni',
    });
    await actionSheetButton.waitFor({ state: 'visible' });
    await actionSheetButton.click();

    // Wait for action sheet to dismiss
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Continua/i }).click();

    await expect(page).toHaveURL(/.*\/caricamento-dati/);
  });
});
