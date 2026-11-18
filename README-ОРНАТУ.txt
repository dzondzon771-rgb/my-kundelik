SMART STAROSTA — БАРЛЫҒЫ БІРГЕ (v9 + қазақша қаріп түзетуі)
=========================================================
Бұл ZIP-та сайтқа қажетті барлық файлдар бір жерде.

Не бар:
- index.html — қазақша әріптерді (Ә, Ғ, Қ, Ң, Ө, Ұ, Ү, Һ, І) дұрыс көрсететін қаріп түзетуі
- cloud-v9.js, cloud.js — Firebase кіру және сақтау
- head-dashboard.js, head-dashboard.css — бөлім меңгерушісінің есеп панелі
- report-excel.js — Excel жүктеу
- sw.js — PWA кэшінің жаңартылған атауы
- manifest.json, icon-192.png, icon-512.png — телефонға орнатуға арналған файлдар
- firestore.rules — Firebase қауіпсіздік ережесінің көшірмесі (GitHub-та жариялау міндетті емес)

ҚАЛАЙ ЖҮКТЕУ КЕРЕК:
1. ZIP-ті компьютерде шығарып ал.
2. https://github.com/dzondzon771-rgb/my-kundelik аш.
3. Add file -> Upload files арқылы 10 веб-файлды репозиторийдің негізгі жеріне жүкте:
   index.html, cloud-v9.js, cloud.js, head-dashboard.js,
   head-dashboard.css, report-excel.js, sw.js, manifest.json,
   icon-192.png, icon-512.png.
4. Commit changes бас. GitHub Actions-та жариялау Successful болсын.
5. https://dzondzon771-rgb.github.io/my-kundelik/ ашып,
   Ctrl+Shift+R бас. Телефонда ескі көрінсе, PWA кэшін жаңарт.

ЕСКЕРТУ:
Қаріпті түзету Google Fonts интернетінен Noto Sans жүктейді.
Интернет жоқ кезде құрылғыдағы қолдайтын қаріптер пайдаланылады.
Бұл жинақ бұрынғы v9 сайт кодына негізделген; Firebase деректеріне тимейді.
