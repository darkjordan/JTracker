// Lightweight i18n: English / Chinese (Simplified) / Bahasa Malaysia.
// `t(lang, key, vars)` looks up a flat key, falls back to English then the key,
// and interpolates {placeholders}. Ported from JKira's src/lib/i18n.ts.

export type Lang = "en" | "zh" | "ms";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "BM" },
];

export const DEFAULT_LANG: Lang = "en";

export function normalizeLang(v: string | undefined | null): Lang {
  return v === "zh" || v === "ms" || v === "en" ? v : DEFAULT_LANG;
}

type Dict = Record<string, string>;

const en: Dict = {
  // common
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  edit: "Edit",
  close: "Close",
  add: "Add",
  delete: "Delete",
  loading: "Loading…",
  done: "Done",
  retry: "Retry",
  settings: "Settings",
  "unit.item": "item",
  "unit.items": "items",

  "dash.loadError": "Couldn't load your data. Check your connection and retry.",
  "entry.savedFromScan": "Saved from scan",
  "entry.statementImported": "Statement imported",

  // dashboard tabs
  "tab.add": "Add",
  "tab.history": "History",
  "tab.netWorth": "Net Worth",

  // quick entry
  "entry.expense": "− Expense",
  "entry.income": "+ Income",
  "entry.amount": "Amount",
  "entry.description": "What for? (e.g. Nasi Lemak)",
  "entry.uncategorized": "Uncategorized",
  "entry.otherCategory": "＋ Other…",
  "entry.add": "Add",
  "entry.adding": "Adding…",
  "entry.addExpenseAmount": "Add {amount} expense",
  "entry.addIncomeAmount": "Add {amount} income",
  "entry.scanReceipt": "📷 Scan a receipt (image or PDF)",
  "entry.importStatement": "📄 Import bank statement (PDF)",
  "entry.addedExpense": "Added {amount} expense",
  "entry.addedIncome": "Added {amount} income",
  "entry.amountLabel": "Amount",
  "entry.descriptionLabel": "Description",
  "entry.categoryLabel": "Category",
  "entry.dateLabel": "Date",
  "entry.newCategoryName": "New category name",
  "entry.enterAmount": "Enter an amount.",
  "entry.nameNewCategory": "Name the new category, or pick one.",
  "entry.saveFailed": "Couldn't save. Try again.",

  // month switcher / history
  "hist.prevMonth": "Previous month",
  "hist.nextMonth": "Next month",
  "hist.noTxnsFiltered": "No transactions match these filters.",
  "hist.noTxns": "No transactions this month. Tap Add below to log one.",

  // nav row
  "nav.accounts": "💰 Accounts",
  "nav.recurring": "🔁 Recurring",
  "nav.relief": "🎯 Relief",
  "nav.goals": "🏁 Goals",
  "nav.household": "👨‍👩‍👧 Household",

  // filter bar
  "filter.search": "Search merchant…",
  "filter.searchLabel": "Search",
  "filter.typeLabel": "Type filter",
  "filter.categoryLabel": "Category filter",
  "filter.allTypes": "All types",
  "filter.expenses": "Expenses",
  "filter.income": "Income",
  "filter.allCategories": "All categories",
  "filter.toReview": "To review",

  // transaction editor
  "txn.amountRM": "Amount (RM)",
  "txn.merchant": "Merchant",
  "txn.category": "Category",
  "txn.taxRelief": "Tax relief (LHDN)",
  "txn.none": "None",
  "txn.date": "Date",
  "txn.note": "Note",
  "txn.optional": "optional",
  "txn.invalidAmount": "Enter a valid amount.",
  "txn.saveFailed": "Couldn't save. Try again.",
  "txn.deleteFailed": "Couldn't delete. Try again.",

  // goals
  "goals.title": "Goals",
  "goals.addName": "Goal name (e.g. Emergency fund)",
  "goals.targetAmount": "Target amount",
  "goals.targetDate": "Target date (optional)",
  "goals.addGoal": "Add goal",
  "goals.noGoals":
    "No goals yet. Add a savings target to track progress toward it.",
  "goals.left": "left",
  "goals.reached": "Goal reached 🎉",
  "goals.daysLeft": "{n}d left",
  "goals.daysOverdue": "{n}d overdue",
  "goals.currentSaved": "Current saved amount",

  // settings
  "settings.title": "Settings",
  "settings.account": "Account",
  "settings.signedInAs": "Signed in as",
  "settings.signOut": "Sign out",
  "settings.signOutInProgress": "Signing out…",
  "settings.anonHint":
    "You're using JTracker anonymously — your data lives only in this browser. Sign in to keep it and sync across devices.",
  "settings.signInGoogle": "Sign in with Google",
  "settings.ads": "Ads",
  "settings.adsRemoved": "✓ Ads removed",
  "settings.promoHint": "Have a promo code? Redeem it to remove ads permanently.",
  "settings.promoCode": "Promo code",
  "settings.redeem": "Redeem",
  "settings.signInToRedeem": "Sign in to redeem a promo code.",
  "settings.backOffice": "Back office →",
  "settings.exportCsv": "Export CSV",
  "settings.exportPreparing": "Preparing…",
  "settings.version": "Version",
  "settings.forceRefresh": "Force refresh",
};

const zh: Dict = {
  save: "保存",
  saving: "保存中…",
  cancel: "取消",
  edit: "编辑",
  close: "关闭",
  add: "添加",
  delete: "删除",
  loading: "加载中…",
  done: "完成",
  retry: "重试",
  settings: "设置",
  "unit.item": "项",
  "unit.items": "项",

  "dash.loadError": "无法加载您的数据。请检查网络连接后重试。",
  "entry.savedFromScan": "已通过扫描保存",
  "entry.statementImported": "对账单已导入",

  "tab.add": "添加",
  "tab.history": "记录",
  "tab.netWorth": "净资产",

  "entry.expense": "− 支出",
  "entry.income": "+ 收入",
  "entry.amount": "金额",
  "entry.description": "用途？(如 Nasi Lemak)",
  "entry.uncategorized": "未分类",
  "entry.otherCategory": "＋ 其他…",
  "entry.add": "添加",
  "entry.adding": "添加中…",
  "entry.addExpenseAmount": "添加 {amount} 支出",
  "entry.addIncomeAmount": "添加 {amount} 收入",
  "entry.scanReceipt": "📷 扫描收据（图片或 PDF）",
  "entry.importStatement": "📄 导入银行对账单（PDF）",
  "entry.addedExpense": "已添加 {amount} 支出",
  "entry.addedIncome": "已添加 {amount} 收入",
  "entry.amountLabel": "金额",
  "entry.descriptionLabel": "描述",
  "entry.categoryLabel": "类别",
  "entry.dateLabel": "日期",
  "entry.newCategoryName": "新类别名称",
  "entry.enterAmount": "请输入金额。",
  "entry.nameNewCategory": "请命名新类别，或选择一个。",
  "entry.saveFailed": "保存失败，请重试。",

  "hist.prevMonth": "上个月",
  "hist.nextMonth": "下个月",
  "hist.noTxnsFiltered": "没有符合筛选条件的交易。",
  "hist.noTxns": "本月还没有交易。点击下方的添加来记录一笔。",

  "nav.accounts": "💰 账户",
  "nav.recurring": "🔁 定期",
  "nav.relief": "🎯 税务减免",
  "nav.goals": "🏁 目标",
  "nav.household": "👨‍👩‍👧 家庭",

  "filter.search": "搜索商家…",
  "filter.searchLabel": "搜索",
  "filter.typeLabel": "类型筛选",
  "filter.categoryLabel": "类别筛选",
  "filter.allTypes": "所有类型",
  "filter.expenses": "支出",
  "filter.income": "收入",
  "filter.allCategories": "所有类别",
  "filter.toReview": "待审核",

  "txn.amountRM": "金额 (RM)",
  "txn.merchant": "商家",
  "txn.category": "类别",
  "txn.taxRelief": "税务减免 (LHDN)",
  "txn.none": "无",
  "txn.date": "日期",
  "txn.note": "备注",
  "txn.optional": "可选",
  "txn.invalidAmount": "请输入有效金额。",
  "txn.saveFailed": "保存失败，请重试。",
  "txn.deleteFailed": "删除失败，请重试。",

  "goals.title": "目标",
  "goals.addName": "目标名称（如 应急基金）",
  "goals.targetAmount": "目标金额",
  "goals.targetDate": "目标日期（可选）",
  "goals.addGoal": "添加目标",
  "goals.noGoals": "还没有目标。添加储蓄目标以追踪进度。",
  "goals.left": "还差",
  "goals.reached": "已达成目标 🎉",
  "goals.daysLeft": "还剩 {n} 天",
  "goals.daysOverdue": "已逾期 {n} 天",
  "goals.currentSaved": "当前已储蓄金额",

  "settings.title": "设置",
  "settings.account": "账户",
  "settings.signedInAs": "已登录为",
  "settings.signOut": "退出登录",
  "settings.signOutInProgress": "正在退出…",
  "settings.anonHint":
    "您正在匿名使用 JTracker — 数据仅保存在此浏览器中。登录以保存数据并跨设备同步。",
  "settings.signInGoogle": "使用 Google 登录",
  "settings.ads": "广告",
  "settings.adsRemoved": "✓ 已移除广告",
  "settings.promoHint": "有优惠码吗？兑换后可永久移除广告。",
  "settings.promoCode": "优惠码",
  "settings.redeem": "兑换",
  "settings.signInToRedeem": "登录以兑换优惠码。",
  "settings.backOffice": "后台管理 →",
  "settings.exportCsv": "导出 CSV",
  "settings.exportPreparing": "准备中…",
  "settings.version": "版本",
  "settings.forceRefresh": "强制刷新",
};

const ms: Dict = {
  save: "Simpan",
  saving: "Menyimpan…",
  cancel: "Batal",
  edit: "Edit",
  close: "Tutup",
  add: "Tambah",
  delete: "Padam",
  loading: "Memuatkan…",
  done: "Selesai",
  retry: "Cuba lagi",
  settings: "Tetapan",
  "unit.item": "item",
  "unit.items": "item",

  "dash.loadError": "Tidak dapat memuatkan data anda. Semak sambungan anda dan cuba lagi.",
  "entry.savedFromScan": "Disimpan daripada imbasan",
  "entry.statementImported": "Penyata diimport",

  "tab.add": "Tambah",
  "tab.history": "Sejarah",
  "tab.netWorth": "Nilai Bersih",

  "entry.expense": "− Perbelanjaan",
  "entry.income": "+ Pendapatan",
  "entry.amount": "Jumlah",
  "entry.description": "Untuk apa? (cth. Nasi Lemak)",
  "entry.uncategorized": "Tiada kategori",
  "entry.otherCategory": "＋ Lain…",
  "entry.add": "Tambah",
  "entry.adding": "Menambah…",
  "entry.addExpenseAmount": "Tambah perbelanjaan {amount}",
  "entry.addIncomeAmount": "Tambah pendapatan {amount}",
  "entry.scanReceipt": "📷 Imbas resit (imej atau PDF)",
  "entry.importStatement": "📄 Import penyata bank (PDF)",
  "entry.addedExpense": "Ditambah perbelanjaan {amount}",
  "entry.addedIncome": "Ditambah pendapatan {amount}",
  "entry.amountLabel": "Jumlah",
  "entry.descriptionLabel": "Penerangan",
  "entry.categoryLabel": "Kategori",
  "entry.dateLabel": "Tarikh",
  "entry.newCategoryName": "Nama kategori baharu",
  "entry.enterAmount": "Masukkan jumlah.",
  "entry.nameNewCategory": "Namakan kategori baharu, atau pilih satu.",
  "entry.saveFailed": "Gagal simpan. Cuba lagi.",

  "hist.prevMonth": "Bulan sebelum",
  "hist.nextMonth": "Bulan seterusnya",
  "hist.noTxnsFiltered": "Tiada transaksi sepadan dengan penapis ini.",
  "hist.noTxns": "Tiada transaksi bulan ini. Ketik Tambah di bawah untuk mencatat.",

  "nav.accounts": "💰 Akaun",
  "nav.recurring": "🔁 Berulang",
  "nav.relief": "🎯 Pelepasan",
  "nav.goals": "🏁 Matlamat",
  "nav.household": "👨‍👩‍👧 Isi Rumah",

  "filter.search": "Cari peniaga…",
  "filter.searchLabel": "Carian",
  "filter.typeLabel": "Penapis jenis",
  "filter.categoryLabel": "Penapis kategori",
  "filter.allTypes": "Semua jenis",
  "filter.expenses": "Perbelanjaan",
  "filter.income": "Pendapatan",
  "filter.allCategories": "Semua kategori",
  "filter.toReview": "Untuk disemak",

  "txn.amountRM": "Jumlah (RM)",
  "txn.merchant": "Peniaga",
  "txn.category": "Kategori",
  "txn.taxRelief": "Pelepasan cukai (LHDN)",
  "txn.none": "Tiada",
  "txn.date": "Tarikh",
  "txn.note": "Nota",
  "txn.optional": "pilihan",
  "txn.invalidAmount": "Masukkan jumlah yang sah.",
  "txn.saveFailed": "Gagal simpan. Cuba lagi.",
  "txn.deleteFailed": "Gagal padam. Cuba lagi.",

  "goals.title": "Matlamat",
  "goals.addName": "Nama matlamat (cth. Dana kecemasan)",
  "goals.targetAmount": "Jumlah sasaran",
  "goals.targetDate": "Tarikh sasaran (pilihan)",
  "goals.addGoal": "Tambah matlamat",
  "goals.noGoals":
    "Belum ada matlamat. Tambah sasaran simpanan untuk jejak kemajuan.",
  "goals.left": "lagi",
  "goals.reached": "Matlamat tercapai 🎉",
  "goals.daysLeft": "{n}h lagi",
  "goals.daysOverdue": "{n}h tertunggak",
  "goals.currentSaved": "Jumlah simpanan semasa",

  "settings.title": "Tetapan",
  "settings.account": "Akaun",
  "settings.signedInAs": "Log masuk sebagai",
  "settings.signOut": "Log keluar",
  "settings.signOutInProgress": "Log keluar…",
  "settings.anonHint":
    "Anda menggunakan JTracker secara tanpa nama — data anda hanya di pelayar ini. Log masuk untuk menyimpan dan segerak merentas peranti.",
  "settings.signInGoogle": "Log masuk dengan Google",
  "settings.ads": "Iklan",
  "settings.adsRemoved": "✓ Iklan dialih keluar",
  "settings.promoHint":
    "Ada kod promosi? Tebus untuk alih keluar iklan secara kekal.",
  "settings.promoCode": "Kod promosi",
  "settings.redeem": "Tebus",
  "settings.signInToRedeem": "Log masuk untuk menebus kod promosi.",
  "settings.backOffice": "Pejabat belakang →",
  "settings.exportCsv": "Eksport CSV",
  "settings.exportPreparing": "Menyediakan…",
  "settings.version": "Versi",
  "settings.forceRefresh": "Muat semula paksa",
};

const messages: Record<Lang, Dict> = { en, zh, ms };

export function t(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>
): string {
  const s = messages[lang]?.[key] ?? messages.en[key] ?? key;
  return vars
    ? s.replace(/\{(\w+)\}/g, (_, k) =>
        vars[k] !== undefined ? String(vars[k]) : `{${k}}`
      )
    : s;
}

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function getT(lang: Lang): TFn {
  return (key, vars) => t(lang, key, vars);
}

/** Pluralised "N item(s)" noun for the current language. */
export function itemsUnit(lang: Lang, n: number): string {
  return t(lang, n === 1 ? "unit.item" : "unit.items");
}
