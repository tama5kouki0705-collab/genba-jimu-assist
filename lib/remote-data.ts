import { supabase } from "@/lib/supabase";
import { normalizeInvoiceLineItems } from "@/lib/invoice-line-items";
import type { AdminUser, CalendarSchedule, Estimate, Invoice, Profile, Qualification, Receipt, Site, Vehicle, WorkLog } from "@/lib/types";

const FILE_BUCKET = "genba-files";
const SIGNED_IMAGE_SECONDS = 60 * 60 * 24 * 7;

const one = <T>(rows: T[] | null) => rows?.[0] ?? null;
const nullable = (value: string | undefined) => value || null;

async function signedImageUrl(path: string) {
  if (!supabase || !path) return "";
  const { data, error } = await supabase.storage.from(FILE_BUCKET).createSignedUrl(path, SIGNED_IMAGE_SECONDS);
  if (error) return "";
  return data.signedUrl;
}

export async function uploadReceiptImageRemote(file: File, userId: string, receiptId: string) {
  if (!supabase) return null;
  const rawExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const extension = rawExtension.replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/receipts/${receiptId}.${extension}`;
  const { error } = await supabase.storage.from(FILE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || "image/jpeg",
    upsert: true
  });
  if (error) throw error;
  return {
    imageUrl: await signedImageUrl(path),
    imagePath: path,
    imageMimeType: file.type || "image/jpeg",
    imageSize: file.size
  };
}

const profileToDb = (profile: Profile, userId: string) => ({
  user_id: userId,
  company_name: profile.companyName,
  name: profile.name,
  postal_code: profile.postalCode,
  phone: profile.phone,
  fax: profile.fax,
  email: profile.email,
  address: profile.address,
  contact_name: profile.contactName,
  trade: profile.trade,
  area: profile.area,
  invoice_number: profile.invoiceNumber,
  bank_name: profile.bankName,
  bank_branch: profile.bankBranch,
  bank_type: profile.bankType,
  bank_account_number: profile.bankAccountNumber,
  bank_account_name: profile.bankAccountName
});

const profileFromDb = (row: any): Profile => ({
  companyName: row?.company_name ?? "",
  name: row?.name ?? "",
  postalCode: row?.postal_code ?? "",
  phone: row?.phone ?? "",
  fax: row?.fax ?? "",
  email: row?.email ?? "",
  address: row?.address ?? "",
  contactName: row?.contact_name ?? "",
  trade: row?.trade ?? "電気工事",
  area: row?.area ?? "",
  invoiceNumber: row?.invoice_number ?? "",
  bankName: row?.bank_name ?? "",
  bankBranch: row?.bank_branch ?? "",
  bankType: row?.bank_type ?? "普通",
  bankAccountNumber: row?.bank_account_number ?? "",
  bankAccountName: row?.bank_account_name ?? ""
});

const siteToDb = (site: Site, userId: string) => ({
  app_id: site.id,
  user_id: userId,
  site_name: site.siteName,
  address: site.address,
  client_company: site.clientCompany,
  client_person: site.clientPerson,
  client_phone: site.clientPhone,
  start_date: nullable(site.startDate),
  end_date: nullable(site.endDate),
  work_description: site.workDescription,
  daily_rate: site.dailyRate,
  memo: site.memo
});

const siteFromDb = (row: any): Site => ({
  id: row.app_id ?? row.id,
  siteName: row.site_name ?? "",
  address: row.address ?? "",
  clientCompany: row.client_company ?? "",
  clientPerson: row.client_person ?? "",
  clientPhone: row.client_phone ?? "",
  startDate: row.start_date ?? "",
  endDate: row.end_date ?? "",
  workDescription: row.work_description ?? "",
  dailyRate: Number(row.daily_rate ?? 0),
  memo: row.memo ?? ""
});

const receiptToDb = (receipt: Receipt, userId: string) => ({
  app_id: receipt.id,
  user_id: userId,
  site_app_id: nullable(receipt.siteId),
  image_url: receipt.imageUrl,
  image_path: receipt.imagePath ?? null,
  image_mime_type: receipt.imageMimeType ?? null,
  image_size: receipt.imageSize ?? null,
  date: nullable(receipt.date),
  store_name: receipt.storeName,
  amount: receipt.amount,
  tax_amount: receipt.taxAmount,
  purpose: receipt.purpose,
  memo: receipt.memo,
  status: receipt.status,
  ocr_status: receipt.ocrStatus
});

const receiptFromDb = (row: any, imageUrl?: string): Receipt => ({
  id: row.app_id ?? row.id,
  siteId: row.site_app_id ?? row.site_id ?? "",
  imageUrl: imageUrl ?? row.image_url ?? "",
  imagePath: row.image_path ?? undefined,
  imageMimeType: row.image_mime_type ?? undefined,
  imageSize: row.image_size === null || row.image_size === undefined ? undefined : Number(row.image_size),
  date: row.date ?? "",
  storeName: row.store_name ?? "",
  amount: Number(row.amount ?? 0),
  taxAmount: Number(row.tax_amount ?? 0),
  purpose: row.purpose ?? "",
  memo: row.memo ?? "",
  status: row.status ?? "未処理",
  ocrStatus: row.ocr_status ?? "未実行"
});

async function receiptFromDbWithImage(row: any) {
  const signedUrl = row.image_path ? await signedImageUrl(row.image_path) : "";
  return receiptFromDb(row, signedUrl || row.image_url);
}

const workLogToDb = (workLog: WorkLog, userId: string) => ({
  app_id: workLog.id,
  user_id: userId,
  date: nullable(workLog.date),
  site_app_id: nullable(workLog.siteId),
  site_name: workLog.siteName,
  workers: workLog.workers,
  memo: workLog.memo,
  weather: workLog.weather || "☀️",
  progress_percent: workLog.progressPercent ?? 0,
  foreman: workLog.foreman || "自分",
  machinery: workLog.machinery || "",
  waste_record: workLog.wasteRecord || "",
  tomorrow_plan: workLog.tomorrowPlan || "",
  notes: workLog.notes || "",
  photo_urls: workLog.photoUrls,
  receipt_done: workLog.receiptDone,
  photo_done: workLog.photoDone,
  invoice_ready: workLog.invoiceReady,
  created_at: workLog.createdAt || new Date().toISOString(),
  updated_at: workLog.updatedAt || new Date().toISOString(),
  trade_details: workLog.tradeDetails && Object.keys(workLog.tradeDetails).length > 0 ? workLog.tradeDetails : null
});

const workLogFromDb = (row: any): WorkLog => ({
  id: row.app_id ?? row.id,
  date: row.date ?? "",
  siteId: row.site_app_id ?? row.site_id ?? "",
  siteName: row.site_name ?? "",
  workers: row.workers ?? "",
  memo: row.memo ?? "",
  weather: row.weather ?? "☀️",
  progressPercent: Number(row.progress_percent ?? 0),
  foreman: row.foreman ?? "自分",
  machinery: row.machinery ?? "",
  wasteRecord: row.waste_record ?? "",
  tomorrowPlan: row.tomorrow_plan ?? "",
  notes: row.notes ?? "",
  photoUrls: row.photo_urls ?? [],
  receiptDone: Boolean(row.receipt_done),
  photoDone: Boolean(row.photo_done),
  invoiceReady: Boolean(row.invoice_ready),
  createdAt: row.created_at ?? "",
  updatedAt: row.updated_at ?? row.created_at ?? "",
  tradeDetails: row.trade_details && typeof row.trade_details === "object" ? row.trade_details : null
});

const calendarScheduleToDb = (schedule: CalendarSchedule, userId: string) => ({
  app_id: schedule.id,
  user_id: userId,
  date: nullable(schedule.date),
  site_app_id: nullable(schedule.siteId),
  site_name: schedule.siteName,
  client_company: schedule.clientCompany,
  work_description: schedule.workDescription,
  start_time: schedule.startTime || null,
  end_time: schedule.endTime || null,
  workers: schedule.workers,
  labor_count: schedule.laborCount,
  daily_rate: schedule.dailyRate,
  memo: schedule.memo,
  invoice_app_id: schedule.invoiceId ?? null,
  created_at: schedule.createdAt || new Date().toISOString()
});

const calendarScheduleFromDb = (row: any): CalendarSchedule => ({
  id: row.app_id ?? row.id,
  date: row.date ?? "",
  siteId: row.site_app_id ?? row.site_id ?? "",
  siteName: row.site_name ?? "",
  clientCompany: row.client_company ?? "",
  workDescription: row.work_description ?? "",
  startTime: row.start_time ?? "",
  endTime: row.end_time ?? "",
  workers: row.workers ?? "",
  laborCount: Number(row.labor_count ?? 1),
  dailyRate: Number(row.daily_rate ?? 0),
  memo: row.memo ?? "",
  invoiceId: row.invoice_app_id ?? row.invoice_id ?? undefined,
  createdAt: row.created_at ?? ""
});

const qualificationToDb = (qualification: Qualification, userId: string) => ({
  app_id: qualification.id,
  user_id: userId,
  qualification_name: qualification.qualificationName,
  acquired_date: nullable(qualification.acquiredDate),
  expiry_date: nullable(qualification.expiryDate),
  image_url: qualification.imageUrl,
  memo: qualification.memo
});

const qualificationFromDb = (row: any): Qualification => ({
  id: row.app_id ?? row.id,
  qualificationName: row.qualification_name ?? "",
  acquiredDate: row.acquired_date ?? "",
  expiryDate: row.expiry_date ?? "",
  imageUrl: row.image_url ?? "",
  memo: row.memo ?? ""
});

const vehicleToDb = (vehicle: Vehicle, userId: string) => ({
  app_id: vehicle.id,
  user_id: userId,
  vehicle_name: vehicle.vehicleName,
  vehicle_number: vehicle.vehicleNumber,
  vehicle_type: vehicle.vehicleType,
  inspection_expiry_date: nullable(vehicle.inspectionExpiryDate),
  compulsory_insurance_expiry_date: nullable(vehicle.compulsoryInsuranceExpiryDate),
  optional_insurance_expiry_date: nullable(vehicle.optionalInsuranceExpiryDate),
  inspection_document_url: vehicle.inspectionDocumentUrl,
  compulsory_insurance_document_url: vehicle.compulsoryInsuranceDocumentUrl,
  optional_insurance_document_url: vehicle.optionalInsuranceDocumentUrl,
  memo: vehicle.memo
});

const vehicleFromDb = (row: any): Vehicle => ({
  id: row.app_id ?? row.id,
  vehicleName: row.vehicle_name ?? "",
  vehicleNumber: row.vehicle_number ?? "",
  vehicleType: row.vehicle_type ?? "",
  inspectionExpiryDate: row.inspection_expiry_date ?? "",
  compulsoryInsuranceExpiryDate: row.compulsory_insurance_expiry_date ?? "",
  optionalInsuranceExpiryDate: row.optional_insurance_expiry_date ?? "",
  inspectionDocumentUrl: row.inspection_document_url ?? "",
  compulsoryInsuranceDocumentUrl: row.compulsory_insurance_document_url ?? "",
  optionalInsuranceDocumentUrl: row.optional_insurance_document_url ?? "",
  memo: row.memo ?? ""
});

const invoiceToDb = (invoice: Invoice, userId: string, includeLineItems = true) => {
  const row = {
    app_id: invoice.id,
    user_id: userId,
    site_app_id: nullable(invoice.siteId),
    site_name: invoice.siteName,
    client_company: invoice.clientCompany,
    invoice_number: invoice.invoiceNumber ?? null,
    issue_date: invoice.issueDate || null,
    subject: invoice.subject ?? null,
    work_description: invoice.workDescription,
    work_date: nullable(invoice.workDate),
    payment_terms: invoice.paymentTerms ?? null,
    due_date: invoice.dueDate || null,
    notes: invoice.notes ?? null,
    labor_count: invoice.laborCount,
    daily_rate: invoice.dailyRate,
    material_cost: invoice.materialCost,
    other_cost: invoice.otherCost,
    tax_rate: invoice.taxRate,
    subtotal: invoice.subtotal,
    tax_amount: invoice.taxAmount,
    total_amount: invoice.totalAmount,
    status: invoice.status,
    pdf_url: invoice.pdfUrl ?? null
  };
  return includeLineItems ? { ...row, line_items: normalizeInvoiceLineItems(invoice.lineItems, invoice) } : row;
};

const invoiceFromDb = (row: any): Invoice => ({
  id: row.app_id ?? row.id,
  siteId: row.site_app_id ?? row.site_id ?? "",
  siteName: row.site_name ?? "",
  clientCompany: row.client_company ?? "",
  invoiceNumber: row.invoice_number ?? undefined,
  issueDate: row.issue_date ?? undefined,
  subject: row.subject ?? undefined,
  workDescription: row.work_description ?? "",
  workDate: row.work_date ?? "",
  paymentTerms: row.payment_terms ?? undefined,
  dueDate: row.due_date ?? undefined,
  notes: row.notes ?? undefined,
  laborCount: Number(row.labor_count ?? 0),
  dailyRate: Number(row.daily_rate ?? 0),
  materialCost: Number(row.material_cost ?? 0),
  otherCost: Number(row.other_cost ?? 0),
  taxRate: Number(row.tax_rate ?? 10),
  subtotal: Number(row.subtotal ?? 0),
  taxAmount: Number(row.tax_amount ?? 0),
  totalAmount: Number(row.total_amount ?? 0),
  status: row.status ?? "下書き",
  lineItems: normalizeInvoiceLineItems(row.line_items, {
    workDescription: row.work_description ?? "",
    laborCount: Number(row.labor_count ?? 0),
    dailyRate: Number(row.daily_rate ?? 0),
    materialCost: Number(row.material_cost ?? 0),
    otherCost: Number(row.other_cost ?? 0),
    subtotal: Number(row.subtotal ?? 0)
  }),
  pdfUrl: row.pdf_url ?? undefined
});

const estimateToDb = (estimate: Estimate, userId: string) => ({
  app_id: estimate.id,
  user_id: userId,
  site_app_id: nullable(estimate.siteId),
  site_name: estimate.siteName,
  client_company: estimate.clientCompany,
  estimate_number: estimate.estimateNumber ?? null,
  issue_date: estimate.issueDate || null,
  subject: estimate.subject ?? null,
  construction_period: estimate.constructionPeriod ?? null,
  work_place: estimate.workPlace ?? null,
  payment_terms: estimate.paymentTerms ?? null,
  notes: estimate.notes ?? null,
  work_description: estimate.workDescription,
  quantity: estimate.quantity,
  unit: estimate.unit,
  unit_price: estimate.unitPrice,
  tax_rate: estimate.taxRate,
  subtotal: estimate.subtotal,
  tax_amount: estimate.taxAmount,
  total_amount: estimate.totalAmount,
  expiry_date: nullable(estimate.expiryDate),
  status: estimate.status,
  pdf_url: estimate.pdfUrl ?? null
});

const estimateFromDb = (row: any): Estimate => ({
  id: row.app_id ?? row.id,
  siteId: row.site_app_id ?? row.site_id ?? "",
  siteName: row.site_name ?? "",
  clientCompany: row.client_company ?? "",
  estimateNumber: row.estimate_number ?? undefined,
  issueDate: row.issue_date ?? undefined,
  subject: row.subject ?? undefined,
  constructionPeriod: row.construction_period ?? undefined,
  workPlace: row.work_place ?? undefined,
  paymentTerms: row.payment_terms ?? undefined,
  notes: row.notes ?? undefined,
  workDescription: row.work_description ?? "",
  quantity: Number(row.quantity ?? 0),
  unit: row.unit ?? "式",
  unitPrice: Number(row.unit_price ?? 0),
  taxRate: Number(row.tax_rate ?? 10),
  subtotal: Number(row.subtotal ?? 0),
  taxAmount: Number(row.tax_amount ?? 0),
  totalAmount: Number(row.total_amount ?? 0),
  expiryDate: row.expiry_date ?? "",
  status: row.status ?? "下書き",
  pdfUrl: row.pdf_url ?? undefined
});

export async function loadRemoteData() {
  if (!supabase) return null;

  const [
    profile,
    sites,
    receipts,
    workLogs,
    calendarSchedules,
    qualifications,
    vehicles,
    invoices,
    estimates,
    users
  ] = await Promise.all([
    supabase.from("profiles").select("*").limit(1),
    supabase.from("sites").select("*").order("created_at", { ascending: false }),
    supabase.from("receipts").select("*").order("created_at", { ascending: false }),
    supabase.from("work_logs").select("*").order("date", { ascending: false }),
    supabase.from("calendar_schedules").select("*").order("date", { ascending: true }),
    supabase.from("qualifications").select("*").order("created_at", { ascending: false }),
    supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").order("created_at", { ascending: false }),
    supabase.from("estimates").select("*").order("created_at", { ascending: false }),
    supabase.from("users").select("*").order("created_at", { ascending: false })
  ]);

  const firstError = [profile, sites, receipts, workLogs, calendarSchedules, qualifications, vehicles, invoices, estimates].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  return {
    profile: one(profile.data) ? profileFromDb(one(profile.data)) : null,
    sites: (sites.data ?? []).map(siteFromDb),
    receipts: await Promise.all((receipts.data ?? []).map(receiptFromDbWithImage)),
    workLogs: (workLogs.data ?? []).map(workLogFromDb),
    calendarSchedules: (calendarSchedules.data ?? []).map(calendarScheduleFromDb),
    qualifications: (qualifications.data ?? []).map(qualificationFromDb),
    vehicles: (vehicles.data ?? []).map(vehicleFromDb),
    invoices: (invoices.data ?? []).map(invoiceFromDb),
    estimates: (estimates.data ?? []).map(estimateFromDb),
    adminUsers: users.error ? null : (users.data ?? []).map((row: any): AdminUser => ({
      id: row.id,
      email: row.email,
      role: row.role,
      plan: row.plan,
      status: row.status,
      subscriptionStatus: row.subscription_status ?? (row.status === "suspended" ? "suspended" : "trialing"),
      trialEndsAt: row.trial_ends_at ?? "",
      currentPeriodEndsAt: row.current_period_ends_at ?? "",
      createdAt: row.created_at,
      supportMemo: ""
    }))
  };
}

export async function saveProfileRemote(profile: Profile, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("profiles").upsert(profileToDb(profile, userId), { onConflict: "user_id" });
  if (error) throw error;
}

export async function saveSiteRemote(site: Site, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("sites").upsert(siteToDb(site, userId), { onConflict: "app_id" });
  if (error) throw error;
}

export async function saveReceiptRemote(receipt: Receipt, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("receipts").upsert(receiptToDb(receipt, userId), { onConflict: "app_id" });
  if (error) throw error;
}

export async function deleteReceiptRemote(receiptId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("receipts").delete().eq("app_id", receiptId);
  if (error) throw error;
}

export async function saveWorkLogRemote(workLog: WorkLog, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("work_logs").upsert(workLogToDb(workLog, userId), { onConflict: "app_id" });
  if (error) throw error;
}

export async function saveCalendarScheduleRemote(schedule: CalendarSchedule, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("calendar_schedules").upsert(calendarScheduleToDb(schedule, userId), { onConflict: "app_id" });
  if (error) throw error;
}

export async function deleteCalendarScheduleRemote(scheduleId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("calendar_schedules").delete().eq("app_id", scheduleId);
  if (error) throw error;
}

export async function saveQualificationRemote(qualification: Qualification, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("qualifications").upsert(qualificationToDb(qualification, userId), { onConflict: "app_id" });
  if (error) throw error;
}

export async function saveVehicleRemote(vehicle: Vehicle, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("vehicles").upsert(vehicleToDb(vehicle, userId), { onConflict: "app_id" });
  if (error) throw error;
}

export async function saveInvoiceRemote(invoice: Invoice, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("invoices").upsert(invoiceToDb(invoice, userId), { onConflict: "app_id" });
  if (error && /line_items|schema cache|column/i.test(error.message)) {
    const fallback = await supabase.from("invoices").upsert(invoiceToDb(invoice, userId, false), { onConflict: "app_id" });
    if (fallback.error) throw fallback.error;
    return;
  }
  if (error) throw error;
}

export async function deleteInvoiceRemote(invoiceId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("invoices").delete().eq("app_id", invoiceId);
  if (error) throw error;
}

export async function saveEstimateRemote(estimate: Estimate, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("estimates").upsert(estimateToDb(estimate, userId), { onConflict: "app_id" });
  if (error) throw error;
}

export async function deleteEstimateRemote(estimateId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("estimates").delete().eq("app_id", estimateId);
  if (error) throw error;
}

export async function updateUserPlanRemote(userId: string, plan: AdminUser["plan"]) {
  if (!supabase) return;
  const { error } = await supabase.from("users").update({ plan }).eq("id", userId);
  if (error) throw error;
}

export async function updateUserStatusRemote(userId: string, status: AdminUser["status"]) {
  if (!supabase) return;
  const subscriptionStatus = status === "suspended" ? "suspended" : "active";
  const { error } = await supabase.from("users").update({ status, subscription_status: subscriptionStatus }).eq("id", userId);
  if (error) throw error;
}
