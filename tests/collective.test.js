import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';

// Mock window for CustomEvent
global.window = {
    dispatchEvent: () => {}
};
global.CustomEvent = class {};

function testCollectiveWisdom() {
    console.log("Testing Collective Wisdom...");
    const oracle = new Oracle();

    // Setup: User has high haste, making them a Speedrunner
    oracle.traits.haste = 0.9;
    assert.strictEqual(oracle.getArchetype(), "The Speedrunner");

    // Scenario: At the entrance.
    // In src/echoes.js, Speedrunners have a weight of 10 for 'move:north' at 'entrance'.

    // Even without local history, the Oracle should use collective wisdom
    const prediction = oracle.predictNext('entrance');

    console.log("Collective Prediction:", prediction);

    assert.strictEqual(prediction.action, 'move:north', "Should predict 'move:north' from collective echoes");
    assert.strictEqual(prediction.isCollective, true, "Should be marked as collective");
    assert.ok(prediction.reason.includes("Collective wisdom"), "Reason should mention collective wisdom");

    console.log("✅ Collective Wisdom Test Passed!");
}

function testArchetypePriority() {
    console.log("Testing Archetype Priority...");
    const oracle = new Oracle();

    // Setup: User is a Collector
    oracle.traits.acquisitiveness = 0.9;

    // In 'library', Collective wisdom for Collector says 'take:scroll' (weight 20 * 2 = 40)
    // Local history says 'move:east' (recorded once, weight 1)
    oracle.recordTransition('library', 'move:east', 'observatory');

    const prediction = oracle.predictNext('library');
    console.log("Priority Prediction:", prediction);

    assert.strictEqual(prediction.action, 'take:scroll', "Collective wisdom should outweigh minor local history");
    assert.strictEqual(prediction.isCollective, true);

    console.log("✅ Archetype Priority Test Passed!");
}

try {
    testCollectiveWisdom();
    testArchetypePriority();
} catch (error) {
    console.error("❌ Test Failed!");
    console.error(error);
    process.exit(1);
}
