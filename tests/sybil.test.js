import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';
import { rooms } from '../src/data.js';

// Mock window for CustomEvent
global.window = {
    dispatchEvent: () => {}
};
global.CustomEvent = class {};

function testOracleSybilMetaLearning() {
    console.log("Testing Oracle Sybil Meta-Learning...");
    const oracle = new Oracle();

    // Initial weights
    const initialContextWeight = oracle.layerWeights.context;

    // Scenario: User follows a specific pattern that 'context' (inventory) predicts
    // Let's assume Room A -> move:east -> Room B is a common pattern.
    // But with Item X, user always goes Room C.

    const context = 'room:A|inv:X';

    // Train the context
    oracle.recordTransition(context, 'move:north', 'C', { fullContext: context });
    oracle.recordTransition(context, 'move:north', 'C', { fullContext: context });

    // Now trigger a transition in Room A while having item X
    // Sybil should see that 'context' layer would have been correct and boost it.
    oracle.recordTransition('A', 'move:north', 'C', { fullContext: context });

    console.log("Layer Weights after correct context prediction:", oracle.layerWeights);

    assert.ok(oracle.layerWeights.context > initialContextWeight, "Context weight should increase");

    // Scenario: User deviates from context
    const currentWeight = oracle.layerWeights.context;
    oracle.recordTransition('A', 'move:east', 'B', { fullContext: context });

    console.log("Layer Weights after incorrect context prediction:", oracle.layerWeights);
    assert.ok(oracle.layerWeights.context < currentWeight, "Context weight should decrease after incorrect prediction");

    console.log("✅ Oracle Sybil Test Passed!");
}

function testOracleProphecy() {
    console.log("Testing Oracle Prophecy...");
    const oracle = new Oracle();

    // Scenario: User is in the entrance, 'library' has a 'scroll'.
    // findProphecy should find it.

    const prophecy = oracle.findProphecy('entrance', []);
    console.log("Prophecy from Entrance:", prophecy);

    assert.ok(prophecy !== null, "Should find a prophecy");
    assert.strictEqual(prophecy.type, 'discovery', "First prophecy should be discovery if no items in immediate room");

    // If user is in Library and scroll is there
    const prophecyLib = oracle.findProphecy('library', []);
    console.log("Prophecy from Library:", prophecyLib);
    assert.strictEqual(prophecyLib.type, 'item');
    assert.strictEqual(prophecyLib.goal, 'scroll');

    console.log("✅ Oracle Prophecy Test Passed!");
}

try {
    testOracleSybilMetaLearning();
    testOracleProphecy();
} catch (error) {
    console.error("❌ Test Failed!");
    console.error(error);
    process.exit(1);
}
