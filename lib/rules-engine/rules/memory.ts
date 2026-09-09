import { Rule } from '../types';

export const memoryRules: Rule[] = [
  {
    id: 'memory-returning-visitor',
    name: 'Acknowledge returning session visitor',
    condition: (s) => s.sessionCount >= 2,
    apply: (flags, s) => {
      const messages = [
        "Oh. It's you again.",
        `Welcome back. Session #${s.sessionCount}. Did you think closing the tab would make us forget?`,
        `You've spent ${Math.floor(s.timeSpentSeconds / 60)} minutes here across ${s.sessionCount} sessions.`,
      ];
      const selectedMessage = messages[(s.sessionCount - 2) % messages.length];

      return {
        ...flags,
        shouldAcknowledgeVisitor: true,
        message: flags.message || selectedMessage,
      };
    },
  },
  {
    id: 'memory-rebooted-visitor',
    name: 'Visitor who previously triggered the ending reboot',
    condition: (s) => s.endingsSeen.includes('reboot_ending'),
    apply: (flags) => ({
      ...flags,
      message:
        flags.message ||
        "You rebooted this website once before. The scars are still in the database.",
    }),
  },
];
