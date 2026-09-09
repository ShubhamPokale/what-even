import { NextRequest, NextResponse } from 'next/server';
import { ClientEventSchema } from '@/lib/schemas';
import {
  getVisitor,
  upsertVisitor,
  createDefaultVisitorState,
} from '@/lib/supabase';
import { computeFlags } from '@/lib/rules-engine';
import { checkNewEggs } from '@/lib/eggs';
import { CorruptionLevel } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const visitorId =
      request.headers.get('x-visitor-id') ||
      request.cookies.get('visitor_id')?.value;

    if (!visitorId) {
      return NextResponse.json(
        { error: 'Missing visitor identification' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parseResult = ClientEventSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid event format', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const event = parseResult.data;
    let state = await getVisitor(visitorId);

    if (!state) {
      state = createDefaultVisitorState(visitorId);
    }

    const now = new Date().toISOString();
    state.lastSeenAt = now;

    // Process event based on type
    switch (event.type) {
      case 'TICK': {
        // Dwell-time tick: add capped seconds to prevent spoofing
        const delta = Math.min(60, Math.max(1, event.payload?.deltaSeconds ?? 15));
        state.timeSpentSeconds += delta;
        break;
      }

      case 'CLICK': {
        const elementId = event.payload?.elementId || 'unknown_button';
        state.clicks[elementId] = (state.clicks[elementId] || 0) + 1;

        // Special trigger: Clicking the forbidden button escalates corruption
        if (elementId === 'forbidden-button') {
          const nextLevel = Math.min(5, state.corruptionLevel + 1) as CorruptionLevel;
          state.corruptionLevel = nextLevel;
        }
        break;
      }

      case 'REFRESH': {
        state.refreshCount += 1;
        break;
      }

      case 'RESET': {
        // Handled via dedicated reset route or event
        break;
      }

      case 'EGG': {
        // Explicit client egg notification
        break;
      }
    }

    // Check if any new Easter eggs were triggered
    const newEggs = checkNewEggs(state, event);
    if (newEggs.length > 0) {
      state.eggsFound = Array.from(new Set([...state.eggsFound, ...newEggs]));
    }

    // Automatic ratchet for corruption based on cumulative chaos
    if (state.refreshCount >= 8 && state.corruptionLevel < 3) {
      state.corruptionLevel = 3;
    }
    const totalClicks = Object.values(state.clicks).reduce((a, b) => a + b, 0);
    if (totalClicks >= 40 && state.corruptionLevel < 3) {
      state.corruptionLevel = 3;
    }

    // Save updated state
    const savedState = await upsertVisitor(state);

    // Compute fresh flags
    const flags = computeFlags(savedState);

    return NextResponse.json({
      state: savedState,
      flags,
    });
  } catch (error) {
    console.error('[API /api/visitor/event] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
