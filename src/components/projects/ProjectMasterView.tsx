import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ProjectMaster, ProjectStatus, ViewMode } from '../../types/erp';
import { ViewToggle } from '../common/ViewToggle';
import { exportMasterToCSV, downloadFile } from '../../services/api';
import {
  Plus,
  Search,
  Calendar,
  Building2,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  Download,
} from 'lucide-react';

export const ProjectMasterView: React.FC = () => {
  const {
    projects,
    clients,
    currency,
    addProject,
    updateProject,
    deleteProject,
    getClient,
    getProjectExpenses,
    getProjectSpent,
    getExpenseCategory,
    getVendor,
  } = useERP();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectMaster | null>(null);

  // Slide-over drawer for project expenses
  const [selectedProjectForLedger, setSelectedProjectForLedger] = useState<ProjectMaster | null>(null);

  // Form state (NO Project ID field!)
  const initialFormState: Omit<ProjectMaster, 'id'> = {
    project_name: '',
    client_id: clients[0]?.id || 1,
    description: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    approved_budget: 500000,
    status: 'Active',
  };
  const [formData, setFormData] = useState<Omit<ProjectMaster, 'id'> & { id?: number }>(initialFormState);

  const filteredProjects = projects.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      p.project_name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      getClient(p.client_id)?.client_name.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingProject(null);
    setFormData({
      ...initialFormState,
      client_id: clients[0]?.id || 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: ProjectMaster) => {
    setEditingProject(p);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_name || !formData.client_id) {
      alert('Please fill required fields: Project Name and Client.');
      return;
    }

    if (editingProject) {
      updateProject({
        ...editingProject,
        ...formData,
      } as ProjectMaster);
    } else {
      addProject({
        project_name: formData.project_name,
        client_id: formData.client_id,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        approved_budget: Number(formData.approved_budget) || 0,
        status: formData.status,
      });
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const csv = exportMasterToCSV('Projects', projects);
    downloadFile(csv, `Projects_Master_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[var(--border-soft)]">
        <div>
          <h2 className="font-display font-medium text-2xl text-[var(--text)]">
            Project Master
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-dim)] mt-0.5">
            Active engagements, contract budgets, delivery timelines, and expense burn rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            title="Export Projects Master to CSV"
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
            <span>New Project</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => {
            const client = getClient(project.client_id);
            const spent = getProjectSpent(project.id);
            const budget = Number(project.approved_budget) || 1;
            const variance = budget - spent;
            const pct = (spent / budget) * 100;
            const projectExpenses = getProjectExpenses(project.id);

            return (
              <div
                key={project.id}
                className="p-5 bg-[var(--surface)] rounded-md border border-[var(--border-soft)] flex flex-col justify-between hover:border-[var(--border)] transition-all"
              >
                <div>
                  {/* Header */}
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
                        onClick={() => handleOpenEdit(project)}
                        className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
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
                        className="p-1.5 text-[var(--text-faint)] hover:text-red-400 rounded"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-dim)] line-clamp-2 mt-2 leading-relaxed">
                    {project.description}
                  </p>

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

                    <div className="flex justify-between text-[11px] font-mono text-[var(--text-faint)] mt-1.5">
                      <span>Available Balance</span>
                      <span className={variance < 0 ? 'text-red-400 font-semibold' : 'text-green-400'}>
                        {currency} {variance.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* View Ledger Button */}
                <div className="mt-4 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between">
                  <span className="text-xs font-mono text-[var(--text-faint)]">
                    {projectExpenses.length} expense voucher{projectExpenses.length !== 1 ? 's' : ''}
                  </span>

                  <button
                    onClick={() => setSelectedProjectForLedger(project)}
                    className="inline-flex items-center gap-1 text-xs font-mono text-[var(--accent)] hover:underline"
                  >
                    <span>Inspect Ledger</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
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
                  <th className="py-2.5 px-3">Project Name</th>
                  <th className="py-2.5 px-3">Associated Client</th>
                  <th className="py-2.5 px-3 text-right">Approved Budget</th>
                  <th className="py-2.5 px-3 text-right">Total Spent</th>
                  <th className="py-2.5 px-3 text-right">Remaining</th>
                  <th className="py-2.5 px-3">Timeline</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredProjects.map((project) => {
                  const client = getClient(project.client_id);
                  const spent = getProjectSpent(project.id);
                  const budget = Number(project.approved_budget) || 1;
                  const variance = budget - spent;
                  const pct = (spent / budget) * 100;

                  return (
                    <tr key={project.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-[var(--text)]">
                        <div>
                          <span>{project.project_name}</span>
                          <p className="text-[11px] text-[var(--text-faint)] truncate max-w-xs">{project.description}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[var(--text-dim)]">
                        {client?.client_name || 'Independent Project'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--text)] font-medium">
                        {currency} {budget.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--accent)] font-medium">
                        {currency} {spent.toLocaleString('en-IN')}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-medium ${variance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {currency} {variance.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[var(--text-faint)]">
                        {project.start_date} → {project.end_date}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]">
                          {project.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => setSelectedProjectForLedger(project)}
                          className="p-1 text-[var(--accent)] hover:underline text-[11px] font-mono mr-1"
                        >
                          Ledger
                        </button>
                        <button
                          onClick={() => handleOpenEdit(project)}
                          className="p-1 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete project "${project.project_name}"?`)) {
                              deleteProject(project.id);
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

      {/* Slide-over Drawer for Project Expenses */}
      {selectedProjectForLedger && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-[var(--surface)] border-l border-[var(--border)] h-full flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--accent)] tracking-wider">
                  Ledger Statement
                </span>
                <h3 className="font-display font-medium text-lg text-[var(--text)] mt-0.5">
                  {selectedProjectForLedger.project_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProjectForLedger(null)}
                className="p-1 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 border-b border-[var(--border-soft)] grid grid-cols-3 gap-2 text-center">
              <div className="bg-[var(--bg)] p-2.5 rounded border border-[var(--border)]">
                <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase block">Budget</span>
                <span className="font-mono text-xs font-semibold text-[var(--text)]">
                  {currency} {Number(selectedProjectForLedger.approved_budget).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-[var(--bg)] p-2.5 rounded border border-[var(--border)]">
                <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase block">Spent</span>
                <span className="font-mono text-xs font-semibold text-[var(--accent)]">
                  {currency} {getProjectSpent(selectedProjectForLedger.id).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-[var(--bg)] p-2.5 rounded border border-[var(--border)]">
                <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase block">Available</span>
                <span className="font-mono text-xs font-semibold text-green-400">
                  {currency}{' '}
                  {(
                    Number(selectedProjectForLedger.approved_budget) -
                    getProjectSpent(selectedProjectForLedger.id)
                  ).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
              {getProjectExpenses(selectedProjectForLedger.id).length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-faint)] font-mono">
                  No expenses recorded for this project yet.
                </div>
              ) : (
                getProjectExpenses(selectedProjectForLedger.id).map((e) => {
                  const cat = getExpenseCategory(e.expense_category_id);
                  const vendor = getVendor(e.vendor_id);
                  return (
                    <div
                      key={e.id}
                      className="p-3 bg-[var(--bg)] rounded border border-[var(--border)] flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] text-[var(--text-faint)]">
                            {e.expense_date}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)]">
                            {cat?.category_name || 'General'}
                          </span>
                        </div>
                        <p className="font-medium text-[var(--text)]">{e.description}</p>
                        <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
                          Supplier: {vendor?.vendor_name || 'Direct'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-medium text-[var(--accent)] text-sm block">
                          {currency} {Number(e.amount).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase">
                          {e.payment_status} ({e.payment_mode})
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL (No Project ID field) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="font-display font-medium text-lg text-[var(--text)]">
                  {editingProject ? 'Edit Project' : 'Create New Project'}
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
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="e.g. Metro Flagship Store Façade & Signage"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Associated Client *</label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name} ({c.contact_person})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Project Scope & Details</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Scope of work, structural parameters, architect specifications..."
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Approved Budget (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.approved_budget}
                    onChange={(e) => setFormData({ ...formData, approved_budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as ProjectStatus })
                    }
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
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
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
