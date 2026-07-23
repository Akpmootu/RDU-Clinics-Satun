import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { LandingPage } from './components/LandingPage';
import { ProvincialKpiHeader } from './components/ProvincialKpiHeader';
import { DistrictCardsGrid } from './components/DistrictCardsGrid';
import { DataTableView } from './components/DataTableView';
import { ChartsView } from './components/ChartsView';
import { AuditLogView } from './components/AuditLogView';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ClinicDetailModal } from './components/ClinicDetailModal';
import { GasScriptModal } from './components/GasScriptModal';
import { SettingsModal } from './components/SettingsModal';
import { Footer } from './components/Footer';

import { Clinic, DistrictName, AuditLog, AssessmentStatus, SettingsConfig } from './types';
import { INITIAL_CLINICS, INITIAL_AUDIT_LOGS } from './data/initialData';
import {
  loadSettings,
  saveSettings,
  loadLocalClinics,
  saveLocalClinics,
  loadLocalLogs,
  saveLocalLogs,
  calculateSummaries,
  fetchFromGas,
  updateClinicStatusApi,
} from './services/api';

export default function App() {
  // --- Persistent & Local States ---
  const [settings, setSettings] = useState<SettingsConfig>(loadSettings());
  const [clinics, setClinics] = useState<Clinic[]>(loadLocalClinics());
  const [logs, setLogs] = useState<AuditLog[]>(loadLocalLogs());

  // --- Role & Authentication State ---
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');

  // --- UI Layout States ---
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictName | 'ทั้งหมด'>('ทั้งหมด');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tvMode, setTvMode] = useState<boolean>(false);

  // --- Modal States ---
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [clinicToView, setClinicToView] = useState<Clinic | null>(null);
  const [clinicToEdit, setClinicToEdit] = useState<Clinic | null>(null);
  const [isGasCodeModalOpen, setIsGasCodeModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- Sync with Live Google Apps Script API if active ---
  const refreshDataFromGas = useCallback(async () => {
    if (!settings.isLiveApiActive || !settings.gasWebAppUrl) return;

    setIsLoading(true);
    try {
      const data = await fetchFromGas(settings.gasWebAppUrl);
      if (data && data.clinics) {
        setClinics(data.clinics);
        saveLocalClinics(data.clinics);
      }
      if (data && data.auditLogs) {
        setLogs(data.auditLogs);
        saveLocalLogs(data.auditLogs);
      }
    } catch (err) {
      console.warn('Google Apps Script fetch error, using local cached data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [settings.isLiveApiActive, settings.gasWebAppUrl]);

  useEffect(() => {
    refreshDataFromGas();
  }, [refreshDataFromGas]);

  // --- Computed Provincial Summaries ---
  const summary = useMemo(() => {
    return calculateSummaries(clinics);
  }, [clinics]);

  // --- Handlers ---
  const handleOpenClinicDetail = (clinic: Clinic) => {
    setClinicToView(clinic);
    setIsDetailModalOpen(true);
  };

  const handleOpenEditModal = (clinic: Clinic) => {
    if (userRole !== 'admin') {
      // If user is not admin, show detail modal with admin login option
      setClinicToView(clinic);
      setIsDetailModalOpen(true);
      return;
    }
    setClinicToEdit(clinic);
    setIsUpdateModalOpen(true);
  };

  const handleOpenNewUpdateModal = () => {
    if (userRole !== 'admin') {
      setIsAdminLoginModalOpen(true);
      return;
    }
    setClinicToEdit(clinics[0] || null);
    setIsUpdateModalOpen(true);
  };

  const handleAdminLoginSuccess = () => {
    setUserRole('admin');
    setIsAdminLoginModalOpen(false);
  };

  const handleLogoutAdmin = () => {
    setUserRole('user');
  };

  const handleSaveClinicStatus = async (
    clinic: Clinic,
    newStatus: AssessmentStatus,
    newLevel: number | null,
    editedBy: string,
    remarks: string
  ) => {
    const { updatedClinic, newLog } = await updateClinicStatusApi(
      clinic,
      newStatus,
      newLevel,
      editedBy,
      remarks,
      settings
    );

    // Update state locally
    setClinics((prev) =>
      prev.map((c) => (c.id === updatedClinic.id ? updatedClinic : c))
    );
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleSaveSettings = (newSettings: SettingsConfig) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleResetLocalData = () => {
    setClinics(INITIAL_CLINICS);
    saveLocalClinics(INITIAL_CLINICS);
    setLogs(INITIAL_AUDIT_LOGS);
    saveLocalLogs(INITIAL_AUDIT_LOGS);
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 font-['Kanit',sans-serif] flex flex-col ${
      tvMode ? 'bg-slate-900 text-slate-100' : 'bg-gradient-animated'
    }`}>
      
      {/* Pinned Sticky Header */}
      <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        tvMode={tvMode}
        setTvMode={setTvMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        settings={settings}
        userRole={userRole}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenGasCode={() => setIsGasCodeModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6 relative">
        
        {/* Gemini-Style Sidebar Drawer */}
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedDistrict={selectedDistrict}
          setSelectedDistrict={setSelectedDistrict}
          totalClinicsCount={summary.totalTargetClinics}
          passedCount={summary.passedClinics}
          userRole={userRole}
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
          onLogoutAdmin={handleLogoutAdmin}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenGasCode={() => setIsGasCodeModalOpen(true)}
        />

        {/* Primary Page Content Area */}
        <main className="flex-1 space-y-6 pb-20 md:pb-8 w-full overflow-hidden">
          
          {/* Syncing Indicator Banner */}
          {isLoading && (
            <div className="p-3 bg-emerald-600 text-white text-xs font-semibold rounded-2xl flex items-center justify-between shadow-md animate-pulse">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-sync animate-spin text-sm"></i>
                <span>กำลังดึงข้อมูลเรียลไทม์จาก Google Sheets (Google Apps Script)...</span>
              </div>
            </div>
          )}

          {/* Tab 0: Official Landing Page */}
          {activeTab === 'landing' && (
            <LandingPage
              summary={summary}
              userRole={userRole}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
            />
          )}

          {/* Tab 1: Overview Dashboard (Executive Header + District Cards + DataTables preview) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              <ProvincialKpiHeader
                summary={summary}
                selectedDistrict={selectedDistrict}
                setSelectedDistrict={setSelectedDistrict}
                tvMode={tvMode}
                onOpenUpdateModal={handleOpenNewUpdateModal}
              />

              <DistrictCardsGrid
                districtSummaries={summary.districtSummaries}
                clinics={clinics}
                selectedDistrict={selectedDistrict}
                onSelectClinicToEdit={handleOpenClinicDetail}
                tvMode={tvMode}
              />

              <DataTableView
                clinics={clinics}
                selectedDistrict={selectedDistrict}
                setSelectedDistrict={setSelectedDistrict}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onSelectClinicToEdit={handleOpenClinicDetail}
              />
            </div>
          )}

          {/* Tab 2: District Breakdown Cards Only */}
          {activeTab === 'cards' && (
            <div className="space-y-6 animate-fadeIn">
              <DistrictCardsGrid
                districtSummaries={summary.districtSummaries}
                clinics={clinics}
                selectedDistrict={selectedDistrict}
                onSelectClinicToEdit={handleOpenClinicDetail}
                tvMode={tvMode}
              />
            </div>
          )}

          {/* Tab 3: DataTables Master Table */}
          {activeTab === 'clinics' && (
            <div className="space-y-6 animate-fadeIn">
              <DataTableView
                clinics={clinics}
                selectedDistrict={selectedDistrict}
                setSelectedDistrict={setSelectedDistrict}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onSelectClinicToEdit={handleOpenClinicDetail}
              />
            </div>
          )}

          {/* Tab 4: Visual Analytics & Charts */}
          {activeTab === 'charts' && (
            <div className="space-y-6 animate-fadeIn">
              <ChartsView summary={summary} clinics={clinics} />
            </div>
          )}

          {/* Tab 5: Audit Trail Logs */}
          {activeTab === 'audit-logs' && (
            <div className="space-y-6 animate-fadeIn">
              <AuditLogView logs={logs} />
            </div>
          )}

        </main>
      </div>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Official Footer */}
      <Footer />

      {/* Admin Authentication Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Clinic Detail View Modal (Role-aware) */}
      <ClinicDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        clinic={clinicToView}
        userRole={userRole}
        onOpenEditModal={(clinic) => {
          setIsDetailModalOpen(false);
          setClinicToEdit(clinic);
          setIsUpdateModalOpen(true);
        }}
        onOpenAdminLogin={() => {
          setIsDetailModalOpen(false);
          setIsAdminLoginModalOpen(true);
        }}
      />

      {/* Status Update Form Modal (Admin Key-In) */}
      <StatusUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        clinic={clinicToEdit}
        allClinics={clinics}
        onSave={handleSaveClinicStatus}
        settings={settings}
      />

      {/* Google Apps Script Code Viewer Modal */}
      <GasScriptModal
        isOpen={isGasCodeModalOpen}
        onClose={() => setIsGasCodeModalOpen(false)}
      />

      {/* System Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onRefreshDataFromGas={refreshDataFromGas}
        onResetLocalData={handleResetLocalData}
      />

    </div>
  );
}
