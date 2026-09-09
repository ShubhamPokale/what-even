import { Rule } from '../types';

export const clickRules: Rule[] = [
  {
    id: 'clicks-evasive-button',
    name: 'Repeated button clicks causes button to dodge',
    condition: (s) => {
      // If any single element is clicked 3 or more times
      return Object.values(s.clicks).some((count) => count >= 3);
    },
    apply: (flags, s) => {
      const highestClick = Math.max(...Object.values(s.clicks), 0);
      const shiftDistance = Math.min(200, (highestClick - 2) * 25);
      return {
        ...flags,
        shouldMoveButton: true,
        buttonShiftDistance: shiftDistance,
      };
    },
  },
  {
    id: 'clicks-spam-commentary',
    name: 'Comment on excessive click frenzy',
    condition: (s) => {
      const totalClicks = Object.values(s.clicks).reduce((a, b) => a + b, 0);
      return totalClicks >= 15;
    },
    apply: (flags, s) => {
      const totalClicks = Object.values(s.clicks).reduce((a, b) => a + b, 0);
      return {
        ...flags,
        shouldAcknowledgeVisitor: true,
        message:
          flags.message ||
          `That's ${totalClicks} clicks. The server is fine, but your mouse switch might be tired.`,
      };
    },
  },
];
