// app/admin/match-reviews/MatchReviewsClient.tsx
//
// Interactive queue: fetches every unresolved review once per tab, then
// walks through them client-side. Clicking a candidate saves product_id to
// Supabase immediately (no save button, no reload) and advances.
//
// TABS: photo reviews (the original 100, image_path NOT NULL), text-only
// reviews (the ~1,191-row import, image_path NULL), and Christmas & Holiday
// reviews (pulled out of BOTH of the above by keyword match — see
// CHRISTMAS_KEYWORDS in the queue API route) are three separate queues —
// the owner works through one batch at a time instead of them being
// interleaved. Each tab has its own independent queue/history/selections,
// fetched lazily (only when first visited) and cached in `tabs` for the
// rest of the session, so switching tabs and back preserves progress in
// both. All the navigation logic below is unchanged from the single-queue
// version — it's just been parameterized to operate on whichever tab is
// active instead of one global state slice.
//
// PERSISTENCE ACROSS RELOADS: matched reviews never come back (product_id
// is set in Supabase, the queue API excludes them permanently) but skipped
// reviews used to be purely in-memory — a page reload lost all of that and
// they'd resurface from the top. Skipped review IDs are now also written to
// localStorage per tab (see loadSkippedIds/saveSkippedIds below) and
// filtered out of the queue on every load, so "where you left off" survives
// a reload without needing to store an explicit position — the position
// *is* "every unmatched review not in the skipped set, in id order". The
// "Reset queue" button at the bottom of the page clears that localStorage
// state for the active tab so skipped reviews come back on purpose.
//
// Navigation model (per tab):
// - `queue` is the pool of not-yet-resolved reviews fetched once per tab.
//   Items are removed from it (client-side) the moment they're resolved or
//   skipped — this drives the "X of Y remaining" counter.
// - `history` is an append-only list of every review that has been shown as
//   the live front-of-queue item this session, in the order first seen. It
//   is never trimmed, so "← Back" can always step into it — no new API call.
// - `viewOffset` is how many steps back from the live tip we're currently
//   looking. 0 = viewing the live front of the queue (queue[0]). >0 = viewing
//   a past item from `history`, purely from local state.
// - Resolving/skipping the LIVE item (viewOffset === 0) behaves exactly as
//   before: it's removed from `queue` and the newly-revealed front item is
//   appended to `history`.
// - Resolving/skipping a PAST item (viewOffset > 0) does NOT touch which
//   item is at the front of `queue` — it just saves (or, for skip, does
//   nothing) and steps `viewOffset` one closer to the live tip, so repeated
//   picks/skips walk you back to where you started.
// - Skip never writes to Supabase, even on a past item that already has a
//   pick — it's a safe way to page through history without changing
//   anything, which doubles as "forward" navigation once you've gone back.

'use client';

import { useEffect, useRef, useState } from 'react';

type Candidate = {
  id: string;
  title: string;
  image_url: string | null;
  price_digital: number | null;
  score: number;
};

type QueueItem = {
  id: number;
  image_path: string | null;
  reviewer_name: string;
  product_name: string | null;
  quote: string | null;
  rating: number | null;
  review_date: string | null;
  order_id: string | null;
  candidates: Candidate[];
};

type TabKey = 'photo' | 'text' | 'christmas';

type TabState = {
  queue: QueueItem[] | null;
  total: number;
  history: QueueItem[];
  viewOffset: number;
  selections: Record<number, Candidate>;
  loadError: string | null;
};

const EMPTY_TAB_STATE: TabState = {
  queue: null,
  total: 0,
  history: [],
  viewOffset: 0,
  selections: {},
  loadError: null,
};

const TAB_LABELS: Record<TabKey, string> = {
  photo: 'Photo reviews',
  text: 'Text reviews',
  christmas: 'Christmas & Holiday reviews',
};

// Skipped-review IDs persist here, one localStorage key per tab, so a page
// reload doesn't lose progress. Only skips are tracked — matches are
// already permanent in Supabase and never come back from the queue API.
const SKIPPED_STORAGE_PREFIX = 'matchReviews:skipped:';

function loadSkippedIds(tab: TabKey): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(SKIPPED_STORAGE_PREFIX + tab);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveSkippedIds(tab: TabKey, ids: Set<number>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SKIPPED_STORAGE_PREFIX + tab, JSON.stringify(Array.from(ids)));
  } catch {
    // Private browsing / quota exceeded — degrade silently, skip tracking
    // just won't survive a reload this time.
  }
}

function clearSkippedIds(tab: TabKey) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SKIPPED_STORAGE_PREFIX + tab);
  } catch {
    // ignore
  }
}

export default function MatchReviewsClient() {
  const [tabs, setTabs] = useState<Record<TabKey, TabState>>({
    photo: EMPTY_TAB_STATE,
    text: EMPTY_TAB_STATE,
    christmas: EMPTY_TAB_STATE,
  });
  const [activeTab, setActiveTab] = useState<TabKey>('photo');
  const [counts, setCounts] = useState<{ photo: number; text: number; christmas: number }>({
    photo: 0,
    text: 0,
    christmas: 0,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabState = tabs[activeTab];

  function updateActiveTab(patch: Partial<TabState> | ((s: TabState) => Partial<TabState>)) {
    setTabs((prev) => {
      const s = prev[activeTab];
      const delta = typeof patch === 'function' ? patch(s) : patch;
      return { ...prev, [activeTab]: { ...s, ...delta } };
    });
  }

  async function loadTab(tab: TabKey) {
    try {
      const res = await fetch(`/api/admin/match-reviews/queue?type=${tab}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawQueue: QueueItem[] = data.queue || [];
      // Filter out anything skipped earlier this session (or a previous
      // session, now that it's persisted) — this is what makes reloading
      // resume where you left off instead of restarting from the top.
      const skipped = loadSkippedIds(tab);
      const q = skipped.size > 0 ? rawQueue.filter((r) => !skipped.has(r.id)) : rawQueue;
      setTabs((prev) => ({
        ...prev,
        [tab]: {
          queue: q,
          total: q.length,
          history: q.length > 0 ? [q[0]] : [],
          viewOffset: 0,
          selections: {},
          loadError: null,
        },
      }));
      // data.counts covers all three tabs regardless of which type was
      // requested — subtract each tab's persisted skip count so the tab
      // badges match what's actually still actionable, not the raw
      // server-side unresolved count.
      if (data.counts) {
        setCounts({
          photo: Math.max(0, (data.counts.photo ?? 0) - loadSkippedIds('photo').size),
          text: Math.max(0, (data.counts.text ?? 0) - loadSkippedIds('text').size),
          christmas: Math.max(0, (data.counts.christmas ?? 0) - loadSkippedIds('christmas').size),
        });
      }
    } catch {
      setTabs((prev) => ({ ...prev, [tab]: { ...prev[tab], loadError: 'Failed to load the queue. Refresh to try again.' } }));
    }
  }

  // Clears this tab's persisted skip state and re-fetches from scratch —
  // does NOT touch Supabase, so already-matched reviews are unaffected;
  // only previously-skipped reviews in this tab reappear.
  async function resetQueue(tab: TabKey) {
    if (busy) return;
    const ok = window.confirm(
      `Reset the ${TAB_LABELS[tab]} queue? Skipped reviews will reappear from the beginning. Already-matched reviews are saved and won't be affected.`
    );
    if (!ok) return;
    clearSkippedIds(tab);
    setTabs((prev) => ({ ...prev, [tab]: EMPTY_TAB_STATE }));
    if (tab === activeTab) clearSearch();
    await loadTab(tab);
  }

  // Load the active tab's queue the first time it's visited; switching back
  // to an already-loaded tab reuses its cached state instead of refetching.
  useEffect(() => {
    if (tabs[activeTab].queue === null) {
      loadTab(activeTab);
    }
    setSearchQuery('');
    setSearchResults([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const isLive = tabState.viewOffset === 0;
  const current: QueueItem | null = isLive
    ? (tabState.queue && tabState.queue.length > 0 ? tabState.queue[0] : null)
    : tabState.history[tabState.history.length - 1 - tabState.viewOffset] ?? null;

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const goBack = () => {
    updateActiveTab((s) => ({ viewOffset: Math.min(s.viewOffset + 1, Math.max(s.history.length - 1, 0)) }));
    clearSearch();
  };

  async function resolve(reviewId: number, candidate: Candidate) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/match-reviews/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, productId: candidate.id }),
      });
      if (!res.ok) throw new Error('Save failed');

      updateActiveTab((s) => {
        const newQueue = s.queue ? s.queue.filter((r) => r.id !== reviewId) : s.queue;
        const newSelections = { ...s.selections, [reviewId]: candidate };

        if (s.viewOffset === 0) {
          const front = newQueue && newQueue[0];
          const newHistory =
            front && !(s.history.length > 0 && s.history[s.history.length - 1].id === front.id)
              ? [...s.history, front]
              : s.history;
          return { queue: newQueue, selections: newSelections, history: newHistory };
        }
        return { queue: newQueue, selections: newSelections, viewOffset: Math.max(0, s.viewOffset - 1) };
      });
      setCounts((c) => ({ ...c, [activeTab]: Math.max(0, c[activeTab] - 1) }));
      clearSearch();
    } catch {
      setError('Could not save that match — try again.');
    } finally {
      setBusy(false);
    }
  }

  function skip(reviewId: number) {
    // Only a skip of the LIVE item is a "real" skip that should persist and
    // hide the review going forward — paging through history (S on a past
    // item) never writes anything, same as it never did before.
    const wasLive = tabState.viewOffset === 0;

    updateActiveTab((s) => {
      if (s.viewOffset === 0) {
        const newQueue = s.queue ? s.queue.filter((r) => r.id !== reviewId) : s.queue;
        const front = newQueue && newQueue[0];
        const newHistory =
          front && !(s.history.length > 0 && s.history[s.history.length - 1].id === front.id)
            ? [...s.history, front]
            : s.history;
        return { queue: newQueue, history: newHistory };
      }
      // Never writes — just pages forward through history.
      return { viewOffset: Math.max(0, s.viewOffset - 1) };
    });

    if (wasLive) {
      const skipped = loadSkippedIds(activeTab);
      skipped.add(reviewId);
      saveSkippedIds(activeTab, skipped);
      setCounts((c) => ({ ...c, [activeTab]: Math.max(0, c[activeTab] - 1) }));
    }

    clearSearch();
  }

  // Live search — debounced, every word must match (server-side AND).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/match-reviews/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
        const data = await res.json();
        setSearchResults((data.results || []).map((p: Omit<Candidate, 'score'>) => ({ ...p, score: -1 })));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Keyboard shortcuts: 1/2/3 pick a candidate, S skips/advances. Disabled
  // while typing in the search box so product names with digits still work.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!current || busy) return;
      if (document.activeElement === searchInputRef.current) return;

      if (e.key === '1' || e.key === '2' || e.key === '3') {
        const idx = Number(e.key) - 1;
        const c = current.candidates[idx];
        if (c) resolve(current.id, c);
      } else if (e.key.toLowerCase() === 's') {
        skip(current.id);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const remaining = tabState.queue ? tabState.queue.length : 0;
  const canGoBack = tabState.history.length > 1 && tabState.viewOffset < tabState.history.length - 1;

  const pick = current ? tabState.selections[current.id] : undefined;
  const baseCandidates = current?.candidates ?? [];
  const pickInBase = pick && baseCandidates.some((c) => c.id === pick.id);
  const displayCandidates = pick && !pickInBase ? [pick, ...baseCandidates] : baseCandidates;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 24 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['photo', 'text', 'christmas'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: activeTab === tab ? '1px solid var(--accent)' : '0.5px solid var(--border-card)',
                background: activeTab === tab ? 'var(--accent)' : 'var(--bg-card)',
                color: activeTab === tab ? 'white' : 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {TAB_LABELS[tab]} ({counts[tab]})
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Match {TAB_LABELS[activeTab].toLowerCase()} to products</div>
            <button
              onClick={goBack}
              disabled={!canGoBack}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '0.5px solid var(--border-card)',
                background: 'var(--bg-card)',
                color: canGoBack ? 'inherit' : 'var(--text-muted)',
                fontSize: 12.5,
                cursor: canGoBack ? 'pointer' : 'default',
                opacity: canGoBack ? 1 : 0.5,
              }}
            >
              ← Back
            </button>
            {!isLive && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                viewing a previous review ({tabState.viewOffset} back)
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {remaining} of {tabState.total} remaining
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#fdecea',
              color: '#b3261e',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {tabState.loadError ? (
          <Centered>{tabState.loadError}</Centered>
        ) : tabState.queue === null ? (
          <Centered>Loading…</Centered>
        ) : !current ? (
          <Centered>
            All caught up — no unresolved {TAB_LABELS[activeTab].toLowerCase()} left. 🎉
            {tabState.history.length > 1 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Press ← Back to review what you matched this session.
              </div>
            )}
          </Centered>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(360px, 1.5fr)', gap: 24 }}>
            {/* Left: the review */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border-card)',
                borderRadius: 12,
                overflow: 'hidden',
                alignSelf: 'start',
              }}
            >
              {/* Text reviews have no image_path — skip the photo block
                  entirely rather than showing an empty placeholder; the
                  Text reviews tab is 100% this case, so a big gray box on
                  every single card would just be visual noise. */}
              {current.image_path && (
                <div style={{ aspectRatio: '4/5', background: 'var(--bg-pill)', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={current.id}
                    src={current.image_path}
                    alt={current.product_name ?? 'Review photo'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                    }}
                  />
                </div>
              )}
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{current.reviewer_name}</div>
                {current.rating != null && (
                  <div style={{ fontSize: 12, color: '#8B7355', letterSpacing: '1.5px', marginTop: 4 }}>
                    {'★'.repeat(current.rating)}
                  </div>
                )}
                {current.quote && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
                    &ldquo;{current.quote}&rdquo;
                  </p>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                  {current.product_name ? (
                    <>Review says: <strong>{current.product_name}</strong></>
                  ) : (
                    <em>No historical product name on file — use search</em>
                  )}
                  {current.review_date && <span> · {current.review_date}</span>}
                </div>
                {current.order_id && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Order: {current.order_id}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>review id #{current.id}</div>
                {pick && (
                  <div style={{ fontSize: 11, color: '#2f6f4f', marginTop: 8, fontWeight: 600 }}>
                    ✓ matched this session
                  </div>
                )}
              </div>
            </div>

            {/* Right: candidates + fallback search */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {displayCandidates.map((c) => {
                  const baseIdx = baseCandidates.findIndex((b) => b.id === c.id);
                  return (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      selected={pick?.id === c.id}
                      shortcutNumber={baseIdx >= 0 ? baseIdx + 1 : undefined}
                      disabled={busy}
                      onClick={() => resolve(current.id, c)}
                    />
                  );
                })}
                {displayCandidates.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', fontSize: 13, color: 'var(--text-muted)' }}>
                    No candidates — use search below.
                  </div>
                )}
              </div>

              <button
                onClick={() => skip(current.id)}
                disabled={busy}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 8,
                  border: '0.5px solid var(--border-card)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  cursor: busy ? 'default' : 'pointer',
                }}
              >
                {isLive ? 'Skip — no match (S)' : '→ Next — keep as-is (S)'}
              </button>

              <div style={{ marginTop: 28 }}>
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="None of these right? Search all products by keyword…"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '0.5px solid var(--border-card)',
                    fontSize: 13,
                    background: 'var(--bg-card)',
                    color: 'inherit',
                  }}
                />
                {searching && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Searching…</div>}
                {!searching && searchQuery.trim() && searchResults.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>No matches.</div>
                )}
                {searchResults.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginTop: 12 }}>
                    {searchResults.map((c) => (
                      <CandidateCard
                        key={c.id}
                        candidate={c}
                        selected={pick?.id === c.id}
                        disabled={busy}
                        onClick={() => resolve(current.id, c)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <button
            onClick={() => resetQueue(activeTab)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 11.5,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
            title={`Clear locally-skipped reviews for ${TAB_LABELS[activeTab]} and start that queue over. Already-matched reviews in Supabase are never affected.`}
          >
            Reset {TAB_LABELS[activeTab].toLowerCase()} queue
          </button>
        </div>
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  onClick,
  disabled,
  shortcutNumber,
  selected,
}: {
  candidate: Candidate;
  onClick: () => void;
  disabled?: boolean;
  shortcutNumber?: number;
  selected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: 'left',
        padding: 0,
        border: selected ? '2px solid #2f6f4f' : '0.5px solid var(--border-card)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--bg-card)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '1/1', background: 'var(--bg-pill)', overflow: 'hidden' }}>
        {candidate.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.image_url}
            alt={candidate.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: 'var(--text-muted)',
            }}
          >
            No image
          </div>
        )}
        {shortcutNumber && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              width: 20,
              height: 20,
              borderRadius: 6,
              background: 'rgba(0,0,0,0.62)',
              color: '#fff',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
            }}
          >
            {shortcutNumber}
          </div>
        )}
        {selected && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 20,
              height: 20,
              borderRadius: 6,
              background: '#2f6f4f',
              color: '#fff',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            ✓
          </div>
        )}
      </div>
      <div style={{ padding: 8 }}>
        <div style={{ fontSize: 11.5, lineHeight: 1.35, height: 32, overflow: 'hidden' }}>{candidate.title}</div>
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>
          {candidate.price_digital != null ? `$${candidate.price_digital.toFixed(2)}` : '—'}
        </div>
        {candidate.score >= 0 && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            match {Math.round(candidate.score * 100)}%
          </div>
        )}
      </div>
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontSize: 14,
        padding: 24,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}
