import { test, expect } from '@playwright/test';

test.describe('Risultati Page (Fase 2.4)', () => {
  test('dovrebbe mostrare "Nessun risultato disponibile" se visitata senza dati', async ({
    page,
  }) => {
    await page.goto('/risultati');
    await expect(page.locator('h2', { hasText: 'Nessun risultato disponibile' })).toBeVisible();
  });

  test('dovrebbe mostrare i risultati dopo il flusso completo', async ({ page }) => {
    // Simuliamo il flusso completo per arrivare alla pagina risultati con dati
    await page.goto('/');

    const dataNascita = page.locator('ion-input[formControlName="dataNascita"] input');
    const dataAssunzione = page.locator('ion-input[formControlName="dataAssunzione"] input');

    await dataNascita.fill('1970-01-01');
    await dataAssunzione.fill('1990-01-01');
    await page.getByRole('button', { name: /Avanti/i }).click();
    await expect(page).toHaveURL(/.*\/scelta-pensione/);

    await page.locator('ion-radio[value="anzianita"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();
    await expect(page).toHaveURL(/.*\/caricamento-dati/);

    await page.getByRole('button', { name: /Calcola Pensione/i }).click();
    await expect(page).toHaveURL(/.*\/risultati/);

    // Verifica elementi principali
    await expect(
      page.locator('ion-card-title', { hasText: 'Data Decorrenza Pensione' }),
    ).toBeVisible();
    const dateElement = page.locator('.date-text');
    await expect(dateElement).toBeVisible();
    const dateText = await dateElement.textContent();
    expect(dateText?.trim().length).toBeGreaterThan(0);

    // Verifica importo pensione netto
    await expect(
      page.locator('ion-card-title', { hasText: 'Pensione Netta Mensile' }),
    ).toBeVisible();
    await expect(page.locator('.amount-text')).toContainText('€');
  });

  test('dovrebbe mostrare il pulsante per scaricare i risultati dopo il flusso', async ({
    page,
  }) => {
    await page.goto('/');
    const dataNascita = page.locator('ion-input[formControlName="dataNascita"] input');
    const dataAssunzione = page.locator('ion-input[formControlName="dataAssunzione"] input');

    await dataNascita.fill('1970-01-01');
    await dataAssunzione.fill('1990-01-01');
    await page.getByRole('button', { name: /Avanti/i }).click();

    await page.locator('ion-radio[value="anzianita"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();

    await page.getByRole('button', { name: /Calcola Pensione/i }).click();
    await expect(page).toHaveURL(/.*\/risultati/);

    const downloadBtn = page.locator('ion-button', {
      hasText: 'Scarica Risultati (.md / PDF)',
    });
    await expect(downloadBtn).toBeVisible();
  });

  test('dovrebbe far comparire un alert al click sul pulsante di download', async ({ page }) => {
    await page.goto('/');
    const dataNascita = page.locator('ion-input[formControlName="dataNascita"] input');
    const dataAssunzione = page.locator('ion-input[formControlName="dataAssunzione"] input');

    await dataNascita.fill('1970-01-01');
    await dataAssunzione.fill('1990-01-01');
    await page.getByRole('button', { name: /Avanti/i }).click();

    await page.locator('ion-radio[value="anzianita"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();

    await page.getByRole('button', { name: /Calcola Pensione/i }).click();
    await expect(page).toHaveURL(/.*\/risultati/);

    const downloadBtn = page.locator('.download-btn');
    await expect(downloadBtn).toBeVisible();

    // Auto-accept dialogs and capture message
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Use dispatchEvent to avoid Playwright blocking on alert()
    await downloadBtn.dispatchEvent('click');
    await page.waitForTimeout(500);

    expect(dialogMessage).toContain('Funzionalità di download');
  });
});
