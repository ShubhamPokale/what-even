import { VisitorFlags } from '../types';

export interface Rule {
  id: string;
  name: string;
  condition: (state: import('../types').VisitorState) => boolean;
  apply: (
    flags: VisitorFlags,
    state: import('../types').VisitorState
  ) => VisitorFlags;
}

export function createDefaultFlags(): VisitorFlags {
  return {
    phase: 1,
    shouldAcknowledgeVisitor: false,
    shouldTaunt: false,
    shouldMoveButton: false,
    shouldShowForbiddenButton: false,
    unlockedEggIds: [],
    message: null,
    buttonShiftDistance: 0,
    activeAnomalies: [],
  };
}
