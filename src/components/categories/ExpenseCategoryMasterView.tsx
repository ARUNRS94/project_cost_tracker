import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ExpenseCategoryMaster, StatusActiveInactive, ViewMode } from '../../types/erp';
import { ViewToggle } from '../common/ViewToggle';
import { exportMasterToCSV, downloadFile } from '../../services/api';
import { Plus, Search, Edit2, Trash2, X, Download, Tags } from 'lucide-react';

export const ExpenseCategoryMasterView: React.FC = () => {
  const {
    expenseCategories,
    expenses,
    currency,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
  } = useERP();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryMaster | null>(null);

  // Form state (NO Category ID field!)
  const initialFormState: Omit<ExpenseCategoryMaster, 'id'> = {
    category_name: '',
    description: '',
    status: 'Active',
  };
  const [formData, setFormData] = useState<Omit<ExpenseCategoryMaster, 'id'> & { id?: number }>(initialFormState);

  const filteredCategories = expenseCategories.filter((cat) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      cat.category_name.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || cat.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ ...initialFormState });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: ExpenseCategoryMaster) => {
    setEditingCategory(c);
    setFormData({ ...c });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_name) {
      alert('Please fill the Category Name.');
      return;
    }

    if (editingCategory) {
      updateExpenseCategory({
        ...editingCategory,
        ...formData,
      } as ExpenseCategoryMaster);
    } else {
      addExpenseCategory({
        category_name: formData.category_name,
        description: formData.description,
        status: formData.status,
      });
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const csv = exportMasterToCSV('ExpenseCategories', expenseCategories);
    downloadFile(csv, `Expense_Categories_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[var(--border-soft)]">
        <div>
          <h2 className="font-display font-medium text-2xl text-[var(--text)]">
            Expense Category Master
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-dim)] mt-0.5">
            Cost heads for labour, raw materials, printing, site clearances, and logistics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            title="Export Categories to CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[var(--surface)] rounded-md border border-[var(--border)]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center border border-[var(--border)] rounded overflow-hidden">
            {(['all', 'Active', 'Inactive'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                  statusFilter === st
                    ? 'bg-[var(--accent)] text-[#1E1B18] font-bold'
                    : 'bg-[var(--bg)] text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>

          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const catExpenses = expenses.filter((e) => e.expense_category_id === cat.id);
            const totalSpent = catExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

            return (
              <div
                key={cat.id}
                className="p-5 bg-[var(--surface)] rounded-md border border-[var(--border-soft)] flex flex-col justify-between hover:border-[var(--border)] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                        cat.status === 'Active'
                          ? 'border-green-800/40 text-green-400 bg-[var(--surface-2)]'
                          : 'border-[var(--border-soft)] text-[var(--text-faint)] bg-[var(--surface-2)]'
                      }`}
                    >
                      {cat.status}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (catExpenses.length > 0) {
                            alert(
                              `Cannot delete category "${cat.category_name}" because ${catExpenses.length} expense vouchers are linked to it.`
                            );
                            return;
                          }
                          if (window.confirm(`Delete category "${cat.category_name}"?`)) {
                            deleteExpenseCategory(cat.id);
                          }
                        }}
                        className="p-1.5 text-[var(--text-faint)] hover:text-red-400 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-display font-medium text-lg text-[var(--text)] mt-1">
                    {cat.category_name}
                  </h3>

                  <p className="text-xs text-[var(--text-dim)] line-clamp-2 mt-1 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[var(--text-faint)] block">
                      Total Expenditure
                    </span>
                    <span className="font-mono font-medium text-[var(--accent)] text-sm">
                      {currency} {totalSpent.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <span className="font-mono text-xs text-[var(--text-faint)] bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--border)]">
                    {catExpenses.length} vouchers
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST / TABLE VIEW */}
      {viewMode === 'list' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-faint)] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Category Name</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Vouchers</th>
                  <th className="py-2.5 px-3 text-right">Total Expenditure</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredCategories.map((cat) => {
                  const catExpenses = expenses.filter((e) => e.expense_category_id === cat.id);
                  const totalSpent = catExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

                  return (
                    <tr key={cat.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-[var(--text)]">
                        {cat.category_name}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-dim)]">{cat.description}</td>
                      <td className="py-3 px-3 font-mono text-center text-[var(--text-dim)]">
                        {catExpenses.length}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--accent)] font-medium">
                        {currency} {totalSpent.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            cat.status === 'Active'
                              ? 'text-green-400 bg-green-950/30'
                              : 'text-[var(--text-faint)] bg-[var(--surface-2)]'
                          }`}
                        >
                          {cat.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (catExpenses.length > 0) {
                              alert(`Cannot delete category "${cat.category_name}" because ${catExpenses.length} expenses are linked to it.`);
                              return;
                            }
                            if (window.confirm(`Delete category "${cat.category_name}"?`)) {
                              deleteExpenseCategory(cat.id);
                            }
                          }}
                          className="p-1 text-[var(--text-faint)] hover:text-red-400 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL (No Category ID field) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="font-display font-medium text-lg text-[var(--text)]">
                  {editingCategory ? 'Edit Expense Category' : 'Add Category'}
                </h3>
                <p className="text-xs text-[var(--text-faint)]">Auto-increment identity in Supabase</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-faint)] hover:text-[var(--text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formData.category_name}
                  onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                  placeholder="e.g. Electrical Components & Power Units"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Scope of expenditure, permissible account heads..."
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as StatusActiveInactive })
                  }
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18]"
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
