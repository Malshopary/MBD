import useStore from '../store/useStore';

const ICONS = {
  success: 'fa-check-circle',
  error:   'fa-circle-xmark',
  warning: 'fa-triangle-exclamation',
  info:    'fa-circle-info',
};

export default function Toast() {
  const toasts = useStore((s) => s.toasts);

  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item t-${t.type}`}>
          <i className={`fa-solid ${ICONS[t.type] || ICONS.info}`} aria-hidden="true" />
          {/* Use text content — never dangerouslySetInnerHTML — to prevent XSS */}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
