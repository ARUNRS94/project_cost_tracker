import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  X,
  Download,
  Upload,
  Check,
  AlertCircle,
  RefreshCw,
  FileCode,
  FileSpreadsheet,
  Copy,
  CheckCheck,
  TableProperties,
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../../services/supabaseSchema';
import { exportMasterToCSV, downloadFile, parseCSV } from '../../services/api';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ModalTab;
  initialMaster?: MasterType;
}

type ModalTab = 'import' | 'export_csv' | 'backup' | 'supabase';
type MasterType = 'clients' | 'projects' | 'vendors' | 'items' | 'categories' | 'expenses';

export const ExportImportModal: React.FC<ExportImportModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab,
  initialMaster,
}) => {
  const {
    exportDatabaseJSON,
    importDatabaseJSON,
    resetToSampleData,
    downloadExpensesCSV,
    clients,
    projects,
    expenses,
    vendors,
    items,
    expenseCategories,
    users,
    quotations,
    bulkImportClients,
    bulkImportProjects,
    bulkImportVendors,
    bulkImportItems,
    bulkImportCategories,
    bulkImportExpenses,
  } = useERP();

  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab || 'import');
  const [selectedMaster, setSelectedMaster] = useState<MasterType>(initialMaster || 'clients');
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [showJsonInput, setShowJsonInput] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Sync when props change or modal reopens
  React.useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialMaster) setSelectedMaster(initialMaster);
      setImportStatus(null);
    }
  }, [isOpen, initialTab, initialMaster]);

  // CSV Import State
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  if (!isOpen) return null;

  // Templates for sample CSV download
  const sampleTemplates: Record<MasterType, { filename: string; content: string }> = {
    clients: {
      filename: 'Sample_Clients_Template.csv',
      content:
        'client_name,contact_person,phone,email,address,gstin,status\r\n' +
        '"Acme Commercial Corp","Vikram Mehta","+91 98200 11223","v.mehta@acmecorp.in","Nariman Point, Mumbai","27AABCA1234F1Z5","Active"\r\n' +
        '"Global Retail Logistics","Deepika Rao","+91 98450 44556","deepika@globalretail.com","Whitefield, Bengaluru","29AACCG9876P1ZX","Active"',
    },
    projects: {
      filename: 'Sample_Projects_Template.csv',
      content:
        'project_name,client_id,description,start_date,end_date,approved_budget,status\r\n' +
        '"Corporate Flagship Signage",1,"Storefront glow signs and monolith totems","2026-11-01","2027-01-15",750000,"Active"\r\n' +
        '"Airport Lounges Branding",2,"Digital print wall murals & acrylic directional panels","2026-11-15","2027-02-28",1200000,"Planning"',
    },
    vendors: {
      filename: 'Sample_Vendors_Template.csv',
      content:
        'vendor_name,contact_person,phone,email,address,gstin,vendor_type,status,remarks\r\n' +
        '"Shree Balaji Acrylics","Sunil Patel","+91 98210 55443","sales@balajiacrylic.com","Lamington Road, Mumbai","27AAACS1122D1ZQ","Material Supplier","Active","Prompt delivery"\r\n' +
        '"Precision Laser Works","Imran Khan","+91 97654 33221","imran@precisionlaser.in","Pimpri, Pune","27AABCU9988K1ZK","Fabricator / Workshop","Active","CNC & laser cut specialist"',
    },
    items: {
      filename: 'Sample_Items_Template.csv',
      content:
        'item_name,item_type_id,project_id,description,status,reference_picture,work_location_picture,item_size,default_rate,remark\r\n' +
        '"3D Acrylic LED Letter Glow Sign",1,1,"Cast acrylic face with aluminum profile & waterproof LEDs","Active","","","15ft x 3ft",120000,"Standard outdoor finish"\r\n' +
        '"UV Backlit Tension Fabric Box",2,2,"UV printed fabric with modular aluminum profile frame","Active","","","8ft x 4ft",45000,"Includes MeanWell power supply"',
    },
    categories: {
      filename: 'Sample_Categories_Template.csv',
      content:
        'category_name,description,status\r\n' +
        '"Structural Steel & Hardware","MS box sections, foundation plates and fasteners","Active"\r\n' +
        '"LED Modules & Drivers","Samsung IP67 modules, cabling and waterproof drivers","Active"\r\n' +
        '"Crane & Scaffolding Rental","Façade installation equipment and boom lifts","Active"',
    },
    expenses: {
      filename: 'Sample_Expenses_Template.csv',
      content:
        'project_id,project_item_id,expense_date,expense_category_id,description,vendor_id,quantity,unit,rate,amount,payment_status,payment_mode,reference_number,remarks,created_by\r\n' +
        '1,1,"2026-11-02",1,"3mm Opal White Cast Acrylic Sheets",1,6,"Sheets",4500,27000,"Paid","Bank","INV-BAL-4819","Delivered to workshop",1\r\n' +
        '1,1,"2026-11-03",3,"Scissor Lift Façade Installation Charges",2,2,"Days",6000,12000,"Unpaid","Bank","INV-LIFT-90","Installation at 24ft height",1',
    },
  };

  const handleDownloadSampleTemplate = (m: MasterType) => {
    const tmpl = sampleTemplates[m];
    downloadFile(tmpl.content, tmpl.filename, 'text/csv;charset=utf-8;');
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setImportStatus({ success: false, message: 'No valid data rows detected in the CSV file.' });
          setCsvPreviewRows([]);
          return;
        }
        setCsvPreviewRows(parsed);
        setImportStatus({
          success: true,
          message: `Parsed ${parsed.length} row(s) from "${file.name}". Click "Confirm Import" to insert.`,
        });
      } catch (err) {
        setImportStatus({ success: false, message: 'Failed to parse CSV file. Ensure valid comma-separated format.' });
      }
    };
    reader.readAsText(file);
  };

  const handleCommitCsvImport = () => {
    if (csvPreviewRows.length === 0) return;

    try {
      let count = 0;
      switch (selectedMaster) {
        case 'clients':
          count = bulkImportClients(
            csvPreviewRows.map((r) => ({
              client_name: r.client_name || r.name || 'Unnamed Client',
              contact_person: r.contact_person || r.contact || '',
              phone: r.phone || '',
              email: r.email || '',
              address: r.address || '',
              gstin: r.gstin || '',
              status: (r.status === 'Inactive' ? 'Inactive' : 'Active') as any,
            }))
          );
          break;
        case 'projects':
          count = bulkImportProjects(
            csvPreviewRows.map((r) => ({
              project_name: r.project_name || r.name || 'Unnamed Project',
              client_id: Number(r.client_id) || clients[0]?.id || 1,
              description: r.description || '',
              start_date: r.start_date || new Date().toISOString().slice(0, 10),
              end_date: r.end_date || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
              approved_budget: Number(r.approved_budget) || 0,
              status: (r.status || 'Active') as any,
            }))
          );
          break;
        case 'vendors':
          count = bulkImportVendors(
            csvPreviewRows.map((r) => ({
              vendor_name: r.vendor_name || r.name || 'Unnamed Vendor',
              contact_person: r.contact_person || '',
              phone: r.phone || '',
              email: r.email || '',
              address: r.address || '',
              gstin: r.gstin || '',
              vendor_type: r.vendor_type || 'Material Supplier',
              status: (r.status === 'Inactive' ? 'Inactive' : 'Active') as any,
              remarks: r.remarks || '',
            }))
          );
          break;
        case 'items':
          count = bulkImportItems(
            csvPreviewRows.map((r) => ({
              project_id: r.project_id ? Number(r.project_id) : null,
              item_name: r.item_name || r.name || 'Catalog Item',
              item_type_id: Number(r.item_type_id) || 1,
              description: r.description || '',
              status: (r.status === 'Inactive' ? 'Inactive' : 'Active') as any,
              reference_picture: r.reference_picture || '',
              work_location_picture: r.work_location_picture || '',
              item_size: r.item_size || 'Standard',
              default_rate: Number(r.default_rate) || 0,
              remark: r.remark || '',
            }))
          );
          break;
        case 'categories':
          count = bulkImportCategories(
            csvPreviewRows.map((r) => ({
              category_name: r.category_name || r.name || 'General Expense',
              description: r.description || '',
              status: (r.status === 'Inactive' ? 'Inactive' : 'Active') as any,
            }))
          );
          break;
        case 'expenses':
          count = bulkImportExpenses(
            csvPreviewRows.map((r) => ({
              project_id: Number(r.project_id) || projects[0]?.id || 1,
              project_item_id: r.project_item_id ? Number(r.project_item_id) : null,
              expense_date: r.expense_date || new Date().toISOString().slice(0, 10),
              expense_category_id: Number(r.expense_category_id) || 1,
              description: r.description || 'Imported expense',
              vendor_id: Number(r.vendor_id) || vendors[0]?.id || 1,
              quantity: r.quantity ? Number(r.quantity) : null,
              unit: r.unit || null,
              rate: r.rate ? Number(r.rate) : null,
              amount: Number(r.amount) || (Number(r.quantity || 1) * Number(r.rate || 0)),
              payment_status: (r.payment_status || 'Paid') as any,
              payment_mode: (r.payment_mode || 'Bank') as any,
              attachment: r.attachment || '',
              reference_number: r.reference_number || '',
              remarks: r.remarks || '',
              created_by: Number(r.created_by) || users[0]?.id || 1,
            }))
          );
          break;
      }

      setImportStatus({
        success: true,
        message: `Successfully imported ${count} records into ${selectedMaster.toUpperCase()} with auto-assigned identity IDs!`,
      });
      setCsvPreviewRows([]);
      setUploadedFileName('');
    } catch (err: any) {
      setImportStatus({ success: false, message: `Import error: ${err.message || 'Unknown error'}` });
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseJSON();
    downloadFile(
      jsonStr,
      `Project_Code_Tracker_Backup_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const ok = importDatabaseJSON(text);
        if (ok) {
          setImportStatus({ success: true, message: 'Database successfully restored from JSON file!' });
        } else {
          setImportStatus({ success: false, message: 'Invalid backup file structure.' });
        }
      } catch {
        setImportStatus({ success: false, message: 'Error reading JSON file.' });
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!jsonInput.trim()) return;
    const ok = importDatabaseJSON(jsonInput);
    if (ok) {
      setImportStatus({ success: true, message: 'Database restored from JSON text!' });
      setShowJsonInput(false);
    } else {
      setImportStatus({ success: false, message: 'Invalid JSON format or structure.' });
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const masterExports = [
    { name: 'Expenses', count: expenses.length, action: downloadExpensesCSV },
    {
      name: 'Clients',
      count: clients.length,
      action: () => downloadFile(exportMasterToCSV('Clients', clients), 'Clients_Master.csv'),
    },
    {
      name: 'Projects',
      count: projects.length,
      action: () => downloadFile(exportMasterToCSV('Projects', projects), 'Projects_Master.csv'),
    },
    {
      name: 'Vendors',
      count: vendors.length,
      action: () => downloadFile(exportMasterToCSV('Vendors', vendors), 'Vendors_Master.csv'),
    },
    {
      name: 'Items & Catalog',
      count: items.length,
      action: () => downloadFile(exportMasterToCSV('Items', items), 'Items_Master.csv'),
    },
    {
      name: 'Categories',
      count: expenseCategories.length,
      action: () => downloadFile(exportMasterToCSV('Categories', expenseCategories), 'Categories_Master.csv'),
    },
    {
      name: 'Team Members',
      count: users.length,
      action: () => downloadFile(exportMasterToCSV('Team', users), 'Team_Master.csv'),
    },
    {
      name: 'Quotations',
      count: quotations.length,
      action: () => downloadFile(exportMasterToCSV('Quotations', quotations), 'Quotations_Master.csv'),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-[var(--surface)] text-[var(--text)] rounded-lg shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-soft)]">
          <div>
            <h3 className="font-display font-medium text-lg text-[var(--text)]">
              Master Data Management & Backend
            </h3>
            <p className="text-xs text-[var(--text-dim)] mt-0.5">
              Import & export all master tables via CSV, download full backups, and inspect Supabase PostgreSQL schema.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-[var(--border-soft)] bg-[var(--surface-2)]/70 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('import');
              setImportStatus(null);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t ${
              activeTab === 'import'
                ? 'border-[var(--accent)] text-[var(--accent)] font-bold bg-[var(--surface)] shadow-xs'
                : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)] font-medium hover:bg-[var(--surface)]/50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Masters (CSV)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('export_csv');
              setImportStatus(null);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t ${
              activeTab === 'export_csv'
                ? 'border-[var(--accent)] text-[var(--accent)] font-bold bg-[var(--surface)] shadow-xs'
                : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)] font-medium hover:bg-[var(--surface)]/50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Masters (CSV)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('backup');
              setImportStatus(null);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t ${
              activeTab === 'backup'
                ? 'border-[var(--accent)] text-[var(--accent)] font-bold bg-[var(--surface)] shadow-xs'
                : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)] font-medium hover:bg-[var(--surface)]/50'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>JSON Backup & Restore</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('supabase');
              setImportStatus(null);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t ${
              activeTab === 'supabase'
                ? 'border-[var(--accent)] text-[var(--accent)] font-bold bg-[var(--surface)] shadow-xs'
                : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)] font-medium hover:bg-[var(--surface)]/50'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Supabase Schema DDL</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Notification banner */}
          {importStatus && (
            <div
              className={`p-3 rounded text-xs font-mono flex items-center gap-2 ${
                importStatus.success
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/30'
              }`}
            >
              {importStatus.success ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* TAB 1: CSV MASTER IMPORTER */}
          {activeTab === 'import' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1.5">
                  Select Target Master to Import:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'clients', label: 'Client Master' },
                      { id: 'projects', label: 'Project Master' },
                      { id: 'vendors', label: 'Vendor Master' },
                      { id: 'items', label: 'Item & Catalog Master' },
                      { id: 'categories', label: 'Expense Category Master' },
                      { id: 'expenses', label: 'Expenses' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMaster(m.id);
                        setCsvPreviewRows([]);
                        setUploadedFileName('');
                        setImportStatus(null);
                      }}
                      className={`p-2.5 text-left rounded border text-xs font-mono transition-all cursor-pointer ${
                        selectedMaster === m.id
                          ? 'bg-[var(--surface-2)] border-[var(--accent)] text-[var(--text)] font-semibold shadow-xs'
                          : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--accent)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions and Sample Template */}
              <div className="p-4 bg-[var(--bg)] rounded border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text)] font-mono uppercase">
                    Sample CSV Template: {selectedMaster.toUpperCase()}
                  </h4>
                  <p className="text-xs text-[var(--text-dim)] mt-0.5">
                    Download the pre-formatted CSV template with standard header columns for this master.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSampleTemplate(selectedMaster)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* File Upload Trigger */}
              <div className="p-5 bg-[var(--bg)] rounded border-2 border-dashed border-[var(--border)] text-center space-y-3">
                <TableProperties className="w-8 h-8 mx-auto text-[var(--accent)] opacity-80" />
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">
                    Upload your CSV file for {selectedMaster.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-[var(--text-faint)] font-mono mt-0.5">
                    Supports Microsoft Excel, Google Sheets, or database CSV exports
                  </p>
                </div>

                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all cursor-pointer shadow-xs">
                    <Upload className="w-4 h-4" />
                    <span>Choose CSV File</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploadedFileName && (
                  <p className="text-xs font-mono text-[var(--text)]">
                    Loaded File: <span className="font-semibold text-[var(--accent)]">{uploadedFileName}</span>
                  </p>
                )}
              </div>

              {/* CSV Rows Preview & Confirmation */}
              {csvPreviewRows.length > 0 && (
                <div className="p-4 bg-[var(--surface-2)]/40 rounded border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-semibold text-[var(--text)]">
                        Preview: {csvPreviewRows.length} Row(s) Ready to Import
                      </span>
                      <p className="text-[11px] text-[var(--text-faint)]">
                        Identity IDs will be auto-incremented automatically.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCommitCsvImport}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all cursor-pointer shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm & Import {csvPreviewRows.length} Records</span>
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-x-auto max-h-48 border border-[var(--border)] rounded bg-[var(--surface)]">
                    <table className="w-full text-left text-[11px] font-mono divide-y divide-[var(--border-soft)]">
                      <thead className="bg-[var(--surface-2)] text-[var(--text-faint)]">
                        <tr>
                          {Object.keys(csvPreviewRows[0] || {}).map((col) => (
                            <th key={col} className="p-2 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-soft)] text-[var(--text-dim)]">
                        {csvPreviewRows.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="p-2 whitespace-nowrap max-w-[160px] truncate">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT INDIVIDUAL MASTERS TO CSV */}
          {activeTab === 'export_csv' && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-dim)]">
                Export each master table as a separate CSV spreadsheet formatted for Microsoft Excel, Google Sheets, or bulk Supabase import.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {masterExports.map((m) => (
                  <div
                    key={m.name}
                    className="p-3 bg-[var(--bg)] border border-[var(--border)] rounded flex items-center justify-between hover:border-[var(--border-soft)] transition-colors"
                  >
                    <div>
                      <span className="font-medium text-[var(--text)] block text-xs">{m.name}</span>
                      <span className="text-[10.5px] font-mono text-[var(--text-faint)]">
                        {m.count} record{m.count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <button
                      onClick={m.action}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-mono rounded bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-[var(--accent)]" />
                      <span>Download CSV</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: JSON BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Export Full State */}
              <div className="p-4 bg-[var(--bg)] rounded border border-[var(--border)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">Export Full Application State</h4>
                    <p className="text-xs text-[var(--text-dim)] mt-1">
                      Download a single JSON package containing all masters ({clients.length} clients, {projects.length} projects, {expenses.length} expenses, {vendors.length} vendors, items, and quotations).
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadBackup}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON</span>
                  </button>
                </div>
              </div>

              {/* Import State */}
              <div className="p-4 bg-[var(--bg)] rounded border border-[var(--border)] space-y-3">
                <h4 className="text-sm font-semibold text-[var(--text)]">Import & Restore Database</h4>
                <p className="text-xs text-[var(--text-dim)]">
                  Restore state from a previously exported backup file or paste raw JSON.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono rounded bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Upload JSON File</span>
                    <input type="file" accept=".json" onChange={handleJsonFileUpload} className="hidden" />
                  </label>

                  <button
                    onClick={() => setShowJsonInput(!showJsonInput)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono rounded bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>{showJsonInput ? 'Hide JSON Input' : 'Paste Raw JSON'}</span>
                  </button>
                </div>

                {showJsonInput && (
                  <div className="pt-3 space-y-2">
                    <textarea
                      rows={6}
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder="Paste valid backup JSON here..."
                      className="w-full p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded text-[11px] font-mono text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      onClick={handlePasteImport}
                      className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] text-[#1E1B18] cursor-pointer"
                    >
                      Process & Load JSON
                    </button>
                  </div>
                )}
              </div>

              {/* Reset to Sample Data */}
              <div className="p-4 bg-[var(--bg)] rounded border border-[var(--border)] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text)]">Reset to Seed Demo Records</h4>
                  <p className="text-xs text-[var(--text-dim)] mt-0.5">
                    Replaces current local storage with fresh multi-master demonstration data.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Reset all masters to initial seed records?')) {
                      resetToSampleData();
                      setImportStatus({ success: true, message: 'All masters reset to demo records.' });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/30 hover:bg-red-500/20 transition-colors shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Data</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SUPABASE SQL MIGRATION */}
          {activeTab === 'supabase' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-dim)]">
                  Copy and run this PostgreSQL DDL script in your Supabase SQL Editor. It generates identity serial columns and Row Level Security policies.
                </p>

                <button
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--accent)] text-[#1E1B18] font-semibold transition-colors shrink-0 cursor-pointer"
                >
                  {isCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied SQL!' : 'Copy SQL Script'}</span>
                </button>
              </div>

              <pre className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded text-[11px] font-mono text-[var(--text-dim)] overflow-x-auto max-h-80 leading-relaxed scrollbar-thin">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[var(--surface-2)]/40 border-t border-[var(--border-soft)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-[var(--text)] border border-[var(--border)] rounded hover:border-[var(--accent)] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
