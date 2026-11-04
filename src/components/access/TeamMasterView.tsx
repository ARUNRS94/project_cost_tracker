import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { UserMaster, RoleMaster, StatusActiveInactive, ViewMode } from '../../types/erp';
import { ViewToggle } from '../common/ViewToggle';
import { exportMasterToCSV, downloadFile } from '../../services/api';
import {
  Users,
  Shield,
  ShieldCheck,
  Lock,
  KeyRound,
  Plus,
  Search,
  Mail,
  Phone,
  Briefcase,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  UserCheck,
  Download,
  Upload,
  Check,
  Save,
  RotateCcw,
} from 'lucide-react';

export interface SystemModulePermission {
  id: string;
  module: string;
  name: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: SystemModulePermission[] = [
  // 1. Expense Ledger
  { id: 'expenses_view', module: 'Expense Ledger', name: 'View Expenses', description: 'Access voucher lists, receipts and status filters' },
  { id: 'expenses_create', module: 'Expense Ledger', name: 'Record Expense', description: 'Log new expenditure and attach bills' },
  { id: 'expenses_edit', module: 'Expense Ledger', name: 'Edit & Settle', description: 'Update vouchers, change payment status & mode' },
  { id: 'expenses_delete', module: 'Expense Ledger', name: 'Delete Entry', description: 'Permanently remove ledger records' },

  // 2. Quotation Generator
  { id: 'quotes_view', module: 'Quotation Generator', name: 'View Quotations', description: 'Inspect saved estimates and rate structures' },
  { id: 'quotes_create', module: 'Quotation Generator', name: 'Create Quotation', description: 'Draft quotations with scoped project line items' },
  { id: 'quotes_discount', module: 'Quotation Generator', name: 'Apply Discounts', description: 'Set discretionary line discounts' },
  { id: 'quotes_print', module: 'Quotation Generator', name: 'Print / Export PDF', description: 'Generate client PDF proposals' },

  // 3. Project Operations
  { id: 'projects_view', module: 'Project Master', name: 'View Projects', description: 'Track ongoing jobs, timeline dates & budgets' },
  { id: 'projects_manage', module: 'Project Master', name: 'Create & Edit', description: 'Initiate new engagements and set budget caps' },

  // 4. Client & Vendor Masters
  { id: 'clients_manage', module: 'Client & Vendor Masters', name: 'Manage Clients', description: 'Add/edit corporate accounts and GSTIN credentials' },
  { id: 'vendors_manage', module: 'Client & Vendor Masters', name: 'Manage Vendors', description: 'Maintain trade contractors, fabricators & suppliers' },

  // 5. Item Catalog
  { id: 'items_manage', module: 'Item Catalog & Specs', name: 'Manage Catalog', description: 'Add line items, specs, and reference/location photos' },

  // 6. Security & System
  { id: 'data_import_export', module: 'Security & System', name: 'CSV Migration', description: 'Bulk CSV import/export across all tables' },
  { id: 'access_control_edit', module: 'Security & System', name: 'Configure RBAC', description: 'Modify access control matrix and team roles' },
];

const DEFAULT_ROLE_PERMS: Record<number, string[]> = {
  1: SYSTEM_PERMISSIONS.map((p) => p.id), // Super Admin: all permissions
  2: [
    'expenses_view', 'expenses_create', 'expenses_edit',
    'quotes_view', 'quotes_create', 'quotes_discount', 'quotes_print',
    'projects_view', 'projects_manage',
    'clients_manage', 'vendors_manage', 'items_manage',
    'data_import_export'
  ], // Project Manager
  3: ['expenses_view', 'expenses_create', 'projects_view', 'items_manage'], // Site Engineer
  4: ['expenses_view', 'expenses_create', 'expenses_edit', 'quotes_view', 'quotes_print', 'projects_view', 'data_import_export'], // Accountant
  5: ['projects_view', 'quotes_view'], // Viewer
};

export const TeamMasterView: React.FC = () => {
  const {
    users,
    roles,
    userRoles,
    currentUser,
    addUser,
    updateUser,
    deleteUser,
    addRole,
    updateRole,
    deleteRole,
    assignUserRole,
    removeUserRole,
    getUser,
    getRole,
    getUserRoles,
  } = useERP();

  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'members' | 'roles' | 'assignments'>('matrix');
  const [rolePermissions, setRolePermissions] = useState<Record<number, string[]>>(DEFAULT_ROLE_PERMS);
  const [policySavedToast, setPolicySavedToast] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Member Modal State (No user_id field!)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<UserMaster | null>(null);
  const [memberForm, setMemberForm] = useState<Omit<UserMaster, 'id'>>({
    full_name: '',
    email: '',
    phone: '',
    designation: '',
    status: 'Active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Role Modal State (No role_id field!)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleMaster | null>(null);
  const [roleForm, setRoleForm] = useState<Omit<RoleMaster, 'id'>>({
    role_name: '',
    description: '',
    status: 'Active',
    created_at: new Date().toISOString(),
  });

  // Role Assignment Modal State (No user_roles_id field!)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState<number>(users[0]?.id || 1);
  const [assignRoleId, setAssignRoleId] = useState<number>(roles[0]?.id || 1);

  // Quick Role Assign from Member Card
  const [quickAssignUser, setQuickAssignUser] = useState<UserMaster | null>(null);
  const [quickRoleId, setQuickRoleId] = useState<number>(roles[0]?.id || 1);

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.designation.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredRoles = roles.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      r.role_name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  });

  const filteredAssignments = userRoles.filter((urm) => {
    const user = getUser(urm.user_id);
    const role = getRole(urm.role_id);
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      user?.full_name.toLowerCase().includes(q) ||
      role?.role_name.toLowerCase().includes(q)
    );
  });

  // Open Member Modal
  const handleOpenNewMember = () => {
    setEditingMember(null);
    setMemberForm({
      full_name: '',
      email: '',
      phone: '',
      designation: '',
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setIsMemberModalOpen(true);
  };

  const handleOpenEditMember = (u: UserMaster) => {
    setEditingMember(u);
    setMemberForm({
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      designation: u.designation,
      status: u.status,
      created_at: u.created_at,
      updated_at: new Date().toISOString(),
    });
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.full_name.trim() || !memberForm.email.trim()) return;

    if (editingMember) {
      updateUser({
        ...editingMember,
        ...memberForm,
        updated_at: new Date().toISOString(),
      });
    } else {
      addUser(memberForm);
    }
    setIsMemberModalOpen(false);
  };

  // Open Role Modal
  const handleOpenNewRole = () => {
    setEditingRole(null);
    setRoleForm({
      role_name: '',
      description: '',
      status: 'Active',
      created_at: new Date().toISOString(),
    });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (r: RoleMaster) => {
    setEditingRole(r);
    setRoleForm({
      role_name: r.role_name,
      description: r.description,
      status: r.status,
      created_at: r.created_at,
    });
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.role_name.trim()) return;

    if (editingRole) {
      updateRole({
        ...editingRole,
        ...roleForm,
      });
    } else {
      addRole(roleForm);
    }
    setIsRoleModalOpen(false);
  };

  // Submit Role Assignment
  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    assignUserRole(assignUserId, assignRoleId);
    setIsAssignModalOpen(false);
  };

  const handleSaveQuickAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAssignUser) return;
    assignUserRole(quickAssignUser.id, quickRoleId);
    setQuickAssignUser(null);
  };

  const handleExportCSV = () => {
    if (activeSubTab === 'members') {
      const csv = exportMasterToCSV('Users', users);
      downloadFile(csv, `Team_Members_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (activeSubTab === 'roles') {
      const csv = exportMasterToCSV('Roles', roles);
      downloadFile(csv, `Roles_${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      const csv = exportMasterToCSV('RoleMappings', userRoles);
      downloadFile(csv, `Role_Mappings_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-soft)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--accent)] font-semibold">
              Security & Governance
            </span>
            <span className="text-xs text-[var(--text-faint)]">·</span>
            <span className="text-xs text-[var(--text-faint)] font-mono">RBAC Policy Engine</span>
          </div>
          <h2 className="font-display font-medium text-2xl text-[var(--text)]">
            Roles & Permissions
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-dim)] mt-0.5">
            Enterprise role-based access control (RBAC), permission policy matrix, and team assignments.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            title="Export data to CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {activeSubTab === 'matrix' && (
            <button
              onClick={() => {
                setPolicySavedToast(true);
                setTimeout(() => setPolicySavedToast(false), 3000);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Policy Matrix</span>
            </button>
          )}

          {activeSubTab === 'members' && (
            <button
              onClick={handleOpenNewMember}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          )}

          {activeSubTab === 'roles' && (
            <button
              onClick={handleOpenNewRole}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Role</span>
            </button>
          )}

          {activeSubTab === 'assignments' && (
            <button
              onClick={() => {
                setAssignUserId(users[0]?.id || 1);
                setAssignRoleId(roles[0]?.id || 1);
                setIsAssignModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Policy Saved Toast Alert */}
      {policySavedToast && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md text-xs flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">
              Access control policies saved successfully! New permission boundaries are enforced in real time.
            </span>
          </div>
          <button onClick={() => setPolicySavedToast(false)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--border-soft)]">
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono transition-colors border-b-2 cursor-pointer ${
            activeSubTab === 'matrix'
              ? 'border-[var(--accent)] text-[var(--text)] font-semibold'
              : 'border-transparent text-[var(--text-faint)] hover:text-[var(--text-dim)]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Access Control Matrix</span>
        </button>

        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono transition-colors border-b-2 cursor-pointer ${
            activeSubTab === 'members'
              ? 'border-[var(--accent)] text-[var(--text)] font-semibold'
              : 'border-transparent text-[var(--text-faint)] hover:text-[var(--text-dim)]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Team Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono transition-colors border-b-2 cursor-pointer ${
            activeSubTab === 'roles'
              ? 'border-[var(--accent)] text-[var(--text)] font-semibold'
              : 'border-transparent text-[var(--text-faint)] hover:text-[var(--text-dim)]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Defined Roles ({roles.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono transition-colors border-b-2 cursor-pointer ${
            activeSubTab === 'assignments'
              ? 'border-[var(--accent)] text-[var(--text)] font-semibold'
              : 'border-transparent text-[var(--text-faint)] hover:text-[var(--text-dim)]'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Role Mappings ({userRoles.length})</span>
        </button>
      </div>

      {/* Search & View Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            type="text"
            placeholder={`Search ${activeSubTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {activeSubTab === 'members' && (
          <div className="flex items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <ViewToggle mode={viewMode} onChange={setViewMode} />
          </div>
        )}
      </div>

      {/* SUB-TAB 0: ACCESS CONTROL MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4">
          {/* Matrix Actions & Description */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-md">
            <div>
              <h3 className="font-display text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--accent)]" />
                <span>Fine-Grained Module Authorization Matrix</span>
              </h3>
              <p className="text-xs text-[var(--text-dim)] mt-0.5">
                Check or uncheck privileges to enforce RBAC rules across expenses, quotations, projects, and catalogs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRolePermissions(DEFAULT_ROLE_PERMS)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                title="Reset to recommended security baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Baseline</span>
              </button>

              <button
                onClick={() => {
                  setPolicySavedToast(true);
                  setTimeout(() => setPolicySavedToast(false), 3000);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Matrix</span>
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--surface-2)] border-b border-[var(--border)] text-[var(--text)]">
                    <th className="py-3 px-4 font-mono text-[11px] uppercase tracking-wider text-[var(--text-faint)] w-[360px]">
                      Module & Capability
                    </th>
                    {roles.map((role) => {
                      const count = userRoles.filter((ur) => ur.role_id === role.id).length;
                      return (
                        <th key={role.id} className="py-3 px-3 text-center border-l border-[var(--border-soft)] min-w-[130px]">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-[var(--text)] font-mono text-xs">{role.role_name}</span>
                            <span className="text-[10px] text-[var(--text-faint)] font-mono mt-0.5">
                              {count} {count === 1 ? 'member' : 'members'}
                            </span>
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono">
                              <button
                                onClick={() => {
                                  setRolePermissions((prev) => ({
                                    ...prev,
                                    [role.id]: SYSTEM_PERMISSIONS.map((p) => p.id),
                                  }));
                                }}
                                className="text-[var(--accent)] hover:underline cursor-pointer"
                              >
                                All
                              </button>
                              <span className="text-[var(--text-faint)]">/</span>
                              <button
                                onClick={() => {
                                  setRolePermissions((prev) => ({
                                    ...prev,
                                    [role.id]: [],
                                  }));
                                }}
                                className="text-[var(--text-faint)] hover:text-red-400 cursor-pointer"
                              >
                                None
                              </button>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {Array.from(new Set(SYSTEM_PERMISSIONS.map((p) => p.module))).map((modName) => {
                    const modPerms = SYSTEM_PERMISSIONS.filter((p) => p.module === modName);
                    return (
                      <React.Fragment key={modName}>
                        {/* Module Section Header */}
                        <tr className="bg-[var(--bg)]/60 border-t border-[var(--border)]">
                          <td
                            colSpan={roles.length + 1}
                            className="py-2 px-4 font-mono text-[10.5px] uppercase font-bold tracking-wider text-[var(--accent)]"
                          >
                            {modName}
                          </td>
                        </tr>

                        {/* Module Permissions Rows */}
                        {modPerms.map((perm) => (
                          <tr key={perm.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="font-medium text-[var(--text)]">{perm.name}</div>
                              <div className="text-[11px] text-[var(--text-faint)] leading-snug">{perm.description}</div>
                            </td>
                            {roles.map((role) => {
                              const isChecked = rolePermissions[role.id]?.includes(perm.id) || false;
                              return (
                                <td key={role.id} className="py-2.5 px-3 text-center border-l border-[var(--border-soft)]">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setRolePermissions((prev) => {
                                        const current = prev[role.id] || [];
                                        const updated = checked
                                          ? Array.from(new Set([...current, perm.id]))
                                          : current.filter((id) => id !== perm.id);
                                        return { ...prev, [role.id]: updated };
                                      });
                                    }}
                                    className="w-4 h-4 rounded border-[var(--border)] accent-[var(--accent)] cursor-pointer"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: MEMBERS GRID VIEW */}
      {activeSubTab === 'members' && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[var(--text-faint)] border border-dashed border-[var(--border)] rounded">
              No team members found.
            </div>
          ) : (
            filteredUsers.map((member) => {
              const assignedRoles = getUserRoles(member.id);
              const isSelf = member.id === currentUser.id;

              return (
                <div
                  key={member.id}
                  className="bg-[var(--surface)] border border-[var(--border-soft)] rounded p-4 flex flex-col justify-between hover:border-[var(--border)] transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center font-display font-medium text-[var(--accent)] text-sm">
                          {member.full_name
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-[var(--text)]">{member.full_name}</h3>
                            {isSelf && (
                              <span className="badge-accent">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-dim)] flex items-center gap-1.5 mt-0.5">
                            <Briefcase className="w-3 h-3 text-[var(--text-faint)]" />
                            <span>{member.designation || 'Staff'}</span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          member.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30'
                            : 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/30'
                        }`}
                      >
                        {member.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 py-2.5 border-t border-b border-[var(--border-soft)] text-xs text-[var(--text-dim)]">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                        <span>{member.phone || 'No phone'}</span>
                      </div>
                    </div>

                    {/* Role Badges */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] mb-1.5 text-[var(--text-faint)]">
                        <span className="font-mono">Roles</span>
                        <button
                          onClick={() => {
                            setQuickAssignUser(member);
                            setQuickRoleId(roles[0]?.id || 1);
                          }}
                          className="text-[var(--accent)] hover:underline text-[10px]"
                        >
                          + Assign
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedRoles.length === 0 ? (
                          <span className="text-[11px] text-[var(--text-faint)] italic">No role assigned</span>
                        ) : (
                          assignedRoles.map((r) => (
                            <span
                              key={r.id}
                              className="badge-neutral"
                            >
                              <Shield className="w-2.5 h-2.5 text-[var(--accent)]" />
                              <span>{r.role_name}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-[var(--border-soft)]">
                    <button
                      onClick={() => handleOpenEditMember(member)}
                      className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] border border-transparent hover:border-[var(--border)] rounded transition-colors"
                      title="Edit Member"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!isSelf && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.full_name}?`)) {
                            deleteUser(member.id);
                          }
                        }}
                        className="p-1.5 text-red-400 hover:text-red-300 border border-transparent hover:border-[var(--border)] rounded transition-colors"
                        title="Delete Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 1: MEMBERS LIST VIEW */}
      {activeSubTab === 'members' && viewMode === 'list' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-faint)] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-3">Designation</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Assigned Roles</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredUsers.map((member) => {
                  const assignedRoles = getUserRoles(member.id);
                  const isSelf = member.id === currentUser.id;

                  return (
                    <tr key={member.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-[var(--text)]">
                        <div className="flex items-center gap-2">
                          <span>{member.full_name}</span>
                          {isSelf && (
                            <span className="badge-accent">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[var(--text-dim)]">{member.designation || 'Staff'}</td>
                      <td className="py-3 px-3 text-[var(--text-dim)]">{member.email}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-dim)]">{member.phone || '—'}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {assignedRoles.map((r) => (
                            <span
                              key={r.id}
                              className="badge-neutral"
                            >
                              <Shield className="w-2.5 h-2.5 text-[var(--accent)]" />
                              <span>{r.role_name}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            member.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30'
                              : 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/30'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setQuickAssignUser(member);
                            setQuickRoleId(roles[0]?.id || 1);
                          }}
                          className="p-1 text-[var(--accent)] hover:underline text-[11px] font-mono mr-1"
                        >
                          +Role
                        </button>
                        <button
                          onClick={() => handleOpenEditMember(member)}
                          className="p-1 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${member.full_name}?`)) {
                                deleteUser(member.id);
                              }
                            }}
                            className="p-1 text-red-400 hover:text-red-300 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DEFINED ROLES */}
      {activeSubTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((role) => {
            const membersCount = userRoles.filter((urm) => urm.role_id === role.id).length;

            return (
              <div
                key={role.id}
                className="bg-[var(--surface)] border border-[var(--border-soft)] rounded p-4 flex flex-col justify-between hover:border-[var(--border)] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[var(--accent)]" />
                      <h3 className="text-sm font-semibold text-[var(--text)]">{role.role_name}</h3>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        role.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30'
                          : 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/30'
                      }`}
                    >
                      {role.status}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-dim)] leading-relaxed min-h-[36px]">
                    {role.description || 'Standard role permissions across tracker modules.'}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-[var(--border-soft)] flex items-center justify-between text-xs text-[var(--text-faint)]">
                    <span className="font-mono">Assigned Members</span>
                    <span className="font-mono text-[var(--text)] font-medium">{membersCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-[var(--border-soft)]">
                  <button
                    onClick={() => handleOpenEditRole(role)}
                    className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] border border-transparent hover:border-[var(--border)] rounded transition-colors"
                    title="Edit Role"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {role.role_name !== 'Admin' && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete role ${role.role_name}?`)) {
                          deleteRole(role.id);
                        }
                      }}
                      className="p-1.5 text-red-400 hover:text-red-300 border border-transparent hover:border-[var(--border)] rounded transition-colors"
                      title="Delete Role"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-TAB 3: ROLE MAPPINGS */}
      {activeSubTab === 'assignments' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-faint)] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-4 font-normal">Team Member</th>
                  <th className="py-2.5 px-4 font-normal">Designation</th>
                  <th className="py-2.5 px-4 font-normal">Assigned Role</th>
                  <th className="py-2.5 px-4 font-normal">Assigned By</th>
                  <th className="py-2.5 px-4 font-normal">Date</th>
                  <th className="py-2.5 px-4 text-right font-normal">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredAssignments.map((urm) => {
                  const user = getUser(urm.user_id);
                  const role = getRole(urm.role_id);
                  const assigner = getUser(urm.assigned_by);

                  return (
                    <tr key={urm.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--text)]">
                        {user?.full_name || `Member #${urm.user_id}`}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-dim)]">
                        {user?.designation || 'Staff'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[11px] rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent)]">
                          <Shield className="w-2.5 h-2.5" />
                          {role?.role_name || `Role #${urm.role_id}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-faint)]">
                        {assigner?.full_name || 'System Admin'}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-faint)] font-mono">
                        {new Date(urm.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Remove this role assignment?`)) {
                              removeUserRole(urm.id);
                            }
                          }}
                          className="p-1 text-red-400 hover:text-red-300 border border-transparent hover:border-[var(--border)] rounded transition-colors"
                          title="Remove Assignment"
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

      {/* MEMBER MODAL */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="font-display font-medium text-lg text-[var(--text)]">
                  {editingMember ? 'Edit Team Member' : 'Add Team Member'}
                </h3>
                <p className="text-xs text-[var(--text-faint)]">Auto-increment identity in Supabase</p>
              </div>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="text-[var(--text-faint)] hover:text-[var(--text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={memberForm.full_name}
                  onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="ramesh@projectcode.com"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Phone</label>
                  <input
                    type="text"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Designation</label>
                  <input
                    type="text"
                    value={memberForm.designation}
                    onChange={(e) => setMemberForm({ ...memberForm, designation: e.target.value })}
                    placeholder="Site Engineer"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Status</label>
                <select
                  value={memberForm.status}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, status: e.target.value as StatusActiveInactive })
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
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18]"
                >
                  {editingMember ? 'Save Changes' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE MODAL */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="font-display font-medium text-lg text-[var(--text)]">
                  {editingRole ? 'Edit Role' : 'Add Role'}
                </h3>
                <p className="text-xs text-[var(--text-faint)]">Auto-increment identity in Supabase</p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-[var(--text-faint)] hover:text-[var(--text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  value={roleForm.role_name}
                  onChange={(e) => setRoleForm({ ...roleForm, role_name: e.target.value })}
                  placeholder="e.g. Quantity Surveyor"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Describe module access and operational scope..."
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Status</label>
                <select
                  value={roleForm.status}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, status: e.target.value as StatusActiveInactive })
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
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18]"
                >
                  {editingRole ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE ASSIGNMENT MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="font-display font-medium text-lg text-[var(--text)]">Assign Role to Member</h3>
                <p className="text-xs text-[var(--text-faint)]">Maps user to designated security role</p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-[var(--text-faint)] hover:text-[var(--text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Select Member</label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.designation || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Select Role</label>
                <select
                  value={assignRoleId}
                  onChange={(e) => setAssignRoleId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18]"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ROLE ASSIGN FROM MEMBER CARD */}
      {quickAssignUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-sm w-full p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border-soft)]">
              <h3 className="font-display font-medium text-base text-[var(--text)]">
                Assign Role to {quickAssignUser.full_name}
              </h3>
              <button
                onClick={() => setQuickAssignUser(null)}
                className="text-[var(--text-faint)] hover:text-[var(--text)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Select Role</label>
                <select
                  value={quickRoleId}
                  onChange={(e) => setQuickRoleId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickAssignUser(null)}
                  className="px-3 py-1.5 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18]"
                >
                  Assign Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
