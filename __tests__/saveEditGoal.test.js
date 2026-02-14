const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.resolve(__dirname, '../index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Strip external resources to prevent network requests and errors
htmlContent = htmlContent.replace(/<link[^>]+>/g, '');
htmlContent = htmlContent.replace(/<script\s+src=["'][^"']+["']\s*><\/script>/g, '');

// Mock AudioContext
const mockAudioContextScript = `
<script>
    window.AudioContext = class {
        constructor() {
            this.state = 'running';
            this.currentTime = 0;
        }
        createOscillator() {
            return {
                connect: () => {},
                start: () => {},
                stop: () => {},
                frequency: { setValueAtTime: () => {} },
                type: 'sine'
            };
        }
        createGain() {
            return {
                connect: () => {},
                gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }
            };
        }
        resume() {}
    };
    window.webkitAudioContext = window.AudioContext;
</script>
`;

// Inject mock script at the beginning of the body
htmlContent = htmlContent.replace(/<body[^>]*>/, match => match + mockAudioContextScript);

// Expose app object globally
htmlContent = htmlContent.replace(/const\s+app\s+=/, 'window.app =');

describe('app.saveEditGoal functionality', () => {
    let dom;
    let app;

    beforeEach(() => {
        dom = new JSDOM(htmlContent, {
            runScripts: "dangerously",
            resources: "usable",
            url: "http://localhost/"
        });

        app = dom.window.app;

        // Verify app is loaded
        if (!app) {
            console.error("App object not found on window! Check replacement logic.");
        }

        // Initialize if needed
        // The inline script sets window.onload = () => app.init();
        // We can manually trigger it or just call app.init().
        // Since we are mocking AudioContext *before* the script runs, the script should execute successfully.
        if (app && typeof app.init === 'function') {
            app.init();
        }

        // Mock showToast
        if (app) {
            app.showToast = jest.fn();
        }
    });

    test('updates the goal and UI when a valid number is entered', () => {
        expect(app).toBeDefined();

        // Setup
        const mantraName = "Test Mantra";
        const initialGoal = 108;
        // Reset state
        app.data.mantras = [app.newMantraObject(mantraName, initialGoal)];
        app.data.activeId = app.data.mantras[0].id;
        app.render();

        const mantraId = app.data.mantras[0].id;

        // Action: Start editing
        app.startEditGoal(mantraId);

        const input = dom.window.document.getElementById(`edit-goal-${mantraId}`);
        expect(input).not.toBeNull();
        expect(parseInt(input.value)).toBe(initialGoal);

        // Action: Change value
        const newGoal = 200;
        input.value = newGoal.toString();

        // Action: Save
        app.saveEditGoal(mantraId);

        // Assert
        expect(app.data.mantras[0].goal).toBe(newGoal);
        expect(app.pendingEditGoalId).toBeNull();
        expect(app.showToast).toHaveBeenCalledWith(`Goal Updated: ${newGoal}`);

        // Verify input is gone
        const inputAfter = dom.window.document.getElementById(`edit-goal-${mantraId}`);
        expect(inputAfter).toBeNull();
    });

    test('does not update goal when value is invalid (<= 0)', () => {
        expect(app).toBeDefined();

        const initialGoal = 108;
        app.data.mantras = [app.newMantraObject("Test", initialGoal)];
        app.data.activeId = app.data.mantras[0].id;
        app.render();

        const mantraId = app.data.mantras[0].id;

        app.startEditGoal(mantraId);
        const input = dom.window.document.getElementById(`edit-goal-${mantraId}`);

        input.value = "0";
        app.saveEditGoal(mantraId);

        expect(app.data.mantras[0].goal).toBe(initialGoal);
        expect(app.pendingEditGoalId).toBe(mantraId); // Still editing
        expect(app.showToast).not.toHaveBeenCalled();
    });

    test('does not update goal when value is NaN', () => {
        expect(app).toBeDefined();

        const initialGoal = 108;
        app.data.mantras = [app.newMantraObject("Test", initialGoal)];
        app.data.activeId = app.data.mantras[0].id;
        app.render();

        const mantraId = app.data.mantras[0].id;

        app.startEditGoal(mantraId);
        const input = dom.window.document.getElementById(`edit-goal-${mantraId}`);

        input.value = "abc";
        app.saveEditGoal(mantraId);

        expect(app.data.mantras[0].goal).toBe(initialGoal);
        expect(app.pendingEditGoalId).toBe(mantraId);
    });
});
