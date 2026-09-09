import { VisitorState } from './types';

export interface Egg {
  id: string;
  name: string;
  hint: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check: (state: VisitorState, event: { type: string; payload?: any }) => boolean;
}

export const easterEggs: Egg[] = [
  {
    id: 'egg-logo-spam',
    name: 'Logo Obsession',
    hint: 'Click the brand logo 7 times in a row',
    check: (_state, event) => {
      return (
        event.type === 'CLICK' &&
        event.payload?.elementId === 'nav-logo' &&
        (event.payload?.count ?? 0) >= 7
      );
    },
  },
  {
    id: 'egg-konami',
    name: 'Retro Glitch',
    hint: 'Enter the ancient gaming code',
    check: (_state, event) => {
      return (
        event.type === 'EGG' &&
        event.payload?.eggId === 'egg-konami'
      );
    },
  },
  {
    id: 'egg-secret-footer',
    name: 'The Dead Pixel',
    hint: 'Find the nearly invisible anomaly in the bottom right corner',
    check: (_state, event) => {
      return (
        event.type === 'CLICK' &&
        event.payload?.elementId === 'footer-secret-dot'
      );
    },
  },
  {
    id: 'egg-forbidden-button',
    name: 'Pushed the Big Red Button',
    hint: 'Disobey the direct order not to click',
    check: (_state, event) => {
      return (
        event.type === 'CLICK' &&
        event.payload?.elementId === 'forbidden-button'
      );
    },
  },
  {
    id: 'egg-console-peeker',
    name: 'Curious Hacker',
    hint: 'Inspect the browser console logs',
    check: (_state, event) => {
      return (
        event.type === 'EGG' &&
        event.payload?.eggId === 'egg-console-peeker'
      );
    },
  },
];

export function checkNewEggs(
  state: VisitorState,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: { type: string; payload?: any }
): string[] {
  const newEggIds: string[] = [];

  for (const egg of easterEggs) {
    if (!state.eggsFound.includes(egg.id)) {
      if (egg.check(state, event)) {
        newEggIds.push(egg.id);
      }
    }
  }

  return newEggIds;
}
