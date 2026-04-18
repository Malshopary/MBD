/**
 * KPICards — four summary cards derived from the filtered campaign list.
 */
export default function KPICards({ campaigns }) {
  const spend  = campaigns.reduce((s, c) => s + Number(c.spend),       0);
  const sales  = campaigns.reduce((s, c) => s + Number(c.sales),       0);
  const budget = campaigns.reduce((s, c) => s + Number(c.totalBudget), 0);
  const roas   = spend > 0 ? (sales / spend).toFixed(2) : 0;
  const active = campaigns.filter((c) => c.status === 'Active').length;
  const roasLabel =
    roas >= 3 ? '✅ ممتاز' : roas >= 1.5 ? '⚠️ متوسط' : '❌ ضعيف';

  return (
    <div className="row g-3 mb-4">
      <KPICard
        bg="#eff6ff" color="#3b82f6" icon="fa-circle-dollar-to-slot"
        label="إجمالي الإنفاق"
        value={`$${fmt(spend)}`}
        sub={`من $${fmt(budget)} إجمالي`}
      />
      <KPICard
        bg="#f0fdf4" color="#22c55e" icon="fa-sack-dollar"
        label="إجمالي المبيعات"
        value={`$${fmt(sales)}`}
        sub="عائد على الإنفاق"
      />
      <KPICard
        bg="#eef2ff" color="#6366f1" icon="fa-chart-line"
        label="متوسط ROAS"
        value={`${roas}x`}
        sub={roasLabel}
      />
      <KPICard
        bg="#fef9c3" color="#ca8a04" icon="fa-bullhorn"
        label="حملات نشطة"
        value={active}
        sub={`من ${campaigns.length} حملة إجمالاً`}
      />
    </div>
  );
}

function KPICard({ bg, color, icon, label, value, sub }) {
  return (
    <div className="col-6 col-md-3">
      <div className="kpi-card">
        <div className="kpi-icon" style={{ background: bg }}>
          <i className={`fa-solid ${icon}`} style={{ color }} />
        </div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value" style={{ color }}>{value}</div>
        <div className="kpi-sub">{sub}</div>
      </div>
    </div>
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en');
}
