import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { AppUser, UserRole } from '../types';
import { SUPER_ADMIN_EMAIL, maskIdentifier } from '../services/userService';
import { sendOfficerApprovalTelegramNotification, loadSettings } from '../services/api';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  currentUser: AppUser | null;
  onUpdateUsers: (newUsers: AppUser[]) => void;
  onResetUsers: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onUpdateUsers,
  onResetUsers,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'blocked'>('all');
  const [newEmailOrId, setNewEmailOrId] = useState('');
  const [newName, setNewName] = useState('');
  const [newProvider, setNewProvider] = useState<'google' | 'line'>('google');
  const [newRole, setNewRole] = useState<UserRole>('admin');

  if (!isOpen) return null;

  const isSuperAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.emailOrId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const pendingUsersCount = pendingUsers.length;
  const activeUsersCount = users.filter((u) => u.status === 'active').length;
  const blockedUsersCount = users.filter((u) => u.status === 'blocked').length;

  const handleApproveUser = (user: AppUser) => {
    const updated = users.map((item) =>
      item.id === user.id ? { ...item, status: 'active' as const } : item
    );
    onUpdateUsers(updated);
    sendOfficerApprovalTelegramNotification(user, currentUser?.name || 'Super Admin', loadSettings()).catch(() => {});
    
    Swal.fire({
      icon: 'success',
      title: 'ยืนยันรับ / อนุมัติสิทธิ์สำเร็จ! 🎉',
      text: `ยืนยันรับและเปิดสิทธิ์ใช้งานระบบให้แก่ ${user.name} เรียบร้อยแล้ว`,
      confirmButtonColor: '#059669',
    });
  };

  const handleApproveAllPending = () => {
    if (pendingUsersCount === 0) return;

    Swal.fire({
      title: `ยืนยันรับเจ้าหน้าที่ทั้งหมด?`,
      text: `คุณต้องการอนุมัติสิทธิ์ให้แก่เจ้าหน้าที่ที่ขอลงทะเบียนทั้ง ${pendingUsersCount} ท่าน ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: `ใช่, ยืนยันรับทั้งหมด (${pendingUsersCount})`,
      cancelButtonText: 'ยกเลิก',
    }).then((res) => {
      if (res.isConfirmed) {
        const updated = users.map((item) =>
          item.status === 'pending' ? { ...item, status: 'active' as const } : item
        );
        onUpdateUsers(updated);

        // Notify Telegram for all approved users
        pendingUsers.forEach((u) => {
          sendOfficerApprovalTelegramNotification(u, currentUser?.name || 'Super Admin', loadSettings()).catch(() => {});
        });

        Swal.fire({
          icon: 'success',
          title: 'ยืนยันรับเจ้าหน้าที่ทั้งหมดเรียบร้อยแล้ว! 🎉',
          text: `อนุมัติสิทธิ์ใช้งานเรียบร้อยจำนวน ${pendingUsersCount} ท่าน`,
          confirmButtonColor: '#059669',
        });
      }
    });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmailOrId.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอก Email หรือ LINE ID! ⚠️',
        confirmButtonColor: '#059669',
      });
      return;
    }

    const cleanId = newEmailOrId.trim().toLowerCase();
    const existing = users.find((u) => u.emailOrId.toLowerCase() === cleanId);

    if (existing) {
      Swal.fire({
        icon: 'warning',
        title: 'บัญชีนี้มีอยู่ในระบบแล้ว! ⚠️',
        text: `บัญชี ${newEmailOrId} มีสิทธิ์ใช้งานในระบบเรียบร้อยแล้ว`,
        confirmButtonColor: '#059669',
      });
      return;
    }

    const newUser: AppUser = {
      id: `usr_${Date.now()}`,
      emailOrId: newEmailOrId.trim(),
      name: newName.trim() || newEmailOrId.trim().split('@')[0],
      provider: newProvider,
      role: newRole,
      status: 'active',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      avatarUrl:
        newProvider === 'google'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    };

    const updated = [newUser, ...users];
    onUpdateUsers(updated);

    setNewEmailOrId('');
    setNewName('');

    Swal.fire({
      icon: 'success',
      title: 'เพิ่มผู้ใช้งานสำเร็จ! 🎉',
      text: `มอบสิทธิ์การใช้งานให้กับ ${newUser.name} (${newUser.emailOrId}) เรียบร้อยแล้ว`,
      confirmButtonColor: '#059669',
    });
  };

  const handleToggleStatus = (user: AppUser) => {
    if (user.emailOrId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      Swal.fire({
        icon: 'error',
        title: 'ไม่อนุญาตให้ระงับ Super Admin หลัก! ⛔',
        text: `บัญชี ${SUPER_ADMIN_EMAIL} เป็นเจ้าของระบบหลัก ไม่สามารถปิดใช้งานได้`,
        confirmButtonColor: '#e11d48',
      });
      return;
    }

    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    const updated = users.map((u) => (u.id === user.id ? { ...u, status: newStatus as 'active' | 'blocked' } : u));
    onUpdateUsers(updated);

    Swal.fire({
      icon: 'info',
      title: `อัปเดตสถานะสำเร็จ`,
      text: `${user.name} เปลี่ยนสถานะเป็น: ${newStatus === 'active' ? 'เปิดใช้งาน (Active)' : 'ระงับสิทธิ์ (Blocked)'}`,
      confirmButtonColor: '#059669',
    });
  };

  const handleToggleRole = (user: AppUser) => {
    if (user.emailOrId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      Swal.fire({
        icon: 'error',
        title: 'ไม่อนุญาตให้เปลี่ยนสิทธิ์ Super Admin หลัก! ⛔',
        confirmButtonColor: '#e11d48',
      });
      return;
    }

    const nextRole: UserRole = user.role === 'super_admin' ? 'admin' : 'super_admin';
    const updated = users.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u));
    onUpdateUsers(updated);

    Swal.fire({
      icon: 'success',
      title: 'เปลี่ยนระดับสิทธิ์สำเร็จ! 👑',
      text: `${user.name} ปรับระดับสิทธิ์เป็น ${nextRole === 'super_admin' ? 'Super Admin' : 'Admin'}`,
      confirmButtonColor: '#059669',
    });
  };

  const handleDeleteUser = (user: AppUser) => {
    if (user.emailOrId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      Swal.fire({
        icon: 'error',
        title: 'ไม่สามารถลบ Super Admin หลักได้! ⛔',
        confirmButtonColor: '#e11d48',
      });
      return;
    }

    Swal.fire({
      title: `ยืนยันลบผู้ใช้งาน?`,
      text: `คุณต้องการลบสิทธิ์แอดมินของ "${user.name}" (${user.emailOrId}) ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, ลบผู้ใช้งาน',
      cancelButtonText: 'ยกเลิก',
    }).then((res) => {
      if (res.isConfirmed) {
        const updated = users.filter((u) => u.id !== user.id);
        onUpdateUsers(updated);
        Swal.fire({
          icon: 'success',
          title: 'ลบผู้ใช้งานเรียบร้อยแล้ว!',
          confirmButtonColor: '#059669',
        });
      }
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.emailOrId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.position && u.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.affiliation && u.affiliation.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'pending') return matchesSearch && u.status === 'pending';
    if (statusFilter === 'active') return matchesSearch && u.status === 'active';
    if (statusFilter === 'blocked') return matchesSearch && u.status === 'blocked';
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-900 flex items-center justify-center text-xl font-bold shadow-md">
              <i className="fa-solid fa-users-gear"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  ระบบจัดการสิทธิ์ผู้ใช้งาน (User Management)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-900">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                จัดการบัญชีแอดมินที่มีสิทธิ์เข้าถึงระบบประเมิน RDU คลินิกเอกชน สตูล
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
            aria-label="ปิด"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Notice for non-super admin view */}
          {!isSuperAdmin && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
              <i className="fa-solid fa-lock text-amber-600 text-base"></i>
              <span>เฉพาะ <b>Super Admin ({maskIdentifier(SUPER_ADMIN_EMAIL)})</b> เท่านั้นที่สามารถแก้ไขสิทธิ์ผู้ใช้งานได้</span>
            </div>
          )}

          {/* Pending Officer Registration Highlight Banner */}
          {isSuperAdmin && pendingUsersCount > 0 && (
            <div className="p-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md border border-amber-400">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                  <i className="fa-solid fa-user-clock text-white animate-pulse"></i>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                    <span>มีเจ้าหน้าที่ขอลงทะเบียนเข้าใช้งาน {pendingUsersCount} ท่าน รอการยืนยัน</span>
                  </h4>
                  <p className="text-xs text-amber-100 mt-0.5">
                    กรุณาตรวจสอบข้อมูลประจำตัว ตำแหน่ง สังกัด และกดปุ่ม "ยืนยันรับ / อนุมัติสิทธิ์"
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleApproveAllPending}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white text-amber-950 hover:bg-amber-50 text-xs font-black transition shrink-0 shadow-sm flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-check-double text-emerald-600"></i>
                <span>ยืนยันรับทั้งหมด ({pendingUsersCount})</span>
              </button>
            </div>
          )}

          {/* Add User Card (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-user-plus text-emerald-600"></i>
                  <span>เพิ่มผู้ใช้งาน / มอบสิทธิ์แอดมินใหม่:</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  รวมผู้ใช้งาน {users.length} บัญชี
                </span>
              </div>

              <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Email or LINE ID */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Gmail หรือ LINE ID*:</label>
                  <input
                    type="text"
                    required
                    value={newEmailOrId}
                    onChange={(e) => setNewEmailOrId(e.target.value)}
                    placeholder="เช่น user@gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Display Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">ชื่อผู้ใช้งาน/ตำแหน่ง:</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="เช่น ภก. สมชาย ใจดี"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Provider */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">ระบบเข้าสู่ระบบ:</label>
                  <select
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value as 'google' | 'line')}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="google">Google Account (Gmail)</option>
                    <option value="line">LINE Account</option>
                  </select>
                </div>

                {/* Role & Submit */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">ระดับสิทธิ์:</label>
                  <div className="flex gap-2">
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="admin">Admin (แอดมิน)</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs shrink-0 flex items-center gap-1"
                    >
                      <i className="fa-solid fa-plus"></i>
                      <span>เพิ่ม</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Filter Tabs & Search Bar */}
          <div className="space-y-3 pt-1">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                  statusFilter === 'pending'
                    ? 'bg-white text-amber-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>รออนุมัติรับ</span>
                {pendingUsersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                    {pendingUsersCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  statusFilter === 'active'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                อนุมัติแล้ว ({activeUsersCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('blocked')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  statusFilter === 'blocked'
                    ? 'bg-white text-rose-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ระงับสิทธิ์ ({blockedUsersCount})
              </button>
            </div>

            {/* Search Input & Reset Button */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-slate-400"></i>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อเจ้าหน้าที่, ตำแหน่ง, สังกัด, อีเมล, LINE ID..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={onResetUsers}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium flex items-center gap-1"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                  <span>คืนค่าเริ่มต้น</span>
                </button>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-3 px-4">ผู้ใช้งาน / ข้อมูลเจ้าหน้าที่</th>
                    <th className="py-3 px-3">ช่องทาง SIGN-IN</th>
                    <th className="py-3 px-3">ระดับสิทธิ์</th>
                    <th className="py-3 px-3">สถานะ</th>
                    {isSuperAdmin && <th className="py-3 px-4 text-center">จัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        ไม่พบผู้ใช้งานตรงตามคำค้นหาหรือแท็บที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isMainSuper = u.emailOrId.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

                      return (
                        <tr key={u.id} className={`transition ${u.status === 'pending' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50/80'}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-600 text-xs border border-slate-200">
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  u.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isMainSuper && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                      Owner
                                    </span>
                                  )}
                                  {u.status === 'pending' && (
                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-white animate-pulse">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">{maskIdentifier(u.emailOrId)}</div>
                                {(u.position || u.affiliation || u.phone) && (
                                  <div className="mt-1 text-[10px] text-slate-600 space-y-0.5">
                                    {u.position && <div className="font-bold text-emerald-700">{u.position}</div>}
                                    {(u.workGroup || u.affiliation) && (
                                      <div>{u.workGroup ? `${u.workGroup} • ` : ''}{u.affiliation}</div>
                                    )}
                                    {u.phone && <div><i className="fa-solid fa-phone text-[9px] text-slate-400 mr-1"></i>{u.phone}</div>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {u.provider === 'google' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                <i className="fa-brands fa-google text-rose-500"></i>
                                <span>Google</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <i className="fa-brands fa-line text-emerald-500"></i>
                                <span>LINE</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {u.role === 'super_admin' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-400 text-slate-900 shadow-2xs">
                                <i className="fa-solid fa-crown text-[10px]"></i>
                                <span>Super Admin</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <i className="fa-solid fa-user-shield text-[10px]"></i>
                                <span>Admin</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : u.status === 'pending'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                u.status === 'active' ? 'bg-emerald-500' : u.status === 'pending' ? 'bg-amber-500 animate-ping' : 'bg-rose-500'
                              }`}></span>
                              <span>{u.status === 'active' ? 'อนุมัติแล้ว' : u.status === 'pending' ? 'รออนุมัติรับ' : 'ระงับสิทธิ์'}</span>
                            </span>
                          </td>

                          {isSuperAdmin && (
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {!isMainSuper ? (
                                  <>
                                    {u.status === 'pending' && (
                                      <button
                                        type="button"
                                        onClick={() => handleApproveUser(u)}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition flex items-center gap-1 shrink-0 ring-2 ring-emerald-300"
                                        title="กดยืนยันรับและอนุมัติสิทธิ์เจ้าหน้าที่เข้าใช้งาน"
                                      >
                                        <i className="fa-solid fa-user-check text-xs"></i>
                                        <span>ยืนยันรับ / อนุมัติ</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRole(u)}
                                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                                      title="เปลี่ยนระดับสิทธิ์ (Super Admin / Admin)"
                                    >
                                      <i className="fa-solid fa-crown text-amber-600 text-xs"></i>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus(u)}
                                      className={`p-1.5 rounded-lg transition ${
                                        u.status === 'active'
                                          ? 'hover:bg-rose-100 text-rose-600'
                                          : 'hover:bg-emerald-100 text-emerald-600'
                                      }`}
                                      title={u.status === 'active' ? 'ระงับสิทธิ์' : 'เปิดใช้งาน'}
                                    >
                                      <i className={`fa-solid ${u.status === 'active' ? 'fa-user-lock' : 'fa-user-check'} text-xs`}></i>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u)}
                                      className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 transition"
                                      title="ลบสิทธิ์ผู้ใช้"
                                    >
                                      <i className="fa-solid fa-trash-can text-xs"></i>
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-semibold italic">
                                    เจ้าของระบบหลัก
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-shield text-emerald-600"></i>
            <span>Super Admin: <b className="text-slate-800">{maskIdentifier(SUPER_ADMIN_EMAIL)}</b></span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-xs"
          >
            เสร็จสิ้น
          </button>
        </div>

      </div>
    </div>
  );
};
