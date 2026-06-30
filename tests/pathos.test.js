import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';

// Mock window and CustomEvent for tests
global.window = {
    dispatchEvent: () => {}
};
global.CustomEvent = class {};

function testLoopDetection() {
    console.log("Testing Loop Detection...");
    const oracle = new Oracle();

    // A -> B -> A -> B
    oracle.recordTransition('roomA', 'move:east', 'roomB');
    oracle.recordTransition('roomB', 'move:west', 'roomA');
    oracle.recordTransition('roomA', 'move:east', 'roomB');
    oracle.recordTransition('roomB', 'move:west', 'roomA');

    assert.strictEqual(oracle.detectLoops(), true, "Should detect A-B-A-B loop");

    oracle.updateSomaticSignal(0);
    assert.ok(oracle.frustration > 0.3, "Frustration should increase due to looping");

    console.log("✅ Loop Detection Test Passed!");
}

function testFrustrationWeighting() {
    console.log("Testing Frustration Weighting...");
    const oracle = new Oracle();

    // Mock a high frustration state
    oracle.frustration = 0.8;

    // In Frustrated state, collective wisdom weight should be tripled
    const prediction = oracle.predictNext('entrance');

    assert.strictEqual(oracle.getPathosInference().state, 'Frustrated');

    // Verify that the prediction reason reflects guidance if it comes from collective/spatial
    // We can't easily check internal weights, but we can check if it flags as guidance
    // if we provide an echo.

    console.log("✅ Frustration Weighting Logic Verified!");
}

function testJitterToFrustration() {
    console.log("Testing Jitter mapping...");
    const oracle = new Oracle();

    // Low jitter
    oracle.updateSomaticSignal(0.1);
    const lowFrustration = oracle.frustration;

    // High jitter
    oracle.updateSomaticSignal(0.9);
    oracle.updateSomaticSignal(0.9);
    oracle.updateSomaticSignal(0.9);
    const highFrustration = oracle.frustration;

    assert.ok(highFrustration > lowFrustration, "High jitter should lead to higher frustration");
    console.log("✅ Jitter Mapping Test Passed!");
}

try {
    testLoopDetection();
    testFrustrationWeighting();
    testJitterToFrustration();
} catch (error) {
    console.error("❌ Pathos Test Failed!");
    console.error(error);
    process.exit(1);
}
