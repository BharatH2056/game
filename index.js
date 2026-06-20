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
    }

    setupOracleListeners() {
        window.addEventListener('oracle:prefetch', (e) => {
            const prediction = e.detail;
            const statusEl = document.querySelector('#oracle-status span');
            const consoleEl = document.getElementById('prediction-list');

            statusEl.innerText = prediction.confidence > 0.8 ? 'Seeing Future' : 'Predicting';

            const logEntry = document.createElement('div');
            logEntry.className = prediction.isContextual ? 'log-contextual' : '';
            logEntry.innerText = `> Predicted ${prediction.action} (${(prediction.confidence * 100).toFixed(0)}%) - ${prediction.reason}`;
            consoleEl.prepend(logEntry);

            // Highlight the predicted button
            const buttons = document.querySelectorAll('#controls button');
            buttons.forEach(btn => {
                const actionKey = `${btn.dataset.action}:${btn.dataset.target}`;
                if (actionKey === prediction.action) {
                    btn.classList.add('oracle-hint');
                } else {
                    btn.classList.remove('oracle-hint');
                }
            });

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
            visionEl.innerHTML = `<span class="vision-label">Vision:</span> You sense ${targetRoom ? targetRoom.name : 'something'} ahead...`;
            visionEl.style.opacity = prediction.confidence;
        } else {
            visionEl.innerHTML = '';
        }
    }

    getContextKey() {
        const sortedInv = [...this.inventory].sort().join(',');
        return `room:${this.currentRoomId}|inv:${sortedInv || 'empty'}`;
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
            this.oracle.recordTransition(previousRoomId, actionKey, nextRoomId, { dwellTime });
            this.oracle.recordTransition(previousContext, actionKey, nextRoomId, { dwellTime });

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

            this.oracle.recordTransition(previousRoomId, actionKey, previousRoomId, { dwellTime });
            this.oracle.recordTransition(previousContext, actionKey, previousRoomId, { dwellTime });

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
        Object.keys(room.exits).forEach(dir => {
            const btn = document.createElement('button');
            btn.innerText = `Go ${dir}`;
            btn.onclick = () => this.move(dir);
            btn.dataset.action = 'move';
            btn.dataset.target = dir;
            controlsEl.appendChild(btn);
        });

        room.items.forEach(item => {
            const btn = document.createElement('button');
            btn.innerText = `Take ${item}`;
            btn.onclick = () => this.take(item);
            btn.dataset.action = 'take';
            btn.dataset.target = item;
            controlsEl.appendChild(btn);
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
            document.querySelector('#oracle-status span').innerText = 'Learning...';
            this.updateVision(null);
        }
    }
}

window.game = new Game();
