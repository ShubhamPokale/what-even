# The Website That Gets Worse — Project Specification

**Status:** Planning → Build
**Owner:** You (product/direction) + Claude (architecture/coordination) + N build agents (implementation)
**Stack:** Next.js (App Router, TypeScript) · Supabase (Postgres) · Vercel

---

## 1. Vision (one paragraph, for anyone joining cold)

A website that looks completely normal on arrival — clean, well-designed, professional — and then, based on how long you stay, how many times you click things, how many times you refresh, and how many times you've visited before, quietly starts changing itself. No tutorial, no banner explaining the gimmick. The site should feel like it has a personality that reveals itself only through interaction, escalating from subtle anomalies to acknowledging the visitor directly to actively degrading its own UI, and eventually "remembering" the visitor across sessions. The product is the discovery, not a feature list.

## 2. Goals / Non-Goals

**Goals**
- A deployed, shareable URL that works today and gets better every layer.
- A real, extensible rules engine — not a pile of one-off `if` statements duplicated across components.
- Persistent, cross-session visitor memory (backend + DB, per your call).
- A structure clean enough that independent agents can each own a vertical slice without stepping on each other.

**Non-goals (explicitly out of scope for v1)**
- User accounts / login / true cross-*device* identity (v1 identity = anonymous cookie-based visitor ID, upgradeable later).
- Mobile-native app.
- Monetization, analytics dashboards, admin panel (can be a later layer).

## 3. Tech Stack (decided)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+, App Router, TypeScript strict | Server + client in one repo |
| DB | Supabase (Postgres) | Free tier; gives us auth for free if v2 needs accounts |
| Hosting | Vercel | Auto-deploy from GitHub `main` |
| State (client) | Zustand | Lighter than Redux, fine for this scope |
| Animation | Framer Motion | Needed for "unstable layout" / corruption effects |
| Validation | Zod | Validate all API payloads |
| Styling | Tailwind CSS | Fast iteration, easy to make things look "professionally clean" in Phase 1 |

---

## 4. High-Level Design (HLD)

### 4.1 Components

```
┌─────────────────────────────────────────────────────────┐
│                        BROWSER                           │
│  ┌───────────────┐   ┌────────────────┐  ┌────────────┐ │
│  │ UI Components  │──▶│ Client Store    │──▶│ Heartbeat │ │
│  │ (Phase 1-5)    │◀──│ (Zustand)       │  │ (session  │ │
│  └───────────────┘   └────────────────┘  │  timer)    │ │
│         ▲                     │           └─────┬──────┘ │
│         │                     ▼                  │        │
│         │              ┌──────────────┐          │        │
│         └──────────────│ Flags Engine │◀─────────┘        │
│                        │ (pure fn)    │                   │
│                        └──────────────┘                   │
└───────────────────────────────┬───────────────────────────┘
                                 │ HTTP (fetch)
┌────────────────────────────────▼───────────────────────────┐
│                    NEXT.JS SERVER (Vercel)                  │
│  ┌────────────────┐   ┌─────────────────┐                   │
│  │ API Routes /    │──▶│ Rules Engine     │                  │
│  │ Server Actions  │◀──│ (shared w/ client│                  │
│  └────────┬────────┘   │  via /lib)       │                  │
│           │             └─────────────────┘                  │
└───────────┼───────────────────────────────────────────────────┘
            ▼
   ┌─────────────────┐
   │ Supabase (Postgres) │
   │  table: visitors  │
   └─────────────────┘
```

### 4.2 Data flow (single request lifecycle)

1. Visitor loads page → middleware checks for `visitor_id` cookie; if absent, generate UUID and set it.
2. Client calls `GET /api/visitor` → server does get-or-create on `visitors` row, increments `visit_count` if this is a new session, updates `last_seen_at`.
3. Server runs the **Rules Engine** against the state → returns `{ state, flags }`.
4. Client stores `{ state, flags }` in Zustand → components render conditionally based on `flags` (not raw state — components never do their own rule logic).
5. User interacts (click, scroll, dwell-time tick) → client dispatches an **event** → `POST /api/visitor/event`.
6. Server updates state, re-runs Rules Engine, returns new flags → client updates.
7. A heartbeat (every 15s while tab is visible, using the Page Visibility API) sends a `TICK` event to update `time_spent_seconds` server-side — this is what powers "you've been here for 6 minutes."

**Key architectural decision:** the Rules Engine is a **pure function** (`state -> flags`) that lives in `/lib/rules-engine` and is imported by both server and client. Client-side use is only for instant optimistic UI (e.g. flip a flag immediately on click before the server confirms); the server's version is the source of truth. This avoids "the rules engine" becoming two divergent implementations.

---

## 5. Low-Level Design (LLD)

### 5.1 Database schema

```sql
create table visitors (
  id uuid primary key default gen_random_uuid(),
  visit_count int not null default 0,
  session_count int not null default 0,
  refresh_count int not null default 0,
  time_spent_seconds int not null default 0,
  clicks jsonb not null default '{}',        -- { [elementId]: count }
  corruption_level int not null default 0,   -- 0-5, see 5.4
  eggs_found text[] not null default '{}',
  endings_seen text[] not null default '{}',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

Deliberately one flat table with a couple of JSON/array columns rather than a fully normalized schema — this state machine wants flexibility while the rule set is still evolving. Normalize later only if a specific column becomes genuinely relational (e.g. eggs get their own metadata).

### 5.2 Shared TypeScript state shape (`/lib/types.ts`)

```ts
export interface VisitorState {
  id: string;
  visitCount: number;
  sessionCount: number;
  refreshCount: number;
  timeSpentSeconds: number;
  clicks: Record<string, number>;
  corruptionLevel: 0 | 1 | 2 | 3 | 4 | 5;
  eggsFound: string[];
  endingsSeen: string[];
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface VisitorFlags {
  phase: 1 | 2 | 3 | 4 | 5;
  shouldAcknowledgeVisitor: boolean;
  shouldTaunt: boolean;
  shouldMoveButton: boolean;
  shouldShowForbiddenButton: boolean;
  unlockedEggIds: string[];
  message: string | null;   // e.g. "Oh. It's you again."
}
```

### 5.3 API surface

| Route | Method | Purpose |
|---|---|---|
| `/api/visitor` | GET | Get-or-create visitor, return `{ state, flags }` |
| `/api/visitor/event` | POST | Body: `{ type: 'CLICK'|'TICK'|'REFRESH', payload }` → updates state, returns new `{ state, flags }` |
| `/api/visitor/reset` | POST | Wipes state for the "Reset Website" easter egg / ending screen |

All payloads validated with Zod schemas in `/lib/schemas.ts`. Rate-limit `/event` (e.g. max 1 TICK per 10s server-side, ignore duplicates) so a malicious client can't fake huge time-spent numbers.

### 5.4 Rules Engine (`/lib/rules-engine/index.ts`)

Implemented as an **ordered list of rule objects**, not nested if/else — this is what makes it extensible by multiple agents without merge conflicts:

```ts
type Rule = {
  id: string;
  condition: (s: VisitorState) => boolean;
  apply: (flags: VisitorFlags) => VisitorFlags;
};

const rules: Rule[] = [
  {
    id: 'phase-2-anomalies',
    condition: (s) => s.timeSpentSeconds > 60,
    apply: (f) => ({ ...f, phase: Math.max(f.phase, 2) }),
  },
  {
    id: 'phase-3-acknowledge',
    condition: (s) => s.timeSpentSeconds > 300,
    apply: (f) => ({ ...f, phase: 3, shouldAcknowledgeVisitor: true }),
  },
  {
    id: 'refresh-spam',
    condition: (s) => s.refreshCount > 10,
    apply: (f) => ({ ...f, shouldMoveButton: true }),
  },
  {
    id: 'returning-visitor',
    condition: (s) => s.sessionCount >= 2,
    apply: (f) => ({ ...f, message: "Oh. It's you again." }),
  },
  // agents append new rules here — each rule is independent and additive
];

export function computeFlags(state: VisitorState): VisitorFlags {
  return rules.reduce((flags, rule) => (rule.condition(state) ? rule.apply(flags) : flags), defaultFlags());
}
```

New behaviors = new rule objects. This is the single most important extensibility point in the whole codebase — **agents adding new "the website notices X" behavior should almost always be adding a rule here, not editing components.**

### 5.5 Corruption levels (0–5)

| Level | Trigger (example) | Visual effect |
|---|---|---|
| 0 | Default | Clean design, Phase 1 |
| 1 | `timeSpentSeconds > 60` | Micro-anomalies: a delayed transition, a button 2px off |
| 2 | `timeSpentSeconds > 300` or `refreshCount > 5` | Site starts commenting on the visitor |
| 3 | `refreshCount > 10` or repeated same-element clicks | Layout instability begins (Framer Motion random micro-shifts) |
| 4 | `corruptionLevel` explicitly bumped by an egg/rule | Typography glitches, sections reorder, "DO NOT CLICK" button appears |
| 5 | Terminal state for a session | Ending screen triggers |

Corruption level is persisted, not recalculated from scratch each time — some corruption should be sticky/ratchet-only (never decreases) to make history feel real.

### 5.6 Easter egg registry (`/lib/eggs.ts`)

```ts
type Egg = {
  id: string;
  hint?: string;
  check: (s: VisitorState, event: ClientEvent) => boolean;
};
```

Same additive-list pattern as rules. An egg firing appends its id to `eggsFound` server-side (idempotent — check `!eggsFound.includes(id)` before adding). This is a great "first ticket" for a new agent to pick up in isolation: add an egg, doesn't touch anyone else's code.

### 5.7 Frontend architecture

```
<App>
  <VisitorProvider>          // fetches initial state+flags, sets up Zustand store, starts heartbeat
    <PhaseRenderer />        // reads flags.phase, renders <Phase1/> ... <Phase5/>
  </VisitorProvider>
</App>
```

- Components **never** read raw `VisitorState` directly for behavior decisions — only `VisitorFlags`. This keeps rule logic in one place.
- Components **may** read `VisitorState` for pure display (e.g. "you clicked this 37 times") but not for branching logic.

---

## 6. Project Structure

```
website-that-gets-worse/
├── app/
│   ├── page.tsx                  # entry point, renders <PhaseRenderer/>
│   ├── layout.tsx
│   ├── api/
│   │   └── visitor/
│   │       ├── route.ts          # GET
│   │       ├── event/route.ts    # POST
│   │       └── reset/route.ts    # POST
│   └── globals.css
├── components/
│   ├── phases/
│   │   ├── Phase1Clean.tsx
│   │   ├── Phase2Anomalies.tsx
│   │   ├── Phase3Acknowledge.tsx
│   │   ├── Phase4Corruption.tsx
│   │   └── Phase5Memory.tsx
│   ├── PhaseRenderer.tsx
│   └── VisitorProvider.tsx
├── lib/
│   ├── types.ts
│   ├── schemas.ts                # Zod schemas
│   ├── rules-engine/
│   │   ├── index.ts
│   │   └── rules/                # one file per rule group, e.g. dwell-time.ts, refresh.ts
│   ├── eggs.ts
│   ├── supabase.ts               # DB client
│   └── store.ts                  # Zustand store
├── middleware.ts                 # visitor_id cookie assignment
├── supabase/
│   └── migrations/
│       └── 0001_init.sql
├── PROJECT_SPEC.md               # this file
└── README.md
```

**Rule for agents:** if your task is "add a new behavior," you should be touching `lib/rules-engine/rules/*` and possibly one `components/phases/*` file — almost never `app/api/*` or `middleware.ts`. Those are considered stable infrastructure once Layer 1 is done.

---

## 7. Conventions & Techniques

- **TypeScript strict mode** everywhere — no `any` in shared `lib/` code.
- **Server as source of truth**: client-side flag computation is optimistic-only; always reconciled with the server's response.
- **Additive over destructive**: new rules/eggs are new list entries, not edits to existing conditionals. This is what lets multiple agents work in parallel without merge conflicts.
- **Idempotent event handling**: server-side event processing must be safe to receive duplicates (network retries).
- **No secrets in client code**: `FIRECRAWL`/Supabase service-role keys stay server-side only; client uses the public anon key.
- **Feature flags as the only branching mechanism** in components — no component should independently decide "if timeSpent > X."
- **Commit convention**: `feat(rules): add refresh-spam rule`, `feat(egg): add konami-code egg`, `fix(phase3): ...` — makes it trivial to see which layer changed.

---

## 8. Roadmap as Assignable Work Packages

Each package below is scoped so one agent can own it end-to-end with minimal cross-talk.

**WP-0: Infra bootstrap** (do first, blocks everything)
- Scaffold Next.js + TS + Tailwind, push to GitHub, connect Vercel.
- Create Supabase project, run `0001_init.sql`, wire env vars.
- `middleware.ts` for `visitor_id` cookie.
- Acceptance: blank deployed page that reads/writes a row in `visitors` on load.

**WP-1: Phase 1 — Clean landing page**
- Build `Phase1Clean.tsx`: the "beautifully designed, nothing suspicious" version.
- Acceptance: matches vision doc tone; no logic dependencies yet.

**WP-2: Rules engine + API routes**
- Implement `GET /api/visitor`, `POST /api/visitor/event`, the rules engine skeleton with 2–3 starter rules.
- Acceptance: flags correctly change after simulated time/click/refresh events (write a small test script).

**WP-3: Phase 2/3 components**
- Anomaly micro-interactions + acknowledgment banners, wired to flags from WP-2.

**WP-4: Corruption engine (Phase 4)**
- Framer Motion instability effects, the "DO NOT CLICK" button + its response, corruption level persistence.

**WP-5: Cross-session memory (Phase 5)**
- Returning-visitor messaging, "last time you clicked this N times," session_count logic.

**WP-6: Easter egg pack**
- 5–10 eggs of varying discoverability, added to `lib/eggs.ts`. Fully parallelizable — many agents can each add eggs independently.

**WP-7: Ending + reset flow**
- Ending screen, achievement copy, `POST /api/visitor/reset`.

Suggested order: WP-0 → WP-1 → WP-2 → (WP-3, WP-4, WP-6 in parallel) → WP-5 → WP-7.

---

## 9. How Multiple Agents Should Coordinate

- One GitHub repo, `main` protected, feature branches per work package (`wp-3-phase2`, `egg/konami-code`).
- Any agent touching `lib/rules-engine/index.ts` itself (not just adding a rule file) or `lib/types.ts` should flag it — those are the two files everyone depends on.
- PRs should state which WP they close and confirm they didn't edit `app/api/*` unless their WP explicitly covers infra.
- I'll act as the integration point: reviewing PRs for architectural drift, resolving cross-WP conflicts, and deciding when a "Layer" is done enough to move on.

---

## 10. Immediate Next Step

WP-0 is the unlock for everything else. I'd suggest we do that one together right now (repo scaffold + Vercel + Supabase wiring), then hand WP-1 onward to your agents in parallel.
