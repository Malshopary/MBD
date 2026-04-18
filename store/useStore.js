/**
 * Zustand store — single source of truth for clients, campaigns, filters,
 * Google Sheets URL, and toast queue.
 *
 * Persistence strategy:
 *   • If Supabase is configured → read/write remote DB; mirror to localStorage
 *     as a local cache so the UI loads instantly.
 *   • If Supabase is NOT configured → localStorage only (fully offline).
 */

import { create } from 'zustand';
import {
  supabase,
  isSupabaseConfigured,
  lsLoad,
  lsSave,
  lsClear,
  LS_GS_KEY,
} from '../lib/supabase';

// ── Allowed value sets (used as whitelists for safety) ───────────────────────
export const PLATFORMS = ['Meta', 'TikTok', 'Snapchat', 'Google'];
export const STATUSES  = ['Active', 'Paused', 'Ended'];

// ── Toast helpers ─────────────────────────────────────────────────────────────
let toastSeq = 0;
function makeToast(message, type = 'info') {
  return { id: ++toastSeq, message: String(message), type };
}

// ── Derived numeric helpers ───────────────────────────────────────────────────
function calcRoas(spend, sales) {
  return parseFloat((spend > 0 ? sales / spend : 0).toFixed(2));
}
function calcCpl(spend, leads) {
  return parseFloat((leads > 0 ? spend / leads : 0).toFixed(2));
}

// ── Initial local state ───────────────────────────────────────────────────────
const local = lsLoad();

// ── Store ─────────────────────────────────────────────────────────────────────
const useStore = create((set, get) => ({
  // ── Data ────────────────────────────────────────────────────────────────────
  clients:   local.clients,
  campaigns: local.campaigns,
  nextId:    local.nextId,         // used only in localStorage mode

  // ── UI / filter state ────────────────────────────────────────────────────────
  searchQuery:    '',
  filterClient:   'all',
  filterPlatform: 'all',
  filterStatus:   'all',

  // ── Google Sheets ────────────────────────────────────────────────────────────
  gsheetsUrl: localStorage.getItem(LS_GS_KEY) || '',

  // ── Toast queue ──────────────────────────────────────────────────────────────
  toasts: [],

  // ── Loading flag (Supabase bootstrap) ────────────────────────────────────────
  loading: false,

  // ── Internal: persist current state ─────────────────────────────────────────
  _persist() {
    const { clients, campaigns, nextId } = get();
    lsSave({ clients, campaigns, nextId });
  },

  // ── Toast actions ─────────────────────────────────────────────────────────────
  addToast(message, type = 'info') {
    const toast = makeToast(message, type);
    set((s) => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) }));
    }, 3500);
  },

  // ── Filter actions ────────────────────────────────────────────────────────────
  setSearch(v)         { set({ searchQuery: v }); },
  setFilterClient(v)   { set({ filterClient: v }); },
  setFilterPlatform(v) { set({ filterPlatform: v }); },
  setFilterStatus(v)   { set({ filterStatus: v }); },

  // ── Google Sheets URL ─────────────────────────────────────────────────────────
  setGsheetsUrl(url) {
    localStorage.setItem(LS_GS_KEY, url);
    set({ gsheetsUrl: url });
  },

  // ── Supabase bootstrap (call once on mount) ───────────────────────────────────
  async bootstrapFromSupabase() {
    if (!isSupabaseConfigured) return;
    set({ loading: true });
    try {
      const [{ data: clients }, { data: campaigns }] = await Promise.all([
        supabase.from('clients').select('name').order('created_at'),
        supabase.from('campaigns').select('*').order('created_at'),
      ]);

      const mappedCampaigns = (campaigns || []).map(mapSupabaseRow);
      const clientNames     = (clients  || []).map((c) => c.name);

      set({ clients: clientNames, campaigns: mappedCampaigns });
      // Mirror to localStorage so next load is instant
      lsSave({ clients: clientNames, campaigns: mappedCampaigns, nextId: get().nextId });
    } catch (err) {
      get().addToast('تعذّر الاتصال بـ Supabase، يُعمل بالنسخة المحلية', 'warning');
      console.error('Supabase bootstrap error:', err);
    } finally {
      set({ loading: false });
    }
  },

  // ── Client actions ────────────────────────────────────────────────────────────
  async addClient(name) {
    const trimmed = name.trim();
    if (!trimmed) { get().addToast('يرجى إدخال اسم العميل', 'error'); return false; }
    if (get().clients.includes(trimmed)) {
      get().addToast('هذا العميل موجود مسبقاً', 'warning'); return false;
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('clients').insert({ name: trimmed });
      if (error) { get().addToast('فشل حفظ العميل: ' + error.message, 'error'); return false; }
    }

    set((s) => ({ clients: [...s.clients, trimmed] }));
    get()._persist();
    get().addToast('تم إضافة العميل: ' + trimmed, 'success');
    return true;
  },

  // ── Campaign actions ──────────────────────────────────────────────────────────
  async saveCampaign(formData, editId) {
    const { clients, campaigns, nextId } = get();

    if (!formData.client) { get().addToast('يرجى اختيار العميل', 'error');    return false; }
    if (!formData.name)   { get().addToast('يرجى إدخال اسم الحملة', 'error'); return false; }

    // Whitelist platform and status to prevent CSS class injection
    const platform = PLATFORMS.includes(formData.platform) ? formData.platform : 'Meta';
    const status   = STATUSES.includes(formData.status)    ? formData.status   : 'Active';

    const budget = parseFloat(formData.totalBudget) || 0;
    const spend  = parseFloat(formData.spend)       || 0;
    const sales  = parseFloat(formData.sales)       || 0;
    const leads  = parseInt(formData.leads,  10)    || 0;
    const reach  = parseInt(formData.reach,  10)    || 0;

    const row = {
      client:      formData.client,
      platform,
      name:        formData.name.trim(),
      totalBudget: budget,
      spend,
      remaining:   parseFloat((budget - spend).toFixed(2)),
      sales,
      reach,
      leads,
      roas:        calcRoas(spend, sales),
      cpl:         calcCpl(spend, leads),
      status,
      startDate:   formData.startDate || '',
      endDate:     formData.endDate   || '',
      notes:       (formData.notes || '').trim(),
    };

    if (editId !== null && editId !== undefined) {
      // ── UPDATE ──────────────────────────────────────────────────────────────
      const idx = campaigns.findIndex((c) => c.id === editId);
      if (idx === -1) { get().addToast('لم يُعثر على الحملة', 'error'); return false; }

      const updated = { ...campaigns[idx], ...row };

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('campaigns')
          .update(toSupabasePayload(updated))
          .eq('id', editId);
        if (error) { get().addToast('فشل التحديث: ' + error.message, 'error'); return false; }
      }

      const newList = [...campaigns];
      newList[idx]  = updated;
      set({ campaigns: newList });
      get()._persist();
      get().addToast('تم تحديث الحملة', 'success');
    } else {
      // ── INSERT ──────────────────────────────────────────────────────────────
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('campaigns')
          .insert(toSupabasePayload(row))
          .select()
          .single();
        if (error) { get().addToast('فشل إضافة الحملة: ' + error.message, 'error'); return false; }
        row.id = data.id; // uuid from Supabase
      } else {
        // Use incrementing ID for localStorage mode
        row.id = nextId;
        set({ nextId: nextId + 1 });
      }

      set((s) => ({ campaigns: [...s.campaigns, row] }));
      get()._persist();
      get().addToast('تم إضافة الحملة', 'success');
    }

    return true;
  },

  async deleteCampaign(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) { get().addToast('فشل الحذف: ' + error.message, 'error'); return; }
    }
    set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) }));
    get()._persist();
    get().addToast('تم حذف الحملة', 'warning');
  },

  async toggleStatus(id) {
    const campaigns = get().campaigns;
    const idx = campaigns.findIndex((c) => c.id === id);
    if (idx === -1) return;

    const order  = STATUSES;
    const newStatus = order[(order.indexOf(campaigns[idx].status) + 1) % order.length];
    const updated   = { ...campaigns[idx], status: newStatus };

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) { get().addToast('فشل تغيير الحالة: ' + error.message, 'error'); return; }
    }

    const newList = [...campaigns];
    newList[idx]  = updated;
    set({ campaigns: newList });
    get()._persist();

    const label = { Active: 'نشطة', Paused: 'متوقفة', Ended: 'منتهية' }[newStatus];
    get().addToast('الحالة: ' + label, 'info');
  },

  // ── Reset ─────────────────────────────────────────────────────────────────────
  async resetAllData() {
    if (isSupabaseConfigured) {
      await Promise.all([
        supabase.from('campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('clients').delete().neq('id',   '00000000-0000-0000-0000-000000000000'),
      ]);
    }
    lsClear();
    set({ clients: [], campaigns: [], nextId: 1 });
  },
}));

// ── Supabase ↔ local shape adapters ──────────────────────────────────────────

function mapSupabaseRow(row) {
  return {
    id:          row.id,
    client:      row.client,
    platform:    row.platform,
    name:        row.name,
    totalBudget: Number(row.budget),
    spend:       Number(row.spend),
    remaining:   parseFloat((Number(row.budget) - Number(row.spend)).toFixed(2)),
    sales:       Number(row.sales),
    reach:       0,                     // not in schema — kept locally
    leads:       Number(row.leads),
    roas:        Number(row.roas),
    cpl:         Number(row.cpl),
    status:      row.status,
    startDate:   '',
    endDate:     '',
    notes:       '',
  };
}

function toSupabasePayload(row) {
  return {
    client:   row.client,
    platform: row.platform,
    name:     row.name,
    budget:   row.totalBudget,
    spend:    row.spend,
    sales:    row.sales,
    leads:    row.leads,
    status:   row.status,
  };
}

export default useStore;
