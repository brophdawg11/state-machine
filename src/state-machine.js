/* eslint-disable no-underscore-dangle */

function isFunction(fn) {
    return typeof fn === 'function';
}

function isPlainObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}

/**
 * @private
 * @description
 * Safely get a deeply nested path from a potentially null object, returning the
 * provided default value if the path is not found
 *
 * @example
 * const obj = {
 *     foo: {
 *         bar: {
 *            baz: 5,
 *         },
 *     },
 * };
 * get(obj, 'foo.bar.baz', 0);  // === 5
 * get(obj, 'foo.bar.junk', 0);  // === 0
 *
 * @param   {Object} obj          Source object
 * @param   {String} pathString   Dot-separated path
 * @param   {*}      [defaultVal] Optional default value
 * @returns {*}      Value at nested path, or `defaultVal` if not present
 */
function get(obj, pathString, defaultVal) {
    if (obj == null || typeof pathString !== 'string') {
        return defaultVal;
    }

    let pointer = obj;
    const toks = pathString.split('.');
    for (let i = 0; i < toks.length; i++) {
        // Note: don't use hasOwnProperty because it doesn't work against
        // prototypical ES6 class properties, such as TokenSession.authToken
        if (pointer &&
            typeof pointer !== 'boolean' &&
            typeof pointer[toks[i]] !== 'undefined') {
            pointer = pointer[toks[i]];
        } else {
            return defaultVal;
        }
    }

    return pointer;
}

/**
 * @private
 * @description
 * Checks whether a given object has the provided key, using `hasOwnProperty`
 *
 * @param   {Object}  obj Source object
 * @param   {String}  key Property name
 * @returns {Boolean} `true` if the property exists, `false` otherwise
 */
function has(obj, key) {
    if (obj == null ||
        typeof obj !== 'object' ||
        key == null ||
        typeof key !== 'string') {
        return false;
    }
    return Object.hasOwnProperty.call(obj, key);
}

/**
 * @private
 * @description
 * Wrapper around get() that provides the ability to pass a validation
 * function to evaluate against the value
 *
 * @param   {Object}   obj        Object to retrieve against
 * @param   {String}   path       Path on object
 * @param   {Function} validator  Validation function against retrieved value
 * @param   {Object}   defaultVal Default value to return if value doesn't
 *                                exist or is invalid
 * @returns {Object}   Validated value, or defaultVal
 */
function getValidated(obj, path, validator, defaultVal) {
    const value = get(obj, path);
    if (!isFunction(validator) || validator(value)) {
        return value;
    }
    return defaultVal;
}

/**
 * @description
 * A tiny Finite State Machine implementation for use in complex UI scenarios.
 * The constructor will throw an `Error` if the machine definition is invalid.
 *
 * We decided to roll our own after looking at the following libraries and
 * deciding against using them:
 *  - [xstate](https://github.com/davidkpiano/xstate)
 *    - Too big (9Kb gzipped)
 *  - [javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine)
 *    - Dislike the transition-first definition approach
 *  - [Stately.js](https://github.com/fschaefer/Stately.js)
 *    - good implementation, but doesn't expose internals very well and hard
 *      to wire up to Vue's reactivity
 *
 * A machine definition is of the following format:
 *
 * ```js
 * {
 *     // 'states' is a map of state names and their state definitions
 *     states: {
 *         stateName: {
 *             // 'transitions' is a map of valid transitions from this state
 *             transitions: {
 *                 transitionName: 'destinationStateName',
 *             },
 *             onEnter(payload, newState, oldState) {
 *                 // Called whenever this state is entered.  Usually used to launch
 *                 // any side-effects and eventually transition to subsequent states.
 *                 // The payload is the data, if any, that was passed to
 *                 // StateMachine.transition()
 *             },
 *         },
 *         ...
 *     },
 *     onEnter(payload, newState, oldState) {
 *         // Global onEnter function called every time we enter a new
 *         // state.  This is useful for propagating that information back
 *         // to Vue's reactive properties.  The payload is the data, if any,
 *         // that was passed to StateMachine.transition()
 *     }
 * }
 * ```
 *
 * @example
 * const machine = new StateMachine({
 *     states: {
 *         green: {
 *             transitions: { change: 'yellow' },
 *         },
 *         yellow: {
 *             transitions: { change: 'red' },
 *         },
 *         red: {
 *             transitions: { change: 'green' },
 *         },
 *     },
 *     onEnter(data, newState, oldState) {
 *         console.log(`Transitioned from ${oldState} -> ${newState}`);
 *     },
 * }, 'red');
 *
 * setInterval(() => testMachine.transition('change'), 3000);
 */
module.exports = class StateMachine {
    /**
     * @description
     * None - the docs display the description from the class JSDoc block :)
     *
     * @param   {Object} machine      Machine definition
     * @param   {String} initialState Initial state for the state machine
     * @returns {StateMachine}        Initialized StateMachine instance
     * @throws  {Error}               If no states exist, or transitions to
     *                                invalid states are found
     */
    constructor(machine, initialState) {
        this._machine = machine;
        this._currentState = null;
        StateMachine._validateMachine(machine, initialState);
        this._setState(initialState);
    }

    /**
     * @private
     * @description
     * Internal method to validate the state machine definition object.  Namely,
     * that at least one state exists, and all transitions from all states lead
     * to other valid states
     *
     * @param   {Object}    machine      Machine definition
     * @param   {String}    initialState Initial state
     * @returns {undefined} No return value
     * @throws  {Error}     If no states exist, invalid initial state is specified,
     *                      or transitions to invalid states are found
     */
    static _validateMachine(machine, initialState) {
        const states = getValidated(machine, 'states', isPlainObject);
        if (!states) {
            throw new Error('Invalid states');
        }
        if (!has(states, initialState)) {
            throw new Error(`Invalid initial state: ${initialState}`);
        }
        Object.entries(states).forEach(([, state]) => {
            if (state && isPlainObject(state.transitions)) {
                Object.entries(state.transitions).forEach(([transition, destState]) => {
                    if (!has(machine.states, destState)) {
                        throw new Error(`Invalid destination state for transition: ${transition}`);
                    }
                });
            }
        });
    }

    /**
     * @description
     * Returns the current state for the state machine
     *
     * @returns {String} Current state
     */
    get currentState() {
        return this._currentState;
    }

    /**
     * @private
     * @description
     * Internal debugging logger function
     *
     * @param   {...*}      args Any number of arguments o pass along to `console.debug`
     * @returns {undefined} No return value
     */
    static _debug(...args) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug.apply(null, ['[state-machine]', ...args]);
        }
    }

    /**
     * @private
     * @description
     * Internal error logger function
     *
     * @param   {...*}      args Any number of arguments o pass along to `console.error`
     * @returns {undefined} No return value
     */
    static _error(...args) {
        console.error.apply(null, ['[state-machine]', ...args]);
    }

    /**
     * @private
     * @description
     * Set the current state of the state machine, and call all associated
     * `onEnter` functions
     *
     * @param   {String}    state       New state
     * @param   {String}    transition  Transition that caused the state change
     * @param   {*}         data        Data payload from `StateMachine.transition()`
     * @returns {Promise}               Promise, resolved or rejected based on the state's
     *                                  onEnter function
     */
    _setState(state, transition, data) {
        // Ignore this from coverage.  It shouldn't be possible since we validate
        // transition states up front - but if a naughty developer uses _setState
        // directly or something, we should be defensive
        // istanbul ignore if
        if (!has(this._machine.states, state)) {
            const msg = `Cannot transition to invalid state ${state}`;
            StateMachine._error(msg);
            return Promise.reject(new Error(msg));
        }
        StateMachine._debug(`Setting new state: ${state}`);
        const oldState = this.currentState;
        this._currentState = state;
        if (isFunction(this._machine.onEnter)) {
            this._machine.onEnter(data, state, oldState, transition);
        }

        return new Promise((resolve, reject) => {
            if (this._machine.states[state] && isFunction(this._machine.states[state].onEnter)) {
                const retVal = this._machine.states[state]
                    .onEnter(data, state, oldState, transition);
                // Respect promises returned by onEnter functions
                if (retVal && isFunction(retVal.then)) {
                    return retVal.then(resolve, reject);
                }
                return resolve(retVal);
            }
            return resolve();
        });
    }

    /**
     * @description
     * Get a string `.dot` file representing the StateMachine that can be opened
     * using GraphViz.  Only available in development builds.
     *
     * @returns {String} The generated `.dot` file
     */
    getDotFile() {
        // istanbul ignore else
        if (process.env.NODE_ENV !== 'production') {
            const stateNames = Object.keys(this._machine.states);
            const states = stateNames.reduce((acc, k) => `${acc}    "${k}";\n`, '').trim();
            const transitions = stateNames.reduce((acc, from) => {
                const stateTransitions =
                    this._machine.states[from].transitions || /* istanbul ignore next */ {};
                const str = Object.entries(stateTransitions).reduce(
                    (acc2, [t, to]) => `${acc2}    "${from}" -> "${to}" [label="${t}"];\n`,
                    '',
                ).trim();
                return str ? `${acc}    ${str}\n` : /* istanbul ignore next */ acc;
            }, '').trim();
            return `
digraph "fsm" {
    ${states}
    ${transitions}
}`.trim();
        }

        // istanbul ignore next
        return '';
    }

    /**
     * @description
     * Transition the StateMachine to a new state.  Will no-op if the indicated
     * transition is not valid for the current state.  The returned promise will
     * be resolved/rejected in the following cases:
     *
     *   * If the transition is invalid, the returned promise will be rejected immediately
     *   * If the destination state does not define and `onEnter` function, the
     *     returned promise will be resolved immediately
     *   * If the destination state's `onEnter` function does not return a promise,
     *     the returned promise will be resolved immediately
     *   * Otherwise, the promise returned from onEnter will be returned
     *
     * @param   {String}    transition Transition name
     * @param   {*}         [data]      Optional payload to pas to `onEnter` functions
     * @returns {Promise}   Promise resolved upon successful transition, rejected on
     *                      invalid transitions
     */
    transition(transition, data) {
        const state = this._machine.states[this.currentState];
        if (!has(state.transitions, transition)) {
            const msg =
                `Invalid transition (${transition}) from current state` +
                `(${this.currentState})`;
            StateMachine._error(msg);
            return Promise.reject(new Error(msg));
        }
        StateMachine._debug(`Executing transition: ${transition}`);
        return this._setState(state.transitions[transition], transition, data);
    }
};
