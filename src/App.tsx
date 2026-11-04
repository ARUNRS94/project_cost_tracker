import React, { useState } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Header } from './components/layout/Header';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { ExpenseMasterView } from './components/expenses/ExpenseMasterView';
import { ProjectMasterView } from './components/projects/ProjectMasterView';
import { QuotationGeneratorView } from './components/quotation/QuotationGeneratorView';
import { MastersView, MasterSubTab } from './components/masters/MastersView';
import { TeamMasterView } from './components/access/TeamMasterView';
import { ExportImportModal } from './components/common/ExportImportModal';
import { ExpenseModal } from './components/expenses/ExpenseModal';
import { LoginPage } from './components/auth/LoginPage';

const MainLayout: React.FC = () => {
  const { activeTab, isAuthenticated } = useERP();
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'import' | 'export_csv' | 'backup' | 'supabase'>('import');
  const [modalMaster, setModalMaster] = useState<'clients' | 'projects' | 'vendors' | 'items' | 'categories' | 'expenses'>('clients');
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false);

  const handleOpenImport = (
    master: 'clients' | 'projects' | 'vendors' | 'items' | 'categories' | 'expenses' = 'projects'
  ) => {
    setModalTab('import');
    setModalMaster(master);
    setIsDataBackupOpen(true);
  };

  const handleOpenDataBackup = () => {
    setModalTab('backup');
    setIsDataBackupOpen(true);
  };

  // If user is logged out, show the Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans antialiased selection:bg-[var(--accent)]/30 selection:text-[var(--text)] transition-colors">
      {/* Top Bar Header with Tabs & Controls */}
      <Header
        onOpenNewExpense={() => setIsNewExpenseModalOpen(true)}
        onOpenDataBackup={handleOpenDataBackup}
        onOpenImportMasters={() => handleOpenImport('projects')}
      />

      {/* Main Viewport matching price-calculator.html layout container */}
      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            onOpenNewExpense={() => setIsNewExpenseModalOpen(true)}
          />
        )}
        {activeTab === 'projects' && <ProjectMasterView />}
        {activeTab === 'expenses' && <ExpenseMasterView />}
        {activeTab === 'quotation' && <QuotationGeneratorView />}
        {(activeTab === 'masters' ||
          ['clients', 'vendors', 'items', 'categories'].includes(activeTab)) && (
          <MastersView
            initialSubTab={
              ['clients', 'vendors', 'items', 'categories'].includes(activeTab)
                ? (activeTab as MasterSubTab)
                : 'clients'
            }
            onOpenImport={(m) => handleOpenImport(m)}
          />
        )}
        {activeTab === 'team' && <TeamMasterView />}
      </main>

      {/* Footer Note */}
      <footer className="border-t border-[var(--border-soft)] py-5 px-6 text-center text-xs text-[var(--text-faint)] font-mono">
        Project Code Tracker · Standard Rupee (₹) Operating Ledger · Supabase Identity Schema & RBAC
      </footer>

      {/* Global Data Backup & Sync Modal */}
      <ExportImportModal
        isOpen={isDataBackupOpen}
        onClose={() => setIsDataBackupOpen(false)}
        initialTab={modalTab}
        initialMaster={modalMaster}
      />

      {/* Global Record Expense Modal (Opens from Header anywhere in the app) */}
      <ExpenseModal
        isOpen={isNewExpenseModalOpen}
        onClose={() => setIsNewExpenseModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ERPProvider>
      <MainLayout />
    </ERPProvider>
  );
}
