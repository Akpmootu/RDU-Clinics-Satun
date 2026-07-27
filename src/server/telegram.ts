export const DEFAULT_DASHBOARD_URL = 'https://rdu-clinics-satun.vercel.app';

export interface ClinicUpdateNotification {
  clinicName: string;
  district: string;
  assessmentStatus: string;
  assessmentLevel: number | null;
  editedBy: string;
  remarks: string;
  timestamp: string;
}

interface TelegramApiResponse {
  ok?: boolean;
  description?: string;
  result?: {
    message_id?: number;
  };
}

type TelegramParseMode = 'HTML' | 'Markdown';

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function telegramConfig(): { botToken: string; chatId: string } {
  const botToken = envValue('TELEGRAM_BOT_TOKEN') || envValue('VITE_TELEGRAM_BOT_TOKEN');
  const chatId = envValue('TELEGRAM_CHAT_ID') || envValue('VITE_TELEGRAM_CHAT_ID');

  if (!botToken || !chatId) {
    throw new Error('ยังไม่ได้ตั้งค่า Telegram Bot Token หรือ Chat ID บนเซิร์ฟเวอร์');
  }

  return { botToken, chatId };
}

export function telegramDashboardUrl(): string {
  const configuredUrl = envValue('DASHBOARD_URL');
  if (!configuredUrl) return DEFAULT_DASHBOARD_URL;

  try {
    const url = new URL(configuredUrl);
    return url.protocol === 'https:' ? url.toString().replace(/\/$/, '') : DEFAULT_DASHBOARD_URL;
  } catch {
    return DEFAULT_DASHBOARD_URL;
  }
}

export function escapeTelegramHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildClinicUpdateMessage(notification: ClinicUpdateNotification): string {
  const levelText =
    notification.assessmentLevel !== null
      ? `ระดับ ${notification.assessmentLevel} ⭐`
      : 'ยังไม่ระบุ';
  const passText =
    notification.assessmentLevel !== null && notification.assessmentLevel >= 2
      ? '✅ ผ่านเกณฑ์ (≥ระดับ 2)'
      : '⏳ รอการประเมิน/ปรับปรุง';

  return (
    '🔔 <b>[แจ้งเตือนการอัปเดต RDU คลินิกเอกชน สตูล]</b>\n\n' +
    `🏥 <b>คลินิก:</b> ${escapeTelegramHtml(notification.clinicName)}\n` +
    `📍 <b>อำเภอ:</b> ${escapeTelegramHtml(notification.district)}\n` +
    `📊 <b>สถานะการประเมิน:</b> ${escapeTelegramHtml(notification.assessmentStatus)}\n` +
    `⭐ <b>ระดับที่ได้:</b> ${escapeTelegramHtml(levelText)}\n` +
    `🎯 <b>ผลการประเมิน:</b> ${escapeTelegramHtml(passText)}\n` +
    `👤 <b>ผู้บันทึก:</b> ${escapeTelegramHtml(notification.editedBy)}\n` +
    `📝 <b>หมายเหตุ:</b> ${escapeTelegramHtml(notification.remarks)}\n\n` +
    `🗓️ <b>เวลาบันทึก:</b> ${escapeTelegramHtml(notification.timestamp)} น.`
  );
}

export function dashboardReplyMarkup() {
  return {
    inline_keyboard: [
      [
        {
          text: '🌐 เปิดระบบ Dashboard',
          url: telegramDashboardUrl(),
        },
      ],
    ],
  };
}

export async function sendTelegramMessage(
  text: string,
  parseMode: TelegramParseMode
): Promise<{ messageId: number | null }> {
  const { botToken, chatId } = telegramConfig();
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
      reply_markup: dashboardReplyMarkup(),
    }),
  });
  const json = (await response.json().catch(() => null)) as TelegramApiResponse | null;

  if (!response.ok || !json?.ok) {
    throw new Error(
      json?.description || `Telegram Bot API ตอบกลับ HTTP ${response.status}`
    );
  }

  return { messageId: json.result?.message_id ?? null };
}

export async function sendClinicUpdateNotification(
  notification: ClinicUpdateNotification
): Promise<{ messageId: number | null }> {
  return sendTelegramMessage(buildClinicUpdateMessage(notification), 'HTML');
}
