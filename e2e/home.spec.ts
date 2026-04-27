import { test, expect } from '@playwright/test';

test.describe('Home Page (Fase 2.1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dovrebbe mostrare il titolo e il sottotitolo corretti', async ({ page }) => {
    await expect(page.locator('h1.main-title')).toHaveText('PensioniPdS');
    await expect(page.locator('h2.sub-title')).toHaveText(
      'Simulatore pensionistico semplice ed automatico',
    );
  });

  test('dovrebbe contenere i campi e i pulsanti richiesti', async ({ page }) => {
    // Campi input
    await expect(page.locator('ion-input[formControlName="dataNascita"]')).toBeVisible();
    await expect(page.locator('ion-input[formControlName="dataAssunzione"]')).toBeVisible();

    // Pulsanti
    await expect(page.getByRole('button', { name: /Avanti/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancella dati/i })).toBeVisible();
  });

  test('dovrebbe navigare a scelta-pensione se il form è valido e si preme Avanti', async ({
    page,
  }) => {
    // Individuiamo l'input nativo all'interno del componente Ionic
    const dataNascita = page.locator('ion-input[formControlName="dataNascita"] input');
    const dataAssunzione = page.locator('ion-input[formControlName="dataAssunzione"] input');

    await dataNascita.fill('1980-01-01');
    await dataAssunzione.fill('2000-01-01');

    await page.getByRole('button', { name: /Avanti/i }).click();

    // Aspetta che l'URL cambi in /scelta-pensione
    await expect(page).toHaveURL(/.*\/scelta-pensione/);
  });

  test('dovrebbe cancellare i dati quando si preme Cancella dati', async ({ page }) => {
    const dataNascita = page.locator('ion-input[formControlName="dataNascita"] input');
    const dataAssunzione = page.locator('ion-input[formControlName="dataAssunzione"] input');

    await dataNascita.fill('1980-01-01');
    await dataAssunzione.fill('2000-01-01');

    await page.getByRole('button', { name: /Cancella dati/i }).click();

    await expect(dataNascita).toHaveValue('');
    await expect(dataAssunzione).toHaveValue('');
  });

  test('non dovrebbe navigare se i campi obbligatori sono vuoti', async ({ page }) => {
    await page.getByRole('button', { name: /Avanti/i }).click();

    // L'URL non dovrebbe contenere scelta-pensione
    await expect(page).not.toHaveURL(/.*\/scelta-pensione/);
  });
});
