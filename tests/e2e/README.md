# E2E Tests

End-to-end tests for the ContentEditable Visualizer test apps using Playwright.

## Overview

These tests verify that:

- Test apps load correctly
- Plugins are properly registered
- Visualizer features work as expected
- User interactions (typing, clicking buttons) function correctly

## Running Tests

### Prerequisites

- All test apps must be buildable
- Playwright browsers must be installed

### Install Playwright Browsers

```bash
pnpm exec playwright install chromium
```

Or install all browsers:

```bash
pnpm exec playwright install
```

### Run Tests Locally

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI (interactive mode)
pnpm test:e2e:ui

# Run in debug mode
pnpm test:e2e:debug

# Run specific test file
pnpm test:e2e:prosemirror
pnpm test:e2e:lexical
pnpm test:e2e:contenteditable
```

### Test Apps

The tests expect the following apps to be running on specific ports:

- **prosemirror-test**: `http://localhost:5173`
- **lexical-test**: `http://localhost:5174`
- **contenteditable-test**: `http://localhost:5175`

The Playwright config automatically starts these servers before running tests (in local mode).

## GitHub Actions

E2E tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual trigger via `workflow_dispatch`

### Workflow Details

- **Matrix Strategy**: Each test app runs in parallel as a separate job
- **Timeout**: 60 minutes per job
- **Browsers**: Chromium only (for faster CI runs)
- **Artifacts**: Test reports and results are uploaded for 30 days

### Viewing Results

1. Go to the "Actions" tab in GitHub
2. Click on the workflow run
3. Click on a job to see detailed logs
4. Download artifacts to view HTML reports

## Test Structure

### prosemirror.spec.ts

Tests for the ProseMirror test app:
- Editor loading
- Plugin status indicator
- Snapshot capture
- Floating panel
- Plugin state display
- Data export
- Event clearing

### lexical.spec.ts

Tests for the Lexical test app:
- Editor loading
- Plugin status indicator
- Snapshot capture
- Plugin state display
- Data export

### contenteditable.spec.ts

Tests for the basic contenteditable test app:
- Editor loading
- Snapshot capture
- Visualization toggle
- Snapshot clearing

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { waitForVisualizerPanel, openVisualizerPanel } from './helpers';

test.describe('My Test App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:PORT');
    await waitForVisualizerPanel(page);
  });

  test('should do something', async ({ page }) => {
    // Your test code
  });
});
```

### Common Patterns

**Wait for element:**
```typescript
const element = page.locator('#my-element');
await expect(element).toBeVisible();
```

**Click button:**
```typescript
const button = page.locator('#my-button');
await button.click();
```

**Handle alerts:**
```typescript
let dialogMessage = '';
page.on('dialog', async dialog => {
  dialogMessage = dialog.message();
  await dialog.accept();
});
await someAction();
expect(dialogMessage).toContain('Expected message');
```

**Type text:**
```typescript
const editor = page.locator('#editor');
await editor.click();
await editor.type('My text');
```

## CI/CD

For CI environments, tests will:
- Automatically retry failed tests (2 retries)
- Run in parallel (1 worker on CI)
- Generate HTML reports
- Capture screenshots on failure
- Record traces for failed tests
- Upload artifacts for debugging

## Troubleshooting

### Tests fail to start

- Ensure all test apps can start: `pnpm test:prosemirror`, `pnpm test:lexical`, etc.
- Check that ports 5173-5175 are available
- Verify Playwright browsers are installed

### Tests timeout

- Increase timeout in `playwright.config.ts`
- Check that test apps are actually running
- Verify network connectivity

### Element not found

- Use Playwright's codegen to generate selectors: `pnpm exec playwright codegen`
- Check browser console for errors
- Verify the element exists in the DOM

### GitHub Actions failures

- Check workflow logs for server startup issues
- Verify all dependencies are installed
- Check that ports are correctly configured
- Review uploaded artifacts for screenshots and traces
