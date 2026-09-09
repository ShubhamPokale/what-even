import { Rule } from '../types';

export const corruptionRules: Rule[] = [
  {
    id: 'corruption-thresholds',
    name: 'Escalate phase based on stored corruption level',
    condition: (s) => s.corruptionLevel > 0,
    apply: (flags, s) => {
      // Map corruption levels 0-5 to phases 1-5 according to Section 5.5
      let mappedPhase: 1 | 2 | 3 | 4 | 5 = flags.phase;
      if (s.corruptionLevel >= 5) mappedPhase = 5;
      else if (s.corruptionLevel >= 3) mappedPhase = 4;
      else if (s.corruptionLevel === 2) mappedPhase = Math.max(flags.phase, 3) as 1 | 2 | 3 | 4 | 5;
      else if (s.corruptionLevel === 1) mappedPhase = Math.max(flags.phase, 2) as 1 | 2 | 3 | 4 | 5;

      return {
        ...flags,
        phase: mappedPhase,
        shouldShowForbiddenButton: s.corruptionLevel >= 3,
      };
    },
  },
  {
    id: 'corruption-level-4-chaos',
    name: 'Layout instability at corruption level 3 or 4',
    condition: (s) => s.corruptionLevel >= 3,
    apply: (flags) => ({
      ...flags,
      phase: (Math.max(flags.phase, 4) as 1 | 2 | 3 | 4 | 5),
      shouldShowForbiddenButton: true,
      message:
        "ANOMALY CRITICAL: Visual coherence deteriorating. DO NOT INTERACT with compromised elements.",
    }),
  },
  {
    id: 'corruption-level-5-terminal',
    name: 'Terminal memory ending state at corruption level 5',
    condition: (s) => s.corruptionLevel >= 5,
    apply: (flags) => ({
      ...flags,
      phase: 5,
      message: "SYSTEM HALTED: Reality reconstruction required.",
    }),
  },
];
