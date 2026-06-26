import { rooms } from './src/data.js';
import { Oracle } from './src/oracle.js';

class Game {
    constructor() {
        this.currentRoomId = 'entrance';
        this.inventory = [];
        this.oracle = new Oracle();
        this.roomEntryTime = Date.now();
        this.setupOracleListeners();
        this.render();
        this.tick();
    }

    /**
     * The Oracle's heartbeat. Updates temporal predictions in real-time.
     */
    tick() {
        const dwellTime = Date.now() - this.roomEntryTime;
        const inference = this.oracle.getTemporalInference(this.currentRoomId, this.getContextKey(), dwellTime);

        this.updateTemporalUI(inference);
        requestAnimationFrame(() => this.tick());
    }

    updateTemporalUI(inference) {
        const statusEl = document.querySelector('#oracle-mode');
        const archetypeEl = document.querySelector('#oracle-archetype span');
        const profile = this.oracle.getBehavioralProfile();

        // Update Archetype display
        const archetype = this.oracle.getArchetype();
        archetypeEl.innerText = archetype;

        // Meta-Learning indicators: Show which layer the Oracle is favoring
        const weights = this.oracle.layerWeights;
        const dominantLayer = Object.keys(weights).reduce((a, b) => weights[a] > weights[b] ? a : b);
        const sybilIcon = dominantLayer === 'context' ? '🧠' : (dominantLayer === 'collective' ? '📡' : (dominantLayer === 'trait' ? '✨' : '👁️'));

        // Update status with behavioral profile and Sybil dominance
        statusEl.innerText = `${sybilIcon} ${profile} ${inference.isStagnant ? '(Stagnant)' : ''}`;

        // Prophecy: If stagnant, reveal destiny
        const prophecyEl = document.getElementById('oracle-prophecy');
        if (inference.isStagnant) {
            const prophecy = this.oracle.findProphecy(this.currentRoomId, this.inventory);
            if (prophecy) {
                prophecyEl.innerHTML = `<div class="prophecy-glow"></div><div class="prophecy-content">🔮 <strong>Prophecy:</strong> ${prophecy.description}</div>`;
                prophecyEl.classList.add('visible');
            }
        } else {
            prophecyEl.classList.remove('visible');
        }

        // Update resonance on the predicted button
        const hintedBtn = document.querySelector('button.oracle-hint');
        if (hintedBtn) {
            let resonanceMeter = hintedBtn.querySelector('.resonance-meter');
            if (!resonanceMeter) {
                resonanceMeter = document.createElement('div');
                resonanceMeter.className = 'resonance-meter';
                hintedBtn.appendChild(resonanceMeter);
            }
            resonanceMeter.style.width = `${inference.resonance * 100}%`;

            if (inference.isStagnant) {
                hintedBtn.classList.add('stagnation-pulse');
            } else {
                hintedBtn.classList.remove('stagnation-pulse');
            }
        }
    }

    setupOracleListeners() {
        window.addEventListener('oracle:prefetch', (e) => {
            const prediction = e.detail;
            const statusEl = document.querySelector('#oracle-mode');
            const consoleEl = document.getElementById('prediction-list');

            statusEl.innerText = prediction.confidence > 0.8 ? 'Seeing Future' : 'Predicting';

            const logEntry = document.createElement('div');
            logEntry.className = prediction.isCollective ? 'log-collective' : (prediction.isIntuitive ? 'log-intuitive' : (prediction.isContextual ? 'log-contextual' : ''));
            logEntry.innerText = `> Predicted ${prediction.action} (${(prediction.confidence * 100).toFixed(0)}%) - ${prediction.reason}`;
            consoleEl.prepend(logEntry);

            // Highlight the predicted button
            const buttons = document.querySelectorAll('#controls button');
            buttons.forEach(btn => {
                const actionKey = `${btn.dataset.action}:${btn.dataset.target}`;
                if (actionKey === prediction.action) {
                    btn.classList.add('oracle-hint');
                    if (prediction.isCollective) {
                        btn.classList.add('oracle-collective');
                        btn.classList.remove('oracle-intuitive');
                    } else if (prediction.isIntuitive) {
                        btn.classList.add('oracle-intuitive');
                        btn.classList.remove('oracle-collective');
                    } else {
                        btn.classList.remove('oracle-intuitive');
                        btn.classList.remove('oracle-collective');
                    }
                } else {
                    btn.classList.remove('oracle-hint');
                    btn.classList.remove('oracle-intuitive');
                    btn.classList.remove('oracle-collective');
                }
            });

            // Action Chaining (Shortcuts)
            const shortcutsEl = document.getElementById('oracle-shortcuts');
            if (shortcutsEl) {
                const chain = this.oracle.predictBestChain(this.currentRoomId, this.inventory);
                if (chain) {
                    const chainDesc = chain.map(c => c.action).join(' → ');
                    shortcutsEl.innerHTML = `
                        <div class="shortcut-banner">Oracle Shortcut Detected</div>
                        <button class="oracle-shortcut-btn" onclick="game.executeActionChain(${JSON.stringify(chain.map(c => c.action)).replace(/"/g, '&quot;')})">
                            Execute Chain: ${chainDesc}
                        </button>
                    `;
                } else {
                    shortcutsEl.innerHTML = '';
                }
            }

            // Vision Preview
            this.updateVision(prediction);
        });
    }

    updateVision(prediction) {
        let visionEl = document.getElementById('oracle-vision');
        if (!visionEl) {
            visionEl = document.createElement('div');
            visionEl.id = 'oracle-vision';
            document.getElementById('room-description').appendChild(visionEl);
        }

        if (prediction && prediction.confidence > 0.6) {
            const targetRoom = rooms[prediction.predictedState];
            const label = prediction.isCollective ? 'Collective Wisdom' : (prediction.isIntuitive ? 'Intuition' : 'Vision');
            let html = `<div class="vision-next ${prediction.isCollective ? 'vision-collective' : ''}"><span class="vision-label">${label}:</span> You sense ${targetRoom ? targetRoom.name : 'something'} ahead...</div>`;

            // Deep Vision: Try to see further ahead using context-aware simulation
            const sequence = this.oracle.predictSequence(prediction.predictedState, this.inventory, 2);
            if (sequence.length > 0) {
                sequence.forEach((step, idx) => {
                    const room = rooms[step.predictedState];
                    html += `<div class="vision-deep"><span class="vision-label-deep">${idx === 0 ? 'Beyond' : 'Distant'}:</span> ${step.action} to ${room ? room.name : 'the unknown'}</div>`;
                });
            }

            visionEl.innerHTML = html;
            visionEl.style.opacity = prediction.confidence;
        } else {
            visionEl.innerHTML = '';
        }
    }

    executeActionChain(actions) {
        console.log(`[Oracle] Executing action chain: ${actions.join(' -> ')}`);
        actions.forEach(actionKey => {
            const [type, target] = actionKey.split(':');
            if (type === 'move') {
                this.move(target);
            } else if (type === 'take') {
                this.take(target);
            }
        });
    }

    getContextKey() {
        return Oracle.formatContext(this.currentRoomId, this.inventory);
    }

    move(direction) {
        const now = Date.now();
        const dwellTime = now - this.roomEntryTime;

        const previousRoomId = this.currentRoomId;
        const previousContext = this.getContextKey();

        const room = rooms[this.currentRoomId];
        const nextRoomId = room.exits[direction];

        if (nextRoomId) {
            const actionKey = `move:${direction}`;

            // Record both the simple room transition and the contextual transition
            this.oracle.recordTransition(previousRoomId, actionKey, nextRoomId, { dwellTime, fullContext: previousContext });
            this.oracle.recordTransition(previousContext, actionKey, nextRoomId, { dwellTime, fullContext: previousContext });

            this.currentRoomId = nextRoomId;
            this.roomEntryTime = now;
            this.render();
        }
    }

    take(item) {
        const now = Date.now();
        const dwellTime = now - this.roomEntryTime;

        const previousRoomId = this.currentRoomId;
        const previousContext = this.getContextKey();

        const room = rooms[this.currentRoomId];
        const itemIndex = room.items.indexOf(item);

        if (itemIndex > -1) {
            const actionKey = `take:${item}`;

            this.oracle.recordTransition(previousRoomId, actionKey, previousRoomId, { dwellTime, fullContext: previousContext });
            this.oracle.recordTransition(previousContext, actionKey, previousRoomId, { dwellTime, fullContext: previousContext });

            room.items.splice(itemIndex, 1);
            this.inventory.push(item);
            this.render();
        }
    }

    render() {
        const room = rooms[this.currentRoomId];
        const descriptionEl = document.getElementById('room-description');
        const controlsEl = document.getElementById('controls');
        const inventoryEl = document.getElementById('inventory-list');

        descriptionEl.innerHTML = `<h2>${room.name}</h2><p>${room.description}</p>`;

        if (room.items.length > 0) {
            descriptionEl.innerHTML += `<p>Items here: ${room.items.join(', ')}</p>`;
        }

        controlsEl.innerHTML = '';
        const createBtn = (label, action, target, onClick) => {
            const btn = document.createElement('button');
            btn.innerText = label;
            btn.onclick = onClick;
            btn.dataset.action = action;
            btn.dataset.target = target;

            // Shadow Vision: Anticipate intent on hover
            btn.onmouseenter = () => {
                const actionKey = `${action}:${target}`;
                // Find transition for this action
                const transitions = this.oracle.transitions[this.currentRoomId] || this.oracle.transitions[this.getContextKey()] || {};
                const targetState = transitions[actionKey]?.target || (action === 'move' ? room.exits[target] : this.currentRoomId);

                this.updateVision({
                    action: actionKey,
                    predictedState: targetState,
                    confidence: 1.0,
                    reason: "Anticipating your intent..."
                });
            };
            btn.onmouseleave = () => {
                const p = this.oracle.predictNext(this.currentRoomId, this.getContextKey());
                this.updateVision(p);
            };

            return btn;
        };

        Object.keys(room.exits).forEach(dir => {
            controlsEl.appendChild(createBtn(`Go ${dir}`, 'move', dir, () => this.move(dir)));
        });

        room.items.forEach(item => {
            controlsEl.appendChild(createBtn(`Take ${item}`, 'take', item, () => this.take(item)));
        });

        inventoryEl.innerHTML = '';
        this.inventory.forEach(item => {
            const li = document.createElement('li');
            li.innerText = item;
            inventoryEl.appendChild(li);
        });

        // After rendering, ask Oracle for the next prediction
        const prediction = this.oracle.predictNext(this.currentRoomId, this.getContextKey());
        if (prediction) {
            this.oracle.prefetch(prediction);
        } else {
            document.querySelector('#oracle-mode').innerText = 'Learning...';
            this.updateVision(null);
        }
    }
}

window.game = new Game();
