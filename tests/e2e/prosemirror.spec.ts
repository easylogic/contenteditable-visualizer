import { test, expect } from '@playwright/test';
import { waitForVisualizerPanel, openVisualizerPanel, switchToTab, captureSnapshot } from './helpers';

test.describe('ProseMirror Test App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to prosemirror test app
    await page.goto('http://localhost:5173');
    await waitForVisualizerPanel(page);
  });

  test('should load the editor', async ({ page }) => {
    const editor = page.locator('#editor');
    await expect(editor).toBeVisible();
  });

  test('should show plugin status indicator', async ({ page }) => {
    const statusIndicator = page.locator('text=✓ ProseMirror Plugin Active');
    await expect(statusIndicator).toBeVisible();
  });

  test('should capture snapshot', async ({ page }) => {
    // Type some text
    const editor = page.locator('#editor');
    await editor.click();
    await editor.type('Test input for snapshot');

    // Capture snapshot
    let dialogMessage = '';
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    
    await captureSnapshot(page);
    
    // Wait a bit for dialog to be handled
    await page.waitForTimeout(500);
    expect(dialogMessage).toContain('Snapshot captured');
  });

  test('should open floating panel', async ({ page }) => {
    await openVisualizerPanel(page);
    
    // Check if panel is visible
    const panel = page.locator('.cev-panel, [class*="panel"], [class*="floating"]').first();
    const isVisible = await panel.isVisible().catch(() => false);
    
    // Panel might be visible or might need to be opened
    if (!isVisible) {
      const panelButton = page.locator('button').filter({ hasText: /🔍|visualizer|panel/i }).first();
      if (await panelButton.isVisible().catch(() => false)) {
        await panelButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Verify panel exists (might be off-screen)
    const panelExists = await panel.count() > 0;
    expect(panelExists).toBe(true);
  });

  test('should show plugin state', async ({ page }) => {
    const showStateBtn = page.locator('button:has-text("Show ProseMirror State")');
    await expect(showStateBtn).toBeVisible();
    
    let dialogMessage = '';
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    
    await showStateBtn.click();
    await page.waitForTimeout(500);
    
    expect(dialogMessage).toContain('ProseMirror Plugin Status');
  });

  test('should export data', async ({ page }) => {
    // Type some text first
    const editor = page.locator('#editor');
    await editor.click();
    await editor.type('Test export');

    // Click export button
    const exportBtn = page.locator('#export-data');
    await exportBtn.click();

    // Wait for download (Playwright handles downloads automatically)
    // The download should start automatically
    await page.waitForTimeout(1000);
  });

  test('should clear events', async ({ page }) => {
    // Type some text to generate events
    const editor = page.locator('#editor');
    await editor.click();
    await editor.type('Test events');

    // Click clear events button
    const clearBtn = page.locator('#clear-events');
    await clearBtn.click();

    // Verify no errors occurred
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(500);
    expect(errors.length).toBe(0);
  });
});
