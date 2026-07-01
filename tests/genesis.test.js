import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';

// Mock window for CustomEvent
global.window = {
    dispatchEvent: () => {}
};
global.CustomEvent = class {};

function testOracleGenesis() {
    console.log("Testing Oracle Genesis (Zero-Shot Intuition)...");
    const oracle = new Oracle();

    // In a completely new room ('entrance' with no history)
    const prediction = oracle.predictNext('entrance');

    console.log("Genesis Prediction from Entrance:", prediction);

    // It should at least pick one of the available exits
    assert.ok(prediction.action.startsWith('move:'), "Should predict a move action");
    assert.ok(['move:north', 'move:east'].includes(prediction.action), "Should predict an available exit");
    assert.ok(prediction.confidence > 0, "Confidence should be > 0");

    console.log("✅ Oracle Genesis Test Passed!");
}

function testSpatialIntuition() {
    console.log("Testing Spatial Intuition...");
    const oracle = new Oracle();

    // User moves North from entrance to library
    oracle.recordTransition('entrance', 'move:north', 'library');

    // Oracle should now predict 'move:south' (back to entrance) due to spatial layer
    const prediction = oracle.predictNext('library');

    console.log("Spatial Prediction from Library:", prediction);

    assert.strictEqual(prediction.action, 'move:south', "Should predict 'move:south' as inverse of 'move:north'");
    assert.strictEqual(prediction.isSpatial, true, "Should be marked as spatial");

    console.log("✅ Spatial Intuition Test Passed!");
}

function testPhantasmChain() {
    console.log("Testing Phantasm Chain (Deep Genesis)...");
    const oracle = new Oracle();

    // Setup a predictable path: Entrance -> Library (take scroll) -> Observatory
    oracle.recordTransition('entrance', 'move:north', 'library');
    oracle.recordTransition('room:library|inv:empty', 'take:scroll', 'library');
    oracle.recordTransition('room:library|inv:scroll', 'move:east', 'observatory');

    // Repeat to build confidence
    oracle.recordTransition('entrance', 'move:north', 'library');
    oracle.recordTransition('room:library|inv:empty', 'take:scroll', 'library');
    oracle.recordTransition('room:library|inv:scroll', 'move:east', 'observatory');

    // From Entrance, predict best chain
    const chain = oracle.predictBestChain('entrance', [], 3, 0.5);

    console.log("Phantasm Chain from Entrance:", chain.map(c => c.action));

    assert.ok(chain.length >= 2, "Should find a chain");
    assert.strictEqual(chain[0].action, 'move:north');
    assert.strictEqual(chain[1].action, 'take:scroll');

    console.log("✅ Phantasm Chain Test Passed!");
}

try {
    testOracleGenesis();
    testSpatialIntuition();
    testPhantasmChain();
} catch (error) {
    console.error("❌ Test Failed!");
    console.error(error);
    process.exit(1);
}
