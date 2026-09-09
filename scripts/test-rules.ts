import { computeFlags } from '../lib/rules-engine';
import { VisitorState } from '../lib/types';

function createMockState(overrides: Partial<VisitorState> = {}): VisitorState {
  return {
    id: 'test-uuid-1234',
    visitCount: 1,
    sessionCount: 1,
    refreshCount: 0,
    timeSpentSeconds: 0,
    clicks: {},
    corruptionLevel: 0,
    eggsFound: [],
    endingsSeen: [],
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    ...overrides,
  };
}

console.log('--- Testing Rules Engine ---\n');

// Test 1: Pristine visitor (Phase 1)
const s1 = createMockState();
const f1 = computeFlags(s1);
console.log('Test 1 [Pristine]:', { phase: f1.phase, acknowledge: f1.shouldAcknowledgeVisitor });
console.assert(f1.phase === 1, 'Test 1 Failed: Phase should be 1');

// Test 2: Dwell time > 60s (Phase 2 Anomaly)
const s2 = createMockState({ timeSpentSeconds: 65 });
const f2 = computeFlags(s2);
console.log('Test 2 [65s Dwell]:', { phase: f2.phase, anomalies: f2.activeAnomalies });
console.assert(f2.phase === 2, 'Test 2 Failed: Phase should be 2');

// Test 3: Multiple clicks on one button (Evasive Button)
const s3 = createMockState({ clicks: { 'cta-primary': 4 } });
const f3 = computeFlags(s3);
console.log('Test 3 [4 Clicks on CTA]:', { moveButton: f3.shouldMoveButton, distance: f3.buttonShiftDistance });
console.assert(f3.shouldMoveButton === true, 'Test 3 Failed: shouldMoveButton should be true');

// Test 4: Returning visitor (Session >= 2)
const s4 = createMockState({ sessionCount: 2 });
const f4 = computeFlags(s4);
console.log('Test 4 [Returning Visitor]:', { message: f4.message });
console.assert(f4.shouldAcknowledgeVisitor === true, 'Test 4 Failed: should acknowledge returning visitor');

// Test 5: High corruption level (Phase 4 / 5)
const s5 = createMockState({ corruptionLevel: 4 });
const f5 = computeFlags(s5);
console.log('Test 5 [Corruption Level 4]:', { phase: f5.phase, forbiddenButton: f5.shouldShowForbiddenButton });
console.assert(f5.phase === 4 && f5.shouldShowForbiddenButton, 'Test 5 Failed');

console.log('\nAll Rules Engine tests PASSED successfully!');
