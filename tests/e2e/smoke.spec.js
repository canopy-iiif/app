// Basic end-to-end smoke test for the dev server
const { test, expect } = require('@playwright/test');

test('homepage renders RelatedItems and hydrates sliders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  // Headline from MDX
  await expect(page.locator('h2:has-text("Highlighted Items")')).toBeVisible();
  // SSR placeholder exists
  await expect(page.locator('[data-canopy-related-items]')).toHaveCount(1);
  // Scripts for related-items and slider are present on the page
  await expect(page.locator('script[src*="canopy-slider.js"]')).toHaveCount(1);
  await expect(page.locator('script[src*="canopy-related-items.js"]')).toHaveCount(1);
});
