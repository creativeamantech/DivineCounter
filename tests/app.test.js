const app = require('../src/app.js');

describe('app.newMantraObject', () => {
    test('should return an object with default values when no arguments provided', () => {
        const mantra = app.newMantraObject();

        expect(mantra.name).toBe('Mantra');
        expect(mantra.goal).toBe(108);
        expect(mantra.session).toBe(0);
        expect(mantra.total).toBe(0);
        expect(mantra.history).toEqual({});
        expect(mantra.id).toMatch(/^m-[0-9a-z]+$/);

        // Check structure keys
        const keys = Object.keys(mantra);
        expect(keys).toContain('id');
        expect(keys).toContain('name');
        expect(keys).toContain('goal');
        expect(keys).toContain('session');
        expect(keys).toContain('total');
        expect(keys).toContain('history');
        expect(keys).toContain('lastActive');
    });

    test('should return an object with provided name and goal', () => {
        const name = 'Test Mantra';
        const goal = 50;
        const mantra = app.newMantraObject(name, goal);

        expect(mantra.name).toBe(name);
        expect(mantra.goal).toBe(goal);
    });

    test('should handle string goal by parsing it', () => {
        const mantra = app.newMantraObject('Mantra', '216');
        expect(mantra.goal).toBe(216);
    });

    test('should default goal to 108 if parsed goal is NaN', () => {
        const mantra = app.newMantraObject('Mantra', 'invalid');
        expect(mantra.goal).toBe(108);
    });

    test('should default goal to 108 if parsed goal is 0', () => {
        // parseInt(0) is 0, which is falsy in JS: 0 || 108 -> 108
        const mantra = app.newMantraObject('Mantra', 0);
        expect(mantra.goal).toBe(108);
    });

    test('should set lastActive to today\'s date', () => {
        // Mock Date to ensure deterministic result
        const fixedDateStr = '2023-10-27T12:00:00.000Z';
        const expectedDateStr = '2023-10-27';

        const realDate = Date;
        global.Date = class extends Date {
            constructor(...args) {
                if (args.length) {
                    return new realDate(...args);
                }
                return new realDate(fixedDateStr);
            }
        };

        try {
            const mantra = app.newMantraObject();
            expect(mantra.lastActive).toBe(expectedDateStr);
        } finally {
            global.Date = realDate;
        }
    });

    test('should generate unique IDs', () => {
        const mantra1 = app.newMantraObject();
        const mantra2 = app.newMantraObject();
        expect(mantra1.id).not.toBe(mantra2.id);
        expect(mantra1.id.startsWith('m-')).toBe(true);
        expect(mantra2.id.startsWith('m-')).toBe(true);
    });
});
