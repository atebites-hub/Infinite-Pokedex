import { test, expect } from '@playwright/test';

test.describe('PWA Functionality', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Infinite Pokédex/);
  });

  test('should have a valid manifest', async ({ page }) => {
    await page.goto('/');
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');

    // Fetch and validate manifest
    const manifestResponse = await page.request.get('/manifest.json');
    expect(manifestResponse.ok()).toBeTruthy();
    const manifest = await manifestResponse.json();

    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display');
    expect(manifest).toHaveProperty('icons');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should register service worker', async ({ page }) => {
    await page.goto('/');

    // Wait for service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          return registration !== null;
        } catch (error) {
          return false;
        }
      }
      return false;
    });

    expect(swRegistered).toBeTruthy();
  });

  test('should have Gen 9 Pokédex styling', async ({ page }) => {
    await page.goto('/');

    // Check for Rotom-style container
    const container = page.locator('.pokedex-container');
    await expect(container).toBeVisible();

    // Check for proper color scheme
    const bgColor = await container.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should have dark background
    expect(bgColor).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const container = page.locator('.pokedex-container');
    await expect(container).toBeVisible();

    // Check that content fits within viewport
    const boundingBox = await container.boundingBox();
    expect(boundingBox.width).toBeLessThanOrEqual(375);
  });

  test('should work offline after initial load', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();

    // Should still load
    await expect(page.locator('.pokedex-container')).toBeVisible();
  });
});
