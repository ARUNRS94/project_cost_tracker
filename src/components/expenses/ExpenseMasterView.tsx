import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { ExpenseMaster, PaymentMode, PaymentStatus, ViewMode } from '../../types/erp';
import { ReceiptModal } from '../common/ReceiptModal';
import { ViewToggle } from '../common/ViewToggle';
import { ExpenseModal } from './ExpenseModal';
import { exportMasterToCSV, downloadFile } from '../../services/api';
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
  Download,
  Upload,
  Calendar,
  Columns,
  ChevronDown,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

export interface ExpenseColumnVisibility {
  date: boolean;
  project: boolean;
  category: boolean;
  description: boolean;
  vendor: boolean;
  qtyRate: boolean;
  amount: boolean;
  statusMode: boolean;
  invoiceRef: boolean;
  receipt: boolean;
  actions: boolean;
}

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

  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  
  // Date-wise filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'last_30_days'>('all');
  
  // Amount range filters
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<ExpenseColumnVisibility>({
    date: true,
    project: true,
    category: true,
    description: true,
    vendor: true,
    qtyRate: true,
    amount: true,
    statusMode: true,
    invoiceRef: true,
    receipt: true,
    actions: true,
  });
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(isCreateModalOpen);
  const [editingExpense, setEditingExpense] = useState<ExpenseMaster | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (isCreateModalOpen) {
      setEditingExpense(null);
      setIsModalOpen(true);
    }
  }, [isCreateModalOpen]);

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

  // Date preset selector helper
  const applyDatePreset = (preset: 'all' | 'today' | 'this_week' | 'this_month' | 'last_30_days') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      setStartDate(monday.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'last_30_days') {
      const prior30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setStartDate(prior30);
      setEndDate(todayStr);
    }
  };

  // Reset all filters helper
  const handleResetAllFilters = () => {
    setSearchTerm('');
    setSelectedProject('all');
    setSelectedCategory('all');
    setSelectedVendor('all');
    setSelectedPaymentStatus('all');
    setSelectedPaymentMode('all');
    setStartDate('');
    setEndDate('');
    setDatePreset('all');
    setMinAmount('');
    setMaxAmount('');
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    selectedProject !== 'all' ||
    selectedCategory !== 'all' ||
    selectedVendor !== 'all' ||
    selectedPaymentStatus !== 'all' ||
    selectedPaymentMode !== 'all' ||
    startDate ||
    endDate ||
    minAmount ||
    maxAmount
  );

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

        // Date range matching
        const matchesDate = (() => {
          if (startDate && exp.expense_date < startDate) return false;
          if (endDate && exp.expense_date > endDate) return false;
          return true;
        })();

        // Amount matching
        const minAmtNum = minAmount ? parseFloat(minAmount) : null;
        const maxAmtNum = maxAmount ? parseFloat(maxAmount) : null;
        const matchesMin = minAmtNum === null || isNaN(minAmtNum) || exp.amount >= minAmtNum;
        const matchesMax = maxAmtNum === null || isNaN(maxAmtNum) || exp.amount <= maxAmtNum;

        return (
          matchesSearch &&
          matchesProject &&
          matchesCat &&
          matchesVendor &&
          matchesStatus &&
          matchesMode &&
          matchesDate &&
          matchesMin &&
          matchesMax
        );
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
    startDate,
    endDate,
    minAmount,
    maxAmount,
    sortField,
    sortOrder,
    getProject,
    getVendor,
  ]);

  // Download ONLY filtered items as CSV
  const handleDownloadFilteredCSV = () => {
    const csv = exportMasterToCSV(
      `Expenses_Filtered_${new Date().toISOString().slice(0, 10)}`,
      filteredExpenses.map((exp) => {
        const proj = getProject(exp.project_id);
        const item = getItem(exp.project_item_id || undefined);
        const cat = getExpenseCategory(exp.expense_category_id);
        const vendor = getVendor(exp.vendor_id);
        const creator = getUser(exp.created_by);
        return {
          Expense_Date: exp.expense_date,
          Project_Name: proj ? proj.project_name : `Project #${exp.project_id}`,
          Project_Item: item ? item.item_name : '',
          Category: cat ? cat.category_name : `Category #${exp.expense_category_id}`,
          Vendor: vendor ? vendor.vendor_name : `Vendor #${exp.vendor_id}`,
          Description: exp.description,
          Quantity: exp.quantity ?? '',
          Unit: exp.unit ?? '',
          Rate_INR: exp.rate ?? '',
          Amount_INR: exp.amount,
          Payment_Status: exp.payment_status,
          Payment_Mode: exp.payment_mode,
          Reference_Invoice_Number: exp.reference_number || '',
          Remarks: exp.remarks || '',
          Created_By: creator ? creator.full_name : 'Staff',
        };
      })
    );
    downloadFile(csv, `Expenses_Filtered_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Aggregate sums
  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const paidFilteredAmount = filteredExpenses
    .filter((e) => e.payment_status === 'Paid')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const pendingFilteredAmount = totalFilteredAmount - paidFilteredAmount;

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (exp: ExpenseMaster) => {
    setEditingExpense(exp);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--border-soft)]">
        <div>
          <p className="text-[10.5px] uppercase tracking-wider text-[var(--text-faint)] font-mono">EXPENDITURE LEDGER</p>
          <h1 className="font-display font-medium text-2xl md:text-3xl text-[var(--text)]">
            Expense
          </h1>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            Log site expenditures, vendor vouchers, material orders, and payment statuses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">

          {/* Download Filtered CSV */}
          <button
            onClick={handleDownloadFilteredCSV}
            title={`Download ${filteredExpenses.length} filtered expenses as CSV`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Download CSV ({filteredExpenses.length})</span>
          </button>

          {/* Select Columns to View Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
              title="Select columns to view in the table"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border transition-colors cursor-pointer ${
                isColumnDropdownOpen
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent)]'
                  : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)]'
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden sm:inline">Columns</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isColumnDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isColumnDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-60 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl z-50 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-soft)]">
                  <span className="font-semibold text-[var(--text)] font-mono text-[11px] uppercase tracking-wider">
                    Select Columns
                  </span>
                  <button
                    onClick={() =>
                      setVisibleColumns({
                        date: true,
                        project: true,
                        category: true,
                        description: true,
                        vendor: true,
                        qtyRate: true,
                        amount: true,
                        statusMode: true,
                        invoiceRef: true,
                        receipt: true,
                        actions: true,
                      })
                    }
                    className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    Reset All
                  </button>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {[
                    { key: 'date', label: 'Expense Date' },
                    { key: 'project', label: 'Project & Item' },
                    { key: 'category', label: 'Expense Category' },
                    { key: 'description', label: 'Description' },
                    { key: 'vendor', label: 'Vendor' },
                    { key: 'qtyRate', label: 'Quantity & Rate' },
                    { key: 'amount', label: 'Total Amount' },
                    { key: 'statusMode', label: 'Status & Mode' },
                    { key: 'invoiceRef', label: 'Invoice Reference' },
                    { key: 'receipt', label: 'Bill / Receipt' },
                    { key: 'actions', label: 'Actions' },
                  ].map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 p-1 rounded hover:bg-[var(--surface-2)] cursor-pointer text-[var(--text)]"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key as keyof ExpenseColumnVisibility]}
                        onChange={(e) =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [col.key]: e.target.checked,
                          }))
                        }
                        className="rounded border-[var(--border)] accent-[var(--accent)]"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ViewToggle mode={viewMode} onChange={setViewMode} />

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all whitespace-nowrap shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Expense</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[var(--surface)] rounded-md border border-[var(--border)]">
        <div className="px-2">
          <p className="text-[10.5px] text-[var(--text-faint)] uppercase tracking-wider font-mono">
            Total Incurred ({filteredExpenses.length} Records)
          </p>
          <p className="text-xl font-mono text-[var(--accent)] font-medium tabular-nums mt-0.5">
            {currency} {totalFilteredAmount.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="px-2 border-t sm:border-t-0 sm:border-l border-[var(--border-soft)]">
          <p className="text-[10.5px] text-[var(--text-faint)] uppercase tracking-wider font-mono">
            Paid & Settled
          </p>
          <p className="text-xl font-mono text-emerald-600 dark:text-[#7C9885] font-medium tabular-nums mt-0.5">
            {currency} {paidFilteredAmount.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="px-2 border-t sm:border-t-0 sm:border-l border-[var(--border-soft)]">
          <p className="text-[10.5px] text-[var(--text-faint)] uppercase tracking-wider font-mono">
            Unpaid / Outstanding
          </p>
          <p className="text-xl font-mono text-[var(--text)] font-medium tabular-nums mt-0.5">
            {currency} {pendingFilteredAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Filter Toolbar (Search + Date-wise Presets + Min/Max Amount + Dropdowns) */}
      <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)] space-y-3">
        {/* Row 1: Search box & Active Filters status */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses by description, vendor, invoice ref..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--accent)] outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-[var(--text-faint)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-[11px] text-[var(--text-faint)] mr-1">Period:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_30_days', label: 'Last 30 Days' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyDatePreset(preset.id as any)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  datePreset === preset.id && !startDate && preset.id === 'all'
                    ? 'bg-[var(--accent)] text-[#1E1B18] font-semibold'
                    : datePreset === preset.id
                    ? 'bg-[var(--accent)] text-[#1E1B18] font-semibold'
                    : 'bg-[var(--bg)] text-[var(--text-dim)] border border-[var(--border)] hover:border-[var(--accent)]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Date From/To Range, Min/Max Amount, and Master Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-soft)]">
          {/* Custom Date Range */}
          <div className="flex items-center gap-1.5 text-xs bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <span className="text-[var(--text-faint)] font-mono text-[11px]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom' as any);
              }}
              className="bg-transparent text-[var(--text)] text-xs font-mono outline-none cursor-pointer"
            />
            <span className="text-[var(--text-faint)] font-mono text-[11px] ml-1">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom' as any);
              }}
              className="bg-transparent text-[var(--text)] text-xs font-mono outline-none cursor-pointer"
            />
          </div>

          {/* Amount range filters */}
          <div className="flex items-center gap-1.5 text-xs bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1">
            <span className="text-[var(--text-faint)] font-mono text-[11px]">₹ Min:</span>
            <input
              type="number"
              placeholder="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-16 bg-transparent text-[var(--text)] text-xs font-mono outline-none"
            />
            <span className="text-[var(--text-faint)] font-mono text-[11px]">Max:</span>
            <input
              type="number"
              placeholder="Any"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-16 bg-transparent text-[var(--text)] text-xs font-mono outline-none"
            />
          </div>

          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-xs bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1.5 text-[var(--text)] outline-none cursor-pointer"
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
            className="text-xs bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1.5 text-[var(--text)] outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category_name}
              </option>
            ))}
          </select>

          {/* Vendor Filter */}
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="text-xs bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1.5 text-[var(--text)] outline-none cursor-pointer"
          >
            <option value="all">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendor_name.slice(0, 20)}...
              </option>
            ))}
          </select>

          {/* Payment Status Filter */}
          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="text-xs bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1.5 text-[var(--text)] outline-none cursor-pointer"
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
            className="text-xs bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1.5 text-[var(--text)] outline-none cursor-pointer"
          >
            <option value="all">All Modes</option>
            <option value="Bank">Bank</option>
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
          </select>

          {/* Reset All Filters button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-400 px-2 py-1 bg-red-500/10 rounded cursor-pointer transition-colors"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Expense Table (NO ID column!) */}
      {viewMode === 'list' && (
      <div className="bg-[var(--surface)] rounded-md border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[var(--surface-2)] text-[var(--text-faint)] border-b border-[var(--border)]">
              <tr>
                {visibleColumns.date && (
                  <th
                    onClick={() => {
                      if (sortField === 'date') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('date');
                        setSortOrder('desc');
                      }
                    }}
                    className="py-3 px-3.5 font-normal text-[10.5px] uppercase cursor-pointer hover:text-[var(--text)] font-mono"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}
                {visibleColumns.project && (
                  <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase font-mono">Project & Item</th>
                )}
                {visibleColumns.category && (
                  <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase font-mono">Category</th>
                )}
                {visibleColumns.description && (
                  <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase font-mono">Description</th>
                )}
                {visibleColumns.vendor && (
                  <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase font-mono">Vendor</th>
                )}
                {visibleColumns.qtyRate && (
                  <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase font-mono text-right">Qty & Rate</th>
                )}
                {visibleColumns.amount && (
                  <th
                    onClick={() => {
                      if (sortField === 'amount') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('amount');
                        setSortOrder('desc');
                      }
                    }}
                    className="py-3 px-3.5 font-normal text-[10.5px] uppercase font-mono text-right cursor-pointer hover:text-[var(--text)]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Amount</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}
                {visibleColumns.statusMode && (
                  <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase font-mono">Status / Mode</th>
                )}
                {visibleColumns.invoiceRef && (
                  <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase font-mono">Invoice Ref</th>
                )}
                {visibleColumns.receipt && (
                  <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase font-mono text-center">Receipt</th>
                )}
                {visibleColumns.actions && (
                  <th className="py-3 px-3.5 font-normal text-[10.5px] uppercase font-mono text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)] text-[var(--text-dim)]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={Object.values(visibleColumns).filter(Boolean).length || 1}
                    className="py-12 text-center text-[var(--text-faint)]"
                  >
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
                    <p className="text-xs font-medium text-[var(--text)]">No expense records found</p>
                    <p className="text-[11px] text-[var(--text-faint)] mt-1">
                      {hasActiveFilters
                        ? 'Try clearing or widening your active filters above.'
                        : 'Click "+ Record New Expense" above to add an entry.'}
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
                      className="hover:bg-[var(--surface-2)]/50 transition-colors"
                    >
                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-3 px-3.5 font-mono text-[11px] text-[var(--text-faint)]">
                          {exp.expense_date}
                        </td>
                      )}

                      {/* Project & Item Name (NO IDs!) */}
                      {visibleColumns.project && (
                        <td className="py-3 px-3.5">
                          <div className="font-medium text-[var(--text)]">
                            {proj ? proj.project_name : 'Direct Project'}
                          </div>
                          {item && (
                            <div className="text-[11px] text-[var(--text-faint)]">
                              ↳ {item.item_name}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Category */}
                      {visibleColumns.category && (
                        <td className="py-3 px-3.5 text-[var(--text-dim)]">
                          {cat?.category_name || 'General'}
                        </td>
                      )}

                      {/* Description */}
                      {visibleColumns.description && (
                        <td
                          className="py-3 px-3.5 text-[var(--text)] max-w-[220px] truncate"
                          title={exp.description}
                        >
                          {exp.description}
                        </td>
                      )}

                      {/* Vendor */}
                      {visibleColumns.vendor && (
                        <td className="py-3 px-3.5 text-[var(--text-dim)]">
                          {vendor ? vendor.vendor_name : 'Direct'}
                        </td>
                      )}

                      {/* Qty & Rate */}
                      {visibleColumns.qtyRate && (
                        <td className="py-3 px-3.5 font-mono text-right tabular-nums text-[var(--text-faint)]">
                          {exp.quantity && exp.rate ? (
                            <>
                              <span>{exp.quantity} {exp.unit || ''}</span>
                              <span className="text-[10px] block text-[var(--text-faint)]">
                                @ {currency} {exp.rate.toLocaleString('en-IN')}
                              </span>
                            </>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      )}

                      {/* Amount */}
                      {visibleColumns.amount && (
                        <td className="py-3 px-3.5 font-mono font-medium text-[var(--accent)] text-right tabular-nums text-sm">
                          {currency} {(Number(exp.amount) || 0).toLocaleString('en-IN')}
                        </td>
                      )}

                      {/* Status / Mode */}
                      {visibleColumns.statusMode && (
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-semibold text-[11px] ${
                                exp.payment_status === 'Paid'
                                  ? 'text-emerald-600 dark:text-[var(--green)]'
                                  : exp.payment_status === 'Partial'
                                  ? 'text-[var(--accent)]'
                                  : 'text-red-500 dark:text-[#B5766A]'
                              }`}
                            >
                              {exp.payment_status}
                            </span>
                            <span className="text-[var(--text-faint)]">·</span>
                            <span className="font-mono text-[11px] text-[var(--text-faint)]">
                              {exp.payment_mode}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Invoice Ref */}
                      {visibleColumns.invoiceRef && (
                        <td className="py-3 px-3.5 font-mono text-xs text-[var(--text-faint)]">
                          {exp.reference_number || '—'}
                        </td>
                      )}

                      {/* Attachment preview */}
                      {visibleColumns.receipt && (
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
                              className="inline-flex items-center justify-center p-1.5 text-[var(--accent)] hover:opacity-80 rounded transition-colors cursor-pointer"
                              title="Inspect Bill / Scan"
                            >
                              <FileImage className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[var(--text-faint)] text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="py-3 px-3.5 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEdit(exp)}
                            className="p-1 text-[var(--text-faint)] hover:text-[var(--text)] rounded transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              deleteExpense(exp.id);
                            }}
                            className="p-1 text-[var(--text-faint)] hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Grid View for Expenses */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExpenses.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[var(--text-faint)] border border-dashed border-[var(--border)] rounded">
              No expense records found.
            </div>
          ) : (
            filteredExpenses.map((exp) => {
              const proj = getProject(exp.project_id);
              const cat = getExpenseCategory(exp.expense_category_id);
              const vendor = getVendor(exp.vendor_id);

              return (
                <div
                  key={exp.id}
                  className="p-4 bg-[var(--surface)] border border-[var(--border-soft)] rounded-md flex flex-col justify-between hover:border-[var(--border)] transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]">
                          {cat?.category_name || 'General'}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--text-faint)]">
                          {exp.expense_date}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this expense?')) {
                              deleteExpense(exp.id);
                            }
                          }}
                          className="p-1 text-[var(--text-faint)] hover:text-red-400 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm text-[var(--text)] line-clamp-2 mt-1">
                      {exp.description}
                    </h4>

                    <div className="mt-3 pt-2.5 border-t border-[var(--border-soft)] space-y-1 text-xs text-[var(--text-dim)]">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-faint)]">Project:</span>
                        <span className="font-medium text-[var(--text)] truncate max-w-[180px]">
                          {proj?.project_name || 'Direct'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-faint)]">Supplier:</span>
                        <span className="truncate max-w-[180px]">{vendor?.vendor_name || 'Direct'}</span>
                      </div>
                      {exp.reference_number && exp.reference_number !== 'N/A' && (
                        <div className="flex justify-between font-mono text-[11px]">
                          <span className="text-[var(--text-faint)]">Ref / Inv:</span>
                          <span className="truncate max-w-[180px]">{exp.reference_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[var(--text-faint)] block">
                        {exp.payment_status} ({exp.payment_mode})
                      </span>
                      <span className="font-mono font-medium text-[var(--accent)] text-base">
                        {currency} {Number(exp.amount).toLocaleString('en-IN')}
                      </span>
                    </div>

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
                        className="p-1.5 rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                        title="View Receipt"
                      >
                        <FileImage className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Dedicated Expense Modal for Create / Edit */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
          if (onCloseCreateModal) onCloseCreateModal();
        }}
        editingExpense={editingExpense}
      />

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
