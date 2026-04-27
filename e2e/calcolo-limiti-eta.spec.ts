import { expect, test, type Page } from '@playwright/test';

const compilaHome = async (page: Page, dataNascita: string, dataAssunzione: string) => {
  await page.goto('/');
  await page.locator('ion-input[formControlName="dataNascita"] input').fill(dataNascita);
  await page.locator('ion-input[formControlName="dataAssunzione"] input').fill(dataAssunzione);
  await page.getByRole('button', { name: /Avanti/i }).click();
};

const scegliLimiteOrdinamentale = async (page: Page, limite: '60' | '63' | '65') => {
  await page.locator('ion-radio[value="limiti_eta"]').click();
  await page.locator('ion-select[formControlName="limiteOrdinamentale"]').click();
  await page.getByRole('radio', { name: `${limite} anni` }).click();
  await page.getByRole('button', { name: /Continua/i }).click();
};

test.describe('Calcolo Pensione Limiti di Età - Flusso E2E (Fase 3.3)', () => {
  test('limite 60 anni: nessun adeguamento se al limite ha già 35 anni utili', async ({ page }) => {
    await compilaHome(page, '1966-01-01', '1996-01-01');
    await scegliLimiteOrdinamentale(page, '60');
    await page.getByRole('button', { name: /Calcola Pensione/i }).click();

    await expect(page).toHaveURL(/.*\/risultati/);
    await expect(page.locator('.date-text')).toContainText('01 gennaio 2027');
    await expect(
      page.locator('.info-subtitle').filter({ hasText: 'Diritto maturato' }),
    ).toContainText('Diritto maturato il 01/02/2026 + 12 mesi');
    await expect(page.locator('.detail-row').filter({ hasText: 'Età richiesta' })).toContainText(
      '60 anni',
    );
    await expect(
      page.locator('.detail-row').filter({ hasText: 'Anzianità richiesta' }),
    ).toContainText('35 anni');
    await expect(
      page.locator('.detail-row').filter({ hasText: 'Servizio utile totale' }),
    ).toContainText('36 anni');
  });

  test('limite 60 anni: applica +1 mese nel 2027 se non ha 35 anni utili', async ({ page }) => {
    await compilaHome(page, '1967-01-01', '2000-01-01');
    await scegliLimiteOrdinamentale(page, '60');
    await page.getByRole('button', { name: /Calcola Pensione/i }).click();

    await expect(page.locator('.date-text')).toContainText('01 marzo 2028');
    await expect(
      page.locator('.info-subtitle').filter({ hasText: 'Diritto maturato' }),
    ).toContainText('Diritto maturato il 01/03/2027 + 12 mesi');
    await expect(page.locator('.detail-row').filter({ hasText: 'Età richiesta' })).toContainText(
      '60 anni e 1 mese',
    );
    await expect(page.locator('.disclaimer').filter({ hasText: 'Adeguamento speranza di vita' })).toContainText(
      'Adeguamento speranza di vita: +1 mese',
    );
  });

  test('limite 63 anni: calcola la decorrenza dalla qualifica selezionata', async ({ page }) => {
    await compilaHome(page, '1964-01-01', '1997-01-01');
    await scegliLimiteOrdinamentale(page, '63');
    await page.getByRole('button', { name: /Calcola Pensione/i }).click();

    await expect(page.locator('.date-text')).toContainText('01 gennaio 2028');
    await expect(
      page.locator('.info-subtitle').filter({ hasText: 'Diritto maturato' }),
    ).toContainText('Diritto maturato il 01/02/2027 + 12 mesi');
    await expect(page.locator('.detail-row').filter({ hasText: 'Età richiesta' })).toContainText(
      '63 anni',
    );
  });

  test('limite 60 anni: applica +3 mesi nel 2028 se non ha 35 anni utili', async ({ page }) => {
    await compilaHome(page, '1968-01-01', '2001-01-01');
    await scegliLimiteOrdinamentale(page, '60');
    await page.getByRole('button', { name: /Calcola Pensione/i }).click();

    await expect(page.locator('.date-text')).toContainText('01 maggio 2029');
    await expect(
      page.locator('.info-subtitle').filter({ hasText: 'Diritto maturato' }),
    ).toContainText('Diritto maturato il 01/05/2028 + 12 mesi');
    await expect(page.locator('.detail-row').filter({ hasText: 'Età richiesta' })).toContainText(
      '60 anni e 3 mesi',
    );
    await expect(page.locator('.disclaimer').filter({ hasText: 'Adeguamento speranza di vita' })).toContainText(
      'Adeguamento speranza di vita: +3 mesi',
    );
  });

  test('Fase 4.3: calcola pensione netta per limiti di età con moltiplicatore (Scenario C)', async ({
    page,
  }) => {
    await compilaHome(page, '1968-01-01', '2001-01-01');
    await scegliLimiteOrdinamentale(page, '60');

    // Compila i dati per il calcolo netto
    await page.locator('ion-select[formControlName="scenarioPensione"]').click();
    await page.getByRole('radio', { name: 'C - Contributivo puro' }).click();

    await page.locator('ion-input[formControlName="ultimoImponibileAnnuo"] input').fill('35000');
    await page.locator('ion-input[formControlName="montanteContributivo"] input').fill('400000');
    await page.locator('ion-input[formControlName="coefficienteTrasformazione"] input').fill('5.2');
    await page.locator('ion-input[formControlName="detrazioniAnnue"] input').fill('1955');
    await page.locator('ion-input[formControlName="addizionaleRegionalePercentuale"] input').fill('1.73');
    await page.locator('ion-input[formControlName="addizionaleComunalePercentuale"] input').fill('0.8');

    await page.getByRole('button', { name: /Calcola Pensione/i }).click();

    await expect(page).toHaveURL(/.*\/risultati/);
    await expect(page.locator('.amount-text')).toContainText('1519,09');
    await expect(page.locator('.info-subtitle').filter({ hasText: 'C - Contributivo puro' })).toBeVisible();
    await expect(page.locator('.disclaimer').filter({ hasText: 'moltiplicatore' })).toBeVisible();
  });

  test('Fase 4.3: calcola pensione netta per limiti di età con moltiplicatore (Scenario A)', async ({
    page,
  }) => {
    await compilaHome(page, '1968-01-01', '2001-01-01');
    await scegliLimiteOrdinamentale(page, '60');

    await page.locator('ion-select[formControlName="scenarioPensione"]').click();
    await page.getByRole('radio', { name: 'A - Retributivo pro-rata' }).click();

    await page.locator('ion-input[formControlName="ultimoImponibileAnnuo"] input').fill('40000');
    await page.locator('ion-input[formControlName="quotaRetributivaAnnua"] input').fill('22000');
    await page.locator('ion-input[formControlName="montanteContributivo"] input').fill('220000');
    await page.locator('ion-input[formControlName="coefficienteTrasformazione"] input').fill('5.2');
    await page.locator('ion-input[formControlName="detrazioniAnnue"] input').fill('1955');
    await page.locator('ion-input[formControlName="addizionaleRegionalePercentuale"] input').fill('1.73');
    await page.locator('ion-input[formControlName="addizionaleComunalePercentuale"] input').fill('0.8');

    await page.getByRole('button', { name: /Calcola Pensione/i }).click();

    await expect(page).toHaveURL(/.*\/risultati/);
    await expect(page.locator('.amount-text')).toContainText('2497,00');
    await expect(page.locator('.info-subtitle').filter({ hasText: 'A - Retributivo pro-rata' })).toBeVisible();
    await expect(page.locator('.disclaimer').filter({ hasText: 'moltiplicatore' })).toBeVisible();
  });

  test('Fase 4.3: calcola pensione netta per limiti di età con moltiplicatore (Scenario B)', async ({
    page,
  }) => {
    await compilaHome(page, '1968-01-01', '2001-01-01');
    await scegliLimiteOrdinamentale(page, '60');

    await page.locator('ion-select[formControlName="scenarioPensione"]').click();
    await page.getByRole('radio', { name: 'B - Misto' }).click();

    await page.locator('ion-input[formControlName="ultimoImponibileAnnuo"] input').fill('35000');
    await page.locator('ion-input[formControlName="quotaRetributivaAnnua"] input').fill('9000');
    await page.locator('ion-input[formControlName="montanteContributivo"] input').fill('350000');
    await page.locator('ion-input[formControlName="coefficienteTrasformazione"] input').fill('5.2');
    await page.locator('ion-input[formControlName="detrazioniAnnue"] input').fill('1955');
    await page.locator('ion-input[formControlName="addizionaleRegionalePercentuale"] input').fill('1.73');
    await page.locator('ion-input[formControlName="addizionaleComunalePercentuale"] input').fill('0.8');

    await page.getByRole('button', { name: /Calcola Pensione/i }).click();

    await expect(page).toHaveURL(/.*\/risultati/);
    await expect(page.locator('.amount-text')).toContainText('2128,43');
    await expect(page.locator('.info-subtitle').filter({ hasText: 'B - Misto' })).toBeVisible();
    await expect(page.locator('.disclaimer').filter({ hasText: 'moltiplicatore' })).toBeVisible();
  });
});
