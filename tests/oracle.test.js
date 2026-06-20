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

    assert.strictEqual(prediction.action, 'move:east', "Should predict 'move:east' as it happened 2/3 times");
    assert.strictEqual(prediction.predictedState, 'B', "Should predict state 'B'");
    // Weight for room-only is counts. 2 / 3 = 0.666...
    assert.ok(Math.abs(prediction.confidence - 0.666) < 0.01, "Confidence should be ~0.666");

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

    // Weight math:
    // Room options: move:east (count 2, weight 2)
    // Context options: move:north (count 1, weight 5)
    // Total weight: 7. Confidence: 5/7 = 0.714
    assert.ok(Math.abs(prediction.confidence - 0.714) < 0.01);

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

try {
    testOraclePrediction();
    testContextualPrediction();
    testDwellTimeTracking();
} catch (error) {
    console.error("❌ Test Failed!");
    console.error(error);
    process.exit(1);
}
