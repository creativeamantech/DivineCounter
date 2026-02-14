import { test, expect } from '@playwright/test';

test.describe('Mala Completion Feedback', () => {
  test.beforeEach(async ({ page }) => {
    // Mock navigator.vibrate
    await page.addInitScript(() => {
        window.__vibrateCalls = [];
        // We attach to window so we can inspect it later
        window.navigator.vibrate = (pattern) => {
            window.__vibrateCalls.push(pattern);
            return true;
        };
        // Also setup a global for mala calls to track
        window.__malaCalls = 0;
    });

    await page.goto('/');

    // Mock sounds.mala
    await page.evaluate(() => {
        // Access 'sounds' directly as it is in scope, not necessarily on window
        if (typeof sounds !== 'undefined') {
            const originalMala = sounds.mala;
            sounds.mala = () => {
                window.__malaCalls++;
            };
        } else {
             console.error('sounds object not found');
        }
    });
  });

  test('triggers feedback at 108 count', async ({ page }) => {
    await page.evaluate(() => {
        const mantra = app.getActive();
        mantra.session = 107;
        const today = new Date().toISOString().split('T')[0];
        mantra.history[today] = 107;
        mantra.total = 107;
        app.save();
        app.render();
    });

    await page.click('#main-tap-area');

    const feedback = await page.evaluate(() => {
        return {
            malaCalls: window.__malaCalls,
            vibrateCalls: window.__vibrateCalls,
            session: app.getActive().session
        };
    });

    expect(feedback.session).toBe(108);
    expect(feedback.malaCalls).toBe(1);
    expect(feedback.vibrateCalls).toEqual([[60, 40, 60]]);
  });

  test('does not trigger feedback at non-108 count', async ({ page }) => {
     await page.evaluate(() => {
        const mantra = app.getActive();
        mantra.session = 108;
        app.save();
        app.render();
    });

    await page.click('#main-tap-area');

    const feedback = await page.evaluate(() => {
        return {
            malaCalls: window.__malaCalls,
            vibrateCalls: window.__vibrateCalls,
            session: app.getActive().session
        };
    });

    expect(feedback.session).toBe(109);
    expect(feedback.malaCalls).toBe(0);
    expect(feedback.vibrateCalls).toEqual([10]);
  });
});
