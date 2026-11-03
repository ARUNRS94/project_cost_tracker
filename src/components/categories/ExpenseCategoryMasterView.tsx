import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ExpenseCategoryMaster, StatusActiveInactive } from '../../types/erp';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

export const ExpenseCategoryMasterView: React.FC = () => {
  const {
    expenseCategories,
    expenses,
    currency,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
  } = useERP();

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#38322C]">
        <div>
          <p className="text-[10.5px] uppercase tracking-wider text-[#7C7062]">CHART OF ACCOUNTS</p>
          <h1 className="font-display font-normal text-2xl text-[#F0E9DF]">
            Expense Categories
          </h1>
          <p className="text-xs text-[#B4A697] mt-0.5">
            Cost booking classifications (Labour, Material, Printing, Logistics, Permits).
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all whitespace-nowrap shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#26221E] rounded-md border border-[#38322C]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7C7062] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories by name or description..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] placeholder-[#7C7062] outline-none"
          />
        </div>

        <div className="flex items-center border border-[#4A4038] rounded overflow-hidden">
          {(['all', 'Active', 'Inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                statusFilter === st
                  ? 'bg-[#8A7145] text-[#1E1B18] font-bold'
                  : 'bg-[#1E1B18] text-[#B4A697] hover:text-[#F0E9DF]'
              }`}
            >
              {st === 'all' ? 'All' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Categories (NO Category ID displayed!) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => {
          const catExpenses = expenses.filter(
            (e) => e.expense_category_id === cat.id
          );
          const totalSpent = catExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

          return (
            <div
              key={cat.id}
              className="p-5 bg-[#26221E] rounded-md border border-[#38322C] flex flex-col justify-between hover:border-[#4A4038] transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                        cat.status === 'Active'
                          ? 'border-[#566A5C] text-[#7C9885] bg-[#1E1B18]'
                          : 'border-[#38322C] text-[#7C7062] bg-[#1E1B18]'
                      }`}
                    >
                      {cat.status}
                    </span>
                    <h3 className="font-display font-medium text-lg text-[#F0E9DF] mt-1.5">
                      {cat.category_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete category "${cat.category_name}"?`)) {
                          deleteExpenseCategory(cat.id);
                        }
                      }}
                      className="p-1.5 text-[#7C7062] hover:text-[#B5766A] rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#B4A697] mt-2">
                  {cat.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#38322C] flex items-center justify-between text-xs">
                <span className="text-[#7C7062]">{catExpenses.length} Transactions</span>
                <span className="font-mono font-medium text-[#C9A66B] tabular-nums">
                  {currency} {totalSpent.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal (NO Category ID input field!) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[#26221E] rounded-md shadow-2xl border border-[#4A4038] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#38322C]">
              <h3 className="font-display text-base font-semibold text-[#F0E9DF]">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category_name}
                    onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                    placeholder="e.g. Labour / Material / Printing"
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as StatusActiveInactive })
                  }
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Scope of expenditures booked under this category..."
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#38322C]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#B4A697] hover:text-[#F0E9DF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all shadow-xs"
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
