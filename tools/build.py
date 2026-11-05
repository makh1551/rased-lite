"""يبني docs/index.html و extension/app.html و extension/app.js من src/rased-lite.html
التشغيل: python3 tools/build.py"""
import re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
s = (R/'src/rased-lite.html').read_text(encoding='utf-8')
i = s.index('<div class="wrap" id="app">')
head = s[:i]
reset = '<style>body{margin:0;font-size:14px}[hidden]{display:none!important}img{max-width:100%}</style>'
(R/'docs/index.html').write_text('<!doctype html>\n<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+reset+'\n'+head+'</head><body>\n'+s[i:]+'\n</body></html>\n', encoding='utf-8')
js = re.search(r'<script>\n(.*?)</script>', s, re.S).group(1)
body = '<div class="wrap" id="app"></div>\n<div class="toast" id="toast" role="status" aria-live="polite"></div>\n'
(R/'extension/app.html').write_text('<!doctype html>\n<html lang="ar" dir="rtl"><head><meta charset="utf-8">'+reset+'<meta name="viewport" content="width=device-width,initial-scale=1">\n'+head+'</head><body>\n'+body+'<script src="xlsx.full.min.js"></script>\n<script src="app.js"></script>\n</body></html>\n', encoding='utf-8')
(R/'extension/app.js').write_text('/* راصد المبسّط – إعداد وتطوير: عبدالمجيد السيد · 0561955430 */\n'+js, encoding='utf-8')
print('built')
