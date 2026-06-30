import { rooms } from './src/data.js';
import { Oracle } from './src/oracle.js';

class Game {
    constructor() {
        this.currentRoomId = 'entrance';
        this.inventory = [];
        this.oracle = new Oracle();
        this.roomEntryTime = Date.now();
        this.lastMousePos = { x: 0, y: 0 };
        this.lastMouseTime = Date.now();
        this.setupOracleListeners();
        this.setupSynapseTracking();
        this.render();
        this.tick();
    }

    /**
     * Tracks mouse kinematics to feed the Oracle's Synapse and Pathos layers.
     */
    setupSynapseTracking() {
        const container = document.getElementById('game-container');
        let velocitySamples = [];

        container.addEventListener('mousemove', (e) => {
            const now = Date.now();
            const dt = now - this.lastMouseTime;
            if (dt < 20) return; // Throttle for performance

            const dx = e.clientX - this.lastMousePos.x;
            const dy = e.clientY - this.lastMousePos.y;
            const velocity = { x: dx / dt, y: dy / dt };
            const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

            // Pathos: Calculate kinematic jitter (velocity variance)
            velocitySamples.push(speed);
            if (velocitySamples.length > 10) {
                velocitySamples.shift();
                const avg = velocitySamples.reduce((a, b) => a + b, 0) / velocitySamples.length;
                const variance = velocitySamples.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / velocitySamples.length;
                const jitter = Math.min(1, variance / 5); // Normalize jitter signal
                this.oracle.updateSomaticSignal(jitter);
            }

            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.lastMouseTime = now;

            const buttons = document.querySelectorAll('#controls button');
            let bestAction = null;
            let maxIntent = 0;

            buttons.forEach(btn => {
                const rect = btn.getBoundingClientRect();
                const center = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };

                const toBtn = { x: center.x - e.clientX, y: center.y - e.clientY };
                const dist = Math.sqrt(toBtn.x ** 2 + toBtn.y ** 2);

                // Normalized direction to button
                const dirToBtn = { x: toBtn.x / dist, y: toBtn.y / dist };

                // Dot product: how much is the mouse moving TOWARD this button?
                // Higher speed and closer distance increase intent.
                const alignment = (velocity.x * dirToBtn.x + velocity.y * dirToBtn.y);
                const intent = Math.max(0, alignment * speed * (1000 / dist));

                if (intent > maxIntent) {
                    maxIntent = intent;
                    bestAction = `${btn.dataset.action}:${btn.dataset.target}`;
                }
            });

            if (maxIntent > 0.5) {
                this.oracle.setIntent(bestAction, Math.min(2.0, maxIntent));
                // Trigger a re-prediction and prefetch when intent is strong
                const prediction = this.oracle.predictNext(this.currentRoomId, this.getContextKey());
                if (prediction) this.oracle.prefetch(prediction);
            } else {
                this.oracle.setIntent(null, 0);
            }
        });
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

        // Oracle Flux UI integration
        this.updateFluxUI();

        // Pathos UI integration
        const pathos = this.oracle.getPathosInference();
        const pathosEl = document.querySelector('#pathos-status span');
        if (pathosEl) {
            pathosEl.innerText = `${pathos.icon} ${pathos.state}`;
            pathosEl.style.color = pathos.state === 'Frustrated' ? '#ff4444' : (pathos.state === 'Hesitant' ? '#ffcc00' : '#00ccff');
        }

        // Meta-Learning indicators: Show which layer the Oracle is favoring
        const weights = this.oracle.layerWeights;
        const dominantLayer = Object.keys(weights).reduce((a, b) => weights[a] > weights[b] ? a : b);
        const sybilIcon = dominantLayer === 'intent' ? '⚡' : (dominantLayer === 'context' ? '🧠' : (dominantLayer === 'collective' ? '📡' : (dominantLayer === 'trait' ? '✨' : '👁️')));

        // Update status with behavioral profile and Sybil dominance
        statusEl.innerText = `${sybilIcon} ${profile} ${inference.isStagnant ? '(Stagnant)' : ''}`;

        // Prophecy: If stagnant OR highly frustrated, reveal destiny
        const prophecyEl = document.getElementById('oracle-prophecy');
        if (inference.isStagnant || pathos.state === 'Frustrated') {
            const prophecy = this.oracle.findProphecy(this.currentRoomId, this.inventory);
            if (prophecy) {
                const prefix = pathos.state === 'Frustrated' ? '🛡️ <strong>Mercy Path:</strong> ' : '🔮 <strong>Prophecy:</strong> ';
                prophecyEl.innerHTML = `<div class="prophecy-glow"></div><div class="prophecy-content">${prefix}${prophecy.description}</div>`;
                prophecyEl.classList.add('visible');
            }
        } else {
            prophecyEl.classList.remove('visible');
        }

        // Oracle Aura: Dynamic background transition based on predicted future
        const prediction = this.oracle.predictNext(this.currentRoomId, this.getContextKey());
        const flux = this.oracle.getFluxInference();
        if (prediction && prediction.confidence > 0.4) {
            const currentRoom = rooms[this.currentRoomId];
            const targetRoom = rooms[prediction.predictedState];
            if (currentRoom && targetRoom) {
                const container = document.getElementById('game-container');

                // Flow State Aura: Faster transitions and larger glow
                if (flux.state === 'Flow') {
                    container.style.transition = 'background-color 0.4s ease-out, box-shadow 0.4s ease-out';
                    container.style.boxShadow = `0 10px 60px ${targetRoom.mood}AA`;
                } else {
                    container.style.transition = 'background-color 1.5s ease-out, box-shadow 1.5s ease-out';
                    container.style.boxShadow = `0 10px 30px ${targetRoom.mood}88`;
                }

                container.style.backgroundColor = targetRoom.mood || '#16161a';
            }
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

    updateFluxUI() {
        const flux = this.oracle.getFluxInference();
        const meter = document.querySelector('.flux-bar');
        const label = document.querySelector('.flux-label');
        const container = document.getElementById('game-container');

        if (meter && label) {
            meter.style.width = `${flux.score * 100}%`;
            label.innerText = `Flux: ${flux.state}`;

            if (flux.state === 'Flow') {
                meter.style.background = 'linear-gradient(90deg, #ff00ff, #00ffff)';
                container.classList.add('flow-active');
            } else if (flux.state === 'Chaos') {
                meter.style.background = '#ff4444';
                container.classList.remove('flow-active');
            } else {
                meter.style.background = '#00ffcc';
                container.classList.remove('flow-active');
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
            let logClass = 'log-standard';
            if (prediction.isCollective) logClass = 'log-collective';
            else if (prediction.isSpatial) logClass = 'log-spatial';
            else if (prediction.isIntuitive) logClass = 'log-intuitive';
            else if (prediction.isContextual) logClass = 'log-contextual';

            logEntry.className = logClass;
            if (prediction.isIntent) logEntry.style.color = '#ff00ff';
            logEntry.innerText = `> Predicted ${prediction.action} (${(prediction.confidence * 100).toFixed(0)}%) - ${prediction.reason}`;
            consoleEl.prepend(logEntry);

            // Highlight the predicted button
            const buttons = document.querySelectorAll('#controls button');
            buttons.forEach(btn => {
                const actionKey = `${btn.dataset.action}:${btn.dataset.target}`;
                if (actionKey === prediction.action) {
                    btn.classList.add('oracle-hint');
                    btn.classList.remove('oracle-collective', 'oracle-intuitive', 'oracle-spatial', 'synapse-lock', 'guidance-aura');

                    if (prediction.isGuidance) btn.classList.add('guidance-aura');
                    if (prediction.isIntent) btn.classList.add('synapse-lock');
                    else if (prediction.isCollective) btn.classList.add('oracle-collective');
                    else if (prediction.isSpatial) btn.classList.add('oracle-spatial');
                    else if (prediction.isIntuitive) btn.classList.add('oracle-intuitive');
                } else {
                    btn.classList.remove('oracle-hint', 'oracle-intuitive', 'oracle-collective', 'oracle-spatial', 'synapse-lock', 'guidance-aura');
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
            const label = prediction.isIntent ? 'Synapse' : (prediction.isGuidance ? 'Guidance' : (prediction.isCollective ? 'Collective Wisdom' : (prediction.isIntuitive ? 'Intuition' : 'Vision')));
            let html = `<div class="vision-next ${prediction.isCollective ? 'vision-collective' : ''} ${prediction.isIntent ? 'vision-synapse' : ''} ${prediction.isGuidance ? 'vision-guidance' : ''}"><span class="vision-label">${label}:</span> You sense ${targetRoom ? targetRoom.name : 'something'} ahead...</div>`;

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

        // Oracle Phantasm: Inject Ghost Links for high-confidence future actions
        const bestChain = this.oracle.predictBestChain(this.currentRoomId, this.inventory, 3, 0.9);
        if (bestChain && bestChain.length >= 2) {
            const phantasm = bestChain[bestChain.length - 1];
            const phantasmTarget = rooms[phantasm.predictedState];
            descriptionEl.innerHTML += `<p class="oracle-phantasm">A ghostly image of <a href="#" onclick="game.executeActionChain(${JSON.stringify(bestChain.map(c => c.action)).replace(/"/g, '&quot;')}); return false;">${phantasmTarget ? phantasmTarget.name : phantasm.action}</a> flickers in the distance...</p>`;
        }

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

                const targetRoom = rooms[targetState];
                if (targetRoom && targetRoom.mood) {
                    document.getElementById('game-container').style.backgroundColor = targetRoom.mood;
                }

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
