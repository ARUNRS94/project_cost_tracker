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
      <div className="relative w-full max-w-2xl bg-[#26221E] rounded-md shadow-2xl border border-[#4A4038] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#38322C]">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F0E9DF]">{title}</h3>
            {subtitle && <p className="text-xs text-[#B4A697] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] hover:border-[#8A7145] border border-transparent rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-[#1E1B18]">
          {imageUrl ? (
            <div className="relative w-full max-h-[60vh] flex flex-col items-center">
              <img
                src={imageUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="max-h-[50vh] w-auto object-contain rounded border border-[#38322C]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('receipt-image-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                id="receipt-image-fallback"
                style={{ display: 'none' }}
                className="w-full h-64 flex flex-col items-center justify-center bg-[#26221E] rounded border border-dashed border-[#4A4038] text-[#B4A697]"
              >
                <ImageIcon className="w-10 h-10 mb-2 text-[#7C7062]" />
                <p className="text-sm font-medium">Document / Receipt Verified on File</p>
                <p className="text-xs text-[#7C7062] mt-1 font-mono">Ref: {referenceNumber || 'Official Invoice'}</p>
              </div>
            </div>
          ) : (
            <div className="w-full py-16 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-[#26221E] border border-[#38322C] flex items-center justify-center text-[#7C7062] mb-3">
                <FileText className="w-7 h-7" />
              </div>
              <p className="text-sm font-medium text-[#F0E9DF]">No physical scan attached</p>
              <p className="text-xs text-[#B4A697] mt-1">
                Transaction reference voucher: <span className="font-mono text-[#C9A66B]">{referenceNumber || 'N/A'}</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#26221E] border-t border-[#38322C] text-xs text-[#B4A697]">
          <div className="flex items-center gap-2">
            <span>Reference:</span>
            <span className="font-mono text-[#C9A66B]">{referenceNumber || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[#4A4038] text-[#B4A697] hover:text-[#F0E9DF] hover:border-[#8A7145] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open File
              </a>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded text-xs font-semibold bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
