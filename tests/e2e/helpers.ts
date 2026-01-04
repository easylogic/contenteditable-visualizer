/**
 * Helper functions for E2E tests
 */

import { Page } from '@playwright/test';

/**
 * Wait for visualizer panel to be ready
 */
export async function waitForVisualizerPanel(page: Page): Promise<void> {
  // Wait for floating panel button or panel itself
  await page.waitForSelector('.cev-panel, [class*="cev-"], button:has-text("🔍")', { timeout: 5000 }).catch(() => {
    // Panel might not be visible yet, that's okay
  });
}

/**
 * Open visualizer panel if closed
 */
export async function openVisualizerPanel(page: Page): Promise<void> {
  const panelButton = page.locator('button').filter({ hasText: /🔍|visualizer|panel/i }).first();
  const panel = page.locator('.cev-panel, [class*="panel"]').first();
  
  const isPanelVisible = await panel.isVisible().catch(() => false);
  if (!isPanelVisible && await panelButton.isVisible().catch(() => false)) {
    await panelButton.click();
    await page.waitForTimeout(500); // Wait for panel animation
  }
}

/**
 * Switch to a specific tab in the visualizer panel
 */
export async function switchToTab(page: Page, tabName: 'events' | 'snapshots' | 'structure'): Promise<void> {
  await openVisualizerPanel(page);
  
  const tab = page.locator(`button:has-text("${tabName}"), .cev-tab:has-text("${tabName}")`).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Capture a snapshot and wait for confirmation
 * Note: Dialog handling should be done by the caller using page.on('dialog', ...)
 */
export async function captureSnapshot(page: Page): Promise<void> {
  const captureBtn = page.locator('#capture-snapshot');
  await captureBtn.click();
  
  // Wait a bit for the dialog to appear
  await page.waitForTimeout(500);
}
