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
    assert.strictEqual(prediction.confidence, 2/3, "Confidence should be 0.666...");

    console.log("✅ Oracle Prediction Test Passed!");
}

function testLearningNewPatterns() {
    console.log("Testing Learning New Patterns...");
    const oracle = new Oracle();

    oracle.recordTransition('A', 'move:east', 'B');
    oracle.recordTransition('B', 'move:west', 'A');

    let prediction = oracle.predictNext('A');
    assert.strictEqual(prediction.action, 'move:east');

    // Change pattern: A -> C multiple times
    oracle.recordTransition('A', 'move:north', 'C');
    oracle.recordTransition('C', 'move:south', 'A');
    oracle.recordTransition('A', 'move:north', 'C');
    oracle.recordTransition('C', 'move:south', 'A');

    prediction = oracle.predictNext('A');
    console.log("New Prediction from A:", prediction);

    assert.strictEqual(prediction.action, 'move:north', "Should adapt to new pattern");
    assert.strictEqual(prediction.confidence, 2/3);

    console.log("✅ Learning New Patterns Test Passed!");
}

try {
    testOraclePrediction();
    testLearningNewPatterns();
} catch (error) {
    console.error("❌ Test Failed!");
    console.error(error);
    process.exit(1);
}
