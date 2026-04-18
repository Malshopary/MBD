/**
 * Supabase client with localStorage fallback.
 *
 * When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set the module
 * exports `supabase = null` and `isSupabaseConfigured = false`.  The store
 * layer uses these flags to decide whether to call the remote DB or stay
 * fully offline with localStorage.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || '';
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseKey.length > 0;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ── localStorage keys ────────────────────────────────────────────────────────
export const LS_DATA_KEY = 'mediapro_v2';
export const LS_GS_KEY   = 'mediapro_gs';

// ── localStorage helpers ─────────────────────────────────────────────────────

/** Read persisted state, migrating old schema fields when necessary. */
export function lsLoad() {
  try {
    const raw = localStorage.getItem(LS_DATA_KEY);
    if (!raw) return { clients: [], campaigns: [], nextId: 1 };

    const parsed = JSON.parse(raw);

    // Migrate campaigns: back-fill fields added in v2
    const campaigns = (parsed.campaigns || []).map((c) => {
      const leads = Number(c.leads != null ? c.leads : (c.res || 0));
      const spend = Number(c.dailySpend || 0);
      const sales = Number(c.sales || 0);
      return {
        ...c,
        leads,
        roas:      parseFloat((spend > 0 ? sales / spend : 0).toFixed(2)),
        cpl:       parseFloat((leads > 0 ? spend / leads : 0).toFixed(2)),
        notes:     c.notes     ?? '',
        startDate: c.startDate ?? '',
        endDate:   c.endDate   ?? '',
        status:    c.status    ?? 'Active',
      };
    });

    return {
      clients:   parsed.clients   || [],
      campaigns,
      nextId:    parsed.nextId    || campaigns.length + 1,
    };
  } catch {
    return { clients: [], campaigns: [], nextId: 1 };
  }
}

/** Persist the full state object to localStorage. */
export function lsSave(state) {
  localStorage.setItem(LS_DATA_KEY, JSON.stringify(state));
}

/** Wipe all app keys from localStorage. */
export function lsClear() {
  localStorage.removeItem(LS_DATA_KEY);
  localStorage.removeItem(LS_GS_KEY);
}
