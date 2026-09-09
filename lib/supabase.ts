import { createClient } from '@supabase/supabase-js';
import { VisitorState, CorruptionLevel } from './types';

// In-memory resilient fallback store for development/offline mode
const inMemoryVisitors = new Map<string, VisitorState>();

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.warn('[Supabase] Failed to create client:', err);
    return null;
  }
}

// Map Postgres row (snake_case) to VisitorState (camelCase)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToVisitorState(row: any): VisitorState {
  return {
    id: row.id,
    visitCount: Number(row.visit_count ?? 0),
    sessionCount: Number(row.session_count ?? 0),
    refreshCount: Number(row.refresh_count ?? 0),
    timeSpentSeconds: Number(row.time_spent_seconds ?? 0),
    clicks: (row.clicks as Record<string, number>) || {},
    corruptionLevel: (Number(row.corruption_level) || 0) as CorruptionLevel,
    eggsFound: Array.isArray(row.eggs_found) ? row.eggs_found : [],
    endingsSeen: Array.isArray(row.endings_seen) ? row.endings_seen : [],
    firstSeenAt: row.first_seen_at || new Date().toISOString(),
    lastSeenAt: row.last_seen_at || new Date().toISOString(),
  };
}

// Map VisitorState (camelCase) to Postgres row (snake_case)
function visitorStateToRow(state: VisitorState) {
  return {
    id: state.id,
    visit_count: state.visitCount,
    session_count: state.sessionCount,
    refresh_count: state.refreshCount,
    time_spent_seconds: state.timeSpentSeconds,
    clicks: state.clicks,
    corruption_level: state.corruptionLevel,
    eggs_found: state.eggsFound,
    endings_seen: state.endingsSeen,
    first_seen_at: state.firstSeenAt,
    last_seen_at: state.lastSeenAt,
  };
}

export function createDefaultVisitorState(id: string): VisitorState {
  const now = new Date().toISOString();
  return {
    id,
    visitCount: 1,
    sessionCount: 1,
    refreshCount: 0,
    timeSpentSeconds: 0,
    clicks: {},
    corruptionLevel: 0,
    eggsFound: [],
    endingsSeen: [],
    firstSeenAt: now,
    lastSeenAt: now,
  };
}

/**
 * Fetch a visitor from Supabase or fallback store
 */
export async function getVisitor(id: string): Promise<VisitorState | null> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return rowToVisitorState(data);
      }
      if (error && error.code !== 'PGRST116') {
        console.warn('[Supabase getVisitor error, using fallback]:', error.message);
      }
    } catch (e) {
      console.warn('[Supabase getVisitor exception, using fallback]:', e);
    }
  }

  return inMemoryVisitors.get(id) || null;
}

/**
 * Upsert visitor state to Supabase or fallback store
 */
export async function upsertVisitor(state: VisitorState): Promise<VisitorState> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const row = visitorStateToRow(state);
      const { data, error } = await supabase
        .from('visitors')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();

      if (!error && data) {
        const saved = rowToVisitorState(data);
        inMemoryVisitors.set(state.id, saved);
        return saved;
      }
      if (error) {
        console.warn('[Supabase upsertVisitor error, using fallback]:', error.message);
      }
    } catch (e) {
      console.warn('[Supabase upsertVisitor exception, using fallback]:', e);
    }
  }

  // Resilient fallback: store in memory
  inMemoryVisitors.set(state.id, state);
  return state;
}

/**
 * Reset a visitor's progressive stats while preserving their identity and record
 */
export async function resetVisitor(id: string): Promise<VisitorState> {
  const existing = await getVisitor(id);
  const now = new Date().toISOString();

  const resetState: VisitorState = {
    id,
    visitCount: (existing?.visitCount ?? 0) + 1,
    sessionCount: (existing?.sessionCount ?? 0) + 1,
    refreshCount: 0,
    timeSpentSeconds: 0,
    clicks: {},
    corruptionLevel: 0,
    eggsFound: existing?.eggsFound ?? [],
    endingsSeen: existing?.endingsSeen ?? ['reboot_ending'],
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
  };

  return await upsertVisitor(resetState);
}
