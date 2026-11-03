import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ClientMaster, StatusActiveInactive } from '../../types/erp';
import {
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

export const ClientMasterView: React.FC = () => {
  const { clients, projects, currency, addClient, updateClient, deleteClient } = useERP();

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#38322C]">
        <div>
          <p className="text-[10.5px] uppercase tracking-wider text-[#7C7062]">CUSTOMER DIRECTORY</p>
          <h1 className="font-display font-normal text-2xl text-[#F0E9DF]">
            Client Master
          </h1>
          <p className="text-xs text-[#B4A697] mt-0.5">
            Registered corporate clients, GSTIN filing, and contracted projects.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all whitespace-nowrap shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#26221E] rounded-md border border-[#38322C]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7C7062] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients by name, contact, GSTIN..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] placeholder-[#7C7062] outline-none"
          />
        </div>

        <div className="flex items-center border border-[#4A4038] rounded overflow-hidden">
          {(['all', 'Active', 'Inactive'] as const).map((st) => (
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

      {/* Clients Cards (NO IDs displayed!) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const clientProjects = projects.filter((p) => p.client_id === client.id);
          const totalContractValue = clientProjects.reduce(
            (acc, p) => acc + (Number(p.approved_budget) || 0),
            0
          );

          return (
            <div
              key={client.id}
              className="p-5 bg-[#26221E] rounded-md border border-[#38322C] flex flex-col justify-between hover:border-[#4A4038] transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                        client.status === 'Active'
                          ? 'border-[#566A5C] text-[#7C9885] bg-[#1E1B18]'
                          : 'border-[#38322C] text-[#7C7062] bg-[#1E1B18]'
                      }`}
                    >
                      {client.status}
                    </span>
                    <h3 className="font-display font-medium text-lg text-[#F0E9DF] mt-1.5">
                      {client.client_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(client)}
                      className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
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
                      className="p-1.5 text-[#7C7062] hover:text-[#B5766A] rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1.5 text-xs text-[#B4A697] mt-3 pt-3 border-t border-[#38322C]">
                  <div className="font-medium text-[#F0E9DF]">
                    {client.contact_person}
                  </div>
                  <div className="flex items-center gap-2 text-[#7C7062]">
                    <Phone className="w-3.5 h-3.5 text-[#7C7062] shrink-0" />
                    <span className="font-mono">{client.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#7C7062]">
                    <Mail className="w-3.5 h-3.5 text-[#7C7062] shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[#7C7062]">
                    <MapPin className="w-3.5 h-3.5 text-[#7C7062] shrink-0 mt-0.5" />
                    <span className="text-[11px] line-clamp-2">{client.address}</span>
                  </div>
                </div>

                {/* GSTIN */}
                {client.gstin && (
                  <div className="mt-3 p-2 bg-[#1E1B18] rounded text-[11px] font-mono text-[#7C7062] flex items-center justify-between border border-[#38322C]">
                    <span>GSTIN:</span>
                    <span className="font-medium text-[#F0E9DF]">{client.gstin}</span>
                  </div>
                )}
              </div>

              {/* Projects Summary */}
              <div className="mt-4 pt-3 border-t border-[#38322C] flex items-center justify-between text-xs">
                <span className="text-[#7C7062]">{clientProjects.length} Projects</span>
                <span className="font-mono font-medium text-[#C9A66B] tabular-nums">
                  {currency} {totalContractValue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Client Modal (NO Client ID input field!) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-[#26221E] rounded-md shadow-2xl border border-[#4A4038] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#38322C]">
              <h3 className="font-display text-base font-semibold text-[#F0E9DF]">
                {editingClient ? 'Edit Client Record' : 'Create Client Record'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Company / Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="e.g. Apex Retail Brands Ltd"
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="e.g. Vikram Malhotra"
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as StatusActiveInactive })
                    }
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98..."
                    className="w-full text-xs font-mono p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@company.com"
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="27AAACA1234A1Z5"
                  className="w-full text-xs font-mono p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Corporate / Site address"
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
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
