/**
 * Oracle Predictive Engine
 * Uses a Markov-inspired model to predict the user's next action based on transition history.
 */
export class Oracle {
    constructor() {
        // transitions[currentState][action] = { nextState: count }
        this.transitions = {};
        this.history = [];
    }

    /**
     * Records a user action and the resulting state transition.
     * @param {string} fromState - The ID of the state before the action.
     * @param {string} action - The action taken (e.g., 'move:north', 'take:scroll').
     * @param {string} toState - The ID of the resulting state.
     */
    recordTransition(fromState, action, toState) {
        if (!this.transitions[fromState]) {
            this.transitions[fromState] = {};
        }
        if (!this.transitions[fromState][action]) {
            this.transitions[fromState][action] = {
                target: toState,
                count: 0
            };
        }

        this.transitions[fromState][action].count++;
        this.history.push({ fromState, action, toState, timestamp: Date.now() });

        console.log(`[Oracle] Recorded: ${fromState} --(${action})--> ${toState}`);
    }

    /**
     * Predicts the most likely next action and state.
     * @param {string} currentState - The current state ID.
     * @returns {Object|null} Prediction object or null if no data.
     */
    predictNext(currentState) {
        const possibilities = this.transitions[currentState];
        if (!possibilities) return null;

        let bestAction = null;
        let highestCount = 0;

        for (const action in possibilities) {
            if (possibilities[action].count > highestCount) {
                highestCount = possibilities[action].count;
                bestAction = action;
            }
        }

        if (!bestAction) return null;

        return {
            action: bestAction,
            predictedState: possibilities[bestAction].target,
            confidence: highestCount / Object.values(possibilities).reduce((a, b) => a + b.count, 0)
        };
    }

    /**
     * Simulates pre-fetching data for the predicted next state.
     * In a real app, this would trigger API calls or image loads.
     */
    prefetch(prediction) {
        if (!prediction) return;

        console.log(`[Oracle] Prefetching assets for: ${prediction.predictedState} (Confidence: ${(prediction.confidence * 100).toFixed(1)}%)`);

        // Dispatches a custom event that the UI can listen to for "loading" effects
        const event = new CustomEvent('oracle:prefetch', { detail: prediction });
        window.dispatchEvent(event);
    }
}
