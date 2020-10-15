// Type definitions for state machine 0.2.2
// Project: https://github.com/brophdawg11/state-machine#readme
// TypeScript Version: 3.7.4

export default StateMachine

declare class StateMachine {
    constructor(machine: MachineDefinition, initialState?: string);
    currentState(): string;
    getDotFile(): string;
    transition(transition: string, data?:any):Promise<null>
}

export type MachineDefinition = {
    states: StateCollection,
    onEnter?: OnStateEnter
}

type OnStateEnter = (payload: any, newState: string, oldState: string) => void;

type StateCollection = {
    [name: string]: StateDefinition
};

type StateDefinition = {
    transitions: Transition,
    onEnter?: OnStateEnter
};

type Transition = {
    [name: string]: string[]
}
