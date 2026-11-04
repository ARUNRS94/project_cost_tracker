import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { VendorMaster, StatusActiveInactive, ViewMode } from '../../types/erp';
import { ViewToggle } from '../common/ViewToggle';
import { exportMasterToCSV, downloadFile } from '../../services/api';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  X,
  Download,
} from 'lucide-react';

export const VendorMasterView: React.FC = () => {
  const { vendors, currency, addVendor, updateVendor, deleteVendor, getVendorSpent } = useERP();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorMaster | null>(null);

  // Form state (NO Vendor ID field!)
  const initialFormState: Omit<VendorMaster, 'id'> = {
    vendor_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    vendor_type: 'Material Supplier',
    status: 'Active',
    remarks: '',
  };
  const [formData, setFormData] = useState<Omit<VendorMaster, 'id'> & { id?: number }>(initialFormState);

  const vendorTypes = Array.from(new Set(vendors.map((v) => v.vendor_type)));

  const filteredVendors = vendors.filter((v) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      v.vendor_name.toLowerCase().includes(q) ||
      v.contact_person.toLowerCase().includes(q) ||
      v.gstin.toLowerCase().includes(q) ||
      v.vendor_type.toLowerCase().includes(q);

    const matchesType = typeFilter === 'all' || v.vendor_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingVendor(null);
    setFormData({ ...initialFormState });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: VendorMaster) => {
    setEditingVendor(v);
    setFormData({ ...v });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor_name || !formData.contact_person) {
      alert('Please fill required fields: Vendor Name and Contact Person.');
      return;
    }

    if (editingVendor) {
      updateVendor({
        ...editingVendor,
        ...formData,
      } as VendorMaster);
    } else {
      addVendor({
        vendor_name: formData.vendor_name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        gstin: formData.gstin || '',
        vendor_type: formData.vendor_type,
        status: formData.status,
        remarks: formData.remarks || '',
      });
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const csv = exportMasterToCSV('Vendors', vendors);
    downloadFile(csv, `Vendors_Master_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-[var(--border-soft)]">
        <div>
          <h2 className="font-display font-medium text-2xl text-[var(--text)]">
            Vendor Master
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-dim)] mt-0.5">
            Suppliers, subcontract fabricators, logistics handlers, and labour agencies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            title="Export Vendors Master to CSV"
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
            <span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vendors by name, contact, GSTIN or type..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Vendor Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-dim)] outline-none"
          >
            <option value="all">All Vendor Types</option>
            {vendorTypes.map((vt) => (
              <option key={vt} value={vt}>
                {vt}
              </option>
            ))}
          </select>

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

          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => {
            const totalProcured = getVendorSpent(vendor.id);

            return (
              <div
                key={vendor.id}
                className="p-5 bg-[var(--surface)] rounded-md border border-[var(--border-soft)] flex flex-col justify-between hover:border-[var(--border)] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge-accent">
                          {vendor.vendor_type}
                        </span>
                        <span
                          className={
                            vendor.status === 'Active'
                              ? 'badge-success'
                              : 'badge-neutral'
                          }
                        >
                          {vendor.status}
                        </span>
                      </div>
                      <h3 className="font-display font-medium text-lg text-[var(--text)] mt-1.5">
                        {vendor.vendor_name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(vendor)}
                        className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete vendor "${vendor.vendor_name}"?`)) {
                            deleteVendor(vendor.id);
                          }
                        }}
                        className="p-1.5 text-[var(--text-faint)] hover:text-red-400 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-3 pt-3 border-t border-[var(--border-soft)] text-xs text-[var(--text-dim)]">
                    <div className="font-medium text-[var(--text)]">{vendor.contact_person}</div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                      <span className="font-mono text-[11px]">{vendor.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-[11px] leading-relaxed">{vendor.address}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[var(--text-faint)] block">
                      Procurement Total
                    </span>
                    <span className="font-mono font-medium text-[var(--accent)] text-sm">
                      {currency} {totalProcured.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {vendor.gstin && (
                    <span className="font-mono text-[10px] text-[var(--text-faint)] bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--border)]">
                      GST: {vendor.gstin}
                    </span>
                  )}
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
                  <th className="py-2.5 px-3">Vendor / Supplier</th>
                  <th className="py-2.5 px-3">Contact Person</th>
                  <th className="py-2.5 px-3">Vendor Type</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">GSTIN</th>
                  <th className="py-2.5 px-3 text-right">Procurement Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredVendors.map((vendor) => {
                  const totalProcured = getVendorSpent(vendor.id);
                  return (
                    <tr key={vendor.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-[var(--text)]">
                        {vendor.vendor_name}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-dim)]">{vendor.contact_person}</td>
                      <td className="py-3 px-3">
                        <span className="badge-accent">
                          {vendor.vendor_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--text-dim)]">{vendor.phone}</td>
                      <td className="py-3 px-3 text-[var(--text-dim)]">{vendor.email}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[var(--text-faint)]">
                        {vendor.gstin || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--accent)] font-medium">
                        {currency} {totalProcured.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={
                            vendor.status === 'Active'
                              ? 'badge-success'
                              : 'badge-neutral'
                          }
                        >
                          {vendor.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEdit(vendor)}
                          className="p-1 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete vendor "${vendor.vendor_name}"?`)) {
                              deleteVendor(vendor.id);
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

      {/* CREATE / EDIT MODAL (No Vendor ID field) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="font-display font-medium text-lg text-[var(--text)]">
                  {editingVendor ? 'Edit Vendor Record' : 'Add New Vendor'}
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
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Vendor / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder="e.g. Paramount Signage Substrates"
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
                    placeholder="e.g. Mukesh Jain"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Vendor Type</label>
                  <input
                    type="text"
                    required
                    value={formData.vendor_type}
                    onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })}
                    placeholder="Material Supplier / Labour / Fabrication"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98200 11223"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sales@vendor.com"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    placeholder="27AAAPM1234F1Z8"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
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
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Workshop / Supply Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Industrial Area, Shed No. 12, Pimpri, Pune, MH"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Specializations, credit period, negotiated discount rates..."
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
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
                  {editingVendor ? 'Save Changes' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
