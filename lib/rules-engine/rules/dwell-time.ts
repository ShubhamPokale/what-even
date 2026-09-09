import { Rule } from '../types';

export const dwellTimeRules: Rule[] = [
  {
    id: 'dwell-phase-2-anomalies',
    name: 'Micro-anomalies after 60s dwell time',
    condition: (s) => s.timeSpentSeconds >= 60,
    apply: (flags) => ({
      ...flags,
      phase: (Math.max(flags.phase, 2) as 1 | 2 | 3 | 4 | 5),
      activeAnomalies: Array.from(
        new Set([...(flags.activeAnomalies || []), 'subtle-drift', 'hover-delay'])
      ),
    }),
  },
  {
    id: 'dwell-phase-3-acknowledge',
    name: 'Website begins addressing visitor after 180s',
    condition: (s) => s.timeSpentSeconds >= 180,
    apply: (flags, s) => {
      const minutes = Math.floor(s.timeSpentSeconds / 60);
      return {
        ...flags,
        phase: (Math.max(flags.phase, 3) as 1 | 2 | 3 | 4 | 5),
        shouldAcknowledgeVisitor: true,
        message:
          flags.message ||
          `You've been inspecting this landing page for ${minutes} minutes. Are you expecting something to change?`,
      };
    },
  },
  {
    id: 'dwell-taunt-300s',
    name: 'Existential taunts after 300s',
    condition: (s) => s.timeSpentSeconds >= 300,
    apply: (flags) => ({
      ...flags,
      shouldTaunt: true,
      message:
        "Five minutes. You could have learned the basics of Rust. Yet here we are.",
    }),
  },
];
