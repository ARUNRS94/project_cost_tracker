import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ProjectMaster, ProjectStatus } from '../../types/erp';
import {
  Plus,
  Search,
  Calendar,
  Building2,
  Edit2,
  Trash2,
  X,
  ChevronRight,
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
      alert('Please fill all required fields: Project Name and Client.');
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
        client_id: Number(formData.client_id),
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        approved_budget: Number(formData.approved_budget) || 0,
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
          <p className="text-[10.5px] uppercase tracking-wider text-[#7C7062]">PROJECT REPOSITORY</p>
          <h1 className="font-display font-normal text-2xl text-[#F0E9DF]">
            Project Master
          </h1>
          <p className="text-xs text-[#B4A697] mt-0.5">
            Client contracts, budget allocations, and execution schedules.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all whitespace-nowrap shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
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
            placeholder="Search projects by name, client, description..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] placeholder-[#7C7062] outline-none"
          />
        </div>

        {/* Status filter toggle */}
        <div className="flex items-center border border-[#4A4038] rounded overflow-hidden">
          {(['all', 'Planning', 'Active', 'Completed'] as const).map((st) => (
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

      {/* Project Cards (NO PROJECT ID displayed!) */}
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
              className="p-5 bg-[#26221E] rounded-md border border-[#38322C] flex flex-col justify-between hover:border-[#4A4038] transition-all"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-[#1E1B18] text-[#C9A66B] border border-[#38322C]">
                      {project.status}
                    </span>
                    <h3 className="font-display font-medium text-lg text-[#F0E9DF] mt-1.5">
                      {project.project_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(project)}
                      className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
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
                      className="p-1.5 text-[#7C7062] hover:text-[#B5766A] rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#B4A697] line-clamp-2 mt-1">
                  {project.description}
                </p>

                {/* Client info & dates (NO IDs!) */}
                <div className="flex items-center gap-2 text-xs text-[#B4A697] mt-3 pt-3 border-t border-[#38322C]">
                  <Building2 className="w-3.5 h-3.5 text-[#C9A66B] shrink-0" />
                  <span className="font-medium text-[#F0E9DF] truncate">
                    {client?.client_name || 'Direct Client'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#7C7062] mt-1.5">
                  <Calendar className="w-3 h-3 text-[#7C7062]" />
                  <span>{project.start_date}</span>
                  <span>→</span>
                  <span>{project.end_date}</span>
                </div>

                {/* Budget metric box */}
                <div className="mt-4 p-3 bg-[#1E1B18] rounded border border-[#38322C]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#7C7062]">Approved Budget:</span>
                    <span className="font-mono text-[#F0E9DF] font-medium tabular-nums">
                      {currency} {budget.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[#7C7062]">Expenses Incurred:</span>
                    <span className="font-mono text-[#C9A66B] font-medium tabular-nums">
                      {currency} {spent.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#302A25] h-1.5 rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all duration-300 ${
                        pct > 100 ? 'bg-[#B5766A]' : 'bg-[#C9A66B]'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono mt-2">
                    <span className={variance >= 0 ? 'text-[#7C9885]' : 'text-[#B5766A]'}>
                      {variance >= 0 ? 'Balance: ' : 'Overbudget: '}
                      {currency} {Math.abs(variance).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[#7C7062]">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Bottom line */}
              <div className="mt-4 pt-3 border-t border-[#38322C] flex items-center justify-between">
                <span className="text-xs text-[#7C7062]">
                  {projectExpenses.length} expense transactions
                </span>
                <button
                  onClick={() => setSelectedProjectForLedger(project)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#C9A66B] hover:text-[#D9B87C]"
                >
                  <span>Project Expenses Ledger</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal (NO Project ID input field!) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-[#26221E] rounded-md shadow-2xl border border-[#4A4038] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#38322C]">
              <h3 className="font-display text-base font-semibold text-[#F0E9DF]">
                {editingProject ? 'Edit Project Record' : 'Create Project Record'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="e.g. Metro Retail Storefront Signage Rollout"
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Associated Client *
                  </label>
                  <select
                    required
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value, 10) })}
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.client_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as ProjectStatus })
                    }
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Project Details
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Scope, specifications, key milestones..."
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full text-xs font-mono p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    End Date (Target) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full text-xs font-mono p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Approved Budget ({currency}) *
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  value={formData.approved_budget}
                  onChange={(e) =>
                    setFormData({ ...formData, approved_budget: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full text-xs font-mono font-bold p-2 rounded bg-[#1E1B18] border border-[#C9A66B] text-[#C9A66B] outline-none"
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
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Slide-Over Ledger */}
      {selectedProjectForLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl h-full bg-[#26221E] border-l border-[#38322C] shadow-2xl flex flex-col">
            <div className="p-6 border-b border-[#38322C] flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#C9A66B]">
                  PROJECT EXPENDITURE LEDGER
                </span>
                <h2 className="font-display text-lg font-bold text-[#F0E9DF] mt-1">
                  {selectedProjectForLedger.project_name}
                </h2>
                <p className="text-xs text-[#B4A697] mt-0.5">
                  Client: {getClient(selectedProjectForLedger.client_id)?.client_name} · Status: {selectedProjectForLedger.status}
                </p>
              </div>
              <button
                onClick={() => setSelectedProjectForLedger(null)}
                className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-2 p-4 bg-[#1E1B18] border-b border-[#38322C] text-center">
              <div>
                <p className="text-[10px] text-[#7C7062] uppercase tracking-wider">Approved Budget</p>
                <p className="text-sm font-medium font-mono text-[#F0E9DF] tabular-nums mt-0.5">
                  {currency} {selectedProjectForLedger.approved_budget.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#7C7062] uppercase tracking-wider">Spent So Far</p>
                <p className="text-sm font-medium font-mono text-[#C9A66B] tabular-nums mt-0.5">
                  {currency}{' '}
                  {getProjectSpent(selectedProjectForLedger.id).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#7C7062] uppercase tracking-wider">Balance Pool</p>
                <p className="text-sm font-medium font-mono text-[#7C9885] tabular-nums mt-0.5">
                  {currency}{' '}
                  {(
                    selectedProjectForLedger.approved_budget -
                    getProjectSpent(selectedProjectForLedger.id)
                  ).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Expenses List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs font-semibold text-[#F0E9DF] uppercase tracking-wider">
                Line Items ({getProjectExpenses(selectedProjectForLedger.id).length})
              </p>

              {getProjectExpenses(selectedProjectForLedger.id).length === 0 ? (
                <div className="p-8 text-center text-[#7C7062] text-xs">
                  No line-item expenses recorded under this project yet.
                </div>
              ) : (
                getProjectExpenses(selectedProjectForLedger.id).map((exp) => {
                  const cat = getExpenseCategory(exp.expense_category_id);
                  const vendor = getVendor(exp.vendor_id);
                  return (
                    <div
                      key={exp.id}
                      className="p-3 rounded border border-[#38322C] bg-[#1E1B18] space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#F0E9DF] font-medium">
                          {cat?.category_name} · {exp.description}
                        </span>
                        <span className="font-mono text-[#C9A66B] font-semibold tabular-nums">
                          {currency} {(Number(exp.amount) || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#7C7062] pt-1 border-t border-[#38322C]/50">
                        <span>Vendor: {vendor?.vendor_name}</span>
                        <span className="font-mono">{exp.expense_date} · {exp.payment_status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#38322C] bg-[#26221E] flex justify-end">
              <button
                onClick={() => setSelectedProjectForLedger(null)}
                className="px-4 py-2 text-xs font-semibold bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] rounded transition-colors"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
