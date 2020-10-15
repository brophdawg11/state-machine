// TypeScript Version: 3.7.4

export default StateMachine

declare class StateMachine {
    constructor(machine: MachineDefinition, initialState?: string);
    currentState: string;
    getDotFile(): string;
    transition(transition: string, data?:any):Promise<any>
}

export type MachineDefinition = {
    states: StateCollection,
    onEnter?: OnMachineEnter
}

type OnMachineEnter = (payload: any, newState: string, oldState: string, transition: string) => null;
type OnStateEnter = (payload: any, newState: string, oldState: string, transition: string) => any | Promise<any>;

type StateCollection = {
    [name: string]: StateDefinition
};

export type StateDefinition = {
    transitions: Transition,
    onEnter?: OnStateEnter
};

type Transition = {
    [name: string]: string
}
