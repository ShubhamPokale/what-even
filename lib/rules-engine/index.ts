import { VisitorState, VisitorFlags } from '../types';
import { Rule, createDefaultFlags } from './types';
import { dwellTimeRules } from './rules/dwell-time';
import { clickRules } from './rules/clicks';
import { refreshRules } from './rules/refresh';
import { corruptionRules } from './rules/corruption';
import { memoryRules } from './rules/memory';

// Ordered list of rules evaluated sequentially
export const allRules: Rule[] = [
  ...dwellTimeRules,
  ...clickRules,
  ...refreshRules,
  ...memoryRules,
  ...corruptionRules, // Evaluated last so explicit corruption levels override or pin terminal phases
];

/**
 * Pure function: computes VisitorFlags from VisitorState.
 * - Idempotent
 * - Zero side effects
 * - Safe to execute on both server and client
 */
export function computeFlags(state: VisitorState): VisitorFlags {
  const initialFlags = createDefaultFlags();

  // Attach already found eggs
  initialFlags.unlockedEggIds = [...state.eggsFound];

  // Reduce over all rules
  return allRules.reduce((flags, rule) => {
    try {
      if (rule.condition(state)) {
        return rule.apply(flags, state);
      }
    } catch (e) {
      console.error(`[RulesEngine] Error applying rule ${rule.id}:`, e);
    }
    return flags;
  }, initialFlags);
}

export * from './types';
