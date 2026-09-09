import { NextRequest, NextResponse } from 'next/server';
import {
  getVisitor,
  upsertVisitor,
  createDefaultVisitorState,
} from '@/lib/supabase';
import { computeFlags } from '@/lib/rules-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const visitorId =
      request.headers.get('x-visitor-id') ||
      request.cookies.get('visitor_id')?.value ||
      crypto.randomUUID();

    let state = await getVisitor(visitorId);
    let isNewSession = false;
    const now = new Date();

    if (!state) {
      // First time visitor ever
      state = createDefaultVisitorState(visitorId);
      isNewSession = true;
      state = await upsertVisitor(state);
    } else {
      // Check if session has expired (> 30 minutes of inactivity)
      const lastSeen = new Date(state.lastSeenAt);
      const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);

      if (diffMinutes > 30) {
        state.sessionCount += 1;
        isNewSession = true;
      }

      state.visitCount += 1;
      state.lastSeenAt = now.toISOString();
      state = await upsertVisitor(state);
    }

    const flags = computeFlags(state);

    return NextResponse.json({
      state,
      flags,
      isNewSession,
    });
  } catch (error) {
    console.error('[API /api/visitor] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
