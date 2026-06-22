/**
 * Oracle Predictive Engine
 * Uses a multi-layered Markov model to predict user actions.
 * Considers both immediate state (room) and broader context (inventory/history).
 */
export class Oracle {
    constructor() {
        // transitions[stateKey][action] = { target, count, durations }
        this.transitions = {};
        this.history = [];
        this.load();
    }

    /**
     * Formats a context key from room and inventory.
     */
    static formatContext(roomId, inventory) {
        const sortedInv = [...inventory].sort().join(',');
        return `room:${roomId}|inv:${sortedInv || 'empty'}`;
    }

    /**
     * Recursively predicts a sequence of likely future states, simulating context changes.
     * @param {string} startRoom
     * @param {string[]} initialInventory
     * @param {number} depth
     */
    predictSequence(startRoom, initialInventory = [], depth = 3) {
        const sequence = [];
        let currentRoom = startRoom;
        let currentInventory = [...initialInventory];

        for (let i = 0; i < depth; i++) {
            const context = Oracle.formatContext(currentRoom, currentInventory);
            const prediction = this.predictNext(currentRoom, context);

            if (!prediction || prediction.confidence < 0.7) break;

            sequence.push(prediction);

            // Simulate inventory changes
            if (prediction.action.startsWith('take:')) {
                const item = prediction.action.split(':')[1];
                if (!currentInventory.includes(item)) {
                    currentInventory.push(item);
                }
            }

            currentRoom = prediction.predictedState;
        }

        return sequence;
    }

    /**
     * Finds a high-confidence chain of actions the user is likely to perform.
     */
    predictBestChain(startRoom, currentInventory, depth = 3, threshold = 0.85) {
        const sequence = this.predictSequence(startRoom, currentInventory, depth);
        const chain = [];

        for (const step of sequence) {
            if (step.confidence >= threshold) {
                chain.push(step);
            } else {
                break;
            }
        }

        return chain.length >= 2 ? chain : null;
    }

    /**
     * Records a user action and the resulting state transition.
     */
    recordTransition(fromState, action, toState, metadata = {}) {
        if (!this.transitions[fromState]) {
            this.transitions[fromState] = {};
        }
        if (!this.transitions[fromState][action]) {
            this.transitions[fromState][action] = {
                target: toState,
                count: 0,
                durations: []
            };
        }

        const entry = this.transitions[fromState][action];
        entry.count++;
        if (metadata.dwellTime) {
            entry.durations.push(metadata.dwellTime);
        }

        this.history.push({ fromState, action, toState, metadata, timestamp: Date.now() });
        // Cap history to last 100 actions to prevent memory growth
        if (this.history.length > 100) this.history.shift();

        console.log(`[Oracle] Recorded: ${fromState} --(${action})--> ${toState}${metadata.dwellTime ? ` [${metadata.dwellTime}ms]` : ''}`);
        this.save();
    }

    /**
     * Predicts the most likely next action and state.
     * @param {string} currentRoom - The ID of the current room.
     * @param {string} fullContext - A string representing room + inventory + state.
     */
    predictNext(currentRoom, fullContext = null) {
        const roomOptions = this.transitions[currentRoom] || {};
        const contextOptions = fullContext ? (this.transitions[fullContext] || {}) : {};

        const candidates = {};
        let totalWeight = 0;

        // Base layer: What do people usually do in this room?
        Object.entries(roomOptions).forEach(([action, data]) => {
            candidates[action] = { ...data, weight: data.count * 1.0 };
            totalWeight += data.count * 1.0;
        });

        // Contextual layer: What does THIS user (or users with these items) do?
        // Context is much more predictive, so we weight it 5x higher.
        Object.entries(contextOptions).forEach(([action, data]) => {
            if (candidates[action]) {
                candidates[action].weight += data.count * 5.0;
            } else {
                candidates[action] = { ...data, weight: data.count * 5.0 };
            }
            totalWeight += data.count * 5.0;
            candidates[action].isContextual = true;
        });

        let bestAction = null;
        let maxWeight = 0;

        for (const action in candidates) {
            if (candidates[action].weight > maxWeight) {
                maxWeight = candidates[action].weight;
                bestAction = action;
            }
        }

        if (!bestAction) return null;

        const best = candidates[bestAction];

        // Calculate average dwell time for this transition if available
        const avgDwell = best.durations.length > 0
            ? best.durations.reduce((a, b) => a + b, 0) / best.durations.length
            : null;

        return {
            action: bestAction,
            predictedState: best.target,
            confidence: maxWeight / totalWeight,
            isContextual: !!best.isContextual,
            expectedDwellTime: avgDwell,
            reason: best.isContextual ? "Pattern matched your inventory" : "Common path taken by others"
        };
    }

    /**
     * Simulates pre-fetching data for the predicted next state.
     */
    prefetch(prediction) {
        if (!prediction) return;

        // Dispatches a custom event that the UI can listen to
        const event = new CustomEvent('oracle:prefetch', { detail: prediction });
        window.dispatchEvent(event);
    }

    /**
     * Persists transitions to localStorage.
     */
    save() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('oracle_transitions', JSON.stringify(this.transitions));
            }
        } catch (e) {
            console.warn('[Oracle] Failed to save transitions', e);
        }
    }

    /**
     * Loads transitions from localStorage.
     */
    load() {
        try {
            if (typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem('oracle_transitions');
                if (saved) {
                    this.transitions = JSON.parse(saved);
                    console.log('[Oracle] Loaded persistent transitions');
                }
            }
        } catch (e) {
            console.warn('[Oracle] Failed to load transitions', e);
        }
    }
}
