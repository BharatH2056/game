import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';

// Mock window for CustomEvent
global.window = {
    dispatchEvent: () => {}
};
global.CustomEvent = class {};

function testArchetypeIntuition() {
    console.log("Testing Archetype Intuition...");
    const oracle = new Oracle();

    // Setup: User has high acquisitiveness
    oracle.recordTransition('entrance', 'take:key', 'entrance');
    oracle.recordTransition('entrance', 'take:gold', 'entrance');

    assert.ok(oracle.traits.acquisitiveness > 0.5, "Acquisitiveness should have increased");

    // Scenario: In a new room 'treasury', there are two options:
    // 1. move:north (Commonly done by others, recorded once)
    // 2. take:crown (Never done before in this specific state, but matches acquisitiveness)

    // We simulate 'learning' from others by manually adding to transitions
    oracle.transitions['treasury'] = {
        'move:north': { target: 'hallway', count: 1, durations: [] },
        'take:crown': { target: 'treasury', count: 0.1, durations: [] } // Very low count
    };

    const prediction = oracle.predictNext('treasury');
    console.log("Intuitive Prediction:", prediction);

    assert.strictEqual(prediction.action, 'take:crown', "Should predict 'take:crown' due to trait boost");
    assert.strictEqual(prediction.isIntuitive, true);
    assert.ok(prediction.reason.includes("Intuition"), "Reason should mention intuition");

    console.log("✅ Archetype Intuition Test Passed!");
}

function testCuriosityBoost() {
    console.log("Testing Curiosity Boost...");
    const oracle = new Oracle();

    // Setup: User is curious
    oracle.recordTransition('room1', 'move:east', 'room2'); // room2 is new
    oracle.recordTransition('room2', 'move:east', 'room3'); // room3 is new

    assert.ok(oracle.traits.curiosity > 0.5);

    // In room3:
    // Option A: move:west (back to known room2) - 5 counts
    // Option B: move:north (to unknown room4) - 1 count
    oracle.transitions['room3'] = {
        'move:west': { target: 'room2', count: 5, durations: [] },
        'move:north': { target: 'room4', count: 1, durations: [] }
    };
    // Make sure room4 is not visited
    oracle.visitedRooms.delete('room4');

    const prediction = oracle.predictNext('room3');
    console.log("Curiosity Prediction:", prediction);

    assert.strictEqual(prediction.action, 'move:north', "Should prefer the new room due to curiosity");
    assert.strictEqual(prediction.isIntuitive, true);

    console.log("✅ Curiosity Boost Test Passed!");
}

try {
    testArchetypeIntuition();
    testCuriosityBoost();
} catch (error) {
    console.error("❌ Test Failed!");
    console.error(error);
    process.exit(1);
}
