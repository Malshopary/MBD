import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

import useStore from './store/useStore';
import { isSupabaseConfigured } from './lib/supabase';

import Sidebar            from './components/Sidebar';
import KPICards           from './components/KPICards';
import Charts             from './components/Charts';
import CampaignTable      from './components/CampaignTable';
import CampaignModal      from './components/CampaignModal';
import ClientModal        from './components/ClientModal';
import GoogleSheetsModal  from './components/GoogleSheetsModal';
import Toast              from './components/Toast';

// ── Modal identifiers ────────────────────────────────────────────────────────
const MODAL = {
  NONE:     null,
  CLIENT:   'client',
  CAMPAIGN: 'campaign',
  GSHEETS:  'gsheets',
};

export default function App() {
  const bootstrapFromSupabase = useStore((s) => s.bootstrapFromSupabase);
  const loading               = useStore((s) => s.loading);
  const campaigns             = useStore((s) => s.campaigns);
  const addToast              = useStore((s) => s.addToast);
  const resetAllData          = useStore((s) => s.resetAllData);

  // Filter state (read from store)
  const searchQuery    = useStore((s) => s.searchQuery);
  const filterClient   = useStore((s) => s.filterClient);
  const filterPlatform = useStore((s) => s.filterPlatform);
  const filterStatus   = useStore((s) => s.filterStatus);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState(MODAL.NONE);
  const [editCampaignId, setEditCampaignId] = useState(null);

  // ── Bootstrap Supabase on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (isSupabaseConfigured) bootstrapFromSupabase();
  }, [bootstrapFromSupabase]);

  // ── Derived: filtered campaigns ──────────────────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return campaigns.filter((c) => {
      if (filterClient   !== 'all' && c.client   !== filterClient)   return false;
      if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;
      if (filterStatus   !== 'all' && c.status   !== filterStatus)   return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.client.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [campaigns, searchQuery, filterClient, filterPlatform, filterStatus]);

  // ── Modal openers ────────────────────────────────────────────────────────────
  function openAddCampaign() {
    setEditCampaignId(null);
    setActiveModal(MODAL.CAMPAIGN);
  }

  function openEditCampaign(id) {
    setEditCampaignId(id);
    setActiveModal(MODAL.CAMPAIGN);
  }

  // ── Export to Excel ──────────────────────────────────────────────────────────
  function exportToExcel() {
    if (!campaigns.length) { addToast('لا توجد بيانات', 'warning'); return; }

    const heads = ['العميل','المنصة','الحملة','الميزانية','المتبقي','الإنفاق',
                   'الوصول','النتائج','المبيعات','ROAS','CPL','الحالة','البداية','النهاية','ملاحظات'];
    const rows  = campaigns.map((c) =>
      [c.client, c.platform, c.name, c.totalBudget, c.remaining, c.spend,
       c.reach, c.leads, c.sales, c.roas, c.cpl, c.status, c.startDate, c.endDate, c.notes],
    );

    const ws    = XLSX.utils.aoa_to_sheet([heads, ...rows]);
    ws['!cols'] = heads.map(() => ({ wch: 16 }));

    const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend), 0);
    const totalSales = campaigns.reduce((s, c) => s + Number(c.sales), 0);
    const wsSummary  = XLSX.utils.aoa_to_sheet([
      ['البيان', 'القيمة'],
      ['إجمالي الإنفاق',  `$${totalSpend}`],
      ['إجمالي المبيعات', `$${totalSales}`],
      ['متوسط ROAS',      totalSpend > 0 ? (totalSales / totalSpend).toFixed(2) + 'x' : '0x'],
      ['عدد الحملات',     campaigns.length],
      ['الحملات النشطة',  campaigns.filter((c) => c.status === 'Active').length],
      ['تاريخ التصدير',   new Date().toLocaleDateString('ar-SA')],
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws,        'الحملات');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص');
    XLSX.writeFile(wb, `MediaPro_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('تم تصدير Excel بنجاح!', 'success');
  }

  // ── Export to CSV ────────────────────────────────────────────────────────────
  function exportToCSV() {
    if (!campaigns.length) { addToast('لا توجد بيانات', 'warning'); return; }

    const heads = ['العميل','المنصة','الحملة','الميزانية','المتبقي','الإنفاق',
                   'الوصول','النتائج','المبيعات','ROAS','CPL','الحالة','البداية','النهاية'];
    const rows = campaigns.map((c) =>
      [c.client, c.platform, c.name, c.totalBudget, c.remaining, c.spend,
       c.reach, c.leads, c.sales, c.roas, c.cpl, c.status, c.startDate, c.endDate]
        .map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"')
        .join(','),
    );

    const csv  = '\uFEFF' + [heads.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);

    const a    = document.createElement('a');
    a.href     = url;
    a.download = `MediaPro_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    addToast('تم تصدير CSV', 'success');
  }

  // ── Reset all data ───────────────────────────────────────────────────────────
  async function handleReset() {
    if (!window.confirm('سيتم مسح كل البيانات نهائياً. هل أنت متأكد؟')) return;
    await resetAllData();
    addToast('تم مسح جميع البيانات', 'warning');
  }

  // ── Loading screen (Supabase bootstrap in progress) ──────────────────────────
  if (loading) {
    return (
      <div className="loading-overlay">
        <i className="fa-solid fa-spinner fa-spin" />
        جاري تحميل البيانات...
      </div>
    );
  }

  return (
    <>
      <Sidebar
        onAddClient={  () => setActiveModal(MODAL.CLIENT)}
        onAddCampaign={ openAddCampaign }
        onExportExcel={ exportToExcel }
        onExportCSV={   exportToCSV }
        onOpenGSheets={ () => setActiveModal(MODAL.GSHEETS) }
        onResetData={   handleReset }
      />

      <div className="main-content">
        {/* CampaignTable includes the topbar filters inline */}
        <CampaignTable
          campaigns={filteredCampaigns}
          onEdit={openEditCampaign}
          onAddCampaign={openAddCampaign}
        />

        <div className="page-content">
          <KPICards campaigns={filteredCampaigns} />
          <Charts   campaigns={filteredCampaigns} />
        </div>
      </div>

      {/* ── Modals ── */}
      {activeModal === MODAL.CLIENT   && (
        <ClientModal   onClose={() => setActiveModal(MODAL.NONE)} />
      )}
      {activeModal === MODAL.CAMPAIGN && (
        <CampaignModal
          editId={editCampaignId}
          onClose={() => { setActiveModal(MODAL.NONE); setEditCampaignId(null); }}
        />
      )}
      {activeModal === MODAL.GSHEETS  && (
        <GoogleSheetsModal onClose={() => setActiveModal(MODAL.NONE)} />
      )}

      <Toast />
    </>
  );
}
