const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Default Mantra Initialization', () => {
  test('should create default mantra on first load', async ({ page }) => {
    // Clear storage just in case, though context is fresh
    await page.addInitScript(() => {
      localStorage.clear();
    });

    // Load the file
    // Assuming index.html is in the root
    await page.goto(`file://${path.join(__dirname, '../index.html')}`);

    // Check if app is initialized
    // We need to wait for window.onload which triggers app.init()
    // Playwright waits for load event by default

    // Evaluate in the page context
    const appData = await page.evaluate(() => {
        // @ts-ignore
        return app.data;
    });

    // Verify mantras array
    expect(appData.mantras).toHaveLength(1);
    expect(appData.mantras[0].name).toBe('Om Namah Shivaya');
    expect(appData.mantras[0].goal).toBe(108);

    // Verify activeId is set
    expect(appData.activeId).toBe(appData.mantras[0].id);
  });
});
