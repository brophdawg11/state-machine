const StateMachine = require('../src/state-machine');

describe('StateMachine', () => {
    let globalMock;
    let offMock;
    let onMock;
    let machineConfig;

    beforeEach(() => {
        globalMock = jest.fn();
        offMock = jest.fn();
        onMock = jest.fn();
        machineConfig = {
            states: {
                off: {
                    transitions: {
                        turnOn: 'on',
                    },
                    onEnter: offMock,
                },
                on: {
                    transitions: {
                        turnOff: 'off',
                    },
                    onEnter: onMock,
                },
            },
            onEnter: globalMock,
        };
    });

    it('should start in the proper state', () => {
        const machine = new StateMachine(machineConfig, 'off');
        expect(machine.currentState).toBe('off');

        const machine2 = new StateMachine(machineConfig, 'on');
        expect(machine2.currentState).toBe('on');
    });

    it('should handle transitions', async () => {
        const machine = new StateMachine(machineConfig, 'off');

        expect(machine.currentState).toBe('off');

        await machine.transition('turnOn');
        expect(machine.currentState).toBe('on');

        // Should no-op
        try {
            await machine.transition('turnOn');
            expect(true).toBe(false);
        } catch (e) {
            expect(machine.currentState).toBe('on');
        }

        await machine.transition('turnOff');
        expect(machine.currentState).toBe('off');

        // Should no-op
        try {
            await machine.transition('turnOff');
            expect(true).toBe(false);
        } catch (e) {
            expect(machine.currentState).toBe('off');
        }
    });

    it('should handle synchronous transitions', async () => {
        const machine = new StateMachine(machineConfig, 'off');
        expect(machine.currentState).toBe('off');
        machine.transition('turnOn');
        expect(machine.currentState).toBe('on');
    });

    it('should handle Promise-based callbacks', async () => {
        const machine = new StateMachine(machineConfig, 'off');

        expect(machine.currentState).toBe('off');
        expect(globalMock.mock.calls.length).toBe(1);
        expect(offMock.mock.calls.length).toBe(1);
        expect(onMock.mock.calls.length).toBe(0);

        await machine.transition('turnOn');
        expect(machine.currentState).toBe('on');
        expect(globalMock.mock.calls.length).toBe(2);
        expect(offMock.mock.calls.length).toBe(1);
        expect(onMock.mock.calls.length).toBe(1);

        // Should no-op and reject
        try {
            await expect(machine.transition('turnOn')).rejects.toBeInstanceOf(Error);
            expect(true).toBe(false);
        } catch (e) {
            expect(machine.currentState).toBe('on');
            expect(globalMock.mock.calls.length).toBe(2);
            expect(offMock.mock.calls.length).toBe(1);
            expect(onMock.mock.calls.length).toBe(1);
        }

        await machine.transition('turnOff');
        expect(machine.currentState).toBe('off');
        expect(globalMock.mock.calls.length).toBe(3);
        expect(offMock.mock.calls.length).toBe(2);
        expect(onMock.mock.calls.length).toBe(1);

        // Should no-op and reject
        try {
            await expect(machine.transition('turnOff')).rejects.toBeInstanceOf(Error);
            expect(true).toBe(false);
        } catch (e) {
            expect(machine.currentState).toBe('off');
            expect(globalMock.mock.calls.length).toBe(3);
            expect(offMock.mock.calls.length).toBe(2);
            expect(onMock.mock.calls.length).toBe(1);
        }
    });

    it('should pass transition name and payloads to onEnter functions', () => {
        const machine = new StateMachine(machineConfig, 'off');
        const payload = { foo: 'bar' };

        machine.transition('turnOn', payload);
        expect(globalMock).toHaveBeenCalledWith(payload, 'on', 'off', 'turnOn');
        expect(onMock).toHaveBeenCalledWith(payload, 'on', 'off', 'turnOn');

        machine.transition('turnOff', payload);
        expect(globalMock).toHaveBeenCalledWith(payload, 'off', 'on', 'turnOff');
        expect(offMock).toHaveBeenCalledWith(payload, 'off', 'on', 'turnOff');
    });

    it('should allow onEnter functions to return promises', async () => {
        /* eslint-disable no-param-reassign */

        machineConfig = {
            states: {
                initial: {
                    transitions: {
                        start: 'off',
                    },
                },
                off: {
                    transitions: {
                        turnOn: 'on',
                    },
                    onEnter: (data) => {
                        if (data) { data.count++; }
                        // Ensure rejected onEnter functions are passed back as well
                        return Promise.reject(data);
                    },
                },
                on: {
                    transitions: {
                        turnOff: 'off',
                    },
                    onEnter: (data) => {
                        if (data) { data.count++; }
                        return Promise.resolve(data);
                    },
                },
            },
        };

        const machine = new StateMachine(machineConfig, 'initial');
        const payload = { count: 0 };

        try {
            await machine.transition('start', payload);
            expect(true).toBe(false);
        } catch (offValue) {
            expect(offValue.count).toBe(1);
        }

        const onValue = await machine.transition('turnOn', payload);
        expect(onValue.count).toBe(2);

        try {
            await machine.transition('turnOff', payload);
            expect(true).toBe(false);
        } catch (offValue) {
            expect(offValue.count).toBe(3);
        }
        /* eslint-enable no-param-reassign */
    });

    it('should proxy proper async return values from onEnter', async () => {
        const machine = new StateMachine({
            states: {
                off: {
                    transitions: {
                        start: 'starting',
                    },
                },
                starting: {
                    transitions: {
                        started: 'on',
                    },
                    onEnter() {
                        return new Promise((resolve) => setTimeout(() => {
                            machine.transition('started');
                            resolve('done starting');
                        }, 1000));
                    },
                },
                on: {
                    transitions: {
                        stop: 'off',
                    },
                },
            },
        }, 'off');

        expect(machine.currentState).toBe('off');
        const promise = machine.transition('start');
        expect(machine.currentState).toBe('starting');
        const value = await promise;
        expect(value).toBe('done starting');
        expect(machine.currentState).toBe('on');
    });

    it('should generate a proper graphViz .dot file', () => {
        const machine = new StateMachine(machineConfig, 'off');
        expect(machine.getDotFile()).toBe(`
digraph "fsm" {
    "off";
    "on";
    "off" -> "on" [label="turnOn"];
    "on" -> "off" [label="turnOff"];
}
`.trim());
    });

    it('should throw an error if an initial state is not specified', () => {
        expect(() => new StateMachine(machineConfig)).toThrow();
    });

    it('should throw an error if invalid states are specified', () => {
        expect(() => new StateMachine(null)).toThrow();
        expect(() => new StateMachine({})).toThrow();
    });

    it('should throw an error if invalid transitions are specified', () => {
        const testFn = () => new StateMachine({
            states: {
                foo: {
                    transitions: {
                        toBar: 'bar',
                    },
                },
            },
        }, 'foo');
        expect(testFn).toThrow();
    });

    it('should know if a transition is valid', () => {
        const machine = new StateMachine(machineConfig, 'off');
        expect(machine.isValidTransition('turnOn')).toBe(true);
        expect(machine.isValidTransition('turnOff')).toBe(false);
    });

    it('should no-op on invalid state transition', () => {
        const machine = new StateMachine(machineConfig, 'off');
        expect(machine.currentState).toBe('off');

        const machine2 = new StateMachine(machineConfig, 'on');
        expect(machine2.currentState).toBe('on');
    });

    it('should handle transition-less states', () => {
        const machine = new StateMachine({
            states: {
                off: {
                    transitions: {
                        turnOn: 'alwaysOn',
                    },
                },
                alwaysOn: null,
            },
        }, 'off');
        expect(machine.currentState).toBe('off');

        machine.transition('turnOn');
        expect(machine.currentState).toBe('alwaysOn');
    });

});
