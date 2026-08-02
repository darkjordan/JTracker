-- JTracker — Phase 1 seed: system default categories + LHDN tax-relief reference.
-- Idempotent: category seed runs only if no system defaults exist yet; relief rows
-- use ON CONFLICT DO NOTHING on (code, year).

-- ---------- system default categories (user_id = null) ----------
insert into public.categories (user_id, name, icon, color, type, sort_order)
select * from (values
  (null::uuid, 'Food & Drink',      '🍜', '#ef8a3a', 'expense', 10),
  (null::uuid, 'Groceries',         '🛒', '#5aa469', 'expense', 20),
  (null::uuid, 'Transport',         '🚗', '#4a89dc', 'expense', 30),
  (null::uuid, 'Bills & Utilities', '💡', '#e6b800', 'expense', 40),
  (null::uuid, 'Shopping',          '🛍️', '#d16ba5', 'expense', 50),
  (null::uuid, 'Health',            '🏥', '#e05a5a', 'expense', 60),
  (null::uuid, 'Education',         '📚', '#7b6ef6', 'expense', 70),
  (null::uuid, 'Entertainment',     '🎬', '#9b59b6', 'expense', 80),
  (null::uuid, 'Family',            '👨‍👩‍👧', '#f0932b', 'expense', 90),
  (null::uuid, 'Travel',            '✈️', '#2bbbad', 'expense', 100),
  (null::uuid, 'Donation & Zakat',  '🕌', '#16a085', 'expense', 110),
  (null::uuid, 'Uncategorized',     '❓', '#9aa5b1', 'expense', 120),
  (null::uuid, 'Salary',            '💼', '#27ae60', 'income', 200),
  (null::uuid, 'Freelance',         '🧑‍💻', '#2d98da', 'income', 210),
  (null::uuid, 'Dividends',         '📈', '#20bf6b', 'income', 220),
  (null::uuid, 'Other Income',      '➕', '#7f8fa6', 'income', 230)
) as v(user_id, name, icon, color, type, sort_order)
where not exists (select 1 from public.categories where user_id is null);

-- ---------- LHDN personal tax relief (YA2026) ----------
-- ⚠️ Caps are TODO: verify against LHDN for the assessment year. Editable in Settings.
insert into public.tax_relief_categories (code, year, name_en, name_ms, name_zh, annual_cap_sen, notes) values
  ('lifestyle',        2026, 'Lifestyle (books, internet, phone, computer)', 'Gaya hidup (buku, internet, telefon, komputer)', '生活方式（书籍、网络、手机、电脑）', 250000, 'TODO verify LHDN YA2026'),
  ('lifestyle_sports', 2026, 'Sports equipment & activities',                'Peralatan & aktiviti sukan',                     '运动器材与活动',                 100000, 'Separate lifestyle sub-cap. TODO verify'),
  ('medical_self',     2026, 'Medical (self, spouse, child)',                'Perubatan (diri, pasangan, anak)',               '医疗（本人、配偶、子女）',        1000000, 'TODO verify LHDN YA2026'),
  ('medical_parents',  2026, 'Medical for parents',                          'Perubatan ibu bapa',                             '父母医疗',                       800000, 'TODO verify LHDN YA2026'),
  ('education_self',   2026, 'Education fees (self)',                         'Yuran pendidikan (diri)',                        '进修费用（本人）',                700000, 'TODO verify LHDN YA2026'),
  ('childcare',        2026, 'Childcare / kindergarten',                     'Taska / tadika',                                 '托儿所 / 幼儿园',                 300000, 'TODO verify LHDN YA2026'),
  ('sspn',             2026, 'SSPN net deposit',                             'Simpanan bersih SSPN',                           'SSPN 净存款',                    800000, 'TODO verify LHDN YA2026'),
  ('insurance_life',   2026, 'Life insurance & EPF',                         'Insurans hayat & KWSP',                          '人寿保险与公积金',                700000, 'TODO verify; combined rules apply'),
  ('insurance_medical',2026, 'Medical & education insurance',                'Insurans perubatan & pendidikan',                '医疗与教育保险',                  300000, 'TODO verify LHDN YA2026'),
  ('epf',              2026, 'EPF / approved schemes',                       'KWSP / skim diluluskan',                         '公积金 / 核准计划',              400000, 'TODO verify LHDN YA2026'),
  ('zakat',            2026, 'Zakat / fitrah',                               'Zakat / fitrah',                                 '天课 / 开斋税',                  null,   'Tax rebate, not relief; tracked for the year-end report'),
  ('donation',         2026, 'Approved donations',                           'Derma diluluskan',                               '核准捐款',                       null,   'Subject to % of income; TODO verify')
on conflict (code, year) do nothing;
