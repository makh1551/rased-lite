# Graph Report - rased-lite  (2026-11-23)

## Corpus Check
- 20 files · ~53,091 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .webmanifest 1, .csv 1)

## Summary
- 902 nodes · 3643 edges · 37 communities (33 shown, 4 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 597 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d09f5081`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- a
- make_xlsx_lib
- da
- gr
- render
- extension/sw.js
- app.js
- steps
- xb
- kt
- madrasati.js
- wd
- dm
- manifest.json
- nowView
- today
- esc
- vb
- ha
- as
- ua
- hi
- bindPhones
- بيانات النشر في متجر Microsoft Edge Add-ons
- fh
- em
- teams.js
- ag
- راصد – متابعة حضور المعلمين في الحصص الافتراضية
- nm
- index.ts
- قوالب واتساب الرسمي لراصد (Bird · فئة Utility · اللغة العربية ar)
- gf
- qi
- whatsapp.js
- docs/sw.js

## God Nodes (most connected - your core abstractions)
1. `make_xlsx_lib()` - 515 edges
2. `ua()` - 106 edges
3. `a()` - 79 edges
4. `S()` - 76 edges
5. `n()` - 73 edges
6. `l()` - 62 edges
7. `T()` - 61 edges
8. `I()` - 58 edges
9. `O()` - 50 edges
10. `r()` - 47 edges

## Surprising Connections (you probably didn't know these)
- `save()` --indirect_call--> `S()`  [INFERRED]
  extension/app.js → extension/xlsx.full.min.js
- `syncNow()` --indirect_call--> `S()`  [INFERRED]
  extension/app.js → extension/xlsx.full.min.js
- `mergeAuto()` --indirect_call--> `S()`  [INFERRED]
  extension/app.js → extension/xlsx.full.min.js
- `mergeWA()` --indirect_call--> `S()`  [INFERRED]
  extension/app.js → extension/xlsx.full.min.js
- `keepAlive()` --indirect_call--> `ka()`  [INFERRED]
  extension/sw.js → extension/xlsx.full.min.js

## Import Cycles
- None detected.

## Communities (37 total, 4 thin omitted)

### Community 0 - "a"
Cohesion: 0.12
Nodes (99): a(), ae(), ar(), B(), Be(), bf(), c(), ca() (+91 more)

### Community 1 - "make_xlsx_lib"
Cohesion: 0.04
Nodes (48): make_xlsx_lib(), au(), bo(), ch(), cv(), dl(), dn(), Ea() (+40 more)

### Community 2 - "da"
Cohesion: 0.06
Nodes (68): Aa(), av(), aw(), ba(), bp(), br(), bw(), Ci() (+60 more)

### Community 3 - "gr"
Cohesion: 0.07
Nodes (60): ac(), Ah(), ai(), al(), bc(), bg(), bl(), cc() (+52 more)

### Community 4 - "render"
Cohesion: 0.10
Nodes (51): activateLicense(), apiRemind(), apiSend(), applyRows(), applyServerCfg(), applyServerMarks(), bind(), bindIcs() (+43 more)

### Community 5 - "extension/sw.js"
Cohesion: 0.11
Nodes (48): apiMode(), apiSendSW(), atTime(), chain, checkOne(), checkUpdate(), clean(), enqueue() (+40 more)

### Community 6 - "app.js"
Cohesion: 0.08
Nodes (42): AUTO, byName(), DAYS, DEF_TIMES, ensureAuto(), ERRS, fname(), header() (+34 more)

### Community 7 - "steps"
Cohesion: 0.06
Nodes (36): outputs, runs-on, steps, concurrency, cancel-in-progress, group, environment, needs (+28 more)

### Community 8 - "xb"
Cohesion: 0.13
Nodes (33): Cr(), di(), Dr(), ei(), gb(), Ic(), ir(), jb() (+25 more)

### Community 9 - "kt"
Cohesion: 0.14
Nodes (27): Ap(), at(), bv(), Dv(), ep(), Hl(), ho(), hv() (+19 more)

### Community 10 - "madrasati.js"
Cohesion: 0.18
Nodes (25): bestName(), classesFromDom(), cleanName(), detailLinks(), detectSchool(), draw(), expandTable(), fillTeachers() (+17 more)

### Community 11 - "wd"
Cohesion: 0.21
Nodes (23): dayBar(), dayHTML(), dayReport(), dayView(), exportXLSX(), fmtDate(), folProgressHTML(), insightsHTML() (+15 more)

### Community 12 - "dm"
Cohesion: 0.13
Nodes (23): af(), bm(), dm(), ff(), fm(), fo(), hs(), If() (+15 more)

### Community 13 - "manifest.json"
Cohesion: 0.09
Nodes (21): action, default_icon, default_title, author, background, service_worker, content_scripts, 16 (+13 more)

### Community 14 - "nowView"
Cohesion: 0.18
Nodes (21): apiOn(), bulkTargets(), curPeriod(), defaultP(), fillTpl(), hotWA(), isLow(), isMobile() (+13 more)

### Community 15 - "today"
Cohesion: 0.18
Nodes (20): addD(), curPlan(), daysLeft(), defaultDate(), demoState(), openArchive(), openTeacher(), pad() (+12 more)

### Community 16 - "esc"
Cohesion: 0.17
Nodes (20): autoBarHTML(), autoSetupHTML(), esc(), fmtCode(), folRowHTML(), icsHTML(), loadSendCfg(), mpSheet() (+12 more)

### Community 17 - "vb"
Cohesion: 0.28
Nodes (19): ab(), bb(), cb(), db(), Eb(), fb(), hb(), ib() (+11 more)

### Community 18 - "ha"
Cohesion: 0.15
Nodes (19): ao(), bu(), ed(), fg(), gd(), ha(), hd(), jl() (+11 more)

### Community 19 - "as"
Cohesion: 0.12
Nodes (19): as(), bs(), cf(), cs(), df(), gs(), Jf(), ls() (+11 more)

### Community 20 - "ua"
Cohesion: 0.18
Nodes (19): bn(), cn(), dd(), Ev(), fp(), gn(), ji(), jv() (+11 more)

### Community 21 - "hi"
Cohesion: 0.21
Nodes (15): bi(), fi(), gi(), gt(), hi(), ii(), Li(), mi() (+7 more)

### Community 22 - "bindPhones"
Cohesion: 0.27
Nodes (14): bindPhones(), cleanPh(), icsMatch(), matchTeacher(), mins(), mphOpen(), nameToks(), parsePhoneList() (+6 more)

### Community 23 - "بيانات النشر في متجر Microsoft Edge Add-ons"
Cohesion: 0.14
Nodes (13): Description (English), Remote code, Single purpose, الاسم, الصور, الظهور, الفئة, الوصف المختصر (من manifest) (+5 more)

### Community 24 - "fh"
Cohesion: 0.27
Nodes (11): Bh(), bt(), dh(), fh(), lh(), mh(), nu(), ph() (+3 more)

### Community 25 - "em"
Cohesion: 0.33
Nodes (10): am(), em(), hp(), km(), mo(), nd(), po(), qg() (+2 more)

### Community 26 - "teams.js"
Cohesion: 0.33
Nodes (6): devicesOff(), nameIn(), phase(), probe(), read(), step()

### Community 27 - "ag"
Cohesion: 0.25
Nodes (8): ag(), cg(), dg(), eh(), gh(), ig(), lg(), sh()

### Community 28 - "راصد – متابعة حضور المعلمين في الحصص الافتراضية"
Cohesion: 0.25
Nodes (7): إعدادات Edge المهمة, التحديث التلقائي في متجر Edge, التحديث للمستخدمين, الخصوصية, تثبيت الإضافة, راصد – متابعة حضور المعلمين في الحصص الافتراضية, نشر تحديث (للمطوّر)

### Community 29 - "nm"
Cohesion: 0.48
Nodes (7): es(), hf(), lf(), nm(), ns(), sf(), xf()

### Community 31 - "قوالب واتساب الرسمي لراصد (Bird · فئة Utility · اللغة العربية ar)"
Cohesion: 0.29
Nodes (6): rased_before — تذكير قبل الحصة, rased_day — تقرير اليوم للمدير, rased_followup — تنبيه المتابع أو المدير, rased_reminder — تذكير المعلم عند عدم دخوله, rased_test — رسالة اختبار, قوالب واتساب الرسمي لراصد (Bird · فئة Utility · اللغة العربية ar)

### Community 32 - "gf"
Cohesion: 0.40
Nodes (5): ds(), gf(), ps(), us(), vs()

### Community 33 - "qi"
Cohesion: 0.40
Nodes (5): eo(), ks(), qi(), ro(), ts()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `make_xlsx_lib()` connect `make_xlsx_lib` to `a`, `gf`, `da`, `gr`, `qi`, `xb`, `kt`, `dm`, `vb`, `ha`, `as`, `ua`, `hi`, `fh`, `em`, `ag`, `nm`?**
  _High betweenness centrality (0.485) - this node is a cross-community bridge._
- **Are the 167 inferred relationships involving `make_xlsx_lib()` (e.g. with `ao()` and `au()`) actually correct?**
  _`make_xlsx_lib()` has 167 INFERRED edges - model-reasoned connections that need verification._
- **Should `a` be split into smaller, more focused modules?**
  _Cohesion score 0.11688311688311688 - nodes in this community are weakly interconnected._
- **Why does `S()` connect `a` to `make_xlsx_lib`, `da`, `gr`, `render`, `app.js`, `xb`, `kt`, `ha`, `ua`, `em`, `nm`?**
  _High betweenness centrality (0.274) - this node is a cross-community bridge._
- **Are the 59 inferred relationships involving `a()` (e.g. with `B()` and `h()`) actually correct?**
  _`a()` has 59 INFERRED edges - model-reasoned connections that need verification._
- **Should `make_xlsx_lib` be split into smaller, more focused modules?**
  _Cohesion score 0.043064182194616975 - nodes in this community are weakly interconnected._
- **Why does `save()` connect `render` to `a`, `app.js`, `wd`, `nowView`, `today`, `bindPhones`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._