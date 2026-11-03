import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { ExpenseMaster, PaymentMode, PaymentStatus } from '../../types/erp';
import { X, Calculator, Upload, Check } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExpense?: ExpenseMaster | null;
  defaultProjectId?: number;
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
  } = useERP();

  const [formError, setFormError] = useState<string | null>(null);

  const initialFormState: Omit<ExpenseMaster, 'id'> = {
    project_id: defaultProjectId || projects[0]?.id || 1,
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

  // Synchronize form when opened or when editingExpense changes
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (editingExpense) {
        setFormData({ ...editingExpense });
      } else {
        setFormData({
          ...initialFormState,
          project_id: defaultProjectId || projects[0]?.id || 1,
          expense_category_id: expenseCategories[0]?.id || 1,
          vendor_id: vendors[0]?.id || 1,
          created_by: currentUser.id,
        });
      }
    }
  }, [isOpen, editingExpense, defaultProjectId]);

  if (!isOpen) return null;

  // Auto-calculation on Quantity or Rate change
  const handleQtyRateChange = (field: 'quantity' | 'rate', value: number) => {
    const updated = { ...formData, [field]: value };
    const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
    const rate = Number(field === 'rate' ? value : updated.rate) || 0;
    if (qty > 0 && rate > 0) {
      updated.amount = Math.round(qty * rate);
    }
    setFormData(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.amount) {
      setFormError('Please select a project and enter the final amount.');
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
        description: formData.description,
        vendor_id: Number(formData.vendor_id),
        quantity: formData.quantity ? Number(formData.quantity) : null,
        unit: formData.unit || null,
        rate: formData.rate ? Number(formData.rate) : null,
        amount: Number(formData.amount) || 0,
        payment_status: formData.payment_status as PaymentStatus,
        payment_mode: formData.payment_mode as PaymentMode,
        attachment: formData.attachment || '',
        reference_number: formData.reference_number || 'N/A',
        remarks: formData.remarks || '',
        created_by: formData.created_by || currentUser.id,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-[var(--surface)] text-[var(--text)] rounded-md shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-soft)]">
          <div>
            <h3 className="font-display text-base font-semibold text-[var(--text)]">
              {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
            </h3>
            <p className="text-xs text-[var(--text-dim)] mt-0.5">
              Allocate project cost, vendor invoice, and settlement mode
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {formError && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-500 rounded text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Project Selection */}
            <div>
              <label className="block text-xs text-[var(--text-dim)] mb-1">
                Project *
              </label>
              <select
                required
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: parseInt(e.target.value, 10) })}
                className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
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
              <label className="block text-xs text-[var(--text-dim)] mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="w-full text-xs font-mono p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
              />
            </div>

            {/* Expense Category */}
            <div>
              <label className="block text-xs text-[var(--text-dim)] mb-1">
                Expense Category *
              </label>
              <select
                required
                value={formData.expense_category_id}
                onChange={(e) => setFormData({ ...formData, expense_category_id: parseInt(e.target.value, 10) })}
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
              <label className="block text-xs text-[var(--text-dim)] mb-1">
                Vendor / Supplier *
              </label>
              <select
                required
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: parseInt(e.target.value, 10) })}
                className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vendor_name} ({v.vendor_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Catalog Item Reference (Optional) */}
            <div className="sm:col-span-2">
              <label className="block text-xs text-[var(--text-dim)] mb-1">
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
                className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
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
            <label className="block text-xs text-[var(--text-dim)] mb-1">
              Expense Description *
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. 4mm cast acrylic sheet cutting & transportation"
              className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
            />
          </div>

          {/* Quantity, Rate, Amount (Live Computation) */}
          <div className="p-3 bg-[var(--surface-2)]/40 rounded border border-[var(--border)] space-y-2">
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
                  value={formData.quantity || ''}
                  onChange={(e) => handleQtyRateChange('quantity', parseFloat(e.target.value) || 0)}
                  placeholder="1"
                  className="w-full text-xs font-mono p-1.5 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-faint)] mb-1">Unit</label>
                <input
                  type="text"
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="Sheets, Nos, Hrs"
                  className="w-full text-xs p-1.5 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-faint)] mb-1">Rate ({currency})</label>
                <input
                  type="number"
                  step="any"
                  value={formData.rate || ''}
                  onChange={(e) => handleQtyRateChange('rate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-xs font-mono p-1.5 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
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
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full text-xs font-mono font-bold p-1.5 rounded border border-[var(--accent)] bg-[var(--bg)] text-[var(--accent)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-dim)] mb-1">
                Payment Status *
              </label>
              <select
                value={formData.payment_status}
                onChange={(e) =>
                  setFormData({ ...formData, payment_status: e.target.value as PaymentStatus })
                }
                className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
              >
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-dim)] mb-1">
                Payment Mode *
              </label>
              <select
                value={formData.payment_mode}
                onChange={(e) =>
                  setFormData({ ...formData, payment_mode: e.target.value as PaymentMode })
                }
                className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
              >
                <option value="Bank">Bank / NEFT / RTGS</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Cash">Cash Petty</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-dim)] mb-1">
                Invoice / Reference No
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="INV-2026/891 or UTR..."
                className="w-full text-xs font-mono p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
              />
            </div>
          </div>

          {/* Bill Attachment */}
          <div>
            <label className="block text-xs text-[var(--text-dim)] mb-1">
              Bill / Voucher Scan (Upload or URL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.attachment}
                onChange={(e) => setFormData({ ...formData, attachment: e.target.value })}
                placeholder="https://... image link or upload photo"
                className="flex-1 text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
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
                        setFormData({ ...formData, attachment: event.target?.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
            {formData.attachment && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={formData.attachment}
                  alt="Receipt Preview"
                  className="w-12 h-12 object-cover rounded border border-[var(--border)]"
                />
                <span className="text-[11px] text-green-500 flex items-center gap-1 font-mono">
                  <Check className="w-3.5 h-3.5" /> Attachment attached
                </span>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs text-[var(--text-dim)] mb-1">
              Remarks & Site Notes
            </label>
            <textarea
              rows={2}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="e.g. Delivered on site, authorized by supervisor..."
              className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[var(--border-soft)] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] text-xs font-medium rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] text-xs font-semibold rounded transition-all shadow-xs cursor-pointer"
            >
              {editingExpense ? 'Save Changes' : 'Save & Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
