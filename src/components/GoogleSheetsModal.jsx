import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import * as XLSX from 'xlsx';

const APPS_SCRIPT_CODE = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Campaigns') || ss.insertSheet('Campaigns');
  sheet.clear();
  var h = ['العميل','المنصة','الحملة','الميزانية','المتبقي',
           'الإنفاق','الوصول','النتائج','المبيعات','ROAS',
           'CPL','الحالة','البداية','النهاية','ملاحظات'];
  sheet.getRange(1,1,1,h.length).setValues([h]);
  var rows = data.map(function(c){return [c.client,c.platform,c.name,
    c.totalBudget,c.remaining,c.spend,c.reach,c.leads,
    c.sales,c.roas,c.cpl,c.status,c.startDate,c.endDate,c.notes];});
  if(rows.length) sheet.getRange(2,1,rows.length,h.length).setValues(rows);
  return ContentService
    .createTextOutput(JSON.stringify({status:'ok'}))
    .setMimeType(ContentService.MimeType.JSON);
}`;

/**
 * GoogleSheetsModal — modal for CSV export and Google Sheets direct sync.
 *
 * Props:
 *   onClose () => void
 */
export default function GoogleSheetsModal({ onClose }) {
  const campaigns   = useStore((s) => s.campaigns);
  const gsheetsUrl  = useStore((s) => s.gsheetsUrl);
  const setGsheetsUrl = useStore((s) => s.setGsheetsUrl);
  const addToast    = useStore((s) => s.addToast);

  const [urlInput, setUrlInput] = useState(gsheetsUrl);

  const modalRef = useRef(null);
  const bsModal  = useRef(null);

  useEffect(() => {
    if (!modalRef.current) return;
    bsModal.current = new window.bootstrap.Modal(modalRef.current, { backdrop: 'static' });
    modalRef.current.addEventListener('hidden.bs.modal', onClose);
    return () => {
      modalRef.current?.removeEventListener('hidden.bs.modal', onClose);
      bsModal.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bsModal.current?.show();
  }, []);

  // ── CSV export ──────────────────────────────────────────────────────────────
  function exportCSV() {
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

    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `MediaPro_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    // Revoke after a short delay to allow the browser to initiate the download
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    addToast('تم تصدير CSV — يمكن استيراده في Google Sheets', 'success');
  }

  // ── Excel export (also available from here) ─────────────────────────────────
  function exportExcel() {
    if (!campaigns.length) { addToast('لا توجد بيانات', 'warning'); return; }

    const heads = ['العميل','المنصة','الحملة','الميزانية','المتبقي','الإنفاق',
                   'الوصول','النتائج','المبيعات','ROAS','CPL','الحالة','البداية','النهاية','ملاحظات'];
    const rows  = campaigns.map((c) =>
      [c.client, c.platform, c.name, c.totalBudget, c.remaining, c.spend,
       c.reach, c.leads, c.sales, c.roas, c.cpl, c.status, c.startDate, c.endDate, c.notes],
    );

    const ws        = XLSX.utils.aoa_to_sheet([heads, ...rows]);
    ws['!cols']     = heads.map(() => ({ wch: 16 }));

    const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend), 0);
    const totalSales = campaigns.reduce((s, c) => s + Number(c.sales), 0);
    const wsSummary = XLSX.utils.aoa_to_sheet([
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

  // ── GSheets direct sync ─────────────────────────────────────────────────────
  function saveUrl() {
    const url = urlInput.trim();
    if (!url) { addToast('يرجى إدخال الرابط', 'error'); return; }
    setGsheetsUrl(url);
    addToast('تم حفظ رابط Google Sheets', 'success');
  }

  async function syncToGSheets() {
    if (!gsheetsUrl) { addToast('يرجى إعداد رابط Apps Script أولاً', 'warning'); return; }
    if (!campaigns.length)   { addToast('لا توجد بيانات', 'warning'); return; }

    addToast('جاري المزامنة...', 'info');
    try {
      await fetch(gsheetsUrl, {
        method:  'POST',
        mode:    'no-cors',
        body:    JSON.stringify(campaigns),
        headers: { 'Content-Type': 'application/json' },
      });
      addToast('تمت المزامنة مع Google Sheets!', 'success');
    } catch {
      addToast('تحقق من رابط Apps Script', 'error');
    }
  }

  return (
    <div
      className="modal fade"
      ref={modalRef}
      tabIndex="-1"
      aria-labelledby="gsheetsModalLabel"
      aria-modal="true"
      role="dialog"
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header" style={{ background: '#0f9d58' }}>
            <h5
              className="modal-title text-white"
              id="gsheetsModalLabel"
              style={{ fontSize: '.95rem', fontWeight: 700 }}
            >
              <i className="fa-brands fa-google me-2" />
              ربط مع Google Sheets
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => bsModal.current?.hide()}
              aria-label="إغلاق"
            />
          </div>

          <div className="modal-body">
            <div className="alert alert-info mb-3" style={{ fontSize: '.82rem' }}>
              <i className="fa-solid fa-circle-info me-1" />
              اختر طريقة التصدير: CSV للاستيراد اليدوي، أو ربط مباشر عبر Google Apps Script.
            </div>

            <div className="d-flex gap-2 mb-4">
              <button
                className="btn btn-warning flex-fill"
                style={{ fontFamily: "'Cairo',sans-serif", fontSize: '.83rem' }}
                onClick={exportCSV}
              >
                <i className="fa-solid fa-download me-1" /> تحميل CSV (استيراد يدوي)
              </button>
              <button
                className="btn btn-success flex-fill"
                style={{ fontFamily: "'Cairo',sans-serif", fontSize: '.83rem' }}
                onClick={syncToGSheets}
              >
                <i className="fa-brands fa-google me-1" /> مزامنة مباشرة
              </button>
            </div>

            <hr />
            <p className="fw-bold mb-3" style={{ fontSize: '.88rem' }}>
              إعداد المزامنة المباشرة — خطوة بخطوة:
            </p>

            {/* Step 1 */}
            <div className="d-flex gap-3 align-items-start mb-3">
              <span className="step-num">1</span>
              <div>
                <div className="fw-bold" style={{ fontSize: '.83rem' }}>
                  افتح Google Sheets وأنشئ ملف جديد
                </div>
                <div style={{ fontSize: '.75rem', color: '#64748b' }}>
                  ثم من القائمة: Extensions → Apps Script
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="d-flex gap-3 align-items-start mb-3">
              <span className="step-num">2</span>
              <div style={{ width: '100%' }}>
                <div className="fw-bold" style={{ fontSize: '.83rem' }}>
                  الصق هذا الكود واحفظه (Ctrl+S):
                </div>
                <pre className="code-block">{APPS_SCRIPT_CODE}</pre>
              </div>
            </div>

            {/* Step 3 */}
            <div className="d-flex gap-3 align-items-start mb-3">
              <span className="step-num">3</span>
              <div>
                <div className="fw-bold" style={{ fontSize: '.83rem' }}>
                  Deploy → New Deployment → Web app
                </div>
                <div style={{ fontSize: '.75rem', color: '#64748b' }}>
                  Execute as: Me &nbsp;|&nbsp; Who has access: Anyone
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="d-flex gap-3 align-items-start">
              <span className="step-num">4</span>
              <div className="flex-fill">
                <div className="fw-bold mb-1" style={{ fontSize: '.83rem' }}>
                  الصق رابط الـ Web App هنا ثم احفظ:
                </div>
                <div className="d-flex gap-2">
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://script.google.com/macros/s/..."
                    style={{ fontSize: '.8rem' }}
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ fontFamily: "'Cairo',sans-serif", whiteSpace: 'nowrap', fontSize: '.82rem' }}
                    onClick={saveUrl}
                  >
                    حفظ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
