import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';

/**
 * ClientModal — Bootstrap modal for adding a new client.
 *
 * Props:
 *   onClose  () => void
 */
export default function ClientModal({ onClose }) {
  const addClient = useStore((s) => s.addClient);
  const [name, setName] = useState('');

  const modalRef = useRef(null);
  const bsModal  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!modalRef.current) return;
    bsModal.current = new window.bootstrap.Modal(modalRef.current, { backdrop: 'static' });
    modalRef.current.addEventListener('hidden.bs.modal', onClose);
    modalRef.current.addEventListener('shown.bs.modal', () => inputRef.current?.focus());
    return () => {
      modalRef.current?.removeEventListener('hidden.bs.modal', onClose);
      bsModal.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bsModal.current?.show();
  }, []);

  async function handleAdd() {
    const ok = await addClient(name);
    if (ok) {
      setName('');
      bsModal.current?.hide();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd();
  }

  return (
    <div
      className="modal fade"
      ref={modalRef}
      tabIndex="-1"
      aria-labelledby="clientModalLabel"
      aria-modal="true"
      role="dialog"
    >
      <div className="modal-dialog modal-sm">
        <div className="modal-content">
          <div className="modal-header">
            <h5
              className="modal-title"
              id="clientModalLabel"
              style={{ fontSize: '.95rem', fontWeight: 700 }}
            >
              <i className="fa-solid fa-user-plus me-2 text-primary" />
              عميل جديد
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => bsModal.current?.hide()}
              aria-label="إغلاق"
            />
          </div>
          <div className="modal-body">
            <label className="form-label">اسم العميل</label>
            <input
              ref={inputRef}
              type="text"
              className="form-control"
              placeholder="مثال: شركة النجوم"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-primary w-100"
              style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 700 }}
              onClick={handleAdd}
            >
              <i className="fa-solid fa-save me-1" /> حفظ العميل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
