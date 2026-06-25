import { COLLECTIVE_ECHOES } from './echoes.js';

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
        this.traits = { curiosity: 0.5, acquisitiveness: 0.5, haste: 0.5 };
        this.visitedRooms = new Set();
        this.load();
    }

    /**
     * Determines the current Archetype based on traits.
     */
    getArchetype() {
        const t = this.traits;
        if (t.curiosity > 0.6 && t.acquisitiveness > 0.6) return "The Completionist";
        if (t.curiosity > 0.7) return "The Explorer";
        if (t.acquisitiveness > 0.7) return "The Collector";
        if (t.haste > 0.7) return "The Speedrunner";
        return "The Observer";
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

        // Update Archetype Traits
        this.updateTraits(fromState, action, toState, metadata);

        this.history.push({ fromState, action, toState, metadata, timestamp: Date.now() });
        // Cap history to last 100 actions to prevent memory growth
        if (this.history.length > 100) this.history.shift();

        console.log(`[Oracle] Recorded: ${fromState} --(${action})--> ${toState}${metadata.dwellTime ? ` [${metadata.dwellTime}ms]` : ''}`);
        this.save();
    }

    /**
     * Evolves player traits based on behavior.
     */
    updateTraits(fromState, action, toState, metadata) {
        // 1. Curiosity: Increase if visiting a new room
        if (action.startsWith('move:') && !this.visitedRooms.has(toState)) {
            this.visitedRooms.add(toState);
            this.traits.curiosity = Math.min(1, this.traits.curiosity + 0.1);
        }

        // 2. Acquisitiveness: Increase if taking items
        if (action.startsWith('take:')) {
            this.traits.acquisitiveness = Math.min(1, this.traits.acquisitiveness + 0.15);
        }

        // 3. Haste: Increase if acting faster than expected, or generally fast (< 2s)
        const prediction = this.predictNext(fromState);
        const dwell = metadata.dwellTime || 0;
        if (dwell > 0) {
            const threshold = (prediction && prediction.expectedDwellTime) ? prediction.expectedDwellTime : 3000;
            if (dwell < threshold) {
                this.traits.haste = Math.min(1, this.traits.haste + 0.05);
            } else {
                this.traits.haste = Math.max(0, this.traits.haste - 0.02);
            }
        }
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

        // Recency layer: Exponentially boost actions in the last 10 transitions.
        // This makes the Oracle adapt instantly to a user's current intent.
        const recent = this.history.slice(-10);
        recent.forEach((entry, idx) => {
            if ((entry.fromState === currentRoom || entry.fromState === fullContext) && candidates[entry.action]) {
                const boost = Math.pow(2, idx + 1);
                candidates[entry.action].weight += boost;
                totalWeight += boost;
            }
        });

        // Archetype layer: Boost based on player personality traits.
        // This allows the Oracle to "guess" intent even without direct history.
        Object.entries(candidates).forEach(([action, data]) => {
            let boost = 0;
            if (action.startsWith('take:')) {
                boost = this.traits.acquisitiveness * 10.0;
            } else if (action.startsWith('move:') && !this.visitedRooms.has(data.target)) {
                boost = this.traits.curiosity * 8.0;
            }

            if (boost > 0) {
                data.weight += boost;
                totalWeight += boost;
                data.traitBoosted = true;
            }
        });

        // Collective layer: Wisdom from parallel sessions matching the current archetype.
        const archetype = this.getArchetype();
        const echoes = COLLECTIVE_ECHOES[archetype] ? (COLLECTIVE_ECHOES[archetype][currentRoom] || {}) : {};
        Object.entries(echoes).forEach(([action, data]) => {
            const boost = data.weight * 2.0; // Echoes are significant
            if (candidates[action]) {
                candidates[action].weight += boost;
            } else {
                candidates[action] = { target: data.target, weight: boost, count: 0, durations: [], isEcho: true };
            }
            totalWeight += boost;
            candidates[action].isEcho = true;
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
            isIntuitive: !!best.traitBoosted,
            isCollective: !!best.isEcho,
            expectedDwellTime: avgDwell,
            reason: best.isEcho ? `Collective wisdom of other ${archetype}s` : (best.traitBoosted ? "Intuition based on your playstyle" : (best.isContextual ? "Pattern matched your inventory" : "Common path taken by others"))
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
     * Calculates temporal alignment (resonance) and detects stagnation.
     */
    getTemporalInference(currentRoom, fullContext, currentDwellTime) {
        const prediction = this.predictNext(currentRoom, fullContext);
        if (!prediction || !prediction.expectedDwellTime) return { resonance: 0, isStagnant: false };

        const expected = prediction.expectedDwellTime;
        // Resonance is 1.0 when perfectly on time, dropping to 0 as it diverges
        const resonance = Math.max(0, 1 - Math.abs(currentDwellTime - expected) / (expected * 1.5));

        // Stagnant if user takes > 2.5x longer than expected AND has been there > 7s
        const isStagnant = currentDwellTime > expected * 2.5 && currentDwellTime > 7000;

        return { resonance, isStagnant, expectedDwellTime: expected };
    }

    /**
     * Identifies the current behavioral "mode" of the player.
     */
    getBehavioralProfile() {
        if (this.history.length < 5) return "Learning Patterns";

        const recent = this.history.slice(-10);
        const uniqueRooms = new Set(recent.map(h => h.toState)).size;

        if (uniqueRooms >= recent.length * 0.6) return "Discovery Mode";
        if (uniqueRooms <= recent.length * 0.3) return "Routine Flow";
        return "Steady Progression";
    }

    /**
     * Persists transitions and traits to localStorage.
     */
    save() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('oracle_transitions', JSON.stringify(this.transitions));
                localStorage.setItem('oracle_traits', JSON.stringify(this.traits));
                localStorage.setItem('oracle_visited', JSON.stringify(Array.from(this.visitedRooms)));
            }
        } catch (e) {
            console.warn('[Oracle] Failed to save persistence data', e);
        }
    }

    /**
     * Loads transitions and traits from localStorage.
     */
    load() {
        try {
            if (typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem('oracle_transitions');
                if (saved) {
                    this.transitions = JSON.parse(saved);
                    console.log('[Oracle] Loaded persistent transitions');
                }

                const savedTraits = localStorage.getItem('oracle_traits');
                if (savedTraits) {
                    this.traits = JSON.parse(savedTraits);
                }

                const savedVisited = localStorage.getItem('oracle_visited');
                if (savedVisited) {
                    this.visitedRooms = new Set(JSON.parse(savedVisited));
                }
            }
        } catch (e) {
            console.warn('[Oracle] Failed to load persistence data', e);
        }
    }
}
