const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

for (const line of fs.readFileSync(".env.local", "utf8").split(/\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const stamp = Date.now();
const password = "GenbaTest12345!";
const results = [];

const ok = (name, details = {}) => results.push({ name, status: "成功", ...details });
const ng = (name, error, details = {}) => results.push({ name, status: "失敗", error: String(error?.message || error), ...details });
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function signUpAndIn(label) {
  const c = client();
  const email = `genba.test.${label}.${stamp}@gmail.com`;
  const sign = await c.auth.signUp({ email, password });
  if (sign.error) throw new Error(`${label} signup: ${sign.error.message}`);
  if (!sign.data.session) {
    const login = await c.auth.signInWithPassword({ email, password });
    if (login.error) throw new Error(`${label} login: ${login.error.message}`);
  }
  const user = (await c.auth.getUser()).data.user;
  if (!user) throw new Error(`${label}: no session user`);
  return { c, email, user };
}

async function main() {
  let a;
  let b;
  let receiptPath = "";

  try {
    a = await signUpAndIn("a");
    ok("新規ユーザーA登録・ログイン", { email: a.email });
  } catch (error) {
    ng("新規ユーザーA登録・ログイン", error);
    console.log(JSON.stringify({ results }, null, 2));
    return;
  }

  for (let index = 0; index < 10; index += 1) {
    const userRow = await a.c.from("users").select("id,email").eq("id", a.user.id).maybeSingle();
    if (!userRow.error && userRow.data) {
      ok("public.users自動作成");
      break;
    }
    if (index === 9) ng("public.users自動作成", userRow.error || "user row not found");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const date = new Date().toISOString().slice(0, 10);
  const workId = `work-${stamp}`;
  const scheduleId = `schedule-${stamp}`;
  const receiptId = `receipt-${stamp}`;

  try {
    const saved = await a.c.from("work_logs").insert({
      app_id: workId,
      user_id: a.user.id,
      date,
      site_name: "確認現場",
      workers: "テスト職人",
      memo: "Supabase保存確認",
      receipt_done: true,
      photo_done: false,
      invoice_ready: true
    }).select("app_id").single();
    if (saved.error) throw saved.error;
    ok("日報workLogs保存");
  } catch (error) {
    ng("日報workLogs保存", error);
  }

  try {
    const saved = await a.c.from("calendar_schedules").insert({
      app_id: scheduleId,
      user_id: a.user.id,
      date,
      site_name: "確認現場",
      client_company: "確認元請",
      work_description: "配線確認",
      workers: "テスト職人",
      labor_count: 1,
      daily_rate: 25000,
      memo: "予定保存確認"
    }).select("app_id").single();
    if (saved.error) throw saved.error;
    ok("カレンダー予定calendarSchedules保存");
  } catch (error) {
    ng("カレンダー予定calendarSchedules保存", error);
  }

  try {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l5S1xQAAAABJRU5ErkJggg==", "base64");
    receiptPath = `${a.user.id}/receipts/${receiptId}.png`;
    const uploaded = await a.c.storage.from("genba-files").upload(receiptPath, png, { contentType: "image/png", upsert: true });
    if (uploaded.error) throw uploaded.error;
    ok("領収書画像Storage保存", { pathShape: "{user_id}/receipts/{receipt_id}.png" });
  } catch (error) {
    ng("領収書画像Storage保存", error);
  }

  try {
    const saved = await a.c.from("receipts").insert({
      app_id: receiptId,
      user_id: a.user.id,
      image_path: receiptPath,
      image_mime_type: "image/png",
      image_size: 67,
      date,
      store_name: "コーナン 工具館",
      amount: 2200,
      tax_amount: 200,
      purpose: "消耗品費",
      memo: "OCR保存確認",
      status: "未処理",
      ocr_status: "完了"
    }).select("date,amount,store_name,purpose,memo,image_path,ocr_status").single();
    if (saved.error) throw saved.error;
    const expectedKeys = ["amount", "date", "image_path", "memo", "ocr_status", "purpose", "store_name"];
    const savedKeys = Object.keys(saved.data).sort();
    if (JSON.stringify(savedKeys) !== JSON.stringify(expectedKeys)) throw new Error(`保存項目が想定外: ${savedKeys.join(",")}`);
    ok("領収書保存項目のみ保存", { imagePathSaved: Boolean(saved.data.image_path), savedKeys });
  } catch (error) {
    ng("領収書保存項目のみ保存", error);
  }

  try {
    const rawColumnCheck = await a.c.from("receipts").select("ocr_raw_text").limit(1);
    if (rawColumnCheck.error) {
      ok("OCR全文保存カラムなし", { message: rawColumnCheck.error.message });
    } else {
      ng("OCR全文保存カラムなし", "receipts.ocr_raw_text が存在している");
    }
  } catch (error) {
    ok("OCR全文保存カラムなし", { message: String(error.message || error) });
  }

  try {
    await a.c.auth.signOut();
    const c2 = client();
    const login = await c2.auth.signInWithPassword({ email: a.email, password });
    if (login.error) throw login.error;
    const [workLogs, schedules, receipts] = await Promise.all([
      c2.from("work_logs").select("*").eq("app_id", workId),
      c2.from("calendar_schedules").select("*").eq("app_id", scheduleId),
      c2.from("receipts").select("*").eq("app_id", receiptId)
    ]);
    if (workLogs.error || schedules.error || receipts.error) throw (workLogs.error || schedules.error || receipts.error);
    if (workLogs.data.length === 1 && schedules.data.length === 1 && receipts.data.length === 1) {
      ok("ログアウト後再ログイン復元");
    } else {
      throw new Error(`復元件数 work=${workLogs.data.length} schedule=${schedules.data.length} receipt=${receipts.data.length}`);
    }
    a.c = c2;
  } catch (error) {
    ng("ログアウト後再ログイン復元", error);
  }

  try {
    b = await signUpAndIn("b");
    ok("別ユーザーB登録・ログイン", { email: b.email });
    const [workLogs, schedules, receipts] = await Promise.all([
      b.c.from("work_logs").select("*"),
      b.c.from("calendar_schedules").select("*"),
      b.c.from("receipts").select("*")
    ]);
    if (workLogs.error || schedules.error || receipts.error) throw (workLogs.error || schedules.error || receipts.error);
    if (workLogs.data.length === 0 && schedules.data.length === 0 && receipts.data.length === 0) {
      ok("別ユーザーで他人データ非表示");
    } else {
      throw new Error(`見えている件数 work=${workLogs.data.length} schedule=${schedules.data.length} receipt=${receipts.data.length}`);
    }
  } catch (error) {
    ng("別ユーザーで他人データ非表示", error);
  }

  try {
    const signed = await b.c.storage.from("genba-files").createSignedUrl(receiptPath, 60);
    if (signed.error) {
      ok("他人Storage画像の署名URL拒否", { message: signed.error.message });
    } else {
      ng("他人Storage画像の署名URL拒否", "他人の画像に署名URLが作成できた");
    }
  } catch (error) {
    ok("他人Storage画像の署名URL拒否", { message: String(error.message || error) });
  }

  console.log(JSON.stringify({ results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
