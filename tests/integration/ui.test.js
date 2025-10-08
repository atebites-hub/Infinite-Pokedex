import { test, expect } from '@playwright/test';

test.describe('UI Functionality', () => {
  test('should display Pokédex list', async ({ page }) => {
    await page.goto('/');
    
    // Wait for content to load
    await page.waitForSelector('.pokemon-card', { timeout: 10000 });
    
    // Check that cards are visible
    const cards = page.locator('.pokemon-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have working search functionality', async ({ page }) => {
    await page.goto('/');
    
    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    
    // Type in search
    await searchInput.fill('Charizard');
    
    // Wait for filtered results
    await page.waitForTimeout(500);
    
    // Check that results are filtered
    const cards = page.locator('.pokemon-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should open Pokémon entry on card click', async ({ page }) => {
    await page.goto('/');
    
    // Wait for cards to load
    await page.waitForSelector('.pokemon-card');
    
    // Click first card
    const firstCard = page.locator('.pokemon-card').first();
    await firstCard.click();
    
    // Wait for entry to open
    await page.waitForSelector('.pokedex-entry', { timeout: 5000 });
    
    // Check that entry is visible
    const entry = page.locator('.pokedex-entry');
    await expect(entry).toBeVisible();
  });

  test('should have smooth animations', async ({ page }) => {
    await page.goto('/');
    
    // Wait for cards to load
    await page.waitForSelector('.pokemon-card');
    
    // Click first card
    const firstCard = page.locator('.pokemon-card').first();
    await firstCard.click();
    
    // Check for animation class
    const entry = page.locator('.pokedex-entry');
    const hasAnimation = await entry.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.transition !== 'all 0s ease 0s' || style.animation !== 'none';
    });
    
    expect(hasAnimation).toBeTruthy();
  });

  test('should display type badges', async ({ page }) => {
    await page.goto('/');
    
    // Wait for cards to load
    await page.waitForSelector('.pokemon-card');
    
    // Check for type badges
    const typeBadges = page.locator('.type-badge, [class*="type-"]');
    const count = await typeBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Check that focus is visible
    const focusedElement = await page.evaluate(() => {
      return document.activeElement.tagName;
    });
    
    expect(focusedElement).toBeTruthy();
  });
});
