import { NextRequest, NextResponse } from 'next/server';
import { resetVisitor } from '@/lib/supabase';
import { computeFlags } from '@/lib/rules-engine';

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

    const state = await resetVisitor(visitorId);
    const flags = computeFlags(state);

    return NextResponse.json({
      state,
      flags,
      message: 'Visitor reality has been reconstructed.',
    });
  } catch (error) {
    console.error('[API /api/visitor/reset] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
