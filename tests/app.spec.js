// @ts-check
const { test, expect } = require('@playwright/test');

test('resetRounds functionality', async ({ page }) => {
  // 1. Load the application
  await page.goto('/');

  // 2. Setup: Inject a test mantra with session > 0
  const mantraId = 'test-mantra-id';
  const mantra = {
    id: mantraId,
    name: 'Test Mantra',
    goal: 108,
    session: 50,
    total: 100,
    history: {},
    lastActive: new Date().toISOString().split('T')[0]
  };

  await page.evaluate((m) => {
    // Access the global app object
    // @ts-ignore
    window.app.data.mantras.push(m);
    // @ts-ignore
    window.app.data.activeId = m.id;
    // @ts-ignore
    window.app.render();
  }, mantra);

  // 3. Verify initial state
  let session = await page.evaluate((id) => {
    // @ts-ignore
    return window.app.data.mantras.find(m => m.id === id).session;
  }, mantraId);
  expect(session).toBe(50);

  // 4. First Click: Trigger resetRounds
  await page.evaluate((id) => {
    // @ts-ignore
    window.app.resetRounds(id);
  }, mantraId);

  // 5. Verify pending state (first click)
  let pendingId = await page.evaluate(() => {
    // @ts-ignore
    return window.app.pendingResetRoundsId;
  });
  expect(pendingId).toBe(mantraId);

  // Verify session is STILL 50
  session = await page.evaluate((id) => {
    // @ts-ignore
    return window.app.data.mantras.find(m => m.id === id).session;
  }, mantraId);
  expect(session).toBe(50);

  // 6. Second Click: Confirm resetRounds
  await page.evaluate((id) => {
    // @ts-ignore
    window.app.resetRounds(id);
  }, mantraId);

  // 7. Verify final state
  const result = await page.evaluate((id) => {
    // @ts-ignore
    const m = window.app.data.mantras.find(x => x.id === id);
    // @ts-ignore
    const pending = window.app.pendingResetRoundsId;
    return { session: m.session, total: m.total, pending };
  }, mantraId);

  expect(result.session).toBe(0);
  expect(result.total).toBe(100); // Total should remain unchanged
  expect(result.pending).toBeNull();
});
