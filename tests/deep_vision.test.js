import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';

// Mock localStorage
const storage = {};
global.localStorage = {
    setItem: (key, val) => { storage[key] = val },
    getItem: (key) => storage[key] || null
};

// Mock window for CustomEvent
global.window = {
    dispatchEvent: () => {}
};
global.CustomEvent = class {};

function testPersistence() {
    console.log("Testing Oracle Persistence...");
    const oracle1 = new Oracle();

    oracle1.recordTransition('A', 'move:east', 'B');
    assert.ok(storage['oracle_transitions'], "Data should be in storage");

    const oracle2 = new Oracle();
    const prediction = oracle2.predictNext('A');
    assert.strictEqual(prediction.action, 'move:east', "Should have loaded transitions from storage");

    console.log("✅ Persistence Test Passed!");
}

function testDeepVision() {
    console.log("Testing Deep Vision (Sequence Prediction)...");
    const oracle = new Oracle();

    // Path: A -> B -> C
    oracle.recordTransition('A', 'move:east', 'B');
    oracle.recordTransition('A', 'move:east', 'B');
    oracle.recordTransition('B', 'move:north', 'C');
    oracle.recordTransition('B', 'move:north', 'C');

    const sequence = oracle.predictSequence('A', 2);

    console.log("Predicted Sequence from A:", sequence.map(p => p.predictedState));

    assert.strictEqual(sequence.length, 2, "Should predict 2 steps");
    assert.strictEqual(sequence[0].predictedState, 'B');
    assert.strictEqual(sequence[1].predictedState, 'C');

    console.log("✅ Deep Vision Test Passed!");
}

try {
    testPersistence();
    testDeepVision();
} catch (error) {
    console.error("❌ Test Failed!");
    console.error(error);
    process.exit(1);
}
