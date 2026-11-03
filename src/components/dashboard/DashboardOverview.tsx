import React from 'react';
import { useERP } from '../../context/ERPContext';
import {
  TrendingUp,
  Receipt,
  Briefcase,
  AlertCircle,
  ChevronRight,
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
  const categoryList = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);

  // Payment Mode breakdown
  const modeBreakdown: { [mode: string]: number } = { Bank: 0, UPI: 0, Cash: 0 };
  expenses.forEach((e) => {
    if (modeBreakdown[e.payment_mode] !== undefined) {
      modeBreakdown[e.payment_mode] += Number(e.amount) || 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* 4 Primary Financial KPI Cards matching hero grid in price-calculator.html */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Budget */}
        <div className="p-4 bg-[#26221E] rounded-md border border-[#38322C]">
          <div className="flex items-center justify-between text-xs text-[#7C7062] mb-1">
            <span>Approved Budget</span>
            <Briefcase className="w-3.5 h-3.5 text-[#7C7062]" />
          </div>
          <div className="text-2xl font-mono tabular-nums text-[#C9A66B] font-medium">
            <span className="text-xs text-[#7C7062] mr-1 font-sans">{currency}</span>
            {totalApprovedBudget.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#7C7062] mt-2">
            Across {projects.length} contracted projects
          </p>
        </div>

        {/* Expenses Incurred */}
        <div className="p-4 bg-[#26221E] rounded-md border border-[#38322C]">
          <div className="flex items-center justify-between text-xs text-[#7C7062] mb-1">
            <span>Incurred Costs</span>
            <Receipt className="w-3.5 h-3.5 text-[#C9A66B]" />
          </div>
          <div className="text-2xl font-mono tabular-nums text-[#C9A66B] font-medium">
            <span className="text-xs text-[#7C7062] mr-1 font-sans">{currency}</span>
            {totalExpenses.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#7C7062] mt-2">
            <span className="text-[#C9A66B] font-mono">{budgetUtilization.toFixed(1)}%</span> of budget utilized
          </p>
        </div>

        {/* Remaining Pool */}
        <div className="p-4 bg-[#26221E] rounded-md border border-[#38322C]">
          <div className="flex items-center justify-between text-xs text-[#7C7062] mb-1">
            <span>Remaining Balance</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#7C9885]" />
          </div>
          <div className={`text-2xl font-mono tabular-nums font-medium ${totalVariance >= 0 ? 'text-[#7C9885]' : 'text-[#B5766A]'}`}>
            <span className="text-xs text-[#7C7062] mr-1 font-sans">{currency}</span>
            {totalVariance.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#7C7062] mt-2">
            {totalVariance >= 0 ? 'Within approved allocations' : 'Over budget allocation'}
          </p>
        </div>

        {/* Pending Payables */}
        <div className="p-4 bg-[#26221E] rounded-md border border-[#38322C]">
          <div className="flex items-center justify-between text-xs text-[#7C7062] mb-1">
            <span>Pending Payables</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#B4A697]" />
          </div>
          <div className="text-2xl font-mono tabular-nums text-[#F0E9DF] font-medium">
            <span className="text-xs text-[#7C7062] mr-1 font-sans">{currency}</span>
            {pendingExpenses.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#7C7062] mt-2">
            Paid to vendors: {currency} {paidExpenses.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Middle Section: Project Budget Burn Rates & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Project Budget Progress (2 Cols) */}
        <div className="lg:col-span-2 p-5 bg-[#26221E] rounded-md border border-[#38322C]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-[#7C7062]">PROJECT ALLOCATION</p>
              <h2 className="font-display text-base font-semibold text-[#F0E9DF]">
                Budget Utilization & Burn Rate
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-xs text-[#C9A66B] hover:text-[#D9B87C] flex items-center gap-1 font-medium"
            >
              <span>All Projects</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {projects.map((project) => {
              const spent = getProjectSpent(project.id);
              const budget = Number(project.approved_budget) || 1;
              const pct = (spent / budget) * 100;
              const client = getClient(project.client_id);
              const isOver = pct > 100;

              return (
                <div key={project.id} className="p-3.5 rounded bg-[#1E1B18] border border-[#38322C]">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-medium text-xs text-[#F0E9DF]">
                        {project.project_name}
                      </h3>
                      <p className="text-[11px] text-[#7C7062] mt-0.5">
                        Client: {client?.client_name || 'Direct'} · Status: {project.status}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-semibold tabular-nums text-[#C9A66B]">
                        {currency} {spent.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-[#7C7062] font-mono">
                        {' '}/ {currency} {budget.toLocaleString('en-IN')}
                      </span>
                      <p className={`text-[11px] font-mono ${isOver ? 'text-[#B5766A]' : 'text-[#7C9885]'}`}>
                        {pct.toFixed(1)}% spent
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#302A25] h-1.5 rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all duration-300 ${
                        isOver ? 'bg-[#B5766A]' : 'bg-[#C9A66B]'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown & Payment Modes (1 Col) */}
        <div className="space-y-5">
          {/* Category Distribution */}
          <div className="p-5 bg-[#26221E] rounded-md border border-[#38322C]">
            <p className="text-[10.5px] uppercase tracking-wider text-[#7C7062]">BREAKDOWN</p>
            <h2 className="font-display text-base font-semibold text-[#F0E9DF] mb-4">
              Expenses by Category
            </h2>

            <div className="space-y-3">
              {categoryList.map((cat) => {
                const pct = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#B4A697]">{cat.name}</span>
                      <span className="font-mono tabular-nums text-[#F0E9DF] font-medium">
                        {currency} {cat.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#302A25] h-1 rounded overflow-hidden">
                        <div
                          className="h-full bg-[#8A7145] rounded"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[#7C7062] w-7 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Mode Strip */}
          <div className="p-4 bg-[#26221E] rounded-md border border-[#38322C]">
            <p className="text-[10.5px] uppercase tracking-wider text-[#7C7062] mb-2">PAYMENT DISPERSAL</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-[#1E1B18] border border-[#38322C]">
                <p className="text-[10px] text-[#7C7062]">Bank</p>
                <p className="font-mono text-xs font-semibold text-[#F0E9DF] mt-0.5">
                  {currency} {modeBreakdown.Bank?.toLocaleString('en-IN') || 0}
                </p>
              </div>
              <div className="p-2 rounded bg-[#1E1B18] border border-[#38322C]">
                <p className="text-[10px] text-[#7C7062]">UPI</p>
                <p className="font-mono text-xs font-semibold text-[#F0E9DF] mt-0.5">
                  {currency} {modeBreakdown.UPI?.toLocaleString('en-IN') || 0}
                </p>
              </div>
              <div className="p-2 rounded bg-[#1E1B18] border border-[#38322C]">
                <p className="text-[10px] text-[#7C7062]">Cash</p>
                <p className="font-mono text-xs font-semibold text-[#F0E9DF] mt-0.5">
                  {currency} {modeBreakdown.Cash?.toLocaleString('en-IN') || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table (NO ID column!) */}
      <div className="p-5 bg-[#26221E] rounded-md border border-[#38322C]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10.5px] uppercase tracking-wider text-[#7C7062]">RECENT TRANSACTIONS</p>
            <h2 className="font-display text-base font-semibold text-[#F0E9DF]">
              Latest Recorded Expenditures
            </h2>
          </div>
          <button
            onClick={() => setActiveTab('expenses')}
            className="text-xs text-[#C9A66B] hover:text-[#D9B87C] flex items-center gap-1 font-medium"
          >
            <span>Full Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[#7C7062] border-b border-[#38322C]">
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
            <tbody className="divide-y divide-[#38322C]/60 text-[#B4A697]">
              {expenses.slice(0, 5).map((exp) => {
                const proj = getProject(exp.project_id);
                const cat = getExpenseCategory(exp.expense_category_id);
                const vendor = getVendor(exp.vendor_id);
                return (
                  <tr key={exp.id} className="hover:bg-[#302A25]/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#7C7062]">
                      {exp.expense_date}
                    </td>
                    <td className="py-2.5 px-3 text-[#F0E9DF] font-medium">
                      {proj?.project_name || 'Direct Project'}
                    </td>
                    <td className="py-2.5 px-3">
                      {cat?.category_name || 'General'}
                    </td>
                    <td className="py-2.5 px-3 max-w-[200px] truncate">
                      {exp.description}
                    </td>
                    <td className="py-2.5 px-3 text-[#B4A697]">
                      {vendor?.vendor_name || 'Direct Supplier'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-[#C9A66B] font-medium tabular-nums">
                      {currency} {(Number(exp.amount) || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] font-medium ${
                        exp.payment_status === 'Paid'
                          ? 'text-[#7C9885]'
                          : exp.payment_status === 'Partial'
                          ? 'text-[#C9A66B]'
                          : 'text-[#B5766A]'
                      }`}>
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
