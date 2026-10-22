export interface State {
    enter: () => void;
    execute: (delta: number) => void;
    exit: () => void;
}

export class StateMachine {
    private currentState: State | null = null;
    private states: Map<string, State> = new Map();
    private context: any;

    constructor(context: any) {
        this.context = context;
    }

    addState(name: string, config: { onEnter?: () => void, onUpdate?: (dt: number) => void, onExit?: () => void }) {
        this.states.set(name, {
            enter: config.onEnter?.bind(this.context) || (() => {}),
            execute: config.onUpdate?.bind(this.context) || (() => {}),
            exit: config.onExit?.bind(this.context) || (() => {})
        });
    }

    setState(name: string) {
        if (!this.states.has(name)) {
            console.warn(`State ${name} does not exist!`);
            return;
        }

        if (this.currentState) {
            this.currentState.exit();
        }

        this.currentState = this.states.get(name)!;
        this.currentState.enter();
    }

    update(dt: number) {
        if (this.currentState) {
            this.currentState.execute(dt);
        }
    }
    
    getCurrentState() {
        return this.currentState;
    }
}