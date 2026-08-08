import { useState, useEffect, useCallback } from 'react';
import { FiX, FiCheck, FiAlertCircle, FiInfo } from 'react-icons/fi';

/**
 * Toast notification system.
 * Usage: const { addToast } = useToast()
 *        addToast('Repository indexed!', 'success')
 */

let toastId = 0;
let listeners = [];

export function addToast(message, type = 'info', duration = 4000) {
  const id = ++toastId;
  const toast = { id, message, type, duration };
  listeners.forEach((fn) => fn(toast));
  return id;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (toast) => {
      setToasts((prev) => [...prev, toast]);
      if (toast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);
      }
    };

    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  const dismiss = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    success: <FiCheck className="h-4 w-4 text-green-400" />,
    error: <FiAlertCircle className="h-4 w-4 text-red-400" />,
    info: <FiInfo className="h-4 w-4 text-surface-500" />,
    warning: <FiAlertCircle className="h-4 w-4 text-amber-400" />,
  };

  const borders = {
    success: 'border-green-500/20',
    error: 'border-red-500/20',
    info: 'border-surface-400/20',
    warning: 'border-amber-500/20',
  };

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-slide-in-right flex items-center gap-3 rounded-xl border
                      dark:bg-surface-800/95 bg-white/95 backdrop-blur-sm
                      px-4 py-3 shadow-lg ${borders[toast.type] || borders.info}`}
        >
          {icons[toast.type] || icons.info}
          <p className="text-sm dark:text-surface-200 text-surface-700">{toast.message}</p>
          <button
            onClick={() => dismiss(toast.id)}
            className="ml-2 rounded-md p-1 dark:hover:bg-surface-700 hover:bg-surface-100 transition-colors"
          >
            <FiX className="h-3.5 w-3.5 dark:text-surface-400 text-surface-500" />
          </button>
        </div>
      ))}
    </div>
  );
}
