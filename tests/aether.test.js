import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';

// Mock window and requestAnimationFrame
global.window = {
    dispatchEvent: () => {}
};
global.CustomEvent = class {};
global.requestAnimationFrame = (callback) => setTimeout(callback, 16);

function testRecencyBoost() {
    console.log("Testing Recency Boost...");
    const oracle = new Oracle();

    // Setup base pattern: A -> B is common (5 times)
    for (let i = 0; i < 5; i++) {
        oracle.recordTransition('A', 'move:east', 'B');
    }

    // Now user suddenly starts going to C (2 times)
    oracle.recordTransition('A', 'move:north', 'C');
    oracle.recordTransition('A', 'move:north', 'C');

    // Without recency boost, move:east (count 5) would win over move:north (count 2).
    // With recency boost (3x boost for last 10 actions), move:north gets +6.
    // move:east weight = 5. move:north weight = 2 + 6 = 8.

    const prediction = oracle.predictNext('A');
    console.log("Prediction after recency shift:", prediction.action, `(${(prediction.confidence * 100).toFixed(0)}%)`);

    assert.strictEqual(prediction.action, 'move:north', "Recency should shift prediction to the most recent behavior");
    console.log("✅ Recency Boost Test Passed!");
}

function testTemporalInference() {
    console.log("Testing Temporal Inference...");
    const oracle = new Oracle();

    // Teach the oracle that A -> B takes 2000ms
    oracle.recordTransition('A', 'move:east', 'B', { dwellTime: 2000 });
    oracle.recordTransition('A', 'move:east', 'B', { dwellTime: 2000 });

    // Test perfect resonance
    const perfect = oracle.getTemporalInference('A', null, 2000);
    assert.strictEqual(perfect.resonance, 1.0, "Perfect resonance should be 1.0");

    // Test resonance drop
    const divergent = oracle.getTemporalInference('A', null, 3500);
    assert.ok(divergent.resonance < 0.6, "Resonance should drop as dwell time diverges");

    // Test stagnation
    // Stagnant if dwellTime > 2.5 * 2000 (5000) AND dwellTime > 7000
    const active = oracle.getTemporalInference('A', null, 6000);
    assert.strictEqual(active.isStagnant, false, "Should not be stagnant yet");

    const stagnant = oracle.getTemporalInference('A', null, 8000);
    assert.strictEqual(stagnant.isStagnant, true, "Should detect stagnation after 8s");

    console.log("✅ Temporal Inference Test Passed!");
}

function testBehavioralProfiling() {
    console.log("Testing Behavioral Profiling...");
    const oracle = new Oracle();

    assert.strictEqual(oracle.getBehavioralProfile(), "Learning Patterns");

    // Discovery: Visiting many unique rooms
    oracle.recordTransition('A', 'move:1', 'B');
    oracle.recordTransition('B', 'move:2', 'C');
    oracle.recordTransition('C', 'move:3', 'D');
    oracle.recordTransition('D', 'move:4', 'E');
    oracle.recordTransition('E', 'move:5', 'F');
    assert.strictEqual(oracle.getBehavioralProfile(), "Discovery Mode");

    // Routine: Stuck in a loop or repeating same rooms
    const oracle2 = new Oracle();
    for(let i=0; i<10; i++) {
        oracle2.recordTransition('A', 'move:east', 'B');
        oracle2.recordTransition('B', 'move:west', 'A');
    }
    assert.strictEqual(oracle2.getBehavioralProfile(), "Routine Flow");

    console.log("✅ Behavioral Profiling Test Passed!");
}

try {
    testRecencyBoost();
    testTemporalInference();
    testBehavioralProfiling();
} catch (error) {
    console.error("❌ Aether Test Failed!");
    console.error(error);
    process.exit(1);
}
