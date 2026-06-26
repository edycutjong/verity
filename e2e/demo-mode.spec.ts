import { test, expect } from '@playwright/test';

test.describe('Demo Mode', () => {
  test('app loads without API keys', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    
    // Check title
    await expect(page).toHaveTitle(/Verity/);
    
    // Check no error overlays are visible
    const nextjsErrorOverlay = page.locator('nextjs-portal');
    await expect(nextjsErrorOverlay).not.toBeVisible();
    
    // Check for main content
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});
