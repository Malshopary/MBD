import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';

const EMPTY_FORM = {
  client:      '',
  platform:    'Meta',
  name:        '',
  totalBudget: '',
  spend:       '',
  sales:       '',
  reach:       '',
  leads:       '',
  status:      'Active',
  startDate:   '',
  endDate:     '',
  notes:       '',
};

/**
 * CampaignModal — Bootstrap modal for adding / editing a campaign.
 *
 * Props:
 *   editId      number | string | null  — null means "new campaign"
 *   onClose     () => void
 */
export default function CampaignModal({ editId, onClose }) {
  const clients     = useStore((s) => s.clients);
  const campaigns   = useStore((s) => s.campaigns);
  const saveCampaign = useStore((s) => s.saveCampaign);

  const [form, setForm] = useState(EMPTY_FORM);

  // Derived display values (read-only)
  const remaining = (parseFloat(form.totalBudget) || 0) - (parseFloat(form.spend) || 0);
  const roasVal   = parseFloat(form.spend) > 0
    ? ((parseFloat(form.sales) || 0) / parseFloat(form.spend)).toFixed(2) + 'x'
    : '—';
  const cplVal    = parseFloat(form.leads) > 0
    ? '$' + ((parseFloat(form.spend) || 0) / parseFloat(form.leads)).toFixed(2)
    : '—';

  // ── Bootstrap modal control ─────────────────────────────────────────────────
  const modalRef  = useRef(null);
  const bsModal   = useRef(null);

  useEffect(() => {
    if (!modalRef.current) return;
    // Lazily get Bootstrap from the CDN global
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

  // ── Populate form when editing ──────────────────────────────────────────────
  useEffect(() => {
    if (editId !== null && editId !== undefined) {
      const c = campaigns.find((x) => x.id === editId);
      if (c) {
        setForm({
          client:      c.client,
          platform:    c.platform,
          name:        c.name,
          totalBudget: String(c.totalBudget),
          spend:       String(c.spend),
          sales:       String(c.sales),
          reach:       String(c.reach),
          leads:       String(c.leads),
          status:      c.status,
          startDate:   c.startDate || '',
          endDate:     c.endDate   || '',
          notes:       c.notes     || '',
        });
      }
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editId, campaigns]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    const ok = await saveCampaign(form, editId ?? null);
    if (ok) bsModal.current?.hide();
  }

  return (
    <div
      className="modal fade"
      ref={modalRef}
      tabIndex="-1"
      aria-labelledby="campModalLabel"
      aria-modal="true"
      role="dialog"
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header" style={{ background: '#6366f1' }}>
            <h5
              className="modal-title text-white"
              id="campModalLabel"
              style={{ fontSize: '.95rem', fontWeight: 700 }}
            >
              <i className="fa-solid fa-bullhorn me-2" />
              بيانات الحملة الإعلانية
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => bsModal.current?.hide()}
              aria-label="إغلاق"
            />
          </div>

          <div className="modal-body">
            <div className="row g-3">
              {/* Client */}
              <div className="col-md-6">
                <label className="form-label">العميل *</label>
                <select
                  className="form-select"
                  value={form.client}
                  onChange={(e) => set('client', e.target.value)}
                >
                  <option value="">اختر عميل...</option>
                  {clients.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Platform */}
              <div className="col-md-6">
                <label className="form-label">المنصة *</label>
                <select
                  className="form-select"
                  value={form.platform}
                  onChange={(e) => set('platform', e.target.value)}
                >
                  <option value="Meta">Meta Ads</option>
                  <option value="TikTok">TikTok Ads</option>
                  <option value="Snapchat">Snapchat Ads</option>
                  <option value="Google">Google Ads</option>
                </select>
              </div>

              {/* Campaign name */}
              <div className="col-12">
                <label className="form-label">اسم الحملة *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: حملة رمضان 2025"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </div>

              {/* Budget */}
              <div className="col-md-4">
                <label className="form-label">إجمالي الميزانية ($)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="0"
                  value={form.totalBudget}
                  onChange={(e) => set('totalBudget', e.target.value)}
                />
              </div>

              {/* Spend */}
              <div className="col-md-4">
                <label className="form-label">الإنفاق حتى الآن ($)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="0"
                  value={form.spend}
                  onChange={(e) => set('spend', e.target.value)}
                />
              </div>

              {/* Remaining (read-only) */}
              <div className="col-md-4">
                <label className="form-label">المتبقي ($)</label>
                <input
                  type="number"
                  className="form-control"
                  readOnly
                  value={remaining.toFixed(2)}
                />
              </div>

              {/* Sales */}
              <div className="col-md-4">
                <label className="form-label">المبيعات ($)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="0"
                  value={form.sales}
                  onChange={(e) => set('sales', e.target.value)}
                />
              </div>

              {/* Reach */}
              <div className="col-md-4">
                <label className="form-label">الوصول (Reach)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="0"
                  value={form.reach}
                  onChange={(e) => set('reach', e.target.value)}
                />
              </div>

              {/* Leads */}
              <div className="col-md-4">
                <label className="form-label">النتائج / Leads</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="0"
                  value={form.leads}
                  onChange={(e) => set('leads', e.target.value)}
                />
              </div>

              {/* ROAS (auto) */}
              <div className="col-md-4">
                <label className="form-label">ROAS (تلقائي)</label>
                <input type="text" className="form-control" readOnly value={roasVal} />
              </div>

              {/* CPL (auto) */}
              <div className="col-md-4">
                <label className="form-label">CPL تكلفة النتيجة (تلقائي)</label>
                <input type="text" className="form-control" readOnly value={cplVal} />
              </div>

              {/* Status */}
              <div className="col-md-4">
                <label className="form-label">الحالة</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                >
                  <option value="Active">نشطة</option>
                  <option value="Paused">متوقفة</option>
                  <option value="Ended">منتهية</option>
                </select>
              </div>

              {/* Start date */}
              <div className="col-md-6">
                <label className="form-label">تاريخ البداية</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
              </div>

              {/* End date */}
              <div className="col-md-6">
                <label className="form-label">تاريخ النهاية</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="col-12">
                <label className="form-label">ملاحظات</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="تفاصيل إضافية..."
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-success w-100"
              style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '.9rem' }}
              onClick={handleSave}
            >
              <i className="fa-solid fa-save me-1" /> حفظ الحملة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
