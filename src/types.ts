export type DistrictName = 
  | 'เมือง' 
  | 'ท่าแพ' 
  | 'ละงู' 
  | 'ควนกาหลง' 
  | 'ควนโดน' 
  | 'ทุ่งหว้า' 
  | 'มะนัง';

export type AssessmentStatus = 'ประเมินแล้ว' | 'รอประเมิน' | 'ยังไม่ประเมิน';

export type ClinicType = 
  | 'คลินิกเวชกรรม' 
  | 'คลินิกทันตกรรม' 
  | 'คลินิกการพยาบาลและการผดุงครรภ์' 
  | 'คลินิกการแพทย์แผนไทย' 
  | 'คลินิกเทคนิคการแพทย์' 
  | 'คลินิกกายภาพบำบัด';

export interface Clinic {
  id: string;
  no: number;
  district: DistrictName;
  name: string; // ชื่อสถานพยาบาล
  type: ClinicType | string; // ประเภท
  licensee: string; // ผู้รับอนุญาต
  address?: string;
  phone?: string;
  assessmentStatus: AssessmentStatus; // ประเมิน RDU
  assessmentLevel: number | null; // ระดับผลการประเมิน (1, 2, 3 หรือ null)
  passCriteria: 'ผ่าน' | 'ไม่ผ่าน' | 'รอการประเมิน'; // เกณฑ์ผ่าน (>=ระดับ2)
  updatedAt?: string; // วันเวลาอัปเดตล่าสุด
  updatedBy?: string; // ผู้แก้ไข
  remarks?: string; // หมายเหตุ
}

export interface DistrictSummary {
  district: DistrictName;
  totalClinics: number;
  assessedCount: number;
  passedCount: number; // ระดับ >= 2
  pendingCount: number;
  passPercentage: number;
  targetPercentage: number; // 25% target
  isTargetAchieved: boolean;
}

export interface ProvincialSummary {
  totalTargetClinics: number;
  assessedClinics: number;
  passedClinics: number; // ระดับ >= 2
  pendingClinics: number;
  overallPassPercentage: number;
  overallTargetPercentage: number; // 25.0%
  isProvinceTargetAchieved: boolean;
  districtSummaries: DistrictSummary[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  district: DistrictName;
  clinicId: string;
  clinicName: string;
  previousStatus: string;
  newStatus: string;
  previousLevel: string;
  newLevel: string;
  editedBy: string;
  remarks: string;
  ipAddress?: string;
  telegramSent: boolean;
}

export interface SettingsConfig {
  gasWebAppUrl: string;
  spreadsheetId: string;
  telegramBotToken: string;
  telegramChatId: string;
  autoSyncInterval: number; // minutes (0 = disabled)
  isLiveApiActive: boolean;
}

export type UserRole = 'super_admin' | 'admin' | 'viewer' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'blocked';
export type AuthProvider = 'google' | 'line';

export interface AppUser {
  id: string;
  emailOrId: string;
  name: string;
  provider: AuthProvider;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
}

