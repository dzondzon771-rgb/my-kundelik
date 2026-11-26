SMART STAROSTA v11 — ТОЛЫҚ, БІРІКТІРІЛГЕН ЖИНАҚ (GitHub Pages + Firebase)
=====================================================================

Бұл бұрынғы v9/v10-ның үстіне қосылатын patch ЕМЕС. v11 — БІРДЕН ЖҮКТЕЛЕТІН ЖАҢА ТОЛЫҚ ЖОБА.
Сондықтан smart-starosta-v10.js, head-dashboard.css, cloud-v9.js, cloud.js және бөлек
дизайн түзеткіштерін қолданудың қажеті жоқ. Олар осы жинаққа кірмейді.

ЖАҢА ЖҮЙЕНІҢ ҚҰРАМЫ
- index.html: сайттың БАРЛЫҚ дизайны да осында (жоғалған CSS болмайды)
- app.js: староста мен бөлім меңгерушісінің функционалы, 3 тіл
- excel.js: Excel (.xlsx) жазу, келді/келмеді/пайыз, нақты кешігу уақыты
- firebase-config.js: Firebase-ке қосылу параметрлері; БІР РЕТ толтыру қажет
- sw.js: PWA кэшін v11 нұсқасына ауыстыру
- manifest.json, icon-192.png, icon-512.png: телефонның басты экранына қосу
- firestore.rules: Firebase Security Rules ҮЛГІСІ, GitHub-қа жүктеуге міндетті емес

БАРЛЫҚ ФАЙЛДЫ ҚАЙТА ОРНАТУ
1. GitHub репозиторийді АЛДЫМЕН ZIP ретінде сақтық көшірмеге жүктеңіз:
   https://github.com/dzondzon771-rgb/my-kundelik → Code → Download ZIP.
2. Тек GitHub-тағы ЕСКІ САЙТ ФАЙЛДАРЫН ауыстырыңыз немесе өшіріңіз:
   - index.html, head-dashboard.css, head-dashboard.js,
     cloud-v9.js, cloud.js, smart-starosta-v10.js,
     Smart_Starosta_Admin_Design_Fix.css, report-excel.js,
     ескі sw.js, manifest.json, icon-*.png және .txt файлдар.
   - .github папкасын, GitHub Pages settings, branch немесе бүкіл репозиторийді ӨШІРМЕҢІЗ.
   - ЕШҚАШАН Firebase Authentication / Firestore Database деректерін ӨШІРМЕҢІЗ.
3. Осы ZIP-тен 8 веб-файлды GitHub-тың Негізгі бөлігіне (root) орналастырыңыз:
   index.html
   app.js
   excel.js
   firebase-config.js
   sw.js
   manifest.json
   icon-192.png
   icon-512.png
4. Firebase баптауын міндетті түрде 5-қадамда орнатыңыз.
5. Firebase Console → mykundelik → Project settings (жоба параметрлері)
   → Your apps → Web app → Config деген жерден нақты мәндерді көшіріңіз.
   firebase-config.js файлын ашып, өз apiKey/authDomain/projectId/appId өрістерін толтырыңыз.
   messagingSenderId және storageBucket болса, соларды да енгізіңіз.
   Тағы бір жол: сайттағы «Firebase баптау» бетінде ескі index.html не
   cloud-v9.js файлын таңдасаңыз, ол параметрлерді өзі іздеп толтыруға тырысады.
   Табылмаса, Firebase Console-дан мәндерді қолмен енгізіңіз.
   Содан кейін «Firebase баптау» формасына осы мәндерді енгізіп,
   «GitHub үшін firebase-config.js жүктеу» басыңыз. Дайын файлды GitHub-та
   firebase-config.js орнына қайта жүктеңіз.
   МАҢЫЗДЫ: Firebase конфигурациясын бұл ортада ескі сайттан шығара алмадық.
   Сондықтан бұл қадам орындалмаса, жаңа сайт аккаунттарды ашпайды!
6. GitHub-та Commit changes жасаңыз, Actions-та сайт жарияланғанын тексеріңіз.
   Сілтеме: https://dzondzon771-rgb.github.io/my-kundelik/?v=11
7. Ескі PWA кэші қалса: компьютерде Ctrl+Shift+R; Service Workers -> Unregister,
   Cache Storage-дағы smart-starosta атаулы ескі кэштерді тазалаңыз.
   Clear site data жасамаңыз — ескі, Firebase-ке жіберілмеген жергілікті ақпарат кетуі мүмкін.

FIREBASE ДЕРЕКТЕРІН САҚТАУ / РӨЛДЕР
- Жоба бұрынғы Firebase тіркеуін пайдаланады. Жаңа аккаунт ашудың қажеті жоқ.
- Старостаның күнделігі: users/{uid}/private/diary.
- Бөлім есептері: reports/{uid}.
- Меңгеруші: staffRoles/{adminUID} = {role: 'department_head', departmentId:'dept-01', departmentName:'...'}.
- Бөлімдегі топтар: departments/dept-01/members/{starostaUID}, label:'топ аты'.
- Бұрынғы жазбаларды жаңадан жасамай, оқуға әрекет жасайды. Ескі кодтың
  нақты форматтары қолымызда болмағандықтан, сайттағы бірінші логиннен кейін
  деректердің дұрыс көрінгенін ТЕКСЕРІП, содан кейін ғана деректерді САҚТАҢЫЗ.
- Староста жеке JSON backup жүктей алады.
- Меңгеруші өзінің бөлімін ғана оқиды. Жеке ескертпелер есептерге жіберілмейді.
- Excel 5 парақтан тұрады: қорытынды, студенттер, күндер, қатысу кестесі, толық журнал.
- Кешіккен студент үшін нақты уақыт старостаның қатысу кестесінде енгізіледі.
- Ескі v10 бөлек lateArrivals құжаттары болса, оларға рұқсат бар кезде оқылып,
  жаңа форматқа біріктіріледі. Уақыттарды сақтау жаңа reports.data.lateTimes арқылы жүреді.

SECURITY RULES
Бұрынғы Firebase Rules жұмыс істеп тұрса, оларды өшірудің қажеті жоқ.
Егер permission-denied шықса, ZIP-тегі firestore.rules үлгісін ОҚЫП,
бұрынғы өз Rules файлымен САЛЫСТЫРЫҢЫЗ, backup алып, Firebase Rules
Simulator-да тексеріп жариялаңыз. Бұл файлды GitHub-қа жай жүктеу
Firebase-тің нақты ережелерін ӨЗГЕРТПЕЙДІ.

ТЕКСЕРУ
- Логин/пароль, өз тобының деректері, attendance, кешігу HH:MM,
  бөлімге тіркелген топтар, Excel жүктеу әрекеттері, KZ/RU/EN ауысуы.
- Қауіпсіздік Firebase-де нақты аккаунтпен бөлек тексерілуі тиіс.
- Бұл ZIP сайттың жаңа нұсқасы. Нақты Firebase параметрлері енгізілмейінше,
  ешкім логин бола алмайды. Парольді ZIP-ке салмаңыз!
