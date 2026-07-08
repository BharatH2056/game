import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';

/**
 * Oracle Mnemosyne Test Suite
 * Verifies episodic consolidation and long-term memory rituals.
 */

async function testMnemosyne() {
    console.log("🧪 Testing Oracle Mnemosyne...");
    const oracle = new Oracle();

    // 1. Test Consolidation
    console.log(" - Testing Consolidation logic...");

    // Simulate a ritual: User always goes North -> East -> Take scroll
    // We need to fill history to trigger consolidation (threshold is 100 entries in recordTransition, but consolidate() checks for 20)
    // However, recordTransition only calls consolidate when history.length > 100.

    for (let i = 0; i < 35; i++) {
        oracle.recordTransition('entrance', 'move:north', 'library');
        oracle.recordTransition('library', 'move:east', 'observatory');
        oracle.recordTransition('observatory', 'move:west', 'library');
    }

    // Manually trigger consolidation as if we hit the 100 limit
    oracle.consolidate();

    assert.ok(Object.keys(oracle.ltm).length > 0, "LTM should not be empty after consolidation");
    assert.ok(oracle.ltm['entrance']['move:north|move:east'], "Ritual sequence should be captured");
    assert.ok(oracle.ltm['entrance']['move:north|move:east'].count >= 30, "Ritual count should be high");

    // 2. Test Mnemosyne Prediction Layer
    console.log(" - Testing Mnemosyne prediction layer...");

    // Clear transitions to see if LTM can drive the prediction
    oracle.transitions = {};
    const prediction = oracle.predictNext('entrance');

    assert.strictEqual(prediction.action, 'move:north', "Mnemosyne should predict the first step of a ritual");
    assert.strictEqual(prediction.isMacro, true, "Prediction should be marked as a macro");
    assert.ok(prediction.reason.includes("Mnemosyne") || prediction.reason.includes("Janus"), "Reason should mention Mnemosyne");

    // 3. Test Synaptic Decay
    console.log(" - Testing Synaptic Decay...");

    // Add some noise. We'll add it manually to avoid triggering automatic consolidation/decay if history is full
    if (!oracle.transitions['entrance']) oracle.transitions['entrance'] = {};
    oracle.transitions['entrance']['move:east'] = { count: 1, durations: [], target: 'armory' };

    assert.ok(oracle.transitions['entrance']['move:east'], "Noise transition should exist before decay");

    // Trigger decay
    oracle.decayTransitions();

    // Since count is 1 (< 1.1), it should be pruned
    assert.ok(!oracle.transitions['entrance'] || !oracle.transitions['entrance']['move:east'], "Weak noise transition should be pruned by decay");

    // 4. Test Meta-Learning integration
    console.log(" - Testing Sybil Meta-Learning for Mnemosyne...");
    const oldWeight = oracle.layerWeights.mnemosyne;
    oracle.runMetaLearning('entrance', null, 'move:north');
    assert.ok(oracle.layerWeights.mnemosyne > oldWeight, "Mnemosyne weight should increase on correct macro prediction");

    console.log("✅ Oracle Mnemosyne tests passed!");
}

testMnemosyne().catch(err => {
    console.error("❌ Oracle Mnemosyne tests failed!");
    console.error(err);
    process.exit(1);
});
