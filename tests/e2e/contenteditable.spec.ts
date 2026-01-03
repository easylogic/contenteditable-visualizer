import { test, expect } from '@playwright/test';

test.describe('ContentEditable Test App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to contenteditable test app
    await page.goto('http://localhost:5175');
  });

  test('should load the editor', async ({ page }) => {
    const editor = page.locator('#editor');
    await expect(editor).toBeVisible();
  });

  test('should capture snapshot', async ({ page }) => {
    const editor = page.locator('#editor');
    await editor.click();
    await editor.type('Test input');

    const captureBtn = page.locator('#capture-snapshot');
    await captureBtn.click();

    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Snapshot captured');
      await dialog.accept();
    });
  });

  test('should toggle visualization', async ({ page }) => {
    const toggleBtn = page.locator('#toggle-visualization');
    await expect(toggleBtn).toBeVisible();
    
    await toggleBtn.click();
    await expect(toggleBtn).toHaveText(/Disable|Enable/);
  });

  test('should clear snapshots', async ({ page }) => {
    const clearSnapshotsBtn = page.locator('#clear-snapshots');
    await expect(clearSnapshotsBtn).toBeVisible();
    
    await clearSnapshotsBtn.click();
    
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Snapshots cleared');
      await dialog.accept();
    });
  });
});
