import { test, expect } from '@playwright/test';

test.describe('Caricamento Dati Page (Fase 2.3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/caricamento-dati');
  });

  test('dovrebbe mostrare la sezione per il caricamento del documento INPS', async ({ page }) => {
    await expect(page.locator('h3:has-text("Estratto Contributivo INPS")')).toBeVisible();
    await expect(page.locator('input[type="file"][accept=".xml,.pdf"]')).toHaveCount(1);
  });

  test('dovrebbe mostrare la sezione per i contributi futuri ipotetici', async ({ page }) => {
    await expect(page.locator('h4:has-text("Contributi futuri ipotetici")')).toBeVisible();
    await expect(page.getByRole('button', { name: /Aggiungi Anno/i })).toBeVisible();
  });

  test('dovrebbe permettere di aggiungere e rimuovere un anno di contributo futuro', async ({
    page,
  }) => {
    // Inizialmente non ci sono righe (o comunque possiamo contare quante sono)
    const initialCount = await page.locator('.contributo-row').count();

    // Aggiungi un anno
    await page.getByRole('button', { name: /Aggiungi Anno/i }).click();
    await expect(page.locator('.contributo-row')).toHaveCount(initialCount + 1);

    // Controlla che i campi siano visibili
    const row = page.locator('.contributo-row').last();
    await expect(row.locator('ion-input[formControlName="anno"]')).toBeVisible();
    await expect(row.locator('ion-input[formControlName="importo"]')).toBeVisible();
    await expect(row.locator('ion-input[formControlName="tassoRivalutazione"]')).toBeVisible();

    // Rimuovi l'anno
    await row.locator('ion-button[color="danger"]').click();
    await expect(page.locator('.contributo-row')).toHaveCount(initialCount);
  });

  test('dovrebbe mostrare la sezione per il caricamento della CU', async ({ page }) => {
    await expect(page.locator('h3:has-text("Certificazione Unica (CU)")')).toBeVisible();
    // CU and Busta paga share accept=".pdf"
    await expect(page.locator('input[type="file"][accept=".pdf"]').nth(0)).toBeAttached();
  });

  test('dovrebbe mostrare la sezione per il caricamento della Busta Paga', async ({ page }) => {
    await expect(page.locator('h3:has-text("Ultima Busta Paga")')).toBeVisible();
    await expect(page.locator('input[type="file"][accept=".pdf"]').nth(1)).toBeAttached();
  });

  test('dovrebbe navigare ai risultati al click su Calcola Pensione', async ({ page }) => {
    const btnCalcola = page.getByRole('button', { name: /Calcola Pensione/i });
    await expect(btnCalcola).toBeVisible();

    await btnCalcola.click();

    // Assumendo che il routing porti a /risultati (come previsto in Fase 2.4)
    await expect(page).toHaveURL(/.*\/risultati/);
  });
});
