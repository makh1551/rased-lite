"""يبني docs/index.html و extension/app.html و extension/app.js من src/rased-lite.html
التشغيل: python3 tools/build.py"""
import re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
s = (R/'src/rased-lite.html').read_text(encoding='utf-8')
i = s.index('<div class="wrap" id="app">')
head = s[:i]
PWA = '<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#0d4f57"><link rel="apple-touch-icon" href="icon-192.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="راصد">'
reset = '<style>body{margin:0;font-size:14px}[hidden]{display:none!important}img{max-width:100%}</style>'
OG = ('<title>راصد المبسّط</title>'
  '<meta name="description" content="متابعة حضور المعلمين في الحصص الافتراضية: رصد، وتذكير واتساب، وتقارير، ومتابعون، وفحص آلي. مجاني ولا يحتاج حسابًا.">'
  '<meta property="og:type" content="website"><meta property="og:site_name" content="راصد">'
  '<meta property="og:title" content="راصد المبسّط"><meta property="og:description" content="متابعة حضور المعلمين في الحصص الافتراضية بخطوات بسيطة">'
  '<meta property="og:url" content="https://rased-lite.wasl.uk/"><meta property="og:image" content="https://rased-lite.wasl.uk/og.png">'
  '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta property="og:locale" content="ar_SA">')
dhead = re.sub(r'<title>.*?</title>\s*', '', head, count=1, flags=re.S)
dhead = re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\s*', '', dhead)
(R/'docs/index.html').write_text('<!doctype html>\n<html lang="ar" dir="rtl"><head><meta charset="utf-8">'+OG+'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+reset+PWA+'\n'+dhead+'</head><body>\n'+s[i:]+'\n</body></html>\n', encoding='utf-8')
js = re.search(r'<script>\n(.*?)</script>', s, re.S).group(1)
body = '<div class="wrap" id="app"></div>\n<div class="toast" id="toast" role="status" aria-live="polite"></div>\n'
(R/'extension/app.html').write_text('<!doctype html>\n<html lang="ar" dir="rtl"><head><meta charset="utf-8">'+reset+'<meta name="viewport" content="width=device-width,initial-scale=1">\n'+head+'</head><body>\n'+body+'<script src="xlsx.full.min.js"></script>\n<script src="app.js"></script>\n</body></html>\n', encoding='utf-8')
(R/'extension/app.js').write_text('/* راصد المبسّط – إعداد وتطوير: عبدالمجيد السيد · 0561955430 */\n'+js, encoding='utf-8')
print('built')
