// dev-server.ts
import path from "node:path";
import express2 from "express";
import { createServer as createViteServer } from "vite";

// src/server/app.ts
import express from "express";

// src/server/auth.ts
import crypto from "node:crypto";
function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }
  return secret;
}
function secureEquals(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
function isJwtConfigured() {
  return Boolean(process.env.JWT_SECRET?.trim());
}
function signAdminToken(payload, expiresInHours = 8) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1e3);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInHours * 3600
  };
  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getJwtSecret()).update(`${b64Header}.${b64Payload}`).digest("base64url");
  return `${b64Header}.${b64Payload}.${signature}`;
}
function verifyAdminToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [b64Header, b64Payload, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", getJwtSecret()).update(`${b64Header}.${b64Payload}`).digest("base64url");
    if (!secureEquals(signature, expectedSignature)) return null;
    const payload = JSON.parse(
      Buffer.from(b64Payload, "base64url").toString("utf-8")
    );
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp && now >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
function generateCsrfState() {
  return crypto.randomBytes(24).toString("hex");
}
function createSignedOauthState(provider, state) {
  const signature = crypto.createHmac("sha256", getJwtSecret()).update(`oauth:${provider}:${state}`).digest("base64url");
  return `${state}.${signature}`;
}
function verifySignedOauthState(provider, state, signedState) {
  if (!signedState) return false;
  return secureEquals(createSignedOauthState(provider, state), signedState);
}
function maskIdentifier(identifier) {
  if (!identifier) return "";
  if (identifier.includes("@")) {
    const [name, domain] = identifier.split("@");
    if (name.length <= 2) return `${name.charAt(0)}*@${domain}`;
    const maskedName = `${name.slice(0, 2)}${"*".repeat(
      Math.min(name.length - 3, 5)
    )}${name.slice(-1)}`;
    return `${maskedName}@${domain}`;
  }
  if (identifier.length <= 4) return `${identifier.charAt(0)}***`;
  return `${identifier.slice(0, 3)}***${identifier.slice(-2)}`;
}

// src/server/googleSheets.ts
import { createHash, createSign, randomUUID } from "node:crypto";
var DEFAULT_SPREADSHEET_ID = "1yLfjRD0PGXLJpsCyM8F9HsJfgb5gaDLAGhUjiB_eUY4";
var DEFAULT_SHEET_GID = "1062888583";
var DISTRICTS = ["\u0E40\u0E21\u0E37\u0E2D\u0E07", "\u0E17\u0E48\u0E32\u0E41\u0E1E", "\u0E25\u0E30\u0E07\u0E39", "\u0E04\u0E27\u0E19\u0E01\u0E32\u0E2B\u0E25\u0E07", "\u0E04\u0E27\u0E19\u0E42\u0E14\u0E19", "\u0E17\u0E38\u0E48\u0E07\u0E2B\u0E27\u0E49\u0E32", "\u0E21\u0E30\u0E19\u0E31\u0E07"];
var ASSESSMENT_STATUSES = ["\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E41\u0E25\u0E49\u0E27", "\u0E23\u0E2D\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19"];
var BUSINESS_STATUSES = ["\u0E40\u0E1B\u0E34\u0E14\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23", "\u0E1E\u0E31\u0E01\u0E43\u0E0A\u0E49", "\u0E1B\u0E34\u0E14\u0E01\u0E34\u0E08\u0E01\u0E32\u0E23"];
var CLINIC_REGISTRY_SHEET = "ClinicRegistry";
var ASSESSMENTS_SHEET = "Assessments";
var ASSESSMENT_PERIODS_SHEET = "AssessmentPeriods";
var AUDIT_LOG_SHEET = "AuditLogs";
var WRITE_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
var ClinicMutationError = class extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "ClinicMutationError";
  }
};
var DELETED_MARKER = "[SYSTEM_DELETED]";
function isSoftDeleted(record) {
  return record.businessStatus === "\u0E1B\u0E34\u0E14\u0E01\u0E34\u0E08\u0E01\u0E32\u0E23" && record.businessStatusNote.startsWith(DELETED_MARKER);
}
var REGISTRY_HEADERS = [
  "clinicId",
  "district",
  "no",
  "name",
  "type",
  "licensee",
  "address",
  "phone",
  "latitude",
  "longitude",
  "businessStatus",
  "businessStatusNote",
  "updatedAt",
  "updatedBy"
];
var ASSESSMENT_HEADERS = [
  "id",
  "fiscalYear",
  "clinicId",
  "assessmentStatus",
  "assessmentLevel",
  "passCriteria",
  "assessmentDate",
  "remarks",
  "updatedAt",
  "updatedBy"
];
var HEADER_ALIASES = {
  no: ["\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E17\u0E35\u0E48", "\u0E25\u0E33\u0E14\u0E31\u0E1A", "\u0E17\u0E35\u0E48"],
  district: ["\u0E2D\u0E33\u0E40\u0E20\u0E2D", "\u0E40\u0E02\u0E15\u0E2D\u0E33\u0E40\u0E20\u0E2D"],
  name: ["\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E16\u0E32\u0E19\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25", "\u0E0A\u0E37\u0E48\u0E2D\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01", "\u0E2A\u0E16\u0E32\u0E19\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25", "\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01"],
  type: ["\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17", "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01", "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E2A\u0E16\u0E32\u0E19\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25"],
  licensee: ["\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15", "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15"],
  status: ["\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19 rdu", "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19", "\u0E2A\u0E16\u0E32\u0E19\u0E30 rdu", "\u0E2A\u0E16\u0E32\u0E19\u0E30"],
  level: ["\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19", "\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19", "\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E1C\u0E25\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19", "\u0E23\u0E30\u0E14\u0E31\u0E1A"],
  pass: ["\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E1C\u0E48\u0E32\u0E19", "\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19", "\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C"],
  remarks: ["\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38", "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21"]
};
function normalizeCell(value) {
  return String(value ?? "").replace(/\uFEFF/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
}
function normalizeHeader(value) {
  return normalizeCell(value).toLocaleLowerCase("th-TH").replace(/[()≥>=:_\-./\s]+/g, "");
}
function matchesHeader(value, aliases) {
  const normalized = normalizeHeader(value);
  return aliases.some((alias) => normalized === normalizeHeader(alias) || normalized.includes(normalizeHeader(alias)));
}
function findHeaderRow(rows) {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 12); rowIndex += 1) {
    const row = rows[rowIndex] || [];
    if (row.length < 2) continue;
    if (row.some((cell) => matchesHeader(cell, HEADER_ALIASES.name)) && row.some((cell) => matchesHeader(cell, HEADER_ALIASES.type) || matchesHeader(cell, HEADER_ALIASES.status) || matchesHeader(cell, HEADER_ALIASES.level))) return rowIndex;
  }
  return -1;
}
function findColumn(header, aliases, fallback) {
  const index = header.findIndex((cell) => matchesHeader(cell, aliases));
  return index >= 0 ? index : fallback;
}
function normalizeDistrict(value, fallback) {
  const candidate = normalizeCell(value || fallback).replace(/^อำเภอ/, "").replace(/^อ\./, "").trim();
  if (candidate === "\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E2A\u0E15\u0E39\u0E25") return "\u0E40\u0E21\u0E37\u0E2D\u0E07";
  return DISTRICTS.find((district) => candidate === district) || DISTRICTS.find((district) => candidate.includes(district) || district.includes(candidate)) || null;
}
function normalizeAssessmentLevel(value) {
  const text = normalizeCell(value);
  if (!text || text === "-" || /ยังไม่|รอ/.test(text)) return null;
  const level = Number(text.match(/[1-3]/)?.[0]);
  return Number.isInteger(level) && level >= 1 && level <= 3 ? level : null;
}
function normalizeAssessmentStatus(value, level) {
  const text = normalizeCell(value);
  if (level !== null || /ประเมินแล้ว|ดำเนินการแล้ว|แล้วเสร็จ/.test(text)) return "\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E41\u0E25\u0E49\u0E27";
  if (/ยังไม่ประเมิน/.test(text)) return "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19";
  return "\u0E23\u0E2D\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19";
}
function normalizePassCriteria(value, level) {
  if (level !== null) return level >= 2 ? "\u0E1C\u0E48\u0E32\u0E19" : "\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19";
  const text = normalizeCell(value);
  if (/ไม่ผ่าน/.test(text)) return "\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19";
  if (/ผ่าน/.test(text)) return "\u0E1C\u0E48\u0E32\u0E19";
  return "\u0E23\u0E2D\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19";
}
function safePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(normalizeCell(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function nullableNumber(value) {
  const text = normalizeCell(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}
function headerIndexes(rows) {
  return new Map((rows[0] || []).map((cell, index) => [normalizeCell(cell), index]));
}
function rowValue(row, indexes, name) {
  return normalizeCell(row[indexes.get(name) ?? -1]);
}
function parseCsv(csv) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (inQuotes) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') inQuotes = false;
      else field += character;
    } else if (character === '"') inQuotes = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}
function parseClinicRows(rows, options = {}) {
  const headerRowIndex = findHeaderRow(rows);
  const fallback = headerRowIndex < 0;
  const header = fallback ? [] : rows[headerRowIndex] || [];
  const dataStart = fallback ? Math.min(2, rows.length) : headerRowIndex + 1;
  const columns = {
    no: findColumn(header, HEADER_ALIASES.no, 0),
    district: findColumn(header, HEADER_ALIASES.district, -1),
    name: findColumn(header, HEADER_ALIASES.name, 1),
    type: findColumn(header, HEADER_ALIASES.type, 2),
    licensee: findColumn(header, HEADER_ALIASES.licensee, 3),
    status: findColumn(header, HEADER_ALIASES.status, 4),
    level: findColumn(header, HEADER_ALIASES.level, 5),
    pass: findColumn(header, HEADER_ALIASES.pass, 6),
    remarks: findColumn(header, HEADER_ALIASES.remarks, 7)
  };
  const clinics = [];
  for (let rowIndex = dataStart; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const name = normalizeCell(row[columns.name]);
    const firstCell = normalizeCell(row[0]);
    if (!name || name.includes("\u0E20\u0E32\u0E1E\u0E23\u0E27\u0E21") || name.startsWith("\u0E23\u0E27\u0E21") || firstCell.includes("\u0E20\u0E32\u0E1E\u0E23\u0E27\u0E21") || firstCell.startsWith("\u0E23\u0E27\u0E21")) continue;
    const district = normalizeDistrict(columns.district >= 0 ? row[columns.district] : void 0, options.district);
    if (!district) continue;
    const assessmentLevel = normalizeAssessmentLevel(row[columns.level]);
    const no = safePositiveInteger(row[columns.no], clinics.length + 1);
    clinics.push({
      id: `STN-${options.idPrefix || district}-${no}`,
      no,
      district,
      name,
      type: normalizeCell(row[columns.type]) || "\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E40\u0E27\u0E0A\u0E01\u0E23\u0E23\u0E21",
      licensee: normalizeCell(row[columns.licensee]) || "-",
      assessmentStatus: normalizeAssessmentStatus(row[columns.status], assessmentLevel),
      assessmentLevel,
      passCriteria: normalizePassCriteria(row[columns.pass], assessmentLevel),
      remarks: normalizeCell(row[columns.remarks])
    });
  }
  return clinics;
}
function parseClinicRegistryRows(rows) {
  if (rows.length < 2) return [];
  const indexes = headerIndexes(rows);
  return rows.slice(1).flatMap((row, index) => {
    const clinicId = rowValue(row, indexes, "clinicId");
    const district = normalizeDistrict(rowValue(row, indexes, "district"));
    const name = rowValue(row, indexes, "name");
    if (!clinicId || !district || !name) return [];
    const rawBusinessStatus = rowValue(row, indexes, "businessStatus");
    const businessStatus = BUSINESS_STATUSES.includes(rawBusinessStatus) ? rawBusinessStatus : "\u0E40\u0E1B\u0E34\u0E14\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23";
    return [{
      clinicId,
      district,
      no: safePositiveInteger(rowValue(row, indexes, "no"), index + 1),
      name,
      type: rowValue(row, indexes, "type") || "\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E40\u0E27\u0E0A\u0E01\u0E23\u0E23\u0E21",
      licensee: rowValue(row, indexes, "licensee") || "-",
      address: rowValue(row, indexes, "address"),
      phone: rowValue(row, indexes, "phone"),
      latitude: nullableNumber(rowValue(row, indexes, "latitude")),
      longitude: nullableNumber(rowValue(row, indexes, "longitude")),
      businessStatus,
      businessStatusNote: rowValue(row, indexes, "businessStatusNote"),
      updatedAt: rowValue(row, indexes, "updatedAt"),
      updatedBy: rowValue(row, indexes, "updatedBy"),
      rowNumber: index + 2
    }];
  });
}
function parseAssessmentRows(rows) {
  if (rows.length < 2) return [];
  const indexes = headerIndexes(rows);
  return rows.slice(1).flatMap((row, index) => {
    const clinicId = rowValue(row, indexes, "clinicId");
    const fiscalYear = Number.parseInt(rowValue(row, indexes, "fiscalYear"), 10);
    if (!clinicId || !Number.isInteger(fiscalYear)) return [];
    const level = normalizeAssessmentLevel(rowValue(row, indexes, "assessmentLevel"));
    return [{
      id: rowValue(row, indexes, "id") || `assessment-${clinicId}-${fiscalYear}`,
      fiscalYear,
      clinicId,
      assessmentStatus: normalizeAssessmentStatus(rowValue(row, indexes, "assessmentStatus"), level),
      assessmentLevel: level,
      passCriteria: normalizePassCriteria(rowValue(row, indexes, "passCriteria"), level),
      assessmentDate: rowValue(row, indexes, "assessmentDate"),
      remarks: rowValue(row, indexes, "remarks"),
      updatedAt: rowValue(row, indexes, "updatedAt"),
      updatedBy: rowValue(row, indexes, "updatedBy"),
      rowNumber: index + 2
    }];
  });
}
function parseAssessmentPeriodRows(rows) {
  if (rows.length < 2) return [];
  const indexes = headerIndexes(rows);
  return rows.slice(1).flatMap((row) => {
    const fiscalYear = Number.parseInt(rowValue(row, indexes, "fiscalYear"), 10);
    if (!Number.isInteger(fiscalYear)) return [];
    return [{ fiscalYear, label: rowValue(row, indexes, "label"), startDate: rowValue(row, indexes, "startDate"), endDate: rowValue(row, indexes, "endDate"), targetPercentage: nullableNumber(rowValue(row, indexes, "targetPercentage")) }];
  });
}
function selectedFiscalYear(assessments, periods, now = /* @__PURE__ */ new Date()) {
  const date = now.toISOString().slice(0, 10);
  const active = periods.filter((period) => period.startDate && period.endDate && period.startDate <= date && date <= period.endDate).map((period) => period.fiscalYear);
  if (active.length) return Math.max(...active);
  const years = [...assessments.map((item) => item.fiscalYear), ...periods.map((item) => item.fiscalYear)];
  return years.length ? Math.max(...years) : void 0;
}
function mergeClinicData(registry, assessments, periods = []) {
  const preferredYear = selectedFiscalYear(assessments, periods);
  return registry.map((record) => {
    const candidates = assessments.filter((item) => item.clinicId === record.clinicId);
    const assessment = candidates.find((item) => item.fiscalYear === preferredYear) || candidates.sort((a, b) => b.fiscalYear - a.fiscalYear || b.updatedAt.localeCompare(a.updatedAt))[0];
    const timestampVersion = assessment?.updatedAt || record.updatedAt;
    const version = timestampVersion || `legacy_${createHash("sha256").update(JSON.stringify({
      clinicId: record.clinicId,
      district: record.district,
      no: record.no,
      name: record.name,
      type: record.type,
      licensee: record.licensee,
      address: record.address,
      phone: record.phone,
      latitude: record.latitude,
      longitude: record.longitude,
      businessStatus: record.businessStatus,
      businessStatusNote: record.businessStatusNote,
      assessment: assessment ? {
        id: assessment.id,
        fiscalYear: assessment.fiscalYear,
        assessmentStatus: assessment.assessmentStatus,
        assessmentLevel: assessment.assessmentLevel,
        passCriteria: assessment.passCriteria,
        assessmentDate: assessment.assessmentDate,
        remarks: assessment.remarks
      } : null
    })).digest("hex").slice(0, 24)}`;
    return {
      id: record.clinicId,
      version,
      no: record.no,
      district: record.district,
      name: record.name,
      type: record.type,
      licensee: record.licensee,
      address: record.address,
      phone: record.phone,
      latitude: record.latitude,
      longitude: record.longitude,
      businessStatus: record.businessStatus,
      businessStatusNote: record.businessStatusNote,
      updatedAt: assessment?.updatedAt || record.updatedAt,
      updatedBy: assessment?.updatedBy || record.updatedBy,
      fiscalYear: assessment?.fiscalYear || preferredYear,
      assessmentDate: assessment?.assessmentDate || "",
      assessmentStatus: assessment?.assessmentStatus || "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19",
      assessmentLevel: assessment?.assessmentLevel ?? null,
      passCriteria: assessment?.passCriteria || "\u0E23\u0E2D\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19",
      remarks: assessment?.remarks || ""
    };
  });
}
function parseAuditLogRows(rows) {
  return rows.slice(1).filter((row) => {
    const id = normalizeCell(row[0]);
    return id && !id.startsWith("lock_") && !id.startsWith("unlock_");
  }).map((row) => ({
    id: normalizeCell(row[0]),
    timestamp: normalizeCell(row[1]),
    district: normalizeCell(row[2]),
    clinicName: normalizeCell(row[3]),
    previousStatus: normalizeCell(row[4]),
    newStatus: normalizeCell(row[5]),
    previousLevel: normalizeCell(row[6]),
    newLevel: normalizeCell(row[7]),
    editedBy: normalizeCell(row[8]),
    remarks: normalizeCell(row[9]),
    telegramSent: true
  })).reverse();
}
function validateSpreadsheetId(spreadsheetId2) {
  const value = spreadsheetId2.trim();
  if (!/^[a-zA-Z0-9_-]{20,100}$/.test(value)) throw new Error("Spreadsheet ID \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
  return value;
}
function configuredSpreadsheetId() {
  return validateSpreadsheetId(process.env.CLINIC_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID);
}
function base64Url(value) {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function getServiceAccountAccessToken(scope = "https://www.googleapis.com/auth/spreadsheets.readonly") {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!clientEmail || !privateKey) throw new Error("\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 Google service account");
  const issuedAt = Math.floor(Date.now() / 1e3);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ iss: clientEmail, scope, aud: "https://oauth2.googleapis.com/token", iat: issuedAt, exp: issuedAt + 3600 }));
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey, "base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsignedToken}.${signature}` }) });
  const json = await response.json();
  if (!response.ok || !json.access_token) throw new Error(json.error_description || json.error || "Google service account authentication failed");
  return json.access_token;
}
function sheetRange(sheetName, range) {
  const name = `'${sheetName.replace(/'/g, "''")}'`;
  return range ? `${name}!${range}` : name;
}
async function googleRequest(spreadsheetId2, path2, init, token) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId2)}${path2}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.body ? { "Content-Type": "application/json" } : {}, ...init.headers }
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json.error?.message || `Google Sheets API \u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A HTTP ${response.status}`;
    throw new Error(response.status === 403 ? `${message} \u0E01\u0E23\u0E38\u0E13\u0E32\u0E41\u0E0A\u0E23\u0E4C Google Sheet \u0E43\u0E2B\u0E49 service account \u0E40\u0E1B\u0E47\u0E19 Editor` : message);
  }
  return json;
}
async function batchGet(spreadsheetId2, token, sheetNames) {
  const params = new URLSearchParams({ majorDimension: "ROWS" });
  sheetNames.forEach((name) => params.append("ranges", sheetRange(name)));
  const result = await googleRequest(spreadsheetId2, `/values:batchGet?${params}`, {}, token);
  return sheetNames.map((_, index) => result.valueRanges?.[index]?.values || []);
}
async function loadViaGoogleSheetsApi(spreadsheetId2) {
  const token = await getServiceAccountAccessToken();
  try {
    const [registryRows, assessmentRows, periodRows, auditRows] = await batchGet(spreadsheetId2, token, [CLINIC_REGISTRY_SHEET, ASSESSMENTS_SHEET, ASSESSMENT_PERIODS_SHEET, AUDIT_LOG_SHEET]);
    const registry = parseClinicRegistryRows(registryRows).filter((record) => !isSoftDeleted(record));
    if (registry.length || registryRows.length) {
      const assessmentPeriods = parseAssessmentPeriodRows(periodRows);
      return { clinics: mergeClinicData(registry, parseAssessmentRows(assessmentRows), assessmentPeriods), auditLogs: parseAuditLogRows(auditRows), assessmentPeriods, source: "google-sheets-api" };
    }
  } catch (error) {
    console.warn("Confirmed clinic sheets unavailable; trying legacy district tabs", error);
  }
  const rows = await batchGet(spreadsheetId2, token, [...DISTRICTS, AUDIT_LOG_SHEET]);
  const clinics = DISTRICTS.flatMap((district, index) => parseClinicRows(rows[index] || [], { district, idPrefix: district }));
  return { clinics: deduplicateClinics(clinics), auditLogs: parseAuditLogRows(rows[DISTRICTS.length] || []), source: "google-sheets-api" };
}
async function fetchPublicCsv(spreadsheetId2, selector) {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId2)}/gviz/tq`);
  url.searchParams.set("tqx", "out:csv");
  if (selector.sheet) url.searchParams.set("sheet", selector.sheet);
  if (selector.gid) url.searchParams.set("gid", selector.gid);
  const response = await fetch(url, { headers: { Accept: "text/csv,text/plain;q=0.9,*/*;q=0.1", "User-Agent": "RDU-Clinics-Satun/1.0" }, redirect: "follow" });
  if (!response.ok) {
    const error = new Error(response.status === 401 || response.status === 403 ? "Google Sheet \u0E22\u0E31\u0E07\u0E08\u0E33\u0E01\u0E31\u0E14\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E01\u0E32\u0E23\u0E2D\u0E48\u0E32\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E41\u0E0A\u0E23\u0E4C\u0E43\u0E2B\u0E49 service account \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E1B\u0E34\u0E14\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E1C\u0E39\u0E49\u0E17\u0E35\u0E48\u0E21\u0E35\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E40\u0E1B\u0E47\u0E19\u0E1C\u0E39\u0E49\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E14\u0E39" : `Google Sheets CSV \u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A HTTP ${response.status}`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  const text = await response.text();
  if (/^\s*</.test(text) || /google\.visualization\.Query\.setResponse/.test(text)) throw new Error("Google Sheets \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 CSV \u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32");
  return text;
}
function deduplicateClinics(clinics) {
  const seen = /* @__PURE__ */ new Set();
  return clinics.filter((clinic) => {
    const key = `${clinic.district}|${clinic.name}`.toLocaleLowerCase("th-TH");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
async function loadViaPublicCsv(spreadsheetId2, gid) {
  const results = await Promise.allSettled(DISTRICTS.map(async (district) => parseClinicRows(parseCsv(await fetchPublicCsv(spreadsheetId2, { sheet: district })), { district, idPrefix: district })));
  let clinics = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!clinics.length) clinics = parseClinicRows(parseCsv(await fetchPublicCsv(spreadsheetId2, { gid })), { idPrefix: `GID-${gid}` });
  let auditLogs = [];
  try {
    auditLogs = parseAuditLogRows(parseCsv(await fetchPublicCsv(spreadsheetId2, { sheet: AUDIT_LOG_SHEET })));
  } catch {
  }
  clinics = deduplicateClinics(clinics);
  if (!clinics.length) {
    const rejected = results.find((result) => result.status === "rejected");
    if (rejected) throw rejected.reason;
    throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E43\u0E19 Google Sheet");
  }
  return { clinics, auditLogs, source: "public-csv" };
}
async function loadGoogleSheetData(spreadsheetId2 = DEFAULT_SPREADSHEET_ID, gid = DEFAULT_SHEET_GID) {
  const validSpreadsheetId = validateSpreadsheetId(spreadsheetId2);
  const validGid = /^\d+$/.test(gid) ? gid : DEFAULT_SHEET_GID;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    try {
      return await loadViaGoogleSheetsApi(validSpreadsheetId);
    } catch (error) {
      console.warn("Google Sheets API failed; trying public CSV fallback", error);
    }
  }
  return loadViaPublicCsv(validSpreadsheetId, validGid);
}
function clean(value, field, max, required = false) {
  const result = normalizeCell(value).slice(0, max);
  if (required && !result) throw new ClinicMutationError("INVALID_CLINIC", `\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 ${field}`, 400);
  return result;
}
function validateClinicId(value) {
  const id = clean(value, "clinicId", 100, true);
  if (!/^[A-Za-z0-9_-]{3,100}$/.test(id)) throw new ClinicMutationError("INVALID_CLINIC_ID", "clinicId \u0E15\u0E49\u0E2D\u0E07\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E14\u0E49\u0E27\u0E22\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23 \u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 _ \u0E2B\u0E23\u0E37\u0E2D -", 400);
  return id;
}
function numberInRange(value, field, min, max, nullable = false) {
  if ((value === "" || value === null || value === void 0) && nullable) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new ClinicMutationError("INVALID_CLINIC", `${field} \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07`, 400);
  return parsed;
}
function sanitizeClinic(input, base, actor, isCreate) {
  const pick = (key) => Object.prototype.hasOwnProperty.call(input, key) ? input[key] : void 0;
  const districtRaw = pick("district") ?? base?.district;
  const district = normalizeDistrict(districtRaw);
  if (!district || normalizeCell(districtRaw) !== district) throw new ClinicMutationError("INVALID_CLINIC", "\u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07", 400);
  const statusRaw = clean(pick("assessmentStatus") ?? base?.assessmentStatus ?? "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19", "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19", 30, true);
  if (!ASSESSMENT_STATUSES.includes(statusRaw)) throw new ClinicMutationError("INVALID_CLINIC", "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07", 400);
  const status = statusRaw;
  let level = (pick("assessmentLevel") !== void 0 ? pick("assessmentLevel") : base?.assessmentLevel) ?? null;
  level = level === null ? null : numberInRange(level, "\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19", 1, 3);
  if (status !== "\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E41\u0E25\u0E49\u0E27") level = null;
  const passCriteria = status === "\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E41\u0E25\u0E49\u0E27" ? level !== null && level >= 2 ? "\u0E1C\u0E48\u0E32\u0E19" : "\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19" : "\u0E23\u0E2D\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19";
  const requestedPass = pick("passCriteria");
  if (requestedPass !== void 0 && clean(requestedPass, "\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E1C\u0E48\u0E32\u0E19", 30, true) !== passCriteria) {
    throw new ClinicMutationError("INVALID_CLINIC", "\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E2A\u0E2D\u0E14\u0E04\u0E25\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E1A\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19", 400);
  }
  const businessRaw = clean(pick("businessStatus") ?? base?.businessStatus ?? "\u0E40\u0E1B\u0E34\u0E14\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23", "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E34\u0E08\u0E01\u0E32\u0E23", 30, true);
  if (!BUSINESS_STATUSES.includes(businessRaw)) throw new ClinicMutationError("INVALID_CLINIC", "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E34\u0E08\u0E01\u0E32\u0E23\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07", 400);
  const fiscalYear = Math.trunc(numberInRange(pick("fiscalYear") ?? base?.fiscalYear ?? 2569, "\u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13", 2400, 3e3));
  const no = Math.trunc(numberInRange(pick("no") ?? base?.no ?? 1, "\u0E25\u0E33\u0E14\u0E31\u0E1A", 1, 1e5));
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: isCreate ? validateClinicId(input.clinicId || `STN-${randomUUID()}`) : validateClinicId(base?.id),
    version: updatedAt,
    no,
    district,
    name: clean(pick("name") ?? base?.name, "\u0E0A\u0E37\u0E48\u0E2D\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01", 300, true),
    type: clean(pick("type") ?? base?.type, "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01", 200, true),
    licensee: clean(pick("licensee") ?? base?.licensee, "\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15", 300, true),
    address: clean(pick("address") ?? base?.address, "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48", 1e3),
    phone: clean(pick("phone") ?? base?.phone, "\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C", 100),
    latitude: numberInRange(pick("latitude") !== void 0 ? pick("latitude") : base?.latitude, "\u0E25\u0E30\u0E15\u0E34\u0E08\u0E39\u0E14", -90, 90, true),
    longitude: numberInRange(pick("longitude") !== void 0 ? pick("longitude") : base?.longitude, "\u0E25\u0E2D\u0E07\u0E08\u0E34\u0E08\u0E39\u0E14", -180, 180, true),
    businessStatus: businessRaw,
    businessStatusNote: clean(pick("businessStatusNote") ?? base?.businessStatusNote, "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E34\u0E08\u0E01\u0E32\u0E23", 1e3),
    fiscalYear,
    assessmentDate: clean(pick("assessmentDate") ?? base?.assessmentDate, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19", 40),
    assessmentStatus: status,
    assessmentLevel: level,
    passCriteria,
    remarks: clean(pick("remarks") ?? base?.remarks, "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38", 2e3),
    updatedAt,
    updatedBy: clean(actor, "\u0E1C\u0E39\u0E49\u0E41\u0E01\u0E49\u0E44\u0E02", 320, true)
  };
}
function registryRow(clinic) {
  return [clinic.id, clinic.district, clinic.no, clinic.name, clinic.type, clinic.licensee, clinic.address || "", clinic.phone || "", clinic.latitude ?? "", clinic.longitude ?? "", clinic.businessStatus || "\u0E40\u0E1B\u0E34\u0E14\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23", clinic.businessStatusNote || "", clinic.updatedAt || "", clinic.updatedBy || ""];
}
function assessmentRow(clinic, id) {
  return [id || `asm_${randomUUID()}`, clinic.fiscalYear || 2569, clinic.id, clinic.assessmentStatus, clinic.assessmentLevel ?? "", clinic.passCriteria, clinic.assessmentDate || "", clinic.remarks, clinic.updatedAt || "", clinic.updatedBy || ""];
}
async function appendValues(spreadsheetId2, token, sheet, columns, values) {
  await googleRequest(spreadsheetId2, `/values/${encodeURIComponent(sheetRange(sheet, columns))}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", body: JSON.stringify({ majorDimension: "ROWS", values }) }, token);
}
function auditRow(before, after, actor, action) {
  const clinic = after || before;
  if (!clinic) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A Audit Log");
  return [`audit_${randomUUID()}`, (/* @__PURE__ */ new Date()).toISOString(), clinic.district, clinic.name, before?.assessmentStatus || "", after?.assessmentStatus || action, before?.assessmentLevel ?? "", after?.assessmentLevel ?? "", actor, action];
}
function rowData(values) {
  return {
    values: values.map((value) => ({
      userEnteredValue: typeof value === "number" ? { numberValue: value } : typeof value === "boolean" ? { boolValue: value } : { stringValue: String(value) }
    }))
  };
}
function appendCells(sheetId, values) {
  return { appendCells: { sheetId, rows: [rowData(values)], fields: "userEnteredValue" } };
}
function updateCells(sheetId, rowNumber, values) {
  return {
    updateCells: {
      range: { sheetId, startRowIndex: rowNumber - 1, endRowIndex: rowNumber, startColumnIndex: 0, endColumnIndex: values.length },
      rows: [rowData(values)],
      fields: "userEnteredValue"
    }
  };
}
async function atomicBatchUpdate(spreadsheetId2, token, requests) {
  await googleRequest(spreadsheetId2, ":batchUpdate", { method: "POST", body: JSON.stringify({ requests }) }, token);
}
var sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function withMutationLock(lockKey, task) {
  const spreadsheetId2 = configuredSpreadsheetId();
  const token = await getServiceAccountAccessToken(WRITE_SCOPE);
  const lockToken = randomUUID();
  const lockId = `lock_${lockToken}`;
  const acquiredAt = (/* @__PURE__ */ new Date()).toISOString();
  await appendValues(spreadsheetId2, token, AUDIT_LOG_SHEET, "A:J", [[lockId, acquiredAt, "", "", "LOCK", lockKey, "", "", "system", lockToken]]);
  try {
    const ownsLock = async () => {
      const [rows] = await batchGet(spreadsheetId2, token, [AUDIT_LOG_SHEET]);
      const released = new Set(rows.slice(1).filter((row) => normalizeCell(row[0]).startsWith("unlock_")).map((row) => normalizeCell(row[9])));
      const activeLocks = rows.slice(1).filter((row) => {
        const id = normalizeCell(row[0]);
        const timestamp = Date.parse(normalizeCell(row[1]));
        return id.startsWith("lock_") && normalizeCell(row[5]) === lockKey && !released.has(normalizeCell(row[9])) && Number.isFinite(timestamp) && timestamp >= Date.now() - 12e4;
      });
      return normalizeCell(activeLocks[0]?.[0]) === lockId;
    };
    const assertOwnership = async () => {
      if (!await ownsLock()) throw new ClinicMutationError("CLINIC_LOCK_LOST", "\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E01\u0E49\u0E44\u0E02\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E41\u0E25\u0E30\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07", 409);
    };
    const deadline = Date.now() + 1e4;
    while (Date.now() < deadline) {
      if (await ownsLock()) return await task(spreadsheetId2, token, assertOwnership);
      await sleep(200);
    }
    throw new ClinicMutationError("CLINIC_BUSY", "\u0E21\u0E35\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E01\u0E33\u0E25\u0E31\u0E07\u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07", 409);
  } finally {
    await appendValues(spreadsheetId2, token, AUDIT_LOG_SHEET, "A:J", [[`unlock_${lockToken}`, (/* @__PURE__ */ new Date()).toISOString(), "", "", "UNLOCK", lockKey, "", "", "system", lockToken]]).catch((error) => {
      console.error("Unable to release Google Sheets mutation lock", error);
    });
  }
}
async function mutationContext(spreadsheetId2, token) {
  const [registryRows, assessmentRows] = await batchGet(spreadsheetId2, token, [CLINIC_REGISTRY_SHEET, ASSESSMENTS_SHEET]);
  const hasHeaders = (rows, expected) => expected.every((header, index) => normalizeCell(rows[0]?.[index]) === header);
  if (!hasHeaders(registryRows, REGISTRY_HEADERS)) throw new Error(`\u0E0A\u0E35\u0E15 ${CLINIC_REGISTRY_SHEET} \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A schema \u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14`);
  if (!hasHeaders(assessmentRows, ASSESSMENT_HEADERS)) throw new Error(`\u0E0A\u0E35\u0E15 ${ASSESSMENTS_SHEET} \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A schema \u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14`);
  const metadata = await googleRequest(spreadsheetId2, "?fields=sheets.properties(sheetId,title)", {}, token);
  const ids = new Map(metadata.sheets?.flatMap((sheet) => sheet.properties?.title && sheet.properties.sheetId !== void 0 ? [[sheet.properties.title, sheet.properties.sheetId]] : []) || []);
  const registrySheetId = ids.get(CLINIC_REGISTRY_SHEET);
  const assessmentSheetId = ids.get(ASSESSMENTS_SHEET);
  const auditSheetId = ids.get(AUDIT_LOG_SHEET);
  if (registrySheetId === void 0 || assessmentSheetId === void 0 || auditSheetId === void 0) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E0A\u0E35\u0E15\u0E17\u0E35\u0E48\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01");
  return { spreadsheetId: spreadsheetId2, token, registryRows, assessmentRows, registrySheetId, assessmentSheetId, auditSheetId };
}
function findUniqueRegistry(records, clinicId) {
  const matches = records.filter((record) => record.clinicId === clinicId && !isSoftDeleted(record));
  if (!matches.length) throw new ClinicMutationError("CLINIC_NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38", 404);
  if (matches.length > 1) throw new ClinicMutationError("DUPLICATE_CLINIC_ID", "\u0E1E\u0E1A clinicId \u0E0B\u0E49\u0E33\u0E43\u0E19 ClinicRegistry \u0E01\u0E23\u0E38\u0E13\u0E32\u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E48\u0E2D\u0E19", 409);
  return matches[0];
}
function normalizedExisting(record, assessments) {
  return mergeClinicData([record], assessments)[0];
}
function assertExpectedVersion(input, currentVersion) {
  const expected = normalizeCell(input.expectedVersion);
  if (!expected || expected !== currentVersion) {
    throw new ClinicMutationError("CLINIC_VERSION_CONFLICT", "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E16\u0E39\u0E01\u0E41\u0E01\u0E49\u0E44\u0E02\u0E42\u0E14\u0E22\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E2D\u0E37\u0E48\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E01\u0E48\u0E2D\u0E19\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07", 409);
  }
}
async function createClinic(input, actor) {
  return withMutationLock("clinic:create", async (spreadsheetId2, token, assertOwnership) => {
    const context = await mutationContext(spreadsheetId2, token);
    const records = parseClinicRegistryRows(context.registryRows);
    const candidate = sanitizeClinic({ ...input, no: input.no ?? Math.max(0, ...records.filter((record) => normalizeDistrict(input.district) === record.district).map((record) => record.no)) + 1 }, void 0, actor, true);
    if (records.some((record) => record.clinicId === candidate.id)) throw new ClinicMutationError("CLINIC_ID_EXISTS", "clinicId \u0E19\u0E35\u0E49\u0E40\u0E04\u0E22\u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27\u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E19\u0E33\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E43\u0E0A\u0E49\u0E0B\u0E49\u0E33\u0E44\u0E14\u0E49", 409);
    await assertOwnership();
    await atomicBatchUpdate(spreadsheetId2, token, [
      appendCells(context.registrySheetId, registryRow(candidate)),
      appendCells(context.assessmentSheetId, assessmentRow(candidate)),
      appendCells(context.auditSheetId, auditRow(void 0, candidate, actor, "CREATE"))
    ]);
    return candidate;
  });
}
async function updateClinic(clinicId, input, actor) {
  const id = validateClinicId(clinicId);
  if (input.clinicId !== void 0 && validateClinicId(input.clinicId) !== id) throw new ClinicMutationError("IMMUTABLE_CLINIC_ID", "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19 clinicId \u0E44\u0E14\u0E49", 400);
  return withMutationLock(`clinic:${id}`, async (spreadsheetId2, token, assertOwnership) => {
    const context = await mutationContext(spreadsheetId2, token);
    const assessments = parseAssessmentRows(context.assessmentRows);
    const record = findUniqueRegistry(parseClinicRegistryRows(context.registryRows), id);
    const before = normalizedExisting(record, assessments);
    assertExpectedVersion(input, before.version);
    if (input.fiscalYear !== void 0 && Number(input.fiscalYear) !== before.fiscalYear) {
      throw new ClinicMutationError("IMMUTABLE_FISCAL_YEAR", "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E02\u0E2D\u0E07\u0E1C\u0E25\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E40\u0E14\u0E34\u0E21\u0E44\u0E14\u0E49", 400);
    }
    const after = sanitizeClinic({ ...input, fiscalYear: before.fiscalYear }, before, actor, false);
    const sameYear = assessments.filter((item) => item.clinicId === id && item.fiscalYear === after.fiscalYear);
    if (sameYear.length > 1) throw new ClinicMutationError("DUPLICATE_ASSESSMENT", "\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E0B\u0E49\u0E33\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E41\u0E25\u0E30\u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E19\u0E35\u0E49", 409);
    const assessment = sameYear[0];
    const requests = [updateCells(context.registrySheetId, record.rowNumber, registryRow(after))];
    requests.push(assessment ? updateCells(context.assessmentSheetId, assessment.rowNumber, assessmentRow(after, assessment.id)) : appendCells(context.assessmentSheetId, assessmentRow(after)));
    requests.push(appendCells(context.auditSheetId, auditRow(before, after, actor, "UPDATE")));
    await assertOwnership();
    await atomicBatchUpdate(spreadsheetId2, token, requests);
    return after;
  });
}
async function deleteClinic(clinicId, actor, input = {}) {
  const id = validateClinicId(clinicId);
  return withMutationLock(`clinic:${id}`, async (spreadsheetId2, token, assertOwnership) => {
    const context = await mutationContext(spreadsheetId2, token);
    const assessments = parseAssessmentRows(context.assessmentRows);
    const record = findUniqueRegistry(parseClinicRegistryRows(context.registryRows), id);
    const before = normalizedExisting(record, assessments);
    assertExpectedVersion(input, before.version);
    const deleted = {
      ...before,
      businessStatus: "\u0E1B\u0E34\u0E14\u0E01\u0E34\u0E08\u0E01\u0E32\u0E23",
      businessStatusNote: `${DELETED_MARKER} ${before.businessStatusNote || ""}`.trim(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: clean(actor, "\u0E1C\u0E39\u0E49\u0E41\u0E01\u0E49\u0E44\u0E02", 320, true)
    };
    await assertOwnership();
    await atomicBatchUpdate(spreadsheetId2, token, [
      updateCells(context.registrySheetId, record.rowNumber, registryRow(deleted)),
      appendCells(context.auditSheetId, auditRow(before, void 0, actor, "DELETE"))
    ]);
    return before;
  });
}

// src/server/telegram.ts
var DEFAULT_DASHBOARD_URL = "https://rdu-clinics-satun.vercel.app";
function envValue(name) {
  const value = process.env[name]?.trim();
  return value || void 0;
}
function telegramConfig() {
  const botToken = envValue("TELEGRAM_BOT_TOKEN") || envValue("VITE_TELEGRAM_BOT_TOKEN");
  const chatId = envValue("TELEGRAM_CHAT_ID") || envValue("VITE_TELEGRAM_CHAT_ID");
  if (!botToken || !chatId) {
    throw new Error("\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 Telegram Bot Token \u0E2B\u0E23\u0E37\u0E2D Chat ID \u0E1A\u0E19\u0E40\u0E0B\u0E34\u0E23\u0E4C\u0E1F\u0E40\u0E27\u0E2D\u0E23\u0E4C");
  }
  return { botToken, chatId };
}
function isTelegramConfigured() {
  return Boolean(
    (envValue("TELEGRAM_BOT_TOKEN") || envValue("VITE_TELEGRAM_BOT_TOKEN")) && (envValue("TELEGRAM_CHAT_ID") || envValue("VITE_TELEGRAM_CHAT_ID"))
  );
}
function telegramDashboardUrl() {
  const configuredUrl = envValue("DASHBOARD_URL");
  if (!configuredUrl) return DEFAULT_DASHBOARD_URL;
  try {
    const url = new URL(configuredUrl);
    return url.protocol === "https:" ? url.toString().replace(/\/$/, "") : DEFAULT_DASHBOARD_URL;
  } catch {
    return DEFAULT_DASHBOARD_URL;
  }
}
function escapeTelegramHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function buildClinicUpdateMessage(notification) {
  const levelText = notification.assessmentLevel !== null ? `\u0E23\u0E30\u0E14\u0E31\u0E1A ${notification.assessmentLevel} \u2B50` : "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38";
  const passText = notification.assessmentLevel !== null && notification.assessmentLevel >= 2 ? "\u2705 \u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C (\u2265\u0E23\u0E30\u0E14\u0E31\u0E1A 2)" : "\u23F3 \u0E23\u0E2D\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19/\u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E38\u0E07";
  return `\u{1F514} <b>[\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15 RDU \u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E40\u0E2D\u0E01\u0E0A\u0E19 \u0E2A\u0E15\u0E39\u0E25]</b>

\u{1F3E5} <b>\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01:</b> ${escapeTelegramHtml(notification.clinicName)}
\u{1F4CD} <b>\u0E2D\u0E33\u0E40\u0E20\u0E2D:</b> ${escapeTelegramHtml(notification.district)}
\u{1F4CA} <b>\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19:</b> ${escapeTelegramHtml(notification.assessmentStatus)}
\u2B50 <b>\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E17\u0E35\u0E48\u0E44\u0E14\u0E49:</b> ${escapeTelegramHtml(levelText)}
\u{1F3AF} <b>\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19:</b> ${escapeTelegramHtml(passText)}
\u{1F464} <b>\u0E1C\u0E39\u0E49\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01:</b> ${escapeTelegramHtml(notification.editedBy)}
\u{1F4DD} <b>\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38:</b> ${escapeTelegramHtml(notification.remarks)}

\u{1F5D3}\uFE0F <b>\u0E40\u0E27\u0E25\u0E32\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01:</b> ${escapeTelegramHtml(notification.timestamp)} \u0E19.`;
}
function dashboardReplyMarkup() {
  return {
    inline_keyboard: [
      [
        {
          text: "\u{1F310} \u0E40\u0E1B\u0E34\u0E14\u0E23\u0E30\u0E1A\u0E1A Dashboard",
          url: telegramDashboardUrl()
        }
      ]
    ]
  };
}
async function sendTelegramMessage(text, parseMode) {
  const { botToken, chatId } = telegramConfig();
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
      reply_markup: dashboardReplyMarkup()
    })
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) {
    throw new Error(
      json?.description || `Telegram Bot API \u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A HTTP ${response.status}`
    );
  }
  return { messageId: json.result?.message_id ?? null };
}
async function sendClinicUpdateNotification(notification) {
  return sendTelegramMessage(buildClinicUpdateMessage(notification), "HTML");
}

// src/server/userRepository.ts
import { createHash as createHash2 } from "node:crypto";
var WRITE_SCOPE2 = "https://www.googleapis.com/auth/spreadsheets";
var SYSTEM_USERS_SHEET = "SystemUsers";
var OWNER_EMAIL = "akaporn1234@gmail.com";
var USER_HEADERS = [
  "id",
  "emailOrId",
  "name",
  "firstName",
  "lastName",
  "position",
  "workGroup",
  "affiliation",
  "phone",
  "provider",
  "role",
  "status",
  "createdAt",
  "approvedBy",
  "approvedAt",
  "avatarUrl",
  "updatedAt"
];
var OWNER_USER = {
  id: "usr_super_admin",
  emailOrId: OWNER_EMAIL,
  name: "\u0E40\u0E2D\u0E01\u0E20\u0E23\u0E13\u0E4C \u0E2A\u0E38\u0E27\u0E23\u0E23\u0E13\u0E09\u0E27\u0E35",
  firstName: "\u0E40\u0E2D\u0E01\u0E20\u0E23\u0E13\u0E4C",
  lastName: "\u0E2A\u0E38\u0E27\u0E23\u0E23\u0E13\u0E09\u0E27\u0E35",
  position: "\u0E20\u0E01.\u0E0A\u0E33\u0E19\u0E32\u0E0D\u0E01\u0E32\u0E23\u0E1E\u0E34\u0E40\u0E28\u0E29 (Super Admin)",
  workGroup: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E40\u0E20\u0E2A\u0E31\u0E0A\u0E01\u0E23\u0E23\u0E21\u0E41\u0E25\u0E30\u0E04\u0E38\u0E49\u0E21\u0E04\u0E23\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E1A\u0E23\u0E34\u0E42\u0E20\u0E04",
  affiliation: "\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2A\u0E32\u0E18\u0E32\u0E23\u0E13\u0E2A\u0E38\u0E02\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E2A\u0E15\u0E39\u0E25",
  phone: "081-234-5678",
  provider: "google",
  role: "super_admin",
  status: "active",
  createdAt: "2569-01-01 09:00",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
};
function spreadsheetId() {
  return process.env.USER_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID;
}
function sheetRange2(range) {
  return `'${SYSTEM_USERS_SHEET}'!${range}`;
}
function normalizeIdentifier(value) {
  return value.trim().toLocaleLowerCase("en-US");
}
function cleanCell(value) {
  return String(value ?? "").trim();
}
function isProvider(value) {
  return value === "google" || value === "line";
}
function isRole(value) {
  return ["super_admin", "admin", "viewer", "user"].includes(value);
}
function isStatus(value) {
  return ["pending", "active", "suspended", "blocked"].includes(value);
}
function stableUserId(provider, identifier) {
  const digest = createHash2("sha256").update(`${provider}:${normalizeIdentifier(identifier)}`).digest("hex").slice(0, 18);
  return `usr_${provider}_${digest}`;
}
function userToRow(user) {
  return USER_HEADERS.map((header) => cleanCell(user[header]));
}
function parseUserRows(rows) {
  if (rows.length === 0) return [];
  const header = rows[0].map(cleanCell);
  const indexes = new Map(header.map((name, index) => [name, index]));
  const value = (row, name) => cleanCell(row[indexes.get(name) ?? -1]);
  return rows.slice(1).flatMap((row) => {
    const provider = value(row, "provider");
    const role = value(row, "role");
    const status = value(row, "status");
    const emailOrId = value(row, "emailOrId");
    if (!emailOrId || !isProvider(provider) || !isRole(role) || !isStatus(status)) {
      return [];
    }
    const user = {
      id: value(row, "id") || stableUserId(provider, emailOrId),
      emailOrId,
      name: value(row, "name") || emailOrId,
      firstName: value(row, "firstName"),
      lastName: value(row, "lastName"),
      position: value(row, "position"),
      workGroup: value(row, "workGroup"),
      affiliation: value(row, "affiliation"),
      phone: value(row, "phone"),
      provider,
      role,
      status,
      createdAt: value(row, "createdAt"),
      approvedBy: value(row, "approvedBy"),
      approvedAt: value(row, "approvedAt"),
      avatarUrl: value(row, "avatarUrl"),
      updatedAt: value(row, "updatedAt")
    };
    return [user];
  });
}
async function googleRequest2(path2, init = {}, accessToken) {
  const token = accessToken || await getServiceAccountAccessToken(WRITE_SCOPE2);
  const response = await fetch(`https://sheets.googleapis.com/v4/${path2}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.body ? { "Content-Type": "application/json" } : {},
      ...init.headers
    }
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json.error?.message || `Google Sheets API \u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A HTTP ${response.status}`;
    if (response.status === 403) {
      throw new Error(
        `${message} \u0E01\u0E23\u0E38\u0E13\u0E32\u0E41\u0E0A\u0E23\u0E4C Google Sheet \u0E43\u0E2B\u0E49 service account \u0E40\u0E1B\u0E47\u0E19 Editor`
      );
    }
    throw new Error(message);
  }
  return json;
}
async function getSheetMetadata(accessToken) {
  return googleRequest2(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}?fields=sheets.properties(sheetId,title)`,
    {},
    accessToken
  );
}
async function writeHeader(accessToken) {
  await googleRequest2(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${encodeURIComponent(
      sheetRange2(`A1:Q1`)
    )}?valueInputOption=RAW`,
    {
      method: "PUT",
      body: JSON.stringify({ majorDimension: "ROWS", values: [USER_HEADERS] })
    },
    accessToken
  );
}
async function ensureUsersSheet() {
  const accessToken = await getServiceAccountAccessToken(WRITE_SCOPE2);
  let metadata = await getSheetMetadata(accessToken);
  let properties = metadata.sheets?.find(
    (sheet) => sheet.properties?.title === SYSTEM_USERS_SHEET
  )?.properties;
  if (properties?.sheetId === void 0) {
    try {
      await googleRequest2(
        `spreadsheets/${encodeURIComponent(spreadsheetId())}:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: SYSTEM_USERS_SHEET,
                    gridProperties: {
                      rowCount: 1e3,
                      columnCount: USER_HEADERS.length,
                      frozenRowCount: 1
                    }
                  }
                }
              }
            ]
          })
        },
        accessToken
      );
    } catch (error) {
      metadata = await getSheetMetadata(accessToken);
      properties = metadata.sheets?.find(
        (sheet) => sheet.properties?.title === SYSTEM_USERS_SHEET
      )?.properties;
      if (properties?.sheetId === void 0) throw error;
    }
    metadata = await getSheetMetadata(accessToken);
    properties = metadata.sheets?.find(
      (sheet) => sheet.properties?.title === SYSTEM_USERS_SHEET
    )?.properties;
  }
  if (properties?.sheetId === void 0) {
    throw new Error(`\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E0A\u0E35\u0E15 ${SYSTEM_USERS_SHEET} \u0E44\u0E14\u0E49`);
  }
  await writeHeader(accessToken);
  return { accessToken, sheetId: properties.sheetId };
}
async function loadRows(accessToken) {
  const result = await googleRequest2(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${encodeURIComponent(
      sheetRange2("A:Q")
    )}?majorDimension=ROWS`,
    {},
    accessToken
  );
  const rows = result.values || [];
  return { rows, users: parseUserRows(rows) };
}
async function appendUser(user, accessToken) {
  await googleRequest2(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${encodeURIComponent(
      sheetRange2("A:Q")
    )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: [userToRow(user)]
      })
    },
    accessToken
  );
}
async function ensureOwner(users, accessToken) {
  const owner = users.find(
    (user) => user.provider === "google" && normalizeIdentifier(user.emailOrId) === OWNER_EMAIL
  );
  if (owner) return users;
  await appendUser(OWNER_USER, accessToken);
  return [...users, OWNER_USER];
}
function sortUsers(users) {
  return [...users].sort((a, b) => {
    if (normalizeIdentifier(a.emailOrId) === OWNER_EMAIL) return -1;
    if (normalizeIdentifier(b.emailOrId) === OWNER_EMAIL) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
async function listUsers() {
  const { accessToken } = await ensureUsersSheet();
  const { users } = await loadRows(accessToken);
  return sortUsers(await ensureOwner(users, accessToken));
}
async function findUser(provider, identifier) {
  const cleanId = normalizeIdentifier(identifier);
  const users = await listUsers();
  return users.find(
    (user) => user.provider === provider && normalizeIdentifier(user.emailOrId) === cleanId
  ) || null;
}
async function createUser(input) {
  const { accessToken } = await ensureUsersSheet();
  const { users } = await loadRows(accessToken);
  const cleanId = normalizeIdentifier(input.emailOrId);
  const existing = users.find(
    (user2) => user2.provider === input.provider && normalizeIdentifier(user2.emailOrId) === cleanId
  );
  if (existing) return { user: existing, created: false };
  const user = {
    ...input,
    id: input.id || stableUserId(input.provider, input.emailOrId),
    emailOrId: input.emailOrId.trim(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await appendUser(user, accessToken);
  return { user, created: true };
}
async function updateUser(selector, changes) {
  const { accessToken } = await ensureUsersSheet();
  const { rows, users } = await loadRows(accessToken);
  const index = users.findIndex(
    (user) => selector.userId && user.id === selector.userId || selector.emailOrId && normalizeIdentifier(user.emailOrId) === normalizeIdentifier(selector.emailOrId)
  );
  if (index < 0) throw new Error("USER_NOT_FOUND");
  const current = users[index];
  const isOwner = normalizeIdentifier(current.emailOrId) === OWNER_EMAIL;
  if (isOwner && (changes.role && changes.role !== "super_admin" || changes.status && changes.status !== "active")) {
    throw new Error("OWNER_PROTECTED");
  }
  const updated = {
    ...current,
    ...changes,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const headerOffset = rows.length > 0 ? 2 : 1;
  const rowNumber = index + headerOffset;
  await googleRequest2(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}/values/${encodeURIComponent(
      sheetRange2(`A${rowNumber}:Q${rowNumber}`)
    )}?valueInputOption=RAW`,
    {
      method: "PUT",
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: [userToRow(updated)]
      })
    },
    accessToken
  );
  users[index] = updated;
  return { user: updated, users: sortUsers(users) };
}
async function deleteUser(selector) {
  const { accessToken, sheetId } = await ensureUsersSheet();
  const { users } = await loadRows(accessToken);
  const index = users.findIndex(
    (user) => selector.userId && user.id === selector.userId || selector.emailOrId && normalizeIdentifier(user.emailOrId) === normalizeIdentifier(selector.emailOrId)
  );
  if (index < 0) throw new Error("USER_NOT_FOUND");
  if (normalizeIdentifier(users[index].emailOrId) === OWNER_EMAIL) {
    throw new Error("OWNER_PROTECTED");
  }
  await googleRequest2(
    `spreadsheets/${encodeURIComponent(spreadsheetId())}:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: index + 1,
                endIndex: index + 2
              }
            }
          }
        ]
      })
    },
    accessToken
  );
  users.splice(index, 1);
  return sortUsers(users);
}

// src/server/app.ts
var app = express();
var SESSION_COOKIE = "satun_admin_token";
var OAUTH_COOKIE_MAX_AGE = 10 * 60 * 1e3;
var SESSION_MAX_AGE = 8 * 60 * 60 * 1e3;
app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
function isProduction() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}
function envValue2(name) {
  const value = process.env[name]?.trim();
  return value || void 0;
}
function parseCookies(req) {
  const cookies = {};
  for (const item of (req.headers.cookie || "").split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}
function providerConfig(provider) {
  if (provider === "google") {
    const clientId2 = envValue2("GOOGLE_CLIENT_ID");
    const clientSecret2 = envValue2("GOOGLE_CLIENT_SECRET");
    if (!clientId2 || !clientSecret2) return null;
    return {
      clientId: clientId2,
      clientSecret: clientSecret2,
      redirectUri: envValue2("GOOGLE_REDIRECT_URI") || "https://rdu-clinics-satun.vercel.app/api/auth/google/callback"
    };
  }
  const clientId = envValue2("LINE_CHANNEL_ID");
  const clientSecret = envValue2("LINE_CHANNEL_SECRET");
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: envValue2("LINE_REDIRECT_URI") || "https://rdu-clinics-satun.vercel.app/api/auth/line/callback"
  };
}
function oauthCookieName(provider) {
  return `satun_oauth_${provider}_state`;
}
function oauthCookieOptions(provider) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: `/api/auth/${provider}/callback`
  };
}
function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/"
  };
}
function setOauthStateCookie(res, provider, state) {
  res.cookie(oauthCookieName(provider), createSignedOauthState(provider, state), {
    ...oauthCookieOptions(provider),
    maxAge: OAUTH_COOKIE_MAX_AGE
  });
}
function clearOauthStateCookie(res, provider) {
  res.clearCookie(oauthCookieName(provider), oauthCookieOptions(provider));
}
function validateOauthState(req, provider, state) {
  if (typeof state !== "string") return false;
  const signedState = parseCookies(req)[oauthCookieName(provider)];
  return verifySignedOauthState(provider, state, signedState);
}
function redirectToLogin(res, status, provider) {
  const params = new URLSearchParams({ auth: status });
  if (provider) params.set("provider", provider);
  return res.redirect(`/admin/login?${params.toString()}`);
}
async function sendServerTelegramNotification(text) {
  try {
    await sendTelegramMessage(text, "HTML");
    return true;
  } catch (err) {
    console.warn("Server Telegram notification failed:", err);
    return false;
  }
}
async function registerOrFindOAuthUser(provider, identifier, displayName) {
  const cleanId = identifier.trim().toLocaleLowerCase("en-US");
  const existing = await findUser(provider, cleanId);
  if (existing) {
    return {
      id: existing.id,
      emailOrId: existing.emailOrId,
      provider: existing.provider,
      role: existing.role,
      status: existing.status,
      name: existing.name
    };
  }
  const { user: newPendingUser, created } = await createUser({
    emailOrId: identifier.trim(),
    name: displayName || (provider === "line" ? `LINE User (${identifier.slice(0, 8)}...)` : identifier),
    position: `\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48 (\u0E1C\u0E48\u0E32\u0E19 ${provider.toUpperCase()})`,
    workGroup: "\u0E23\u0E2D\u0E23\u0E30\u0E1A\u0E38\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19",
    affiliation: "\u0E23\u0E2D\u0E23\u0E30\u0E1A\u0E38\u0E2A\u0E31\u0E07\u0E01\u0E31\u0E14",
    phone: "-",
    provider,
    role: "admin",
    status: "pending",
    createdAt: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 16),
    avatarUrl: provider === "google" ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
  });
  if (created) {
    const nowStr = (/* @__PURE__ */ new Date()).toLocaleString("th-TH");
    await sendServerTelegramNotification(
      `\u{1F514} <b>[\u0E21\u0E35\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E43\u0E2B\u0E21\u0E48\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19]</b>

\u{1F464} <b>\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25:</b> ${escapeTelegramHtml(newPendingUser.name)}
\u{1F4BC} <b>\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07:</b> ${escapeTelegramHtml(newPendingUser.position)}
\u{1F4E7} <b>\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19:</b> ${escapeTelegramHtml(newPendingUser.emailOrId)} (${provider.toUpperCase()})
\u23F3 <b>\u0E2A\u0E16\u0E32\u0E19\u0E30:</b> \u0E23\u0E2D Super Admin \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34

\u{1F5D3}\uFE0F <b>\u0E40\u0E27\u0E25\u0E32\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19:</b> ${escapeTelegramHtml(nowStr)} \u0E19.`
    );
  }
  return {
    id: newPendingUser.id,
    emailOrId: newPendingUser.emailOrId,
    provider: newPendingUser.provider,
    role: newPendingUser.role,
    status: newPendingUser.status,
    name: newPendingUser.name
  };
}
function issueSession(res, record) {
  const token = signAdminToken(
    {
      id: record.id,
      emailOrId: record.emailOrId,
      displayName: record.name,
      provider: record.provider,
      role: record.role,
      status: record.status
    },
    8
  );
  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_MAX_AGE
  });
}
function readSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE] || req.headers.authorization?.replace(/^Bearer\s+/i, "");
  return token ? verifyAdminToken(token) : null;
}
async function readPersistentSession(req) {
  const session = readSession(req);
  if (!session) return null;
  return findUser(session.provider, session.emailOrId);
}
async function requireSuperAdmin(req, res) {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({
      status: "error",
      code: "AUTH_REQUIRED",
      message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"
    });
    return null;
  }
  const currentUser = await findUser(session.provider, session.emailOrId);
  if (!currentUser || currentUser.status !== "active" || currentUser.role !== "super_admin") {
    res.status(403).json({
      status: "error",
      code: "SUPER_ADMIN_REQUIRED",
      message: "\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E19\u0E35\u0E49\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E40\u0E09\u0E1E\u0E32\u0E30 Super Admin \u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2D\u0E22\u0E39\u0E48"
    });
    return null;
  }
  return currentUser;
}
async function requireActiveAdmin(req, res) {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({
      status: "error",
      code: "AUTH_REQUIRED",
      message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E14\u0E49\u0E27\u0E22\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E01\u0E48\u0E2D\u0E19\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01"
    });
    return null;
  }
  const currentUser = await findUser(session.provider, session.emailOrId);
  if (!currentUser || currentUser.status !== "active" || currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    res.status(403).json({
      status: "error",
      code: "ACTIVE_ADMIN_REQUIRED",
      message: "\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E19\u0E35\u0E49\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E40\u0E09\u0E1E\u0E32\u0E30 Admin \u0E2B\u0E23\u0E37\u0E2D Super Admin \u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2D\u0E22\u0E39\u0E48"
    });
    return null;
  }
  return currentUser;
}
function clinicMutationError(res, error) {
  if (error instanceof ClinicMutationError) {
    return res.status(error.status).json({
      status: "error",
      code: error.code,
      message: error.message
    });
  }
  console.error("Clinic mutation failed", error);
  return res.status(502).json({
    status: "error",
    code: "CLINIC_MUTATION_FAILED",
    message: error instanceof Error ? error.message : "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E44\u0E14\u0E49"
  });
}
function clinicMutationInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const record = body;
  const nested = record.clinic;
  return nested && typeof nested === "object" && !Array.isArray(nested) ? nested : record;
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "RDU Clinics Satun OAuth Server",
    version: "3.0.0",
    oauth: {
      google: { configured: Boolean(providerConfig("google")) },
      line: { configured: Boolean(providerConfig("line")) },
      session: { configured: isJwtConfigured() }
    },
    services: {
      persistentUsers: {
        configured: Boolean(
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
        )
      },
      telegram: { configured: isTelegramConfigured() }
    }
  });
});
app.get("/api/google-sheet", async (req, res) => {
  const spreadsheetId2 = typeof req.query.spreadsheetId === "string" && req.query.spreadsheetId.trim() ? req.query.spreadsheetId : DEFAULT_SPREADSHEET_ID;
  const gid = typeof req.query.gid === "string" && req.query.gid.trim() ? req.query.gid : DEFAULT_SHEET_GID;
  try {
    const data = await loadGoogleSheetData(spreadsheetId2, gid);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.json({
      status: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2D\u0E48\u0E32\u0E19 Google Sheet \u0E44\u0E14\u0E49";
    console.error("Google Sheet sync failed", error);
    return res.status(502).json({
      status: "error",
      code: "GOOGLE_SHEET_SYNC_FAILED",
      message
    });
  }
});
app.post("/api/clinics", async (req, res) => {
  try {
    const actor = await requireActiveAdmin(req, res);
    if (!actor) return;
    const clinic = await createClinic(clinicMutationInput(req.body), actor.emailOrId);
    return res.status(201).json({ status: "success", clinic });
  } catch (error) {
    return clinicMutationError(res, error);
  }
});
app.patch("/api/clinics/:clinicId", async (req, res) => {
  try {
    const actor = await requireActiveAdmin(req, res);
    if (!actor) return;
    const clinic = await updateClinic(
      req.params.clinicId,
      clinicMutationInput(req.body),
      actor.emailOrId
    );
    return res.json({ status: "success", clinic });
  } catch (error) {
    return clinicMutationError(res, error);
  }
});
app.delete("/api/clinics/:clinicId", async (req, res) => {
  try {
    const actor = await requireActiveAdmin(req, res);
    if (!actor) return;
    const clinic = await deleteClinic(
      req.params.clinicId,
      actor.emailOrId,
      clinicMutationInput(req.body)
    );
    return res.json({ status: "success", clinic });
  } catch (error) {
    return clinicMutationError(res, error);
  }
});
app.post("/api/telegram/clinic-update", async (req, res) => {
  let user = null;
  try {
    user = await readPersistentSession(req);
  } catch (error) {
    console.error("Unable to verify Telegram sender", error);
    return res.status(503).json({
      status: "error",
      code: "USER_STORE_UNAVAILABLE",
      message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49"
    });
  }
  if (!user || user.status !== "active" || user.role !== "admin" && user.role !== "super_admin") {
    return res.status(401).json({
      status: "error",
      code: "AUTH_REQUIRED",
      message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E14\u0E49\u0E27\u0E22\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E01\u0E48\u0E2D\u0E19\u0E2A\u0E48\u0E07\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19"
    });
  }
  const clinic = req.body?.clinic;
  const log = req.body?.log;
  if (!clinic || !log || typeof clinic.name !== "string" || typeof clinic.district !== "string" || typeof clinic.assessmentStatus !== "string" || typeof log.editedBy !== "string" || typeof log.remarks !== "string" || typeof log.timestamp !== "string") {
    return res.status(400).json({
      status: "error",
      code: "INVALID_NOTIFICATION",
      message: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E2A\u0E48\u0E07 Telegram \u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19"
    });
  }
  const assessmentLevel = typeof clinic.assessmentLevel === "number" ? clinic.assessmentLevel : null;
  try {
    const result = await sendClinicUpdateNotification({
      clinicName: clinic.name.slice(0, 500),
      district: clinic.district.slice(0, 100),
      assessmentStatus: clinic.assessmentStatus.slice(0, 100),
      assessmentLevel,
      editedBy: log.editedBy.slice(0, 500),
      remarks: log.remarks.slice(0, 1e3),
      timestamp: log.timestamp.slice(0, 100)
    });
    return res.json({
      status: "success",
      telegramSent: true,
      messageId: result.messageId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E48\u0E07 Telegram \u0E44\u0E14\u0E49";
    console.error("Clinic Telegram notification failed", error);
    return res.status(502).json({
      status: "error",
      code: "TELEGRAM_SEND_FAILED",
      message
    });
  }
});
app.get("/api/auth/google", (_req, res) => {
  const config = providerConfig("google");
  if (!config || !isJwtConfigured()) {
    return redirectToLogin(res, "configuration_error", "google");
  }
  const state = generateCsrfState();
  setOauthStateCookie(res, "google", state);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");
  return res.redirect(authUrl.toString());
});
app.get("/api/auth/google/callback", async (req, res) => {
  const config = providerConfig("google");
  const { code, state, error } = req.query;
  if (error || typeof code !== "string") {
    clearOauthStateCookie(res, "google");
    return redirectToLogin(res, "cancelled", "google");
  }
  if (!config || !isJwtConfigured()) {
    clearOauthStateCookie(res, "google");
    return redirectToLogin(res, "configuration_error", "google");
  }
  if (!validateOauthState(req, "google", state)) {
    clearOauthStateCookie(res, "google");
    return redirectToLogin(res, "state_error", "google");
  }
  clearOauthStateCookie(res, "google");
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code"
      })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error || "google_token_exchange_failed");
    }
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const user = await userResponse.json();
    const email = user.email?.trim().toLowerCase();
    if (!userResponse.ok || !email || user.verified_email === false) {
      throw new Error("google_verified_email_missing");
    }
    const record = await registerOrFindOAuthUser("google", email, user.name || email);
    issueSession(res, record);
    return redirectToLogin(
      res,
      record.status === "active" ? "success" : "pending",
      "google"
    );
  } catch (error2) {
    console.error("Google OAuth callback failed", error2);
    return redirectToLogin(res, "provider_error", "google");
  }
});
app.get("/api/auth/line", (_req, res) => {
  const config = providerConfig("line");
  if (!config || !isJwtConfigured()) {
    return redirectToLogin(res, "configuration_error", "line");
  }
  const state = generateCsrfState();
  setOauthStateCookie(res, "line", state);
  const authUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "profile openid");
  return res.redirect(authUrl.toString());
});
app.get("/api/auth/line/callback", async (req, res) => {
  const config = providerConfig("line");
  const { code, state, error } = req.query;
  if (error || typeof code !== "string") {
    clearOauthStateCookie(res, "line");
    return redirectToLogin(res, "cancelled", "line");
  }
  if (!config || !isJwtConfigured()) {
    clearOauthStateCookie(res, "line");
    return redirectToLogin(res, "configuration_error", "line");
  }
  if (!validateOauthState(req, "line", state)) {
    clearOauthStateCookie(res, "line");
    return redirectToLogin(res, "state_error", "line");
  }
  clearOauthStateCookie(res, "line");
  try {
    const tokenResponse = await fetch(
      "https://api.line.me/oauth2/v2.1/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret
        })
      }
    );
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error || "line_token_exchange_failed");
    }
    const userResponse = await fetch(
      "https://api.line.me/oauth2/v2.1/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const user = await userResponse.json();
    const userId = user.sub?.trim();
    if (!userResponse.ok || !userId) {
      throw new Error("line_user_id_missing");
    }
    const record = await registerOrFindOAuthUser("line", userId, user.name || "LINE User");
    issueSession(res, record);
    return redirectToLogin(
      res,
      record.status === "active" ? "success" : "pending",
      "line"
    );
  } catch (error2) {
    console.error("LINE OAuth callback failed", error2);
    return redirectToLogin(res, "provider_error", "line");
  }
});
app.get("/api/users", async (req, res) => {
  try {
    const actor = await requireSuperAdmin(req, res);
    if (!actor) return;
    return res.json({
      status: "success",
      users: await listUsers()
    });
  } catch (error) {
    console.error("Unable to load users", error);
    return res.status(503).json({
      status: "error",
      code: "USER_STORE_UNAVAILABLE",
      message: error instanceof Error ? error.message : "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49"
    });
  }
});
app.post("/api/users/register", async (req, res) => {
  const { firstName, lastName, position, workGroup, affiliation, phone, emailOrId, provider } = req.body || {};
  if (!emailOrId || provider !== "google" && provider !== "line") {
    return res.status(400).json({ status: "error", message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19" });
  }
  const cleanId = String(emailOrId).trim().slice(0, 320);
  if (cleanId.length < 3 || provider === "google" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId)) {
    return res.status(400).json({
      status: "error",
      code: "INVALID_IDENTIFIER",
      message: provider === "google" ? "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07" : "LINE ID \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"
    });
  }
  const clean2 = (value, maxLength) => String(value || "").trim().slice(0, maxLength);
  const fullName = `${clean2(firstName, 100)} ${clean2(lastName, 100)}`.trim() || cleanId;
  const newUser = {
    emailOrId: cleanId,
    name: fullName,
    firstName: clean2(firstName, 100),
    lastName: clean2(lastName, 100),
    position: clean2(position, 200) || "\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48",
    workGroup: clean2(workGroup, 200) || "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19",
    affiliation: clean2(affiliation, 200) || "\u0E2A\u0E31\u0E07\u0E01\u0E31\u0E14",
    phone: clean2(phone, 50) || "-",
    provider,
    role: "admin",
    status: "pending",
    createdAt: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 16),
    avatarUrl: provider === "google" ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
  };
  try {
    const result = await createUser(newUser);
    if (!result.created) {
      return res.status(409).json({
        status: "error",
        code: "ACCOUNT_ALREADY_REGISTERED",
        message: "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D Super Admin"
      });
    }
    let notificationSent = false;
    const nowStr = (/* @__PURE__ */ new Date()).toLocaleString("th-TH");
    notificationSent = await sendServerTelegramNotification(
      `\u{1F514} <b>[\u0E21\u0E35\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E43\u0E2B\u0E21\u0E48\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19]</b>

\u{1F464} <b>\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25:</b> ${escapeTelegramHtml(result.user.name)}
\u{1F4BC} <b>\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07:</b> ${escapeTelegramHtml(result.user.position)}
\u{1F3E2} <b>\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19:</b> ${escapeTelegramHtml(result.user.workGroup)}
\u{1F3E5} <b>\u0E2A\u0E31\u0E07\u0E01\u0E31\u0E14:</b> ${escapeTelegramHtml(result.user.affiliation)}
\u{1F4DE} <b>\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23:</b> ${escapeTelegramHtml(result.user.phone)}
\u{1F4E7} <b>\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19:</b> ${escapeTelegramHtml(result.user.emailOrId)} (${result.user.provider.toUpperCase()})
\u23F3 <b>\u0E2A\u0E16\u0E32\u0E19\u0E30:</b> \u0E23\u0E2D Super Admin \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34

\u{1F5D3}\uFE0F <b>\u0E40\u0E27\u0E25\u0E32\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19:</b> ${escapeTelegramHtml(nowStr)} \u0E19.`
    );
    return res.status(201).json({
      status: "success",
      user: result.user,
      notificationSent,
      message: "\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E16\u0E39\u0E01\u0E2A\u0E48\u0E07\u0E43\u0E2B\u0E49 Super Admin \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E49\u0E27"
    });
  } catch (error) {
    console.error("Unable to register user", error);
    return res.status(503).json({
      status: "error",
      code: "USER_REGISTRATION_FAILED",
      message: error instanceof Error ? error.message : "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E44\u0E14\u0E49"
    });
  }
});
app.post("/api/users/approve", async (req, res) => {
  const { userId, emailOrId, status, role } = req.body || {};
  const validStatuses = ["pending", "active", "suspended", "blocked"];
  const validRoles = ["super_admin", "admin", "viewer", "user"];
  if (!userId && !emailOrId || status && !validStatuses.includes(status) || role && !validRoles.includes(role)) {
    return res.status(400).json({
      status: "error",
      code: "INVALID_USER_UPDATE",
      message: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"
    });
  }
  try {
    const actor = await requireSuperAdmin(req, res);
    if (!actor) return;
    const targetBefore = (await listUsers()).find(
      (user) => userId && user.id === userId || emailOrId && user.emailOrId.toLocaleLowerCase("en-US") === String(emailOrId).trim().toLocaleLowerCase("en-US")
    );
    if (!targetBefore) {
      return res.status(404).json({ status: "error", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const result = await updateUser(
      { userId, emailOrId },
      {
        ...status ? { status } : {},
        ...role ? { role } : {},
        ...status === "active" ? {
          approvedBy: actor.emailOrId,
          approvedAt: nowIso
        } : {}
      }
    );
    if (status === "active" && targetBefore.status !== "active") {
      const nowStr = (/* @__PURE__ */ new Date()).toLocaleString("th-TH");
      await sendServerTelegramNotification(
        `\u2705 <b>[\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E41\u0E25\u0E49\u0E27]</b>

\u{1F464} <b>\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25:</b> ${escapeTelegramHtml(result.user.name)}
\u{1F4BC} <b>\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07:</b> ${escapeTelegramHtml(result.user.position || "-")}
\u{1F3E5} <b>\u0E2A\u0E31\u0E07\u0E01\u0E31\u0E14:</b> ${escapeTelegramHtml(result.user.affiliation || result.user.workGroup || "-")}
\u{1F4E7} <b>\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19:</b> ${escapeTelegramHtml(result.user.emailOrId)}
\u{1F7E2} <b>\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E43\u0E2B\u0E21\u0E48:</b> \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27
\u{1F6E1}\uFE0F <b>\u0E1C\u0E39\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34:</b> ${escapeTelegramHtml(actor.name)}

\u{1F5D3}\uFE0F <b>\u0E40\u0E27\u0E25\u0E32\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34:</b> ${escapeTelegramHtml(nowStr)} \u0E19.`
      );
    }
    return res.json({
      status: "success",
      users: result.users,
      user: result.user
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "USER_NOT_FOUND") {
      return res.status(404).json({ status: "error", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    if (code === "OWNER_PROTECTED") {
      return res.status(409).json({ status: "error", message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49" });
    }
    console.error("Unable to update user", error);
    return res.status(503).json({
      status: "error",
      code: "USER_UPDATE_FAILED",
      message: error instanceof Error ? error.message : "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49"
    });
  }
});
app.delete("/api/users/:userId", async (req, res) => {
  try {
    const actor = await requireSuperAdmin(req, res);
    if (!actor) return;
    const target = (await listUsers()).find((user) => user.id === req.params.userId);
    if (!target) {
      return res.status(404).json({ status: "error", message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const users = await deleteUser({ userId: req.params.userId });
    await sendServerTelegramNotification(
      `\u{1F5D1}\uFE0F <b>[\u0E25\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A]</b>

\u{1F464} <b>\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E17\u0E35\u0E48\u0E25\u0E1A:</b> ${escapeTelegramHtml(target.name)}
\u{1F4E7} <b>\u0E0A\u0E37\u0E48\u0E2D\u0E1A\u0E31\u0E0D\u0E0A\u0E35:</b> ${escapeTelegramHtml(target.emailOrId)}
\u{1F6E1}\uFE0F <b>\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E42\u0E14\u0E22:</b> ${escapeTelegramHtml(actor.name)}

\u2139\uFE0F \u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E40\u0E1E\u0E34\u0E01\u0E16\u0E2D\u0E19\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E17\u0E31\u0E19\u0E17\u0E35 \u0E41\u0E25\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E2B\u0E32\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19`
    );
    return res.json({ status: "success", users });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "OWNER_PROTECTED") {
      return res.status(409).json({ status: "error", message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49" });
    }
    console.error("Unable to delete user", error);
    return res.status(503).json({
      status: "error",
      code: "USER_DELETE_FAILED",
      message: error instanceof Error ? error.message : "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E44\u0E14\u0E49"
    });
  }
});
app.get("/api/auth/me", async (req, res) => {
  const session = readSession(req);
  if (!session) {
    return res.json({
      status: "unauthenticated",
      user: null
    });
  }
  try {
    const currentUser = await findUser(session.provider, session.emailOrId);
    if (!currentUser) {
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
      return res.status(401).json({
        status: "unauthenticated",
        code: "ACCOUNT_REMOVED",
        user: null
      });
    }
    return res.json({
      status: "success",
      user: {
        ...session,
        id: currentUser.id,
        displayName: currentUser.name,
        status: currentUser.status,
        role: currentUser.role,
        maskedIdentifier: maskIdentifier(currentUser.emailOrId)
      }
    });
  } catch (error) {
    console.error("Unable to verify session against user store", error);
    return res.status(503).json({
      status: "error",
      code: "USER_STORE_UNAVAILABLE",
      message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49"
    });
  }
});
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  return res.json({ status: "success", message: "\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" });
});
app.use("/api", (error, _req, res, _next) => {
  console.error("Unhandled API error", error);
  res.status(500).json({
    status: "error",
    code: "INTERNAL_ERROR",
    message: "\u0E23\u0E30\u0E1A\u0E1A\u0E02\u0E31\u0E14\u0E02\u0E49\u0E2D\u0E07\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
  });
});
var app_default = app;

// dev-server.ts
var port = Number(process.env.PORT || 3e3);
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app_default.use(express2.static(distPath));
    app_default.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app_default.use(vite.middlewares);
  }
  app_default.listen(port, "0.0.0.0", () => {
    console.log(`RDU Clinics Satun running at http://localhost:${port}`);
  });
}
startServer().catch((error) => {
  console.error("Unable to start local server", error);
  process.exitCode = 1;
});
//# sourceMappingURL=dev-server.js.map
