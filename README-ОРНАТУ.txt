SMART STAROSTA v11.3 — ТЕК ӨЗІҢ ЖІБЕРГЕН 10 ФАЙЛ
===================================================
Қосымша жоба, бөлек CSS, v9/v10 патч жоқ! Осы ZIP ішіндегі дәл 10 файл ғана қолданылады.

МАҢЫЗДЫ ТҮЗЕТУЛЕР
• app.js: қайталанған config() анықтамасы алынып тасталды.
• Firebase / Firestore қателері панельде көрсетіледі (оқылмаған есеп 0 деп жасырылмайды).
• index.html: v11.3 деп нақты көрінеді, скрипттер де v11.3 нұсқасымен жүктеледі.
• sw.js: жаңа кэш нұсқасы ескі Service Worker кэштерін алмастырады.
• Firebase JS модульдері жүктелмесе, 15 секундтан кейін түсінікті қате көрсетіледі.
• Ескі веб-функциялар сақталды: KAZ/RUS/ENG, кешігу уақыты, староста/меңгеруші, Excel.
• excel.js-ке тимедік: күні DD.MM.YYYY мәтіні түрінде және жеткілікті енімен беріледі.

ГИТХАБҚА ЖҮКТЕУ
1. Репозиторийге кір: https://github.com/dzondzon771-rgb/my-kundelik
2. Алдымен Code → Download ZIP жасап, өз ескі кодтарыңды сақта.
3. Осы ZIP-тің ішіндегі 8 сайт файлын басты қалтаға (root) сал:
   index.html, app.js, excel.js, firebase-config.js,
   sw.js, manifest.json, icon-192.png, icon-512.png
   Дәл осындай атаулар болсын; (1) немесе (6) қосымшасы БОЛМАСЫН.
4. Commit changes жаса; Actions → Pages deployment: Successful екенін тексер.
5. https://dzondzon771-rgb.github.io/my-kundelik/index.html?v=11.3 аш.
6. Жоғарыдан v11.3 жазуы шығуы тиіс. Егер v9/v12 көрсең,
   GitHub Pages Deploy from branch: main/(root) екендігін тексер.
7. Сосын инкогнито терезеде тексер, ескі PWA кэшін қолданба.

ФАЙЛДАРДЫ ӨШІРУ ЖӨНІНДЕ
Тексермей тұрып ештеңені өшірме. Жаңа сайт толық ашылғаннан кейін ғана
ескі cloud-v9.js, head-dashboard.css, smart-starosta-v10.js және т.б. тазала.
.github папкасын, Firebase Authentication және Firestore Database деректерін ӨШІРМЕ.

FIREBASE ЕСКЕРТУ
Сен жіберген firebase-config.js-те apiKey, authDomain, projectId және appId БОС.
Нақты Firebase конфигурациясы болмаса, логин бірден жұмыс істемейді.
app.js бұрынғы Cloud файлынан public web config-ті іздей алады, бірақ ол міндетті түрде
табылады деп кепілдік жоқ. Табылмаса:
Firebase Console → Project settings → Your apps → SDK setup and configuration → Config.
Сол мәндерді firebase-config.js ішіне толтыр (парольді қоспа) да қайта жүкте.
GitHub-та firestore.rules болуы жеткіліксіз, ережелерді Firebase Console-да жариялау керек.

ДЕРЕКТЕР ҚАУІПСІЗДІГІ
Бұрынғы Firestore деректеріне автоматты түрде ештеңе өшірілмейді.
Бірақ бірінші кірген соң мәліметтер дұрыс көрсетілгенін тексеріп, JSON backup сақта.
Нақты Firebase жобаңызда тікелей тест жасауға қолжетімділік жоқ.
