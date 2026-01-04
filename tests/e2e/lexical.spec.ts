import { test, expect } from '@playwright/test';

test.describe('Lexical Test App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to lexical test app
    await page.goto('http://localhost:5174');
  });

  test('should load the editor', async ({ page }) => {
    const editor = page.locator('#editor');
    await expect(editor).toBeVisible();
  });

  test('should show plugin status indicator', async ({ page }) => {
    const statusIndicator = page.locator('text=✓ Lexical Plugin Active');
    await expect(statusIndicator).toBeVisible();
  });

  test('should capture snapshot', async ({ page }) => {
    const editor = page.locator('#editor');
    await editor.click();
    await editor.type('Test input for Lexical');

    const captureBtn = page.locator('#capture-snapshot');
    
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Snapshot captured');
      await dialog.accept();
    });
    
    await captureBtn.click();
    await page.waitForTimeout(500);
  });

  test('should show plugin state', async ({ page }) => {
    const showStateBtn = page.locator('button:has-text("Show Lexical State")');
    await expect(showStateBtn).toBeVisible();
    
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Lexical Plugin Status');
      await dialog.accept();
    });
    
    await showStateBtn.click();
    await page.waitForTimeout(500);
  });

  test('should export data', async ({ page }) => {
    const editor = page.locator('#editor');
    await editor.click();
    await editor.type('Test export');

    const exportBtn = page.locator('#export-data');
    await exportBtn.click();

    await page.waitForTimeout(1000);
  });
});
