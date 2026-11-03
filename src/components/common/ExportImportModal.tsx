import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { X, Download, Upload, Check, AlertCircle, RefreshCw, FileCode } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({ isOpen, onClose }) => {
  const {
    exportDatabaseJSON,
    importDatabaseJSON,
    resetToSampleData,
    clients,
    projects,
    expenses,
    vendors,
  } = useERP();

  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [showJsonInput, setShowJsonInput] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_code_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      } catch (err) {
        setImportStatus({ success: false, message: 'Error reading JSON file.' });
      }
    };
    reader.readAsText(file);
  };

  const handleManualImport = () => {
    if (!jsonInput.trim()) return;
    const ok = importDatabaseJSON(jsonInput);
    if (ok) {
      setImportStatus({ success: true, message: 'Database updated from JSON data!' });
      setJsonInput('');
      setShowJsonInput(false);
    } else {
      setImportStatus({ success: false, message: 'Failed to parse JSON. Please check syntax.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-[#26221E] rounded-md shadow-2xl border border-[#4A4038] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#38322C]">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F0E9DF]">
              Database Backup & JSON Sync
            </h3>
            <p className="text-xs text-[#B4A697] mt-0.5">
              Export and restore master tables, projects, and expense records
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7C7062] hover:text-[#F0E9DF] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-[#1E1B18] rounded border border-[#38322C] text-center">
            <div>
              <p className="text-[11px] text-[#7C7062] uppercase tracking-wider">Projects</p>
              <p className="text-lg font-bold font-mono text-[#F0E9DF]">{projects.length}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#7C7062] uppercase tracking-wider">Expenses</p>
              <p className="text-lg font-bold font-mono text-[#C9A66B]">{expenses.length}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#7C7062] uppercase tracking-wider">Vendors & Clients</p>
              <p className="text-lg font-bold font-mono text-[#F0E9DF]">{vendors.length + clients.length}</p>
            </div>
          </div>

          {importStatus && (
            <div
              className={`p-3 rounded text-xs flex items-center gap-2 ${
                importStatus.success
                  ? 'bg-[#1E1B18] text-[#7C9885] border border-[#566A5C]'
                  : 'bg-[#1E1B18] text-[#B5766A] border border-[#B5766A]'
              }`}
            >
              {importStatus.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* Action 1: Download JSON */}
          <div className="p-4 rounded border border-[#38322C] bg-[#1E1B18] flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold text-[#F0E9DF]">Export Complete Database</h4>
              <p className="text-[11px] text-[#7C7062] mt-0.5">
                Download a clean, structured JSON file ready for Supabase or offline backup.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#C9A66B] text-[#241E17] hover:bg-[#D9B87C] transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download JSON
            </button>
          </div>

          {/* Action 2: Upload JSON */}
          <div className="p-4 rounded border border-[#38322C] bg-[#1E1B18] flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold text-[#F0E9DF]">Restore from File</h4>
              <p className="text-[11px] text-[#7C7062] mt-0.5">
                Load a previously saved JSON backup directly into your browser state.
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[#4A4038] text-[#B4A697] hover:text-[#F0E9DF] hover:border-[#8A7145] cursor-pointer transition-colors shrink-0">
              <Upload className="w-3.5 h-3.5" />
              Upload Backup
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Action 3: Manual JSON editor */}
          <div>
            <button
              onClick={() => setShowJsonInput(!showJsonInput)}
              className="text-xs text-[#C9A66B] hover:text-[#D9B87C] flex items-center gap-1"
            >
              <FileCode className="w-3.5 h-3.5" />
              {showJsonInput ? 'Hide Raw JSON Editor' : 'Paste Raw JSON Dump'}
            </button>
            {showJsonInput && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste JSON database dump here..."
                  rows={5}
                  className="w-full text-xs font-mono p-2.5 rounded border border-[#4A4038] bg-[#1E1B18] text-[#F0E9DF] focus:border-[#8A7145] outline-none"
                />
                <button
                  onClick={handleManualImport}
                  disabled={!jsonInput.trim()}
                  className="px-3 py-1.5 bg-[#C9A66B] hover:bg-[#D9B87C] disabled:opacity-40 text-[#241E17] text-xs font-semibold rounded transition-colors"
                >
                  Apply JSON Data
                </button>
              </div>
            )}
          </div>

          {/* Action 4: Reset Database */}
          <div className="pt-3 border-t border-[#38322C] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#F0E9DF]">Reset to Sample Data</p>
              <p className="text-[11px] text-[#7C7062]">Restore factory sample records for projects, items, and clients.</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Reset all records to default sample data?')) {
                  resetToSampleData();
                  setImportStatus({ success: true, message: 'All tables reset to default sample data.' });
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#B5766A] border border-[#B5766A]/40 hover:border-[#B5766A] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
