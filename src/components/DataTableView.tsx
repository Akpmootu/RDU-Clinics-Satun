import React, { useState, useMemo } from 'react';
import { Clinic, DistrictName, AssessmentStatus } from '../types';
import { SATUN_DISTRICTS } from '../data/initialData';

interface DataTableViewProps {
  clinics: Clinic[];
  selectedDistrict: DistrictName | 'ทั้งหมด';
  setSelectedDistrict: (district: DistrictName | 'ทั้งหมด') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectClinicToEdit: (clinic: Clinic) => void;
  onOpenAddNewClinic?: () => void;
}

export const DataTableView: React.FC<DataTableViewProps> = ({
  clinics,
  selectedDistrict,
  setSelectedDistrict,
  searchTerm,
  setSearchTerm,
  onSelectClinicToEdit,
}) => {
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('ทั้งหมด');
  const [levelFilter, setLevelFilter] = useState<string>('ทั้งหมด');
  const [typeFilter, setTypeFilter] = useState<string>('ทั้งหมด');

  // Sorting state
  const [sortField, setSortField] = useState<keyof Clinic>('no');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Extract unique clinic types for filter dropdown
  const uniqueTypes = useMemo(() => {
    const types = new Set(clinics.map((c) => c.type));
    return Array.from(types);
  }, [clinics]);

  // Filtered and Sorted Data
  const filteredClinics = useMemo(() => {
    return clinics.filter((clinic) => {
      // District filter
      if (selectedDistrict !== 'ทั้งหมด' && clinic.district !== selectedDistrict) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ทั้งหมด' && clinic.assessmentStatus !== statusFilter) {
        return false;
      }
      // Level filter
      if (levelFilter !== 'ทั้งหมด') {
        if (levelFilter === 'null' && clinic.assessmentLevel !== null) return false;
        if (levelFilter === '2+' && (clinic.assessmentLevel === null || clinic.assessmentLevel < 2)) return false;
        if (['1', '2', '3'].includes(levelFilter) && clinic.assessmentLevel !== parseInt(levelFilter)) return false;
      }
      // Type filter
      if (typeFilter !== 'ทั้งหมด' && clinic.type !== typeFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        const matchName = clinic.name.toLowerCase().includes(term);
        const matchLicensee = clinic.licensee.toLowerCase().includes(term);
        const matchDistrict = clinic.district.toLowerCase().includes(term);
        const matchType = clinic.type.toLowerCase().includes(term);
        if (!matchName && !matchLicensee && !matchDistrict && !matchType) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal, 'th') : bVal.localeCompare(aVal, 'th');
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [clinics, selectedDistrict, statusFilter, levelFilter, typeFilter, searchTerm, sortField, sortDirection]);

  // Pagination calculation
  const totalItems = filteredClinics.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedClinics = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClinics.slice(start, start + pageSize);
  }, [filteredClinics, currentPage, pageSize]);

  // Handle column header click for sorting
  const handleSort = (field: keyof Clinic) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // CSV Export functionality
  const exportCSV = () => {
    const headers = ['ลำดับ', 'อำเภอ', 'ชื่อสถานพยาบาล', 'ประเภท', 'ผู้รับอนุญาต', 'ประเมิน RDU', 'ระดับผลประเมิน', 'เกณฑ์ผ่าน'];
    const rows = filteredClinics.map((c) => [
      c.no,
      c.district,
      `"${c.name}"`,
      `"${c.type}"`,
      `"${c.licensee}"`,
      c.assessmentStatus,
      c.assessmentLevel !== null ? `ระดับ ${c.assessmentLevel}` : 'ยังไม่ประเมิน',
      c.passCriteria,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RDU_Satun_Clinics_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="space-y-4">
      {/* Header Title & Export Tools */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            <i className="fa-solid fa-table"></i>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>ฐานข้อมูลคลินิกเอกชน จังหวัดสตูล</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                 DataTables
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              พบข้อมูลทั้งหมด {totalItems} รายการ (จากทั้งหมด {clinics.length} แห่ง)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
            aria-label="ส่งออก CSV"
          >
            <i className="fa-solid fa-file-csv text-emerald-600 text-sm"></i>
            <span>ส่งออก CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 no-print"
            aria-label="พิมพ์รายงาน"
          >
            <i className="fa-solid fa-print text-slate-600 text-sm"></i>
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* Filter Control Panel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        
        {/* District Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <i className="fa-solid fa-map-pin text-emerald-600"></i>
            <span>อำเภอ:</span>
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value as DistrictName | 'ทั้งหมด');
              setCurrentPage(1);
            }}
            className="w-full text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          >
            <option value="ทั้งหมด">ทั้งหมด (7 อำเภอ)</option>
            {SATUN_DISTRICTS.map((d) => (
              <option key={d} value={d}>อำเภอ{d}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <i className="fa-solid fa-list-check text-emerald-600"></i>
            <span>สถานะการประเมิน:</span>
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          >
            <option value="ทั้งหมด">ทั้งหมด</option>
            <option value="ประเมินแล้ว">ประเมินแล้ว</option>
            <option value="รอประเมิน">รอประเมิน</option>
          </select>
        </div>

        {/* Level Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <i className="fa-solid fa-star text-amber-500"></i>
            <span>ระดับการประเมิน:</span>
          </label>
          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          >
            <option value="ทั้งหมด">ทุกระดับ</option>
            <option value="2+">ผ่านเกณฑ์ (ระดับ 2 ขึ้นไป)</option>
            <option value="3">ระดับ 3 (สูงสุด)</option>
            <option value="2">ระดับ 2</option>
            <option value="1">ระดับ 1</option>
            <option value="null">ยังไม่มีระดับ</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <i className="fa-solid fa-hospital text-emerald-600"></i>
            <span>ประเภทสถานพยาบาล:</span>
          </label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs p-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          >
            <option value="ทั้งหมด">ประเภททั้งหมด</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Main Responsive Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 select-none">
                <th
                  onClick={() => handleSort('no')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/80 transition w-12 text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ลำดับ</span>
                    <i className="fa-solid fa-sort text-[10px] text-slate-400"></i>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('district')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/80 transition"
                >
                  <div className="flex items-center gap-1">
                    <span>อำเภอ</span>
                    <i className="fa-solid fa-sort text-[10px] text-slate-400"></i>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/80 transition"
                >
                  <div className="flex items-center gap-1">
                    <span>ชื่อสถานพยาบาล</span>
                    <i className="fa-solid fa-sort text-[10px] text-slate-400"></i>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('type')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/80 transition hidden md:table-cell"
                >
                  <div className="flex items-center gap-1">
                    <span>ประเภท</span>
                    <i className="fa-solid fa-sort text-[10px] text-slate-400"></i>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('licensee')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/80 transition hidden lg:table-cell"
                >
                  <div className="flex items-center gap-1">
                    <span>ผู้รับอนุญาต</span>
                    <i className="fa-solid fa-sort text-[10px] text-slate-400"></i>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('assessmentStatus')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/80 transition text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ประเมิน RDU</span>
                    <i className="fa-solid fa-sort text-[10px] text-slate-400"></i>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('assessmentLevel')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/80 transition text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ระดับที่ได้</span>
                    <i className="fa-solid fa-sort text-[10px] text-slate-400"></i>
                  </div>
                </th>

                <th className="py-3 px-3.5 text-center w-28">
                  <span>การจัดการ</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {paginatedClinics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <i className="fa-solid fa-folder-open text-3xl text-slate-300"></i>
                      <p className="text-sm font-medium text-slate-600">ไม่พบข้อมูลคลินิกที่ตรงกับเงื่อนไข</p>
                      <button
                        onClick={() => {
                          setSelectedDistrict('ทั้งหมด');
                          setStatusFilter('ทั้งหมด');
                          setLevelFilter('ทั้งหมด');
                          setTypeFilter('ทั้งหมด');
                          setSearchTerm('');
                        }}
                        className="mt-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition"
                      >
                        ล้างเงื่อนไขการค้นหาทั้งหมด
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClinics.map((clinic, index) => {
                  const isAssessed = clinic.assessmentStatus === 'ประเมินแล้ว';
                  const isPassed = clinic.assessmentLevel !== null && clinic.assessmentLevel >= 2;

                  return (
                    <tr
                      key={clinic.id}
                      className="hover:bg-slate-50/80 transition-colors duration-150 group"
                    >
                      {/* Index */}
                      <td className="py-3 px-3.5 text-center font-semibold text-slate-500">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>

                      {/* District */}
                      <td className="py-3 px-3.5 font-semibold text-slate-800 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
                          {clinic.district}
                        </span>
                      </td>

                      {/* Clinic Name & Mobile Subtext */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition">
                          {clinic.name}
                        </div>
                        <div className="text-[11px] text-slate-500 md:hidden flex flex-wrap gap-1 mt-0.5">
                          <span>{clinic.type}</span>
                          <span>• {clinic.licensee}</span>
                        </div>
                      </td>

                      {/* Clinic Type */}
                      <td className="py-3 px-3.5 text-slate-600 hidden md:table-cell whitespace-nowrap">
                        {clinic.type}
                      </td>

                      {/* Licensee */}
                      <td className="py-3 px-3.5 text-slate-600 hidden lg:table-cell whitespace-nowrap">
                        {clinic.licensee}
                      </td>

                      {/* RDU Assessment Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {isAssessed ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                            <i className="fa-solid fa-circle-check text-emerald-600 text-xs"></i>
                            <span>ประเมินแล้ว</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <i className="fa-solid fa-hourglass-half text-amber-500 text-xs"></i>
                            <span>รอประเมิน</span>
                          </span>
                        )}
                      </td>

                      {/* Assessment Level */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {clinic.assessmentLevel !== null ? (
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border ${
                            isPassed
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}>
                            ระดับ {clinic.assessmentLevel}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-xs">-</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => onSelectClinicToEdit(clinic)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto border border-emerald-200/80 shadow-2xs"
                          aria-label={`แก้ไข ${clinic.name}`}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                          <span>แก้ไข</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          
          <div className="flex items-center gap-2">
            <span>แสดงแถวต่อหน้า:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="p-1 rounded-lg bg-white border border-slate-200 focus:outline-none"
            >
              <option value={5}>5 แถว</option>
              <option value={10}>10 แถว</option>
              <option value={25}>25 แถว</option>
              <option value={50}>50 แถว</option>
            </select>
            <span className="ml-2">
              แสดง {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} จาก {totalItems} รายการ
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="หน้าแรก"
            >
              <i className="fa-solid fa-angles-left text-xs"></i>
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="หน้าก่อนหน้า"
            >
              <i className="fa-solid fa-chevron-left text-xs"></i>
            </button>

            <span className="px-3 py-1 font-semibold text-slate-800">
              หน้า {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="หน้าถัดไป"
            >
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="หน้าสุดท้าย"
            >
              <i className="fa-solid fa-angles-right text-xs"></i>
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};
