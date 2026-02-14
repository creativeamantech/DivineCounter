const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const path = require('path');

let html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');

// Create a virtual DOM environment
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost/",
  beforeParse(window) {
      // Mock AudioContext
      window.AudioContext = class {
          createOscillator() {
              return {
                  type: 'sine',
                  frequency: { setValueAtTime: () => {} },
                  connect: () => {},
                  start: () => {},
                  stop: () => {}
              };
          }
          createGain() {
              return {
                  gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
                  connect: () => {}
              };
          }
          get destination() { return {}; }
          get currentTime() { return 0; }
          get state() { return 'suspended'; }
          resume() { return Promise.resolve(); }
      };
      window.webkitAudioContext = window.AudioContext;

      // Mock localStorage
      window.localStorage = {
        _store: {},
        getItem: function(key) {
          return this._store[key] || null;
        },
        setItem: function(key, value) {
          this._store[key] = value.toString();
        },
        clear: function() {
          this._store = {};
        },
        removeItem: function(key) {
          delete this._store[key];
        }
      };

      // Mock matchMedia (Tailwind or other libs might use it)
      window.matchMedia = window.matchMedia || function() {
        return {
          matches: false,
          addListener: function() {},
          removeListener: function() {}
        };
      };
  }
});

const { window } = dom;

// Wait for scripts to execute.
setTimeout(() => {
    // Try to access 'app' via eval if it's not on window
    try {
        if (!window.app) {
            // Check if 'app' is defined in the global scope
            window.app = window.eval('app');
        }
    } catch (e) {
        console.error("FAIL: Could not access 'app' variable via eval:", e.message);
        process.exit(1);
    }

    if (!window.app) {
        console.error("FAIL: 'app' object not found.");
        process.exit(1);
    }

    const app = window.app;

    // Initialize app with test data
    app.data = {
        mantras: [
            {
                id: 'test-mantra-1',
                name: 'Test Mantra',
                goal: 108,
                session: 50,
                total: 500, // Initial total
                history: {},
                lastActive: '2023-01-01'
            }
        ],
        activeId: 'test-mantra-1',
        theme: 'dark'
    };

    // Override showToast to avoid errors and verify it's called
    app.showToast = function(msg) {
        console.log(`[Toast] ${msg}`);
    };

    // Override render and save to avoid side effects or errors
    app.render = function() {};
    app.save = function() {};

    console.log('Starting Test for resetTotalOnly...');

    const mantraId = 'test-mantra-1';

    // Step 1: Verify initial state
    let mantra = app.data.mantras.find(m => m.id === mantraId);
    if (mantra.total !== 500) {
        console.error(`FAIL: Initial total is incorrect. Expected 500, got ${mantra.total}`);
        process.exit(1);
    }
    console.log('PASS: Initial state verified.');

    // Step 2: First call - should set pendingResetId (Confirmation step)
    console.log('Action: Calling resetTotalOnly(id) for the first time...');
    app.resetTotalOnly(mantraId);

    if (app.pendingResetId === mantraId) {
        console.log('PASS: pendingResetId is set correctly to ' + mantraId);
    } else {
        console.error(`FAIL: pendingResetId not set. Expected ${mantraId}, got ${app.pendingResetId}`);
        process.exit(1);
    }

    // Verify total is NOT reset yet
    mantra = app.data.mantras.find(m => m.id === mantraId);
    if (mantra.total === 500) {
        console.log('PASS: Total is still 500 (not reset yet).');
    } else {
        console.error(`FAIL: Total was reset prematurely. Expected 500, got ${mantra.total}`);
        process.exit(1);
    }

    // Step 3: Second call - should reset total
    console.log('Action: Calling resetTotalOnly(id) for the second time (Confirmation)...');
    app.resetTotalOnly(mantraId);

    // Verify total IS reset
    mantra = app.data.mantras.find(m => m.id === mantraId);
    if (mantra.total === 0) {
        console.log('PASS: Total is reset to 0.');
    } else {
        console.error(`FAIL: Total not reset. Expected 0, got ${mantra.total}`);
        process.exit(1);
    }

    // Verify pendingResetId is cleared
    if (app.pendingResetId === null) {
        console.log('PASS: pendingResetId is cleared.');
    } else {
        console.error(`FAIL: pendingResetId not cleared. Expected null, got ${app.pendingResetId}`);
        process.exit(1);
    }

    console.log('All tests passed successfully!');
}, 500);
