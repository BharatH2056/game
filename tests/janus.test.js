import { Oracle } from '../src/oracle.js';
import { rooms } from '../src/data.js';
import assert from 'node:assert';

// Mock window for CustomEvent
global.window = {
    dispatchEvent: () => {}
};
global.CustomEvent = class {};

// Add custom rooms with distinct moods for testing
rooms['red_room'] = { name: 'Red Room', mood: '#ff0000', exits: { 'east': 'blue_room' }, items: [] };
rooms['blue_room'] = { name: 'Blue Room', mood: '#0000ff', exits: { 'west': 'red_room' }, items: [] };
rooms['maroon_room'] = { name: 'Maroon Room', mood: '#800000', exits: { 'south': 'red_room' }, items: [] };

function testAestheticLearning() {
    console.log("Testing Oracle Janus: Aesthetic Learning...");
    const oracle = new Oracle();

    // Initial preference is grey (128, 128, 128)
    assert.ok(oracle.aestheticPreference.r === 128);

    // Visit red rooms repeatedly
    for(let i = 0; i < 5; i++) {
        oracle.updateAestheticPreference('red_room');
    }

    // Preference should shift toward red (255, 0, 0)
    console.log("Evolved Preference:", oracle.aestheticPreference);
    assert.ok(oracle.aestheticPreference.r > 200, "Red component should have increased");
    assert.ok(oracle.aestheticPreference.b < 100, "Blue component should have decreased");

    console.log("✅ Aesthetic Learning Test Passed!");
}

function testJanusPredictionBoost() {
    console.log("Testing Oracle Janus: Prediction Boost...");
    const oracle = new Oracle();

    // Set preference strongly to red
    oracle.aestheticPreference = { r: 255, g: 0, b: 0 };

    // In a neutral room with two exits: one to blue, one to maroon (which is closer to red)
    rooms['start'] = {
        name: 'Start',
        mood: '#888888',
        exits: { 'north': 'blue_room', 'south': 'maroon_room' },
        items: []
    };
    rooms['blue_room'].items = [];
    rooms['blue_room'].exits = {};
    rooms['maroon_room'].items = [];
    rooms['maroon_room'].exits = {};

    const prediction = oracle.predictNext('start');

    console.log("Prediction with Red preference:", prediction.action, "Reason:", prediction.reason);

    assert.strictEqual(prediction.action, 'move:south', "Should prefer the maroon room");
    assert.ok(prediction.isJanus, "Should be flagged as a Janus prediction");
    assert.ok(prediction.reason.includes('Janus'), "Reason should mention Janus");

    console.log("✅ Janus Prediction Boost Test Passed!");
}

function testMetaLearningJanus() {
    console.log("Testing Oracle Janus: Meta-Learning...");
    const oracle = new Oracle();
    const initialWeight = oracle.layerWeights.janus;

    // Set preference to blue
    oracle.aestheticPreference = { r: 0, g: 0, b: 255 };

    // Room A has exit to blue_room
    rooms['room_a'] = {
        name: 'Room A',
        mood: '#ffffff',
        exits: { 'east': 'blue_room' },
        items: []
    };

    // User takes the 'east' action which leads to blue_room (matching preference)
    // We need a transition recorded so runMetaLearning knows the target
    oracle.transitions['room_a'] = { 'move:east': { target: 'blue_room', count: 1, durations: [] } };
    rooms['room_a'] = { name: 'Room A', mood: '#ffffff', exits: { 'east': 'blue_room' }, items: [] };
    rooms['blue_room'] = { name: 'Blue Room', mood: '#0000ff', exits: {}, items: [] };

    oracle.runMetaLearning('room_a', null, 'move:east');

    assert.ok(oracle.layerWeights.janus > initialWeight, "Janus weight should increase when it predicts correctly");
    console.log("Janus weight evolved:", initialWeight, "->", oracle.layerWeights.janus);

    console.log("✅ Meta-Learning Janus Test Passed!");
}

try {
    testAestheticLearning();
    testJanusPredictionBoost();
    testMetaLearningJanus();
} catch (error) {
    console.error("❌ Janus Test Failed!");
    console.error(error);
    process.exit(1);
}
