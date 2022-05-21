# state-machine

<!-- MarkdownTOC autolink="true" levels="1,2" -->

- [Description](#description)
- [Usage](#usage)
- [Why use a State Machine?](#why-use-a-state-machine)
- [Prior Art](#prior-art)
- [Other Libraries](#other-libraries)
- [Diagrams](#diagrams)
- [API Documentation](#api-documentation)
- [Packaged Module Format](#packaged-module-format)

<!-- /MarkdownTOC -->


## Description

`state-machine` is a Javascript Finite State Machine implementation with the following design goals:

* Minimal in size
* Enforces a static and explicit configuration.  This means two things:
  * All possible states/transitions must be defined upon machine creation
  * A given transition from a state goes to a single deterministic destination state

## Usage

Install and save the library:

```
npm install --save @urbn/state-machine
```

Use the library in your application:

```js
const stopLight = new StateMachine({
    states: {
        green: {
            transitions: { 
                change: 'yellow',
            },
        },
        yellow: {
            transitions: { 
                change: 'red',
            },
        },
        red: {
            transitions: { 
                change: 'green',
            },
        },
    },
    onEnter(data, newState, oldState) {
        console.log(`Transitioned from ${oldState} -> ${newState}`);
    },
}, 'red');
 
setInterval(() => stopLight.transition('change'), 3000);
```

## Why use a State Machine?

It can be advantageous in user-interface development to think of your interface as a Finite State Machine.  When implemented correctly, this can have a number of benefits over simply representing application "state" as a combination of local application data or fields in a shared Redux/Vuex store.

A few of these benefits are:

  * Ability to visualize the various states and transitions of the UI
  * Common language in which to communicate between developers, QA engineers, interface designers, business analysts, etc.
  * Enforced coverage and consideration of error states and edge cases

## Prior Art

State Machines are nothing new in Computer Science - they are known to be incredibly robust, and are often chosen to control [mission critical systems](https://ti.arc.nasa.gov/publications/10841/download/).  However, what is relatively new as of ~2018 is the concept of representing front end application state as a state machine.  There are plenty of great articles/videos on the subject, so we'll just link to them and won't bother to re-hash them all here.

* Our specific use-case is a Finite State Machine, also known as a [Mealy Machine](https://en.wikipedia.org/wiki/Mealy_machine) - initially conceived in 1955 😮
* [Video: Infinitely Better UIs with Finite Automata](https://www.youtube.com/watch?v=VU1NKX6Qkxc)
* [The Rise of State Machines](https://www.smashingmagazine.com/2018/01/rise-state-machines/)
* [Upgrade your React UI with state machines](https://hackernoon.com/upgrade-your-react-ui-with-state-machines-30d1298e90be)
* [Restate Your UI: Using State Machines to Simplify User Interface Development](http://blog.cognitect.com/blog/2017/5/22/restate-your-ui-using-state-machines-to-simplify-user-interface-development)

## Other Libraries

`state-machine` was born after a quick evaluation of a few other open-source libraries.  All of these other libraries have merit, they just weren't quite the right fit for our needs.

 * [xstate](https://github.com/davidkpiano/xstate) - Seemingly the most robust library which goes well beyond simple FSM, but quite large in size (9Kb gzipped)
 * [javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine) - Uses a transition-first machine definition, as compared to our preferred state-first definition
 * [Stately.js](https://github.com/fschaefer/Stately.js/) - Very similar in implementation to this library, but with 2 small issues:
   * The usage of action functions to determine destination state went against our design goal of explicit/deterministic state transitions
   * The current state is private and thus hard to wire up to Vue's reactivity
 
## Diagrams

`state-machine` is capable of automatically generating diagrams of a given State Machine that can be opened with the [GraphViz](https://www.graphviz.org/) tool.  The tool can be installed with `brew install graphviz --with-app`, and then used via the command line `dot` tool, or opened from `/usr/local/Cellar/graphviz/[version]/GraphViz.app`.

To generate your `state-machine` diagrams, simply call the `.getDotFile()` method on an instantiated `StateMachine` instance and print it out to the console, and save it in a `.dot` file.  Notre that this only works when `NODE_ENV !== 'production'`.

## API Documentation

### Constructor

The constructor requires both the machine configuration and the initial state for the machine, and will throw an error if either are invalid.

```js
const machine = new StateMachine(configuration, initialState, initialStateErrorHandler?);
```

The full structure of the configuration object is as follows:

```js
{
    // The `states` field is an object with keys for every possible state
    states: {
        STATE1: {
            // The `transitions` object lists all possible transitions out of 
            // STATE1 and their destination states
            transitions: {
                GO_TO_STATE2: 'STATE2',
            },
            // Callback function fired anytime STATE1 is entered
            onEnter(data, newState, oldState, transition) { ... }
        },
        // If a state is a terminal state, it doesn't need to provide any transitions
        STATE2: null,
        ...
    },
    // Callback function anytime the state changes
    onEnter(data, newState, oldState, transition) { ... }
}
```

#### Asyncronous `onEnter` functions

`onEnter` functions can return promises if they need to handle asynchronous actions, and these promises will be proxied back as the return value for the `.transition()` call that entered the state.  See the `.transition` documentation below for examples.


#### `initialStateErrorHandler`

Because of the async nature of state `onEnter` functions, `initialStateErrorHandler` can be passed to handle promise rejections from the `initialState`'s `onEnter` function that will be executed on the initial transition.

### currentState

Returns the current machine state name

```js
const machine = new StateMachine({ 
    states: { 
        purgatory: null,
    },
}, 'purgatory');

console.log(machine.currentState);
// -> 'purgatory'
```


### getDotFile()

In development mode only (`NODE_ENV !== 'production')`, returns a string of the machine diagram as a DOT file.  See the [Diagrams](#diagrams) section for more information.  

```js
const machine = new StateMachine({
    states: {
        off: {
            transitions: {
                start: 'on',
            },
        },
        on: {
            transitions: {
                stop: 'off',
            },
        },
    },
}, 'off');

console.log(machine.getDotFile());
// -> 'digraph "fsm" {
//       "off";
//       "on";
//       "off" -> "on" [label="start"];
//       "on" -> "off" [label="stop"];
//     }'
```


### transition(transitionName, payload)

Transitions the machine from a current state to a new state, returning a resolved promise when the transition is complete, or a rejected promise if the transition is invalid or of the destination state onEnter function rejects.

#### Synchronous Transitions

```js
const machine = new StateMachine({
    states: {
        off: {
            transitions: {
                start: 'on',
            },
        },
        on: {
            transitions: {
                stop: 'off',
            },
            onEnter() {
                console.log('Entered the on state');
            },
        },
    },
}, 'off');

console.log(machine.currentState);
// -> 'off'

machine.transition('start');
// -> 'Entered the on state'

console.log(machine.currentState);
// -> 'on'
```


#### Asynchronous Transitions

Asyncronous `onEnter` functions can be used along with promise-based transitions as follows:

```js
const machine = new StateMachine({
    states: {
        empty: {
            transitions: {
                fetchData: 'fetching',
            },
        },
        fetching: {
            transitions: {
                doneFetching: 'showData',
            },
            async onEnter(userId) {
                const data = await fetchSomeData(userId);
                machine.transition('doneFetching', data);
                return data;
            }
        },
        showData: null,
    },
}, 'empty');

console.log(machine.currentState);
// -> 'empty'

const user1 = await machine.transition('fetchData', 'user-1')
// user1 will contain the fetched data from the onEnter return value

console.log(machine.currentState);
// -> 'showData'
```


## Packaged Module Format

This library currently makes a few assumptions about the consuming client applications, however these may be removed in future versions.

* You are transpiling to ES5 code as necessary for your Node/Browser versions - this library uses ES6 features such as `const`, `let`, `Object.entries`, etc.
* You can support CommonJS modules - this library is not distributed in ESM or UMD module formats
* You are minifying your bundled code - this library is not distributed in a minified form
