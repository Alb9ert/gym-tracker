import { ReactNode, useEffect } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl pt-3 pb-safe max-h-[92vh] overflow-y-auto shadow-2xl border-t border-border-subtle">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        {title && (
          <div className="flex items-center justify-between px-5 mb-5 border-b border-border-subtle pb-4">
            <h2 className="text-lg font-bold text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-secondary text-lg font-medium"
            >
              &times;
            </button>
          </div>
        )}
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
