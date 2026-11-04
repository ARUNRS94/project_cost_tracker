import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { ExpenseMaster, PaymentMode, PaymentStatus, ItemMaster } from '../../types/erp';
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
  Package,
  Sparkles,
  ArrowRight,
  Maximize2,
  Info,
} from 'lucide-react';
import { ReceiptModal } from '../common/ReceiptModal';

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
    clients,
    projects,
    expenseCategories,
    vendors,
    items,
    currentUser,
    currency,
    addExpense,
    updateExpense,
    getClient,
    getItemType,
    getProjectSpent,
  } = useERP();

  const [formError, setFormError] = useState<string | null>(null);

  // 1. Cascading selection: Client -> Project -> Project Tagged Items
  const [selectedClientId, setSelectedClientId] = useState<number>(() => {
    if (editingExpense) {
      const p = projects.find((prj) => prj.id === editingExpense.project_id);
      return p?.client_id || clients[0]?.id || 1;
    }
    if (defaultProjectId) {
      const p = projects.find((prj) => prj.id === defaultProjectId);
      return p?.client_id || clients[0]?.id || 1;
    }
    return clients[0]?.id || 1;
  });

  // Projects under the selected client
  const clientProjects = useMemo(() => {
    if (!selectedClientId) return [];
    return projects.filter((p) => p.client_id === selectedClientId);
  }, [projects, selectedClientId]);

  // Selected Project
  const [selectedProjectId, setSelectedProjectId] = useState<number>(() => {
    if (editingExpense) return editingExpense.project_id;
    if (defaultProjectId) return defaultProjectId;
    const initialProjects = projects.filter((p) => p.client_id === (clients[0]?.id || 1));
    return initialProjects[0]?.id || projects[0]?.id || 1;
  });

  // Photo zoom preview modal
  const [previewImage, setPreviewImage] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    url?: string;
  }>({
    isOpen: false,
    title: '',
  });

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

  // Initialize and synchronize state when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (editingExpense) {
        const prj = projects.find((p) => p.id === editingExpense.project_id);
        if (prj) {
          setSelectedClientId(prj.client_id);
          setSelectedProjectId(prj.id);
        } else {
          setSelectedProjectId(editingExpense.project_id);
        }
        setSingleEditData({ ...editingExpense });
        setExpenseItems([]);
      } else {
        const initProjId = defaultProjectId || projects[0]?.id || 1;
        const prj = projects.find((p) => p.id === initProjId);
        if (prj) {
          setSelectedClientId(prj.client_id);
          setSelectedProjectId(prj.id);
        } else {
          setSelectedClientId(clients[0]?.id || 1);
          setSelectedProjectId(initProjId);
        }
        setSingleEditData(null);
        setExpenseItems([createBlankItem()]);
      }
    }
  }, [isOpen, editingExpense, defaultProjectId]);

  // When Client changes, cascade to update selected project
  const handleClientChange = (newClientId: number) => {
    setSelectedClientId(newClientId);
    const available = projects.filter((p) => p.client_id === newClientId);
    if (available.length > 0) {
      // Pick first project under this client
      setSelectedProjectId(available[0].id);
    } else {
      setSelectedProjectId(0);
    }
  };

  // When Project changes, ensure client selection matches
  const handleProjectChange = (newProjectId: number) => {
    setSelectedProjectId(newProjectId);
    const prj = projects.find((p) => p.id === newProjectId);
    if (prj && prj.client_id !== selectedClientId) {
      setSelectedClientId(prj.client_id);
    }
  };

  if (!isOpen) return null;

  const currentClient = clients.find((c) => c.id === selectedClientId) || null;
  const currentProject = projects.find((p) => p.id === selectedProjectId) || null;

  // 2. ITEMS TAGGED UNDER THE SELECTED PROJECT
  const projectTaggedItems = items.filter((i) => i.project_id === selectedProjectId);
  const otherItems = items.filter((i) => !i.project_id || i.project_id !== selectedProjectId);

  // Project financial metrics
  const projectBudget = Number(currentProject?.approved_budget) || 0;
  const projectPricing = currentProject?.pricing ?? Math.round(projectBudget * 1.35);
  const currentSpent = currentProject ? getProjectSpent(currentProject.id) : 0;

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

  // When a user selects a project-tagged item in multi-item mode
  const handleSelectProjectItemForDraft = (itemIdStr: string, draftId: string) => {
    const selectedItemId = itemIdStr ? parseInt(itemIdStr, 10) : null;
    const tagged = items.find((i) => i.id === selectedItemId);

    setExpenseItems((prev) =>
      prev.map((draft) => {
        if (draft.id !== draftId) return draft;
        if (!tagged) {
          return {
            ...draft,
            project_item_id: null,
          };
        }

        // Auto-populate description, rate, unit, and calculate amount
        const qty = draft.quantity && draft.quantity > 0 ? draft.quantity : 1;
        const rate = Number(tagged.default_rate) || draft.rate || 0;
        const amount = Math.round(qty * rate);

        return {
          ...draft,
          project_item_id: tagged.id,
          description: draft.description.trim() ? draft.description : `${tagged.item_name}`,
          rate: rate,
          unit: tagged.item_size || draft.unit || 'Nos',
          amount: amount > 0 ? amount : draft.amount,
          remarks: draft.remarks || tagged.remark || '',
        };
      })
    );
  };

  // When a user selects a project-tagged item in single edit mode
  const handleSelectProjectItemForSingle = (itemIdStr: string) => {
    if (!singleEditData) return;
    const selectedItemId = itemIdStr ? parseInt(itemIdStr, 10) : null;
    const tagged = items.find((i) => i.id === selectedItemId);

    if (!tagged) {
      setSingleEditData({
        ...singleEditData,
        project_item_id: null,
      });
      return;
    }

    const qty = singleEditData.quantity && singleEditData.quantity > 0 ? singleEditData.quantity : 1;
    const rate = Number(tagged.default_rate) || singleEditData.rate || 0;
    const amount = Math.round(qty * rate);

    setSingleEditData({
      ...singleEditData,
      project_item_id: tagged.id,
      description: singleEditData.description.trim() ? singleEditData.description : `${tagged.item_name}`,
      rate: rate,
      unit: tagged.item_size || singleEditData.unit || 'Nos',
      amount: amount > 0 ? amount : singleEditData.amount,
      remarks: singleEditData.remarks || tagged.remark || '',
    });
  };

  const handleAddItem = () => {
    const lastItem = expenseItems[expenseItems.length - 1];
    setExpenseItems((prev) => [
      ...prev,
      createBlankItem({
        expense_date: lastItem?.expense_date,
        vendor_id: lastItem?.vendor_id,
        payment_mode: lastItem?.payment_mode,
        payment_status: lastItem?.payment_status,
        reference_number: lastItem?.reference_number,
      }),
    ]);
  };

  // Quick Action: Add all tagged project items to the multi-item expense
  const handleAddAllTaggedItems = () => {
    if (projectTaggedItems.length === 0) return;
    const lastItem = expenseItems[expenseItems.length - 1];
    const newDrafts: ExpenseDraftItem[] = projectTaggedItems.map((tagged) => {
      const rate = Number(tagged.default_rate) || 0;
      return createBlankItem({
        project_item_id: tagged.id,
        description: tagged.item_name,
        quantity: 1,
        unit: tagged.item_size || 'Nos',
        rate: rate,
        amount: rate,
        expense_date: lastItem?.expense_date || new Date().toISOString().slice(0, 10),
        vendor_id: lastItem?.vendor_id || vendors[0]?.id || 1,
        payment_mode: lastItem?.payment_mode || 'Bank',
        payment_status: lastItem?.payment_status || 'Paid',
        remarks: tagged.remark || '',
      });
    });

    // If first item was untouched blank item, replace it
    if (
      expenseItems.length === 1 &&
      !expenseItems[0].description.trim() &&
      expenseItems[0].amount === 0
    ) {
      setExpenseItems(newDrafts);
    } else {
      setExpenseItems((prev) => [...prev, ...newDrafts]);
    }
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
      setFormError('Please select a valid project under this client.');
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
        setFormError(`Expense Item #${i + 1} is missing a description.`);
        return;
      }
      if (!item.amount || item.amount <= 0) {
        setFormError(
          `Expense Item #${i + 1} ("${item.description || 'Untitled'}") must have an amount greater than 0.`
        );
        return;
      }
    }

    // Save all expense rows to master ledger
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
                  {editingExpense ? 'Edit Expense Record' : 'Record Project Expense'}
                </h3>
                {!editingExpense && expenseItems.length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent)] text-[#1E1B18]">
                    {expenseItems.length} Item{expenseItems.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-dim)] mt-0.5">
                {editingExpense
                  ? 'Update expenditure allocation and settlement details'
                  : 'Select client & project, select tagged items, and record single or multi-item expenditures'}
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
                className="text-red-400 hover:text-red-200 ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* ========================================================================= */}
            {/* STEP 1: CASCADING CLIENT & PROJECT SELECTOR */}
            {/* ========================================================================= */}
            <div className="p-4 sm:p-5 rounded-lg bg-[var(--bg)] border border-[var(--border)] space-y-4">
              <div className="flex items-center justify-between">
                <span className="badge-accent flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Target Client & Project Allocation</span>
                </span>
                {currentProject && (
                  <span className="text-[11px] font-mono text-[var(--text-dim)]">
                    Pricing: <strong className="text-[var(--accent)]">{currency} {projectPricing.toLocaleString('en-IN')}</strong> · Budget: <strong>{currency} {projectBudget.toLocaleString('en-IN')}</strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. SELECT CLIENT */}
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase text-[var(--text)] mb-1.5">
                    1. Select Client *
                  </label>
                  <select
                    required
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none font-medium"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.client_name} ({c.contact_person})
                      </option>
                    ))}
                  </select>
                  {currentClient && (
                    <span className="text-[10px] text-[var(--text-faint)] font-mono mt-1 block">
                      {currentClient.phone ? `Phone: ${currentClient.phone}` : ''} {currentClient.gstin ? `· GSTIN: ${currentClient.gstin}` : ''}
                    </span>
                  )}
                </div>

                {/* 2. SELECT PROJECT UNDER CLIENT (Cascaded!) */}
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase text-[var(--text)] mb-1.5">
                    2. Select Project Under Client *
                  </label>
                  {clientProjects.length === 0 ? (
                    <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
                      No projects found under {currentClient?.client_name}.
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedProjectId}
                      onChange={(e) => handleProjectChange(parseInt(e.target.value, 10))}
                      className="w-full text-xs p-2.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none font-medium"
                    >
                      {clientProjects.map((p) => {
                        const price = p.pricing ?? Math.round((p.approved_budget || 0) * 1.35);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.project_name} · [{p.status}] · Budget: {currency} {Number(p.approved_budget).toLocaleString('en-IN')}
                          </option>
                        );
                      })}
                    </select>
                  )}
                  {currentProject && (
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-faint)] font-mono mt-1">
                      <span>Spent so far: <strong className="text-red-400">{currency} {currentSpent.toLocaleString('en-IN')}</strong></span>
                      <span>·</span>
                      <span className="text-[var(--accent)]">
                        {projectTaggedItems.length} item{projectTaggedItems.length !== 1 ? 's' : ''} tagged to scope
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* STEP 2A: SINGLE EDIT MODE (WHEN EDITING AN EXISTING RECORD) */}
            {/* ========================================================================= */}
            {editingExpense && singleEditData && (
              <div className="space-y-4 p-4 rounded-lg bg-[var(--surface-2)]/30 border border-[var(--border)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                    <label className="block text-xs text-[var(--text-dim)] mb-1">Category *</label>
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
                    <label className="block text-xs text-[var(--text-dim)] mb-1">Vendor *</label>
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

                  {/* TAGGED PROJECT ITEM SELECTOR */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--accent)] mb-1">
                      Tagged Project Item
                    </label>
                    <select
                      value={singleEditData.project_item_id || ''}
                      onChange={(e) => handleSelectProjectItemForSingle(e.target.value)}
                      className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--accent)] text-[var(--text)] focus:border-[var(--accent)] outline-none font-medium"
                    >
                      <option value="">General Project Cost / Non-Itemized</option>
                      {projectTaggedItems.length > 0 && (
                        <optgroup label={`Tagged to ${currentProject?.project_name || 'Project'} (${projectTaggedItems.length})`}>
                          {projectTaggedItems.map((i) => (
                            <option key={i.id} value={i.id}>
                              ★ {i.item_name} [{i.item_size || 'Std'}] · Rate: {currency} {Number(i.default_rate).toLocaleString('en-IN')}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherItems.length > 0 && (
                        <optgroup label="Other Catalog Items">
                          {otherItems.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.item_name} [{i.item_size || 'Std'}]
                            </option>
                          ))}
                        </optgroup>
                      )}
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
                    className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none font-medium"
                  />
                </div>

                {/* Live Computation Strip */}
                <div className="p-3 bg-[var(--bg)] rounded border border-[var(--border)] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--accent)] font-medium">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Cost Computation (Quantity × Rate = Final Amount)</span>
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
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 2B: MULTI-ITEM EXPENSE ENTRY MODE */}
            {/* ========================================================================= */}
            {!editingExpense && (
              <div className="space-y-4">
                {/* Section Header with Multi-Item Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-soft)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[var(--accent)]" />
                      <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text)]">
                        Multi-Item Expense Ledger ({expenseItems.length} Item{expenseItems.length !== 1 ? 's' : ''})
                      </h4>
                    </div>
                    <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
                      Add multiple itemized expenditures under <strong className="text-[var(--text)]">{currentProject?.project_name || 'selected project'}</strong> in a single submission.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Quick Action: Add all tagged project items */}
                    {projectTaggedItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAddAllTaggedItems}
                        title="Add draft rows for all items tagged to this project"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Populate All Project Items ({projectTaggedItems.length})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] text-[#1E1B18] hover:opacity-90 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Expense Item</span>
                    </button>
                  </div>
                </div>

                {/* List of Expense Item Cards */}
                <div className="space-y-4">
                  {expenseItems.map((item, index) => {
                    const taggedProjectItem = item.project_item_id
                      ? items.find((i) => i.id === item.project_item_id)
                      : null;

                    return (
                      <div
                        key={item.id}
                        className="p-4 sm:p-5 rounded-lg bg-[var(--surface-2)]/30 border border-[var(--border)] hover:border-[var(--border-soft)] transition-all space-y-3 relative group"
                      >
                        {/* Row Header with Item Number, Tagged Badge, Duplicate & Delete */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-soft)]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)]">
                              Item #{index + 1}
                            </span>
                            <span className="text-xs font-semibold text-[var(--text)]">
                              {item.description || 'New Expense Line'}
                            </span>
                            {taggedProjectItem && (
                              <span className="badge-accent flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span>Tagged: {taggedProjectItem.item_name}</span>
                              </span>
                            )}
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
                                title="Remove this item"
                                className="p-1.5 text-[var(--text-faint)] hover:text-red-400 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Row 1: Tagged Project Item & Category Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {/* TAGGED PROJECT ITEM (PRIMARY SELECTOR) */}
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-mono font-semibold text-[var(--accent)] mb-1 flex items-center gap-1">
                              <Package className="w-3.5 h-3.5" />
                              <span>Tagged Project Item</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <select
                                value={item.project_item_id || ''}
                                onChange={(e) =>
                                  handleSelectProjectItemForDraft(e.target.value, item.id)
                                }
                                className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--accent)] text-[var(--text)] focus:border-[var(--accent)] outline-none font-medium"
                              >
                                <option value="">General Project Cost / Non-Itemized</option>
                                {projectTaggedItems.length > 0 && (
                                  <optgroup label={`Tagged to ${currentProject?.project_name || 'Project'} (${projectTaggedItems.length})`}>
                                    {projectTaggedItems.map((i) => (
                                      <option key={i.id} value={i.id}>
                                        ★ {i.item_name} [{i.item_size || 'Std'}] · Rate: {currency} {Number(i.default_rate).toLocaleString('en-IN')}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {otherItems.length > 0 && (
                                  <optgroup label="Other Catalog Items">
                                    {otherItems.map((i) => (
                                      <option key={i.id} value={i.id}>
                                        {i.item_name} [{i.item_size || 'Std'}]
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>

                              {/* Thumbnail preview if tagged item has image */}
                              {taggedProjectItem?.reference_picture && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      isOpen: true,
                                      title: taggedProjectItem.item_name,
                                      subtitle: `Size: ${taggedProjectItem.item_size} · Rate: ${currency} ${Number(taggedProjectItem.default_rate).toLocaleString('en-IN')}`,
                                      url: taggedProjectItem.reference_picture,
                                    })
                                  }
                                  title="View Item Photo"
                                  className="w-8 h-8 rounded border border-[var(--border)] overflow-hidden shrink-0 cursor-pointer"
                                >
                                  <img
                                    src={taggedProjectItem.reference_picture}
                                    alt="Item"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expense Category */}
                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Expense Category *
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
                              Vendor / Supplier *
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
                        </div>

                        {/* Row 2: Description & Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Expense Description *
                            </label>
                            <input
                              type="text"
                              required
                              value={item.description}
                              onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                              placeholder="e.g. 3D Acrylic Lettering Face Fabrication & LED wiring"
                              className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none font-medium"
                            />
                          </div>

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
                        </div>

                        {/* Row 3: Computation Matrix (Qty x Unit x Rate = Amount) */}
                        <div className="p-3 bg-[var(--bg)] rounded border border-[var(--border)] grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] text-[var(--text-faint)] mb-0.5">
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
                              className="w-full text-xs font-mono p-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-[var(--text-faint)] mb-0.5">
                              Unit / Size
                            </label>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                              placeholder="Nos, Rft, Sqft"
                              className="w-full text-xs p-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-[var(--text-faint)] mb-0.5">
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
                              className="w-full text-xs font-mono p-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[var(--accent)] mb-0.5">
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

                        {/* Row 4: Settlement & Voucher Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Payment Status
                            </label>
                            <select
                              value={item.payment_status}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  payment_status: e.target.value as PaymentStatus,
                                })
                              }
                              className="w-full text-xs p-1.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                            >
                              <option value="Paid">Paid</option>
                              <option value="Unpaid">Unpaid</option>
                              <option value="Partial">Partial</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Payment Mode
                            </label>
                            <select
                              value={item.payment_mode}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  payment_mode: e.target.value as PaymentMode,
                                })
                              }
                              className="w-full text-xs p-1.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                            >
                              <option value="Bank">Bank / NEFT / RTGS</option>
                              <option value="UPI">UPI / QR Code</option>
                              <option value="Cash">Cash Petty</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Invoice / Ref No
                            </label>
                            <input
                              type="text"
                              value={item.reference_number}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { reference_number: e.target.value })
                              }
                              placeholder="INV-9921 or UTR..."
                              className="w-full text-xs font-mono p-1.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                            />
                          </div>
                        </div>

                        {/* Row 5: Receipt / Voucher Attachment & Notes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] text-[var(--text-faint)] mb-1">
                              Receipt / Voucher Scan
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={item.attachment}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, { attachment: e.target.value })
                                }
                                placeholder="Image link or upload photo"
                                className="flex-1 text-xs p-1.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                              />
                              <label className="px-2.5 py-1.5 border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-dim)] hover:text-[var(--text)] text-xs font-mono rounded cursor-pointer transition-colors shrink-0">
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
                              <div className="mt-1 flex items-center gap-2">
                                <img
                                  src={item.attachment}
                                  alt="Receipt"
                                  className="w-8 h-8 object-cover rounded border border-[var(--border)]"
                                />
                                <span className="text-[10px] text-green-500 font-mono">Attachment loaded</span>
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
                              placeholder="Optional site inspection notes, verification..."
                              className="w-full text-xs p-1.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer with Live Totals & Action Buttons */}
          <div className="p-4 sm:p-5 border-t border-[var(--border-soft)] bg-[var(--surface-2)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {!editingExpense && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-[var(--text-dim)] font-mono">
                    Total ({expenseItems.length} Item{expenseItems.length !== 1 ? 's' : ''}):
                  </span>
                  <span className="font-mono text-lg font-bold text-[var(--accent)]">
                    {currency} {multiGrandTotal.toLocaleString('en-IN')}
                  </span>
                  {currentProject && (
                    <span className="text-[11px] font-mono text-[var(--text-faint)] ml-2">
                      · Remaining Budget: {currency} {(projectBudget - currentSpent - multiGrandTotal).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono rounded border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] shadow-xs transition-opacity cursor-pointer"
              >
                {editingExpense
                  ? 'Update Expense'
                  : `Confirm & Record ${expenseItems.length} Expense${expenseItems.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Global Image Preview Modal */}
      <ReceiptModal
        isOpen={previewImage.isOpen}
        onClose={() => setPreviewImage({ isOpen: false, title: '' })}
        title={previewImage.title}
        subtitle={previewImage.subtitle}
        imageUrl={previewImage.url}
      />
    </div>
  );
};
