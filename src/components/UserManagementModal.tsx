import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { AppUser, UserRole, UserStatus } from '../types';
import {
  SUPER_ADMIN_EMAIL,
  fetchServerUsers,
  maskIdentifier,
  registerOfficerServer,
  updateUserStatusServer,
} from '../services/userService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  currentUser: AppUser | null;
  onUpdateUsers: (newUsers: AppUser[]) => void;
  onResetUsers: () => void;
}

type StatusFilter = 'all' | 'pending' | 'active' | 'blocked';

const roleLabel = (role: UserRole) => {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'viewer') return 'Viewer';
  return 'Admin';
};

const statusLabel = (status: UserStatus) => {
  if (status === 'active') return 'ใช้งานอยู่';
  if (status === 'pending') return 'รออนุมัติ';
  return 'ระงับสิทธิ์';
};

const StatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => {
  const styles =
    status === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'pending'
        ? 'border-amber-300 bg-amber-100 text-amber-900'
        : 'border-rose-200 bg-rose-50 text-rose-700';
  const dot = status === 'active' ? 'bg-emerald-500' : status === 'pending' ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`}></span>
      {statusLabel(status)}
    </span>
  );
};

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
      role === 'super_admin'
        ? 'bg-amber-400 text-slate-900'
        : 'border border-emerald-200 bg-emerald-100 text-emerald-800'
    }`}
  >
    <i className={`fa-solid ${role === 'super_admin' ? 'fa-crown' : 'fa-user-shield'} text-[9px]`}></i>
    {roleLabel(role)}
  </span>
);

const ProviderBadge: React.FC<{ provider: AppUser['provider'] }> = ({ provider }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
      provider === 'google'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
    }`}
  >
    <i className={`fa-brands ${provider === 'google' ? 'fa-google' : 'fa-line'}`}></i>
    {provider === 'google' ? 'Google' : 'LINE'}
  </span>
);

const UserIdentity: React.FC<{ user: AppUser; isOwner: boolean }> = ({ user, isOwner }) => (
  <div className="flex min-w-0 items-start gap-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        user.name.charAt(0)
      )}
    </span>
    <span className="min-w-0">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="truncate text-xs font-extrabold text-slate-900">{user.name}</span>
        {isOwner && (
          <span className="rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[8px] font-black text-amber-800">
            OWNER
          </span>
        )}
        {user.status === 'pending' && (
          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[8px] font-black text-white">NEW</span>
        )}
      </span>
      <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500">
        {maskIdentifier(user.emailOrId)}
      </span>
      {user.position && (
        <span className="mt-1 block text-[10px] font-bold text-emerald-700">{user.position}</span>
      )}
      {(user.workGroup || user.affiliation) && (
        <span className="mt-0.5 block text-[9px] leading-relaxed text-slate-500">
          {[user.workGroup, user.affiliation].filter(Boolean).join(' • ')}
        </span>
      )}
    </span>
  </div>
);

interface UserActionMenuProps {
  user: AppUser;
  busy: boolean;
  onApprove: () => void;
  onToggleRole: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

const UserActionMenu: React.FC<UserActionMenuProps> = ({
  user,
  busy,
  onApprove,
  onToggleRole,
  onToggleStatus,
  onDelete,
}) => (
  <details className="group relative inline-block text-left">
    <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 [&::-webkit-details-marker]:hidden">
      {busy ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-ellipsis"></i>}
      จัดการ
      <i className="fa-solid fa-chevron-down text-[8px] text-slate-400 transition group-open:rotate-180"></i>
    </summary>
    <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-30 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
      {user.status === 'pending' && (
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
        >
          <i className="fa-solid fa-user-check w-4 text-center"></i>
          อนุมัติบัญชี
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onToggleRole}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50"
      >
        <i className="fa-solid fa-crown w-4 text-center text-amber-600"></i>
        เปลี่ยนเป็น {user.role === 'super_admin' ? 'Admin' : 'Super Admin'}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onToggleStatus}
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition disabled:opacity-50 ${
          user.status === 'active'
            ? 'text-rose-600 hover:bg-rose-50'
            : 'text-emerald-700 hover:bg-emerald-50'
        }`}
      >
        <i className={`fa-solid ${user.status === 'active' ? 'fa-user-lock' : 'fa-user-check'} w-4 text-center`}></i>
        {user.status === 'active' ? 'ระงับการใช้งาน' : 'เปิดใช้งานบัญชี'}
      </button>
      <div className="my-1 border-t border-slate-100"></div>
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
      >
        <i className="fa-solid fa-trash-can w-4 text-center"></i>
        ลบบัญชีออกจากรายการ
      </button>
    </div>
  </details>
);

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onUpdateUsers,
  onResetUsers,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [newEmailOrId, setNewEmailOrId] = useState('');
  const [newName, setNewName] = useState('');
  const [newProvider, setNewProvider] = useState<'google' | 'line'>('google');
  const [newRole, setNewRole] = useState<UserRole>('admin');
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const isSuperAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.emailOrId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const counts = useMemo(
    () => ({
      all: users.length,
      pending: users.filter((user) => user.status === 'pending').length,
      active: users.filter((user) => user.status === 'active').length,
      blocked: users.filter((user) => user.status === 'blocked' || user.status === 'suspended').length,
    }),
    [users],
  );

  useEffect(() => {
    if (!isOpen) return;

    setRefreshing(true);
    setSearchTerm('');
    setAddUserOpen(false);
    setStatusFilter(users.some((user) => user.status === 'pending') ? 'pending' : 'all');
    fetchServerUsers()
      .then((serverUsers) => {
        onUpdateUsers(serverUsers);
        setStatusFilter(serverUsers.some((user) => user.status === 'pending') ? 'pending' : 'all');
      })
      .finally(() => setRefreshing(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        [
          user.name,
          user.emailOrId,
          user.position,
          user.workGroup,
          user.affiliation,
          user.phone,
        ].some((value) => value?.toLowerCase().includes(query));
      const normalizedStatus =
        user.status === 'suspended' ? 'blocked' : user.status;
      return matchesSearch && (statusFilter === 'all' || normalizedStatus === statusFilter);
    });
  }, [searchTerm, statusFilter, users]);

  if (!isOpen) return null;

  const runUserUpdate = async (
    user: AppUser,
    status: UserStatus,
    role?: UserRole,
  ) => {
    setBusyUserId(user.id);
    try {
      const updated = await updateUserStatusServer(user.id, user.emailOrId, status, role);
      onUpdateUsers(updated);
      return true;
    } catch (error) {
      console.error('Unable to update user', error);
      await Swal.fire({
        icon: 'error',
        title: 'บันทึกข้อมูลไม่สำเร็จ',
        text: 'กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง',
        confirmButtonColor: '#059669',
      });
      return false;
    } finally {
      setBusyUserId(null);
    }
  };

  const handleApproveUser = async (user: AppUser) => {
    const success = await runUserUpdate(user, 'active');
    if (!success) return;
    await Swal.fire({
      icon: 'success',
      title: 'อนุมัติสิทธิ์สำเร็จ',
      text: `${user.name} สามารถเข้าใช้งานระบบได้แล้ว`,
      confirmButtonColor: '#059669',
      timer: 1800,
      showConfirmButton: false,
    });
  };

  const handleApproveAllPending = async () => {
    const pendingUsers = users.filter((user) => user.status === 'pending');
    if (pendingUsers.length === 0) return;

    const result = await Swal.fire({
      title: 'อนุมัติบัญชีที่รอทั้งหมด?',
      text: `ระบบจะเปิดสิทธิ์ให้เจ้าหน้าที่ ${pendingUsers.length} บัญชี`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: `อนุมัติทั้งหมด (${pendingUsers.length})`,
      cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;

    setBusyUserId('all-pending');
    try {
      let latestUsers = users;
      for (const user of pendingUsers) {
        latestUsers = await updateUserStatusServer(user.id, user.emailOrId, 'active');
      }
      onUpdateUsers(latestUsers);
      setStatusFilter('active');
      await Swal.fire({
        icon: 'success',
        title: 'อนุมัติครบทุกบัญชีแล้ว',
        text: `เปิดสิทธิ์ให้เจ้าหน้าที่ ${pendingUsers.length} บัญชีเรียบร้อย`,
        confirmButtonColor: '#059669',
      });
    } catch (error) {
      console.error('Unable to approve pending users', error);
      await Swal.fire({
        icon: 'error',
        title: 'อนุมัติไม่ครบทุกบัญชี',
        text: 'กรุณารีเฟรชรายการและตรวจสอบอีกครั้ง',
        confirmButtonColor: '#059669',
      });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleAddUser = async (event: React.FormEvent) => {
    event.preventDefault();
    const identifier = newEmailOrId.trim();
    if (!identifier) return;

    const existing = users.find(
      (user) => user.emailOrId.toLowerCase() === identifier.toLowerCase(),
    );
    if (existing) {
      await Swal.fire({
        icon: 'warning',
        title: 'บัญชีนี้มีอยู่แล้ว',
        text: `${maskIdentifier(identifier)} อยู่ในรายการผู้ใช้งาน`,
        confirmButtonColor: '#059669',
      });
      return;
    }

    const displayName = newName.trim() || identifier.split('@')[0];
    const [firstName, ...lastNameParts] = displayName.split(/\s+/);
    setBusyUserId('new-user');
    try {
      const registration = await registerOfficerServer({
        firstName,
        lastName: lastNameParts.join(' '),
        position: 'เจ้าหน้าที่',
        workGroup: 'กลุ่มงาน',
        affiliation: 'สำนักงานสาธารณสุขจังหวัดสตูล',
        phone: '-',
        emailOrId: identifier,
        provider: newProvider,
      });

      if (!registration.success || !registration.user) {
        throw new Error(registration.message || 'register_failed');
      }

      const updated = await updateUserStatusServer(
        registration.user.id,
        registration.user.emailOrId,
        'active',
        newRole,
      );
      onUpdateUsers(updated);
      setNewEmailOrId('');
      setNewName('');
      setNewProvider('google');
      setNewRole('admin');
      setAddUserOpen(false);
      setStatusFilter('active');

      await Swal.fire({
        icon: 'success',
        title: 'เพิ่มผู้ใช้งานสำเร็จ',
        text: `เปิดสิทธิ์ให้ ${displayName} เรียบร้อยแล้ว`,
        confirmButtonColor: '#059669',
      });
    } catch (error) {
      console.error('Unable to add user', error);
      await Swal.fire({
        icon: 'error',
        title: 'เพิ่มผู้ใช้งานไม่สำเร็จ',
        text: 'กรุณาตรวจสอบข้อมูลและลองอีกครั้ง',
        confirmButtonColor: '#059669',
      });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    const nextStatus: UserStatus = user.status === 'active' ? 'blocked' : 'active';
    const result = await Swal.fire({
      title: nextStatus === 'blocked' ? 'ระงับบัญชีนี้?' : 'เปิดใช้งานบัญชีนี้?',
      text: `${user.name} (${maskIdentifier(user.emailOrId)})`,
      icon: nextStatus === 'blocked' ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: nextStatus === 'blocked' ? '#e11d48' : '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: nextStatus === 'blocked' ? 'ยืนยันระงับบัญชี' : 'ยืนยันเปิดใช้งาน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;

    const success = await runUserUpdate(user, nextStatus);
    if (success) {
      await Swal.fire({
        icon: 'success',
        title: nextStatus === 'blocked' ? 'ระงับบัญชีแล้ว' : 'เปิดใช้งานบัญชีแล้ว',
        timer: 1600,
        showConfirmButton: false,
      });
    }
  };

  const handleToggleRole = async (user: AppUser) => {
    const nextRole: UserRole = user.role === 'super_admin' ? 'admin' : 'super_admin';
    const result = await Swal.fire({
      title: 'ยืนยันการเปลี่ยนระดับสิทธิ์?',
      text: `${user.name}: ${roleLabel(user.role)} → ${roleLabel(nextRole)}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      confirmButtonText: `เปลี่ยนเป็น ${roleLabel(nextRole)}`,
      cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;

    const success = await runUserUpdate(user, user.status, nextRole);
    if (success) {
      await Swal.fire({
        icon: 'success',
        title: 'เปลี่ยนระดับสิทธิ์แล้ว',
        timer: 1600,
        showConfirmButton: false,
      });
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    const result = await Swal.fire({
      title: 'ลบบัญชีออกจากรายการ?',
      text: `${user.name} (${maskIdentifier(user.emailOrId)}) จะถูกนำออกจากรายการในอุปกรณ์นี้`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ยืนยันลบบัญชี',
      cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;

    onUpdateUsers(users.filter((candidate) => candidate.id !== user.id));
    await Swal.fire({
      icon: 'success',
      title: 'ลบบัญชีออกจากรายการแล้ว',
      timer: 1600,
      showConfirmButton: false,
    });
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      title: 'คืนค่ารายชื่อเริ่มต้น?',
      text: 'รายชื่อผู้ใช้ที่แก้ไขไว้จะถูกแทนที่ด้วยค่าเริ่มต้นของระบบ',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ยืนยันคืนค่า',
      cancelButtonText: 'ยกเลิก',
    });
    if (result.isConfirmed) onResetUsers();
  };

  const kpis: Array<{
    id: StatusFilter;
    label: string;
    value: number;
    icon: string;
    cardStyle: string;
    iconStyle: string;
  }> = [
    {
      id: 'all',
      label: 'ผู้ใช้ทั้งหมด',
      value: counts.all,
      icon: 'fa-solid fa-users',
      cardStyle: 'border-slate-200 bg-white',
      iconStyle: 'bg-slate-100 text-slate-600',
    },
    {
      id: 'pending',
      label: 'รออนุมัติ',
      value: counts.pending,
      icon: 'fa-solid fa-user-clock',
      cardStyle: 'border-amber-200 bg-amber-50',
      iconStyle: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'active',
      label: 'ใช้งานอยู่',
      value: counts.active,
      icon: 'fa-solid fa-user-check',
      cardStyle: 'border-emerald-200 bg-emerald-50',
      iconStyle: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'blocked',
      label: 'ระงับสิทธิ์',
      value: counts.blocked,
      icon: 'fa-solid fa-user-lock',
      cardStyle: 'border-rose-200 bg-rose-50',
      iconStyle: 'bg-rose-100 text-rose-700',
    },
  ];

  const renderActions = (user: AppUser) => {
    const isOwner = user.emailOrId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    if (!isSuperAdmin) return null;
    if (isOwner) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-2 text-[9px] font-semibold text-slate-400">
          <i className="fa-solid fa-lock"></i>
          บัญชีเจ้าของระบบ
        </span>
      );
    }
    return (
      <UserActionMenu
        user={user}
        busy={busyUserId === user.id}
        onApprove={() => handleApproveUser(user)}
        onToggleRole={() => handleToggleRole(user)}
        onToggleStatus={() => handleToggleStatus(user)}
        onDelete={() => handleDeleteUser(user)}
      />
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-management-title"
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50 shadow-2xl sm:h-auto sm:max-h-[94vh] sm:max-w-6xl sm:rounded-3xl sm:border sm:border-slate-200">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-4 text-white sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-900 shadow-md">
              <i className="fa-solid fa-users-gear"></i>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="user-management-title" className="truncate text-sm font-extrabold sm:text-lg">
                  จัดการผู้ใช้งาน
                </h2>
                <span className="hidden rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-900 sm:inline">
                  SUPER ADMIN
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10px] text-slate-400 sm:text-xs">
                อนุมัติบัญชี กำหนดสิทธิ์ และควบคุมการเข้าใช้งาน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="ปิดหน้าจัดการผู้ใช้งาน"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </header>

        <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {!isSuperAdmin && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <i className="fa-solid fa-lock mt-0.5 text-amber-600"></i>
              <span>
                หน้านี้เป็นโหมดอ่านอย่างเดียว เฉพาะ Super Admin เท่านั้นที่สามารถแก้ไขสิทธิ์ได้
              </span>
            </div>
          )}

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3" aria-label="สรุปผู้ใช้งาน">
            {kpis.map((kpi) => (
              <button
                key={kpi.id}
                type="button"
                onClick={() => setStatusFilter(kpi.id)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${kpi.cardStyle} ${
                  statusFilter === kpi.id ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                }`}
                aria-pressed={statusFilter === kpi.id}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${kpi.iconStyle}`}>
                  <i className={`${kpi.icon} text-sm`}></i>
                </span>
                <span>
                  <span className="block text-xl font-black leading-none text-slate-900">{kpi.value}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-slate-500 sm:text-xs">{kpi.label}</span>
                </span>
              </button>
            ))}
          </section>

          {isSuperAdmin && counts.pending > 0 && (
            <section className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <i className="fa-solid fa-user-clock"></i>
                </span>
                <div>
                  <p className="text-sm font-extrabold">มี {counts.pending} บัญชีรอการตรวจสอบ</p>
                  <p className="mt-0.5 text-[10px] text-amber-100 sm:text-xs">
                    ตรวจสอบชื่อ ตำแหน่ง และสังกัดก่อนอนุมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busyUserId === 'all-pending'}
                onClick={handleApproveAllPending}
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-amber-950 shadow-sm transition hover:bg-amber-50 disabled:opacity-60"
              >
                <i className={`fa-solid ${busyUserId === 'all-pending' ? 'fa-spinner animate-spin' : 'fa-check-double'} text-emerald-600`}></i>
                อนุมัติทั้งหมด ({counts.pending})
              </button>
            </section>
          )}

          {isSuperAdmin && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setAddUserOpen((open) => !open)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50"
                aria-expanded={addUserOpen}
              >
                <span className="flex items-center gap-2 text-xs font-bold text-slate-800 sm:text-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <i className="fa-solid fa-user-plus text-xs"></i>
                  </span>
                  เพิ่มผู้ใช้งานใหม่
                </span>
                <span className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                  {addUserOpen ? 'ซ่อนแบบฟอร์ม' : 'กรอกข้อมูลเมื่อจำเป็น'}
                  <i className={`fa-solid fa-chevron-down transition ${addUserOpen ? 'rotate-180' : ''}`}></i>
                </span>
              </button>

              {addUserOpen && (
                <form
                  onSubmit={handleAddUser}
                  className="grid grid-cols-1 gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
                >
                  <label className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-600">Gmail หรือ LINE ID *</span>
                    <input
                      type="text"
                      required
                      value={newEmailOrId}
                      onChange={(event) => setNewEmailOrId(event.target.value)}
                      placeholder="user@gmail.com"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-600">ชื่อที่แสดง</span>
                    <input
                      type="text"
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      placeholder="ภก. สมชาย ใจดี"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-600">ช่องทางเข้าสู่ระบบ</span>
                    <select
                      value={newProvider}
                      onChange={(event) => setNewProvider(event.target.value as 'google' | 'line')}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="google">Google Account</option>
                      <option value="line">LINE Account</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-600">ระดับสิทธิ์</span>
                    <select
                      value={newRole}
                      onChange={(event) => setNewRole(event.target.value as UserRole)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={busyUserId === 'new-user'}
                    className="mt-auto flex h-[38px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60 sm:col-span-2 lg:col-span-1"
                  >
                    <i className={`fa-solid ${busyUserId === 'new-user' ? 'fa-spinner animate-spin' : 'fa-plus'}`}></i>
                    เพิ่มบัญชี
                  </button>
                </form>
              )}
            </section>
          )}

          <section className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                {kpis.map((kpi) => (
                  <button
                    key={kpi.id}
                    type="button"
                    onClick={() => setStatusFilter(kpi.id)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition sm:text-xs ${
                      statusFilter === kpi.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {kpi.label} ({kpi.value})
                  </button>
                ))}
              </div>
              <div className="relative sm:w-72">
                <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ค้นหาชื่อ อีเมล ตำแหน่ง..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 text-slate-400"
                    aria-label="ล้างคำค้นหา"
                  >
                    <i className="fa-solid fa-circle-xmark text-xs"></i>
                  </button>
                )}
              </div>
            </div>
          </section>

          {refreshing ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="text-center">
                <i className="fa-solid fa-spinner animate-spin text-xl text-emerald-600"></i>
                <p className="mt-2 text-xs font-semibold text-slate-500">กำลังโหลดรายชื่อผู้ใช้งาน...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <i className="fa-solid fa-user-slash"></i>
              </span>
              <p className="mt-3 text-sm font-bold text-slate-700">ไม่พบผู้ใช้งาน</p>
              <p className="mt-1 text-xs text-slate-400">ลองเปลี่ยนตัวกรองหรือล้างคำค้นหา</p>
            </div>
          ) : (
            <>
              <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-xs lg:block">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                      <th className="rounded-tl-2xl px-4 py-3">ผู้ใช้งาน</th>
                      <th className="px-3 py-3">ช่องทาง</th>
                      <th className="px-3 py-3">ระดับสิทธิ์</th>
                      <th className="px-3 py-3">สถานะ</th>
                      {isSuperAdmin && <th className="rounded-tr-2xl px-4 py-3 text-right">คำสั่ง</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => {
                      const isOwner = user.emailOrId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                      return (
                        <tr key={user.id} className={user.status === 'pending' ? 'bg-amber-50/50' : 'hover:bg-slate-50/70'}>
                          <td className="px-4 py-3">
                            <UserIdentity user={user} isOwner={isOwner} />
                          </td>
                          <td className="px-3 py-3"><ProviderBadge provider={user.provider} /></td>
                          <td className="px-3 py-3"><RoleBadge role={user.role} /></td>
                          <td className="px-3 py-3"><StatusBadge status={user.status} /></td>
                          {isSuperAdmin && <td className="px-4 py-3 text-right">{renderActions(user)}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                {filteredUsers.map((user) => {
                  const isOwner = user.emailOrId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                  return (
                    <article
                      key={user.id}
                      className={`rounded-2xl border bg-white p-4 shadow-xs ${
                        user.status === 'pending' ? 'border-amber-300' : 'border-slate-200'
                      }`}
                    >
                      <UserIdentity user={user} isOwner={isOwner} />
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                        <ProviderBadge provider={user.provider} />
                        <RoleBadge role={user.role} />
                        <StatusBadge status={user.status} />
                      </div>
                      {isSuperAdmin && (
                        <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-3">
                          {renderActions(user)}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </main>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <span className="hidden items-center gap-1.5 text-[10px] text-slate-500 sm:flex">
            <i className="fa-solid fa-shield-halved text-emerald-600"></i>
            กำลังจัดการโดย <b className="text-slate-800">{currentUser?.name || maskIdentifier(SUPER_ADMIN_EMAIL)}</b>
          </span>
          <div className="ml-auto flex items-center gap-2">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl px-3 py-2 text-[10px] font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 sm:text-xs"
              >
                <i className="fa-solid fa-rotate-left mr-1"></i>
                คืนค่าเริ่มต้น
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              เสร็จสิ้น
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
