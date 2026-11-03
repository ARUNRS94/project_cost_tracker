import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { ExpenseMaster, PaymentMode, PaymentStatus } from '../../types/erp';
import { ReceiptModal } from '../common/ReceiptModal';
import {
  Search,
  Plus,
  Receipt,
  FileImage,
  Edit2,
  Trash2,
  X,
  Calculator,
  ArrowUpDown,
} from 'lucide-react';

interface ExpenseMasterViewProps {
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
}

export const ExpenseMasterView: React.FC<ExpenseMasterViewProps> = ({
  isCreateModalOpen = false,
  onCloseCreateModal,
}) => {
  const {
    expenses,
    projects,
    items,
    expenseCategories,
    vendors,
    currentUser,
    currency,
    addExpense,
    updateExpense,
    deleteExpense,
    getProject,
    getItem,
    getExpenseCategory,
    getVendor,
    getUser,
  } = useERP();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(isCreateModalOpen);
  const [editingExpense, setEditingExpense] = useState<ExpenseMaster | null>(null);

  // Receipt Modal state
  const [viewingReceipt, setViewingReceipt] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    referenceNumber?: string;
  }>({
    isOpen: false,
    title: '',
  });

  // Form states for Add/Edit (NO Expense ID field!)
  const initialFormState: Omit<ExpenseMaster, 'id'> = {
    project_id: projects[0]?.id || 1,
    project_item_id: null,
    expense_date: new Date().toISOString().slice(0, 10),
    expense_category_id: expenseCategories[0]?.id || 1,
    description: '',
    vendor_id: vendors[0]?.id || 1,
    quantity: 1,
    unit: 'Nos',
    rate: 0,
    amount: 0,
    payment_status: 'Paid',
    payment_mode: 'Bank',
    attachment: '',
    reference_number: '',
    remarks: '',
    created_by: currentUser.id,
  };

  const [formData, setFormData] = useState<Omit<ExpenseMaster, 'id'> & { id?: number }>(initialFormState);

  // Filtered & sorted expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q ||
          exp.description.toLowerCase().includes(q) ||
          exp.reference_number.toLowerCase().includes(q) ||
          exp.remarks.toLowerCase().includes(q) ||
          getProject(exp.project_id)?.project_name.toLowerCase().includes(q) ||
          getVendor(exp.vendor_id)?.vendor_name.toLowerCase().includes(q);

        const matchesProject = selectedProject === 'all' || exp.project_id === parseInt(selectedProject, 10);
        const matchesCat = selectedCategory === 'all' || exp.expense_category_id === parseInt(selectedCategory, 10);
        const matchesVendor = selectedVendor === 'all' || exp.vendor_id === parseInt(selectedVendor, 10);
        const matchesStatus =
          selectedPaymentStatus === 'all' || exp.payment_status === selectedPaymentStatus;
        const matchesMode = selectedPaymentMode === 'all' || exp.payment_mode === selectedPaymentMode;

        return matchesSearch && matchesProject && matchesCat && matchesVendor && matchesStatus && matchesMode;
      })
      .sort((a, b) => {
        if (sortField === 'amount') {
          return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
        }
        return sortOrder === 'asc'
          ? a.expense_date.localeCompare(b.expense_date)
          : b.expense_date.localeCompare(a.expense_date);
      });
  }, [
    expenses,
    searchTerm,
    selectedProject,
    selectedCategory,
    selectedVendor,
    selectedPaymentStatus,
    selectedPaymentMode,
    sortField,
    sortOrder,
    getProject,
    getVendor,
  ]);

  // Aggregate sums
  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const paidFilteredAmount = filteredExpenses
    .filter((e) => e.payment_status === 'Paid')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const pendingFilteredAmount = totalFilteredAmount - paidFilteredAmount;

  // Open modal for Create (NO ID input field needed)
  const handleOpenCreate = () => {
    setEditingExpense(null);
    setFormData({
      ...initialFormState,
      project_id: projects[0]?.id || 1,
      expense_category_id: expenseCategories[0]?.id || 1,
      vendor_id: vendors[0]?.id || 1,
      created_by: currentUser.id,
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (exp: ExpenseMaster) => {
    setEditingExpense(exp);
    setFormData({ ...exp });
    setIsModalOpen(true);
  };

  // Handle auto-calc on Qty or Rate change
  const handleQtyRateChange = (field: 'quantity' | 'rate', value: number) => {
    const updated = { ...formData, [field]: value };
    const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
    const rate = Number(field === 'rate' ? value : updated.rate) || 0;
    if (qty > 0 && rate > 0) {
      updated.amount = Math.round(qty * rate);
    }
    setFormData(updated);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.amount) {
      alert('Please fill in required fields: Project and Amount.');
      return;
    }

    if (editingExpense) {
      updateExpense({
        ...editingExpense,
        ...formData,
      } as ExpenseMaster);
    } else {
      addExpense({
        project_id: Number(formData.project_id),
        project_item_id: formData.project_item_id ? Number(formData.project_item_id) : null,
        expense_date: formData.expense_date,
        expense_category_id: Number(formData.expense_category_id),
        description: formData.description || 'General expense entry',
        vendor_id: Number(formData.vendor_id),
        quantity: formData.quantity ? Number(formData.quantity) : null,
        unit: formData.unit || null,
        rate: formData.rate ? Number(formData.rate) : null,
        amount: Number(formData.amount) || 0,
        payment_status: formData.payment_status,
        payment_mode: formData.payment_mode,
        attachment: formData.attachment || '',
        reference_number: formData.reference_number || 'N/A',
        remarks: formData.remarks || '',
        created_by: formData.created_by || currentUser.id,
      });
    }

    setIsModalOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#38322C]">
        <div>
          <p className="text-[10.5px] uppercase tracking-wider text-[#7C7062]">EXPENDITURE LEDGER</p>
          <h1 className="font-display font-normal text-2xl text-[#F0E9DF]">
            Expense Master
          </h1>
          <p className="text-xs text-[#B4A697] mt-0.5">
            Log site expenditures, vendor vouchers, material orders, and payment statuses.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all whitespace-nowrap shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Aggregate Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#26221E] rounded-md border border-[#38322C]">
        <div className="px-2">
          <p className="text-[10.5px] text-[#7C7062] uppercase tracking-wider">
            Total Incurred ({filteredExpenses.length} Records)
          </p>
          <p className="text-xl font-mono text-[#C9A66B] font-medium tabular-nums mt-0.5">
            {currency} {totalFilteredAmount.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="px-2 border-t sm:border-t-0 sm:border-l border-[#38322C]">
          <p className="text-[10.5px] text-[#7C7062] uppercase tracking-wider">
            Paid & Settled
          </p>
          <p className="text-xl font-mono text-[#7C9885] font-medium tabular-nums mt-0.5">
            {currency} {paidFilteredAmount.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="px-2 border-t sm:border-t-0 sm:border-l border-[#38322C]">
          <p className="text-[10.5px] text-[#7C7062] uppercase tracking-wider">
            Unpaid / Outstanding
          </p>
          <p className="text-xl font-mono text-[#F0E9DF] font-medium tabular-nums mt-0.5">
            {currency} {pendingFilteredAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-[#26221E] rounded-md border border-[#38322C] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7C7062] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses by description, vendor, invoice ref..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] placeholder-[#7C7062] focus:border-[#8A7145] outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-[#7C7062] hover:text-[#F0E9DF]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Project Filter */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="text-xs bg-[#1E1B18] border border-[#4A4038] rounded px-2.5 py-1.5 text-[#F0E9DF] outline-none cursor-pointer"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name.slice(0, 24)}...
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-[#1E1B18] border border-[#4A4038] rounded px-2.5 py-1.5 text-[#F0E9DF] outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category_name}
                </option>
              ))}
            </select>

            {/* Payment Status Filter */}
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="text-xs bg-[#1E1B18] border border-[#4A4038] rounded px-2.5 py-1.5 text-[#F0E9DF] outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
            </select>

            {/* Payment Mode Filter */}
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              className="text-xs bg-[#1E1B18] border border-[#4A4038] rounded px-2.5 py-1.5 text-[#F0E9DF] outline-none cursor-pointer"
            >
              <option value="all">All Modes</option>
              <option value="Bank">Bank</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
            </select>

            {/* Clear button */}
            {(selectedProject !== 'all' ||
              selectedCategory !== 'all' ||
              selectedPaymentStatus !== 'all' ||
              selectedPaymentMode !== 'all' ||
              searchTerm) && (
              <button
                onClick={() => {
                  setSelectedProject('all');
                  setSelectedCategory('all');
                  setSelectedVendor('all');
                  setSelectedPaymentStatus('all');
                  setSelectedPaymentMode('all');
                  setSearchTerm('');
                }}
                className="text-xs text-[#B5766A] hover:underline px-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Expense Table (NO ID column!) */}
      <div className="bg-[#26221E] rounded-md border border-[#38322C] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#1E1B18] text-[#7C7062] border-b border-[#38322C]">
              <tr>
                <th
                  onClick={() => {
                    if (sortField === 'date') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('date');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3 px-3.5 font-normal text-[10.5px] uppercase cursor-pointer hover:text-[#F0E9DF]"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase">Project & Item</th>
                <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase">Category</th>
                <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase">Description</th>
                <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase">Vendor</th>
                <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase text-right">Qty & Rate</th>
                <th
                  onClick={() => {
                    if (sortField === 'amount') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('amount');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3 px-3.5 font-normal text-[10.5px] uppercase text-right cursor-pointer hover:text-[#F0E9DF]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase">Status / Mode</th>
                <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase">Invoice Ref</th>
                <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase text-center">Receipt</th>
                <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#38322C]/70 text-[#B4A697]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#7C7062]">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#C9A66B]" />
                    <p className="text-xs font-medium text-[#F0E9DF]">No expense records found</p>
                    <p className="text-[11px] text-[#7C7062] mt-1">
                      Click "+ Record New Expense" above to add an entry.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const proj = getProject(exp.project_id);
                  const item = getItem(exp.project_item_id || undefined);
                  const cat = getExpenseCategory(exp.expense_category_id);
                  const vendor = getVendor(exp.vendor_id);

                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-[#302A25]/50 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-[#7C7062]">
                        {exp.expense_date}
                      </td>

                      {/* Project & Item Name (NO IDs!) */}
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-[#F0E9DF]">
                          {proj ? proj.project_name : 'Direct Project'}
                        </div>
                        {item && (
                          <div className="text-[11px] text-[#7C7062]">
                            ↳ {item.item_name}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3.5 text-[#B4A697]">
                        {cat?.category_name || 'General'}
                      </td>

                      {/* Description */}
                      <td
                        className="py-3 px-3.5 text-[#F0E9DF] max-w-[220px] truncate"
                        title={exp.description}
                      >
                        {exp.description}
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-3.5 text-[#B4A697]">
                        {vendor ? vendor.vendor_name : 'Direct'}
                      </td>

                      {/* Qty & Rate */}
                      <td className="py-3 px-3.5 font-mono text-right tabular-nums text-[#7C7062]">
                        {exp.quantity && exp.rate ? (
                          <>
                            <span>{exp.quantity} {exp.unit || ''}</span>
                            <span className="text-[10px] block text-[#7C7062]">
                              @ {currency} {exp.rate.toLocaleString('en-IN')}
                            </span>
                          </>
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3.5 font-mono font-medium text-[#C9A66B] text-right tabular-nums text-sm">
                        {currency} {(Number(exp.amount) || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Status / Mode */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold text-[11px] ${
                              exp.payment_status === 'Paid'
                                ? 'text-[#7C9885]'
                                : exp.payment_status === 'Partial'
                                ? 'text-[#C9A66B]'
                                : 'text-[#B5766A]'
                            }`}
                          >
                            {exp.payment_status}
                          </span>
                          <span className="text-[#4A4038]">·</span>
                          <span className="font-mono text-[11px] text-[#7C7062]">
                            {exp.payment_mode}
                          </span>
                        </div>
                      </td>

                      {/* Invoice Ref */}
                      <td className="py-3 px-3.5 font-mono text-xs text-[#7C7062]">
                        {exp.reference_number || '—'}
                      </td>

                      {/* Attachment preview */}
                      <td className="py-3 px-3.5 text-center">
                        {exp.attachment ? (
                          <button
                            onClick={() =>
                              setViewingReceipt({
                                isOpen: true,
                                title: `Receipt: ${exp.description}`,
                                subtitle: `${proj?.project_name || ''} · ${exp.reference_number}`,
                                imageUrl: exp.attachment,
                                referenceNumber: exp.reference_number,
                              })
                            }
                            className="inline-flex items-center justify-center p-1.5 text-[#C9A66B] hover:text-[#D9B87C] rounded transition-colors"
                            title="Inspect Bill / Scan"
                          >
                            <FileImage className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[#4A4038] text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this expense entry?')) {
                              deleteExpense(exp.id);
                            }
                          }}
                          className="p-1 text-[#7C7062] hover:text-[#B5766A] rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Expense Modal (NO ID INPUT FIELDS!) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-[#26221E] rounded-md shadow-2xl border border-[#4A4038] overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#38322C]">
              <div>
                <h3 className="font-display text-base font-semibold text-[#F0E9DF]">
                  {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
                </h3>
                <p className="text-xs text-[#B4A697] mt-0.5">
                  Allocate project cost, vendor bill details, and payment settlement
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  if (onCloseCreateModal) onCloseCreateModal();
                }}
                className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project Selection (NO ID!) */}
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Project *
                  </label>
                  <select
                    required
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: parseInt(e.target.value, 10) })}
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expense Date */}
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full text-xs font-mono p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>

                {/* Expense Category (NO ID!) */}
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Expense Category *
                  </label>
                  <select
                    required
                    value={formData.expense_category_id}
                    onChange={(e) => setFormData({ ...formData, expense_category_id: parseInt(e.target.value, 10) })}
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vendor / Supplier (NO ID!) */}
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Vendor / Supplier *
                  </label>
                  <select
                    required
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: parseInt(e.target.value, 10) })}
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendor_name} ({v.vendor_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Catalog Item (Optional, NO ID!) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Catalog Item Reference (Optional)
                  </label>
                  <select
                    value={formData.project_item_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        project_item_id: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  >
                    <option value="">None / General Site Expense</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.item_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. 4mm cast acrylic sheet cutting & transportation"
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              {/* Quantity, Rate, Amount (Live Calc) */}
              <div className="p-3 bg-[#1E1B18] rounded border border-[#38322C] space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-[#C9A66B] font-medium">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Cost Computation (Quantity × Rate)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-[#7C7062] mb-1">Quantity</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.quantity || ''}
                      onChange={(e) => handleQtyRateChange('quantity', parseFloat(e.target.value) || 0)}
                      placeholder="1"
                      className="w-full text-xs font-mono p-1.5 rounded border border-[#4A4038] bg-[#26221E] text-[#F0E9DF] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#7C7062] mb-1">Unit</label>
                    <input
                      type="text"
                      value={formData.unit || ''}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="Sheets, Nos, Hrs"
                      className="w-full text-xs p-1.5 rounded border border-[#4A4038] bg-[#26221E] text-[#F0E9DF] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#7C7062] mb-1">Rate ({currency})</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.rate || ''}
                      onChange={(e) => handleQtyRateChange('rate', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-xs font-mono p-1.5 rounded border border-[#4A4038] bg-[#26221E] text-[#F0E9DF] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#C9A66B] mb-1">
                      Final Amount * ({currency})
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full text-xs font-mono font-bold p-1.5 rounded border border-[#C9A66B] bg-[#26221E] text-[#C9A66B] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Payment Status *
                  </label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_status: e.target.value as PaymentStatus })
                    }
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_mode: e.target.value as PaymentMode })
                    }
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  >
                    <option value="Bank">Bank / NEFT / RTGS</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cash">Cash Petty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Invoice / Transaction Ref
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="INV-2026/891 or UTR..."
                    className="w-full text-xs font-mono p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Bill / Voucher Scan (URL or Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.attachment}
                    onChange={(e) => setFormData({ ...formData, attachment: e.target.value })}
                    placeholder="https://... image link"
                    className="flex-1 text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                  <label className="px-3 py-2 border border-[#4A4038] hover:border-[#8A7145] text-[#B4A697] hover:text-[#F0E9DF] text-xs font-medium rounded cursor-pointer transition-colors shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setFormData({ ...formData, attachment: evt.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Optional site inspection notes, verification status..."
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#38322C]">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    if (onCloseCreateModal) onCloseCreateModal();
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#B4A697] hover:text-[#F0E9DF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all shadow-xs"
                >
                  {editingExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={viewingReceipt.isOpen}
        onClose={() => setViewingReceipt({ ...viewingReceipt, isOpen: false })}
        title={viewingReceipt.title}
        subtitle={viewingReceipt.subtitle}
        imageUrl={viewingReceipt.imageUrl}
        referenceNumber={viewingReceipt.referenceNumber}
      />
    </div>
  );
};
