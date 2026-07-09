export type Plan = "Starter" | "Professional" | "Business";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "suspended";
export type Status = "下書き" | "送付済み" | "入金済み" | "受注" | "失注" | "未処理" | "処理済み";

export type Profile = {
  companyName: string;
  name: string;
  postalCode: string;
  phone: string;
  fax: string;
  email: string;
  address: string;
  contactName: string;
  trade: string;
  area: string;
  invoiceNumber: string;
  bankName: string;
  bankBranch: string;
  bankType: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

export type Site = {
  id: string;
  siteName: string;
  address: string;
  clientCompany: string;
  clientPerson: string;
  clientPhone: string;
  startDate: string;
  endDate: string;
  workDescription: string;
  dailyRate: number;
  memo: string;
};

export type Receipt = {
  id: string;
  siteId: string;
  imageUrl: string;
  imagePath?: string;
  imageMimeType?: string;
  imageSize?: number;
  date: string;
  storeName: string;
  amount: number;
  taxAmount: number;
  purpose: string;
  memo: string;
  status: "未処理" | "処理済み";
  ocrStatus: "未実行" | "読取待ち" | "完了";
  submitted?: boolean;
};

export type WorkLog = {
  id: string;
  date: string;
  siteId: string;
  siteName: string;
  workers: string;
  memo: string;
  weather: string;
  progressPercent: number;
  foreman: string;
  machinery: string;
  wasteRecord: string;
  tomorrowPlan: string;
  notes: string;
  photoUrls: string[];
  receiptDone: boolean;
  photoDone: boolean;
  invoiceReady: boolean;
  createdAt: string;
  updatedAt: string;
  tradeDetails: Record<string, string | string[] | boolean | number | null> | null;
};

export type CalendarSchedule = {
  id: string;
  date: string;
  siteId: string;
  siteName: string;
  clientCompany: string;
  workDescription: string;
  startTime: string;
  endTime: string;
  workers: string;
  laborCount: number;
  dailyRate: number;
  memo: string;
  invoiceId?: string;
  createdAt: string;
};

export type CalendarItem = {
  date: string;
  title: string;
  sub: string;
  kind: "予定" | "現場" | "作業" | "領収書" | "請求書" | "見積" | "期限";
};

export type InvoiceLineItem = {
  id: string;
  category: string;
  description: string;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
  amount: number;
};

export type Invoice = {
  id: string;
  siteId: string;
  siteName: string;
  clientCompany: string;
  invoiceNumber?: string;
  issueDate?: string;
  subject?: string;
  workDescription: string;
  workDate: string;
  paymentTerms?: string;
  dueDate?: string;
  notes?: string;
  laborCount: number;
  dailyRate: number;
  materialCost: number;
  otherCost: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: "下書き" | "送付済み" | "入金済み";
  lineItems?: InvoiceLineItem[];
  pdfUrl?: string;
};

export type Estimate = {
  id: string;
  siteId: string;
  siteName: string;
  clientCompany: string;
  estimateNumber?: string;
  issueDate?: string;
  subject?: string;
  constructionPeriod?: string;
  workPlace?: string;
  paymentTerms?: string;
  notes?: string;
  workDescription: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  expiryDate: string;
  status: "下書き" | "送付済み" | "受注" | "失注";
  pdfUrl?: string;
};

export type Qualification = {
  id: string;
  qualificationName: string;
  acquiredDate: string;
  expiryDate: string;
  imageUrl: string;
  memo: string;
};

export type Vehicle = {
  id: string;
  vehicleName: string;
  vehicleNumber: string;
  vehicleType: string;
  inspectionExpiryDate: string;
  compulsoryInsuranceExpiryDate: string;
  optionalInsuranceExpiryDate: string;
  inspectionDocumentUrl: string;
  compulsoryInsuranceDocumentUrl: string;
  optionalInsuranceDocumentUrl: string;
  memo: string;
};

export type AdminUser = {
  id: string;
  email: string;
  role: "user" | "admin";
  plan: Plan;
  status: "active" | "suspended";
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string;
  currentPeriodEndsAt: string;
  createdAt: string;
  supportMemo: string;
};
