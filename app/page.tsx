"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeJapaneseYen,
  Building2,
  CalendarDays,
  Camera,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileDown,
  FileText,
  Home,
  IdCard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { hasSupabase, supabase } from "@/lib/supabase";
import {
  deleteCalendarScheduleRemote,
  deleteEstimateRemote,
  deleteInvoiceRemote,
  deleteReceiptRemote,
  loadRemoteData,
  saveCalendarScheduleRemote,
  saveEstimateRemote,
  saveInvoiceRemote,
  saveProfileRemote,
  saveQualificationRemote,
  saveReceiptRemote,
  saveSiteRemote,
  saveVehicleRemote,
  saveWorkLogRemote,
  uploadReceiptImageRemote,
  updateUserPlanRemote,
  updateUserStatusRemote
} from "@/lib/remote-data";
import { ensureImageFile, fileToDataUrl } from "@/lib/client-files";
import { buildCalendarItems } from "@/lib/calendar-items";
import { addMonths, calendarCells, calendarKindClass, daysLeft, isCurrentMonth, localDateInput, monthInput } from "@/lib/calendar-domain";
import { createInvoiceDraftFromSchedule, createInvoiceDraftFromWorkLog } from "@/lib/invoice-workflow";
import { INVOICE_LINE_ITEM_CATEGORIES, INVOICE_LINE_ITEM_UNITS, MAX_INVOICE_LINE_ITEMS, MIN_INVOICE_LINE_ITEMS, calculateInvoiceTotals, normalizeInvoiceLineItems } from "@/lib/invoice-line-items";
import { STORAGE_ERROR_EVENT, STORAGE_LIMIT_MESSAGE, accountKey, getLocalAccounts, hashPassword, normalizeEmail, saveLocalAccounts, setLocalStorageItem, useStoredState } from "@/lib/local-state";
import { buildPrintableDocumentHtml } from "@/lib/pdf-documents";
import { receiptStatusLabel } from "@/lib/receipt-domain";
import { RECEIPT_ACCOUNT_CATEGORIES, normalizeReceiptText, parseReceiptOcr, prepareReceiptImage, scoreReceiptOcr, type ReceiptOcrFields } from "@/lib/receipt-ocr";
import type { AdminUser, CalendarSchedule, Estimate, Invoice, InvoiceLineItem, Plan, Profile, Qualification, Receipt, Site, Vehicle, WorkLog } from "@/lib/types";

type Tab =
  | "home"
  | "todayWork"
  | "calendar"
  | "profile"
  | "sites"
  | "receipts"
  | "invoices"
  | "estimates"
  | "qualifications"
  | "vehicles"
  | "documents"
  | "plans"
  | "admin"
  | "settings";

const today = localDateInput();
const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

const blankProfile: Profile = {
  companyName: "",
  name: "",
  postalCode: "",
  phone: "",
  fax: "",
  email: "",
  address: "",
  contactName: "",
  trade: "電気工事",
  area: "",
  invoiceNumber: "",
  bankName: "",
  bankBranch: "",
  bankType: "普通",
  bankAccountNumber: "",
  bankAccountName: ""
};

const seedUsers: AdminUser[] = [
  { id: "u-1", email: "demo@genba.local", role: "user", plan: "Professional", status: "active", subscriptionStatus: "active", trialEndsAt: "", currentPeriodEndsAt: "", createdAt: today, supportMemo: "初期デモユーザー" },
  { id: "u-2", email: "starter@genba.local", role: "user", plan: "Starter", status: "active", subscriptionStatus: "trialing", trialEndsAt: "", currentPeriodEndsAt: "", createdAt: today, supportMemo: "" }
];

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function num(value: FormDataEntryValue | null) {
  return Number(value || 0);
}

function authErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "メールまたはパスワードが違います";
  if (lower.includes("email not confirmed")) return "確認メールのボタンを押してからログインしてください";
  if (lower.includes("user already registered") || lower.includes("already registered")) return "このメールは登録済みです。ログインしてください";
  if (lower.includes("password should be") || lower.includes("weak password")) return "パスワードは6文字以上で、推測されにくいものにしてください";
  if (lower.includes("email rate limit") || lower.includes("rate limit")) return "メール送信が続いています。少し時間をおいてから試してください";
  if (lower.includes("signup is disabled")) return "新規登録が一時停止されています。管理者に確認してください";
  if (lower.includes("network") || lower.includes("fetch")) return "通信できませんでした。電波やネット接続を確認してください";
  return message || "処理できませんでした。少し時間をおいてもう一度試してください";
}

function Field({ label, name, type = "text", required, defaultValue, placeholder }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string | number; placeholder?: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink">
      {label}
      <input
        className="tap min-h-12 min-w-0 w-full rounded-lg border border-line bg-white px-4 py-3 text-base outline-none focus:border-genba focus:ring-4 focus:ring-skysoft"
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField({ label, name, children, defaultValue }: { label: string; name: string; children: React.ReactNode; defaultValue?: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink">
      {label}
      <select name={name} defaultValue={defaultValue} className="tap min-h-12 min-w-0 w-full rounded-lg border border-line bg-white px-4 py-3 text-base outline-none focus:border-genba focus:ring-4 focus:ring-skysoft">
        {children}
      </select>
    </label>
  );
}

function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink">
      {label}
      <textarea name={name} defaultValue={defaultValue} rows={3} className="min-h-24 min-w-0 w-full rounded-lg border border-line bg-white px-4 py-3 text-base outline-none focus:border-genba focus:ring-4 focus:ring-skysoft" />
    </label>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto min-w-0 w-full max-w-full rounded-lg border border-line bg-white p-4 shadow-soft ${className}`}>{children}</section>;
}

function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-lg bg-skysoft text-genba">{icon}</div>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {sub ? <p className="text-sm text-slate-600">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [userEmail, setUserEmail] = useStoredState("genba:user", "");
  const [userId, setUserId] = useStoredState("genba:user-id", "");
  const storagePrefix = `genba:${accountKey(userEmail)}:`;
  const [profile, setProfile] = useStoredState<Profile>(`${storagePrefix}profile`, blankProfile);
  const [sites, setSites] = useStoredState<Site[]>(`${storagePrefix}sites`, []);
  const [receipts, setReceipts] = useStoredState<Receipt[]>(`${storagePrefix}receipts`, []);
  const [calendarSchedules, setCalendarSchedules] = useStoredState<CalendarSchedule[]>(`${storagePrefix}calendar-schedules`, []);
  const [workLogs, setWorkLogs] = useStoredState<WorkLog[]>(`${storagePrefix}work-logs`, []);
  const [invoices, setInvoices] = useStoredState<Invoice[]>(`${storagePrefix}invoices`, []);
  const [estimates, setEstimates] = useStoredState<Estimate[]>(`${storagePrefix}estimates`, []);
  const [qualifications, setQualifications] = useStoredState<Qualification[]>(`${storagePrefix}qualifications`, []);
  const [vehicles, setVehicles] = useStoredState<Vehicle[]>(`${storagePrefix}vehicles`, []);
  const [adminUsers, setAdminUsers] = useStoredState<AdminUser[]>("genba:admin-users", seedUsers);
  const [message, setMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState(hasSupabase ? "Supabase確認中" : "この端末に保存");
  const [authReady, setAuthReady] = useState(!hasSupabase);
  const [hasRemoteSession, setHasRemoteSession] = useState(!hasSupabase);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [receiptOcrStatus, setReceiptOcrStatus] = useState("写真を選んでください");
  const [receiptOcrText, setReceiptOcrText] = useState("");
  const [receiptOcrFields, setReceiptOcrFields] = useState<ReceiptOcrFields | null>(null);
  const [receiptConfirmVisible, setReceiptConfirmVisible] = useState(false);
  const [receiptFilter, setReceiptFilter] = useState<"all" | "unprocessed" | "processed">("all");
  const [editingReceiptId, setEditingReceiptId] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(monthInput());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(today);
  const [calendarAddFocus, setCalendarAddFocus] = useState(false);
  const [workLogDate, setWorkLogDate] = useState(today);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    const showStorageError = (event: Event) => {
      setMessage((event as CustomEvent<string>).detail || STORAGE_LIMIT_MESSAGE);
    };
    window.addEventListener(STORAGE_ERROR_EVENT, showStorageError);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, showStorageError);
  }, []);

  useEffect(() => {
    if (tab === "calendar" && calendarAddFocus) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [calendarAddFocus, tab]);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    let mounted = true;
    const applySession = (session: { user?: { id: string; email?: string | null } } | null) => {
      if (!mounted) return;
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? "");
        setHasRemoteSession(true);
      } else {
        setUserId("");
        setUserEmail("");
        setHasRemoteSession(false);
      }
      setAuthReady(true);
    };
    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      applySession(session);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setUserEmail, setUserId]);

  useEffect(() => {
    if (!userId || !supabase || !hasRemoteSession) {
      setSyncStatus(hasSupabase ? "ログイン後に同期" : "この端末に保存");
      return;
    }

    let cancelled = false;
    setSyncStatus("Supabase同期中");
    loadRemoteData()
      .then((data) => {
        if (!data || cancelled) return;
        if (data.profile) setProfile(data.profile);
        setSites(data.sites);
        setReceipts(data.receipts);
        setWorkLogs(data.workLogs);
        setCalendarSchedules(data.calendarSchedules);
        setQualifications(data.qualifications);
        setVehicles(data.vehicles);
        setInvoices(data.invoices);
        setEstimates(data.estimates);
        if (data.adminUsers) setAdminUsers(data.adminUsers);
        setSyncStatus("Supabase同期済み");
      })
      .catch((error) => setSyncStatus(`同期エラー: ${error.message}`));

    return () => {
      cancelled = true;
    };
  }, [hasRemoteSession, userId, setAdminUsers, setCalendarSchedules, setEstimates, setInvoices, setProfile, setQualifications, setReceipts, setSites, setVehicles, setWorkLogs]);

  const currentSite = sites[0];
  const todayWorkLog = workLogs.find((log) => log.date === today);
  const todayWorkProgress = [todayWorkLog?.memo, todayWorkLog?.receiptDone, todayWorkLog?.photoDone, todayWorkLog?.invoiceReady].filter(Boolean).length;
  const monthSales = invoices.filter((invoice) => invoice.status === "入金済み" && isCurrentMonth(invoice.issueDate ?? "")).reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const unprocessedReceipts = receipts.filter((r) => r.status === "未処理");
  const monthExpense = receipts.filter((receipt) => isCurrentMonth(receipt.date)).reduce((sum, receipt) => sum + receipt.amount, 0);
  const filteredReceipts = receipts.filter((receipt) => {
    if (receiptFilter === "unprocessed") return receipt.status === "未処理";
    if (receiptFilter === "processed") return receipt.status === "処理済み";
    return true;
  });
  const editingReceipt = receipts.find((receipt) => receipt.id === editingReceiptId);
  const calendarItems = useMemo(() => buildCalendarItems({
    calendarSchedules,
    sites,
    receipts,
    workLogs,
    invoices,
    estimates,
    qualifications,
    vehicles,
    formatCurrency: (amount) => yen.format(amount)
  }), [calendarSchedules, estimates, invoices, qualifications, receipts, sites, vehicles, workLogs]);
  const selectedCalendarItems = calendarItems.filter((item) => item.date === selectedCalendarDate);
  const selectedOtherCalendarItems = selectedCalendarItems.filter((item) => item.kind !== "予定");
  const monthCalendarItems = calendarItems.filter((item) => item.date.startsWith(calendarMonth));
  const todayCalendarItems = calendarItems.filter((item) => item.date === today);
  const todaySchedules = calendarSchedules.filter((item) => item.date === today);
  const selectedDateSchedules = calendarSchedules.filter((item) => item.date === selectedCalendarDate);
  const todayMainSchedule = todaySchedules[0];
  const activeWorkLog = workLogs.find((log) => log.date === workLogDate);
  const activeWorkProgress = [activeWorkLog?.memo, activeWorkLog?.receiptDone, activeWorkLog?.photoDone, activeWorkLog?.invoiceReady].filter(Boolean).length;
  const activeWorkSchedule = calendarSchedules.find((item) => item.date === workLogDate);
  const todaySiteItems = todayCalendarItems.filter((item) => item.kind === "現場");
  const workerLabel = profile.name || profile.companyName || "自分";
  const mainSiteLabel = todayMainSchedule?.siteName || todaySiteItems[0]?.title || currentSite?.siteName || "現場未登録";
  const mainSiteSub = todayMainSchedule?.workDescription || todaySiteItems[0]?.sub || currentSite?.address || "カレンダーに予定を入れると今日の流れに出ます";
  const otherTodayItems = todayCalendarItems.filter((item) => item.kind !== "現場");
  const isAdminUser = adminUsers.some((user) => normalizeEmail(user.email) === normalizeEmail(userEmail) && user.role === "admin" && user.status === "active");

  const documentRows = useMemo(
    () => [
      ...invoices.map((item) => ({ type: "請求書", title: item.clientCompany, status: item.status, siteId: item.siteId })),
      ...estimates.map((item) => ({ type: "見積書", title: item.clientCompany, status: item.status, siteId: item.siteId })),
      ...receipts.map((item) => ({ type: "領収書", title: item.storeName, status: item.status, siteId: item.siteId })),
      ...qualifications.map((item) => ({ type: "資格証", title: item.qualificationName, status: daysLeft(item.expiryDate) < 0 ? "期限切れ" : "保管中", siteId: "" })),
      ...vehicles.map((item) => ({ type: "車両書類", title: item.vehicleName, status: daysLeft(item.inspectionExpiryDate) < 0 ? "期限切れ" : "保管中", siteId: "" }))
    ],
    [invoices, estimates, receipts, qualifications, vehicles]
  );

  async function signIn(mode: "login" | "signup" | "google" | "demo") {
    setMessage("");
    const normalizedEmail = normalizeEmail(email);
    if (mode !== "demo" && mode !== "google" && (!normalizedEmail || password.length < 6)) {
      setMessage("メールと6文字以上のパスワードを入れてください");
      return;
    }

    if (mode === "google" && supabase) {
      await supabase.auth.signInWithOAuth({ provider: "google" });
      return;
    }
    if (mode === "google" && !supabase) {
      setMessage("Googleログインは本番DB接続後に使えます。今はメール登録を使ってください");
      return;
    }

    setIsAuthBusy(true);
    if (hasSupabase && supabase && mode !== "demo") {
      const result =
        mode === "signup"
          ? await supabase.auth.signUp({ email: normalizedEmail, password })
          : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (result.error) {
        setMessage(authErrorMessage(result.error.message));
        setIsAuthBusy(false);
        return;
      }
      if (result.data.session?.user) {
        setUserId(result.data.session.user.id);
        setUserEmail(result.data.session.user.email ?? normalizedEmail);
        setTab("home");
        setIsAuthBusy(false);
        return;
      }
      if (mode === "signup" && result.data.user) {
        setMessage("確認メールを送りました。\n1. メールを開く\n2. 青い確認ボタンを押す\n3. この画面に戻ってログイン\n迷惑メールフォルダも確認してください");
        setIsAuthBusy(false);
        return;
      }
      setMessage("ログイン状態を確認できませんでした。もう一度ログインしてください");
      setIsAuthBusy(false);
      return;
    }

    if (!hasSupabase && mode === "signup") {
      const accounts = getLocalAccounts();
      if (accounts.some((account) => account.email === normalizedEmail)) {
        setMessage("このメールは登録済みです。ログインしてください");
        return;
      }
      const saved = saveLocalAccounts([...accounts, { email: normalizedEmail, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() }]);
      if (!saved) {
        setMessage(STORAGE_LIMIT_MESSAGE);
        setIsAuthBusy(false);
        return;
      }
      setUserId(`local:${normalizedEmail}`);
      setUserEmail(normalizedEmail);
      setTab("profile");
      setMessage("登録しました。まずプロフィールを入れてください");
      setIsAuthBusy(false);
      return;
    }

    if (!hasSupabase && mode === "login") {
      const accounts = getLocalAccounts();
      const account = accounts.find((item) => item.email === normalizedEmail);
      const passwordHash = await hashPassword(password);
      const isLegacyPassword = Boolean(account?.password && account.password === password);
      if (!account || (account.passwordHash !== passwordHash && !isLegacyPassword)) {
        setMessage("メールまたはパスワードが違います");
        return;
      }
      if (isLegacyPassword) {
        saveLocalAccounts(accounts.map((item) => item.email === normalizedEmail ? { email: item.email, passwordHash, createdAt: item.createdAt } : item));
      }
      setUserId(`local:${normalizedEmail}`);
      setUserEmail(normalizedEmail);
      setTab("home");
      setIsAuthBusy(false);
      return;
    }

    if (mode === "demo") {
      setUserId("");
      setUserEmail("demo@genba.local");
    }
    setTab("home");
    setIsAuthBusy(false);
  }

  async function sendPasswordReset() {
    setMessage("");
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setMessage("先にメールを入れてください");
      return;
    }
    if (!supabase) {
      setMessage("パスワード再設定は本番DB接続後に使えます");
      return;
    }
    setIsAuthBusy(true);
    const result = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/`
    });
    setIsAuthBusy(false);
    if (result.error) {
      setMessage(authErrorMessage(result.error.message));
      return;
    }
    setMessage("パスワード再設定メールを送りました。メール内のボタンを押してください");
  }

  async function updateRecoveredPassword() {
    setMessage("");
    if (!supabase) return;
    if (newPassword.length < 6) {
      setMessage("新しいパスワードは6文字以上にしてください");
      return;
    }
    setIsAuthBusy(true);
    const result = await supabase.auth.updateUser({ password: newPassword });
    setIsAuthBusy(false);
    if (result.error) {
      setMessage(authErrorMessage(result.error.message));
      return;
    }
    setNewPassword("");
    setIsPasswordRecovery(false);
    setMessage("パスワードを変更しました。次回から新しいパスワードでログインできます");
  }

  async function saveRemote(action: (id: string) => Promise<void>) {
    if (!userId || !supabase) return;
    try {
      await action(userId);
      setSyncStatus("Supabase同期済み");
    } catch (error) {
      setSyncStatus(`同期エラー: ${authErrorMessage((error as Error).message)}`);
    }
  }

  async function storeReceiptImage(file: File | null, receiptId: string): Promise<Pick<Receipt, "imageUrl" | "imagePath" | "imageMimeType" | "imageSize">> {
    const imageFile = ensureImageFile(file);
    if (!imageFile) return { imageUrl: "" };
    if (supabase && userId) {
      const uploaded = await uploadReceiptImageRemote(imageFile, userId, receiptId);
      if (uploaded) return uploaded;
    }
    return {
      imageUrl: await fileToDataUrl(imageFile),
      imageMimeType: imageFile.type || "image/jpeg",
      imageSize: imageFile.size
    };
  }

  async function downloadPdf(title: string, rows: Array<[string, string]>, note?: string) {
    const html = buildPrintableDocumentHtml({ title, rows, issuerName: note });
    if (!setLocalStorageItem("genba:print-html", html)) {
      setMessage(STORAGE_LIMIT_MESSAGE);
      return;
    }
    window.location.href = "/print";
  }

  async function readReceiptPhoto(form: HTMLFormElement | null) {
    if (!form) return;
    const imageInput = form.elements.namedItem("image") as HTMLInputElement | null;
    const file = imageInput?.files?.[0] ?? null;
    if (!file) {
      setReceiptOcrStatus("先に領収書写真を選んでください");
      return;
    }

    setReceiptOcrStatus("初回は準備に1分ほどかかります。次回から速くなります。写真を読み取り中です");
    setReceiptOcrText("");
    setReceiptOcrFields(null);
    setReceiptConfirmVisible(false);
    let worker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | null = null;
    try {
      const { createWorker, PSM } = await import("tesseract.js");
      const imageUrl = await prepareReceiptImage(file);
      worker = await createWorker("jpn+eng", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setReceiptOcrStatus(`写真を読み取り中です。${Math.round(message.progress * 100)}%`);
          }
        }
      });
      await worker.setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: PSM.AUTO,
        user_defined_dpi: "300"
      });
      const firstResult = await worker.recognize(imageUrl);
      let parsed = parseReceiptOcr(firstResult.data.text);
      let rawText = firstResult.data.text;
      if (scoreReceiptOcr(parsed) < 2) {
        setReceiptOcrStatus("もう一度、細かい文字を探しています");
        await worker.setParameters({
          preserve_interword_spaces: "1",
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          user_defined_dpi: "300"
        });
        const retryResult = await worker.recognize(imageUrl);
        const retryParsed = parseReceiptOcr(retryResult.data.text);
        if (scoreReceiptOcr(retryParsed) >= scoreReceiptOcr(parsed)) {
          parsed = retryParsed;
          rawText = retryResult.data.text;
        }
      }
      const setValue = (name: string, value: string) => {
        const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
        if (field) field.value = value;
      };
      setValue("date", parsed.date);
      setValue("storeName", parsed.storeName);
      setValue("amount", parsed.amount ? String(parsed.amount) : "");
      setValue("taxAmount", parsed.taxAmount ? String(parsed.taxAmount) : "");
      setValue("purpose", parsed.purpose);
      setValue("memo", parsed.memo);
      setValue("ocrCompleted", "1");
      setReceiptOcrFields(parsed);
      setReceiptOcrText(normalizeReceiptText(rawText).slice(0, 320));
      setReceiptConfirmVisible(true);
      setReceiptOcrStatus(parsed.amount || parsed.storeName || parsed.date ? "読み取れた項目を自動入力しました。保存前に確認してください" : "文字は読み取りましたが、項目を判定できませんでした。手入力で補ってください");
    } catch (error) {
      setReceiptOcrStatus(`読み取りできませんでした：${(error as Error).message}`);
      setReceiptConfirmVisible(true);
    } finally {
      await worker?.terminate();
    }
  }

  async function quickSaveReceiptPhoto(form: HTMLFormElement | null) {
    if (!form) return;
    const fd = new FormData(form);
    const file = (fd.get("image") as File) || null;
    if (!file || !file.size) {
      setReceiptOcrStatus("先に領収書写真を選んでください");
      return;
    }

    const receiptId = uid("receipt");
    let imageInfo: Pick<Receipt, "imageUrl" | "imagePath" | "imageMimeType" | "imageSize"> = { imageUrl: "" };
    try {
      imageInfo = await storeReceiptImage(file, receiptId);
    } catch (error) {
      setReceiptOcrStatus((error as Error).message);
      return;
    }
    const receipt: Receipt = {
      id: receiptId,
      siteId: String(fd.get("siteId") || ""),
      ...imageInfo,
      date: String(fd.get("date") || today),
      storeName: "あとで確認",
      amount: 0,
      taxAmount: 0,
      purpose: "その他",
      memo: "写真だけ先に保存",
      status: "未処理" as const,
      ocrStatus: "読取待ち" as const
    };
    setReceipts([receipt, ...receipts]);
    await saveRemote((id) => saveReceiptRemote(receipt, id));
    form.reset();
    setReceiptOcrFields(null);
    setReceiptOcrText("");
    setReceiptConfirmVisible(false);
    setReceiptOcrStatus("写真だけ先に保存しました。あとで確認できます");
    setMessage("領収書を未処理一覧とカレンダーに入れました");
  }

  async function saveWorkLogFromForm(form: HTMLFormElement) {
    const fd = new FormData(form);
    const date = String(fd.get("date") || today);
    const siteId = String(fd.get("siteId") || "");
    const site = sites.find((item) => item.id === siteId);
    const schedule = calendarSchedules.find((item) => item.date === date && (!siteId || item.siteId === siteId));
    const photoInput = form.elements.namedItem("photos") as HTMLInputElement | null;
    let newPhotos: string[] = [];
    try {
      newPhotos = await Promise.all(Array.from(photoInput?.files ?? []).map((file) => fileToDataUrl(file)));
    } catch (error) {
      setMessage((error as Error).message);
      return;
    }
    const existing = workLogs.find((log) => log.date === date);
    const workLog: WorkLog = {
      id: existing?.id ?? uid("work"),
      date,
      siteId,
      siteName: site?.siteName || schedule?.siteName || String(fd.get("siteName") || ""),
      workers: String(fd.get("workers") || schedule?.workers || ""),
      memo: String(fd.get("memo") || schedule?.workDescription || ""),
      photoUrls: [...(existing?.photoUrls ?? []), ...newPhotos].slice(0, 12),
      receiptDone: fd.get("receiptDone") === "on",
      photoDone: fd.get("photoDone") === "on",
      invoiceReady: fd.get("invoiceReady") === "on",
      createdAt: existing?.createdAt ?? new Date().toISOString()
    };
    setWorkLogs([workLog, ...workLogs.filter((log) => log.id !== workLog.id)]);
    await saveRemote((id) => saveWorkLogRemote(workLog, id));
    setMessage("日報を保存しました。おつかれさまです");
    form.reset();
  }

  async function saveCalendarScheduleFromForm(form: HTMLFormElement) {
    const fd = new FormData(form);
    const date = String(fd.get("date") || selectedCalendarDate || today);
    const siteId = String(fd.get("siteId") || "");
    const site = sites.find((item) => item.id === siteId);
    const siteName = String(fd.get("siteName") || site?.siteName || "").trim();
    const clientCompany = String(fd.get("clientCompany") || site?.clientCompany || "").trim();
    const dailyRate = num(fd.get("dailyRate")) || site?.dailyRate || 25000;
    const schedule: CalendarSchedule = {
      id: uid("schedule"),
      date,
      siteId,
      siteName: siteName || "現場予定",
      clientCompany,
      workDescription: String(fd.get("workDescription") || site?.workDescription || "現場作業").trim(),
      startTime: String(fd.get("startTime") || "").trim(),
      endTime: String(fd.get("endTime") || "").trim(),
      workers: String(fd.get("workers") || workerLabel).trim(),
      laborCount: num(fd.get("laborCount")) || 1,
      dailyRate,
      memo: String(fd.get("memo") || "").trim(),
      createdAt: new Date().toISOString()
    };
    setCalendarSchedules([schedule, ...calendarSchedules]);
    setCalendarMonth(schedule.date.slice(0, 7));
    setSelectedCalendarDate(schedule.date);
    setCalendarAddFocus(false);
    await saveRemote((id) => saveCalendarScheduleRemote(schedule, id));
    setMessage("予定をカレンダーに入れました。当日は日報記入だけで進められます");
    form.reset();
  }

  async function deleteCalendarSchedule(scheduleId: string) {
    setCalendarSchedules(calendarSchedules.filter((item) => item.id !== scheduleId));
    await saveRemote(() => deleteCalendarScheduleRemote(scheduleId));
    setMessage("予定を削除しました");
  }

  function startReceiptEdit(receipt: Receipt) {
    setEditingReceiptId(receipt.id);
    setReceiptOcrFields(null);
    setReceiptOcrText("");
    setReceiptConfirmVisible(true);
    setReceiptOcrStatus("選択した領収書を編集できます");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetReceiptForm() {
    setEditingReceiptId("");
    setReceiptOcrFields(null);
    setReceiptOcrText("");
    setReceiptConfirmVisible(false);
    setReceiptOcrStatus("写真を選んでください");
  }

  async function toggleReceiptStatus(receipt: Receipt) {
    const updated: Receipt = { ...receipt, status: receipt.status === "未処理" ? "処理済み" : "未処理" };
    setReceipts(receipts.map((item) => item.id === updated.id ? updated : item));
    await saveRemote((id) => saveReceiptRemote(updated, id));
    setMessage(updated.status === "処理済み" ? "領収書を処理済みにしました" : "領収書を未処理に戻しました");
  }

  async function deleteReceipt(receiptId: string) {
    setReceipts(receipts.filter((item) => item.id !== receiptId));
    if (editingReceiptId === receiptId) resetReceiptForm();
    await saveRemote(() => deleteReceiptRemote(receiptId));
    setMessage("領収書を削除しました");
  }

  async function createInvoiceFromSchedule(schedule: CalendarSchedule) {
    const site = sites.find((item) => item.id === schedule.siteId);
    const invoice = createInvoiceDraftFromSchedule(schedule, site, uid("invoice"), today);
    const updatedSchedule = { ...schedule, invoiceId: invoice.id };
    setInvoices([invoice, ...invoices]);
    setCalendarSchedules(calendarSchedules.map((item) => item.id === schedule.id ? updatedSchedule : item));
    await saveRemote(async (id) => {
      await saveInvoiceRemote(invoice, id);
      await saveCalendarScheduleRemote(updatedSchedule, id);
    });
    setMessage("カレンダー予定から請求書の下書きを作りました");
    setTab("invoices");
  }

  async function createInvoiceFromWorkLog(log: WorkLog) {
    const site = sites.find((item) => item.id === log.siteId);
    const schedule = calendarSchedules.find((item) => item.date === log.date && (!log.siteId || item.siteId === log.siteId));
    const invoice = createInvoiceDraftFromWorkLog(log, site, schedule, uid("invoice"), today);
    const updatedSchedule = schedule ? { ...schedule, invoiceId: invoice.id } : null;
    setInvoices([invoice, ...invoices]);
    if (updatedSchedule) setCalendarSchedules(calendarSchedules.map((item) => item.id === updatedSchedule.id ? updatedSchedule : item));
    await saveRemote(async (id) => {
      await saveInvoiceRemote(invoice, id);
      if (updatedSchedule) await saveCalendarScheduleRemote(updatedSchedule, id);
    });
    setMessage("日報から請求書の下書きを作りました");
    setTab("invoices");
  }

  if (!authReady) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-genba text-white">
          <ClipboardList size={34} />
        </div>
        <div>
          <h1 className="text-3xl font-black">親方の味方</h1>
          <p className="mt-2 text-slate-600">ログイン状態を確認しています</p>
        </div>
      </main>
    );
  }

  if (isPasswordRecovery) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-8">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-lg bg-genba text-white">
            <ShieldCheck size={34} />
          </div>
          <h1 className="text-3xl font-black">パスワード再設定</h1>
          <p className="mt-2 text-slate-600">新しいパスワードを入れてください</p>
        </div>
        <Card>
          <div className="grid gap-3">
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink">
              新しいパスワード
              <input className="tap rounded-lg border border-line bg-white px-4 py-3 text-base" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>
            <button disabled={isAuthBusy} onClick={updateRecoveredPassword} className="tap rounded-lg bg-genba px-4 py-3 text-lg font-bold text-white disabled:opacity-60">{isAuthBusy ? "変更中..." : "パスワードを変更"}</button>
          </div>
          {message ? <p className="mt-3 whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}
        </Card>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-8">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-lg bg-genba text-white">
            <ClipboardList size={34} />
          </div>
          <h1 className="text-3xl font-black">親方の味方</h1>
          <p className="mt-2 text-slate-600">現場が終わったら5分で事務が終わる</p>
        </div>
        <Card>
          <div className="grid gap-3">
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink">
              メール
              <input className="tap rounded-lg border border-line bg-white px-4 py-3 text-base" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink">
              パスワード
              <input className="tap rounded-lg border border-line bg-white px-4 py-3 text-base" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <input className="hidden" value={email} onChange={() => undefined} />
            <button disabled={isAuthBusy} onClick={() => signIn("login")} className="tap rounded-lg bg-genba px-4 py-3 text-lg font-bold text-white disabled:opacity-60">{isAuthBusy ? "確認中..." : "ログイン"}</button>
            <button disabled={isAuthBusy} onClick={() => signIn("signup")} className="tap rounded-lg border border-genba bg-white px-4 py-3 font-bold text-genba disabled:opacity-60">新しく登録</button>
            {hasSupabase ? <button disabled={isAuthBusy} onClick={() => signIn("google")} className="tap rounded-lg border border-line bg-white px-4 py-3 font-bold disabled:opacity-60">Googleでログイン</button> : null}
            {hasSupabase ? <button disabled={isAuthBusy} onClick={sendPasswordReset} className="tap rounded-lg border border-line bg-white px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60">パスワードを忘れた</button> : null}
            <button disabled={isAuthBusy} onClick={() => signIn("demo")} className="tap rounded-lg bg-skysoft px-4 py-3 font-bold text-genba disabled:opacity-60">お試し画面を見る</button>
          </div>
          {!hasSupabase ? <p className="mt-3 text-xs leading-5 text-slate-500">公開版はすぐ使える端末保存モードです。登録したメールごとにデータを分けて保存します。</p> : null}
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">
            登録すると <a className="font-bold text-genba underline" href="/terms">利用規約</a> と <a className="font-bold text-genba underline" href="/privacy">プライバシーポリシー</a> に同意したことになります。
          </p>
          {message ? <p className="mt-3 whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}
        </Card>
      </main>
    );
  }

  const nav: Array<[Tab, string, React.ReactNode]> = [
    ["home", "ホーム", <Home key="home" size={22} />],
    ["calendar", "カレンダー", <CalendarDays key="calendar" size={22} />],
    ["receipts", "領収書", <Camera key="receipts" size={22} />],
    ["invoices", "請求書", <FileText key="invoices" size={22} />],
    ["settings", "設定", <Settings key="settings" size={22} />],
    ["sites", "現場", <Building2 key="sites" size={22} />],
    ["estimates", "見積書", <ClipboardList key="estimates" size={22} />],
    ["qualifications", "資格証", <IdCard key="qualifications" size={22} />],
    ["vehicles", "車両", <Car key="vehicles" size={22} />],
    ["documents", "書類", <FileDown key="documents" size={22} />],
    ...(isAdminUser ? [["admin", "管理", <ShieldCheck key="admin" size={22} />] as [Tab, string, React.ReactNode]] : [])
  ];

  const scheduleForm = (className = "") => (
    <div className={`rounded-lg border border-line bg-white p-4 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-genba">予定の追加</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">先に予定を入れて、当日は日報だけにします</p>
        </div>
        <span className="shrink-0 rounded-lg bg-skysoft px-3 py-2 text-xs font-bold text-genba">{selectedCalendarDate}</span>
      </div>
      <form key={selectedCalendarDate} className="grid gap-3" onSubmit={async (e) => {
        e.preventDefault();
        await saveCalendarScheduleFromForm(e.currentTarget);
      }}>
        <Field label="日付" name="date" type="date" defaultValue={selectedCalendarDate} />
        <SiteSelect sites={sites} defaultValue={currentSite?.id} />
        <Field label="現場名" name="siteName" placeholder="例：渋谷マンション改修" />
        <Field label="請求先会社名" name="clientCompany" placeholder="例：山田建設" />
        <Field label="作業内容" name="workDescription" required placeholder="例：電気配線、器具付け" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="開始予定時刻" name="startTime" type="time" />
          <Field label="終了予定時刻" name="endTime" type="time" />
        </div>
        <Field label="作業員・応援者" name="workers" defaultValue={workerLabel} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="人工数" name="laborCount" type="number" defaultValue={1} />
          <Field label="人工単価" name="dailyRate" type="number" defaultValue={currentSite?.dailyRate || 25000} />
        </div>
        <TextArea label="予定メモ" name="memo" />
        <SaveButton label="予定をカレンダーに入れる" />
      </form>
    </div>
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-md overflow-x-hidden bg-[#f7fbff] px-4 pb-28 pt-4">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-line bg-[#f7fbff]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-genba">効率重視のAI事務アシスタント</p>
            <h1 className="text-2xl font-black">親方の味方</h1>
            <p className="mt-1 text-xs text-slate-500">{syncStatus}</p>
          </div>
          <button onClick={() => setTab("settings")} className="grid h-12 w-12 place-items-center rounded-lg bg-white text-genba shadow-soft" aria-label="メニュー">
            <Menu />
          </button>
        </div>
      </header>

      {tab === "home" && (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[7fr_3fr]">
            <button onClick={() => { setCalendarMonth(monthInput()); setSelectedCalendarDate(today); setCalendarAddFocus(false); setTab("calendar"); }} className="tap rounded-lg border border-line bg-white p-5 text-left shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-genba">カレンダー</p>
                  <h2 className="mt-1 text-3xl font-black text-ink">{today}</h2>
                  <p className="mt-2 text-sm text-slate-600">作業員：{workerLabel}</p>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-skysoft text-genba">
                  <CalendarDays />
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                <div className="rounded-lg bg-skysoft p-3">
                  <p className="text-xs font-bold text-slate-500">今日の現場</p>
                  <p className="mt-1 font-bold text-ink">{mainSiteLabel}</p>
                  <p className="text-xs text-slate-600">{mainSiteSub}</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2">
                  <span className="text-sm font-bold text-ink">今日の予定</span>
                  <span className="rounded-lg bg-genba px-2 py-1 text-xs font-bold text-white">{todayCalendarItems.length}件</span>
                </div>
                {otherTodayItems.slice(0, 2).map((item, index) => (
                  <div key={`${item.kind}-${item.title}-${index}`} className="rounded-lg border border-line bg-white p-3">
                    <span className={`rounded-lg px-2 py-1 text-xs font-bold ${calendarKindClass(item.kind)}`}>{item.kind}</span>
                    <p className="mt-2 font-bold text-ink">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.sub}</p>
                  </div>
                ))}
              </div>
            </button>

            <button onClick={() => { setWorkLogDate(today); setTab("todayWork"); }} className="tap rounded-lg border border-genba bg-genba p-4 text-left text-white shadow-soft">
              <div className="grid gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/15">
                  <CheckCircle2 />
                </span>
                <div>
                  <p className="text-sm font-bold opacity-90">日報記入</p>
                  <h2 className="mt-1 break-words text-2xl font-black">{today.slice(5).replace("-", "/")}</h2>
                  <p className="mt-2 text-sm opacity-90">{mainSiteLabel}</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-white/12 p-3">
                <p className="text-sm font-bold">{todayWorkLog ? `${todayWorkProgress}/4 完了` : "作業員・メモ・写真"}</p>
                <p className="mt-1 text-xs opacity-80">終わったらここ</p>
              </div>
            </button>
          </div>
          <Card>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["今月の売上", yen.format(monthSales)],
                ["今月の経費", yen.format(monthExpense)],
                ["未処理の領収書", `${unprocessedReceipts.length}枚`],
                ["今日の予定", `${todayCalendarItems.length}件`]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-skysoft p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-black">{value}</p>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "schedule-add", label: "予定を追加", icon: <CalendarDays key="schedule-add" />, action: () => { setCalendarMonth(monthInput()); setSelectedCalendarDate(today); setCalendarAddFocus(true); setTab("calendar"); } },
              { key: "receipts", label: "領収書を撮る", icon: <Camera key="a" />, action: () => setTab("receipts") },
              { key: "invoices", label: "請求書を作る", icon: <FileText key="b" />, action: () => setTab("invoices") },
              { key: "estimates", label: "見積書を作る", icon: <ClipboardList key="c" />, action: () => setTab("estimates") },
              { key: "sites", label: "現場を追加", icon: <Building2 key="d" />, action: () => setTab("sites") },
              { key: "documents", label: "書類一覧", icon: <FileDown key="g" />, action: () => setTab("documents") },
              { key: "settings", label: "設定", icon: <Settings key="h" />, action: () => setTab("settings") }
            ].map(({ key, label, icon, action }) => (
              <button key={key} onClick={action} className="tap grid min-h-28 place-items-center rounded-lg border border-line bg-white p-3 text-center font-bold shadow-soft">
                <span className="text-genba">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "todayWork" && (
        <div className="grid gap-4">
          <Card className="bg-genba text-white">
            <p className="text-sm opacity-90">日報記入</p>
            <h2 className="mt-1 text-2xl font-black">{workLogDate}</h2>
            <p className="mt-2 text-sm opacity-90">{activeWorkLog ? `片付け ${activeWorkProgress}/4 まで完了` : activeWorkSchedule ? "カレンダー予定から日報を書けます" : "現場終わりにここだけ残せばOK"}</p>
          </Card>

          <Card>
            <SectionTitle icon={<CheckCircle2 />} title="日報メモ" sub="作業員・メモ・写真をまとめます" />
            <form key={workLogDate} className="grid gap-3" onSubmit={async (e) => {
              e.preventDefault();
              await saveWorkLogFromForm(e.currentTarget);
            }}>
              <Field label="日付" name="date" type="date" defaultValue={activeWorkLog?.date || workLogDate} />
              <SiteSelect sites={sites} defaultValue={activeWorkLog?.siteId || activeWorkSchedule?.siteId} />
              <Field label="作業員・応援者" name="workers" defaultValue={activeWorkLog?.workers || activeWorkSchedule?.workers || workerLabel} placeholder="例：自分、佐藤さん、田中さん" />
              <TextArea label="今日やったこと" name="memo" defaultValue={activeWorkLog?.memo || activeWorkSchedule?.workDescription || ""} />
              <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink">
                現場写真
                <input name="photos" type="file" accept="image/*" multiple className="tap min-h-12 min-w-0 w-full rounded-lg border border-line bg-white px-4 py-3 text-base" />
              </label>
              <div className="grid gap-2 rounded-lg border border-line bg-white p-3">
                <p className="text-sm font-bold text-genba">今日の片付け</p>
                {[
                  ["receiptDone", "領収書を撮った", activeWorkLog?.receiptDone],
                  ["photoDone", "現場写真を残した", activeWorkLog?.photoDone],
                  ["invoiceReady", "請求書に回せる", activeWorkLog?.invoiceReady]
                ].map(([name, label, checked]) => (
                  <label key={String(name)} className="flex items-center gap-3 rounded-lg bg-skysoft p-3 text-sm font-bold text-ink">
                    <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="h-5 w-5 accent-[#176B87]" />
                    {label}
                  </label>
                ))}
              </div>
              <SaveButton label="日報を保存" />
            </form>
          </Card>

          {activeWorkLog ? (
            <Card>
              <p className="text-sm font-bold text-genba">保存済み</p>
              <h3 className="mt-1 text-xl font-black">{activeWorkLog.siteName || "現場未選択"}</h3>
              <p className="mt-1 text-sm text-slate-600">作業員：{activeWorkLog.workers || "未入力"}</p>
              {activeWorkLog.memo ? <p className="mt-3 rounded-lg bg-skysoft p-3 text-sm leading-6 text-slate-700">{activeWorkLog.memo}</p> : null}
              {activeWorkLog.photoUrls.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {activeWorkLog.photoUrls.slice(0, 6).map((url, index) => <img key={`${url}-${index}`} src={url} alt="" className="aspect-square rounded-lg object-cover" />)}
                </div>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => setTab("receipts")} className="tap rounded-lg border border-genba bg-white px-3 py-3 text-sm font-bold text-genba">領収書を撮る</button>
                <button onClick={() => createInvoiceFromWorkLog(activeWorkLog)} className="tap rounded-lg bg-genba px-3 py-3 text-sm font-bold text-white">請求書に回す</button>
              </div>
            </Card>
          ) : null}
        </div>
      )}

      {tab === "calendar" && (
        <div className="grid gap-4">
          {calendarAddFocus ? scheduleForm() : null}
          <Card>
            <SectionTitle icon={<CalendarDays />} title="予定カレンダー" sub="現場・期限・領収書をまとめて見ます" />
            <div className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-skysoft p-2">
              <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))} className="tap grid h-12 w-12 place-items-center rounded-lg border border-line bg-white text-genba" aria-label="前の月">
                <ChevronLeft />
              </button>
              <div className="min-w-0 text-center">
                <p className="text-xl font-black">{calendarMonth.replace("-", "年")}月</p>
                <button type="button" onClick={() => { setCalendarMonth(monthInput()); setSelectedCalendarDate(today); }} className="mt-1 rounded-lg bg-white px-3 py-1 text-xs font-bold text-genba">今日に戻る</button>
              </div>
              <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="tap grid h-12 w-12 place-items-center rounded-lg border border-line bg-white text-genba" aria-label="次の月">
                <ChevronRight />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
              {weekdayLabels.map((label) => <div key={label} className={`py-1 ${label === "日" ? "text-red-500" : label === "土" ? "text-blue-600" : ""}`}>{label}</div>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarCells(calendarMonth).map((date) => {
                const dayItems = calendarItems.filter((item) => item.date === date);
                const isSelected = date === selectedCalendarDate;
                const isToday = date === today;
                const isOtherMonth = !date.startsWith(calendarMonth);
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedCalendarDate(date)}
                    className={`tap min-h-16 rounded-lg border p-1 text-left ${isSelected ? "border-genba bg-skysoft shadow-soft" : "border-line bg-white"} ${isOtherMonth ? "opacity-40" : ""}`}
                  >
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${isToday ? "bg-genba text-white" : "text-ink"}`}>{Number(date.slice(-2))}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {dayItems.slice(0, 3).map((item, index) => <span key={`${item.title}-${index}`} className={`h-2 w-2 rounded-full ${calendarKindClass(item.kind).split(" ")[0]}`} />)}
                      {dayItems.length > 3 ? <span className="text-[10px] font-bold text-slate-500">+{dayItems.length - 3}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {calendarAddFocus ? null : scheduleForm("mt-4")}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-genba">選んだ日の予定</p>
                <h2 className="text-xl font-black">{selectedCalendarDate}</h2>
              </div>
              <p className="shrink-0 rounded-lg bg-skysoft px-3 py-2 text-sm font-bold text-genba">{selectedCalendarItems.length}件</p>
            </div>
            {selectedDateSchedules.length ? (
              <div className="mb-3 grid gap-3">
                {selectedDateSchedules.map((schedule) => (
                  <div key={schedule.id} className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${calendarKindClass("予定")}`}>予定</span>
                        <p className="mt-2 break-words text-lg font-black">{schedule.siteName || "現場未入力"}</p>
                        <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                          {[schedule.startTime && `${schedule.startTime}${schedule.endTime ? `-${schedule.endTime}` : ""}`, schedule.workDescription, schedule.workers || "作業員未入力"].filter(Boolean).join(" / ")}
                        </p>
                      </div>
                      <p className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-black text-genba">{yen.format((schedule.laborCount || 1) * (schedule.dailyRate || 0))}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button type="button" onClick={() => { setWorkLogDate(schedule.date); setTab("todayWork"); }} className="tap min-h-12 rounded-lg border border-genba bg-white px-3 py-3 text-sm font-bold text-genba">日報を書く</button>
                      <button type="button" onClick={() => createInvoiceFromSchedule(schedule)} className="tap min-h-12 rounded-lg bg-genba px-3 py-3 text-sm font-bold text-white">{schedule.invoiceId ? "請求書を再作成" : "請求書に回す"}</button>
                      <button type="button" onClick={() => deleteCalendarSchedule(schedule.id)} className="tap min-h-12 rounded-lg border border-red-200 bg-white px-3 py-3 text-sm font-bold text-red-700">削除</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {selectedOtherCalendarItems.length ? (
              <div className="grid gap-3">
                {selectedOtherCalendarItems.map((item, index) => (
                  <div key={`${item.date}-${item.title}-${index}`} className="rounded-lg border border-line bg-white p-4">
                    <span className={`rounded-lg px-2 py-1 text-xs font-bold ${calendarKindClass(item.kind)}`}>{item.kind}</span>
                    <p className="mt-2 font-black">{item.title}</p>
                    <p className="break-words text-sm leading-6 text-slate-600">{item.sub}</p>
                  </div>
                ))}
              </div>
            ) : selectedDateSchedules.length ? null : (
              <p className="rounded-lg bg-skysoft p-4 text-center text-sm text-slate-600">この日の予定はありません</p>
            )}
          </Card>

          <Card>
            <p className="text-sm font-bold text-genba">今月の予定</p>
            <List items={monthCalendarItems.slice(0, 8).map((item) => [item.title, `${item.date} / ${item.kind} / ${item.sub}`])} />
          </Card>
        </div>
      )}

      {tab === "profile" && (
        <Card>
          <SectionTitle icon={<UserRound />} title="プロフィール登録" sub="請求書・見積書に自動で入ります" />
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const nextProfile = {
                companyName: String(fd.get("companyName") || ""),
                name: String(fd.get("name") || ""),
                postalCode: String(fd.get("postalCode") || ""),
                phone: String(fd.get("phone") || ""),
                fax: String(fd.get("fax") || ""),
                email: String(fd.get("email") || ""),
                address: String(fd.get("address") || ""),
                contactName: String(fd.get("contactName") || ""),
                trade: String(fd.get("trade") || ""),
                area: String(fd.get("area") || ""),
                invoiceNumber: String(fd.get("invoiceNumber") || ""),
                bankName: String(fd.get("bankName") || ""),
                bankBranch: String(fd.get("bankBranch") || ""),
                bankType: String(fd.get("bankType") || ""),
                bankAccountNumber: String(fd.get("bankAccountNumber") || ""),
                bankAccountName: String(fd.get("bankAccountName") || "")
              };
              setProfile(nextProfile);
              await saveRemote((id) => saveProfileRemote(nextProfile, id));
              setMessage("プロフィールを保存しました");
            }}
          >
            <Field label="屋号" name="companyName" defaultValue={profile.companyName} />
            <Field label="氏名" name="name" defaultValue={profile.name} />
            <Field label="郵便番号" name="postalCode" defaultValue={profile.postalCode || ""} placeholder="例：123-4567" />
            <Field label="担当者名" name="contactName" defaultValue={profile.contactName || profile.name} />
            <Field label="電話番号" name="phone" defaultValue={profile.phone} />
            <Field label="FAX" name="fax" defaultValue={profile.fax || ""} />
            <Field label="メール" name="email" type="email" defaultValue={profile.email || userEmail} />
            <Field label="住所" name="address" defaultValue={profile.address} />
            <SelectField label="職種" name="trade" defaultValue={profile.trade}>
              {["電気工事", "設備工事", "空調工事", "内装", "塗装", "足場", "解体", "外構", "リフォーム", "ハウスクリーニング"].map((t) => <option key={t}>{t}</option>)}
            </SelectField>
            <Field label="対応エリア" name="area" defaultValue={profile.area} />
            <Field label="インボイス登録番号" name="invoiceNumber" defaultValue={profile.invoiceNumber} />
            <Field label="銀行名" name="bankName" defaultValue={profile.bankName} />
            <Field label="支店名" name="bankBranch" defaultValue={profile.bankBranch} />
            <SelectField label="口座種別" name="bankType" defaultValue={profile.bankType}><option>普通</option><option>当座</option></SelectField>
            <Field label="口座番号" name="bankAccountNumber" defaultValue={profile.bankAccountNumber} />
            <Field label="口座名義" name="bankAccountName" defaultValue={profile.bankAccountName} />
            <SaveButton />
          </form>
        </Card>
      )}

      {tab === "sites" && (
        <CrudSection title="現場登録" icon={<Building2 />} sub="元請・担当者・作業内容をまとめます">
          <form className="grid gap-3" onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const site = { id: uid("site"), siteName: String(fd.get("siteName") || ""), address: String(fd.get("address") || ""), clientCompany: String(fd.get("clientCompany") || ""), clientPerson: String(fd.get("clientPerson") || ""), clientPhone: String(fd.get("clientPhone") || ""), startDate: String(fd.get("startDate") || ""), endDate: String(fd.get("endDate") || ""), workDescription: String(fd.get("workDescription") || ""), dailyRate: num(fd.get("dailyRate")), memo: String(fd.get("memo") || "") };
            setSites([site, ...sites]);
            await saveRemote((id) => saveSiteRemote(site, id));
            form.reset();
          }}>
            <Field label="現場名" name="siteName" required />
            <Field label="現場住所" name="address" />
            <Field label="元請会社名" name="clientCompany" />
            <Field label="担当者名" name="clientPerson" />
            <Field label="担当者電話番号" name="clientPhone" />
            <Field label="工期開始日" name="startDate" type="date" />
            <Field label="工期終了日" name="endDate" type="date" />
            <Field label="作業内容" name="workDescription" />
            <Field label="人工単価" name="dailyRate" type="number" />
            <TextArea label="メモ" name="memo" />
            <SaveButton />
          </form>
          <List items={sites.map((s) => [s.siteName, `${s.clientCompany || "元請未入力"} / ${yen.format(s.dailyRate || 0)}`])} />
        </CrudSection>
      )}

      {tab === "receipts" && (
        <CrudSection title="領収書管理" icon={<Camera />} sub="撮る、確認する、経費にする">
          <form key={editingReceipt?.id ?? "new-receipt"} className="grid gap-4" onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const imageFile = (fd.get("image") as File) || null;
            if ((!imageFile || !imageFile.size) && !editingReceipt?.imageUrl && !editingReceipt?.imagePath) {
              setReceiptOcrStatus("先に領収書写真を選んでください");
              return;
            }
            const receiptId = editingReceipt?.id ?? uid("receipt");
            let imageInfo: Pick<Receipt, "imageUrl" | "imagePath" | "imageMimeType" | "imageSize"> = editingReceipt
              ? {
                  imageUrl: editingReceipt.imageUrl,
                  imagePath: editingReceipt.imagePath,
                  imageMimeType: editingReceipt.imageMimeType,
                  imageSize: editingReceipt.imageSize
                }
              : { imageUrl: "" };
            if (imageFile?.size) {
              try {
                imageInfo = await storeReceiptImage(imageFile, receiptId);
              } catch (error) {
                setMessage((error as Error).message);
                return;
              }
            }
            const ocrCompleted = String(fd.get("ocrCompleted") || "") === "1";
            const receipt: Receipt = {
              id: receiptId,
              siteId: String(fd.get("siteId") || ""),
              ...imageInfo,
              date: String(fd.get("date") || "").trim(),
              storeName: String(fd.get("storeName") || "").trim(),
              amount: num(fd.get("amount")),
              taxAmount: num(fd.get("taxAmount")),
              purpose: String(fd.get("purpose") || "その他"),
              memo: String(fd.get("memo") || "").trim(),
              status: String(fd.get("status") || "未処理") as "未処理" | "処理済み",
              ocrStatus: ocrCompleted ? "完了" as const : editingReceipt?.ocrStatus ?? "未実行" as const
            };
            setReceipts([receipt, ...receipts.filter((item) => item.id !== receipt.id)]);
            await saveRemote((id) => saveReceiptRemote(receipt, id));
            form.reset();
            setEditingReceiptId("");
            setReceiptOcrStatus("写真を選んでください");
            setReceiptOcrText("");
            setReceiptOcrFields(null);
            setReceiptConfirmVisible(false);
            setMessage(editingReceipt ? "領収書を更新しました" : "領収書を保存しました。カレンダーと経費一覧に反映しました");
          }}>
            <FileInput label={editingReceipt ? "領収書写真（変更する時だけ選択）" : "領収書写真"} name="image" />
            <input type="hidden" name="ocrCompleted" defaultValue={editingReceipt?.ocrStatus === "完了" ? "1" : ""} />
            {editingReceipt ? (
              <div className="rounded-lg border border-genba bg-skysoft p-4">
                <p className="text-sm font-black text-genba">編集中の領収書</p>
                <p className="mt-1 text-sm text-slate-700">{editingReceipt.date || "日付なし"} / {editingReceipt.storeName || "店名なし"} / {yen.format(editingReceipt.amount || 0)}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {editingReceipt ? (
                <button type="button" onClick={resetReceiptForm} className="tap min-h-12 rounded-lg bg-genba px-3 py-3 text-sm font-bold text-white">新規入力に戻る</button>
              ) : (
                <button type="button" onClick={(e) => quickSaveReceiptPhoto(e.currentTarget.form)} className="tap min-h-12 rounded-lg bg-genba px-3 py-3 text-sm font-bold text-white">写真だけ先に保存</button>
              )}
              <button type="button" onClick={(e) => readReceiptPhoto(e.currentTarget.form)} className="tap min-h-12 rounded-lg border border-genba bg-white px-3 py-3 text-sm font-bold text-genba">写真から読み取る</button>
              <button type="button" onClick={() => { setReceiptConfirmVisible(true); setReceiptOcrStatus("空欄に入力して保存できます"); }} className="tap min-h-12 rounded-lg border border-line bg-white px-3 py-3 text-sm font-bold text-slate-700">手入力で確認</button>
            </div>
            <p className="rounded-lg bg-skysoft p-4 text-sm font-semibold leading-6 text-slate-700">{receiptOcrStatus}</p>
            <div className={receiptConfirmVisible ? "grid gap-3 rounded-lg border border-genba bg-white p-4" : "hidden"}>
              <div>
                <p className="text-sm font-black text-genba">確認して保存</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">読み取れたところだけ入っています。違うところはここで直してください。</p>
              </div>
              {receiptOcrFields ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  ["店舗名 / 支払先", receiptOcrFields.storeName || "空欄"],
                  ["日付", receiptOcrFields.date || "確認してください"],
                  ["金額", receiptOcrFields.amount ? yen.format(receiptOcrFields.amount) : "確認してください"],
                  ["勘定科目", receiptOcrFields.purpose],
                  ["メモ", receiptOcrFields.memo || "空欄"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-skysoft p-3">
                    <p className="text-xs font-bold text-genba">{label}</p>
                    <p className="mt-1 break-words text-base font-black text-ink">{value}</p>
                  </div>
                ))}
                </div>
              ) : null}
              <SiteSelect sites={sites} defaultValue={editingReceipt?.siteId} />
              <Field label="日付" name="date" type="date" defaultValue={editingReceipt?.date ?? ""} />
              <Field label="金額" name="amount" type="number" defaultValue={editingReceipt?.amount ?? ""} />
              <Field label="店舗名 / 支払先" name="storeName" defaultValue={editingReceipt?.storeName ?? ""} />
              <SelectField label="勘定科目" name="purpose" defaultValue={editingReceipt?.purpose || "その他"}>
                {RECEIPT_ACCOUNT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </SelectField>
              <TextArea label="メモ" name="memo" defaultValue={editingReceipt?.memo ?? ""} />
              <SelectField label="状態" name="status" defaultValue={editingReceipt?.status || "未処理"}><option value="未処理">まだ経費にしてない</option><option value="処理済み">経費にした</option></SelectField>
              <details className="rounded-lg border border-line bg-white p-3">
                <summary className="cursor-pointer text-sm font-bold text-genba">必要なら消費税も入れる</summary>
                <div className="mt-3 grid gap-3">
                  <Field label="消費税" name="taxAmount" type="number" defaultValue={editingReceipt?.taxAmount ?? ""} />
                </div>
              </details>
              {receiptOcrText ? (
                <details className="rounded-lg border border-line bg-white p-3 text-xs leading-5 text-slate-600">
                  <summary className="cursor-pointer font-bold text-ink">読み取った文字の一部を見る</summary>
                  <p className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap">{receiptOcrText}</p>
                </details>
              ) : null}
              <SaveButton label="確認した内容で保存" />
            </div>
          </form>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["all", "全部"],
              ["unprocessed", "まだ"],
              ["processed", "済み"]
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setReceiptFilter(id as typeof receiptFilter)} className={`tap min-h-11 rounded-lg px-3 py-2 text-sm font-bold ${receiptFilter === id ? "bg-genba text-white" : "border border-line bg-white text-genba"}`}>{label}</button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-skysoft p-3">
              <p className="text-xs text-slate-600">今月の経費</p>
              <p className="text-lg font-black">{yen.format(monthExpense)}</p>
            </div>
            <div className="rounded-lg bg-skysoft p-3">
              <p className="text-xs text-slate-600">まだ経費にしてない</p>
              <p className="text-lg font-black">{unprocessedReceipts.length}枚</p>
            </div>
          </div>
          <button onClick={() => downloadPdf("領収書一覧", receipts.map((r) => [r.storeName || "店名なし", `${r.date} / ${yen.format(r.amount)} / ${receiptStatusLabel(r.status)}`]))} className="tap mt-3 min-h-12 w-full rounded-lg bg-skysoft font-bold text-genba">領収書一覧PDF</button>
          {filteredReceipts.length === 0 ? (
            <p className="mt-4 rounded-lg bg-skysoft p-4 text-center text-sm text-slate-600">まだ登録がありません</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {filteredReceipts.map((receipt) => (
                <div key={receipt.id} className={`rounded-lg border p-4 ${editingReceiptId === receipt.id ? "border-genba bg-skysoft" : "border-line bg-white"}`}>
                  <div className="flex gap-3">
                    {receipt.imageUrl ? <img src={receipt.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" /> : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-skysoft text-genba"><Camera /></div>}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${receipt.status === "未処理" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{receiptStatusLabel(receipt.status)}</span>
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{receipt.purpose || "用途未入力"}</span>
                      </div>
                      <p className="mt-2 break-words font-black">{receipt.storeName || "領収書"}</p>
                      <p className="mt-1 text-sm text-slate-600">{receipt.date || "日付なし"}</p>
                      <p className="mt-1 text-xl font-black text-genba">{yen.format(receipt.amount)}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button type="button" onClick={() => startReceiptEdit(receipt)} className="tap min-h-12 rounded-lg border border-genba bg-white px-3 py-3 text-sm font-bold text-genba">編集</button>
                    <button type="button" onClick={() => toggleReceiptStatus(receipt)} className="tap min-h-12 rounded-lg bg-skysoft px-3 py-3 text-sm font-bold text-genba">{receipt.status === "未処理" ? "処理済み" : "未処理へ"}</button>
                    <button type="button" onClick={() => deleteReceipt(receipt.id)} className="tap min-h-12 rounded-lg border border-red-200 bg-white px-3 py-3 text-sm font-bold text-red-700">削除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CrudSection>
      )}

      {tab === "invoices" && (
        <MoneySection type="invoice" sites={sites} profile={profile} items={invoices} setItems={setInvoices} downloadPdf={downloadPdf} saveRemote={saveRemote} />
      )}

      {tab === "estimates" && (
        <MoneySection type="estimate" sites={sites} profile={profile} items={estimates} setItems={setEstimates} downloadPdf={downloadPdf} saveRemote={saveRemote} />
      )}

      {tab === "qualifications" && (
        <CrudSection title="資格証一覧" icon={<IdCard />} sub="期限30日前を見えるようにします">
          <form className="grid gap-3" onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            let imageUrl = "";
            try {
              imageUrl = await fileToDataUrl((fd.get("image") as File) || null);
            } catch (error) {
              setMessage((error as Error).message);
              return;
            }
            const qualification = { id: uid("qualification"), qualificationName: String(fd.get("qualificationName") || ""), acquiredDate: String(fd.get("acquiredDate") || ""), expiryDate: String(fd.get("expiryDate") || ""), imageUrl, memo: String(fd.get("memo") || "") };
            setQualifications([qualification, ...qualifications]);
            await saveRemote((id) => saveQualificationRemote(qualification, id));
            form.reset();
          }}>
            <Field label="資格名" name="qualificationName" required />
            <Field label="取得日" name="acquiredDate" type="date" />
            <Field label="有効期限" name="expiryDate" type="date" />
            <FileInput label="資格証写真" name="image" />
            <TextArea label="メモ" name="memo" />
            <SaveButton />
          </form>
          <button onClick={() => downloadPdf("資格証一覧", qualifications.map((q) => [q.qualificationName, `期限 ${q.expiryDate || "-"} / 残り${daysLeft(q.expiryDate)}日`]))} className="tap mt-3 w-full rounded-lg bg-skysoft font-bold text-genba">資格証一覧PDF</button>
          <ThumbList items={qualifications.map((q) => ({ title: q.qualificationName, sub: `期限 ${q.expiryDate || "-"} ${daysLeft(q.expiryDate) <= 30 ? " / 要確認" : ""}`, image: q.imageUrl }))} />
        </CrudSection>
      )}

      {tab === "vehicles" && (
        <CrudSection title="車両一覧" icon={<Car />} sub="車検・保険期限をまとめて管理します">
          <form className="grid gap-3" onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            let inspectionDocumentUrl = "";
            let compulsoryInsuranceDocumentUrl = "";
            let optionalInsuranceDocumentUrl = "";
            try {
              inspectionDocumentUrl = await fileToDataUrl((fd.get("inspectionDocument") as File) || null);
              compulsoryInsuranceDocumentUrl = await fileToDataUrl((fd.get("compulsoryDocument") as File) || null);
              optionalInsuranceDocumentUrl = await fileToDataUrl((fd.get("optionalDocument") as File) || null);
            } catch (error) {
              setMessage((error as Error).message);
              return;
            }
            const vehicle = { id: uid("vehicle"), vehicleName: String(fd.get("vehicleName") || ""), vehicleNumber: String(fd.get("vehicleNumber") || ""), vehicleType: String(fd.get("vehicleType") || ""), inspectionExpiryDate: String(fd.get("inspectionExpiryDate") || ""), compulsoryInsuranceExpiryDate: String(fd.get("compulsoryInsuranceExpiryDate") || ""), optionalInsuranceExpiryDate: String(fd.get("optionalInsuranceExpiryDate") || ""), inspectionDocumentUrl, compulsoryInsuranceDocumentUrl, optionalInsuranceDocumentUrl, memo: String(fd.get("memo") || "") };
            setVehicles([vehicle, ...vehicles]);
            await saveRemote((id) => saveVehicleRemote(vehicle, id));
            form.reset();
          }}>
            <Field label="車両名" name="vehicleName" required />
            <Field label="車両番号" name="vehicleNumber" />
            <Field label="車種" name="vehicleType" />
            <Field label="車検期限" name="inspectionExpiryDate" type="date" />
            <Field label="自賠責保険期限" name="compulsoryInsuranceExpiryDate" type="date" />
            <Field label="任意保険期限" name="optionalInsuranceExpiryDate" type="date" />
            <FileInput label="車検証写真" name="inspectionDocument" />
            <FileInput label="自賠責保険証写真" name="compulsoryDocument" />
            <FileInput label="任意保険証写真" name="optionalDocument" />
            <TextArea label="メモ" name="memo" />
            <SaveButton />
          </form>
          <button onClick={() => downloadPdf("車両一覧", vehicles.map((v) => [v.vehicleName, `${v.vehicleNumber} / 車検 ${v.inspectionExpiryDate || "-"}`]))} className="tap mt-3 w-full rounded-lg bg-skysoft font-bold text-genba">車両一覧PDF</button>
          <List items={vehicles.map((v) => [v.vehicleName, `${v.vehicleNumber} / 車検 ${v.inspectionExpiryDate || "-"} ${daysLeft(v.inspectionExpiryDate) <= 30 ? " / 要確認" : ""}`])} />
        </CrudSection>
      )}

      {tab === "documents" && (
        <Card>
          <SectionTitle icon={<FileDown />} title="書類一覧" sub="現場別・種類別・状態別に探せます" />
          <div className="grid grid-cols-2 gap-2">
            <select className="tap rounded-lg border border-line px-3"><option>すべての現場</option>{sites.map((s) => <option key={s.id}>{s.siteName}</option>)}</select>
            <select className="tap rounded-lg border border-line px-3"><option>すべての種類</option><option>請求書</option><option>見積書</option><option>領収書</option><option>資格証</option><option>車両書類</option></select>
          </div>
          <List items={documentRows.map((d) => [`${d.type}：${d.title}`, d.status])} />
        </Card>
      )}

      {tab === "admin" && isAdminUser && (
        <Card>
          <SectionTitle icon={<ShieldCheck />} title="管理者画面" sub="ユーザー・プラン・利用状況を確認します" />
          <div className="grid grid-cols-2 gap-3">
            {[
              ["ユーザー数", `${adminUsers.length}人`],
              ["領収書枚数", `${receipts.length}枚`],
              ["請求書作成数", `${invoices.length}件`],
              ["見積書作成数", `${estimates.length}件`],
              ["資格証登録数", `${qualifications.length}件`],
              ["車両登録数", `${vehicles.length}件`]
            ].map(([label, value]) => <Card key={label}><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-black">{value}</p></Card>)}
          </div>
          <div className="mt-4 grid gap-3">
            {adminUsers.map((u) => (
              <div key={u.id} className="rounded-lg border border-line p-3">
                <p className="font-bold">{u.email}</p>
                <p className="text-sm text-slate-600">状態 {u.status} / 作成 {u.createdAt}</p>
                <select value={u.plan} onChange={async (e) => {
                  const plan = e.target.value as Plan;
                  setAdminUsers(adminUsers.map((x) => x.id === u.id ? { ...x, plan } : x));
                  await saveRemote(() => updateUserPlanRemote(u.id, plan));
                }} className="tap mt-2 w-full rounded-lg border border-line px-3">
                  <option>Starter</option><option>Professional</option><option>Business</option>
                </select>
                <button onClick={async () => {
                  const status = u.status === "active" ? "suspended" : "active";
                  setAdminUsers(adminUsers.map((x) => x.id === u.id ? { ...x, status } : x));
                  await saveRemote(() => updateUserStatusRemote(u.id, status));
                }} className="tap mt-2 w-full rounded-lg bg-skysoft font-bold text-genba">利用停止 / 再開</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "settings" && (
        <Card>
          <SectionTitle icon={<Settings />} title="設定" sub={userEmail} />
          <button onClick={() => setTab("profile")} className="tap mb-3 w-full rounded-lg bg-genba font-bold text-white">プロフィールを編集</button>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {[
              ["sites", "現場"],
              ["estimates", "見積書"],
              ["qualifications", "資格証"],
              ["vehicles", "車両"],
              ["documents", "書類一覧"],
              ...(isAdminUser ? [["admin", "管理"]] : [])
            ].map(([next, label]) => (
              <button key={next} onClick={() => setTab(next as Tab)} className="tap rounded-lg border border-line bg-white px-3 py-3 text-sm font-bold text-genba">{label}</button>
            ))}
          </div>
          <button onClick={() => { setUserEmail(""); setUserId(""); setHasRemoteSession(false); supabase?.auth.signOut(); }} className="tap w-full rounded-lg border border-line bg-white font-bold"><LogOut className="mr-2 inline" size={18} />ログアウト</button>
          <p className="mt-5 rounded-lg bg-skysoft p-3 text-xs leading-6 text-slate-700">本サービスは、一人親方・職人向けの事務作業補助、書類整理、請求書・見積書作成、写真管理を目的としたサービスです。官公署への申請書類作成、許認可申請、法律判断を伴う業務、行政書士等の資格が必要な業務は対象外です。</p>
        </Card>
      )}

      {message ? <div className="pointer-events-none fixed left-4 right-4 top-20 z-30 mx-auto max-w-md whitespace-pre-line rounded-lg bg-ink px-4 py-3 text-center text-sm font-bold text-white shadow-soft">{message}</div> : null}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-line bg-white">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2 py-2">
          {nav.slice(0, 5).map(([id, label, icon]) => (
            <button key={id} onClick={() => setTab(id)} className={`tap rounded-lg text-xs font-bold ${tab === id ? "bg-skysoft text-genba" : "text-slate-500"}`}>
              <span className="mx-auto mb-1 block w-fit">{icon}</span>{label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

function SaveButton({ label = "保存する" }: { label?: string }) {
  return <button className="tap min-h-[52px] w-full rounded-lg bg-genba px-4 py-3 text-lg font-bold text-white shadow-soft" type="submit"><CheckCircle2 className="mr-2 inline" size={20} />{label}</button>;
}

function FileInput({ label, name }: { label: string; name: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("ファイル未選択");

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const clearFileName = () => setFileName("ファイル未選択");
    form.addEventListener("reset", clearFileName);
    return () => form.removeEventListener("reset", clearFileName);
  }, []);

  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink">
      {label}
      <span className="tap grid min-h-24 w-full place-items-center rounded-lg border-2 border-dashed border-line bg-white px-4 py-4 text-center text-sm text-slate-600">
        <span className="grid gap-2">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-skysoft text-genba"><Camera size={22} /></span>
          <span className="font-black text-ink">写真・アルバムから選択</span>
          <span className="min-w-0 max-w-full truncate text-xs font-semibold text-slate-500">{fileName}</span>
        </span>
      </span>
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name || "ファイル未選択")}
      />
    </label>
  );
}

function SiteSelect({ sites, defaultValue = "" }: { sites: Site[]; defaultValue?: string }) {
  return (
    <SelectField label="現場" name="siteId" defaultValue={defaultValue}>
      <option value="">現場なし</option>
      {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
    </SelectField>
  );
}

function SiteNameField({ sites }: { sites: Site[] }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink">
      現場
      <input
        className="tap min-h-12 min-w-0 w-full rounded-lg border border-line bg-white px-4 py-3 text-base outline-none focus:border-genba focus:ring-4 focus:ring-skysoft"
        name="siteName"
        list="money-site-options"
        placeholder="例：渋谷マンション改修"
      />
      <datalist id="money-site-options">
        {sites.map((site) => <option key={site.id} value={site.siteName} />)}
      </datalist>
    </label>
  );
}

function blankInvoiceLineItem(id: string, overrides: Partial<InvoiceLineItem> = {}): InvoiceLineItem {
  const quantity = overrides.quantity ?? null;
  const unitPrice = overrides.unitPrice ?? null;
  return {
    id,
    category: overrides.category ?? "",
    description: overrides.description ?? "",
    quantity,
    unit: overrides.unit ?? "式",
    unitPrice,
    amount: overrides.amount ?? ((quantity ?? 0) * (unitPrice ?? 0))
  };
}

function defaultInvoiceLineItems(defaultDailyRate: number) {
  return [
    blankInvoiceLineItem("line-1", { category: "人工代", quantity: 1, unit: "人工", unitPrice: defaultDailyRate, amount: defaultDailyRate }),
    blankInvoiceLineItem("line-2", { category: "材料費" }),
    blankInvoiceLineItem("line-3", { category: "諸経費" })
  ];
}

function nullableInputNumber(value: string) {
  if (value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function CrudSection({ title, sub, icon, children }: { title: string; sub: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <Card><SectionTitle icon={icon} title={title} sub={sub} />{children}</Card>;
}

function List({ items }: { items: Array<[string, string]> }) {
  if (items.length === 0) return <p className="mt-4 rounded-lg bg-skysoft p-4 text-center text-sm text-slate-600">まだ登録がありません</p>;
  return <div className="mt-4 grid gap-2">{items.map(([title, sub], i) => <div key={`${title}-${i}`} className="rounded-lg border border-line p-3"><p className="font-bold">{title || "名称なし"}</p><p className="text-sm text-slate-600">{sub}</p></div>)}</div>;
}

function ThumbList({ items }: { items: Array<{ title: string; sub: string; image: string }> }) {
  if (items.length === 0) return <p className="mt-4 rounded-lg bg-skysoft p-4 text-center text-sm text-slate-600">まだ登録がありません</p>;
  return <div className="mt-4 grid gap-2">{items.map((item, i) => <div key={`${item.title}-${i}`} className="flex gap-3 rounded-lg border border-line p-3">{item.image ? <img src={item.image} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-lg bg-skysoft text-genba"><Camera /></div>}<div><p className="font-bold">{item.title || "名称なし"}</p><p className="text-sm text-slate-600">{item.sub}</p></div></div>)}</div>;
}

function MoneySection({
  type,
  sites,
  profile,
  items,
  setItems,
  downloadPdf,
  saveRemote
}: {
  type: "invoice" | "estimate";
  sites: Site[];
  profile: Profile;
  items: Invoice[] | Estimate[];
  setItems: (items: any) => void;
  downloadPdf: (title: string, rows: Array<[string, string]>, note?: string) => Promise<void>;
  saveRemote: (action: (id: string) => Promise<void>) => Promise<void>;
}) {
  const isInvoice = type === "invoice";
  const clientOptions = Array.from(new Set([
    ...sites.map((site) => site.clientCompany).filter(Boolean),
    ...items.map((item: any) => item.clientCompany).filter(Boolean)
  ]));
  const defaultDailyRate = sites[0]?.dailyRate || 25000;
  const [invoiceTaxRate, setInvoiceTaxRate] = useState(10);
  const [invoiceDraftLineItems, setInvoiceDraftLineItems] = useState<InvoiceLineItem[]>(() => defaultInvoiceLineItems(defaultDailyRate));
  const invoiceDraftSavedLineItems = useMemo(() => normalizeInvoiceLineItems(invoiceDraftLineItems), [invoiceDraftLineItems]);
  const invoiceDraftTotals = useMemo(() => calculateInvoiceTotals(invoiceDraftSavedLineItems, invoiceTaxRate), [invoiceDraftSavedLineItems, invoiceTaxRate]);

  function resetInvoiceDraftLineItems() {
    setInvoiceDraftLineItems(defaultInvoiceLineItems(defaultDailyRate));
    setInvoiceTaxRate(10);
  }

  function updateInvoiceDraftLineItem(lineId: string, updates: Partial<InvoiceLineItem>, shouldRecalculateAmount = false) {
    setInvoiceDraftLineItems((lineItems) => lineItems.map((lineItem) => {
      if (lineItem.id !== lineId) return lineItem;
      const next = { ...lineItem, ...updates };
      return shouldRecalculateAmount ? { ...next, amount: (next.quantity ?? 0) * (next.unitPrice ?? 0) } : next;
    }));
  }

  function addInvoiceDraftLineItem() {
    setInvoiceDraftLineItems((lineItems) => lineItems.length >= MAX_INVOICE_LINE_ITEMS ? lineItems : [...lineItems, blankInvoiceLineItem(`line-${lineItems.length + 1}`)]);
  }

  function removeInvoiceDraftLineItem(lineId: string, index: number) {
    if (index < MIN_INVOICE_LINE_ITEMS) return;
    setInvoiceDraftLineItems((lineItems) => lineItems.filter((lineItem) => lineItem.id !== lineId));
  }

  function invoiceLegacyAmounts(lineItems: InvoiceLineItem[]) {
    const laborLine = lineItems.find((lineItem) => lineItem.category === "人工代");
    const laborCount = laborLine?.quantity ?? 0;
    const dailyRate = laborLine?.unitPrice ?? 0;
    const materialCost = lineItems.filter((lineItem) => lineItem.category === "材料費").reduce((sum, lineItem) => sum + lineItem.amount, 0);
    const laborAmount = laborCount * dailyRate;
    const otherCost = Math.max(0, lineItems.reduce((sum, lineItem) => sum + lineItem.amount, 0) - laborAmount - materialCost);
    return { laborCount, dailyRate, materialCost, otherCost };
  }

  async function advanceInvoiceStatus(invoice: Invoice) {
    const nextStatus = invoice.status === "下書き" ? "送付済み" : invoice.status === "送付済み" ? "入金済み" : null;
    if (!nextStatus) return;
    const updated: Invoice = { ...invoice, status: nextStatus };
    setItems(items.map((item: any) => item.id === updated.id ? updated : item));
    await saveRemote((id) => saveInvoiceRemote(updated, id));
  }

  async function deleteMoneyItem(item: Invoice | Estimate) {
    setItems(items.filter((nextItem: any) => nextItem.id !== item.id));
    await saveRemote(() => isInvoice ? deleteInvoiceRemote(item.id) : deleteEstimateRemote(item.id));
  }

  return (
    <CrudSection title={isInvoice ? "請求書作成" : "見積書作成"} icon={isInvoice ? <FileText /> : <ClipboardList />} sub="金額は自動計算します">
      <form className="grid gap-4" onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const rawTaxRate = fd.get("taxRate");
        const taxRate = rawTaxRate === null || rawTaxRate === "" ? 10 : Number(rawTaxRate);
        const siteName = String(fd.get("siteName") || "").trim();
        const matchedSite = sites.find((site) => site.siteName === siteName);
        const siteId = matchedSite?.id ?? "";
        if (isInvoice) {
          const lineItems = normalizeInvoiceLineItems(invoiceDraftLineItems);
          const totals = calculateInvoiceTotals(lineItems, taxRate);
          const legacyAmounts = invoiceLegacyAmounts(lineItems);
          const lineSummary = lineItems.map((lineItem) => lineItem.description || lineItem.category).filter(Boolean).join(" / ");
          const invoice = {
            id: uid("invoice"),
            siteId,
            siteName,
            clientCompany: String(fd.get("clientCompany") || ""),
            invoiceNumber: String(fd.get("invoiceNumber") || `INV-${today.replaceAll("-", "")}`),
            issueDate: String(fd.get("issueDate") || today),
            subject: String(fd.get("subject") || siteName || "工事一式"),
            workDescription: String(fd.get("workDescription") || lineSummary || ""),
            workDate: String(fd.get("workDate") || today),
            paymentTerms: String(fd.get("paymentTerms") || ""),
            dueDate: String(fd.get("dueDate") || ""),
            notes: String(fd.get("notes") || ""),
            laborCount: legacyAmounts.laborCount,
            dailyRate: legacyAmounts.dailyRate,
            materialCost: legacyAmounts.materialCost,
            otherCost: legacyAmounts.otherCost,
            taxRate,
            subtotal: totals.subtotal,
            taxAmount: totals.taxAmount,
            totalAmount: totals.totalAmount,
            status: "下書き" as const,
            lineItems
          };
          setItems([invoice, ...items]);
          await saveRemote((id) => saveInvoiceRemote(invoice, id));
          resetInvoiceDraftLineItems();
        } else {
          const subtotal = num(fd.get("quantity")) * num(fd.get("unitPrice"));
          const taxAmount = Math.round(subtotal * taxRate / 100);
          const estimate = {
            id: uid("estimate"),
            siteId,
            siteName,
            clientCompany: String(fd.get("clientCompany") || ""),
            estimateNumber: String(fd.get("estimateNumber") || `EST-${today.replaceAll("-", "")}`),
            issueDate: String(fd.get("issueDate") || today),
            subject: String(fd.get("subject") || siteName || "工事一式"),
            constructionPeriod: String(fd.get("constructionPeriod") || ""),
            workPlace: String(fd.get("workPlace") || matchedSite?.address || siteName),
            paymentTerms: String(fd.get("paymentTerms") || ""),
            notes: String(fd.get("notes") || ""),
            workDescription: String(fd.get("workDescription") || ""),
            quantity: num(fd.get("quantity")),
            unit: String(fd.get("unit") || "式"),
            unitPrice: num(fd.get("unitPrice")),
            taxRate,
            subtotal,
            taxAmount,
            totalAmount: subtotal + taxAmount,
            expiryDate: String(fd.get("expiryDate") || ""),
            status: "下書き" as const
          };
          setItems([estimate, ...items]);
          await saveRemote((id) => saveEstimateRemote(estimate, id));
        }
        form.reset();
      }}>
        <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink">
          {isInvoice ? "請求先会社名" : "見積先会社名"}
          <input
            className="tap min-h-12 min-w-0 w-full rounded-lg border border-line bg-white px-4 py-3 text-base outline-none focus:border-genba focus:ring-4 focus:ring-skysoft"
            name="clientCompany"
            list={`${type}-client-options`}
            required
          />
          <datalist id={`${type}-client-options`}>
            {clientOptions.map((client) => <option key={client} value={client} />)}
          </datalist>
        </label>
        <SiteNameField sites={sites} />
        <div className="grid grid-cols-2 gap-2">
          <Field label={isInvoice ? "請求番号" : "見積No"} name={isInvoice ? "invoiceNumber" : "estimateNumber"} defaultValue={`${isInvoice ? "INV" : "EST"}-${today.replaceAll("-", "")}`} />
          <Field label={isInvoice ? "請求日" : "見積作成日"} name="issueDate" type="date" defaultValue={today} />
        </div>
        <Field label="件名" name="subject" placeholder="例：渋谷マンション改修工事" />
        <Field label="作業内容" name="workDescription" />
        {isInvoice ? (
          <>
            <Field label="作業日" name="workDate" type="date" defaultValue={today} />
            <Field label="支払条件" name="paymentTerms" defaultValue="月末締め翌月末払い" />
            <Field label="支払期日" name="dueDate" type="date" />
            <div className="grid gap-3 rounded-lg border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-genba">請求明細</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">数量×単価で計算できます。現場都合の端数は金額欄で直接直せます。</p>
                </div>
                <span className="shrink-0 rounded-lg bg-skysoft px-3 py-2 text-xs font-bold text-genba">{invoiceDraftLineItems.length}/{MAX_INVOICE_LINE_ITEMS}</span>
              </div>
              <datalist id="invoice-line-category-options">
                {INVOICE_LINE_ITEM_CATEGORIES.map((category) => <option key={category} value={category} />)}
              </datalist>
              <datalist id="invoice-line-unit-options">
                {INVOICE_LINE_ITEM_UNITS.map((unit) => <option key={unit} value={unit} />)}
              </datalist>
              <div className="grid gap-3">
                {invoiceDraftLineItems.map((lineItem, index) => (
                  <div key={lineItem.id} className="grid gap-3 rounded-lg border border-line bg-skysoft p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-ink">明細 {index + 1}</p>
                      <p className="shrink-0 rounded-lg bg-white px-3 py-1 text-sm font-black text-genba">{yen.format(lineItem.amount || 0)}</p>
                      {index >= MIN_INVOICE_LINE_ITEMS ? (
                        <button type="button" onClick={() => removeInvoiceDraftLineItem(lineItem.id, index)} className="tap min-h-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700">削除</button>
                      ) : null}
                    </div>
                    <div className="grid gap-2">
                      <label className="grid min-w-0 gap-1 text-xs font-bold text-ink">
                        名目
                        <input value={lineItem.category} onChange={(e) => updateInvoiceDraftLineItem(lineItem.id, { category: e.currentTarget.value })} list="invoice-line-category-options" className="tap min-h-12 rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:border-genba focus:ring-4 focus:ring-skysoft" placeholder="例：人工代" />
                      </label>
                      <label className="grid min-w-0 gap-1 text-xs font-bold text-ink">
                        内容
                        <input value={lineItem.description} onChange={(e) => updateInvoiceDraftLineItem(lineItem.id, { description: e.currentTarget.value })} className="tap min-h-12 rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:border-genba focus:ring-4 focus:ring-skysoft" placeholder="例：配線工事、器具付け" />
                      </label>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                      <label className="grid min-w-0 gap-1 text-xs font-bold text-ink">
                        数量
                        <input value={lineItem.quantity ?? ""} onChange={(e) => updateInvoiceDraftLineItem(lineItem.id, { quantity: nullableInputNumber(e.currentTarget.value) }, true)} type="number" step="0.01" className="tap min-h-12 min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:border-genba focus:ring-4 focus:ring-skysoft" />
                      </label>
                      <label className="grid min-w-0 gap-1 text-xs font-bold text-ink">
                        単位
                        <input value={lineItem.unit} onChange={(e) => updateInvoiceDraftLineItem(lineItem.id, { unit: e.currentTarget.value })} list="invoice-line-unit-options" className="tap min-h-12 min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:border-genba focus:ring-4 focus:ring-skysoft" />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid min-w-0 gap-1 text-xs font-bold text-ink">
                        単価
                        <input value={lineItem.unitPrice ?? ""} onChange={(e) => updateInvoiceDraftLineItem(lineItem.id, { unitPrice: nullableInputNumber(e.currentTarget.value) }, true)} type="number" className="tap min-h-12 min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:border-genba focus:ring-4 focus:ring-skysoft" />
                      </label>
                      <label className="grid min-w-0 gap-1 text-xs font-bold text-ink">
                        金額
                        <input value={lineItem.amount || ""} onChange={(e) => updateInvoiceDraftLineItem(lineItem.id, { amount: num(e.currentTarget.value) })} type="number" className="tap min-h-12 min-w-0 rounded-lg border border-genba bg-white px-3 py-2 text-base font-black text-genba outline-none focus:border-genba focus:ring-4 focus:ring-skysoft" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" disabled={invoiceDraftLineItems.length >= MAX_INVOICE_LINE_ITEMS} onClick={addInvoiceDraftLineItem} className="tap min-h-12 rounded-lg border border-genba bg-white px-3 py-3 text-sm font-bold text-genba disabled:border-line disabled:text-slate-400">+ 明細を追加</button>
              <div className="grid gap-2 rounded-lg bg-genba p-4 text-white">
                <div className="flex items-center justify-between text-sm"><span className="text-white/75">小計</span><strong>{yen.format(invoiceDraftTotals.subtotal)}</strong></div>
                <div className="flex items-center justify-between text-sm"><span className="text-white/75">消費税</span><strong>{yen.format(invoiceDraftTotals.taxAmount)}</strong></div>
                <div className="flex items-center justify-between border-t border-white/20 pt-3 text-base"><span className="font-bold text-white">税込合計</span><strong className="text-2xl text-white">{yen.format(invoiceDraftTotals.totalAmount)}</strong></div>
              </div>
            </div>
          </>
        ) : (
          <>
            <Field label="工期" name="constructionPeriod" placeholder="例：2026年7月1日〜7月5日" />
            <Field label="工事場所" name="workPlace" placeholder="例：東京都渋谷区..." />
            <Field label="支払条件" name="paymentTerms" defaultValue="別途協議" />
            <Field label="数量" name="quantity" type="number" defaultValue={1} />
            <SelectField label="単位" name="unit"><option>式</option><option>人工</option><option>日</option><option>m</option><option>m2</option></SelectField>
            <Field label="単価" name="unitPrice" type="number" defaultValue={25000} />
            <Field label="有効期限" name="expiryDate" type="date" />
          </>
        )}
        <TextArea label="備考" name="notes" />
        {isInvoice ? (
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink">
            消費税率
            <select name="taxRate" value={invoiceTaxRate} onChange={(e) => setInvoiceTaxRate(Number(e.currentTarget.value))} className="tap min-h-12 min-w-0 w-full rounded-lg border border-line bg-white px-4 py-3 text-base outline-none focus:border-genba focus:ring-4 focus:ring-skysoft">
              <option value="10">10%</option><option value="8">8%</option><option value="0">0%</option>
            </select>
          </label>
        ) : (
          <SelectField label="消費税率" name="taxRate"><option value="10">10%</option><option value="8">8%</option><option value="0">0%</option></SelectField>
        )}
        {isInvoice ? (
          <div className="rounded-lg border border-genba bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-600">今回の税込合計</span>
              <strong className="shrink-0 text-2xl font-black text-genba">{yen.format(invoiceDraftTotals.totalAmount)}</strong>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">保存すると、この金額が請求書一覧と入金済み売上に使われます。</p>
          </div>
        ) : null}
        <p className="rounded-lg bg-skysoft p-3 text-sm text-slate-700">振込先：{profile.bankName || "プロフィール登録後に自動反映"}</p>
        <SaveButton label={isInvoice ? "請求書を作る" : "見積書を作る"} />
      </form>
      <div className="mt-4 grid gap-3">
        {items.map((item: any) => {
          const siteLabel = item.siteName || sites.find((site) => site.id === item.siteId)?.siteName || "現場未入力";
          const bankInfo = [profile.bankName, profile.bankBranch, profile.bankType, profile.bankAccountNumber, profile.bankAccountName].filter(Boolean).join(" ");
          const invoiceLineItems = isInvoice ? normalizeInvoiceLineItems((item as Invoice).lineItems, item as Invoice) : [];
          const invoiceLineRows: Array<[string, string]> = invoiceLineItems.map((lineItem, index) => [
            `明細${index + 1}`,
            `${lineItem.category || "その他"} / ${lineItem.description || "-"} / ${lineItem.quantity ?? "-"}${lineItem.unit || ""} × ${lineItem.unitPrice === null ? "-" : yen.format(lineItem.unitPrice)} / ${yen.format(lineItem.amount)}`
          ]);
          const documentRows: Array<[string, string]> = isInvoice ? [
            ["書類種別", "請求書"],
            ["宛先", item.clientCompany],
            ["請求番号", item.invoiceNumber || `INV-${String(item.workDate || today).replaceAll("-", "")}`],
            ["請求日", item.issueDate || today],
            ["件名", item.subject || siteLabel],
            ["現場", siteLabel],
            ["作業内容", item.workDescription],
            ["作業日", item.workDate || "-"],
            ["支払条件", item.paymentTerms || "-"],
            ["支払期日", item.dueDate || "-"],
            ...invoiceLineRows,
            ["消費税率", `${item.taxRate || 0}%`],
            ["小計", yen.format(item.subtotal)],
            ["消費税", yen.format(item.taxAmount)],
            ["合計", yen.format(item.totalAmount)],
            ["状態", item.status],
            ["振込先", bankInfo],
            ["備考", item.notes || ""],
            ["発行者郵便番号", profile.postalCode || ""],
            ["発行者住所", profile.address],
            ["発行者電話", profile.phone],
            ["発行者FAX", profile.fax || ""],
            ["発行者メール", profile.email || ""],
            ["担当者", profile.contactName || profile.name],
            ["登録番号", profile.invoiceNumber ? `登録番号：${profile.invoiceNumber}` : ""]
          ] : [
            ["書類種別", "見積書"],
            ["宛先", item.clientCompany],
            ["見積No", item.estimateNumber || `EST-${today.replaceAll("-", "")}`],
            ["見積作成日", item.issueDate || today],
            ["件名", item.subject || siteLabel],
            ["現場", siteLabel],
            ["工期", item.constructionPeriod || "-"],
            ["工事場所", item.workPlace || siteLabel],
            ["支払条件", item.paymentTerms || "-"],
            ["作業内容", item.workDescription],
            ["有効期限", item.expiryDate || "-"],
            ["数量", String(item.quantity || 0)],
            ["単位", item.unit || "式"],
            ["単価", yen.format(item.unitPrice || 0)],
            ["消費税率", `${item.taxRate || 0}%`],
            ["小計", yen.format(item.subtotal)],
            ["消費税", yen.format(item.taxAmount)],
            ["合計", yen.format(item.totalAmount)],
            ["状態", item.status],
            ["振込先", bankInfo],
            ["備考", item.notes || ""],
            ["発行者郵便番号", profile.postalCode || ""],
            ["発行者住所", profile.address],
            ["発行者電話", profile.phone],
            ["発行者FAX", profile.fax || ""],
            ["発行者メール", profile.email || ""],
            ["担当者", profile.contactName || profile.name],
            ["登録番号", profile.invoiceNumber ? `登録番号：${profile.invoiceNumber}` : ""]
          ];
          return (
            <div key={item.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-lg font-black">{item.clientCompany}</p>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-600">{siteLabel} / {item.workDescription || "作業内容未入力"}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-skysoft px-2 py-1 text-xs font-bold text-genba">{item.status}</span>
              </div>
              {isInvoice ? (
                <div className="mt-3 grid gap-2 rounded-lg bg-skysoft p-3">
                  {invoiceLineItems.slice(0, 5).map((lineItem) => (
                    <div key={lineItem.id} className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="break-words font-bold text-ink">{lineItem.category || "その他"}：{lineItem.description || "-"}</p>
                        <p className="text-xs text-slate-500">{lineItem.quantity ?? "-"}{lineItem.unit || ""} × {lineItem.unitPrice === null ? "-" : yen.format(lineItem.unitPrice)}</p>
                      </div>
                      <p className="shrink-0 text-base font-black text-genba">{yen.format(lineItem.amount)}</p>
                    </div>
                  ))}
                  {invoiceLineItems.length > 5 ? <p className="text-xs font-bold text-slate-500">ほか {invoiceLineItems.length - 5} 行</p> : null}
                  <div className="flex items-center justify-between border-t border-line pt-3">
                    <span className="text-sm font-bold text-ink">税込合計</span>
                    <span className="text-2xl font-black text-genba">{yen.format(item.totalAmount)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">{yen.format(item.totalAmount)} / {item.status}</p>
              )}
              <div className={`mt-3 grid gap-2 ${isInvoice ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}>
                <button onClick={() => downloadPdf(isInvoice ? "請求書" : "見積書", documentRows, profile.companyName || profile.name)} className="tap min-h-12 rounded-lg bg-skysoft font-bold text-genba">帳票を開く</button>
                {isInvoice ? (
                  <button type="button" disabled={item.status === "入金済み"} onClick={() => advanceInvoiceStatus(item as Invoice)} className="tap min-h-12 rounded-lg border border-genba bg-white px-3 py-3 text-sm font-bold text-genba disabled:border-line disabled:text-slate-400">
                    {item.status === "下書き" ? "送付済みにする" : item.status === "送付済み" ? "入金済みにする" : "入金済み"}
                  </button>
                ) : null}
                <button type="button" onClick={() => deleteMoneyItem(item as Invoice | Estimate)} className="tap min-h-12 rounded-lg border border-red-200 bg-white font-bold text-red-700">削除</button>
              </div>
            </div>
          );
        })}
      </div>
    </CrudSection>
  );
}

function PlanCards({ compact = false }: { compact?: boolean }) {
  const plans = [
    { name: "Starter", price: "4,980円", badge: "", features: ["現場10件まで", "領収書200枚まで", "請求書作成", "見積書作成", "PDF出力"] },
    { name: "Professional", price: "9,980円", badge: "おすすめ / 一番人気 / 迷ったらこれ", features: ["現場無制限", "領収書無制限", "AI OCR", "LINE連携", "音声入力", "期限通知", "元請テンプレート", "優先サポート"] },
    { name: "Business", price: "19,800円", badge: "", features: ["複数ユーザー", "従業員管理", "権限管理", "管理ダッシュボード", "電話サポート"] }
  ];
  return (
    <div className="grid gap-3">
      {!compact ? <SectionTitle icon={<BadgeJapaneseYen />} title="プラン管理" sub="Professionalを中央に配置しています" /> : null}
      {plans.map((plan) => (
        <section key={plan.name} className={`rounded-lg border p-4 shadow-soft ${plan.name === "Professional" ? "border-genba bg-genba text-white" : "border-line bg-white"}`}>
          {plan.badge ? <p className="mb-2 w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-genba">{plan.badge}</p> : null}
          <h3 className="text-2xl font-black">{plan.name}</h3>
          <p className="mt-1 text-xl font-bold">月額 {plan.price}</p>
          {!compact ? <ul className="mt-3 grid gap-2 text-sm">{plan.features.map((f) => <li key={f}>・{f}</li>)}</ul> : null}
        </section>
      ))}
    </div>
  );
}
