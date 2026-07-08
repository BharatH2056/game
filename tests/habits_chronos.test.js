import { Oracle } from '../src/oracle.js';
import assert from 'node:assert';

// Mock localStorage
global.localStorage = {
    getItem: () => null,
    setItem: () => null
};

async function testHabits() {
    console.log('Testing Oracle Mnemosyne: Kinetic Habits...');
    const oracle = new Oracle();

    // Record a habit: move north twice
    oracle.recordTransition('room1', 'move:north', 'room2', { dwellTime: 1000 });
    oracle.recordTransition('room2', 'move:north', 'room3', { dwellTime: 1000 });

    // Repeat to trigger consolidation
    for (let i = 0; i < 20; i++) {
        oracle.recordTransition('room1', 'move:north', 'room2', { dwellTime: 1000 });
        oracle.recordTransition('room2', 'move:north', 'room3', { dwellTime: 1000 });
    }

    oracle.consolidate();
    assert.ok(oracle.habits['move:north|move:north'], 'Should have consolidated the kinetic habit');

    // Test prediction based on habit
    oracle.history = [{ fromState: 'anywhere', action: 'move:north', toState: 'somewhere' }];
    const prediction = oracle.predictNext('somewhere');
    assert.strictEqual(prediction.action, 'move:north', 'Should predict next action in the habit chain');
    assert.ok(prediction.isHabit, 'Should be flagged as a habit prediction');
    console.log('✓ Habit testing passed');
}

async function testChronos() {
    console.log('Testing Oracle Chronos: Chronometric Gating...');
    const oracle = new Oracle();

    // Train a transition with specific timing
    for (let i = 0; i < 10; i++) {
        oracle.recordTransition('entrance', 'move:north', 'library', { dwellTime: 2000 });
    }

    // Prediction at the expected time (2000ms)
    const pOnTime = oracle.predictNext('entrance', null, 2000);
    const matchOnTime = pOnTime.temporalMatch;

    // Prediction far from the expected time (5000ms)
    const pOffTime = oracle.predictNext('entrance', null, 5000);
    const matchOffTime = pOffTime.temporalMatch;

    assert.ok(matchOnTime > matchOffTime, 'Temporal match should be higher when on time');
    assert.ok(matchOnTime > 0.9, 'On-time match should be high');
    assert.ok(matchOffTime < 0.5, 'Off-time match should be low');

    console.log('✓ Chronos testing passed');
}

(async () => {
    try {
        await testHabits();
        await testChronos();
        console.log('All Habits and Chronos tests passed!');
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
})();
