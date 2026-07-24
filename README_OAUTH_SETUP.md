# 🔐 คู่มือการตั้งค่า Google OAuth 2.0 & LINE Login 2.1
## ระบบติดตามการประเมินการใช้ยาอย่างสมเหตุผล (RDU Clinics) จังหวัดสตูล 2569
### สำนักงานสาธารณสุขจังหวัดสตูล (กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค)

---

## 📌 1. การตั้งค่า Google OAuth 2.0 (Google Cloud Console)

1. เข้าสู่ระบบ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่ชื่อ: `rdu-clinics-satun-2569`
3. ไปที่ **APIs & Services > Credentials**
4. กด **Create Credentials > OAuth client ID**
5. เลือก Application type: **Web application**
6. ตั้งค่า URIs:
   - **Authorized JavaScript origins**:
     - `https://rdu-clinics-satun.vercel.app`
     - `http://localhost:3000`
   - **Authorized redirect URIs**:
     - `https://rdu-clinics-satun.vercel.app/api/auth/google/callback`
     - `http://localhost:3000/api/auth/google/callback`
7. คัดลอก `Client ID` และ `Client Secret` ไปใส่ในไฟล์ `.env`:
   ```env
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   GOOGLE_REDIRECT_URI="https://rdu-clinics-satun.vercel.app/api/auth/google/callback"
   ```

---

## 💬 2. การตั้งค่า LINE Login 2.1 (LINE Developers Console)

1. เข้าสู่ระบบ [LINE Developers Console](https://developers.line.biz/)
2. สร้าง Provider ใหม่ชื่อ: `สำนักงานสาธารณสุขจังหวัดสตูล`
3. กด **Create a new channel** เลือก **LINE Login**
4. กรอกข้อมูล Channel Name: `RDU Clinics Satun Admin Login`
5. ไปที่แท็บ **LINE Login**:
   - **Callback URL**:
     - `https://rdu-clinics-satun.vercel.app/api/auth/line/callback`
     - `http://localhost:3000/api/auth/line/callback`
   - เปิดใช้งาน **OpenID Connect (Email address permission)**
6. คัดลอก `Channel ID` และ `Channel Secret` ไปใส่ในไฟล์ `.env`:
   ```env
   LINE_CHANNEL_ID="your-line-channel-id"
   LINE_CHANNEL_SECRET="your-line-channel-secret"
   LINE_REDIRECT_URI="https://rdu-clinics-satun.vercel.app/api/auth/line/callback"
   ```

---

## 🛡️ 3. การจัดการสิทธิ์และการอนุมัติผู้ใช้ (Role-Based Access Control)

ระบบรองรับ 3 สิทธิ์หลัก (RBAC):
- **`super_admin`**: มีสิทธิ์อนุมัติผู้ใช้ใหม่, เปลี่ยน Role, ระงับบัญชี และเข้าถึงระบบทั้งหมด
- **`admin`**: บันทึก แก้ไขข้อมูลการประเมิน RDU, ดู Audit Trail Logs, ดู Dashboard
- **`viewer`**: ผู้ใช้ใหม่หลังผ่าน OAuth ครั้งแรก (สถานะ `pending` รอ Super Admin อนุมัติ)

สถานะบัญชี (Account Status):
- **`pending`**: แสดงหน้า "รอการตรวจสอบอนุมัติสิทธิ์จากผู้ดูแลระบบ"
- **`active`**: ผ่านการอนุมัติ สามารถเข้าใช้งาน Admin Dashboard ได้
- **`suspended`**: ถูกระงับการใช้งาน แสดงหน้าแจ้งเตือนการระงับสิทธิ์

---

## 🚀 4. การรันระบบและการเริ่มทำงาน (Development & Production)

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. เริ่มต้น Dev Server (Express + Vite)
npm run dev

# 3. ตรวจสอบสถานะ Linter & Build
npm run lint
npm run build
```

---

**พัฒนาโดย:** กลุ่มงานเทคโนโลยีสารสนเทศ IT สำนักงานสาธารณสุขจังหวัดสตูล 2569 🏛️
