import { Rule } from '../types';

export const refreshRules: Rule[] = [
  {
    id: 'refresh-noticing',
    name: 'Website notices refresh spam',
    condition: (s) => s.refreshCount >= 2,
    apply: (flags, s) => ({
      ...flags,
      shouldAcknowledgeVisitor: true,
      message:
        flags.message ||
        `You refreshed this page ${s.refreshCount} times. Were you hoping the bugs would fix themselves?`,
    }),
  },
  {
    id: 'refresh-spammer-escalate',
    name: 'Persistent reloads escalate corruption level',
    condition: (s) => s.refreshCount >= 5,
    apply: (flags) => ({
      ...flags,
      phase: (Math.max(flags.phase, 3) as 1 | 2 | 3 | 4 | 5),
      message:
        "F5 won't save you. We preserve state in Postgres. Your history is permanent.",
    }),
  },
];
