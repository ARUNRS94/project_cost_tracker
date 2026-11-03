import React from 'react';
import { useERP } from '../../context/ERPContext';
import { NavTab } from '../../types/erp';
import { 
  Database,
  User,
  Sun,
  Moon,
  LogOut,
  Plus,
} from 'lucide-react';

interface HeaderProps {
  onOpenNewExpense: () => void;
  onOpenDataBackup: () => void;
  onOpenImportMasters: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenNewExpense, 
  onOpenDataBackup,
  onOpenImportMasters,
}) => {
  const { 
    activeTab, 
    setActiveTab, 
    currentUser, 
    logout,
    themeMode,
    toggleThemeMode,
    getUserRoles,
    expenses,
    projects,
    quotations,
  } = useERP();

  const userRolesList = getUserRoles(currentUser.id);
  const primaryRole = userRolesList[0]?.role_name || currentUser.designation || 'Staff';

  const navTabs: { id: NavTab; label: string; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'expenses', label: 'Expense', count: expenses.length },
    { id: 'quotation', label: 'Generate Quotation', count: quotations.length },
    { id: 'masters', label: 'Masters' },
    { id: 'team', label: 'Roles & Permissions' },
  ];

  return (
    <header className="border-b border-[var(--border-soft)] bg-[var(--bg)] px-4 sm:px-6 pt-6 pb-0 transition-colors print:hidden">
      <div className="max-w-[1240px] mx-auto">
        {/* Top brand & meta row */}
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 pb-5 border-b border-[var(--border-soft)]">
          <div>
            <h1 className="font-display font-medium text-2xl md:text-3xl tracking-tight text-[var(--text)]">
              Project Code Tracker
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-dim)] mt-1 max-w-xl">
              Track project expenditures, budgets, client commitments, vendor ledgers, and customized quotations.
            </p>
          </div>

          {/* Right action controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleThemeMode}
              title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-2 text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface)] rounded transition-colors cursor-pointer"
            >
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4 text-[#C9A66B]" />
              ) : (
                <Moon className="w-4 h-4 text-[#A88243]" />
              )}
            </button>

            {/* Data backup / Supabase SQL sync modal */}
            <button
              onClick={onOpenDataBackup}
              title="Import / Export Masters & Supabase DDL Migration"
              className="p-2 text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface)] rounded transition-colors cursor-pointer"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* Signed-in profile display */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs">
              <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-[#1E1B18] font-bold text-[10px] flex items-center justify-center">
                {currentUser.full_name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-[var(--text)] leading-tight">{currentUser.full_name}</span>
                <span className="text-[10px] text-[var(--text-faint)] leading-tight">{primaryRole}</span>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="ml-1.5 pl-2 border-l border-[var(--border)] text-[var(--text-faint)] hover:text-red-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Primary Action Button: Record Expense */}
            <button
              onClick={onOpenNewExpense}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Product / Module Tabs matching price-calculator.html */}
        <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto pt-2 scrollbar-none">
          {navTabs.map((tab) => {
            const isMastersActive = tab.id === 'masters' && ['masters', 'projects', 'clients', 'vendors', 'items', 'categories'].includes(activeTab);
            const isActive = activeTab === tab.id || isMastersActive;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`font-display text-sm sm:text-base py-3 px-1 transition-colors relative whitespace-nowrap shrink-0 ${
                  isActive ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-faint)] hover:text-[var(--text-dim)]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="ml-1.5 font-mono text-[11px] text-[var(--accent)]">({tab.count})</span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
