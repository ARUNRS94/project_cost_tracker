import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ProjectMasterView } from '../projects/ProjectMasterView';
import { ClientMasterView } from '../clients/ClientMasterView';
import { VendorMasterView } from '../vendors/VendorMasterView';
import { ItemMasterView } from '../items/ItemMasterView';
import { ExpenseCategoryMasterView } from '../categories/ExpenseCategoryMasterView';
import {
  Upload,
  FolderKanban,
  Users,
  Truck,
  Package,
  Layers,
} from 'lucide-react';

export type MasterSubTab = 'projects' | 'clients' | 'vendors' | 'items' | 'categories';

interface MastersViewProps {
  initialSubTab?: MasterSubTab;
  onOpenImport: (master: 'clients' | 'projects' | 'vendors' | 'items' | 'categories') => void;
}

export const MastersView: React.FC<MastersViewProps> = ({
  initialSubTab = 'projects',
  onOpenImport,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<MasterSubTab>(initialSubTab);
  const { projects, clients, vendors, items, expenseCategories } = useERP();

  const subTabs: { id: MasterSubTab; label: string; count: number; icon: React.ReactNode }[] = [
    {
      id: 'projects',
      label: 'Projects',
      count: projects.length,
      icon: <FolderKanban className="w-3.5 h-3.5" />,
    },
    {
      id: 'clients',
      label: 'Clients',
      count: clients.length,
      icon: <Users className="w-3.5 h-3.5" />,
    },
    {
      id: 'vendors',
      label: 'Vendors',
      count: vendors.length,
      icon: <Truck className="w-3.5 h-3.5" />,
    },
    {
      id: 'items',
      label: 'Items & Catalog',
      count: items.length,
      icon: <Package className="w-3.5 h-3.5" />,
    },
    {
      id: 'categories',
      label: 'Categories',
      count: expenseCategories.length,
      icon: <Layers className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Masters Header & Central Import CSV Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
              Core Data Masters
            </span>
          </div>
          <h1 className="font-display font-medium text-2xl text-[var(--text)] mt-1">
            Masters Directory
          </h1>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            Unified management for projects, clients, suppliers, materials catalog, and expense codes.
          </p>
        </div>

        {/* Unified Common Import CSV Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenImport(activeSubTab)}
            title={`Import CSV data for ${subTabs.find(t => t.id === activeSubTab)?.label || 'Masters'}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-Master Tab Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[var(--border-soft)]">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-md transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--accent)] font-semibold shadow-xs'
                  : 'bg-[var(--surface)] text-[var(--text-dim)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-soft)]'
              }`}
            >
              <span className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-faint)]'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-[var(--accent)] text-[#1E1B18] font-bold'
                    : 'bg-[var(--bg)] text-[var(--text-faint)]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Sub-Master View Content */}
      <div className="pt-1">
        {activeSubTab === 'projects' && <ProjectMasterView />}
        {activeSubTab === 'clients' && <ClientMasterView />}
        {activeSubTab === 'vendors' && <VendorMasterView />}
        {activeSubTab === 'items' && <ItemMasterView />}
        {activeSubTab === 'categories' && <ExpenseCategoryMasterView />}
      </div>
    </div>
  );
};
