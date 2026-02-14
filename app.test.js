/**
 * @jest-environment jsdom
 */

// Mock AudioContext globally before importing script
global.AudioContext = jest.fn().mockImplementation(() => ({
    state: 'suspended',
    resume: jest.fn(),
    createOscillator: jest.fn(() => ({
        frequency: { setValueAtTime: jest.fn() },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        type: 'sine'
    })),
    createGain: jest.fn(() => ({
        gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
        connect: jest.fn()
    })),
    currentTime: 0,
    destination: {}
}));
window.AudioContext = global.AudioContext;

const { app } = require('./script');

describe('app.resetRounds', () => {
    let mockMantra;

    beforeEach(() => {
        // Reset app data
        mockMantra = {
            id: 'test-id',
            name: 'Test Mantra',
            goal: 108,
            session: 50,
            total: 100,
            history: {},
            lastActive: new Date().toISOString().split('T')[0]
        };
        app.data = {
            mantras: [mockMantra],
            activeId: 'test-id',
            theme: 'dark'
        };
        app.pendingResetRoundsId = null;

        // Mock DOM elements
        document.getElementById = jest.fn((id) => {
            return {
                innerText: '',
                classList: {
                    add: jest.fn(),
                    remove: jest.fn(),
                    toggle: jest.fn(),
                    contains: jest.fn()
                },
                style: {},
                appendChild: jest.fn(),
                innerHTML: ''
            };
        });

        // Mock localStorage
        Storage.prototype.setItem = jest.fn();

        // Spy on app methods to avoid full rendering
        jest.spyOn(app, 'render').mockImplementation(() => {});
        jest.spyOn(app, 'showToast').mockImplementation(() => {});
        jest.spyOn(app, 'save');

        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    test('first click sets pendingResetRoundsId and does not reset session', () => {
        const event = { stopPropagation: jest.fn() };

        app.resetRounds('test-id', event);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(app.pendingResetRoundsId).toBe('test-id');
        expect(mockMantra.session).toBe(50); // Should not change yet
        expect(app.render).toHaveBeenCalled();
    });

    test('second click within timeout resets session', () => {
        const event = { stopPropagation: jest.fn() };

        // First click
        app.resetRounds('test-id', event);

        // Second click
        app.resetRounds('test-id', event);

        expect(mockMantra.session).toBe(0);
        expect(app.pendingResetRoundsId).toBeNull();
        expect(app.showToast).toHaveBeenCalledWith('Daily Round Reset');
        expect(app.save).toHaveBeenCalled();
        expect(app.render).toHaveBeenCalledTimes(2); // Once for first click, once for second
    });

    test('timeout clears pendingResetRoundsId', () => {
        const event = { stopPropagation: jest.fn() };

        app.resetRounds('test-id', event);
        expect(app.pendingResetRoundsId).toBe('test-id');

        // Fast-forward time
        jest.advanceTimersByTime(3000);

        expect(app.pendingResetRoundsId).toBeNull();
        expect(app.render).toHaveBeenCalledTimes(2); // Once for click, once after timeout
    });

    test('click on different id should switch pending id', () => {
         const event = { stopPropagation: jest.fn() };

         app.resetRounds('test-id', event);
         expect(app.pendingResetRoundsId).toBe('test-id');

         app.resetRounds('other-id', event);
         expect(app.pendingResetRoundsId).toBe('other-id');
         expect(mockMantra.session).toBe(50); // Still not reset
    });
});
