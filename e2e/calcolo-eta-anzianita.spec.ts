import { expect, test } from '@playwright/test';

test.describe('Calcolo Pensione Età + Anzianità - Flusso E2E (Fase 3.2)', () => {
  test('flusso completo: 58 anni, 35 anni utili e finestra mobile di 12 mesi nel 2026', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('ion-input[formControlName="dataNascita"] input').fill('1968-01-01');
    await page.locator('ion-input[formControlName="dataAssunzione"] input').fill('1996-01-01');
    await page.getByRole('button', { name: /Avanti/i }).click();

    await page.locator('ion-radio[value="eta_anzianita"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();

    await page.getByRole('button', { name: /Calcola Pensione/i }).click();
    await expect(page).toHaveURL(/.*\/risultati/);

    await expect(page.locator('.date-text')).toContainText('01 gennaio 2027');
    await expect(
      page.locator('.info-subtitle').filter({ hasText: 'Diritto maturato' }),
    ).toContainText('Diritto maturato il 01/01/2026 + 12 mesi');
    await expect(page.locator('.detail-row').filter({ hasText: 'Età richiesta' })).toContainText(
      '58 anni',
    );
    await expect(
      page.locator('.detail-row').filter({ hasText: 'Anzianità richiesta' }),
    ).toContainText('35 anni');
    await expect(page.locator('.detail-row').filter({ hasText: 'Finestra mobile' })).toContainText(
      '12 mesi',
    );
    await expect(
      page.locator('.detail-row').filter({ hasText: 'Servizio utile totale' }),
    ).toContainText('35 anni');
  });

  test('applica l’adeguamento 2027: 58 anni e 1 mese + 35 anni utili', async ({ page }) => {
    await page.goto('/');
    await page.locator('ion-input[formControlName="dataNascita"] input').fill('1969-01-01');
    await page.locator('ion-input[formControlName="dataAssunzione"] input').fill('1997-02-01');
    await page.getByRole('button', { name: /Avanti/i }).click();

    await page.locator('ion-radio[value="eta_anzianita"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();
    await page.getByRole('button', { name: /Calcola Pensione/i }).click();

    await expect(page.locator('.date-text')).toContainText('01 febbraio 2028');
    await expect(
      page.locator('.info-subtitle').filter({ hasText: 'Diritto maturato' }),
    ).toContainText('Diritto maturato il 01/02/2027 + 12 mesi');
    await expect(page.locator('.detail-row').filter({ hasText: 'Età richiesta' })).toContainText(
      '58 anni e 1 mese',
    );
    await expect(page.locator('.disclaimer').filter({ hasText: 'Adeguamento' })).toContainText(
      'Adeguamento speranza di vita: +1 mese',
    );
  });

  test('applica l’adeguamento 2028: 58 anni e 3 mesi + 35 anni utili', async ({ page }) => {
    await page.goto('/');
    await page.locator('ion-input[formControlName="dataNascita"] input').fill('1970-01-01');
    await page.locator('ion-input[formControlName="dataAssunzione"] input').fill('1998-04-01');
    await page.getByRole('button', { name: /Avanti/i }).click();

    await page.locator('ion-radio[value="eta_anzianita"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();
    await page.getByRole('button', { name: /Calcola Pensione/i }).click();

    await expect(page.locator('.date-text')).toContainText('01 aprile 2029');
    await expect(
      page.locator('.info-subtitle').filter({ hasText: 'Diritto maturato' }),
    ).toContainText('Diritto maturato il 01/04/2028 + 12 mesi');
    await expect(page.locator('.detail-row').filter({ hasText: 'Età richiesta' })).toContainText(
      '58 anni e 3 mesi',
    );
    await expect(page.locator('.disclaimer').filter({ hasText: 'Adeguamento' })).toContainText(
      'Adeguamento speranza di vita: +3 mesi',
    );
  });
});
