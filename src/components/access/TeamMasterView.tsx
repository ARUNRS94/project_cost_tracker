import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { UserMaster, RoleMaster, StatusActiveInactive } from '../../types/erp';
import {
  Users,
  Shield,
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
} from 'lucide-react';

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

  const [activeSubTab, setActiveSubTab] = useState<'members' | 'roles' | 'assignments'>('members');
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

  return (
    <div className="space-y-6">
      {/* Sub Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#38322C]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-[#C9A66B] uppercase tracking-wider">Access Control</span>
            <span className="text-xs text-[#7C7062]">·</span>
            <span className="text-xs text-[#7C7062] font-mono">Team, Roles & Mappings</span>
          </div>
          <h2 className="font-display text-2xl font-normal text-[#F0E9DF]">
            Team & Permissions
          </h2>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5">
          {activeSubTab === 'members' && (
            <button
              onClick={handleOpenNewMember}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          )}
          {activeSubTab === 'roles' && (
            <button
              onClick={handleOpenNewRole}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#38322C]/70">
        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono transition-colors border-b-2 ${
            activeSubTab === 'members'
              ? 'border-[#C9A66B] text-[#F0E9DF] font-semibold'
              : 'border-transparent text-[#7C7062] hover:text-[#B4A697]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Team Members ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono transition-colors border-b-2 ${
            activeSubTab === 'roles'
              ? 'border-[#C9A66B] text-[#F0E9DF] font-semibold'
              : 'border-transparent text-[#7C7062] hover:text-[#B4A697]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Defined Roles ({roles.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono transition-colors border-b-2 ${
            activeSubTab === 'assignments'
              ? 'border-[#C9A66B] text-[#F0E9DF] font-semibold'
              : 'border-transparent text-[#7C7062] hover:text-[#B4A697]'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Role Mappings ({userRoles.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C7062]" />
          <input
            type="text"
            placeholder={`Search ${activeSubTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#26221E] border border-[#4A4038] rounded text-xs text-[#F0E9DF] placeholder-[#7C7062] focus:outline-none focus:border-[#C9A66B]"
          />
        </div>

        {activeSubTab === 'members' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#26221E] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        )}
      </div>

      {/* SUB-TAB 1: TEAM MEMBERS */}
      {activeSubTab === 'members' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[#7C7062] border border-dashed border-[#4A4038] rounded">
              No team members found.
            </div>
          ) : (
            filteredUsers.map((member) => {
              const assignedRoles = getUserRoles(member.id);
              const isSelf = member.id === currentUser.id;

              return (
                <div
                  key={member.id}
                  className="bg-[#26221E] border border-[#4A4038] rounded p-4 flex flex-col justify-between hover:border-[#8A7145] transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded bg-[#302A25] border border-[#4A4038] flex items-center justify-center font-display font-medium text-[#C9A66B] text-sm">
                          {member.full_name
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-[#F0E9DF]">{member.full_name}</h3>
                            {isSelf && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#C9A66B]/15 text-[#C9A66B] border border-[#C9A66B]/30">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#B4A697] flex items-center gap-1.5 mt-0.5">
                            <Briefcase className="w-3 h-3 text-[#7C7062]" />
                            <span>{member.designation || 'Staff'}</span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          member.status === 'Active'
                            ? 'bg-[#7C9885]/15 text-[#7C9885] border-[#7C9885]/30'
                            : 'bg-[#B5766A]/15 text-[#B5766A] border-[#B5766A]/30'
                        }`}
                      >
                        {member.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 py-2.5 border-t border-b border-[#38322C] text-xs text-[#B4A697]">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-[#7C7062] shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#7C7062] shrink-0" />
                        <span>{member.phone || 'No phone'}</span>
                      </div>
                    </div>

                    {/* Role Badges */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] mb-1.5 text-[#7C7062]">
                        <span className="font-mono">Roles</span>
                        <button
                          onClick={() => {
                            setQuickAssignUser(member);
                            setQuickRoleId(roles[0]?.id || 1);
                          }}
                          className="text-[#C9A66B] hover:underline text-[10px]"
                        >
                          + Assign
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedRoles.length === 0 ? (
                          <span className="text-[11px] text-[#7C7062] italic">No role assigned</span>
                        ) : (
                          assignedRoles.map((r) => (
                            <span
                              key={r.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded bg-[#302A25] text-[#F0E9DF] border border-[#4A4038]"
                            >
                              <Shield className="w-2.5 h-2.5 text-[#C9A66B]" />
                              <span>{r.role_name}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-[#38322C]/70">
                    <button
                      onClick={() => handleOpenEditMember(member)}
                      className="p-1.5 text-[#B4A697] hover:text-[#F0E9DF] border border-transparent hover:border-[#4A4038] rounded transition-colors"
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
                        className="p-1.5 text-[#B5766A] hover:text-red-400 border border-transparent hover:border-[#4A4038] rounded transition-colors"
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

      {/* SUB-TAB 2: DEFINED ROLES */}
      {activeSubTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[#7C7062] border border-dashed border-[#4A4038] rounded">
              No roles found.
            </div>
          ) : (
            filteredRoles.map((role) => {
              const membersCount = userRoles.filter((urm) => urm.role_id === role.id).length;

              return (
                <div
                  key={role.id}
                  className="bg-[#26221E] border border-[#4A4038] rounded p-4 flex flex-col justify-between hover:border-[#8A7145] transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#C9A66B]" />
                        <h3 className="text-sm font-semibold text-[#F0E9DF]">{role.role_name}</h3>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          role.status === 'Active'
                            ? 'bg-[#7C9885]/15 text-[#7C9885] border-[#7C9885]/30'
                            : 'bg-[#B5766A]/15 text-[#B5766A] border-[#B5766A]/30'
                        }`}
                      >
                        {role.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#B4A697] leading-relaxed min-h-[36px]">
                      {role.description || 'Standard role permissions across tracker modules.'}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-[#38322C] flex items-center justify-between text-xs text-[#7C7062]">
                      <span className="font-mono">Assigned Members</span>
                      <span className="font-mono text-[#F0E9DF] font-medium">{membersCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-[#38322C]/70">
                    <button
                      onClick={() => handleOpenEditRole(role)}
                      className="p-1.5 text-[#B4A697] hover:text-[#F0E9DF] border border-transparent hover:border-[#4A4038] rounded transition-colors"
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
                        className="p-1.5 text-[#B5766A] hover:text-red-400 border border-transparent hover:border-[#4A4038] rounded transition-colors"
                        title="Delete Role"
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

      {/* SUB-TAB 3: ROLE MAPPINGS */}
      {activeSubTab === 'assignments' && (
        <div className="bg-[#26221E] border border-[#4A4038] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#4A4038] bg-[#302A25]/60 text-[#7C7062] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-4 font-normal">Team Member</th>
                  <th className="py-2.5 px-4 font-normal">Designation</th>
                  <th className="py-2.5 px-4 font-normal">Assigned Role</th>
                  <th className="py-2.5 px-4 font-normal">Assigned By</th>
                  <th className="py-2.5 px-4 font-normal">Date</th>
                  <th className="py-2.5 px-4 text-right font-normal">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38322C]">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#7C7062]">
                      No active role mappings.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((urm) => {
                    const user = getUser(urm.user_id);
                    const role = getRole(urm.role_id);
                    const assigner = getUser(urm.assigned_by);

                    return (
                      <tr key={urm.id} className="hover:bg-[#302A25]/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-[#F0E9DF]">
                          {user?.full_name || `Member #${urm.user_id}`}
                        </td>
                        <td className="py-3 px-4 text-[#B4A697]">
                          {user?.designation || 'Staff'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[11px] rounded bg-[#302A25] border border-[#4A4038] text-[#C9A66B]">
                            <Shield className="w-2.5 h-2.5" />
                            {role?.role_name || `Role #${urm.role_id}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#7C7062]">
                          {assigner?.full_name || 'System Admin'}
                        </td>
                        <td className="py-3 px-4 text-[#7C7062] font-mono">
                          {new Date(urm.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              if (confirm(`Remove this role assignment?`)) {
                                removeUserRole(urm.id);
                              }
                            }}
                            className="p-1 text-[#B5766A] hover:text-red-400 border border-transparent hover:border-[#4A4038] rounded transition-colors"
                            title="Remove Assignment"
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
      )}

      {/* MEMBER MODAL (Zero ID input) */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#26221E] border border-[#4A4038] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#38322C]">
              <div>
                <h3 className="font-display text-lg text-[#F0E9DF]">
                  {editingMember ? 'Edit Team Member' : 'Add Team Member'}
                </h3>
                <p className="text-xs text-[#7C7062]">Auto-incremented Supabase serial identity</p>
              </div>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="text-[#7C7062] hover:text-[#F0E9DF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#B4A697] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={memberForm.full_name}
                  onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3 py-2 bg-[#1E1B18] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#B4A697] mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="ramesh@projectcode.com"
                  className="w-full px-3 py-2 bg-[#1E1B18] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#B4A697] mb-1">Phone</label>
                  <input
                    type="text"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-[#1E1B18] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#B4A697] mb-1">Designation</label>
                  <input
                    type="text"
                    value={memberForm.designation}
                    onChange={(e) => setMemberForm({ ...memberForm, designation: e.target.value })}
                    placeholder="Site Engineer"
                    className="w-full px-3 py-2 bg-[#1E1B18] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#B4A697] mb-1">Status</label>
                <select
                  value={memberForm.status}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, status: e.target.value as StatusActiveInactive })
                  }
                  className="w-full px-3 py-2 bg-[#1E1B18] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#38322C]">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-mono text-[#B4A697] hover:text-[#F0E9DF] border border-[#4A4038] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17]"
                >
                  {editingMember ? 'Save Changes' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE MODAL (Zero ID input) */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#26221E] border border-[#4A4038] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#38322C]">
              <div>
                <h3 className="font-display text-lg text-[#F0E9DF]">
                  {editingRole ? 'Edit Role' : 'Add Role'}
                </h3>
                <p className="text-xs text-[#7C7062]">Auto-incremented Supabase serial identity</p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-[#7C7062] hover:text-[#F0E9DF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#B4A697] mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  value={roleForm.role_name}
                  onChange={(e) => setRoleForm({ ...roleForm, role_name: e.target.value })}
                  placeholder="e.g. Quantity Surveyor"
                  className="w-full px-3 py-2 bg-[#1E1B18] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#B4A697] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Describe module access and operational scope..."
                  className="w-full px-3 py-2 bg-[#1E1B18] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#B4A697] mb-1">Status</label>
                <select
                  value={roleForm.status}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, status: e.target.value as StatusActiveInactive })
                  }
                  className="w-full px-3 py-2 bg-[#1E1B18] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#38322C]">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-mono text-[#B4A697] hover:text-[#F0E9DF] border border-[#4A4038] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17]"
                >
                  {editingRole ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE ASSIGNMENT MODAL (Zero ID input) */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#26221E] border border-[#4A4038] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#38322C]">
              <div>
                <h3 className="font-display text-lg text-[#F0E9DF]">Assign Role to Member</h3>
                <p className="text-xs text-[#7C7062]">Maps user to designated security role</p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-[#7C7062] hover:text-[#F0E9DF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#B4A697] mb-1">Select Member</label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-[#1E1B18] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.designation || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#B4A697] mb-1">Select Role</label>
                <select
                  value={assignRoleId}
                  onChange={(e) => setAssignRoleId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-[#1E1B18] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#38322C]">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-mono text-[#B4A697] hover:text-[#F0E9DF] border border-[#4A4038] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17]"
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
          <div className="bg-[#26221E] border border-[#4A4038] rounded-lg max-w-sm w-full p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#38322C]">
              <h3 className="font-display text-base text-[#F0E9DF]">
                Assign Role to {quickAssignUser.full_name}
              </h3>
              <button
                onClick={() => setQuickAssignUser(null)}
                className="text-[#7C7062] hover:text-[#F0E9DF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#B4A697] mb-1">Select Role</label>
                <select
                  value={quickRoleId}
                  onChange={(e) => setQuickRoleId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-[#1E1B18] border border-[#4A4038] rounded text-xs text-[#F0E9DF] focus:outline-none focus:border-[#C9A66B]"
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
                  className="px-3 py-1.5 text-xs font-mono text-[#B4A697] hover:text-[#F0E9DF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17]"
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
