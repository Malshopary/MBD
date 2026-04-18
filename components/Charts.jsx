import { useEffect, useRef } from 'react';
import {
  Chart,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

// Register only the components we need (tree-shaking friendly)
Chart.register(BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend);
Chart.defaults.font.family = 'Cairo';

const PLATFORM_COLORS = {
  Meta:     '#4f46e5',
  TikTok:   '#0d9488',
  Snapchat: '#ca8a04',
  Google:   '#dc2626',
};
const PLATFORMS = ['Meta', 'TikTok', 'Snapchat', 'Google'];

/**
 * Charts — bar chart (spend vs sales per campaign) + doughnut (budget by platform).
 */
export default function Charts({ campaigns }) {
  const barRef  = useRef(null);
  const pieRef  = useRef(null);
  const barChart = useRef(null);
  const pieChart = useRef(null);

  // ── Bar chart initialisation ────────────────────────────────────────────────
  useEffect(() => {
    const ctx = barRef.current?.getContext('2d');
    if (!ctx) return;

    barChart.current = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Cairo' }, boxWidth: 12, padding: 10 },
          },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Cairo' } } },
          x: { grid: { display: false },                       ticks: { font: { family: 'Cairo' } } },
        },
      },
    });

    return () => barChart.current?.destroy();
  }, []);

  // ── Doughnut chart initialisation ───────────────────────────────────────────
  useEffect(() => {
    const ctx = pieRef.current?.getContext('2d');
    if (!ctx) return;

    pieChart.current = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Cairo' }, boxWidth: 12, padding: 8 },
          },
        },
      },
    });

    return () => pieChart.current?.destroy();
  }, []);

  // ── Update charts when data changes ────────────────────────────────────────
  useEffect(() => {
    if (!barChart.current || !pieChart.current) return;

    if (!campaigns.length) {
      barChart.current.data = { labels: [], datasets: [] };
      pieChart.current.data = { labels: [], datasets: [] };
    } else {
      barChart.current.data = {
        labels: campaigns.map((c) =>
          c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name,
        ),
        datasets: [
          {
            label: 'الإنفاق',
            data: campaigns.map((c) => c.spend),
            backgroundColor: 'rgba(99,102,241,.75)',
            borderRadius: 5,
          },
          {
            label: 'المبيعات',
            data: campaigns.map((c) => c.sales),
            backgroundColor: 'rgba(34,197,94,.75)',
            borderRadius: 5,
          },
        ],
      };

      const vals = PLATFORMS.map((p) =>
        campaigns
          .filter((c) => c.platform === p)
          .reduce((s, c) => s + Number(c.totalBudget), 0),
      );
      const activeIdx = PLATFORMS.reduce((acc, _, i) => {
        if (vals[i] > 0) acc.push(i);
        return acc;
      }, []);

      pieChart.current.data = {
        labels: activeIdx.map((i) => PLATFORMS[i]),
        datasets: [
          {
            data:            activeIdx.map((i) => vals[i]),
            backgroundColor: activeIdx.map((i) => PLATFORM_COLORS[PLATFORMS[i]]),
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      };
    }

    barChart.current.update();
    pieChart.current.update();
  }, [campaigns]);

  return (
    <div className="row g-3 mb-4">
      <div className="col-lg-8">
        <div className="chart-card">
          <h6>
            <i className="fa-solid fa-chart-column text-primary me-2" />
            الإنفاق مقابل المبيعات
          </h6>
          <div className="chart-wrap">
            <canvas ref={barRef} />
          </div>
        </div>
      </div>
      <div className="col-lg-4">
        <div className="chart-card">
          <h6>
            <i className="fa-solid fa-chart-pie me-2" style={{ color: '#6366f1' }} />
            توزيع الميزانية بالمنصة
          </h6>
          <div className="chart-wrap">
            <canvas ref={pieRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
