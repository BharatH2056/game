import { COLLECTIVE_ECHOES } from './echoes.js';
import { rooms } from './data.js';

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
        this.ltm = {}; // Oracle Mnemosyne: Long-Term Memory (Macros/Rituals)
        this.traits = { curiosity: 0.5, acquisitiveness: 0.5, haste: 0.5 };
        this.layerWeights = { base: 1.0, context: 5.0, recency: 2.0, trait: 8.0, collective: 2.0, spatial: 2.0, intent: 20.0, mnemosyne: 10.0, attention: 15.0 };
        this.layerAccuracy = { base: 0, context: 0, recency: 0, trait: 0, collective: 0, spatial: 0, intent: 0, mnemosyne: 0, attention: 0 };
        this.currentIntent = { action: null, intensity: 0 };
        this.currentAttention = { action: null, intensity: 0 };
        this.attentionZone = null;
        this.visitedRooms = new Set();
        this.entropy = 0.5;
        this.fluidity = 0.5;
        this.jitter = 0;
        this.frustration = 0;
        // Oracle Soma: Biometric state
        this.fatigue = 0;
        this.cognitiveLoad = 0;
        this.precision = 1.0;
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
     * Sets a transient intent boost based on external signals (e.g. mouse movement).
     */
    setIntent(action, intensity) {
        this.currentIntent = { action, intensity };
    }

    /**
     * Oracle Argus: Sets a transient attentional boost based on focal points (e.g. hovering text).
     */
    updateAttention(action, intensity) {
        this.currentAttention = { action, intensity };
    }

    /**
     * Oracle Argus: Tracks which UI zone the user is currently focusing on.
     */
    setAttentionZone(zone) {
        this.attentionZone = zone;
    }

    /**
     * Records a user action and the resulting state transition.
     */
    recordTransition(fromState, action, toState, metadata = {}) {
        // Meta-Learning (Oracle Sybil): Before recording, check what we WOULD have predicted
        // and see which layers were correct to adjust their influence.
        if (!fromState.includes('|')) { // Only run Sybil for base room transitions to avoid double-counting
            this.runMetaLearning(fromState, metadata.fullContext, action);
        }

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
        if (this.history.length > 100) {
            this.consolidate(); // Oracle Mnemosyne: Consolidate patterns before shifting
            this.history.shift();
        }

        console.log(`[Oracle] Recorded: ${fromState} --(${action})--> ${toState}${metadata.dwellTime ? ` [${metadata.dwellTime}ms]` : ''}`);
        this.calculateFlux();
        this.save();
    }

    /**
     * Oracle Mnemosyne: Consolidates repeating patterns from history into Long-Term Memory.
     * Identifies n-gram sequences (rituals) that the user performs frequently.
     */
    consolidate() {
        if (this.history.length < 20) return;
        this.decayTransitions(); // Synaptic decay happens during consolidation

        // Extract action sequences (2-grams and 3-grams)
        const actions = this.history.map(h => h.action);
        for (let len = 2; len <= 3; len++) {
            for (let i = 0; i <= actions.length - len; i++) {
                const sequence = actions.slice(i, i + len).join('|');
                const startState = this.history[i].fromState;

                if (!this.ltm[startState]) this.ltm[startState] = {};
                if (!this.ltm[startState][sequence]) {
                    this.ltm[startState][sequence] = { count: 0, lastSeen: Date.now() };
                }
                this.ltm[startState][sequence].count++;
                this.ltm[startState][sequence].lastSeen = Date.now();
            }
        }
        console.log(`[Oracle Mnemosyne] Consolidated episodic memory. LTM size: ${Object.keys(this.ltm).length}`);
    }

    /**
     * Oracle Mnemosyne: Prunes weak transitions and old LTM entries (Synaptic Decay).
     */
    decayTransitions() {
        Object.keys(this.transitions).forEach(state => {
            Object.keys(this.transitions[state]).forEach(action => {
                // Synaptic decay: low-frequency transitions are pruned, others are weakened
                if (this.transitions[state][action].count < 1.1) {
                    delete this.transitions[state][action];
                } else {
                    this.transitions[state][action].count *= 0.9;
                }
            });
            if (Object.keys(this.transitions[state]).length === 0) delete this.transitions[state];
        });

        // LTM Decay: Prune macros not seen in a long time or with low counts
        const now = Date.now();
        Object.keys(this.ltm).forEach(state => {
            Object.keys(this.ltm[state]).forEach(seq => {
                const entry = this.ltm[state][seq];
                if (entry.count < 3 && (now - entry.lastSeen > 1000 * 60 * 5)) {
                    delete this.ltm[state][seq];
                }
            });
            if (Object.keys(this.ltm[state]).length === 0) delete this.ltm[state];
        });
    }

    /**
     * Calculates behavioral entropy and fluidity based on recent history.
     */
    calculateFlux() {
        if (this.history.length < 5) return;

        const recent = this.history.slice(-10);

        // 1. Entropy: Variance in action keys and prediction success
        const uniqueActions = new Set(recent.map(h => h.action)).size;

        // Success rate: how often did the user do what was likely?
        // We'll approximate this by checking if the action exists in transitions for that room
        let hits = 0;
        recent.forEach(h => {
            const options = this.transitions[h.fromState] || {};
            if (options[h.action] && options[h.action].count > 1) hits++;
        });
        const successRate = hits / recent.length;

        // High unique actions + low success = high entropy (Chaos)
        this.entropy = (uniqueActions / 4) * (1 - successRate);
        this.entropy = Math.max(0, Math.min(1, this.entropy));

        // 2. Fluidity: Dwell time consistency (Rhythm)
        const durations = recent.map(h => h.metadata.dwellTime).filter(d => d !== undefined);
        if (durations.length > 1) {
            const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
            const variance = durations.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / durations.length;
            const stdDev = Math.sqrt(variance);

            // Lower stdDev relative to avg means higher fluidity (Flow)
            this.fluidity = 1 - Math.min(1, stdDev / Math.max(1000, avg));
        }

        console.log(`[Oracle Flux] Entropy: ${this.entropy.toFixed(2)}, Fluidity: ${this.fluidity.toFixed(2)}`);
    }

    /**
     * Returns the current behavioral state.
     */
    getFluxInference() {
        if (this.entropy > 0.7) return { state: 'Chaos', score: this.entropy };
        if (this.fluidity > 0.7 && this.entropy < 0.4) return { state: 'Flow', score: this.fluidity };
        return { state: 'Steady', score: 0.5 };
    }

    /**
     * Updates somatic signals (like mouse jitter) and calculates frustration.
     */
    updateSomaticSignal(jitter) {
        // Smooth jitter over time
        this.jitter = (this.jitter * 0.8) + (jitter * 0.2);

        const loopFactor = this.detectLoops() ? 0.4 : 0;
        const stagnationFactor = (this.history.length > 0 &&
            (Date.now() - this.history[this.history.length-1].timestamp) > 10000) ? 0.2 : 0;

        // Frustration is a mix of somatic jitter, repetitive looping, and stagnation
        this.frustration = Math.min(1, (this.jitter * 0.4) + loopFactor + stagnationFactor);
    }

    /**
     * Detects if the user is stuck in a navigation loop (e.g., A -> B -> A -> B).
     */
    detectLoops() {
        if (this.history.length < 4) return false;
        const recent = this.history.slice(-6).map(h => h.fromState);

        // Simple cycle detection for length 2 and 3
        if (recent.length >= 4 && recent[recent.length-1] === recent[recent.length-3] &&
            recent[recent.length-2] === recent[recent.length-4]) return true;

        if (recent.length >= 6 && recent[recent.length-1] === recent[recent.length-4] &&
            recent[recent.length-2] === recent[recent.length-5] &&
            recent[recent.length-3] === recent[recent.length-6]) return true;

        return false;
    }

    /**
     * Returns the current emotional/pathos state.
     */
    getPathosInference() {
        if (this.frustration > 0.6) return { state: 'Frustrated', score: this.frustration, icon: '🌪️' };
        if (this.frustration > 0.3) return { state: 'Hesitant', score: this.frustration, icon: '🌫️' };
        return { state: 'Confident', score: 1 - this.frustration, icon: '🌊' };
    }

    /**
     * Updates biometric signals and calculates interaction fatigue.
     */
    updateBiometrics(signals) {
        // Latency: reaction time (ms)
        if (signals.latency !== undefined) {
            const normalizedLatency = Math.min(1, signals.latency / 5000);
            this.cognitiveLoad = (this.cognitiveLoad * 0.7) + (normalizedLatency * 0.3);
        }

        // Precision: ratio of straight-line distance to actual path distance
        if (signals.precision !== undefined) {
            this.precision = (this.precision * 0.8) + (signals.precision * 0.2);
        }

        // Hesitations: hover count
        if (signals.hesitations !== undefined) {
            const hesitationFactor = Math.min(1, signals.hesitations / 5);
            this.cognitiveLoad = Math.min(1, this.cognitiveLoad + (hesitationFactor * 0.1));
        }

        // Fatigue increases with cognitive load and decreasing precision
        const fatigueSignal = (this.cognitiveLoad * 0.6) + ((1 - this.precision) * 0.4);
        this.fatigue = (this.fatigue * 0.9) + (fatigueSignal * 0.1);
    }

    /**
     * Returns the current biometric/soma state.
     */
    getSomaInference() {
        if (this.fatigue > 0.7) return { state: 'Fatigued', score: this.fatigue, icon: '🔋' };
        if (this.fatigue > 0.4) return { state: 'Taxed', score: this.fatigue, icon: '⏳' };
        return { state: 'Fresh', score: 1 - this.fatigue, icon: '⚡' };
    }

    /**
     * Analyzes which layer correctly predicted the action and adjusts weights.
     */
    runMetaLearning(room, context, actualAction) {
        const layers = {
            base: (this.transitions[room] || {})[actualAction] ? 1 : 0,
            context: context ? ((this.transitions[context] || {})[actualAction] ? 1 : 0) : 0,
            recency: this.history.slice(-10).some(h => h.action === actualAction && (h.fromState === room || h.fromState === context)) ? 1 : 0,
            trait: (actualAction.startsWith('take:') && this.traits.acquisitiveness > 0.6) ||
                   (actualAction.startsWith('move:') && this.traits.curiosity > 0.6) ? 1 : 0,
            collective: false,
            spatial: false,
            mnemosyne: false
        };

        // Check Mnemosyne: did the action match a consolidated macro?
        const macros = this.ltm[room] || {};
        layers.mnemosyne = Object.keys(macros).some(seq => seq.split('|')[0] === actualAction && macros[seq].count >= 3);

        // Oracle Argus: Was the action being focused on?
        layers.attention = this.currentAttention.action === actualAction;

        // Check spatial intuition
        const lastMove = this.history.slice(-1).find(h => h.action.startsWith('move:'));
        if (lastMove) {
            const [_, dir] = lastMove.action.split(':');
            const opposites = { 'north': 'south', 'south': 'north', 'east': 'west', 'west': 'east' };
            if (actualAction === `move:${opposites[dir]}`) layers.spatial = true;
        }

        // Check collective wisdom
        const archetype = this.getArchetype();
        const echoes = COLLECTIVE_ECHOES[archetype] ? (COLLECTIVE_ECHOES[archetype][room] || {}) : {};
        layers.collective = !!echoes[actualAction];

        // Update accuracy and nudge weights
        Object.keys(layers).forEach(layer => {
            if (layers[layer]) {
                this.layerAccuracy[layer]++;
                this.layerWeights[layer] = Math.min(20, this.layerWeights[layer] + 0.1);
            } else {
                this.layerWeights[layer] = Math.max(0.5, this.layerWeights[layer] - 0.05);
            }
        });
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
     * @param {string} currentRoomId - The ID of the current room.
     * @param {string} fullContext - A string representing room + inventory + state.
     */
    predictNext(currentRoomId, fullContext = null) {
        const roomOptions = this.transitions[currentRoomId] || {};
        const contextOptions = fullContext ? (this.transitions[fullContext] || {}) : {};
        const roomData = rooms[currentRoomId];

        const flux = this.getFluxInference();
        const pathos = this.getPathosInference();
        const soma = this.getSomaInference();
        const weights = { ...this.layerWeights };

        // Oracle Argus: Adjust weights based on attention zone
        if (this.attentionZone === 'inventory') {
            weights.trait *= 1.5; // Focusing on inventory implies interest in items/acquisitiveness
            weights.context *= 1.2;
        } else if (this.attentionZone === 'description') {
            weights.attention *= 1.2;
            weights.collective *= 1.2;
        }

        // Oracle Mnemosyne: Boost LTM during Flow state
        if (flux.state === 'Flow') {
            weights.mnemosyne *= 2.5;
        }

        // Adjust weights based on Soma (Biometric state)
        if (soma.state === 'Fatigued') {
            // High fatigue means the user needs the Oracle to lead.
            // Boost collective wisdom and prophecies (Discovery) significantly.
            weights.collective *= 4.0;
            weights.spatial *= 2.5;
            weights.base *= 0.1;
            weights.intent *= 0.5; // Trust kinesthetic signals less during fatigue
        } else if (soma.state === 'Taxed') {
            weights.collective *= 2.0;
            weights.trait *= 1.5;
        }

        // Adjust weights based on Flux state
        if (flux.state === 'Chaos') {
            weights.collective *= 2.0;
            weights.base *= 0.5;
        } else if (flux.state === 'Flow') {
            weights.recency *= 2.0;
            weights.context *= 1.5;
        }

        // Adjust weights based on Pathos (Emotional state)
        if (pathos.state === 'Frustrated') {
            // During frustration, player needs external guidance
            weights.collective *= 3.0;
            weights.spatial *= 2.0;
            weights.base *= 0.2;
        } else if (pathos.state === 'Hesitant') {
            weights.trait *= 1.5;
            weights.collective *= 1.5;
        }

        const candidates = {};
        let totalWeight = 0;

        // Genesis Layer: Initialize candidates with ALL available actions in the room.
        // This allows the Oracle to predict even if it hasn't seen the room before.
        if (roomData) {
            Object.entries(roomData.exits).forEach(([dir, target]) => {
                const action = `move:${dir}`;
                candidates[action] = { target, weight: 0.1, count: 0, durations: [] };
                totalWeight += 0.1;
            });
            roomData.items.forEach(item => {
                const action = `take:${item}`;
                candidates[action] = { target: currentRoomId, weight: 0.1, count: 0, durations: [] };
                totalWeight += 0.1;
            });
        }

        // Base layer: What do people usually do in this room?
        Object.entries(roomOptions).forEach(([action, data]) => {
            candidates[action] = { ...data, weight: data.count * weights.base };
            totalWeight += data.count * weights.base;
        });

        // Contextual layer: What does THIS user (or users with these items) do?
        Object.entries(contextOptions).forEach(([action, data]) => {
            const weight = data.count * weights.context;
            if (candidates[action]) {
                candidates[action].weight += weight;
            } else {
                candidates[action] = { ...data, weight: weight };
            }
            totalWeight += weight;
            candidates[action].isContextual = true;
        });

        // Recency layer: Exponentially boost actions in the last 10 transitions.
        const recent = this.history.slice(-10);
        recent.forEach((entry, idx) => {
            if ((entry.fromState === currentRoomId || entry.fromState === fullContext) && candidates[entry.action]) {
                const boost = Math.pow(2, idx + 1) * weights.recency;
                candidates[entry.action].weight += boost;
                totalWeight += boost;
            }
        });

        // Archetype layer: Boost based on player personality traits.
        Object.entries(candidates).forEach(([action, data]) => {
            let boost = 0;
            if (action.startsWith('take:')) {
                boost = this.traits.acquisitiveness * weights.trait;
            } else if (action.startsWith('move:') && !this.visitedRooms.has(data.target)) {
                boost = this.traits.curiosity * weights.trait;
            }

            if (boost > 0) {
                data.weight += boost;
                totalWeight += boost;
                data.traitBoosted = true;
            }
        });

        // Spatial layer: Boost inverse transitions (if I came from North, I likely go South)
        const lastMove = this.history.slice(-1).find(h => h.action.startsWith('move:'));
        if (lastMove) {
            const [_, dir] = lastMove.action.split(':');
            const opposites = { 'north': 'south', 'south': 'north', 'east': 'west', 'west': 'east' };
            const invAction = `move:${opposites[dir]}`;
            if (candidates[invAction]) {
                const boost = weights.spatial;
                candidates[invAction].weight += boost;
                totalWeight += boost;
                candidates[invAction].isSpatial = true;
            }
        }

        // Collective layer: Wisdom from parallel sessions matching the current archetype.
        const archetype = this.getArchetype();
        const echoes = COLLECTIVE_ECHOES[archetype] ? (COLLECTIVE_ECHOES[archetype][currentRoomId] || {}) : {};
        Object.entries(echoes).forEach(([action, data]) => {
            const boost = data.weight * weights.collective;
            if (candidates[action]) {
                candidates[action].weight += boost;
            } else {
                candidates[action] = { target: data.target, weight: boost, count: 0, durations: [], isEcho: true };
            }
            totalWeight += boost;
            candidates[action].isEcho = true;
        });

        // Mnemosyne Layer: Apply Long-Term Memory (Macros/Rituals)
        const macros = this.ltm[currentRoomId] || {};
        Object.entries(macros).forEach(([seq, data]) => {
            const firstAction = seq.split('|')[0];
            const boost = data.count * weights.mnemosyne;
            if (candidates[firstAction]) {
                candidates[firstAction].weight += boost;
            } else {
                // If it's a known macro, we can predict even if base doesn't have it
                candidates[firstAction] = { target: currentRoomId, weight: boost, count: 0, durations: [], isMacro: true };
            }
            totalWeight += boost;
            candidates[firstAction].isMacro = true;
        });

        // Oracle Argus (Attention) layer: Focus on specific keywords or UI elements
        if (this.currentAttention.action && candidates[this.currentAttention.action]) {
            const boost = this.currentAttention.intensity * weights.attention;
            candidates[this.currentAttention.action].weight += boost;
            totalWeight += boost;
            candidates[this.currentAttention.action].isAttention = true;
        }

        // Intent (Synapse) layer: Real-time kinesthetic signals (mouse trajectory)
        // This is calculated LAST to ensure it can override other layers with high intensity.
        if (this.currentIntent.action && candidates[this.currentIntent.action]) {
            const boost = this.currentIntent.intensity * weights.intent;
            candidates[this.currentIntent.action].weight += boost;
            totalWeight += boost;
            candidates[this.currentIntent.action].isIntent = true;
        }

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
            isSpatial: !!best.isSpatial,
            isIntent: !!best.isIntent,
            isMacro: !!best.isMacro,
            isAttention: !!best.isAttention,
            isGuidance: (pathos.state === 'Frustrated' || soma.state === 'Fatigued') && (best.isEcho || best.isSpatial),
            isSomaAssisted: soma.state === 'Fatigued' && (best.isEcho || best.isSpatial),
            expectedDwellTime: avgDwell,
            reason: best.isIntent ? "Oracle Synapse: Kinesthetic Intent" :
                   (best.isAttention ? "Oracle Argus: Attentional Focus" :
                   (best.isMacro ? "Mnemosyne: Recall of a frequent ritual" :
                   (soma.state === 'Fatigued' && (best.isEcho || best.isSpatial) ? "Soma: Fatigue detected, auto-tuning to collective paths" :
                   (pathos.state === 'Frustrated' && (best.isEcho || best.isSpatial) ? "Pathos: Providing guidance due to frustration" :
                   (best.isEcho ? `Collective wisdom of other ${archetype}s` :
                   (best.isSpatial ? "Spatial intuition" :
                   (best.traitBoosted ? "Intuition based on your playstyle" :
                   (best.isContextual ? "Pattern matched your inventory" : "Common path taken by others"))))))))
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
     * Searches for a high-value destiny (uncollected items or unvisited rooms).
     * Uses a simple BFS to find the shortest path to a goal.
     */
    findProphecy(currentRoom, inventory) {
        const queue = [{ id: currentRoom, path: [] }];
        const visited = new Set([currentRoom]);

        while (queue.length > 0) {
            const { id, path } = queue.shift();
            const room = rooms[id];

            if (!room) continue;

            // Goal: Uncollected items in this room
            const uncollectedItems = room.items.filter(item => !inventory.includes(item));
            if (uncollectedItems.length > 0) {
                return {
                    type: 'item',
                    goal: uncollectedItems[0],
                    targetRoom: id,
                    path: path,
                    action: `take:${uncollectedItems[0]}`,
                    description: `The Oracle senses a ${uncollectedItems[0]} nearby in ${room.name}.`
                };
            }

            for (const [dir, nextId] of Object.entries(room.exits)) {
                if (!visited.has(nextId)) {
                    visited.add(nextId);
                    const newPath = [...path, `move:${dir}`];

                    // Goal: Unvisited rooms
                    if (!this.visitedRooms.has(nextId)) {
                         return {
                            type: 'discovery',
                            goal: rooms[nextId]?.name || 'Unknown',
                            targetRoom: nextId,
                            path: path,
                            action: `move:${dir}`,
                            description: `The Oracle whispers of an unexplored path to the ${dir}.`
                        };
                    }

                    queue.push({ id: nextId, path: newPath });
                }
            }
        }
        return null;
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
                localStorage.setItem('oracle_ltm', JSON.stringify(this.ltm));
                localStorage.setItem('oracle_traits', JSON.stringify(this.traits));
                localStorage.setItem('oracle_visited', JSON.stringify(Array.from(this.visitedRooms)));
                localStorage.setItem('oracle_weights', JSON.stringify(this.layerWeights));
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

                const savedLtm = localStorage.getItem('oracle_ltm');
                if (savedLtm) {
                    this.ltm = JSON.parse(savedLtm);
                    console.log('[Oracle] Loaded Mnemosyne long-term memory');
                }

                const savedTraits = localStorage.getItem('oracle_traits');
                if (savedTraits) {
                    this.traits = JSON.parse(savedTraits);
                }

                const savedVisited = localStorage.getItem('oracle_visited');
                if (savedVisited) {
                    this.visitedRooms = new Set(JSON.parse(savedVisited));
                }

                const savedWeights = localStorage.getItem('oracle_weights');
                if (savedWeights) {
                    this.layerWeights = JSON.parse(savedWeights);
                }
            }
        } catch (e) {
            console.warn('[Oracle] Failed to load persistence data', e);
        }
    }
}
