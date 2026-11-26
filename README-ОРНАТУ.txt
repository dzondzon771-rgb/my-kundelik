SMART STAROSTA v11.2 — БАРЛЫҒЫ БІРГЕ, СОЛ ФАЙЛ АТАУЛАРЫМЕН
===========================================================
Бұл жинақ сіз жіберген НАҚТЫ 10 файлдан жасалған. Ешбір v9/v10 қосымша модулі керек емес.

ЖИНАҚ ҚҰРАМЫ
index.html           — БАРЛЫҚ дизайн, CSS тегтерінің ішінде
app.js               — староста, бөлім меңгерушісі, үш тіл, кешігу уақытын сақтау
excel.js             — Excel, күні DD.MM.YYYY, кешігу уақыттары, пайыз
firebase-config.js   — Firebase веб параметрлері (жоқ болса автоматты іздеуге тырысады)
firestore.rules      — Firebase Rules-тің көшірмесі; бұл файлды Github-та ұстау жеткіліксіз
sw.js                — v11.2 PWA кэші
manifest.json
icon-192.png
icon-512.png

GITHUB-ТАҒЫ ФАЙЛДАРДЫ ҚАЛАЙ АУЫСТЫРУ КЕРЕК
1. https://github.com/dzondzon771-rgb/my-kundelik → Code → Download ZIP
   арқылы МІНДЕТТІ түрде ескі сайттың сақтық көшірмесін алыңыз.
2. GitHub репозиторийді немесе .github папкасын ӨШІРМЕҢІЗ.
3. Осы жинақтағы 8 веб-файлды repository root-ке салыңыз (үстінен ауыстырыңыз):
   index.html, app.js, excel.js, firebase-config.js,
   sw.js, manifest.json, icon-192.png, icon-512.png.
4. Commit changes; GitHub Actions → Successful болғанын тексеріңіз.
5. Сайт: https://dzondzon771-rgb.github.io/my-kundelik/?v=11.2
6. Ескі файлдарды тек жаңа сайтты сәтті тексеріп шыққаннан КЕЙІН өшіріңіз:
   cloud-v9.js, cloud.js, head-dashboard.js, head-dashboard.css,
   report-excel.js, smart-starosta-v10.js, Smart_Starosta_Admin_Design_Fix.css.
   Ескі репозиторийдегі cloud-v9.js-ті бірден өшірмей тұру маңызды:
   Firebase конфигурациясын сол жерден автоматты табу мүмкіндігі бар.
7. Браузерде Ctrl+Shift+R, қажет болса ескі Service Worker-ті Unregister жасаңыз.
   Clear site data БАСУҒА БОЛМАЙДЫ: сақталмаған жергілікті дерек жоғалуы мүмкін.

FIREBASE ТУРАЛЫ НАҚТЫ АҚПАРАТ
Сіз жіберген firebase-config.js ішінде apiKey, authDomain, projectId, appId — БОС.
Оларды ойдан құруға болмайды. Қосымша ескі cloud-v9.js/cloud.js файлынан немесе
GitHub-тың ашық commit тарихынан ТЕК Firebase Web Config мәндерін іздейді.
Табылмаса: Firebase Console → mykundelik → ⚙ Project settings → Your apps
→ Web app → Config, мәндерін сайттағы Firebase баптауына бір рет енгізіңіз.
Басқа браузерлер бірден жұмыс істеуі үшін дайын firebase-config.js файлын
сайттың Firebase баптау бетімен жүктеп алып, GitHub-қа ауыстырыңыз.
Firebase Web API key клиенттік конфигурация; пароль не service account емес.
Firebase Authentication аккаунттарын, Firestore студент деректерін ӨШІРМЕҢІЗ.

МАҢЫЗДЫ
Бұл жинақта нақты бұрынғы Firestore құжаттарымен тікелей байланыс тексерілмеді.
Староста ретінде кірген соң топ/студент/күндердің дұрыс көрсетілгенін тексеріп,
бірінші өзгеріс жасамай тұрып JSON сақтық көшірме жүктеп алыңыз.
Бөлім меңгерушісі: staffRoles/{headUID} және
 departments/{departmentId}/members/{starostaUID} құрылымы сақталады.
firestore.rules файлындағы ережелерді GitHub-та сақтау Firebase-ті өзгертпейді.
Ескі Rules дұрыс жұмыс істесе, Firebase-де оларды ауыстыру қажет емес.

ЖАҢА ФУНКЦИЯЛАР
- Қазақша / орысша / ағылшынша
- Қатысты / кешікті / келмеді / себепті келмеді
- Кешікті болса нақты HH:MM келу уақытын енгізу
- Меңгерушінің өз бөлімінің есептері, студент/күн тарихы
- Excel: қатысу пайызы, күндер және кешігу уақыты
- Қатысу % = (қатысты + кешікті)/(барлық белгіленген статустар) × 100
- Белгі қойылмаған күндер есепке кірмейді

ТЕКСЕРУ
- JS syntax, файл сілтемелері, браузердегі үлгі деректер мен Excel құрылымы тексеріледі.
- Нақты Firebase жобасына қашықтан кіріп тексеруге қолжетімділік жоқ.
