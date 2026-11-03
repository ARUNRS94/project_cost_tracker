import React, { useState } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Header } from './components/layout/Header';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { ExpenseMasterView } from './components/expenses/ExpenseMasterView';
import { ProjectMasterView } from './components/projects/ProjectMasterView';
import { ClientMasterView } from './components/clients/ClientMasterView';
import { VendorMasterView } from './components/vendors/VendorMasterView';
import { ItemMasterView } from './components/items/ItemMasterView';
import { ExpenseCategoryMasterView } from './components/categories/ExpenseCategoryMasterView';
import { TeamMasterView } from './components/access/TeamMasterView';
import { ExportImportModal } from './components/common/ExportImportModal';

const MainLayout: React.FC = () => {
  const { activeTab } = useERP();
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#1E1B18] text-[#F0E9DF] flex flex-col font-sans antialiased selection:bg-[#C9A66B]/30 selection:text-[#F0E9DF]">
      {/* Top Bar Header with Tabs */}
      <Header
        onOpenNewExpense={() => setIsNewExpenseModalOpen(true)}
        onOpenDataBackup={() => setIsDataBackupOpen(true)}
      />

      {/* Main Viewport matching price-calculator.html layout container */}
      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            onOpenNewExpense={() => setIsNewExpenseModalOpen(true)}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpenseMasterView
            isCreateModalOpen={isNewExpenseModalOpen}
            onCloseCreateModal={() => setIsNewExpenseModalOpen(false)}
          />
        )}
        {activeTab === 'projects' && <ProjectMasterView />}
        {activeTab === 'clients' && <ClientMasterView />}
        {activeTab === 'vendors' && <VendorMasterView />}
        {activeTab === 'items' && <ItemMasterView />}
        {activeTab === 'categories' && <ExpenseCategoryMasterView />}
        {activeTab === 'team' && <TeamMasterView />}
      </main>

      {/* Footer Note */}
      <footer className="border-t border-[#38322C] py-5 px-6 text-center text-xs text-[#7C7062] font-mono">
        Project Code Tracker · Auto-increment identity keys for Supabase schema · Offline-first state persistence
      </footer>

      {/* Global Data Backup & Sync Modal */}
      <ExportImportModal
        isOpen={isDataBackupOpen}
        onClose={() => setIsDataBackupOpen(false)}
      />

      {/* Quick Record Expense Modal when opened from another tab */}
      {isNewExpenseModalOpen && activeTab !== 'expenses' && (
        <ExpenseMasterView
          isCreateModalOpen={true}
          onCloseCreateModal={() => setIsNewExpenseModalOpen(false)}
        />
      )}
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
