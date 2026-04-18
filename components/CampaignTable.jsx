import useStore from '../store/useStore';

const PLAT_ICONS = {
  Meta:     'fa-brands fa-facebook',
  TikTok:   'fa-brands fa-tiktok',
  Snapchat: 'fa-brands fa-snapchat',
  Google:   'fa-brands fa-google',
};

const STATUS_LABELS = { Active: 'نشطة', Paused: 'متوقفة', Ended: 'منتهية' };

/**
 * CampaignTable — main data table with filters applied upstream.
 *
 * Props:
 *   campaigns   Campaign[]   — pre-filtered list
 *   onEdit      (id) => void
 */
export default function CampaignTable({ campaigns, onEdit, onAddCampaign }) {
  const deleteCampaign = useStore((s) => s.deleteCampaign);
  const toggleStatus   = useStore((s) => s.toggleStatus);
  const searchQuery    = useStore((s) => s.searchQuery);
  const filterClient   = useStore((s) => s.filterClient);
  const filterPlatform = useStore((s) => s.filterPlatform);
  const filterStatus   = useStore((s) => s.filterStatus);
  const clients        = useStore((s) => s.clients);
  const setSearch      = useStore((s) => s.setSearch);
  const setFilterClient   = useStore((s) => s.setFilterClient);
  const setFilterPlatform = useStore((s) => s.setFilterPlatform);
  const setFilterStatus   = useStore((s) => s.setFilterStatus);

  function handleDelete(id) {
    if (!window.confirm('هل تريد حذف هذه الحملة؟')) return;
    deleteCampaign(id);
  }

  return (
    <>
      {/* ── Topbar filters ── */}
      <div className="topbar">
        <div className="topbar-title">
          <i className="fa-solid fa-chart-bar text-primary me-2" />
          لوحة التحكم
        </div>
        <div className="topbar-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="fa-solid fa-magnifying-glass" />
          </div>

          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="all">جميع العملاء</option>
            {clients.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
            <option value="all">جميع المنصات</option>
            <option value="Meta">Meta</option>
            <option value="TikTok">TikTok</option>
            <option value="Snapchat">Snapchat</option>
            <option value="Google">Google</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">جميع الحالات</option>
            <option value="Active">نشطة</option>
            <option value="Paused">متوقفة</option>
            <option value="Ended">منتهية</option>
          </select>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="table-card">
        <div className="table-card-header">
          <h6>
            <i className="fa-solid fa-table me-2 text-primary" />
            الحملات الإعلانية
          </h6>
          <button
            className="btn btn-primary btn-sm"
            style={{ fontFamily: "'Cairo',sans-serif", fontSize: '.8rem' }}
            onClick={onAddCampaign}
          >
            <i className="fa-solid fa-plus me-1" /> حملة جديدة
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>العميل</th>
                <th>المنصة</th>
                <th>الحملة</th>
                <th>الميزانية / المتبقي</th>
                <th>الإنفاق</th>
                <th>وصول / نتائج</th>
                <th>مبيعات</th>
                <th>ROAS</th>
                <th>CPL</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">
                      <i className="fa-solid fa-inbox" />
                      <div className="fw-bold">لا توجد حملات</div>
                      <small>ابدأ بإضافة عميل ثم حملة جديدة</small>
                    </div>
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => <CampaignRow key={c.id} c={c} onEdit={onEdit} onDelete={handleDelete} onToggle={toggleStatus} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function CampaignRow({ c, onEdit, onDelete, onToggle }) {
  const budget = Number(c.totalBudget) || 0;
  const spend  = Number(c.spend)       || 0;
  const pct    = budget > 0 ? (spend / budget) * 100 : 0;
  const remaining = budget - spend;
  const isLow  = budget > 0 && remaining / budget <= 0.2;
  const roas   = parseFloat(c.roas) || 0;
  const rClass = roas >= 3 ? 'roas-good' : roas >= 1.5 ? 'roas-ok' : 'roas-bad';
  const barClr = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e';

  // Whitelist class names — never interpolate user data into class strings
  const platClass   = ['Meta','TikTok','Snapchat','Google'].includes(c.platform) ? c.platform : 'Meta';
  const statusClass = ['Active','Paused','Ended'].includes(c.status)             ? c.status   : 'Ended';

  return (
    <tr className={isLow ? 'row-low' : ''}>
      <td><strong style={{ fontSize: '.82rem' }}>{c.client}</strong></td>

      <td>
        <span className={`plat-badge plat-${platClass}`}>
          <i className={PLAT_ICONS[c.platform] || 'fa-solid fa-ad'} />
          {c.platform}
        </span>
      </td>

      <td>
        <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{c.name}</div>
        {c.notes && <small className="text-muted">{c.notes}</small>}
      </td>

      <td>
        <div style={{ fontSize: '.78rem' }}>
          <span>${fmt(budget)}</span>
          <span className="text-muted"> / </span>
          <span className={isLow ? 'text-danger fw-bold' : 'text-success'}>
            {isLow && <i className="fa-solid fa-triangle-exclamation me-1" />}
            ${fmt(remaining)} متبقي
          </span>
        </div>
        <div className="budget-bar">
          <div
            className="budget-fill"
            style={{ width: `${Math.min(pct, 100)}%`, background: barClr }}
          />
        </div>
      </td>

      <td style={{ fontWeight: 600 }}>${fmt(spend)}</td>

      <td>
        <small className="text-muted">
          {fmt(c.reach)} وصول<br />{fmt(c.leads)} نتيجة
        </small>
      </td>

      <td style={{ color: '#22c55e', fontWeight: 700 }}>${fmt(c.sales)}</td>

      <td><span className={`roas-badge ${rClass}`}>x{c.roas}</span></td>

      <td style={{ fontSize: '.78rem', color: '#64748b' }}>${c.cpl}</td>

      <td>
        <button
          className={`status-btn s-${statusClass}`}
          onClick={() => onToggle(c.id)}
        >
          {STATUS_LABELS[c.status] || c.status}
        </button>
      </td>

      <td>
        <button
          className="btn-icon btn-edit"
          title="تعديل"
          onClick={() => onEdit(c.id)}
        >
          <i className="fa-solid fa-pen" />
        </button>{' '}
        <button
          className="btn-icon btn-delete"
          title="حذف"
          onClick={() => onDelete(c.id)}
        >
          <i className="fa-solid fa-trash" />
        </button>
      </td>
    </tr>
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en');
}
