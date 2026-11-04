import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  ProjectMaster,
  ProjectStatus,
  ViewMode,
  ItemMaster,
  StatusActiveInactive,
} from '../../types/erp';
import { ViewToggle } from '../common/ViewToggle';
import { exportMasterToCSV, downloadFile } from '../../services/api';
import { ReceiptModal } from '../common/ReceiptModal';
import { ExpenseModal } from '../expenses/ExpenseModal';
import {
  Plus,
  Search,
  Calendar,
  Building2,
  Edit2,
  Trash2,
  X,
  Download,
  Package,
  Layers,
  Image as ImageIcon,
  DollarSign,
  TrendingUp,
  FolderKanban,
  ExternalLink,
  Receipt,
  CheckCircle2,
  Tag,
  Unlink,
  Maximize2,
  Check,
  FileSpreadsheet,
} from 'lucide-react';

export const ProjectMasterView: React.FC = () => {
  const {
    projects,
    clients,
    items,
    itemTypes,
    currency,
    addProject,
    updateProject,
    deleteProject,
    addItem,
    updateItem,
    deleteItem,
    getClient,
    getItemType,
    getProjectExpenses,
    getProjectSpent,
    getExpenseCategory,
    getVendor,
    setActiveTab,
  } = useERP();

  // Primary view tabs: 'workspace' (Quotation-style project page with items) vs 'directory' (all projects overview)
  const [activeTabMode, setActiveTabMode] = useState<'workspace' | 'directory'>('workspace');
  const [selectedProjectId, setSelectedProjectId] = useState<number>(projects[0]?.id || 1);

  // Directory filters
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectMaster | null>(null);

  // New Item for Project modal
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isTagCatalogModalOpen, setIsTagCatalogModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);

  // Direct Expense Modal from project
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    url?: string;
  }>({
    isOpen: false,
    title: '',
  });

  // Selected project object
  const currentProject = useERP().projects.find((p) => p.id === selectedProjectId) || projects[0];
  const currentClient = currentProject ? getClient(currentProject.client_id) : null;

  // Items tagged to this specific project
  const projectItems = useMemo(() => {
    if (!currentProject) return [];
    return items.filter((i) => i.project_id === currentProject.id);
  }, [items, currentProject]);

  // Expenses recorded for this specific project
  const currentProjectExpenses = useMemo(() => {
    if (!currentProject) return [];
    return getProjectExpenses(currentProject.id);
  }, [getProjectExpenses, currentProject]);

  // Financial calculations
  const projectPricing = currentProject?.pricing ?? Math.round((currentProject?.approved_budget || 0) * 1.35);
  const projectBudget = Number(currentProject?.approved_budget) || 0;
  const projectSpent = currentProject ? getProjectSpent(currentProject.id) : 0;
  const projectVariance = projectBudget - projectSpent;
  const budgetUtilizationPct = projectBudget > 0 ? (projectSpent / projectBudget) * 100 : 0;
  const grossProfitMargin = projectPricing - projectSpent;
  const grossProfitPct = projectPricing > 0 ? ((projectPricing - projectSpent) / projectPricing) * 100 : 0;

  // Estimated item rates sum
  const itemsEstimatedTotal = projectItems.reduce((acc, curr) => acc + (Number(curr.default_rate) || 0), 0);

  // Project Form state with "pricing" field
  const initialProjectForm: Omit<ProjectMaster, 'id'> = {
    project_name: '',
    client_id: clients[0]?.id || 1,
    description: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    approved_budget: 500000,
    pricing: 675000,
    status: 'Active',
  };
  const [projectFormData, setProjectFormData] = useState<Omit<ProjectMaster, 'id'> & { id?: number }>(
    initialProjectForm
  );

  // Item Form state for creating/editing item under project
  const initialItemForm: Omit<ItemMaster, 'id'> = {
    project_id: currentProject?.id || null,
    item_name: '',
    item_type_id: itemTypes[0]?.id || 1,
    description: '',
    status: 'Active',
    reference_picture: '',
    work_location_picture: '',
    item_size: 'Standard',
    default_rate: 25000,
    remark: '',
  };
  const [itemFormData, setItemFormData] = useState<Omit<ItemMaster, 'id'> & { id?: number }>(
    initialItemForm
  );

  // Filtered projects for Directory view
  const filteredProjects = projects.filter((p) => {
    const q = searchTerm.toLowerCase();
    const client = getClient(p.client_id);
    const matchesSearch =
      !q ||
      p.project_name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (client && client.client_name.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Project Modal Actions
  const handleOpenCreateProject = () => {
    setEditingProject(null);
    setProjectFormData({
      ...initialProjectForm,
      client_id: clients[0]?.id || 1,
    });
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (p: ProjectMaster) => {
    setEditingProject(p);
    setProjectFormData({
      ...p,
      pricing: p.pricing ?? Math.round(Number(p.approved_budget || 0) * 1.35),
    });
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFormData.project_name.trim() || !projectFormData.client_id) {
      alert('Please fill required fields: Project Name and Client.');
      return;
    }

    if (editingProject) {
      updateProject({
        ...editingProject,
        ...projectFormData,
        approved_budget: Number(projectFormData.approved_budget) || 0,
        pricing: Number(projectFormData.pricing) || 0,
      } as ProjectMaster);
    } else {
      const created = addProject({
        project_name: projectFormData.project_name.trim(),
        client_id: Number(projectFormData.client_id),
        description: projectFormData.description,
        start_date: projectFormData.start_date,
        end_date: projectFormData.end_date,
        approved_budget: Number(projectFormData.approved_budget) || 0,
        pricing: Number(projectFormData.pricing) || 0,
        status: projectFormData.status,
      });
      setSelectedProjectId(created.id);
      setActiveTabMode('workspace');
    }
    setIsProjectModalOpen(false);
  };

  // Item Modal Actions
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemFormData({
      ...initialItemForm,
      project_id: currentProject?.id || null,
    });
    setIsAddItemModalOpen(true);
  };

  const handleOpenEditItem = (item: ItemMaster) => {
    setEditingItem(item);
    setItemFormData({ ...item });
    setIsAddItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.item_name.trim()) {
      alert('Please enter an Item Name.');
      return;
    }

    if (editingItem) {
      updateItem({
        ...editingItem,
        ...itemFormData,
        project_id: currentProject?.id || null,
        default_rate: Number(itemFormData.default_rate) || 0,
      });
    } else {
      addItem({
        project_id: currentProject?.id || null,
        item_name: itemFormData.item_name.trim(),
        item_type_id: Number(itemFormData.item_type_id),
        description: itemFormData.description,
        status: itemFormData.status as StatusActiveInactive,
        reference_picture: itemFormData.reference_picture || '',
        work_location_picture: itemFormData.work_location_picture || '',
        item_size: itemFormData.item_size || 'Standard',
        default_rate: Number(itemFormData.default_rate) || 0,
        remark: itemFormData.remark || '',
      });
    }
    setIsAddItemModalOpen(false);
  };

  // Tag existing general catalog item to current project
  const handleTagCatalogItemToProject = (catalogItemId: number) => {
    const it = items.find((i) => i.id === catalogItemId);
    if (!it || !currentProject) return;
    updateItem({
      ...it,
      project_id: currentProject.id,
    });
  };

  // Unlink item from this project (convert back to general catalog item)
  const handleUnlinkItemFromProject = (item: ItemMaster) => {
    if (confirm(`Unlink "${item.item_name}" from project "${currentProject?.project_name}"?`)) {
      updateItem({
        ...item,
        project_id: null,
      });
    }
  };

  // Export current project scope and items to CSV
  const handleExportProjectScopeCSV = () => {
    if (!currentProject) return;
    const projectItemsExport = projectItems.map((item, idx) => ({
      serial_no: idx + 1,
      project_name: currentProject.project_name,
      client_name: currentClient?.client_name || 'N/A',
      item_name: item.item_name,
      item_type: getItemType(item.item_type_id)?.description || 'General',
      item_size: item.item_size,
      default_rate: item.default_rate,
      description: item.description,
      remarks: item.remark,
      reference_picture: item.reference_picture,
      work_location_picture: item.work_location_picture,
    }));

    const csv = exportMasterToCSV(`Project_${currentProject.id}_Scope`, projectItemsExport);
    downloadFile(
      csv,
      `${currentProject.project_name.replace(/\s+/g, '_')}_Items_Scope_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation: Project Workspace vs All Projects */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-soft)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-1.5">
              <FolderKanban className="w-3 h-3" />
              <span>Project Management & Scope</span>
            </span>
          </div>
          <h2 className="font-display font-medium text-2xl md:text-3xl text-[var(--text)] mt-1">
            Projects
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-dim)] mt-0.5">
            Manage client project scopes, tagged project items, pricing, approved budgets, and itemized expenditures.
          </p>
        </div>

        {/* View mode toggle & New Project button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs font-mono">
            <button
              onClick={() => setActiveTabMode('workspace')}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                activeTabMode === 'workspace'
                  ? 'bg-[var(--accent)] text-[#1E1B18] font-bold shadow-xs'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              Project Workspace & Items
            </button>
            <button
              onClick={() => setActiveTabMode('directory')}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                activeTabMode === 'directory'
                  ? 'bg-[var(--accent)] text-[#1E1B18] font-bold shadow-xs'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              All Projects ({projects.length})
            </button>
          </div>

          <button
            onClick={handleOpenCreateProject}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: PROJECT WORKSPACE & SCOPE (Similar to Generate Client Quotation) */}
      {/* ========================================================================= */}
      {activeTabMode === 'workspace' && currentProject && (
        <div className="space-y-6">
          {/* Project Quick Selector & Actions Bar */}
          <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-mono font-semibold uppercase text-[var(--text-dim)] shrink-0">
                Active Project:
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(parseInt(e.target.value, 10))}
                className="flex-1 p-2.5 rounded bg-[var(--bg)] border border-[var(--border)] text-sm font-medium text-[var(--text)] focus:border-[var(--accent)] outline-none"
              >
                {projects.map((p) => {
                  const cl = getClient(p.client_id);
                  const price = p.pricing ?? Math.round((p.approved_budget || 0) * 1.35);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.project_name} · {cl?.client_name || 'Direct Client'} · Pricing: {currency}{' '}
                      {price.toLocaleString('en-IN')} [{p.status}]
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleOpenEditProject(currentProject)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Edit Project</span>
              </button>

              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--accent)] text-[#1E1B18] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>

              <button
                onClick={handleExportProjectScopeCSV}
                title="Download Project Items Scope CSV"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="hidden sm:inline">Export Scope CSV</span>
              </button>
            </div>
          </div>

          {/* Project Details & Financial Cards Strip (Styled like Quotation Generator Header) */}
          <div className="p-5 sm:p-6 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Col 1: Project Identity & Timeline */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                        {currentProject.status}
                      </span>
                      <span className="text-xs font-mono text-[var(--text-faint)]">
                        ID: PRJ-{currentProject.id.toString().padStart(4, '0')}
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-xl sm:text-2xl text-[var(--text)] mt-1.5">
                      {currentProject.project_name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[var(--text-dim)] leading-relaxed">
                  {currentProject.description || 'No detailed scope description provided.'}
                </p>

                {/* Client Info Pill */}
                {currentClient && (
                  <div className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[var(--accent)]" />
                      <div>
                        <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase block">
                          Client Organization
                        </span>
                        <strong className="text-[var(--text)]">{currentClient.client_name}</strong>
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-[var(--text-dim)] flex items-center gap-4">
                      {currentClient.contact_person && (
                        <span>Contact: <strong className="text-[var(--text)]">{currentClient.contact_person}</strong></span>
                      )}
                      {currentClient.phone && <span>{currentClient.phone}</span>}
                      {currentClient.gstin && <span>GSTIN: {currentClient.gstin}</span>}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-faint)]">
                  <span className="flex items-center gap-1.5 text-[var(--text-dim)]">
                    <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Duration:</span>
                    <strong className="text-[var(--text)]">{currentProject.start_date}</strong>
                    <span>to</span>
                    <strong className="text-[var(--text)]">{currentProject.end_date}</strong>
                  </span>
                </div>
              </div>

              {/* Col 2: Financial Stats Block (Including the new "Pricing" Field!) */}
              <div className="rounded-lg bg-[var(--surface-2)]/40 border border-[var(--border)] p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-faint)] block">
                    Financial Summary & Profitability
                  </span>

                  {/* 1. NEW PRICING FIELD */}
                  <div className="p-3 rounded bg-[var(--surface)] border border-[var(--accent)]/40 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-[var(--accent)]" />
                        <span className="text-xs font-mono font-semibold text-[var(--text)]">
                          Project Pricing (Contract Value)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent)] text-[#1E1B18] font-bold">
                        New Field
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-xl sm:text-2xl font-bold text-[var(--accent)]">
                      {currency} {projectPricing.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* 2. Approved Budget & Spent */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded bg-[var(--bg)] border border-[var(--border)]">
                      <span className="text-[10px] text-[var(--text-faint)] block">Approved Budget</span>
                      <span className="font-bold text-[var(--text)]">
                        {currency} {projectBudget.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-[var(--bg)] border border-[var(--border)]">
                      <span className="text-[10px] text-[var(--text-faint)] block">Actual Spent</span>
                      <span className="font-bold text-red-400">
                        {currency} {projectSpent.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* 3. Gross Margin / Profitability */}
                  <div className="p-2.5 rounded bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-[var(--text-faint)] block">
                        Estimated Margin (Pricing - Spent)
                      </span>
                      <span className={`font-mono text-xs font-bold ${grossProfitMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {currency} {grossProfitMargin.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${grossProfitMargin >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400'}`}>
                      {grossProfitPct.toFixed(1)}% Margin
                    </span>
                  </div>
                </div>

                {/* Budget Utilization Progress Bar */}
                <div>
                  <div className="flex justify-between items-baseline text-[11px] font-mono mb-1 text-[var(--text-dim)]">
                    <span>Budget Used ({budgetUtilizationPct.toFixed(1)}%)</span>
                    <span>Remaining: {currency} {projectVariance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
                    <div
                      className={`h-full transition-all duration-500 ${
                        budgetUtilizationPct > 100
                          ? 'bg-red-500'
                          : budgetUtilizationPct > 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(budgetUtilizationPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PROJECT ITEMS SECTION (Styled Similar to Generate Client Quotation Line Items) */}
          {/* ========================================================================= */}
          <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xs">
            {/* Section Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-soft)] bg-[var(--surface-2)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="font-display font-medium text-lg text-[var(--text)]">
                    Items Related to Project ({projectItems.length})
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-dim)] mt-0.5">
                  Specification scope, dimension sizes, unit rates, photo documentation, and item-tagged cost ledger.
                </p>
              </div>

              {/* Action Buttons to Add Items */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddItem}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Item to Project</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTagCatalogModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Tag Existing Catalog Item</span>
                </button>
              </div>
            </div>

            {/* Project Items Table (Quotation Generator Format) */}
            {projectItems.length === 0 ? (
              <div className="p-10 text-center space-y-3 bg-[var(--bg)]/50">
                <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text-faint)]">
                  <Package className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <div>
                  <h4 className="font-display font-medium text-base text-[var(--text)]">
                    No items tagged to this project yet
                  </h4>
                  <p className="text-xs text-[var(--text-dim)] max-w-md mx-auto mt-1">
                    Add fabricated items, digital print graphics, LED signage specifications, or tag existing catalog items to this project scope.
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={handleOpenAddItem}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] text-[#1E1B18] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Item</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-[var(--border-soft)]">
                  <thead className="bg-[var(--surface-2)] text-[var(--text-dim)] font-mono text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 w-16 text-center">Ref Pic</th>
                      <th className="py-3 px-3 w-16 text-center">Site Pic</th>
                      <th className="py-3 px-4 min-w-[200px]">Item Description & Specs</th>
                      <th className="py-3 px-3 min-w-[130px]">Classification</th>
                      <th className="py-3 px-3 min-w-[100px]">Size / Dim</th>
                      <th className="py-3 px-3 text-right min-w-[110px]">Default Rate</th>
                      <th className="py-3 px-3 text-right min-w-[110px]">Expenses Booked</th>
                      <th className="py-3 px-3 text-center min-w-[80px]">Status</th>
                      <th className="py-3 px-3 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)] text-[var(--text)]">
                    {projectItems.map((item, index) => {
                      const typeDesc = getItemType(item.item_type_id)?.description || 'Material';
                      // Calculate expenses logged against this specific item
                      const itemExpenses = currentProjectExpenses.filter((e) => e.project_item_id === item.id);
                      const itemExpensesSum = itemExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-[var(--surface-2)]/40 transition-colors group"
                        >
                          {/* 1. Serial Number */}
                          <td className="py-3.5 px-3 text-center font-mono text-xs font-bold text-[var(--text-faint)]">
                            {index + 1}
                          </td>

                          {/* 2. Reference Picture (Clickable Thumbnail) */}
                          <td className="py-3.5 px-3 text-center">
                            {item.reference_picture ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    isOpen: true,
                                    title: `${item.item_name} — Reference Spec`,
                                    subtitle: `Size: ${item.item_size} · Default Rate: ${currency} ${Number(item.default_rate).toLocaleString('en-IN')}`,
                                    url: item.reference_picture,
                                  })
                                }
                                className="relative group/pic inline-block rounded border border-[var(--border)] overflow-hidden cursor-pointer"
                                title="Click to view reference image"
                              >
                                <img
                                  src={item.reference_picture}
                                  alt="Ref"
                                  className="w-10 h-10 object-cover group-hover/pic:scale-110 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/pic:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <Maximize2 className="w-3 h-3" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-faint)] mx-auto">
                                <ImageIcon className="w-3.5 h-3.5 opacity-50" />
                              </div>
                            )}
                          </td>

                          {/* 3. Work Location Picture */}
                          <td className="py-3.5 px-3 text-center">
                            {item.work_location_picture ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    isOpen: true,
                                    title: `${item.item_name} — Site Work Location`,
                                    subtitle: item.remark || `Project: ${currentProject.project_name}`,
                                    url: item.work_location_picture,
                                  })
                                }
                                className="relative group/pic inline-block rounded border border-[var(--border)] overflow-hidden cursor-pointer"
                                title="Click to view site work location"
                              >
                                <img
                                  src={item.work_location_picture}
                                  alt="Site"
                                  className="w-10 h-10 object-cover group-hover/pic:scale-110 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/pic:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <Maximize2 className="w-3 h-3" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-faint)] mx-auto">
                                <ImageIcon className="w-3.5 h-3.5 opacity-50" />
                              </div>
                            )}
                          </td>

                          {/* 4. Description & Specs */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-xs text-[var(--text)]">
                              {item.item_name}
                            </div>
                            <div className="text-[11px] text-[var(--text-dim)] mt-0.5 line-clamp-2 leading-relaxed">
                              {item.description}
                            </div>
                            {item.remark && (
                              <div className="text-[10px] font-mono text-[var(--accent)] mt-1 flex items-center gap-1">
                                <span>Note:</span>
                                <span>{item.remark}</span>
                              </div>
                            )}
                          </td>

                          {/* 5. Classification */}
                          <td className="py-3.5 px-3">
                            <span className="text-[11px] font-mono text-[var(--text-dim)] bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--border)]">
                              {typeDesc}
                            </span>
                          </td>

                          {/* 6. Item Size */}
                          <td className="py-3.5 px-3 font-mono text-[11px] text-[var(--text)]">
                            {item.item_size || '—'}
                          </td>

                          {/* 7. Default Rate */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-xs text-[var(--accent)]">
                            {currency} {Number(item.default_rate).toLocaleString('en-IN')}
                          </td>

                          {/* 8. Expenses Booked */}
                          <td className="py-3.5 px-3 text-right font-mono text-xs">
                            {itemExpensesSum > 0 ? (
                              <div>
                                <span className="font-semibold text-red-400">
                                  {currency} {itemExpensesSum.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-[var(--text-faint)] block">
                                  ({itemExpenses.length} bills)
                                </span>
                              </div>
                            ) : (
                              <span className="text-[var(--text-faint)]">₹ 0</span>
                            )}
                          </td>

                          {/* 9. Status */}
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                item.status === 'Active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/30'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          {/* 10. Actions */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditItem(item)}
                                title="Edit item specifications"
                                className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[var(--surface)] rounded transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleUnlinkItemFromProject(item)}
                                title="Unlink from this project (convert to general catalog)"
                                className="p-1.5 text-[var(--text-faint)] hover:text-amber-400 hover:bg-[var(--surface)] rounded transition-colors cursor-pointer"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete "${item.item_name}"?`)) {
                                    deleteItem(item.id);
                                  }
                                }}
                                title="Delete item completely"
                                className="p-1.5 text-[var(--text-faint)] hover:text-red-400 hover:bg-[var(--surface)] rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Items Summary Footprint */}
                <div className="p-4 bg-[var(--surface-2)]/60 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="text-[var(--text-dim)]">
                    Total Project Scope Items: <strong className="text-[var(--text)]">{projectItems.length}</strong>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>
                      Sum of Item Base Rates: <strong className="text-[var(--accent)] font-bold">{currency} {itemsEstimatedTotal.toLocaleString('en-IN')}</strong>
                    </span>
                    <button
                      onClick={() => setActiveTab('quotation')}
                      className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      <span>Generate Client Quotation</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* PROJECT EXPENDITURES LEDGER ACCORDION / STRIP */}
          {/* ========================================================================= */}
          <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[var(--accent)]" />
                <h4 className="font-display font-medium text-base text-[var(--text)]">
                  Expenses Booked on {currentProject.project_name} ({currentProjectExpenses.length})
                </h4>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] text-[#1E1B18] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record New Expense</span>
              </button>
            </div>

            {currentProjectExpenses.length === 0 ? (
              <p className="text-xs text-[var(--text-faint)] py-2">
                No expense entries have been posted to this project yet. Use "Record New Expense" to post material purchases, riggers labour, or transport costs.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-[var(--border-soft)]">
                  <thead className="bg-[var(--surface-2)] text-[var(--text-dim)] font-mono text-[11px]">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Tagged Project Item</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Vendor</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)] text-[var(--text-dim)] font-mono text-[11px]">
                    {currentProjectExpenses.slice(0, 8).map((exp) => {
                      const cat = getExpenseCategory(exp.expense_category_id);
                      const vendor = getVendor(exp.vendor_id);
                      const taggedItem = exp.project_item_id ? items.find((i) => i.id === exp.project_item_id) : null;

                      return (
                        <tr key={exp.id} className="hover:bg-[var(--surface-2)]/30">
                          <td className="p-2.5">{exp.expense_date}</td>
                          <td className="p-2.5">{cat?.category_name || 'General'}</td>
                          <td className="p-2.5">
                            {taggedItem ? (
                              <span className="text-[var(--accent)] font-semibold">{taggedItem.item_name}</span>
                            ) : (
                              <span className="text-[var(--text-faint)]">General Site</span>
                            )}
                          </td>
                          <td className="p-2.5 text-[var(--text)] font-sans max-w-[200px] truncate">
                            {exp.description}
                          </td>
                          <td className="p-2.5">{vendor?.vendor_name || 'Direct'}</td>
                          <td className="p-2.5 text-right font-bold text-[var(--text)]">
                            {currency} {Number(exp.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-dim)]">
                              {exp.payment_status}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            {exp.attachment ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    isOpen: true,
                                    title: `Expense Voucher: ${exp.description}`,
                                    subtitle: `Amount: ${currency} ${Number(exp.amount).toLocaleString('en-IN')} · Ref: ${exp.reference_number || 'N/A'}`,
                                    url: exp.attachment,
                                  })
                                }
                                className="text-[var(--accent)] hover:underline cursor-pointer"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-[var(--text-faint)]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: ALL PROJECTS DIRECTORY (Grid / List View with Filters) */}
      {/* ========================================================================= */}
      {activeTabMode === 'directory' && (
        <div className="space-y-6">
          {/* Filter toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[var(--surface)] rounded-md border border-[var(--border)]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search projects by name, client, description..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center gap-2.5">
              {/* Status filter toggle */}
              <div className="flex items-center border border-[var(--border)] rounded overflow-hidden">
                {(['all', 'Planning', 'Active', 'Completed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((project) => {
                const client = getClient(project.client_id);
                const spent = getProjectSpent(project.id);
                const budget = Number(project.approved_budget) || 1;
                const pricing = project.pricing ?? Math.round(budget * 1.35);
                const variance = budget - spent;
                const pct = (spent / budget) * 100;
                const taggedCount = items.filter((i) => i.project_id === project.id).length;

                return (
                  <div
                    key={project.id}
                    className="p-5 bg-[var(--surface)] rounded-md border border-[var(--border-soft)] flex flex-col justify-between hover:border-[var(--accent)] transition-all space-y-4"
                  >
                    <div>
                      {/* Top status & Action buttons */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]">
                            {project.status}
                          </span>
                          <h3 className="font-display font-medium text-lg text-[var(--text)] mt-1.5">
                            {project.project_name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                            <span>{client?.client_name || 'Independent Project'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditProject(project)}
                            className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded cursor-pointer"
                            title="Edit Project"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete project "${project.project_name}"?`)) {
                                deleteProject(project.id);
                              }
                            }}
                            className="p-1.5 text-[var(--text-faint)] hover:text-red-400 rounded cursor-pointer"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--text-dim)] line-clamp-2 mt-2 leading-relaxed">
                        {project.description}
                      </p>

                      {/* Pricing, Budget & Scope Pills */}
                      <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
                        <div className="p-2 rounded bg-[var(--surface-2)]/50 border border-[var(--border)]">
                          <span className="text-[10px] text-[var(--text-faint)] block uppercase">Pricing</span>
                          <span className="font-bold text-[var(--accent)]">
                            {currency} {pricing.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-[var(--surface-2)]/50 border border-[var(--border)]">
                          <span className="text-[10px] text-[var(--text-faint)] block uppercase">Scope Items</span>
                          <span className="font-bold text-[var(--text)]">
                            {taggedCount} tagged items
                          </span>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-faint)] mt-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {project.start_date}
                        </span>
                        <span>→</span>
                        <span>{project.end_date}</span>
                      </div>

                      {/* Budget Burn Meter */}
                      <div className="mt-4 pt-3 border-t border-[var(--border-soft)]">
                        <div className="flex justify-between items-baseline text-xs mb-1.5">
                          <span className="text-[var(--text-dim)] text-[11px] font-mono">
                            Budget Utilized ({pct.toFixed(1)}%)
                          </span>
                          <span className="font-mono text-xs text-[var(--text)]">
                            {currency} {spent.toLocaleString('en-IN')} / {currency}{' '}
                            {budget.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Open Workspace Button */}
                    <button
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setActiveTabMode('workspace');
                      }}
                      className="w-full py-2 px-3 text-xs font-mono font-semibold rounded bg-[var(--surface-2)] hover:bg-[var(--accent)] hover:text-[#1E1B18] text-[var(--text)] border border-[var(--border)] hover:border-transparent transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Project Items Workspace</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className="bg-[var(--surface)] border border-[var(--border-soft)] rounded-md overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-[var(--border-soft)]">
                <thead className="bg-[var(--surface-2)] text-[var(--text-dim)] font-mono text-[11px]">
                  <tr>
                    <th className="p-3">Project Name</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Timeline</th>
                    <th className="p-3 text-right">Pricing (₹)</th>
                    <th className="p-3 text-right">Budget (₹)</th>
                    <th className="p-3 text-right">Spent (₹)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Items</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)] text-[var(--text)]">
                  {filteredProjects.map((project) => {
                    const client = getClient(project.client_id);
                    const spent = getProjectSpent(project.id);
                    const pricing = project.pricing ?? Math.round((project.approved_budget || 0) * 1.35);
                    const taggedCount = items.filter((i) => i.project_id === project.id).length;

                    return (
                      <tr key={project.id} className="hover:bg-[var(--surface-2)]/30">
                        <td className="p-3 font-semibold">
                          <button
                            onClick={() => {
                              setSelectedProjectId(project.id);
                              setActiveTabMode('workspace');
                            }}
                            className="text-[var(--text)] hover:text-[var(--accent)] text-left cursor-pointer"
                          >
                            {project.project_name}
                          </button>
                        </td>
                        <td className="p-3 text-[var(--text-dim)]">{client?.client_name || '—'}</td>
                        <td className="p-3 font-mono text-[11px] text-[var(--text-faint)]">
                          {project.start_date} → {project.end_date}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-[var(--accent)]">
                          {currency} {pricing.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {currency} {Number(project.approved_budget).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono text-red-400">
                          {currency} {spent.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]">
                            {project.status}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg)] text-[var(--text-dim)] border border-[var(--border)]">
                            {taggedCount} items
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedProjectId(project.id);
                                setActiveTabMode('workspace');
                              }}
                              className="p-1.5 text-[var(--accent)] hover:text-[var(--text)]"
                              title="Open Workspace"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditProject(project)}
                              className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)]"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT PROJECT (Includes the new PRICING field) */}
      {/* ========================================================================= */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-[var(--surface)] text-[var(--text)] rounded-lg shadow-2xl border border-[var(--border)] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-soft)]">
              <h3 className="font-display font-medium text-lg text-[var(--text)]">
                {editingProject ? 'Edit Project Master' : 'Create New Project'}
              </h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Project Name */}
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={projectFormData.project_name}
                  onChange={(e) =>
                    setProjectFormData({ ...projectFormData, project_name: e.target.value })
                  }
                  placeholder="e.g. Airport Terminal Monolith Totem Signage"
                  className="w-full text-xs p-2.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                />
              </div>

              {/* Client Selection */}
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                  Client *
                </label>
                <select
                  required
                  value={projectFormData.client_id}
                  onChange={(e) =>
                    setProjectFormData({
                      ...projectFormData,
                      client_id: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full text-xs p-2.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name} ({c.contact_person})
                    </option>
                  ))}
                </select>
              </div>

              {/* NEW FIELD: PRICING & APPROVED BUDGET ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded bg-[var(--bg)] border border-[var(--border)]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-mono font-semibold text-[var(--accent)]">
                      Pricing (₹) *
                    </label>
                    <span className="text-[9px] font-mono px-1 py-0.2 bg-[var(--accent)] text-[#1E1B18] font-bold rounded">
                      New Field
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={projectFormData.pricing ?? ''}
                    onChange={(e) =>
                      setProjectFormData({
                        ...projectFormData,
                        pricing: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Contract quote price"
                    className="w-full text-xs font-mono font-bold p-2 rounded bg-[var(--surface)] border border-[var(--accent)] text-[var(--accent)] focus:outline-none"
                  />
                  <span className="text-[10px] text-[var(--text-faint)] mt-0.5 block">
                    Contracted quote to client
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                    Approved Budget (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={projectFormData.approved_budget}
                    onChange={(e) =>
                      setProjectFormData({
                        ...projectFormData,
                        approved_budget: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Allocated cost budget"
                    className="w-full text-xs font-mono p-2 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                  />
                  <span className="text-[10px] text-[var(--text-faint)] mt-0.5 block">
                    Max expense spend limit
                  </span>
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={projectFormData.start_date}
                    onChange={(e) =>
                      setProjectFormData({ ...projectFormData, start_date: e.target.value })
                    }
                    className="w-full text-xs font-mono p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                    Expected Completion
                  </label>
                  <input
                    type="date"
                    value={projectFormData.end_date}
                    onChange={(e) =>
                      setProjectFormData({ ...projectFormData, end_date: e.target.value })
                    }
                    className="w-full text-xs font-mono p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                  Project Status
                </label>
                <select
                  value={projectFormData.status}
                  onChange={(e) =>
                    setProjectFormData({
                      ...projectFormData,
                      status: e.target.value as ProjectStatus,
                    })
                  }
                  className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                  Scope Description
                </label>
                <textarea
                  rows={3}
                  value={projectFormData.description}
                  onChange={(e) =>
                    setProjectFormData({ ...projectFormData, description: e.target.value })
                  }
                  placeholder="Design details, specifications, structural requirements, site address..."
                  className="w-full text-xs p-2.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none resize-none"
                />
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono rounded border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] text-[#1E1B18] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT ITEM RELATED TO PROJECT (Quotation Item Format) */}
      {/* ========================================================================= */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-[var(--surface)] text-[var(--text)] rounded-lg shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="font-display font-medium text-lg text-[var(--text)]">
                  {editingItem ? 'Edit Project Item' : 'Add Item to Project Scope'}
                </h3>
                <p className="text-xs text-[var(--text-dim)] mt-0.5">
                  Tagged under: <strong className="text-[var(--text)]">{currentProject?.project_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                  Item Name / Specification *
                </label>
                <input
                  type="text"
                  required
                  value={itemFormData.item_name}
                  onChange={(e) => setItemFormData({ ...itemFormData, item_name: e.target.value })}
                  placeholder="e.g. 3D Acrylic Channel Letter Glow Sign"
                  className="w-full text-xs p-2.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none font-medium"
                />
              </div>

              {/* Classification & Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                    Classification / Type *
                  </label>
                  <select
                    required
                    value={itemFormData.item_type_id}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        item_type_id: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                  >
                    {itemTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                    Item Size / Dimensions
                  </label>
                  <input
                    type="text"
                    value={itemFormData.item_size}
                    onChange={(e) => setItemFormData({ ...itemFormData, item_size: e.target.value })}
                    placeholder="e.g. 18ft x 3.5ft or 4ft x 8ft"
                    className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none font-mono"
                  />
                </div>
              </div>

              {/* Rate & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                    Default Unit Rate ({currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={itemFormData.default_rate}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        default_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs font-mono font-bold p-2 rounded bg-[var(--bg)] border border-[var(--accent)] text-[var(--accent)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                    Status
                  </label>
                  <select
                    value={itemFormData.status}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        status: e.target.value as StatusActiveInactive,
                      })
                    }
                    className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Reference Picture (URL or File Upload) */}
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                  Reference Picture (URL or Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={itemFormData.reference_picture}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, reference_picture: e.target.value })
                    }
                    placeholder="https://... image link or upload photo"
                    className="flex-1 text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                  />
                  <label className="px-3 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-dim)] hover:text-[var(--text)] text-xs font-mono rounded cursor-pointer transition-colors shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setItemFormData({
                              ...itemFormData,
                              reference_picture: event.target?.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {itemFormData.reference_picture && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={itemFormData.reference_picture}
                      alt="Ref"
                      className="w-12 h-12 object-cover rounded border border-[var(--border)]"
                    />
                    <span className="text-[11px] text-green-500 font-mono">Reference photo loaded</span>
                  </div>
                )}
              </div>

              {/* Work Location Picture (URL or File Upload) */}
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                  Work Location Site Picture (URL or Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={itemFormData.work_location_picture}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, work_location_picture: e.target.value })
                    }
                    placeholder="https://... installation location on building"
                    className="flex-1 text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] outline-none"
                  />
                  <label className="px-3 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-dim)] hover:text-[var(--text)] text-xs font-mono rounded cursor-pointer transition-colors shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setItemFormData({
                              ...itemFormData,
                              work_location_picture: event.target?.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {itemFormData.work_location_picture && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={itemFormData.work_location_picture}
                      alt="Site"
                      className="w-12 h-12 object-cover rounded border border-[var(--border)]"
                    />
                    <span className="text-[11px] text-green-500 font-mono">Site location photo loaded</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                  Item Technical Specifications
                </label>
                <textarea
                  rows={2}
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  placeholder="Material grade, LED model, acrylic return thickness, waterproofing..."
                  className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none resize-none"
                />
              </div>

              {/* Remark */}
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                  Installation / Site Remarks
                </label>
                <input
                  type="text"
                  value={itemFormData.remark}
                  onChange={(e) => setItemFormData({ ...itemFormData, remark: e.target.value })}
                  placeholder="e.g. Scissor lift required, night work permission needed..."
                  className="w-full text-xs p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono rounded border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] text-[#1E1B18] hover:opacity-90 cursor-pointer shadow-xs"
                >
                  {editingItem ? 'Update Project Item' : 'Add to Project Scope'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TAG EXISTING GENERAL CATALOG ITEM TO PROJECT */}
      {/* ========================================================================= */}
      {isTagCatalogModalOpen && currentProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-[var(--surface)] text-[var(--text)] rounded-lg shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="font-display font-medium text-lg text-[var(--text)]">
                  Tag Existing Catalog Item
                </h3>
                <p className="text-xs text-[var(--text-dim)] mt-0.5">
                  Assign items from the general catalog to: <strong className="text-[var(--text)]">{currentProject.project_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsTagCatalogModalOpen(false)}
                className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <p className="text-xs text-[var(--text-dim)]">
                Choose an item below to tag it directly into this project's scope of work:
              </p>

              {items.filter((i) => i.project_id !== currentProject.id).length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-faint)] font-mono">
                  All available catalog items are already tagged to this project!
                </div>
              ) : (
                <div className="space-y-2">
                  {items
                    .filter((i) => i.project_id !== currentProject.id)
                    .map((item) => {
                      const typeDesc = getItemType(item.item_type_id)?.description || 'General';
                      const isAssignedToOther = item.project_id && item.project_id !== currentProject.id;
                      const otherProject = isAssignedToOther ? projects.find((p) => p.id === item.project_id) : null;

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] transition-all flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            {item.reference_picture ? (
                              <img
                                src={item.reference_picture}
                                alt={item.item_name}
                                className="w-10 h-10 object-cover rounded border border-[var(--border)]"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-faint)]">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <strong className="text-xs text-[var(--text)] block">{item.item_name}</strong>
                              <span className="text-[11px] font-mono text-[var(--text-dim)]">
                                {typeDesc} · {item.item_size} · {currency} {Number(item.default_rate).toLocaleString('en-IN')}
                              </span>
                              {otherProject && (
                                <span className="text-[10px] text-amber-400 block font-mono">
                                  Currently in: {otherProject.project_name}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              handleTagCatalogItemToProject(item.id);
                              setIsTagCatalogModalOpen(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] shrink-0 cursor-pointer shadow-xs"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span>Tag to This Project</span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border-soft)] bg-[var(--surface-2)]/30 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTagCatalogModalOpen(false)}
                className="px-4 py-2 text-xs font-mono text-[var(--text)] border border-[var(--border)] rounded hover:border-[var(--accent)] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Image Preview Modal */}
      <ReceiptModal
        isOpen={previewImage.isOpen}
        onClose={() => setPreviewImage({ isOpen: false, title: '' })}
        title={previewImage.title}
        subtitle={previewImage.subtitle}
        imageUrl={previewImage.url}
      />

      {/* Embedded Expense Modal triggered from Project Workspace */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        defaultProjectId={currentProject?.id}
      />
    </div>
  );
};
