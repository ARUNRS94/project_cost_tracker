import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { VendorMaster, StatusActiveInactive } from '../../types/erp';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

export const VendorMasterView: React.FC = () => {
  const { vendors, currency, addVendor, updateVendor, deleteVendor, getVendorSpent } = useERP();

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
        gstin: formData.gstin,
        vendor_type: formData.vendor_type,
        status: formData.status,
        remarks: formData.remarks,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#38322C]">
        <div>
          <p className="text-[10.5px] uppercase tracking-wider text-[#7C7062]">PROCUREMENT PARTNERS</p>
          <h1 className="font-display font-normal text-2xl text-[#F0E9DF]">
            Vendor Master
          </h1>
          <p className="text-xs text-[#B4A697] mt-0.5">
            Material suppliers, fabrication agencies, riggers, and logistic providers.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all whitespace-nowrap shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vendor</span>
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
            placeholder="Search vendors by name, GSTIN, type, contact..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] placeholder-[#7C7062] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Vendor Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-[#1E1B18] border border-[#4A4038] rounded px-2.5 py-1.5 text-[#F0E9DF] outline-none cursor-pointer"
          >
            <option value="all">All Vendor Types</option>
            {vendorTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[#1E1B18] border border-[#4A4038] rounded px-2.5 py-1.5 text-[#F0E9DF] outline-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Vendor Cards (NO IDs displayed!) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => {
          const spend = getVendorSpent(vendor.id);

          return (
            <div
              key={vendor.id}
              className="p-5 bg-[#26221E] rounded-md border border-[#38322C] flex flex-col justify-between hover:border-[#4A4038] transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                          vendor.status === 'Active'
                            ? 'border-[#566A5C] text-[#7C9885] bg-[#1E1B18]'
                            : 'border-[#38322C] text-[#7C7062] bg-[#1E1B18]'
                        }`}
                      >
                        {vendor.status}
                      </span>
                      <span className="text-[11px] text-[#7C7062]">
                        {vendor.vendor_type}
                      </span>
                    </div>
                    <h3 className="font-display font-medium text-lg text-[#F0E9DF] mt-1.5">
                      {vendor.vendor_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(vendor)}
                      className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
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
                    {vendor.contact_person}
                  </div>
                  <div className="flex items-center gap-2 text-[#7C7062]">
                    <Phone className="w-3.5 h-3.5 text-[#7C7062] shrink-0" />
                    <span className="font-mono">{vendor.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#7C7062]">
                    <Mail className="w-3.5 h-3.5 text-[#7C7062] shrink-0" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[#7C7062]">
                    <MapPin className="w-3.5 h-3.5 text-[#7C7062] shrink-0 mt-0.5" />
                    <span className="text-[11px] line-clamp-2">{vendor.address}</span>
                  </div>
                </div>

                {/* GSTIN & Remarks */}
                <div className="mt-3 space-y-1.5">
                  <div className="p-2 bg-[#1E1B18] rounded text-[11px] font-mono text-[#7C7062] flex items-center justify-between border border-[#38322C]">
                    <span>GSTIN:</span>
                    <span className="font-medium text-[#F0E9DF]">{vendor.gstin}</span>
                  </div>
                  {vendor.remarks && (
                    <p className="text-[11px] text-[#7C7062] italic bg-[#1E1B18] p-1.5 rounded border border-[#38322C]">
                      "{vendor.remarks}"
                    </p>
                  )}
                </div>
              </div>

              {/* Spend summary */}
              <div className="mt-4 pt-3 border-t border-[#38322C]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#7C7062]">Invoiced Value:</span>
                  <span className="font-mono font-medium text-[#C9A66B] tabular-nums">
                    {currency} {spend.total.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#7C9885]">
                    Paid: {currency} {spend.paid.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[#B4A697]">
                    Due: {currency} {spend.unpaid.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal (NO Vendor ID input field!) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-[#26221E] rounded-md shadow-2xl border border-[#4A4038] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#38322C]">
              <h3 className="font-display text-base font-semibold text-[#F0E9DF]">
                {editingVendor ? 'Edit Vendor Record' : 'Create Vendor Record'}
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
                  Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder="e.g. Precision Metal Crafters Pvt Ltd"
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Vendor Type *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vendor_type}
                    onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })}
                    placeholder="Material Supplier, Labour, Print..."
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    GSTIN *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    placeholder="27AABCP7812M1Z3"
                    className="w-full text-xs font-mono p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
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
                    placeholder="e.g. Mohd. Rafiq"
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
                    placeholder="quotes@company.com"
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Workshop / yard / depot address"
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Remarks / Specializations
                </label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Equipped with 3kW fiber laser, CNC bending"
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
