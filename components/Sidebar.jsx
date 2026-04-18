import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';

/**
 * Sidebar — fixed navigation panel with mobile hamburger support.
 *
 * Props:
 *   onAddClient         () => void  — opens the client modal
 *   onAddCampaign       () => void  — opens the new-campaign modal
 *   onExportExcel       () => void
 *   onExportCSV         () => void
 *   onOpenGSheets       () => void
 *   onResetData         () => void
 */
export default function Sidebar({
  onAddClient,
  onAddCampaign,
  onExportExcel,
  onExportCSV,
  onOpenGSheets,
  onResetData,
}) {
  const clients   = useStore((s) => s.clients);
  const campaigns = useStore((s) => s.campaigns);

  const sidebarRef = useRef(null);
  const overlayRef = useRef(null);

  // ── Mobile sidebar open/close ──────────────────────────────────────────────
  const openSidebar = useCallback(() => {
    sidebarRef.current?.classList.add('sidebar-open');
    overlayRef.current?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }, []);

  const closeSidebar = useCallback(() => {
    sidebarRef.current?.classList.remove('sidebar-open');
    overlayRef.current?.classList.remove('active');
    document.body.style.overflow = '';
  }, []);

  // Reset on desktop resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) closeSidebar();
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [closeSidebar]);

  // Close sidebar after a mobile nav action
  const mobileClose = useCallback(
    (fn) => () => {
      if (window.innerWidth < 768) closeSidebar();
      fn?.();
    },
    [closeSidebar],
  );

  return (
    <>
      {/* ── Hamburger button (mobile only) ── */}
      <button
        className="hamburger-btn"
        aria-label="فتح القائمة"
        aria-expanded="false"
        onClick={openSidebar}
      >
        <i className="fa-solid fa-bars" />
      </button>

      {/* ── Overlay (mobile only) ── */}
      <div
        className="sidebar-overlay"
        ref={overlayRef}
        role="presentation"
        onClick={closeSidebar}
      />

      {/* ── Sidebar ── */}
      <aside className="sidebar" ref={sidebarRef} id="mainSidebar">
        {/* Mobile close */}
        <button
          className="sidebar-close-btn"
          aria-label="إغلاق القائمة"
          onClick={closeSidebar}
        >
          <i className="fa-solid fa-xmark" />
        </button>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="d-flex align-items-center gap-2">
            <div
              style={{
                width: 34, height: 34, background: '#6366f1',
                borderRadius: 9, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <i className="fa-solid fa-chart-pie" style={{ color: '#fff', fontSize: '.9rem' }} />
            </div>
            <div>
              <div className="brand-name">MediaPro OS</div>
              <div className="brand-sub">لوحة المدير الإعلاني</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="nav-section">الرئيسية</div>

          <a href="#" className="active" onClick={(e) => e.preventDefault()}>
            <i className="fa-solid fa-house" /> لوحة التحكم
          </a>

          <a
            href="#"
            onClick={(e) => { e.preventDefault(); mobileClose(onAddClient)(); }}
          >
            <i className="fa-solid fa-user-plus" /> إضافة عميل
          </a>

          <a
            href="#"
            onClick={(e) => { e.preventDefault(); mobileClose(onAddCampaign)(); }}
          >
            <i className="fa-solid fa-plus-circle" /> حملة جديدة
          </a>

          <div className="sidebar-divider" />
          <div className="nav-section">التصدير</div>

          <a
            href="#"
            onClick={(e) => { e.preventDefault(); mobileClose(onExportExcel)(); }}
          >
            <i className="fa-solid fa-file-excel" style={{ color: '#22c55e' }} /> تصدير Excel
          </a>

          <a
            href="#"
            onClick={(e) => { e.preventDefault(); mobileClose(onExportCSV)(); }}
          >
            <i className="fa-solid fa-file-csv" style={{ color: '#f59e0b' }} /> تصدير CSV
          </a>

          <a
            href="#"
            onClick={(e) => { e.preventDefault(); mobileClose(onOpenGSheets)(); }}
          >
            <i className="fa-brands fa-google" style={{ color: '#db4437' }} /> Google Sheets
          </a>

          <div className="sidebar-divider" />

          <a
            href="#"
            className="nav-danger"
            onClick={(e) => { e.preventDefault(); mobileClose(onResetData)(); }}
          >
            <i className="fa-solid fa-trash-can" /> مسح كل البيانات
          </a>
        </nav>

        <div className="sidebar-footer">
          {clients.length} عميل &nbsp;·&nbsp; {campaigns.length} حملة
        </div>
      </aside>
    </>
  );
}
