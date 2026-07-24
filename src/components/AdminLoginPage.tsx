import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { maskIdentifier } from '../services/userService';
import Swal from 'sweetalert2';

interface AdminLoginPageProps {
  currentUser: AppUser | null;
  onLoginSuccess: (user: AppUser) => void;
  onLogout: () => void;
  onGoBackHome: () => void;
}

export type AdminUiState = 
  | 'default' 
  | 'loading_google' 
  | 'loading_line' 
  | 'pending' 
  | 'access_denied' 
  | 'suspended' 
  | 'session_expired' 
  | 'error';

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout,
  onGoBackHome,
}) => {
  const [uiState, setUiState] = useState<AdminUiState>('default');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Read URL query params to set initial state from backend OAuth redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');

    if (authStatus === 'pending') {
      setUiState('pending');
    } else if (authStatus === 'suspended') {
      setUiState('suspended');
    } else if (authStatus === 'access_denied') {
      setUiState('access_denied');
    } else if (authStatus === 'expired') {
      setUiState('session_expired');
    } else if (authStatus === 'error') {
      setUiState('error');
      setErrorMessage(urlParams.get('msg') || 'เกิดข้อผิดพลาดระหว่างเชื่อมต่อบัญชี กรุณาลองใหม่อีกครั้ง');
    } else if (authStatus === 'success') {
      setUiState('default');
    }
  }, []);

  // Handle Google OAuth Redirect
  const handleGoogleLogin = () => {
    setUiState('loading_google');
    // Redirect to backend OAuth route
    window.location.href = '/api/auth/google';
  };

  // Handle LINE OAuth Redirect
  const handleLineLogin = () => {
    setUiState('loading_line');
    // Redirect to backend OAuth route
    window.location.href = '/api/auth/line';
  };

  // Demo Preset Login for Preview/Testing Environments
  const handlePresetLogin = (presetUser: AppUser) => {
    if (presetUser.status === 'pending') {
      setUiState('pending');
      return;
    }
    if (presetUser.status === 'suspended' || presetUser.status === 'blocked') {
      setUiState('suspended');
      return;
    }
    if (presetUser.role === 'viewer') {
      setUiState('access_denied');
      return;
    }

    onLoginSuccess(presetUser);
    Swal.fire({
      icon: 'success',
      title: 'เข้าสู่ระบบสำเร็จ! 🔐',
      text: `ยินดีต้อนรับ ${presetUser.name} (${presetUser.role.toUpperCase()})`,
      confirmButtonColor: '#00A67E',
      timer: 2000,
    });
  };

  const handleContactAdmin = () => {
    Swal.fire({
      title: 'ติดต่อผู้ดูแลระบบ 🏥',
      html: `
        <div class="text-left text-sm space-y-2 text-slate-700">
          <p><b>กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค</b></p>
          <p>สำนักงานสาธารณสุขจังหวัดสตูล</p>
          <hr class="my-2 border-slate-200" />
          <p><i class="fa-solid fa-phone text-emerald-600 mr-2"></i><b>โทรศัพท์:</b> 074-711071 ต่อ กลุ่มงานเภสัชฯ</p>
          <p><i class="fa-solid fa-envelope text-emerald-600 mr-2"></i><b>อีเมล:</b> satun.rdu.admin@gmail.com</p>
          <p><i class="fa-brands fa-line text-emerald-600 mr-2"></i><b>LINE Official:</b> @satunrdu</p>
        </div>
      `,
      confirmButtonColor: '#00A67E',
      confirmButtonText: 'รับทราบ',
    });
  };

  return (
    <div className="min-h-screen bg-[#F3F7FB] flex flex-col justify-between font-['Kanit',sans-serif] text-[#1E293B]">
      
      {/* Top Bar Navigation */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#DCE5EE] px-4 lg:px-8 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onGoBackHome}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00A67E] to-teal-500 flex items-center justify-center text-white shadow-md shadow-[#00A67E]/20">
              <i className="fa-solid fa-pills text-lg"></i>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                  RDU Clinics <span className="text-[#00A67E]">Satun</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EAFBF5] text-[#00A67E] border border-[#00A67E]/30">
                  2569
                </span>
              </div>
              <p className="text-[10px] text-slate-500">สำนักงานสาธารณสุขจังหวัดสตูล</p>
            </div>
          </div>

          <button
            onClick={onGoBackHome}
            className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#00A67E] px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#00A67E]/30 hover:bg-[#EAFBF5] transition flex items-center gap-2"
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>กลับไปยังหน้าหลัก</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl bg-white rounded-3xl border border-[#DCE5EE] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          
          {/* ========================================== */}
          {/* LEFT BRAND PANEL (DESKTOP SPLIT LAYOUT)     */}
          {/* ========================================== */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#EAFBF5] via-[#F3F7FB] to-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#DCE5EE] relative overflow-hidden">
            
            {/* Background Decorative Abstract Patterns */}
            <div className="absolute -top-16 -left-16 w-64 h-64 bg-[#00A67E]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-6">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00A67E]/10 text-[#00A67E] border border-[#00A67E]/20 text-xs font-bold">
                <i className="fa-solid fa-user-shield text-sm"></i>
                <span>ระบบสำหรับเจ้าหน้าที่</span>
              </div>

              {/* Branding Title */}
              <div className="space-y-3">
                <h1 className="text-xl sm:text-2xl font-black text-[#0F1B35] leading-snug">
                  ระบบติดตามการประเมินการใช้ยาอย่างสมเหตุผล (RDU Clinics)
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  ในคลินิกเอกชน จังหวัดสตูล 2569 สารสนเทศสำหรับการบันทึก แก้ไข ตรวจสอบ และติดตามผลการประเมินตามมาตรฐาน สสจ.สตูล
                </p>
              </div>

              {/* 3 Core Capabilities */}
              <div className="space-y-3 pt-2">
                
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/80 border border-[#DCE5EE] backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-[#EAFBF5] text-[#00A67E] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <i className="fa-solid fa-[#00A67E] fa-square-check text-base"></i>
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-[#0F1B35]">จัดการข้อมูลการประเมิน RDU</h2>
                    <p className="text-[11px] text-slate-500">บันทึกและอัปเดตผลระดับการประเมิน RDU Clinics ทั้งหมด</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/80 border border-[#DCE5EE] backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-[#EAFBF5] text-[#00A67E] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <i className="fa-solid fa-clock-rotate-left text-base"></i>
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-[#0F1B35]">ตรวจสอบประวัติการแก้ไขข้อมูล</h2>
                    <p className="text-[11px] text-slate-500">มี Audit Trail โปร่งใส บันทึกวันเวลาและผู้แก้ไขทุกรายการ</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/80 border border-[#DCE5EE] backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-[#EAFBF5] text-[#00A67E] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <i className="fa-solid fa-chart-line text-base"></i>
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-[#0F1B35]">ติดตามภาพรวมคลินิกทั้ง 7 อำเภอ</h2>
                    <p className="text-[11px] text-slate-500">สรุปตัวชี้วัด KPI สสจ.สตูล เป้าหมายผ่านเกณฑ์สะสม ≥ 25%</p>
                  </div>
                </div>

              </div>

            </div>

            {/* Department Footer Note */}
            <div className="relative z-10 pt-6 mt-6 border-t border-[#DCE5EE] flex items-center gap-2 text-[11px] text-slate-500">
              <i className="fa-solid fa-building-columns text-[#00A67E]"></i>
              <span>กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค สำนักงานสาธารณสุขจังหวัดสตูล</span>
            </div>

          </div>

          {/* ========================================== */}
          {/* RIGHT LOGIN PANEL (DYNAMIC UI STATES)      */}
          {/* ========================================== */}
          <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white relative">

            {/* STATE 1: ALREADY AUTHENTICATED */}
            {currentUser && currentUser.status === 'active' && (
              <div className="space-y-6 my-auto text-center py-8">
                <div className="w-16 h-16 rounded-3xl bg-[#EAFBF5] text-[#00A67E] flex items-center justify-center mx-auto text-2xl shadow-lg shadow-[#00A67E]/20">
                  <i className="fa-solid fa-user-check"></i>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#00A67E] px-2.5 py-1 bg-[#EAFBF5] rounded-full">
                    เข้าสู่ระบบเรียบร้อยแล้ว
                  </span>
                  <h2 className="text-xl font-black text-[#0F1B35]">{currentUser.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">{maskIdentifier(currentUser.emailOrId)}</p>
                  <p className="text-xs text-emerald-700 font-medium">
                    สิทธิ์ปัจจุบัน: <span className="font-bold uppercase">{currentUser.role}</span>
                  </p>
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    onClick={onGoBackHome}
                    className="w-full py-3 px-4 rounded-xl bg-[#00A67E] hover:bg-[#008B6A] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-gauge-high"></i>
                    <span>เข้าสู่หน้า Dashboard จัดการข้อมูล</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-semibold text-xs transition"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            )}

            {/* STATE 2: PENDING APPROVAL SCREEN */}
            {uiState === 'pending' && (
              <div className="space-y-6 my-auto text-center py-6">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-3xl shadow-md">
                  <i className="fa-solid fa-hourglass-half animate-pulse"></i>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">ลงทะเบียนบัญชีเรียบร้อยแล้ว ⏳</h2>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                    บัญชีของคุณกำลังรอการตรวจสอบอนุมัติสิทธิ์จากผู้ดูแลระบบ เมื่อได้รับการยืนยันแล้ว คุณจะสามารถเข้าใช้งานระบบจัดการข้อมูลได้ทันที
                  </p>
                </div>

                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-left text-xs space-y-1.5 text-amber-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-shield-halved text-amber-600"></i>
                    <span>ขั้นตอนอนุมัติสิทธิ์ (Security Check)</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    เจ้าหน้าที่ Super Admin สสจ.สตูล จะทำการตรวจสอบอีเมล/บัญชี LINE กับฐานข้อมูลบุคลากรสาธารณสุข
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={onGoBackHome}
                    className="w-full py-3 rounded-xl bg-[#00A67E] text-white font-bold text-xs hover:bg-[#008B6A] transition shadow-xs"
                  >
                    กลับไปยังหน้าหลัก
                  </button>
                  <button
                    onClick={handleContactAdmin}
                    className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    ติดต่อผู้ดูแลระบบเพื่อขออนุมัติ
                  </button>
                  <button
                    onClick={() => setUiState('default')}
                    className="text-xs text-slate-400 hover:text-slate-600 underline pt-1 block mx-auto"
                  >
                    ลองเข้าสู่ระบบด้วยบัญชีอื่น
                  </button>
                </div>
              </div>
            )}

            {/* STATE 3: ACCESS DENIED SCREEN */}
            {uiState === 'access_denied' && (
              <div className="space-y-6 my-auto text-center py-6">
                <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto text-3xl shadow-md">
                  <i className="fa-solid fa-user-xmark"></i>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">คุณไม่มีสิทธิ์เข้าถึงส่วนจัดการระบบ ❌</h2>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                    บัญชีนี้ยังไม่ได้รับสิทธิ์ระดับ Admin สำหรับจัดการข้อมูล RDU Clinics กรุณาติดต่อผู้ดูแลระบบ สำนักงานสาธารณสุขจังหวัดสตูล
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={onGoBackHome}
                    className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-xs"
                  >
                    กลับไปยังหน้าหลัก
                  </button>
                  <button
                    onClick={handleContactAdmin}
                    className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition"
                  >
                    ติดต่อผู้ดูแลระบบ (สสจ.สตูล)
                  </button>
                  <button
                    onClick={() => setUiState('default')}
                    className="text-xs text-slate-400 hover:text-slate-600 underline pt-1 block mx-auto"
                  >
                    ลองเข้าสู่ระบบใหม่
                  </button>
                </div>
              </div>
            )}

            {/* STATE 4: SUSPENDED ACCOUNT SCREEN */}
            {uiState === 'suspended' && (
              <div className="space-y-6 my-auto text-center py-6">
                <div className="w-16 h-16 rounded-3xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto text-3xl shadow-md">
                  <i className="fa-solid fa-ban"></i>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-rose-900">บัญชีนี้ถูกระงับการใช้งาน 🚫</h2>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                    บัญชีของคุณถูกระงับการเข้าถึงส่วนจัดการข้อมูลเป็นการชั่วคราว กรุณาติดต่อ Super Admin เพื่อตรวจสอบสถานะ
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleContactAdmin}
                    className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow-xs"
                  >
                    ติดต่อผู้ดูแลระบบเพื่อแก้ไข
                  </button>
                  <button
                    onClick={onGoBackHome}
                    className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    กลับไปยังหน้าหลัก
                  </button>
                </div>
              </div>
            )}

            {/* STATE 5: SESSION EXPIRED SCREEN */}
            {uiState === 'session_expired' && (
              <div className="space-y-6 my-auto text-center py-6">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-3xl shadow-md">
                  <i className="fa-solid fa-clock-rotate-left"></i>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">เซสชันของคุณหมดอายุแล้ว ⏱️</h2>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                    เพื่อความปลอดภัยของข้อมูลเซสชันการล็อกอินมีอายุสูงสุด 8 ชั่วโมง กรุณาเข้าสู่ระบบใหม่อีกครั้ง
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => setUiState('default')}
                    className="w-full py-3 rounded-xl bg-[#00A67E] text-white font-bold text-xs hover:bg-[#008B6A] transition shadow-xs"
                  >
                    เข้าสู่ระบบอีกครั้ง
                  </button>
                </div>
              </div>
            )}

            {/* STATE 6: OAUTH LOADING STATE */}
            {(uiState === 'loading_google' || uiState === 'loading_line') && (
              <div className="space-y-6 my-auto text-center py-12">
                <div className="w-16 h-16 rounded-3xl bg-[#EAFBF5] text-[#00A67E] flex items-center justify-center mx-auto text-3xl shadow-md">
                  <i className="fa-solid fa-spinner animate-spin"></i>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {uiState === 'loading_google' ? 'กำลังเชื่อมต่อกับ Google...' : 'กำลังเชื่อมต่อกับ LINE...'}
                  </h2>
                  <p className="text-xs text-slate-500">กรุณารอสักครู่ ระบบกำลังเปลี่ยนเส้นทางไปยัง OAuth Provider</p>
                </div>
              </div>
            )}

            {/* STATE 7: DEFAULT LOGIN PANEL */}
            {uiState === 'default' && (!currentUser || currentUser.status !== 'active') && (
              <div className="space-y-5 my-auto">
                
                {/* Header Icon & Title */}
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAFBF5] text-[#00A67E] flex items-center justify-center text-xl shadow-xs border border-[#00A67E]/20">
                    <i className="fa-solid fa-shield-halved"></i>
                  </div>
                  <h2 className="text-xl font-bold text-[#0F1B35]">เข้าสู่ระบบผู้ดูแลระบบ</h2>
                  <p className="text-xs text-slate-500">
                    สำหรับเจ้าหน้าที่ที่ได้รับอนุญาตให้จัดการข้อมูล RDU Clinics สสจ.สตูล
                  </p>
                </div>

                {/* Green Notice Box */}
                <div className="p-3.5 bg-[#EAFBF5] border border-[#00A67E]/30 rounded-2xl flex items-center gap-3 text-xs text-[#008B6A]">
                  <i className="fa-solid fa-circle-info text-base text-[#00A67E] shrink-0"></i>
                  <span className="font-medium">
                    กรุณาเข้าสู่ระบบด้วยบัญชี Google หรือ LINE ที่ได้ลงทะเบียนไว้กับหน่วยงาน
                  </span>
                </div>

                {/* Error Message Alert */}
                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-rose-500 text-sm"></i>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* OAuth Login Buttons */}
                <div className="space-y-3 pt-1">
                  
                  {/* Google Login Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full h-12 px-4 rounded-xl bg-white hover:bg-slate-50 text-[#0F1B35] font-bold text-sm border border-[#DCE5EE] hover:border-slate-300 shadow-xs transition flex items-center justify-center gap-3 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#00A67E]"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>เข้าสู่ระบบด้วย Google</span>
                  </button>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-[#DCE5EE] w-full"></div>
                    <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                      หรือ
                    </span>
                    <div className="border-t border-[#DCE5EE] w-full"></div>
                  </div>

                  {/* LINE Login Button */}
                  <button
                    type="button"
                    onClick={handleLineLogin}
                    className="w-full h-12 px-4 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-sm shadow-xs transition flex items-center justify-center gap-3 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  >
                    <i className="fa-brands fa-line text-xl"></i>
                    <span>เข้าสู่ระบบด้วย LINE</span>
                  </button>

                </div>

                {/* Terms and Privacy note */}
                <p className="text-[11px] text-slate-400 text-center leading-relaxed px-2">
                  การเข้าสู่ระบบถือว่าคุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวของระบบ สสจ.สตูล
                </p>

                {/* Footer Links */}
                <div className="flex items-center justify-between text-xs pt-2 text-slate-500 border-t border-[#DCE5EE]">
                  <button
                    onClick={onGoBackHome}
                    className="hover:text-[#00A67E] transition flex items-center gap-1"
                  >
                    <i className="fa-solid fa-house text-[10px]"></i>
                    <span>กลับไปยังหน้าหลัก</span>
                  </button>

                  <button
                    onClick={handleContactAdmin}
                    className="hover:text-[#00A67E] transition flex items-center gap-1"
                  >
                    <i className="fa-solid fa-headset text-[10px]"></i>
                    <span>ติดต่อผู้ดูแลระบบ</span>
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>
      </main>

    </div>
  );
};
