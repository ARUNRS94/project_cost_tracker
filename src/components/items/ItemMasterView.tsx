import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ItemMaster, ItemTypeMaster, StatusActiveInactive } from '../../types/erp';
import { ReceiptModal } from '../common/ReceiptModal';
import {
  Plus,
  Search,
  Image as ImageIcon,
  MapPin,
  Edit2,
  Trash2,
  X,
  Tags,
  Layers,
} from 'lucide-react';

export const ItemMasterView: React.FC = () => {
  const {
    items,
    itemTypes,
    currency,
    addItem,
    updateItem,
    deleteItem,
    getItemType,
    addItemType,
    updateItemType,
    deleteItemType,
  } = useERP();

  const [subTab, setSubTab] = useState<'items' | 'types'>('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ItemTypeMaster | null>(null);

  // Picture viewer modal
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    referenceNumber?: string;
  }>({
    isOpen: false,
    title: '',
  });

  // Item form state (NO Item ID field!)
  const initialItemState: Omit<ItemMaster, 'id'> = {
    item_name: '',
    item_type_id: itemTypes[0]?.id || 1,
    description: '',
    status: 'Active',
    reference_picture: '',
    work_location_picture: '',
    item_size: 'Standard',
    default_rate: 10000,
    remark: '',
  };
  const [itemFormData, setItemFormData] = useState<Omit<ItemMaster, 'id'> & { id?: number }>(initialItemState);

  // Type form state (NO Item Type ID field!)
  const initialTypeState: Omit<ItemTypeMaster, 'id'> = {
    description: '',
  };
  const [typeFormData, setTypeFormData] = useState<Omit<ItemTypeMaster, 'id'> & { id?: number }>(initialTypeState);

  const filteredItems = items.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      item.item_name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      getItemType(item.item_type_id)?.description.toLowerCase().includes(q);

    const matchesType = typeFilter === 'all' || item.item_type_id === parseInt(typeFilter, 10);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredTypes = itemTypes.filter((t) => {
    const q = searchTerm.toLowerCase();
    return !q || t.description.toLowerCase().includes(q);
  });

  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemFormData({
      ...initialItemState,
      item_type_id: itemTypes[0]?.id || 1,
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (i: ItemMaster) => {
    setEditingItem(i);
    setItemFormData({ ...i });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.item_name || !itemFormData.item_type_id) {
      alert('Please fill required fields: Item Name and Item Type.');
      return;
    }

    if (editingItem) {
      updateItem({
        ...editingItem,
        ...itemFormData,
      } as ItemMaster);
    } else {
      addItem({
        item_name: itemFormData.item_name,
        item_type_id: Number(itemFormData.item_type_id),
        description: itemFormData.description,
        status: itemFormData.status,
        reference_picture: itemFormData.reference_picture,
        work_location_picture: itemFormData.work_location_picture,
        item_size: itemFormData.item_size,
        default_rate: Number(itemFormData.default_rate) || 0,
        remark: itemFormData.remark,
      });
    }
    setIsItemModalOpen(false);
  };

  const handleOpenCreateType = () => {
    setEditingType(null);
    setTypeFormData({ ...initialTypeState });
    setIsTypeModalOpen(true);
  };

  const handleOpenEditType = (t: ItemTypeMaster) => {
    setEditingType(t);
    setTypeFormData({ ...t });
    setIsTypeModalOpen(true);
  };

  const handleSaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeFormData.description) {
      alert('Please provide a description for the Item Type.');
      return;
    }

    if (editingType) {
      updateItemType({
        ...editingType,
        ...typeFormData,
      } as ItemTypeMaster);
    } else {
      addItemType({
        description: typeFormData.description,
      });
    }
    setIsTypeModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#38322C]">
        <div>
          <p className="text-[10.5px] uppercase tracking-wider text-[#7C7062]">PRODUCT & FABRICATION SPECIFICATIONS</p>
          <h1 className="font-display font-normal text-2xl text-[#F0E9DF]">
            Catalog & Item Master
          </h1>
          <p className="text-xs text-[#B4A697] mt-0.5">
            Reference fabrication specs, work location pictures, dimensions, and rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab switcher */}
          <div className="flex items-center border border-[#4A4038] rounded overflow-hidden mr-2">
            <button
              onClick={() => setSubTab('items')}
              className={`px-3 py-1.5 text-xs transition-colors ${
                subTab === 'items'
                  ? 'bg-[#8A7145] text-[#1E1B18] font-bold'
                  : 'bg-[#1E1B18] text-[#B4A697] hover:text-[#F0E9DF]'
              }`}
            >
              Items ({items.length})
            </button>
            <button
              onClick={() => setSubTab('types')}
              className={`px-3 py-1.5 text-xs transition-colors border-l border-[#4A4038] ${
                subTab === 'types'
                  ? 'bg-[#8A7145] text-[#1E1B18] font-bold'
                  : 'bg-[#1E1B18] text-[#B4A697] hover:text-[#F0E9DF]'
              }`}
            >
              Item Types ({itemTypes.length})
            </button>
          </div>

          {subTab === 'items' ? (
            <button
              onClick={handleOpenCreateItem}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Item</span>
            </button>
          ) : (
            <button
              onClick={handleOpenCreateType}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Item Type</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#26221E] rounded-md border border-[#38322C]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7C7062] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={subTab === 'items' ? 'Search items by name, specification...' : 'Search item types...'}
            className="w-full text-xs pl-9 pr-3 py-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] placeholder-[#7C7062] outline-none"
          />
        </div>

        {subTab === 'items' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-[#1E1B18] border border-[#4A4038] rounded px-2.5 py-1.5 text-[#F0E9DF] outline-none cursor-pointer"
            >
              <option value="all">All Item Types</option>
              {itemTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.description}
                </option>
              ))}
            </select>

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
        )}
      </div>

      {/* SUBTAB 1: Items Grid (NO Item ID displayed!) */}
      {subTab === 'items' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const itemType = getItemType(item.item_type_id);

            return (
              <div
                key={item.id}
                className="p-5 bg-[#26221E] rounded-md border border-[#38322C] flex flex-col justify-between hover:border-[#4A4038] transition-all"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                            item.status === 'Active'
                              ? 'border-[#566A5C] text-[#7C9885] bg-[#1E1B18]'
                              : 'border-[#38322C] text-[#7C7062] bg-[#1E1B18]'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-[11px] text-[#7C7062]">
                          {itemType ? itemType.description : 'Standard Type'}
                        </span>
                      </div>
                      <h3 className="font-display font-medium text-lg text-[#F0E9DF] mt-1.5">
                        {item.item_name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete item "${item.item_name}"?`)) {
                            deleteItem(item.id);
                          }
                        }}
                        className="p-1.5 text-[#7C7062] hover:text-[#B5766A] rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#B4A697] line-clamp-2 mt-2">
                    {item.description}
                  </p>

                  {/* Dual Pictures: Reference Spec & Work Location */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {/* Reference Picture */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-[#7C7062]">
                        <span>Reference Spec</span>
                        <ImageIcon className="w-3 h-3" />
                      </div>
                      <div
                        onClick={() =>
                          setImageModal({
                            isOpen: true,
                            title: `Reference Spec: ${item.item_name}`,
                            subtitle: `Dimensions: ${item.item_size}`,
                            imageUrl: item.reference_picture,
                          })
                        }
                        className="h-24 w-full rounded overflow-hidden border border-[#38322C] bg-[#1E1B18] relative cursor-pointer group flex items-center justify-center"
                      >
                        {item.reference_picture ? (
                          <img
                            src={item.reference_picture}
                            alt={item.item_name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
                          <ImageIcon className="w-4 h-4 text-[#F0E9DF]/80" />
                          <span className="text-[10px] text-[#F0E9DF] mt-1">Inspect</span>
                        </div>
                      </div>
                    </div>

                    {/* Work Location Picture */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-[#7C7062]">
                        <span>Work Location</span>
                        <MapPin className="w-3 h-3" />
                      </div>
                      <div
                        onClick={() =>
                          setImageModal({
                            isOpen: true,
                            title: `Work Location: ${item.item_name}`,
                            subtitle: `Site Placement: ${item.item_size}`,
                            imageUrl: item.work_location_picture,
                          })
                        }
                        className="h-24 w-full rounded overflow-hidden border border-[#38322C] bg-[#1E1B18] relative cursor-pointer group flex items-center justify-center"
                      >
                        {item.work_location_picture ? (
                          <img
                            src={item.work_location_picture}
                            alt={`${item.item_name} site position`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
                          <MapPin className="w-4 h-4 text-[#F0E9DF]/80" />
                          <span className="text-[10px] text-[#F0E9DF] mt-1">Site View</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dimensions & Remark */}
                  <div className="mt-3 p-2 bg-[#1E1B18] rounded text-xs space-y-1 border border-[#38322C]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#7C7062]">Dimensions:</span>
                      <span className="text-[#F0E9DF] font-medium">{item.item_size}</span>
                    </div>
                    {item.remark && (
                      <p className="text-[10.5px] text-[#7C7062] italic border-t border-[#38322C] pt-1">
                        Note: {item.remark}
                      </p>
                    )}
                  </div>
                </div>

                {/* Default Rate */}
                <div className="mt-4 pt-3 border-t border-[#38322C] flex items-center justify-between text-xs">
                  <span className="text-[#7C7062]">Standard Rate</span>
                  <span className="font-mono font-medium text-[#C9A66B] tabular-nums text-sm">
                    {currency} {(Number(item.default_rate) || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBTAB 2: Item Types Table (NO Item Type ID column!) */}
      {subTab === 'types' && (
        <div className="bg-[#26221E] rounded-md border border-[#38322C] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1E1B18] text-[#7C7062] border-b border-[#38322C]">
              <tr>
                <th className="py-3 px-4 font-normal text-[10.5px] uppercase">Description / Type</th>
                <th className="py-3 px-4 font-normal text-[10.5px] uppercase">Linked Catalog Items</th>
                <th className="py-3 px-4 font-normal text-[10.5px] uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#38322C]/70 text-[#B4A697]">
              {filteredTypes.map((type) => {
                const linkedItems = items.filter((i) => i.item_type_id === type.id);
                return (
                  <tr key={type.id} className="hover:bg-[#302A25]/40 transition-colors">
                    <td className="py-3 px-4 text-[#F0E9DF] font-medium text-sm">
                      {type.description}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#C9A66B]">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{linkedItems.length} items linked</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEditType(type)}
                        className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
                        title="Edit Type"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete item type "${type.description}"?`)) {
                            deleteItemType(type.id);
                          }
                        }}
                        className="p-1.5 text-[#7C7062] hover:text-[#B5766A] rounded transition-colors"
                        title="Delete Type"
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
      )}

      {/* Add / Edit Item Modal (NO Item ID input field!) */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-[#26221E] rounded-md shadow-2xl border border-[#4A4038] overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#38322C]">
              <h3 className="font-display text-base font-semibold text-[#F0E9DF]">
                {editingItem ? 'Edit Item Specification' : 'Create Catalog Item'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemFormData.item_name}
                  onChange={(e) => setItemFormData({ ...itemFormData, item_name: e.target.value })}
                  placeholder="e.g. 3D Acrylic Channel Letter Glow Sign"
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Item Type *
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
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  >
                    {itemTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Status *
                  </label>
                  <select
                    value={itemFormData.status}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        status: e.target.value as StatusActiveInactive,
                      })
                    }
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  placeholder="Material specs, IP ratings, return profiles..."
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Dimensions / Size *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemFormData.item_size}
                    onChange={(e) => setItemFormData({ ...itemFormData, item_size: e.target.value })}
                    placeholder="e.g. 18ft x 3.5ft"
                    className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#B4A697] mb-1">
                    Default Rate ({currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={itemFormData.default_rate}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        default_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs font-mono font-bold p-2 rounded bg-[#1E1B18] border border-[#C9A66B] text-[#C9A66B] outline-none"
                  />
                </div>
              </div>

              {/* Reference Picture URL / Upload */}
              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Reference Picture (URL or File)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={itemFormData.reference_picture}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, reference_picture: e.target.value })
                    }
                    placeholder="https://... image link"
                    className="flex-1 text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                  <label className="px-3 py-2 border border-[#4A4038] hover:border-[#8A7145] text-[#B4A697] hover:text-[#F0E9DF] text-xs font-medium rounded cursor-pointer transition-colors shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setItemFormData({
                              ...itemFormData,
                              reference_picture: evt.target?.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Work Location Picture URL / Upload */}
              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Work Location Picture (Site Placement)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={itemFormData.work_location_picture}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, work_location_picture: e.target.value })
                    }
                    placeholder="https://... site mounting position"
                    className="flex-1 text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                  />
                  <label className="px-3 py-2 border border-[#4A4038] hover:border-[#8A7145] text-[#B4A697] hover:text-[#F0E9DF] text-xs font-medium rounded cursor-pointer transition-colors shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setItemFormData({
                              ...itemFormData,
                              work_location_picture: evt.target?.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Remark / Installation Advisory
                </label>
                <input
                  type="text"
                  value={itemFormData.remark}
                  onChange={(e) => setItemFormData({ ...itemFormData, remark: e.target.value })}
                  placeholder="e.g. Scaffolding lift required for mounting"
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#38322C]">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#B4A697] hover:text-[#F0E9DF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all shadow-xs"
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Item Type Modal (NO Item Type ID input field!) */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[#26221E] rounded-md shadow-2xl border border-[#4A4038] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#38322C]">
              <h3 className="font-display text-base font-semibold text-[#F0E9DF]">
                {editingType ? 'Edit Item Type' : 'Create Item Type'}
              </h3>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-[#B4A697] mb-1">
                  Type Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                  placeholder="e.g. Architectural Metal & Acrylic Fabrication"
                  className="w-full text-xs p-2 rounded bg-[#1E1B18] border border-[#4A4038] text-[#F0E9DF] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#38322C]">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#B4A697] hover:text-[#F0E9DF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded bg-[#C9A66B] hover:bg-[#D9B87C] text-[#241E17] transition-all shadow-xs"
                >
                  {editingType ? 'Save Changes' : 'Create Item Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Picture Viewer Modal */}
      <ReceiptModal
        isOpen={imageModal.isOpen}
        onClose={() => setImageModal({ ...imageModal, isOpen: false })}
        title={imageModal.title}
        subtitle={imageModal.subtitle}
        imageUrl={imageModal.imageUrl}
      />
    </div>
  );
};
