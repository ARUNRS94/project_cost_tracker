import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { ExpenseMaster, PaymentMode, PaymentStatus } from '../../types/erp';
import {
  X,
  Calculator,
  Plus,
  Trash2,
  Copy,
  Check,
  Building2,
  Layers,
  Receipt,
  FileImage,
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExpense?: ExpenseMaster | null;
  defaultProjectId?: number;
}

interface ExpenseDraftItem {
  id: string; // unique local ID for React key
  project_item_id: number | null;
  expense_date: string;
  expense_category_id: number;
  description: string;
  vendor_id: number;
  quantity: number | null;
  unit: string;
  rate: number | null;
  amount: number;
  payment_status: PaymentStatus;
  payment_mode: PaymentMode;
  attachment: string;
  reference_number: string;
  remarks: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  editingExpense = null,
  defaultProjectId,
}) => {
  const {
    projects,
    expenseCategories,
    vendors,
    items,
    currentUser,
    currency,
    addExpense,
    updateExpense,
    getClient,
  } = useERP();

  const [formError, setFormError] = useState<string | null>(null);

  // Selected Project (shared across all multi-expense rows)
  const [selectedProjectId, setSelectedProjectId] = useState<number>(
    defaultProjectId || projects[0]?.id || 1
  );

  // Helper to create a new blank expense draft row
  const createBlankItem = (seed?: Partial<ExpenseDraftItem>): ExpenseDraftItem => ({
    id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    project_item_id: seed?.project_item_id ?? null,
    expense_date: seed?.expense_date || new Date().toISOString().slice(0, 10),
    expense_category_id: seed?.expense_category_id || expenseCategories[0]?.id || 1,
    description: seed?.description || '',
    vendor_id: seed?.vendor_id || vendors[0]?.id || 1,
    quantity: seed?.quantity ?? 1,
    unit: seed?.unit || 'Nos',
    rate: seed?.rate ?? 0,
    amount: seed?.amount ?? 0,
    payment_status: seed?.payment_status || 'Paid',
    payment_mode: seed?.payment_mode || 'Bank',
    attachment: seed?.attachment || '',
    reference_number: seed?.reference_number || '',
    remarks: seed?.remarks || '',
  });

  // Multiple expense items list
  const [expenseItems, setExpenseItems] = useState<ExpenseDraftItem[]>([]);

  // Single edit form state (when editing existing expense)
  const [singleEditData, setSingleEditData] = useState<ExpenseMaster | null>(null);

  // Reset and populate form on open
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (editingExpense) {
        setSelectedProjectId(editingExpense.project_id);
        setSingleEditData({ ...editingExpense });
        setExpenseItems([]);
      } else {
        const initialProj = defaultProjectId || projects[0]?.id || 1;
        setSelectedProjectId(initialProj);
        setSingleEditData(null);
        setExpenseItems([createBlankItem()]);
      }
    }
  }, [isOpen, editingExpense, defaultProjectId]);

  if (!isOpen) return null;

  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const currentClient = currentProject ? getClient(currentProject.client_id) : null;

  // Filter catalog items for the selected project
  const projectSpecificItems = items.filter(
    (i) => !i.project_id || i.project_id === selectedProjectId
  );

  // Multi-item handlers
  const handleUpdateItem = (id: string, updates: Partial<ExpenseDraftItem>) => {
    setExpenseItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };

        // Auto-calculate amount if quantity or rate was updated
        if ('quantity' in updates || 'rate' in updates) {
          const qty = Number(updates.quantity !== undefined ? updates.quantity : updated.quantity) || 0;
          const rate = Number(updates.rate !== undefined ? updates.rate : updated.rate) || 0;
          if (qty > 0 && rate > 0) {
            updated.amount = Math.round(qty * rate);
          }
        }
        return updated;
      })
    );
  };

  const handleAddItem = () => {
    // Inherit the date and vendor from the last row for quick sequential logging
    const lastItem = expenseItems[expenseItems.length - 1];
    setExpenseItems((prev) => [
      ...prev,
      createBlankItem({
        expense_date: lastItem?.expense_date,
        vendor_id: lastItem?.vendor_id,
        payment_mode: lastItem?.payment_mode,
        payment_status: lastItem?.payment_status,
      }),
    ]);
  };

  const handleDuplicateItem = (itemToCopy: ExpenseDraftItem) => {
    setExpenseItems((prev) => [
      ...prev,
      createBlankItem({
        ...itemToCopy,
        description: `${itemToCopy.description} (Copy)`,
      }),
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (expenseItems.length <= 1) return;
    setExpenseItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Single edit handlers
  const handleSingleFieldChange = (field: keyof ExpenseMaster, value: any) => {
    if (!singleEditData) return;
    const updated = { ...singleEditData, [field]: value };
    if (field === 'quantity' || field === 'rate') {
      const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
      const rate = Number(field === 'rate' ? value : updated.rate) || 0;
      if (qty > 0 && rate > 0) {
        updated.amount = Math.round(qty * rate);
      }
    }
    setSingleEditData(updated);
  };

  // Grand Total computation for multi-item mode
  const multiGrandTotal = expenseItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId) {
      setFormError('Please select a project.');
      return;
    }

    if (editingExpense && singleEditData) {
      if (!singleEditData.amount || singleEditData.amount <= 0) {
        setFormError('Please enter a valid expense amount greater than 0.');
        return;
      }
      if (!singleEditData.description.trim()) {
        setFormError('Please enter an expense description.');
        return;
      }

      updateExpense({
        ...singleEditData,
        project_id: selectedProjectId,
      });
      onClose();
      return;
    }

    // Multi-expense create mode
    if (expenseItems.length === 0) {
      setFormError('Please add at least one expense item.');
      return;
    }

    for (let i = 0; i < expenseItems.length; i++) {
      const item = expenseItems[i];
      if (!item.description.trim()) {
        setFormError(`Expense #${i + 1} is missing a description.`);
        return;
      }
      if (!item.amount || item.amount <= 0) {
        setFormError(`Expense #${i + 1} ("${item.description || 'Untitled'}") must have an amount greater than 0.`);
        return;
      }
    }

    // Save all expense rows
    expenseItems.forEach((item) => {
      addExpense({
        project_id: selectedProjectId,
        project_item_id: item.project_item_id ? Number(item.project_item_id) : null,
        expense_date: item.expense_date,
        expense_category_id: Number(item.expense_category_id),
        description: item.description.trim(),
        vendor_id: Number(item.vendor_id),
        quantity: item.quantity ? Number(item.quantity) : null,
        unit: item.unit || null,
        rate: item.rate ? Number(item.rate) : null,
        amount: Number(item.amount) || 0,
        payment_status: item.payment_status,
        payment_mode: item.payment_mode,
        attachment: item.attachment || '',
        reference_number: item.reference_number || 'N/A',
        remarks: item.remarks || '',
        created_by: currentUser.id,
      });
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-[var(--surface)] text-[var(--text)] rounded-lg shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border-soft)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-semibold text-[var(--text)]">
                  {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
                </h3>
                {!editingExpense && expenseItems.length > 1 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent)] text-[#1E1B18]">
                    {expenseItems.length} Expenses
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-dim)] mt-0.5">
                {editingExpense
                  ? 'Update expenditure allocation and settlement details'
                  : 'Add single or multiple expenses for the selected project in one session'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {formError && (
            <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded text-xs font-medium flex items-center justify-between">
              <span>{formError}</span>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-red-400 hover:text-red-200 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Top Project Selector (Shared across all multi-expenses) */}
            <div className="p-4 rounded-lg bg-[var(--bg)] border border-[var(--border)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[var(--accent)]" />
                  <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text)]">
                    Target Project *
                  </label>
                </div>
                {currentClient && (
                  <span className="text-[11px] font-mono text-[var(--text-dim)]">
                    Client: <strong className="text-[var(--text)]">{currentClient.client_name}</strong>
                  </span>
                )}
              </div>

              <select
                required
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(parseInt(e.target.value, 10))}
                className="w-full text-xs p-2.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none font-medium"
              >
                {projects.map((p) => {
                  const client = getClient(p.client_id);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.project_name} {client ? `(${client.client_name})` : ''} · Budget: {currency}{' '}
                      {Number(p.approved_budget).toLocaleString('en-IN')}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* SINGLE EDIT MODE FORM */}
            {editingExpense && singleEditData && (
              <div className="space-y-4 p-4 rounded-lg bg-[var(--surface-2)]/30 border border-[var(--border)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Expense Date */}
                  <div>
                    <label className="block text-xs text-[var(--text-dim)] mb-1">Expense Date *</label>
                    <input
                      type="date"
                      required
                      value={singleEditData.expense_date}
                      onChange={(e) => handleSingleFieldChange('expense_date', e.target.value)}
                      className="w-full text-xs font-mono p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                    />
                  </div>

                  {/* Expense Category */}
                  <div>
                    <label className="block text-xs text-[var(--text-dim)] mb-1">Expense Category *</label>
                    <select
                      required
                      value={singleEditData.expense_category_id}
                      onChange={(e) =>
                        handleSingleFieldChange('expense_category_id', parseInt(e.target.value, 10))
                      }
                      className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                    >
                      {expenseCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vendor / Supplier */}
                  <div>
                    <label className="block text-xs text-[var(--text-dim)] mb-1">Vendor / Supplier *</label>
                    <select
                      required
                      value={singleEditData.vendor_id}
                      onChange={(e) =>
                        handleSingleFieldChange('vendor_id', parseInt(e.target.value, 10))
                      }
                      className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                    >
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vendor_name} ({v.vendor_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Catalog Item Reference */}
                  <div>
                    <label className="block text-xs text-[var(--text-dim)] mb-1">Catalog Item (Optional)</label>
                    <select
                      value={singleEditData.project_item_id || ''}
                      onChange={(e) =>
                        handleSingleFieldChange(
                          'project_item_id',
                          e.target.value ? parseInt(e.target.value, 10) : null
                        )
                      }
                      className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                    >
                      <option value="">None / General Site Expense</option>
                      {projectSpecificItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.item_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-[var(--text-dim)] mb-1">Expense Description *</label>
                  <input
                    type="text"
                    required
                    value={singleEditData.description}
                    onChange={(e) => handleSingleFieldChange('description', e.target.value)}
                    placeholder="e.g. 4mm cast acrylic sheet cutting & transportation"
                    className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                  />
                </div>

                {/* Live Computation Strip */}
                <div className="p-3 bg-[var(--bg)] rounded border border-[var(--border)] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--accent)] font-medium">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Cost Computation (Quantity × Rate)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-[var(--text-faint)] mb-1">Quantity</label>
                      <input
                        type="number"
                        step="any"
                        value={singleEditData.quantity ?? ''}
                        onChange={(e) =>
                          handleSingleFieldChange('quantity', parseFloat(e.target.value) || 0)
                        }
                        className="w-full text-xs font-mono p-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-faint)] mb-1">Unit</label>
                      <input
                        type="text"
                        value={singleEditData.unit ?? ''}
                        onChange={(e) => handleSingleFieldChange('unit', e.target.value)}
                        className="w-full text-xs p-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                        Rate ({currency})
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={singleEditData.rate ?? ''}
                        onChange={(e) =>
                          handleSingleFieldChange('rate', parseFloat(e.target.value) || 0)
                        }
                        className="w-full text-xs font-mono p-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--accent)] mb-1">
                        Final Amount * ({currency})
                      </label>
                      <input
                        type="number"
                        required
                        step="any"
                        value={singleEditData.amount}
                        onChange={(e) =>
                          handleSingleFieldChange('amount', parseFloat(e.target.value) || 0)
                        }
                        className="w-full text-xs font-mono font-bold p-1.5 rounded border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Settlement Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--text-dim)] mb-1">Payment Status *</label>
                    <select
                      value={singleEditData.payment_status}
                      onChange={(e) =>
                        handleSingleFieldChange('payment_status', e.target.value as PaymentStatus)
                      }
                      className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-dim)] mb-1">Payment Mode *</label>
                    <select
                      value={singleEditData.payment_mode}
                      onChange={(e) =>
                        handleSingleFieldChange('payment_mode', e.target.value as PaymentMode)
                      }
                      className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                    >
                      <option value="Bank">Bank / NEFT / RTGS</option>
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Cash">Cash Petty</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-dim)] mb-1">Invoice / Reference No</label>
                    <input
                      type="text"
                      value={singleEditData.reference_number}
                      onChange={(e) => handleSingleFieldChange('reference_number', e.target.value)}
                      className="w-full text-xs font-mono p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                    />
                  </div>
                </div>

                {/* Bill Scan Upload */}
                <div>
                  <label className="block text-xs text-[var(--text-dim)] mb-1">
                    Bill / Voucher Scan (Upload or URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={singleEditData.attachment}
                      onChange={(e) => handleSingleFieldChange('attachment', e.target.value)}
                      placeholder="https://... image link or upload photo"
                      className="flex-1 text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                    />
                    <label className="px-3 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-dim)] hover:text-[var(--text)] text-xs font-medium rounded cursor-pointer transition-colors shrink-0">
                      Upload
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              handleSingleFieldChange('attachment', event.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {singleEditData.attachment && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={singleEditData.attachment}
                        alt="Receipt Preview"
                        className="w-12 h-12 object-cover rounded border border-[var(--border)]"
                      />
                      <span className="text-[11px] text-green-500 flex items-center gap-1 font-mono">
                        <Check className="w-3.5 h-3.5" /> Voucher attached
                      </span>
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs text-[var(--text-dim)] mb-1">Remarks & Site Notes</label>
                  <textarea
                    rows={2}
                    value={singleEditData.remarks}
                    onChange={(e) => handleSingleFieldChange('remarks', e.target.value)}
                    placeholder="Optional site inspection notes, verification status..."
                    className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* MULTI-EXPENSE ENTRY MODE */}
            {!editingExpense && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-[var(--border-soft)]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--accent)]" />
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text)]">
                      Project Expense Items ({expenseItems.length})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] text-[#1E1B18] hover:opacity-90 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Expense</span>
                  </button>
                </div>

                {/* List of Expense Item Cards */}
                <div className="space-y-4">
                  {expenseItems.map((item, index) => {
                    const itemCat = expenseCategories.find((c) => c.id === item.expense_category_id);
                    const itemVendor = vendors.find((v) => v.id === item.vendor_id);

                    return (
                      <div
                        key={item.id}
                        className="p-4 sm:p-5 rounded-lg bg-[var(--surface-2)]/30 border border-[var(--border)] hover:border-[var(--border-soft)] transition-all space-y-3 relative group"
                      >
                        {/* Row Header with Badge, Duplicate & Delete */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-soft)]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)]">
                              #{index + 1}
                            </span>
                            <span className="text-xs font-medium text-[var(--text)]">
                              {item.description || 'New Expense Line'}
                            </span>
                            {item.amount > 0 && (
                              <span className="font-mono text-xs font-semibold text-[var(--accent)] ml-1">
                                · {currency} {Number(item.amount).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateItem(item)}
                              title="Duplicate this expense entry"
                              className="inline-flex items-center gap-1 p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded transition-colors text-xs cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-[11px] font-mono">Duplicate</span>
                            </button>

                            {expenseItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                title="Remove this expense"
                                className="inline-flex items-center gap-1 p-1.5 text-[var(--text-faint)] hover:text-red-400 rounded transition-colors text-xs cursor-pointer ml-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-[11px] font-mono">Delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Top Row: Date, Category, Vendor, Catalog Item */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Expense Date */}
                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Expense Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={item.expense_date}
                              onChange={(e) => handleUpdateItem(item.id, { expense_date: e.target.value })}
                              className="w-full text-xs font-mono p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                            />
                          </div>

                          {/* Expense Category */}
                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Category *
                            </label>
                            <select
                              required
                              value={item.expense_category_id}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  expense_category_id: parseInt(e.target.value, 10),
                                })
                              }
                              className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                            >
                              {expenseCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.category_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Vendor / Supplier */}
                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Vendor *
                            </label>
                            <select
                              required
                              value={item.vendor_id}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { vendor_id: parseInt(e.target.value, 10) })
                              }
                              className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                            >
                              {vendors.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.vendor_name} ({v.vendor_type})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Catalog Item Reference */}
                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Catalog Item (Optional)
                            </label>
                            <select
                              value={item.project_item_id || ''}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  project_item_id: e.target.value ? parseInt(e.target.value, 10) : null,
                                })
                              }
                              className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                            >
                              <option value="">General Project Cost</option>
                              {projectSpecificItems.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.item_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                            Expense Description *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                            placeholder="e.g. Scaffolding rental, CNC cutting, timber ply supply..."
                            className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                          />
                        </div>

                        {/* Computation Strip: Qty, Unit, Rate, Final Amount */}
                        <div className="p-3 bg-[var(--bg)] rounded border border-[var(--border)]">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div>
                              <label className="block text-[10.5px] text-[var(--text-faint)] mb-1">
                                Quantity
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={item.quantity ?? ''}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, {
                                    quantity: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="1"
                                className="w-full text-xs font-mono p-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10.5px] text-[var(--text-faint)] mb-1">
                                Unit
                              </label>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                                placeholder="Nos, Sqft, Days"
                                className="w-full text-xs p-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10.5px] text-[var(--text-faint)] mb-1">
                                Rate ({currency})
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={item.rate ?? ''}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, {
                                    rate: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="0.00"
                                className="w-full text-xs font-mono p-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10.5px] font-semibold text-[var(--accent)] mb-1">
                                Final Amount * ({currency})
                              </label>
                              <input
                                type="number"
                                required
                                step="any"
                                value={item.amount}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, {
                                    amount: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full text-xs font-mono font-bold p-1.5 rounded border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Payment & Settlement Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Payment Status *
                            </label>
                            <select
                              value={item.payment_status}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  payment_status: e.target.value as PaymentStatus,
                                })
                              }
                              className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                            >
                              <option value="Paid">Paid</option>
                              <option value="Unpaid">Unpaid</option>
                              <option value="Partial">Partial</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Payment Mode *
                            </label>
                            <select
                              value={item.payment_mode}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  payment_mode: e.target.value as PaymentMode,
                                })
                              }
                              className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                            >
                              <option value="Bank">Bank / NEFT / RTGS</option>
                              <option value="UPI">UPI / QR Code</option>
                              <option value="Cash">Cash Petty</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Invoice / UTR Reference
                            </label>
                            <input
                              type="text"
                              value={item.reference_number}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { reference_number: e.target.value })
                              }
                              placeholder="INV-2026/01 or Transaction ID"
                              className="w-full text-xs font-mono p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                            />
                          </div>
                        </div>

                        {/* Bill Voucher Scan & Remarks */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Bill / Voucher Scan (Upload or URL)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={item.attachment}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, { attachment: e.target.value })
                                }
                                placeholder="https://... image link or upload"
                                className="flex-1 text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                              />
                              <label className="px-2.5 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-dim)] hover:text-[var(--text)] text-xs font-medium rounded cursor-pointer transition-colors shrink-0">
                                Upload
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        handleUpdateItem(item.id, {
                                          attachment: event.target?.result as string,
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            {item.attachment && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <img
                                  src={item.attachment}
                                  alt="Preview"
                                  className="w-8 h-8 object-cover rounded border border-[var(--border)]"
                                />
                                <span className="text-[10px] text-green-500 font-mono">
                                  ✓ Bill scan attached
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Remarks / Site Notes
                            </label>
                            <input
                              type="text"
                              value={item.remarks}
                              onChange={(e) => handleUpdateItem(item.id, { remarks: e.target.value })}
                              placeholder="e.g. Delivered on-site, verified by supervisor..."
                              className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Add Row Button */}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2.5 border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)]/30 rounded-lg text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[var(--accent)]" />
                  <span>+ Add Another Expense for this Project</span>
                </button>
              </div>
            )}
          </div>

          {/* Modal Bottom Footer Strip */}
          <div className="px-5 sm:px-6 py-4 border-t border-[var(--border-soft)] bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Total Indicator */}
            <div>
              {!editingExpense ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-dim)]">
                    <strong className="text-[var(--text)]">{expenseItems.length}</strong>{' '}
                    {expenseItems.length === 1 ? 'Expense' : 'Expenses'} for Project
                  </span>
                  <span className="text-sm font-mono font-bold text-[var(--accent)]">
                    Total: {currency} {multiGrandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-[var(--text-dim)] font-mono">
                  Updating single expense record ID #{editingExpense.id}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] text-xs font-medium rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] text-xs font-semibold rounded transition-all shadow-xs cursor-pointer font-mono"
              >
                {editingExpense
                  ? 'Save Changes'
                  : expenseItems.length > 1
                  ? `Save All Expenses (${expenseItems.length})`
                  : 'Save & Record Expense'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
