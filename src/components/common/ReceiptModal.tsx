import React from 'react';
import { X, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  referenceNumber?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  imageUrl,
  referenceNumber,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-[var(--surface)] rounded-md shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-soft)]">
          <div>
            <h3 className="font-display text-base font-semibold text-[var(--text)]">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--text-dim)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] border border-transparent hover:border-[var(--border)] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-[var(--bg)]">
          {imageUrl ? (
            <div className="relative w-full max-h-[60vh] flex flex-col items-center">
              <img
                src={imageUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="max-h-[50vh] w-auto object-contain rounded border border-[var(--border-soft)]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('receipt-image-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                id="receipt-image-fallback"
                style={{ display: 'none' }}
                className="w-full h-64 flex flex-col items-center justify-center bg-[var(--surface)] rounded border border-dashed border-[var(--border)] text-[var(--text-dim)]"
              >
                <ImageIcon className="w-10 h-10 mb-2 text-[var(--text-faint)]" />
                <p className="text-xs">Document scan preview unavailable</p>
                <p className="text-[11px] text-[var(--text-faint)] mt-1">Image URL not reachable</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-64 flex flex-col items-center justify-center bg-[var(--surface)] rounded border border-dashed border-[var(--border)] text-[var(--text-dim)]">
              <FileText className="w-10 h-10 mb-2 text-[var(--text-faint)]" />
              <p className="text-xs">No scan or invoice bill attached</p>
              <p className="text-[11px] text-[var(--text-faint)] mt-1">
                You can attach a receipt image or document by editing this voucher record.
              </p>
            </div>
          )}

          {referenceNumber && (
            <div className="mt-4 pt-3 border-t border-[var(--border-soft)] w-full flex items-center justify-between text-xs text-[var(--text-faint)] font-mono">
              <span>Invoice / Transaction Ref: {referenceNumber}</span>
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                >
                  <span>Open Full Resolution</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
