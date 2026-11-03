import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ClientMaster, StatusActiveInactive, ViewMode } from '../../types/erp';
import { ViewToggle } from '../common/ViewToggle';
import { exportMasterToCSV, downloadFile } from '../../services/api';
import {
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  X,
  Download,
  Building2,
} from 'lucide-react';

export const ClientMasterView: React.FC = () => {
  const { clients, projects, currency, addClient, updateClient, deleteClient } = useERP();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientMaster | null>(null);

  // Form state (NO Client ID field!)
  const initialFormState: Omit<ClientMaster, 'id'> = {
    client_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    status: 'Active',
  };
  const [formData, setFormData] = useState<Omit<ClientMaster, 'id'> & { id?: number }>(initialFormState);

  const filteredClients = clients.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      c.client_name.toLowerCase().includes(q) ||
      c.contact_person.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.gstin && c.gstin.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormData({ ...initialFormState });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: ClientMaster) => {
    setEditingClient(c);
    setFormData({ ...c });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name || !formData.contact_person) {
      alert('Please fill required fields: Client Name and Contact Person.');
      return;
    }

    if (editingClient) {
      updateClient({
        ...editingClient,
        ...formData,
      } as ClientMaster);
    } else {
      addClient({
        client_name: formData.client_name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        gstin: formData.gstin || '',
        status: formData.status,
      });
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const csv = exportMasterToCSV('Clients', clients);
    downloadFile(csv, `Clients_Master_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[var(--border-soft)]">
        <div>
          <h2 className="font-display font-medium text-2xl text-[var(--text)]">
            Client Master
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-dim)] mt-0.5">
            Accounts, primary contacts, billing addresses, and tax credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            title="Export Clients Master to CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Filter & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            type="text"
            placeholder="Search by client name, contact, email or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center border border-[var(--border)] rounded overflow-hidden">
            {(['all', 'Active', 'Inactive'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                  statusFilter === st
                    ? 'bg-[var(--accent)] text-[#1E1B18] font-bold'
                    : 'bg-[var(--surface)] text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>

          {/* Grid vs List View Toggle */}
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[var(--text-faint)] border border-dashed border-[var(--border)] rounded">
              No clients found matching criteria.
            </div>
          ) : (
            filteredClients.map((client) => {
              const clientProjects = projects.filter((p) => p.client_id === client.id);
              const totalContractValue = clientProjects.reduce(
                (acc, p) => acc + (Number(p.approved_budget) || 0),
                0
              );

              return (
                <div
                  key={client.id}
                  className="p-5 bg-[var(--surface)] rounded-md border border-[var(--border-soft)] flex flex-col justify-between hover:border-[var(--border)] transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                            client.status === 'Active'
                              ? 'border-green-800/40 text-green-400 bg-[var(--surface-2)]'
                              : 'border-[var(--border-soft)] text-[var(--text-faint)] bg-[var(--surface-2)]'
                          }`}
                        >
                          {client.status}
                        </span>
                        <h3 className="font-display font-medium text-lg text-[var(--text)] mt-1.5">
                          {client.client_name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(client)}
                          className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete client "${client.client_name}"?`)) {
                              deleteClient(client.id);
                            }
                          }}
                          className="p-1.5 text-[var(--text-faint)] hover:text-red-400 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mt-3 pt-3 border-t border-[var(--border-soft)] text-xs text-[var(--text-dim)]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text)]">{client.contact_person}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                        <span className="font-mono text-[11px]">{client.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0 mt-0.5" />
                        <span className="line-clamp-2 text-[11px] leading-relaxed">{client.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[var(--text-faint)] block">
                        Contract Commitment
                      </span>
                      <span className="font-mono font-medium text-[var(--accent)] text-sm">
                        {currency} {totalContractValue.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {client.gstin && (
                      <span className="font-mono text-[10px] text-[var(--text-faint)] bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--border)]">
                        GST: {client.gstin}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* LIST / TABLE VIEW */}
      {viewMode === 'list' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-faint)] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Client Name</th>
                  <th className="py-2.5 px-3">Contact Person</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">GSTIN</th>
                  <th className="py-2.5 px-3">Projects</th>
                  <th className="py-2.5 px-3 text-right">Contract Value</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredClients.map((client) => {
                  const clientProjects = projects.filter((p) => p.client_id === client.id);
                  const totalContractValue = clientProjects.reduce(
                    (acc, p) => acc + (Number(p.approved_budget) || 0),
                    0
                  );

                  return (
                    <tr key={client.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-[var(--text)]">
                        {client.client_name}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-dim)]">{client.contact_person}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-dim)]">{client.phone}</td>
                      <td className="py-3 px-3 text-[var(--text-dim)]">{client.email}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[var(--text-faint)]">
                        {client.gstin || '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-center text-[var(--text-dim)]">
                        {clientProjects.length}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--accent)] font-medium">
                        {currency} {totalContractValue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            client.status === 'Active'
                              ? 'border-green-800/40 text-green-400 bg-[var(--surface-2)]'
                              : 'border-[var(--border-soft)] text-[var(--text-faint)] bg-[var(--surface-2)]'
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEdit(client)}
                          className="p-1 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete client "${client.client_name}"?`)) {
                              deleteClient(client.id);
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

      {/* CREATE / EDIT MODAL (No Client ID input) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="font-display font-medium text-lg text-[var(--text)]">
                  {editingClient ? 'Edit Client Record' : 'Add New Client'}
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
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Company / Client Name *</label>
                <input
                  type="text"
                  required
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="e.g. Acme Commercial Developers"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="e.g. Vikram Malhotra"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98201 00000"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@company.in"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    placeholder="27AAACA1234A1Z5"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Office / Billing Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Plot 42, Bandra Kurla Complex, Mumbai, MH"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as StatusActiveInactive })
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18]"
                >
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
