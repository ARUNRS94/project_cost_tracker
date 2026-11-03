import React from 'react';
import { useERP } from '../../context/ERPContext';
import {
  TrendingUp,
  Receipt,
  Briefcase,
  AlertCircle,
  ChevronRight,
  Plus,
} from 'lucide-react';

interface DashboardOverviewProps {
  onOpenNewExpense: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onOpenNewExpense }) => {
  const {
    projects,
    expenses,
    currency,
    setActiveTab,
    getProject,
    getProjectSpent,
    getExpenseCategory,
    getClient,
    getVendor,
  } = useERP();

  // Metrics
  const totalApprovedBudget = projects.reduce((acc, p) => acc + (Number(p.approved_budget) || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalVariance = totalApprovedBudget - totalExpenses;
  const budgetUtilization = totalApprovedBudget > 0 ? (totalExpenses / totalApprovedBudget) * 100 : 0;

  const paidExpenses = expenses
    .filter((e) => e.payment_status === 'Paid')
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const pendingExpenses = expenses
    .filter((e) => e.payment_status === 'Unpaid' || e.payment_status === 'Partial')
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // Group by category
  const categoryMap: { [catName: string]: { name: string; amount: number; count: number } } = {};
  expenses.forEach((e) => {
    const cat = getExpenseCategory(e.expense_category_id);
    const catName = cat?.category_name || 'General';
    if (!categoryMap[catName]) {
      categoryMap[catName] = { name: catName, amount: 0, count: 0 };
    }
    categoryMap[catName].amount += Number(e.amount) || 0;
    categoryMap[catName].count += 1;
  });

  const categoriesRanked = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* 4 Primary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Budget */}
        <div className="p-4 bg-[var(--surface)] rounded-md border border-[var(--border-soft)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-faint)] mb-1">
            <span>Approved Budget</span>
            <Briefcase className="w-3.5 h-3.5 text-[var(--text-faint)]" />
          </div>
          <div className="text-2xl font-mono tabular-nums text-[var(--accent)] font-medium">
            <span className="text-xs text-[var(--text-faint)] mr-1 font-sans">{currency}</span>
            {totalApprovedBudget.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[var(--text-faint)] mt-2">
            Across {projects.length} contracted projects
          </p>
        </div>

        {/* Expenses Incurred */}
        <div className="p-4 bg-[var(--surface)] rounded-md border border-[var(--border-soft)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-faint)] mb-1">
            <span>Incurred Costs</span>
            <Receipt className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <div className="text-2xl font-mono tabular-nums text-[var(--accent)] font-medium">
            <span className="text-xs text-[var(--text-faint)] mr-1 font-sans">{currency}</span>
            {totalExpenses.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[var(--text-faint)] mt-2">
            <span className="text-[var(--accent)] font-mono">{budgetUtilization.toFixed(1)}%</span> of budget utilized
          </p>
        </div>

        {/* Remaining Pool */}
        <div className="p-4 bg-[var(--surface)] rounded-md border border-[var(--border-soft)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-faint)] mb-1">
            <span>Remaining Balance</span>
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
          </div>
          <div className={`text-2xl font-mono tabular-nums font-medium ${totalVariance >= 0 ? 'text-green-500' : 'text-red-400'}`}>
            <span className="text-xs text-[var(--text-faint)] mr-1 font-sans">{currency}</span>
            {totalVariance.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[var(--text-faint)] mt-2">
            {totalVariance >= 0 ? 'Within approved allocations' : 'Over budget allocation'}
          </p>
        </div>

        {/* Pending Payables */}
        <div className="p-4 bg-[var(--surface)] rounded-md border border-[var(--border-soft)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-faint)] mb-1">
            <span>Pending Payables</span>
            <AlertCircle className="w-3.5 h-3.5 text-[var(--text-dim)]" />
          </div>
          <div className="text-2xl font-mono tabular-nums text-[var(--text)] font-medium">
            <span className="text-xs text-[var(--text-faint)] mr-1 font-sans">{currency}</span>
            {pendingExpenses.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[var(--text-faint)] mt-2">
            Paid to vendors: {currency} {paidExpenses.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Middle Section: Project Budget Burn Rates & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Project Budget Progress */}
        <div className="lg:col-span-2 p-5 bg-[var(--surface)] rounded-md border border-[var(--border-soft)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-[var(--text-faint)] font-mono">PROJECT ALLOCATION</p>
              <h2 className="font-display text-base font-semibold text-[var(--text)]">
                Budget Utilization & Burn Rate
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-mono"
            >
              <span>View Projects</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {projects.map((p) => {
              const spent = getProjectSpent(p.id);
              const budget = Number(p.approved_budget) || 1;
              const pct = (spent / budget) * 100;
              const client = getClient(p.client_id);

              return (
                <div key={p.id} className="p-3 bg-[var(--bg)] rounded border border-[var(--border)]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="font-medium text-[var(--text)] truncate max-w-sm">
                      {p.project_name}
                      <span className="text-[11px] text-[var(--text-faint)] ml-2">
                        ({client?.client_name || 'Independent'})
                      </span>
                    </div>
                    <div className="font-mono text-xs text-[var(--text)] tabular-nums">
                      {currency} {spent.toLocaleString('en-IN')} / {currency} {budget.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-500 ${
                        pct > 100
                          ? 'bg-red-500'
                          : pct > 80
                          ? 'bg-amber-400'
                          : 'bg-[var(--accent)]'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-[var(--text-faint)] mt-1.5 font-mono">
                    <span>Status: {p.status}</span>
                    <span>{pct.toFixed(1)}% burned</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="p-5 bg-[var(--surface)] rounded-md border border-[var(--border-soft)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-[var(--text-faint)] font-mono">COST HEADS</p>
              <h2 className="font-display text-base font-semibold text-[var(--text)]">
                Category Distribution
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('categories')}
              className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-mono"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {categoriesRanked.slice(0, 6).map((c) => {
              const share = totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0;
              return (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text)] font-medium">{c.name}</span>
                    <span className="font-mono text-[var(--text)] tabular-nums">
                      {currency} {c.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="h-1 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full"
                      style={{ width: `${share}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10.5px] text-[var(--text-faint)] font-mono">
                    <span>{c.count} expense vouchers</span>
                    <span>{share.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Expenditures Ledger Table */}
      <div className="p-5 bg-[var(--surface)] rounded-md border border-[var(--border-soft)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10.5px] uppercase tracking-wider text-[var(--text-faint)] font-mono">ACTIVITY STREAM</p>
            <h2 className="font-display text-base font-semibold text-[var(--text)]">
              Latest Expense Vouchers
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenNewExpense}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-[var(--accent)] text-[#1E1B18] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record</span>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-mono"
            >
              <span>Full Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[var(--surface-2)] text-[var(--text-faint)] border-b border-[var(--border-soft)] font-mono">
              <tr>
                <th className="py-2.5 px-3 font-normal text-[10.5px] uppercase">Date</th>
                <th className="py-2.5 px-3 font-normal text-[10.5px] uppercase">Project</th>
                <th className="py-2.5 px-3 font-normal text-[10.5px] uppercase">Category</th>
                <th className="py-2.5 px-3 font-normal text-[10.5px] uppercase">Description</th>
                <th className="py-2.5 px-3 font-normal text-[10.5px] uppercase">Vendor</th>
                <th className="py-2.5 px-3 font-normal text-[10.5px] uppercase text-right">Amount</th>
                <th className="py-2.5 px-3 font-normal text-[10.5px] uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)] text-[var(--text-dim)]">
              {expenses.slice(0, 5).map((exp) => {
                const proj = getProject(exp.project_id);
                const cat = getExpenseCategory(exp.expense_category_id);
                const vendor = getVendor(exp.vendor_id);
                return (
                  <tr key={exp.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-faint)]">
                      {exp.expense_date}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text)] font-medium">
                      {proj?.project_name || 'Direct Project'}
                    </td>
                    <td className="py-2.5 px-3">
                      {cat?.category_name || 'General'}
                    </td>
                    <td className="py-2.5 px-3 max-w-[200px] truncate">
                      {exp.description}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-dim)]">
                      {vendor?.vendor_name || 'Direct Supplier'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[var(--accent)] font-medium">
                      {currency} {Number(exp.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          exp.payment_status === 'Paid'
                            ? 'bg-green-950/20 text-green-400 border-green-800/30'
                            : 'bg-amber-950/20 text-amber-400 border-amber-800/30'
                        }`}
                      >
                        {exp.payment_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
