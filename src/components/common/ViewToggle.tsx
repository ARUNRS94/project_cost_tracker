import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { ViewMode } from '../../types/erp';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ mode, onChange }) => {
  return (
    <div className="inline-flex items-center border border-[var(--border)] rounded overflow-hidden bg-[var(--surface)] p-0.5">
      <button
        type="button"
        onClick={() => onChange('grid')}
        title="Grid View"
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
          mode === 'grid'
            ? 'bg-[var(--accent)] text-[#1E1B18] font-semibold'
            : 'text-[var(--text-dim)] hover:text-[var(--text)]'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Grid</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('list')}
        title="List / Table View"
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
          mode === 'list'
            ? 'bg-[var(--accent)] text-[#1E1B18] font-semibold'
            : 'text-[var(--text-dim)] hover:text-[var(--text)]'
        }`}
      >
        <List className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
};
