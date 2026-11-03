import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ItemMaster, ItemTypeMaster, StatusActiveInactive, ViewMode } from '../../types/erp';
import { ReceiptModal } from '../common/ReceiptModal';
import { ViewToggle } from '../common/ViewToggle';
import { exportMasterToCSV, downloadFile } from '../../services/api';
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
  Download,
  Upload,
} from 'lucide-react';

export const ItemMasterView: React.FC = () => {
  const {
    items,
    itemTypes,
    projects,
    getProject,
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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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
    project_id: null,
    item_name: '',
    item_type_id: itemTypes[0]?.id || 1,
    description: '',
    status: 'Active',
    reference_picture: '',
    work_location_picture: '',
    item_size: '',
    default_rate: 0,
    remark: '',
  };
  const [itemFormData, setItemFormData] = useState<Omit<ItemMaster, 'id'> & { id?: number }>(initialItemState);

  // Item Type form state (NO Item Type ID field!)
  const initialTypeState: Omit<ItemTypeMaster, 'id'> = {
    description: '',
  };
  const [typeFormData, setTypeFormData] = useState<Omit<ItemTypeMaster, 'id'> & { id?: number }>(initialTypeState);

  // Filtered lists
  const filteredItems = items.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      item.item_name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.item_size.toLowerCase().includes(q) ||
      item.remark.toLowerCase().includes(q);

    const matchesType = typeFilter === 'all' || item.item_type_id === Number(typeFilter);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredItemTypes = itemTypes.filter((t) => {
    const q = searchTerm.toLowerCase();
    return !q || t.description.toLowerCase().includes(q);
  });

  // Handlers for Items
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemFormData({
      ...initialItemState,
      item_type_id: itemTypes[0]?.id || 1,
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: ItemMaster) => {
    setEditingItem(item);
    setItemFormData({ ...item });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.item_name) {
      alert('Please fill the Item Name.');
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
        item_type_id: itemFormData.item_type_id,
        description: itemFormData.description,
        status: itemFormData.status,
        reference_picture: itemFormData.reference_picture || '',
        work_location_picture: itemFormData.work_location_picture || '',
        item_size: itemFormData.item_size || '',
        default_rate: Number(itemFormData.default_rate) || 0,
        remark: itemFormData.remark || '',
      });
    }
    setIsItemModalOpen(false);
  };

  const handleImageUpload = (
    field: 'reference_picture' | 'work_location_picture',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setItemFormData((prev) => ({
        ...prev,
        [field]: dataUrl,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handlers for Item Types
  const handleOpenCreateType = () => {
    setEditingType(null);
    setTypeFormData({ ...initialTypeState });
    setIsTypeModalOpen(true);
  };

  const handleOpenEditType = (type: ItemTypeMaster) => {
    setEditingType(type);
    setTypeFormData({ ...type });
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

  const handleExportCSV = () => {
    if (subTab === 'items') {
      const csv = exportMasterToCSV('Items', items);
      downloadFile(csv, `Items_Catalog_${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      const csv = exportMasterToCSV('ItemTypes', itemTypes);
      downloadFile(csv, `Item_Types_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--border-soft)]">
        <div>
          <h2 className="font-display font-medium text-2xl text-[var(--text)]">
            Catalog & Item Master
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-dim)] mt-0.5">
            Reference fabrication specs, work location pictures, dimensions, and unit rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab switcher */}
          <div className="flex items-center border border-[var(--border)] rounded overflow-hidden mr-2 bg-[var(--surface)]">
            <button
              onClick={() => setSubTab('items')}
              className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                subTab === 'items'
                  ? 'bg-[var(--accent)] text-[#1E1B18] font-bold'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              Items ({items.length})
            </button>
            <button
              onClick={() => setSubTab('types')}
              className={`px-3 py-1.5 text-xs font-mono transition-colors border-l border-[var(--border)] ${
                subTab === 'types'
                  ? 'bg-[var(--accent)] text-[#1E1B18] font-bold'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              Item Types ({itemTypes.length})
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            title="Export to CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {subTab === 'items' ? (
            <button
              onClick={handleOpenCreateItem}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Item</span>
            </button>
          ) : (
            <button
              onClick={handleOpenCreateType}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Item Type</span>
            </button>
          )}
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
            placeholder={subTab === 'items' ? 'Search items by name, specification...' : 'Search item types...'}
            className="w-full text-xs pl-9 pr-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        {subTab === 'items' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1.5 text-[var(--text)] outline-none cursor-pointer"
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
              className="text-xs bg-[var(--bg)] border border-[var(--border)] rounded px-2.5 py-1.5 text-[var(--text)] outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <ViewToggle mode={viewMode} onChange={setViewMode} />
          </div>
        )}
      </div>

      {/* SUBTAB 1: Items Grid View */}
      {subTab === 'items' && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const itemType = getItemType(item.item_type_id);

            return (
              <div
                key={item.id}
                className="p-5 bg-[var(--surface)] rounded-md border border-[var(--border-soft)] flex flex-col justify-between hover:border-[var(--border)] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]">
                        {itemType?.description || 'Custom Item'}
                      </span>
                      <h3 className="font-display font-medium text-base text-[var(--text)] mt-1.5 line-clamp-1">
                        {item.item_name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete item "${item.item_name}"?`)) {
                            deleteItem(item.id);
                          }
                        }}
                        className="p-1.5 text-[var(--text-faint)] hover:text-red-400 rounded"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-dim)] line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Dual Image Gallery: Reference Picture & Work Location Picture */}
                  <div className="mt-4 pt-3 border-t border-[var(--border-soft)]">
                    <div className="text-[10.5px] uppercase font-mono text-[var(--text-faint)] mb-2 flex items-center justify-between">
                      <span>Dual Photo Records</span>
                      <span className="text-[10px] text-[var(--accent)]">Click to Inspect</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div
                        onClick={() =>
                          setImageModal({
                            isOpen: true,
                            title: `Reference Spec: ${item.item_name}`,
                            subtitle: `Item Category: ${itemType?.description || 'Standard'}`,
                            imageUrl: item.reference_picture,
                          })
                        }
                        className="h-24 w-full rounded overflow-hidden border border-[var(--border)] bg-[var(--bg)] relative cursor-pointer group flex items-center justify-center"
                      >
                        {item.reference_picture ? (
                          <img
                            src={item.reference_picture}
                            alt={`${item.item_name} reference`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : null}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
                          <ImageIcon className="w-4 h-4 text-white/80" />
                          <span className="text-[10px] text-white mt-1">Ref Spec</span>
                        </div>
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
                        className="h-24 w-full rounded overflow-hidden border border-[var(--border)] bg-[var(--bg)] relative cursor-pointer group flex items-center justify-center"
                      >
                        {item.work_location_picture ? (
                          <img
                            src={item.work_location_picture}
                            alt={`${item.item_name} site position`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : null}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
                          <MapPin className="w-4 h-4 text-white/80" />
                          <span className="text-[10px] text-white mt-1">Site View</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dimensions & Remark */}
                  <div className="mt-3 p-2 bg-[var(--bg)] rounded text-xs space-y-1 border border-[var(--border)]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-faint)]">Dimensions:</span>
                      <span className="text-[var(--text)] font-medium font-mono">{item.item_size}</span>
                    </div>
                    {item.remark && (
                      <p className="text-[10.5px] text-[var(--text-faint)] italic border-t border-[var(--border-soft)] pt-1">
                        Note: {item.remark}
                      </p>
                    )}
                  </div>
                </div>

                {/* Default Rate */}
                <div className="mt-4 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between text-xs">
                  <span className="text-[var(--text-faint)]">Standard Rate</span>
                  <span className="font-mono font-medium text-[var(--accent)] tabular-nums text-sm">
                    {currency} {(Number(item.default_rate) || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBTAB 1: Items List View */}
      {subTab === 'items' && viewMode === 'list' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-faint)] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-14">Ref Photo</th>
                  <th className="py-2.5 px-3 w-14">Site Photo</th>
                  <th className="py-2.5 px-3">Item Name & Specs</th>
                  <th className="py-2.5 px-3">Item Type</th>
                  <th className="py-2.5 px-3">Dimensions</th>
                  <th className="py-2.5 px-3 text-right">Default Rate</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredItems.map((item) => {
                  const itemType = getItemType(item.item_type_id);
                  return (
                    <tr key={item.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                      <td className="py-2.5 px-3">
                        {item.reference_picture ? (
                          <img
                            src={item.reference_picture}
                            alt="Ref"
                            onClick={() =>
                              setImageModal({
                                isOpen: true,
                                title: `Reference: ${item.item_name}`,
                                imageUrl: item.reference_picture,
                              })
                            }
                            className="w-10 h-10 object-cover rounded border border-[var(--border)] cursor-pointer hover:opacity-80"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-faint)]">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.work_location_picture ? (
                          <img
                            src={item.work_location_picture}
                            alt="Site"
                            onClick={() =>
                              setImageModal({
                                isOpen: true,
                                title: `Site Location: ${item.item_name}`,
                                imageUrl: item.work_location_picture,
                              })
                            }
                            className="w-10 h-10 object-cover rounded border border-[var(--border)] cursor-pointer hover:opacity-80"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-faint)]">
                            <MapPin className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[var(--text)]">
                        <div>
                          <span>{item.item_name}</span>
                          <p className="text-[11px] text-[var(--text-dim)] truncate max-w-xs">{item.description}</p>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]">
                          {itemType?.description || 'Custom Item'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--text-dim)]">{item.item_size}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[var(--accent)] font-medium">
                        {currency} {(Number(item.default_rate) || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            item.status === 'Active'
                              ? 'text-green-400 bg-green-950/30'
                              : 'text-[var(--text-faint)] bg-[var(--surface-2)]'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          className="p-1 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
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

      {/* SUBTAB 2: Item Types Table */}
      {subTab === 'types' && (
        <div className="bg-[var(--surface)] rounded-md border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-faint)] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-4 font-normal">Item Type / Category</th>
                  <th className="py-2.5 px-4 font-normal">Items Cataloged</th>
                  <th className="py-2.5 px-4 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredItemTypes.map((type) => {
                  const associatedItemsCount = items.filter((it) => it.item_type_id === type.id).length;
                  return (
                    <tr key={type.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                      <td className="py-3 px-4 text-[var(--text)] font-medium flex items-center gap-2.5">
                        <Layers className="w-4 h-4 text-[var(--accent)] shrink-0" />
                        <span>{type.description}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--text-dim)]">
                        {associatedItemsCount} catalog item{associatedItemsCount !== 1 ? 's' : ''}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditType(type)}
                            className="p-1 text-[var(--text-faint)] hover:text-[var(--text)] rounded"
                            title="Edit Type"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (associatedItemsCount > 0) {
                                alert(`Cannot delete this type because ${associatedItemsCount} items are linked to it.`);
                                return;
                              }
                              if (window.confirm(`Delete item type "${type.description}"?`)) {
                                deleteItemType(type.id);
                              }
                            }}
                            className="p-1 text-[var(--text-faint)] hover:text-red-400 rounded"
                            title="Delete Type"
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
        referenceNumber={imageModal.referenceNumber}
      />

      {/* CREATE / EDIT ITEM MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="font-display font-medium text-lg text-[var(--text)]">
                  {editingItem ? 'Edit Item Specification' : 'Add Catalog Item'}
                </h3>
                <p className="text-xs text-[var(--text-faint)]">Auto-increment identity in Supabase</p>
              </div>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-[var(--text-faint)] hover:text-[var(--text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={itemFormData.item_name}
                  onChange={(e) => setItemFormData({ ...itemFormData, item_name: e.target.value })}
                  placeholder="e.g. LED Backlit Acrylic Architectural Signage Lettering"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Item Type Category *</label>
                  <select
                    required
                    value={itemFormData.item_type_id}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, item_type_id: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    {itemTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Status</label>
                  <select
                    value={itemFormData.status}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, status: e.target.value as StatusActiveInactive })
                    }
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                  Associated Project (Scope)
                </label>
                <select
                  value={itemFormData.project_id || ''}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      project_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">General Catalog / All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name} (Client: {p.client_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Description & Material Specs</label>
                <textarea
                  rows={2}
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  placeholder="Material grade, wattage, finish, mounting bracket requirements..."
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Item Size / Dimensions</label>
                  <input
                    type="text"
                    value={itemFormData.item_size}
                    onChange={(e) => setItemFormData({ ...itemFormData, item_size: e.target.value })}
                    placeholder="e.g. 12 ft x 3.5 ft x 4 inch"
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Standard Default Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemFormData.default_rate}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, default_rate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reference Picture Upload */}
                <div className="p-3 rounded bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono text-[var(--text)] font-semibold flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Reference Picture</span>
                    </label>
                    {itemFormData.reference_picture && (
                      <button
                        type="button"
                        onClick={() => setItemFormData((prev) => ({ ...prev, reference_picture: '' }))}
                        className="text-[11px] text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                        title="Remove reference picture"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {itemFormData.reference_picture ? (
                    <div className="flex items-center gap-3">
                      <div className="relative group shrink-0">
                        <img
                          src={itemFormData.reference_picture}
                          alt="Reference preview"
                          className="w-16 h-16 object-cover rounded border border-[var(--border)] bg-[var(--bg)]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setImageModal({
                              isOpen: true,
                              title: `Reference: ${itemFormData.item_name || 'Item'}`,
                              subtitle: 'Item Reference Photo Preview',
                              imageUrl: itemFormData.reference_picture,
                            })
                          }
                          className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded text-[10px] font-mono transition-opacity cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-medium truncate">
                          ✓ Photo Loaded
                        </p>
                        <label className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded bg-[var(--surface-2)] hover:bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-colors">
                          <Upload className="w-3 h-3 text-[var(--accent)]" />
                          <span>Change Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload('reference_picture', e)}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 border border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded bg-[var(--bg)] hover:bg-[var(--surface-2)] cursor-pointer text-center transition-colors group">
                      <Upload className="w-5 h-5 text-[var(--accent)] group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-xs font-semibold text-[var(--text)]">Upload Reference Photo</span>
                      <span className="text-[10px] text-[var(--text-faint)] mt-0.5">Click to choose image file</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload('reference_picture', e)}
                      />
                    </label>
                  )}
                </div>

                {/* Work Location Picture Upload */}
                <div className="p-3 rounded bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono text-[var(--text)] font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Work Location Picture</span>
                    </label>
                    {itemFormData.work_location_picture && (
                      <button
                        type="button"
                        onClick={() => setItemFormData((prev) => ({ ...prev, work_location_picture: '' }))}
                        className="text-[11px] text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                        title="Remove location picture"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {itemFormData.work_location_picture ? (
                    <div className="flex items-center gap-3">
                      <div className="relative group shrink-0">
                        <img
                          src={itemFormData.work_location_picture}
                          alt="Location preview"
                          className="w-16 h-16 object-cover rounded border border-[var(--border)] bg-[var(--bg)]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setImageModal({
                              isOpen: true,
                              title: `Location: ${itemFormData.item_name || 'Item'}`,
                              subtitle: 'Item Site Installation Photo Preview',
                              imageUrl: itemFormData.work_location_picture,
                            })
                          }
                          className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded text-[10px] font-mono transition-opacity cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-medium truncate">
                          ✓ Photo Loaded
                        </p>
                        <label className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded bg-[var(--surface-2)] hover:bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-colors">
                          <Upload className="w-3 h-3 text-[var(--accent)]" />
                          <span>Change Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload('work_location_picture', e)}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 border border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded bg-[var(--bg)] hover:bg-[var(--surface-2)] cursor-pointer text-center transition-colors group">
                      <Upload className="w-5 h-5 text-[var(--accent)] group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-xs font-semibold text-[var(--text)]">Upload Work Location Photo</span>
                      <span className="text-[10px] text-[var(--text-faint)] mt-0.5">Façade, wall or site photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload('work_location_picture', e)}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Remarks & Technical Notes</label>
                <input
                  type="text"
                  value={itemFormData.remark}
                  onChange={(e) => setItemFormData({ ...itemFormData, remark: e.target.value })}
                  placeholder="Warranty period, maintenance notes, certifications..."
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18]"
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ITEM TYPE MODAL */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)]">
              <div>
                <h3 className="font-display font-medium text-lg text-[var(--text)]">
                  {editingType ? 'Edit Item Type' : 'Add Item Type'}
                </h3>
                <p className="text-xs text-[var(--text-faint)]">Auto-increment identity in Supabase</p>
              </div>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="text-[var(--text-faint)] hover:text-[var(--text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Description / Category Name *</label>
                <input
                  type="text"
                  required
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                  placeholder="e.g. Architectural Acrylic Letters"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18]"
                >
                  {editingType ? 'Save Changes' : 'Create Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
