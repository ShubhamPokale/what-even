export type Phase = 1 | 2 | 3 | 4 | 5;
export type CorruptionLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface VisitorState {
  id: string;
  visitCount: number;
  sessionCount: number;
  refreshCount: number;
  timeSpentSeconds: number;
  clicks: Record<string, number>; // { [elementId]: count }
  corruptionLevel: CorruptionLevel;
  eggsFound: string[];
  endingsSeen: string[];
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface VisitorFlags {
  phase: Phase;
  shouldAcknowledgeVisitor: boolean;
  shouldTaunt: boolean;
  shouldMoveButton: boolean;
  shouldShowForbiddenButton: boolean;
  unlockedEggIds: string[];
  message: string | null;
  buttonShiftDistance?: number;
  activeAnomalies?: string[];
}

export type EventType = 'CLICK' | 'TICK' | 'REFRESH' | 'EGG' | 'RESET';

export interface ClientEvent {
  type: EventType;
  payload?: {
    elementId?: string;
    deltaSeconds?: number;
    eggId?: string;
    [key: string]: unknown;
  };
}

export interface VisitorApiResponse {
  state: VisitorState;
  flags: VisitorFlags;
  isNewSession?: boolean;
}
