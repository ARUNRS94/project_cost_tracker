import React from 'react';
import { useERP } from '../../context/ERPContext';
import { NavTab } from '../../types/erp';
import { 
  Plus, 
  Database,
  User,
} from 'lucide-react';

interface HeaderProps {
  onOpenNewExpense: () => void;
  onOpenDataBackup: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewExpense, onOpenDataBackup }) => {
  const { 
    activeTab, 
    setActiveTab, 
    currency,
    setCurrency,
    currentUser, 
    users, 
    setCurrentUser,
    getUserRoles,
    expenses,
    projects,
  } = useERP();

  const userRolesList = getUserRoles(currentUser.id);
  const primaryRole = userRolesList[0]?.role_name || 'Admin';

  const navTabs: { id: NavTab; label: string; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'expenses', label: 'Expenses', count: expenses.length },
    { id: 'projects', label: 'Projects', count: projects.length },
    { id: 'clients', label: 'Clients' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'items', label: 'Items & Catalog' },
    { id: 'categories', label: 'Categories' },
    { id: 'team', label: 'Team & Roles' },
  ];

  return (
    <header className="border-b border-[#38322C] bg-[#1E1B18] px-6 pt-7 pb-0">
      <div className="max-w-[1240px] mx-auto">
        {/* Top brand & meta row matching price-calculator.html */}
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 pb-5 border-b border-[#38322C]/70">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#26221E] border border-[#4A4038] text-[#C9A66B] font-medium tracking-wide">
                PROJECT OPERATIONS
              </span>
              <span className="text-xs text-[#7C7062] font-mono">Auto-increment Supabase Schema</span>
            </div>
            <h1 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-[#F0E9DF]">
              Project Code Tracker
            </h1>
            <p className="text-sm text-[#B4A697] mt-1 max-w-xl">
              Track project expenditures, budgets, client commitments, and vendor procurement ledgers.
            </p>
          </div>

          {/* Right action controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Currency toggle */}
            <div className="flex items-center border border-[#4A4038] rounded overflow-hidden">
              <button
                onClick={() => setCurrency('₹')}
                className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                  currency === '₹'
                    ? 'bg-[#8A7145] text-[#1E1B18] font-bold'
                    : 'bg-[#1E1B18] text-[#B4A697] hover:text-[#F0E9DF]'
                }`}
              >
                Rs.
              </button>
              <button
                onClick={() => setCurrency('$')}
                className={`px-3 py-1.5 text-xs font-mono transition-colors border-l border-[#4A4038] ${
                  currency === '$'
                    ? 'bg-[#8A7145] text-[#1E1B18] font-bold'
                    : 'bg-[#1E1B18] text-[#B4A697] hover:text-[#F0E9DF]'
                }`}
              >
                $ USD
              </button>
            </div>

            {/* Active user role simulation */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#26221E] border border-[#4A4038] rounded">
              <User className="w-3.5 h-3.5 text-[#C9A66B]" />
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const selected = users.find((u) => u.id === parseInt(e.target.value, 10));
                  if (selected) setCurrentUser(selected);
                }}
                className="text-xs bg-transparent border-none text-[#F0E9DF] outline-none cursor-pointer pr-1"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-[#26221E] text-[#F0E9DF]">
                    {u.full_name} ({primaryRole})
                  </option>
                ))}
              </select>
            </div>

            {/* Data backup button */}
            <button
              onClick={onOpenDataBackup}
              title="Database Backup & JSON Sync"
              className="p-2 text-[#B4A697] hover:text-[#F0E9DF] border border-[#4A4038] hover:border-[#8A7145] rounded transition-colors"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* Primary Action Button */}
            <button
              onClick={onOpenNewExpense}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Product / Module Tabs matching price-calculator.html */}
        <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto pt-2 scrollbar-none">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`font-display text-sm sm:text-base py-3 px-1 transition-colors relative whitespace-nowrap shrink-0 ${
                  isActive ? 'text-[#F0E9DF] font-medium' : 'text-[#7C7062] hover:text-[#B4A697]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="ml-1.5 font-mono text-[11px] text-[#C9A66B]">({tab.count})</span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C9A66B]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
