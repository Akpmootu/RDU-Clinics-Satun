import { useState, useEffect, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { LandingPage } from './components/LandingPage';
import { LandingHeader } from './components/LandingHeader';
import { ProvincialKpiHeader } from './components/ProvincialKpiHeader';
import { DistrictCardsGrid } from './components/DistrictCardsGrid';
import { DataTableView } from './components/DataTableView';
import { ChartsView } from './components/ChartsView';
import { AuditLogView } from './components/AuditLogView';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminLoginPage } from './components/AdminLoginPage';
import { UserManagementModal } from './components/UserManagementModal';
import { ClinicDetailModal } from './components/ClinicDetailModal';
import { GasScriptModal } from './components/GasScriptModal';
import { SettingsModal } from './components/SettingsModal';
import { Footer } from './components/Footer';

import { Clinic, DistrictName, AuditLog, AssessmentStatus, SettingsConfig, AppUser } from './types';
import { INITIAL_CLINICS, INITIAL_AUDIT_LOGS } from './data/initialData';
import {
  loadSettings,
  saveSettings,
  loadLocalClinics,
  saveLocalClinics,
  loadLocalLogs,
  saveLocalLogs,
  calculateSummaries,
  fetchFromGoogleSheet,
  fetchFromGas,
  updateClinicStatusApi,
} from './services/api';
import {
  loadAppUsers,
  saveAppUsers,
  saveCurrentUser,
  fetchServerUsers,
} from './services/userService';

export default function App() {
  // --- Persistent & Local States ---
  const [settings, setSettings] = useState<SettingsConfig>(loadSettings());
  const [clinics, setClinics] = useState<Clinic[]>(loadLocalClinics());
  const [logs, setLogs] = useState<AuditLog[]>(loadLocalLogs());

  // --- Role & Authentication State ---
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [appUsers, setAppUsers] = useState<AppUser[]>(() => loadAppUsers());

  // --- UI Layout States ---
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [authPageMode, setAuthPageMode] = useState<'login' | 'register'>('login');
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictName | 'ทั้งหมด'>('ทั้งหมด');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tvMode, setTvMode] = useState<boolean>(false);

  // --- Modal States ---
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [clinicToView, setClinicToView] = useState<Clinic | null>(null);
  const [clinicToEdit, setClinicToEdit] = useState<Clinic | null>(null);
  const [isGasCodeModalOpen, setIsGasCodeModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const pendingUsersCount = useMemo(
    () => appUsers.filter((user) => user.status === 'pending').length,
    [appUsers],
  );


  // --- Sync with the configured Google Sheet if active ---
  const refreshDataFromGas = useCallback(async () => {
    if (!settings.isLiveApiActive || !settings.spreadsheetId) return;

    setIsLoading(true);
    try {
      let data;
      try {
        data = await fetchFromGoogleSheet(settings.spreadsheetId);
      } catch (sheetError) {
        if (!settings.gasWebAppUrl) throw sheetError;
        console.warn('Direct Google Sheet fetch failed, trying Google Apps Script:', sheetError);
        data = await fetchFromGas(settings.gasWebAppUrl);
      }
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
  }, [settings.isLiveApiActive, settings.spreadsheetId, settings.gasWebAppUrl]);

  useEffect(() => {
    void refreshDataFromGas();
  }, [refreshDataFromGas]);

  // Check backend session via /api/auth/me & handle OAuth callback redirect parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');

    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (res.ok) return res.json();
        if (res.status === 401) {
          setCurrentUser(null);
          setUserRole('user');
          saveCurrentUser(null);
        }
        return null;
      })
      .then(async (data) => {
        if (data && data.status === 'success' && data.user) {
          const authUser: AppUser = {
            id: data.user.id,
            name: data.user.displayName || data.user.emailOrId,
            emailOrId: data.user.emailOrId,
            provider: data.user.provider,
            role: data.user.role,
            status: data.user.status,
            createdAt: new Date().toISOString(),
          };

          setCurrentUser(authUser);
          saveCurrentUser(authUser);

          const hasAdminAccess =
            authUser.status === 'active' &&
            (authUser.role === 'admin' || authUser.role === 'super_admin');
          setUserRole(hasAdminAccess ? 'admin' : 'user');
          if (authUser.status === 'active' && authUser.role === 'super_admin') {
            try {
              setAppUsers(await fetchServerUsers());
            } catch (error) {
              console.warn('Unable to load protected user list', error);
            }
          }

          if (hasAdminAccess && authStatus === 'success') {
            setActiveTab('dashboard');
            window.history.replaceState({}, document.title, '/');
          }
        } else if (data?.status === 'unauthenticated') {
          setCurrentUser(null);
          setUserRole('user');
          saveCurrentUser(null);
        }
      })
      .catch(() => {});

    // Check URL search query for OAuth signals & admin routes
    if (window.location.pathname.startsWith('/admin') || (authStatus && authStatus !== 'success')) {
      setActiveTab('admin-login');
    }

    if (authStatus === 'success') {
      Swal.fire({
        icon: 'success',
        title: 'ยืนยันตัวตนสำเร็จ! 🔐',
        text: 'ยินดีต้อนรับสู่ระบบบริหารจัดการข้อมูล RDU คลินิกเอกชน สตูล',
        confirmButtonColor: '#00A67E',
        timer: 2500,
      });
      // Clean query string
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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

  const handleLogoutAdmin = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {
      // Clear the local display state even when the network is unavailable.
    }

    setCurrentUser(null);
    setUserRole('user');
    saveCurrentUser(null);
    Swal.fire({
      icon: 'info',
      title: 'ออกจากระบบเรียบร้อยแล้ว 👋',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleUpdateAppUsers = (newUsers: AppUser[]) => {
    setAppUsers(newUsers);
    saveAppUsers(newUsers);
  };

  const handleOpenUserManagementModal = async () => {
    try {
      const serverUsers = await fetchServerUsers();
      setAppUsers(serverUsers);
      setIsUserManagementModalOpen(true);
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'เปิดหน้าจัดการผู้ใช้ไม่สำเร็จ',
        text: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
        confirmButtonColor: '#059669',
      });
    }
  };

  const handleSaveClinicStatus = async (
    clinic: Clinic,
    newStatus: AssessmentStatus,
    newLevel: number | null,
    editedBy: string,
    remarks: string
  ) => {
    const { updatedClinic, newLog, telegramSent } = await updateClinicStatusApi(
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
    return telegramSent;
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

  const handleOpenAuthPage = (mode: 'login' | 'register' = 'login') => {
    setAuthPageMode(mode);
    setActiveTab('admin-login');
  };

  if (activeTab === 'admin-login') {
    return (
      <AdminLoginPage
        currentUser={currentUser}
        initialMode={authPageMode}
        onLogout={handleLogoutAdmin}
        onUsersUpdated={() => setAppUsers(loadAppUsers())}
        onGoBackHome={() => {
          window.history.replaceState({}, document.title, '/');
          setActiveTab('landing');
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 font-['Kanit',sans-serif] flex flex-col ${
      tvMode && activeTab !== 'landing' ? 'bg-slate-900 text-slate-100' : activeTab === 'landing' ? '' : 'bg-gradient-animated'
    }`}>
      
      {activeTab === 'landing' ? (
        <LandingHeader
          userRole={userRole}
          onNavigateToDashboard={() => setActiveTab('dashboard')}
          onOpenAdminLogin={handleOpenAuthPage}
        />
      ) : (
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          settings={settings}
          userRole={userRole}
          currentUser={currentUser}
          pendingUsersCount={pendingUsersCount}
          onOpenAdminLogin={handleOpenAuthPage}
          onLogoutAdmin={handleLogoutAdmin}
          onOpenUserManagement={handleOpenUserManagementModal}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Main Layout Container */}
      <div className={activeTab === 'landing'
        ? 'flex-1 w-full'
        : 'relative mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8'
      }>

        {/* Gemini-Style Sidebar Drawer */}
        {activeTab !== 'landing' && (
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
            currentUser={currentUser}
            settings={settings}
            pendingUsersCount={pendingUsersCount}
            tvMode={tvMode}
            setTvMode={setTvMode}
            onOpenAdminLogin={handleOpenAuthPage}
            onLogoutAdmin={handleLogoutAdmin}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onOpenGasCode={() => setIsGasCodeModalOpen(true)}
            onOpenUserManagement={handleOpenUserManagementModal}
          />
        )}

        {/* Primary Page Content Area */}
        <main className={activeTab === 'landing'
          ? 'w-full flex-1'
          : 'w-full flex-1 space-y-6 overflow-hidden pb-20 md:pb-8'
        }>
          
          {/* Syncing Indicator Banner */}
          {isLoading && activeTab !== 'landing' && (
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
              onOpenAdminLogin={() => setActiveTab('admin-login')}
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
      {activeTab !== 'landing' && (
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={userRole}
          pendingUsersCount={pendingUsersCount}
          onOpenMenu={() => setSidebarOpen(true)}
        />
      )}

      {/* Official Footer */}
      <Footer />

      {/* Admin Authentication Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
      />

      {/* User Management Modal (Super Admin) */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        users={appUsers}
        currentUser={currentUser}
        onUpdateUsers={handleUpdateAppUsers}
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
