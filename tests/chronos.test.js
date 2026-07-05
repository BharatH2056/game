import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';

// Mock window for CustomEvent
global.window = {
    dispatchEvent: () => {}
};
global.CustomEvent = class {};

function testContextAwareSimulation() {
    console.log("Testing Context-Aware Simulation (Chronos Engine)...");
    const oracle = new Oracle();

    // Sequence:
    // 1. In Room A, take 'key'.
    // 2. With 'key' in inventory, move to Room B.
    // 3. In Room B, move to Room C.

    const contextA = Oracle.formatContext('A', []);
    oracle.recordTransition(contextA, 'take:key', 'A');

    const contextAWithKey = Oracle.formatContext('A', ['key']);
    oracle.recordTransition(contextAWithKey, 'move:east', 'B');

    const contextBWithKey = Oracle.formatContext('B', ['key']);
    oracle.recordTransition(contextBWithKey, 'move:north', 'C');

    // Without context simulation, predictSequence('A') might fail or just see 'take:key'
    const sequence = oracle.predictSequence('A', [], 3);

    console.log("Predicted sequence from A (empty inventory):", sequence.map(s => s.action));

    assert.strictEqual(sequence.length, 3, "Should predict 3 steps ahead");
    assert.strictEqual(sequence[0].action, 'take:key');
    assert.strictEqual(sequence[1].action, 'move:east');
    assert.strictEqual(sequence[2].action, 'move:north');

    console.log("✅ Context-Aware Simulation Test Passed!");
}

function testActionChaining() {
    console.log("Testing Action Chaining...");
    const oracle = new Oracle();

    const contextA = Oracle.formatContext('A', []);
    for(let i=0; i<5; i++) {
        oracle.recordTransition(contextA, 'take:key', 'A');
        oracle.recordTransition(Oracle.formatContext('A', ['key']), 'move:east', 'B');
        oracle.recordTransition(Oracle.formatContext('B', ['key']), 'move:north', 'C');
    }

    const chain = oracle.predictBestChain('A', []);

    assert.ok(chain, "Should find a valid chain");
    assert.strictEqual(chain.length, 3);
    assert.strictEqual(chain[0].action, 'take:key');
    assert.strictEqual(chain[1].action, 'move:east');
    assert.strictEqual(chain[2].action, 'move:north');

    console.log("✅ Action Chaining Test Passed!");
}

try {
    testContextAwareSimulation();
    testActionChaining();
} catch (error) {
    console.error("❌ Chronos Test Failed!");
    console.error(error);
    process.exit(1);
}
