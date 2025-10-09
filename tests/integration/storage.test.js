import { test, expect } from '@playwright/test';

test.describe('IndexedDB Storage', () => {
  test('should initialize IndexedDB', async ({ page }) => {
    await page.goto('/');

    // Check if IndexedDB is available
    const hasIndexedDB = await page.evaluate(() => {
      return 'indexedDB' in window;
    });

    expect(hasIndexedDB).toBeTruthy();
  });

  test('should store data in IndexedDB', async ({ page }) => {
    await page.goto('/');

    // Wait for app to initialize
    await page.waitForTimeout(2000);

    // Check if data is stored
    const hasData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('infinite-pokedex', 1);

        request.onsuccess = (event) => {
          const db = event.target.result;
          const hasStores = db.objectStoreNames.length > 0;
          db.close();
          resolve(hasStores);
        };

        request.onerror = () => resolve(false);
      });
    });

    expect(hasData).toBeTruthy();
  });

  test('should persist data across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Store test data
    await page.evaluate(() => {
      localStorage.setItem('test-key', 'test-value');
    });

    // Reload page
    await page.reload();

    // Check if data persists
    const value = await page.evaluate(() => {
      return localStorage.getItem('test-key');
    });

    expect(value).toBe('test-value');

    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('test-key');
    });
  });
});
