import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';

// Mock window for CustomEvent
global.window = {
    dispatchEvent: () => {}
};
global.CustomEvent = class {};

function testOraclePrediction() {
    console.log("Testing Oracle Prediction...");
    const oracle = new Oracle();

    // Sequence: A -> B, A -> B, A -> C
    oracle.recordTransition('A', 'move:east', 'B');
    oracle.recordTransition('B', 'move:west', 'A');
    oracle.recordTransition('A', 'move:east', 'B');
    oracle.recordTransition('B', 'move:west', 'A');
    oracle.recordTransition('A', 'move:north', 'C');

    const prediction = oracle.predictNext('A');

    console.log("Prediction from A:", prediction);

    assert.strictEqual(prediction.action, 'move:north', "Should predict 'move:north' due to Recency Boost overriding frequency");
    assert.strictEqual(prediction.predictedState, 'C', "Should predict state 'C'");

    console.log("✅ Oracle Prediction Test Passed!");
}

function testContextualPrediction() {
    console.log("Testing Contextual Prediction...");
    const oracle = new Oracle();

    // In Room A, people usually go B.
    oracle.recordTransition('A', 'move:east', 'B');
    oracle.recordTransition('A', 'move:east', 'B');

    // BUT, users with a 'scroll' always go C.
    oracle.recordTransition('room:A|inv:scroll', 'move:north', 'C');

    // Case 1: No context provided, should predict B
    let prediction = oracle.predictNext('A');
    assert.strictEqual(prediction.action, 'move:east');

    // Case 2: Context provided, should predict C because context weight (5x) beats room frequency (1x)
    prediction = oracle.predictNext('A', 'room:A|inv:scroll');
    console.log("Contextual Prediction:", prediction);
    assert.strictEqual(prediction.action, 'move:north', "Contextual prediction should override");
    assert.strictEqual(prediction.isContextual, true);

    // Weight math includes Recency Boost now.
    assert.ok(prediction.confidence > 0.55);

    console.log("✅ Contextual Prediction Test Passed!");
}

function testDwellTimeTracking() {
    console.log("Testing Dwell Time Tracking...");
    const oracle = new Oracle();

    oracle.recordTransition('A', 'move:east', 'B', { dwellTime: 1000 });
    oracle.recordTransition('A', 'move:east', 'B', { dwellTime: 2000 });

    const prediction = oracle.predictNext('A');
    assert.strictEqual(prediction.expectedDwellTime, 1500);

    console.log("✅ Dwell Time Tracking Test Passed!");
}

function testSynapseIntent() {
    console.log("Testing Synapse Intent...");
    const oracle = new Oracle();

    // In Room A, people usually go B.
    oracle.recordTransition('A', 'move:east', 'B');
    oracle.recordTransition('A', 'move:east', 'B');

    // Case 1: No intent, should predict B
    let prediction = oracle.predictNext('A');
    assert.strictEqual(prediction.action, 'move:east');

    // Case 2: Intent set to C (even if never seen before, Genesis layer should provide it if it's in the data)
    // For this test, we need to mock the room data or use one from data.js
    // Let's use 'entrance' from data.js which has 'north' -> 'library' and 'east' -> 'armory'

    // People usually go east
    oracle.recordTransition('entrance', 'move:east', 'armory');
    oracle.recordTransition('entrance', 'move:east', 'armory');

    prediction = oracle.predictNext('entrance');
    assert.strictEqual(prediction.action, 'move:east');

    // Set intent to 'move:north'
    oracle.setIntent('move:north', 10.0);
    prediction = oracle.predictNext('entrance');

    console.log("Synapse Prediction:", prediction);
    assert.strictEqual(prediction.action, 'move:north', "Synapse intent should override frequency");
    assert.strictEqual(prediction.isIntent, true);
    assert.ok(prediction.confidence > 0.5);

    console.log("✅ Synapse Intent Test Passed!");
}

try {
    testOraclePrediction();
    testContextualPrediction();
    testDwellTimeTracking();
    testSynapseIntent();
} catch (error) {
    console.error("❌ Test Failed!");
    console.error(error);
    process.exit(1);
}
