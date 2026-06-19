import { rooms } from './src/data.js';
import { Oracle } from './src/oracle.js';

class Game {
    constructor() {
        this.currentRoomId = 'entrance';
        this.inventory = [];
        this.oracle = new Oracle();
        this.setupOracleListeners();
        this.render();
    }

    setupOracleListeners() {
        window.addEventListener('oracle:prefetch', (e) => {
            const prediction = e.detail;
            const statusEl = document.querySelector('#oracle-status span');
            const consoleEl = document.getElementById('prediction-list');

            statusEl.innerText = 'Active (Predicting)';

            const logEntry = document.createElement('div');
            logEntry.innerText = `> Predicted ${prediction.action} -> ${prediction.predictedState} (${(prediction.confidence * 100).toFixed(0)}%)`;
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
        });
    }

    move(direction) {
        const previousRoomId = this.currentRoomId;
        const room = rooms[this.currentRoomId];
        const nextRoomId = room.exits[direction];

        if (nextRoomId) {
            const actionKey = `move:${direction}`;
            this.oracle.recordTransition(previousRoomId, actionKey, nextRoomId);

            this.currentRoomId = nextRoomId;
            this.render();
        }
    }

    take(item) {
        const previousRoomId = this.currentRoomId;
        const room = rooms[this.currentRoomId];
        const itemIndex = room.items.indexOf(item);

        if (itemIndex > -1) {
            const actionKey = `take:${item}`;
            // When taking an item, the room doesn't change, but the state does.
            // We'll record it as a transition to the same room (but item removed).
            this.oracle.recordTransition(previousRoomId, actionKey, previousRoomId);

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
        const prediction = this.oracle.predictNext(this.currentRoomId);
        if (prediction) {
            this.oracle.prefetch(prediction);
        } else {
            document.querySelector('#oracle-status span').innerText = 'Learning...';
        }
    }
}

window.game = new Game();
