import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';

/**
 * Oracle Clotho Test Suite
 * Verifies teleological goal prediction and Golden Path projection.
 */

async function testClotho() {
    console.log("🧪 Testing Oracle Clotho...");
    const oracle = new Oracle();

    // 1. Test Goal Affinity Evolution
    console.log(" - Testing Goal Affinity evolution...");

    // Simulate 'Completion' goal
    oracle.updateGoalAffinity('take:scroll', { dwellTime: 3000 });
    oracle.updateGoalAffinity('take:shield', { dwellTime: 3000 });
    assert.strictEqual(oracle.getSessionGoal(), 'Completion', "Dominant goal should be Completion");

    // Reset and simulate 'Speed' goal
    oracle.goalAffinity = { completion: 0.33, exploration: 0.33, speed: 0.33 };
    oracle.updateGoalAffinity('move:north', { dwellTime: 500 });
    oracle.updateGoalAffinity('move:east', { dwellTime: 400 });
    oracle.updateGoalAffinity('move:west', { dwellTime: 300 });
    assert.strictEqual(oracle.getSessionGoal(), 'Speed', "Dominant goal should be Speed");

    // 2. Test Golden Path BFS
    console.log(" - Testing Golden Path BFS...");

    // Setup Oracle with knowledge of the world (minimal for BFS)
    // Goal: Completion. Current: entrance. Item is in library (North).
    const path = oracle.findGoldenPath('entrance', [], 'Completion');
    assert.ok(path, "Golden Path should be found");
    assert.strictEqual(path.action, 'take:scroll', "Next completion action should be to take the scroll");

    // Goal: Exploration. Current: entrance. library is unvisited.
    oracle.visitedRooms = new Set(['entrance']);
    const explorePath = oracle.findGoldenPath('entrance', [], 'Exploration');
    assert.ok(explorePath.action.startsWith('move:'), "Exploration action should be a move");

    // 3. Test Prediction Integration
    console.log(" - Testing Prediction Integration...");

    oracle.goalAffinity = { completion: 0.8, exploration: 0.1, speed: 0.1 };
    // Transitions must exist for the base layer to have something to boost
    oracle.transitions['entrance'] = { 'take:scroll': { count: 1, target: 'entrance', durations: [] } };
    const prediction = oracle.predictNext('entrance');

    assert.ok(prediction.isGolden, "Prediction should be marked as Golden Path");
    assert.ok(prediction.reason.includes("Clotho"), "Reason should mention Clotho");

    // 4. Test Meta-Learning integration
    console.log(" - Testing Sybil Meta-Learning for Clotho...");
    const oldWeight = oracle.layerWeights.clotho;
    oracle.runMetaLearning('entrance', null, 'take:scroll');
    assert.ok(oracle.layerWeights.clotho > oldWeight, "Clotho weight should increase on correct strategic prediction");

    console.log("✅ Oracle Clotho tests passed!");
}

testClotho().catch(err => {
    console.error("❌ Oracle Clotho tests failed!");
    console.error(err);
    process.exit(1);
});
