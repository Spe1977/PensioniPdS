import { test, expect } from '@playwright/test';

test.describe('Calcolo Pensione Anzianità - Flusso E2E (Fase 3.1)', () => {
  test('flusso completo: home → scelta → calcola → risultati con dati pre-2026', async ({
    page,
  }) => {
    // 1. Home: inserire date
    await page.goto('/');
    const dataNascita = page.locator('ion-input[formControlName="dataNascita"] input');
    const dataAssunzione = page.locator('ion-input[formControlName="dataAssunzione"] input');

    await dataNascita.fill('1970-01-01');
    await dataAssunzione.fill('1990-01-01');
    await page.getByRole('button', { name: /Avanti/i }).click();
    await expect(page).toHaveURL(/.*\/scelta-pensione/);

    // 2. Scelta pensione: selezionare "anzianità"
    await page.locator('ion-radio[value="anzianita"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();
    await expect(page).toHaveURL(/.*\/caricamento-dati/);

    // 3. Caricamento dati: calcola pensione
    await page.getByRole('button', { name: /Calcola Pensione/i }).click();
    await expect(page).toHaveURL(/.*\/risultati/);

    // 4. Risultati: verificare che i dati siano mostrati
    await expect(
      page.locator('ion-card-title', { hasText: 'Data Decorrenza Pensione' }),
    ).toBeVisible();
    await expect(page.locator('.date-text')).toBeVisible();
    const dateText = await page.locator('.date-text').textContent();
    expect(dateText?.trim().length).toBeGreaterThan(0);

    // Verifica dettaglio servizio
    await expect(page.locator('ion-card-title', { hasText: 'Dettaglio Servizio' })).toBeVisible();
    await expect(page.locator('.detail-label', { hasText: 'Servizio effettivo' })).toBeVisible();
    await expect(page.locator('.detail-label', { hasText: 'Maggiorazione 1/5' })).toBeVisible();
    await expect(page.locator('.detail-label', { hasText: 'Servizio utile totale' })).toBeVisible();

    // Verifica requisiti applicati
    await expect(page.locator('ion-card-title', { hasText: 'Requisiti Applicati' })).toBeVisible();
    await expect(page.locator('.detail-label', { hasText: 'Anzianità richiesta' })).toBeVisible();
    await expect(page.locator('.detail-label', { hasText: 'Finestra mobile' })).toBeVisible();
  });

  test('dovrebbe mostrare "Nessun risultato" se si naviga direttamente ai risultati', async ({
    page,
  }) => {
    await page.goto('/risultati');
    await expect(page.locator('h2', { hasText: 'Nessun risultato disponibile' })).toBeVisible();
  });

  test('dovrebbe mostrare avviso per maturazione post-2028', async ({ page }) => {
    await page.goto('/');
    const dataNascita = page.locator('ion-input[formControlName="dataNascita"] input');
    const dataAssunzione = page.locator('ion-input[formControlName="dataAssunzione"] input');

    // Assunzione recente: maturazione post-2028
    await dataNascita.fill('1978-01-01');
    await dataAssunzione.fill('1998-01-01');
    await page.getByRole('button', { name: /Avanti/i }).click();
    await expect(page).toHaveURL(/.*\/scelta-pensione/);

    await page.locator('ion-radio[value="anzianita"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();
    await expect(page).toHaveURL(/.*\/caricamento-dati/);

    await page.getByRole('button', { name: /Calcola Pensione/i }).click();
    await expect(page).toHaveURL(/.*\/risultati/);

    // Deve mostrare l'avviso post-2028
    await expect(page.locator('.avviso-text')).toBeVisible();
    const avvisoText = await page.locator('.avviso-text').textContent();
    expect(avvisoText).toContain('2028');
  });

  test('applica la tabella 2028: 41 anni e 3 mesi utili più 15 mesi', async ({ page }) => {
    await page.goto('/');
    await page.locator('ion-input[formControlName="dataNascita"] input').fill('1972-01-01');
    await page.locator('ion-input[formControlName="dataAssunzione"] input').fill('1992-01-01');
    await page.getByRole('button', { name: /Avanti/i }).click();

    await page.locator('ion-radio[value="anzianita"]').click();
    await page.getByRole('button', { name: /Continua/i }).click();
    await page.getByRole('button', { name: /Calcola Pensione/i }).click();

    await expect(page.locator('.date-text')).toContainText('01 luglio 2029');
    await expect(
      page.locator('.info-subtitle').filter({ hasText: 'Diritto maturato' }),
    ).toContainText('Diritto maturato il 01/04/2028 + 15 mesi');
    await expect(
      page.locator('.detail-row').filter({ hasText: 'Anzianità richiesta' }),
    ).toContainText('41 anni e 3 mesi');
    await expect(
      page.locator('.disclaimer').filter({ hasText: 'Adeguamento servizio utile' }),
    ).toContainText('Adeguamento servizio utile: +3 mesi');
  });

  test('dovrebbe mostrare il calcolo netto mensile della fase 4.1', async ({ page }) => {
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

    await expect(
      page.locator('ion-card-title', { hasText: 'Pensione Netta Mensile' }),
    ).toBeVisible();
    await expect(page.locator('.amount-text')).toContainText('€');
    await expect(page.locator('.info-subtitle', { hasText: 'B - Misto' })).toBeVisible();
    await expect(page.locator('.detail-row').filter({ hasText: 'Lordo annuo' })).toBeVisible();
    await expect(page.locator('.disclaimer')).toContainText('moltiplicatore non applicato');
  });

  test('dovrebbe mostrare il pulsante scarica risultati', async ({ page }) => {
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

    await expect(
      page.locator('ion-button', { hasText: 'Scarica Risultati (.md / PDF)' }),
    ).toBeVisible();
  });
});
