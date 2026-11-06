# بيانات النشر في متجر Microsoft Edge Add-ons

## الاسم
راصد الآلي

## الوصف المختصر (من manifest)
يُؤخذ من extension/manifest.json تلقائيًا.

## الوصف (عربي)
راصد الآلي يساعد مدير المدرسة على متابعة حضور المعلمين في حصص Microsoft Teams الافتراضية.

ما يقدمه:
• جدول الحصص من ملف Excel أو CSV، أو لصقه مباشرة من منصة مدرستي.
• شاشة «الآن» للحصة الحالية: حاضر، متأخر، غائب، وتذكير المعلم برسالة واتساب جاهزة.
• الفحص الآلي في مواعيد الحصص: تدخل الإضافة الاجتماع بصمت دون صوت أو كاميرا، وتتحقق من وجود المعلم، وتلتقط لقطة شاشة مختومة بالوقت تُحفظ في جهازك.
• فحص الروابط قبل الحصة، وتنبيه عند فوات حصة، وفحص تعويضي.
• تقارير اليوم والأسبوع والشهر، وسجل كل معلم، وإنجاز المتابعين.
• دخول المدير والمتابعين برموز، ومزامنة اختيارية بين الأجهزة.

الخصوصية: البيانات تُحفظ في جهازك، ولا تُرسل لأي طرف ثالث. المزامنة اختيارية ومحمية برمز المدرسة.
إعداد وتطوير: عبدالمجيد السيد.

## Description (English)
Rased helps school principals track teacher attendance in Microsoft Teams virtual classes. Import the class schedule (Excel/CSV or paste), mark teachers present/late/absent, send ready WhatsApp reminders, and get daily, weekly and monthly reports. The optional automatic check silently joins each meeting at class time (no audio or video), verifies the teacher is present, and saves a time-stamped screenshot on your device. Data stays on the user's device; optional sync between devices is protected by a school code.

## الفئة
Productivity (الإنتاجية)

## الظهور
Hidden (مخفية) — لا تظهر في البحث، ويصل إليها من معه الرابط.

## مبررات الصلاحيات (Permission justification)
- storage / unlimitedStorage: حفظ الجدول ونتائج الفحص ولقطات الشاشة على جهاز المستخدم.
- alarms: تشغيل الفحص في مواعيد الحصص.
- tabs: فتح رابط اجتماع Teams في نافذة الفحص وإغلاقه بعد الفحص.
- notifications: تنبيه المدير عند عدم وجود معلم أو تعطل رابط.
- downloads / downloads.ui: حفظ لقطات الشاشة ملفات JPG في مجلد التنزيلات دون إظهار شريط التنزيل مع كل لقطة.
- power: إبقاء الجهاز مستيقظًا وقت الدوام فقط حتى لا يفوت الفحص.
- host permission <all_urls>: مطلوبة لالتقاط شاشة الاجتماع (captureVisibleTab)، ولقراءة صفحة Teams. السكربت لا يعمل إلا داخل صفحات Teams وتسجيل الدخول من Microsoft.

## Single purpose
Track teacher attendance in Microsoft Teams virtual classes for school administrators.

## Remote code
لا يوجد كود بعيد. كل السكربتات داخل الحزمة. تُقرأ فقط بيانات (version.json) للتنبيه بالتحديثات.

## سياسة الخصوصية
https://rased-lite.wasl.uk/privacy.html

## الصور
- الشعار: store/logo-300.png (300×300)
- لقطات الشاشة (اختيارية): 1280×800 من صفحة «الآن» و«تقرير اليوم».

## خطوات النشر الأولى
1. partner.microsoft.com/dashboard/microsoftedge ← Create new extension.
2. ارفع rased-auto.zip من https://rased-lite.wasl.uk/rased-auto.zip
3. Availability: Hidden. Properties: Productivity + رابط الخصوصية.
4. Store listing: انسخ الوصف أعلاه، وارفع الشعار.
5. Publish. بعد القبول: Publish API ← أضف EDGE_PRODUCT_ID و EDGE_CLIENT_ID و EDGE_API_KEY في أسرار المستودع.
