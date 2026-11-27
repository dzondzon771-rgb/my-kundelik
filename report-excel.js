/** Smart Starosta v9 — transparent, easy-to-read attendance Excel export.
 * Browser-only OOXML generator, no external XLSX library or server upload.
 * Attendance convention: present + late = КЕЛДІ; absent + excused = КЕЛМЕДІ.
 * Unmarked remains БЕЛГІ ЖОҚ and never silently counts as absent/present.
 */
const enc = new TextEncoder();
const xml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const col = n => { let s=''; for(let x=n+1;x;x=Math.floor((x-1)/26))s=String.fromCharCode(65+(x-1)%26)+s; return s; };
const fmtDate = val => /^\d{4}-\d{2}-\d{2}$/.test(String(val)) ? `${val.slice(8)}.${val.slice(5,7)}.${val.slice(0,4)}` : String(val ?? '');
const attendance = value => value==='present'||value==='late' ? 'КЕЛДІ' : value==='absent'||value==='excused' ? 'КЕЛМЕДІ' : 'БЕЛГІ ЖОҚ';
const note = value => ({present:'Уақытында келді',late:'Кешікті',absent:'Себепсіз келмеді',excused:'Себепті келмеді'})[value] || 'Белгі қойылмаған';
const marked = stat => (Number(stat?.present)||0)+(Number(stat?.late)||0)+(Number(stat?.absent)||0)+(Number(stat?.excused)||0);
const came = stat => (Number(stat?.present)||0)+(Number(stat?.late)||0);
const didNotCome = stat => (Number(stat?.absent)||0)+(Number(stat?.excused)||0);
const rate = stat => marked(stat)>0 ? came(stat)/marked(stat) : null;
const c = (value, style, formula) => ({value,style,formula});
const percentage = (ratio,formula) => ratio === null ? c('—','plain') : c(ratio, 'percent', formula);

const styleId = {plain:0, header:1, alternate:2, number:3, percent:4, came:5, absent:6, unknown:7, key:8, strong:9};
const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
 <numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts>
 <fonts count="4"><font><sz val="11"/><name val="Aptos"/><color rgb="FF213B32"/></font>
 <font><b/><sz val="11"/><name val="Aptos"/><color rgb="FFFFFFFF"/></font>
 <font><sz val="11"/><name val="Aptos"/><color rgb="FF16623C"/></font>
 <font><b/><sz val="11"/><name val="Aptos"/><color rgb="FF153F30"/></font></fonts>
 <fills count="6"><fill><patternFill patternType="none"/></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FF25674F"/><bgColor indexed="64"/></patternFill></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FFF4F8F5"/><bgColor indexed="64"/></patternFill></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FFE1F2E7"/><bgColor indexed="64"/></patternFill></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FFFFE5E3"/><bgColor indexed="64"/></patternFill></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FFF5F2E9"/><bgColor indexed="64"/></patternFill></fill></fills>
 <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>
 <border><left style="hair"><color rgb="FFE0E9E4"/></left><right style="hair"><color rgb="FFE0E9E4"/></right>
 <top style="hair"><color rgb="FFE0E9E4"/></top><bottom style="hair"><color rgb="FFE0E9E4"/></bottom><diagonal/></border></borders>
 <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
 <cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>
 <xf numFmtId="0" fontId="1" fillId="1" borderId="1" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
 <xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1"/>
 <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
 <xf numFmtId="164" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf>
 <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf>
 <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>
 <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>
 <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFill="1" applyFont="1"/>
 <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1"/></cellXfs>
 <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function writeSheet(def) {
  const {rows,widths,filter=false,freezeTwo=false}=def;
  const count=Math.max(1, ...rows.map(row=>row.length));
  const data=rows.map((row,r)=>`<row r="${r+1}"${r===0?' ht="33" customHeight="1"':''}>`+row.map((raw,i)=>{
    if(raw===null||raw===undefined||raw==='')return '';
    const cell=(typeof raw==='object'&&raw!==null&&'value' in raw)?raw:{value:raw};
    let style=styleId[cell.style] ?? (r===0 ? 1 : r%2===0 ? 2 : 0);
    if(r===0)style=1;
    const ref=col(i)+(r+1), value=cell.value;
    if(cell.formula && typeof value==='number' && Number.isFinite(value))
      return `<c r="${ref}" s="${style}"><f>${xml(cell.formula.replace(/^=/,''))}</f><v>${value}</v></c>`;
    if(typeof value==='number'&&Number.isFinite(value))
      return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  }).join('')+'</row>').join('');
  const cols=widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${Math.max(9,Math.min(44,w))}" customWidth="1"/>`).join('');
  const pane=freezeTwo?'<pane xSplit="2" ySplit="1" topLeftCell="C2" activePane="bottomRight" state="frozen"/>':'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="21"/><cols>${cols}</cols><sheetData>${data}</sheetData>${filter&&rows.length>1?`<autoFilter ref="A1:${col(count-1)}${rows.length}"/>`:''}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.3" footer="0.3"/></worksheet>`;
}
const table=(()=>{let t=new Uint32Array(256);for(let i=0;i<256;i++){let x=i;for(let j=0;j<8;j++)x=x&1?0xedb88320^(x>>>1):x>>>1;t[i]=x>>>0;}return t;})();
function crc32(data){let crc=0xffffffff;for(const byte of data)crc=table[(crc^byte)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;}
function storeZip(files){let localParts=[], dirs=[], position=0, size=0;
  for(const [name,contents] of files){const filename=enc.encode(name), bytes=enc.encode(contents), crc=crc32(bytes);
    const head=new Uint8Array(30+filename.length),h=new DataView(head.buffer);
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);
    h.setUint32(14,crc,true);h.setUint32(18,bytes.length,true);h.setUint32(22,bytes.length,true);h.setUint16(26,filename.length,true);head.set(filename,30);
    localParts.push(head,bytes);
    const dir=new Uint8Array(46+filename.length),d=new DataView(dir.buffer);
    d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x0800,true);
    d.setUint32(16,crc,true);d.setUint32(20,bytes.length,true);d.setUint32(24,bytes.length,true);d.setUint16(28,filename.length,true);
    d.setUint32(42,position,true);dir.set(filename,46);dirs.push(dir);size+=dir.length;position+=head.length+bytes.length;
  }
  const end=new Uint8Array(22),view=new DataView(end.buffer);
  view.setUint32(0,0x06054b50,true);view.setUint16(8,files.length,true);view.setUint16(10,files.length,true);view.setUint32(12,size,true);view.setUint32(16,position,true);
  return new Blob([...localParts,...dirs,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function workbook(defs){const pkg=[
  ['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${defs.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
  ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
  ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${defs.map((d,i)=>`<sheet name="${xml(d.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
  ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${defs.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${defs.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
  ['xl/styles.xml',styles]
];defs.forEach((def,i)=>pkg.push([`xl/worksheets/sheet${i+1}.xml`,writeSheet(def)]));return storeZip(pkg);}

export function createGroupWorkbook(item,start,end){
  const s=item.summary,diary=item.data||{};
  const days=Array.isArray(s.dates)?s.dates:[];
  const students=Array.isArray(s.studentsStats)?s.studentsStats:[];
  const overallRate=rate(s.totals);
  const totalCame=came(s.totals),totalAbsent=didNotCome(s.totals),totalKnown=marked(s.totals);
  const unknown=Number(s.totals?.unmarked)||0;
  const coverage=(totalKnown+unknown)>0?totalKnown/(totalKnown+unknown):null;
  const period=(start||end)?`${start?fmtDate(start):'Басынан'} — ${end?fmtDate(end):'Соңына дейін'}`:'Барлық күндер';
  const overview=[
    ['КӨРСЕТКІШ','МӘЛІМЕТ'],
    [c('Топ', 'key'),s.group || 'Топ көрсетілмеген'],
    [c('Староста','key'),s.leader || 'Староста көрсетілмеген'],
    [c('Есеп кезеңі','key'),period],
    [c('Студент саны','key'),c(students.length,'number')],
    [c('Белгіленген күн саны','key'),c(days.length,'number')],
    [c('КЕЛДІ','key'),c(totalCame,'number')],
    [c('КЕЛМЕДІ','key'),c(totalAbsent,'number')],
    [c('БЕЛГІ ЖОҚ','key'),c(unknown,'number')],
    [c('Белгі қойылғаны','key'),c(totalKnown,'number','B7+B8')],
    [c('ҚАТЫСУ ПАЙЫЗЫ','key'),percentage(overallRate,'IF(B10=0,0,B7/B10)')],
    [c('Белгілердің толтырылуы','key'),percentage(coverage,'IF((B10+B9)=0,0,B10/(B10+B9))')],
    [c('Пайыз формуласы','key'),'КЕЛДІ / (КЕЛДІ + КЕЛМЕДІ) × 100'],
    [c('Кешіккен','key'),'КЕЛДІ деп есептеледі, себебі қатысқан'],
    [c('Себепті келмеген','key'),'КЕЛМЕДІ деп есептеледі, түсіндірмесі Толық журналда'],
    [c('Белгі жоқ','key'),'Қатысу пайызына қосылмайды, бөлек есептеледі'],
    [c('Мәлімет көзі','key'),'Smart Starosta: осы топтың сақталған қатысу белгілері']
  ];
  const people=[['№','СТУДЕНТ','КЕЛДІ','КЕЛМЕДІ','БЕЛГІ ЖОҚ','БЕЛГІ ҚОЙЫЛҒАН','ҚАТЫСУ %']];
  students.forEach((st,i)=>{
    const yes=came(st),no=didNotCome(st),known=marked(st),r=rate(st),row=i+2;
    people.push([i+1,st.name||`${i+1} студент`,c(yes,'number'),c(no,'number'),c(Number(st.unmarked)||0,'number'),c(known,'number',`C${row}+D${row}`),percentage(r,`IF(F${row}=0,0,C${row}/F${row})`)]);
  });
  const byDay=[['КҮНІ','КЕЛДІ','КЕЛМЕДІ','БЕЛГІ ЖОҚ','БЕЛГІ ҚОЙЫЛҒАН','ҚАТЫСУ %']];
  (s.days||[]).forEach((day,i)=>{const yes=came(day),no=didNotCome(day),row=i+2;
    byDay.push([fmtDate(day.date),c(yes,'number'),c(no,'number'),c(Number(day.unmarked)||0,'number'),c(marked(day),'number',`B${row}+C${row}`),percentage(rate(day),`IF(E${row}=0,0,B${row}/E${row})`)]);
  });
  const selected=days.slice(0,16381); // Excel max 16384 columns: A,B + dates + %
  const matrix=[['№','СТУДЕНТ',...selected.map(fmtDate),'ҚАТЫСУ %']];
  students.forEach((st,i)=>{
    const values=selected.map(date=>{
      const result=attendance(diary.attendance?.[date]?.[st.id]);
      return c(result,result==='КЕЛДІ'?'came':result==='КЕЛМЕДІ'?'absent':'unknown');
    });
    const rateValue=rate(st), row=i+2;
    const first='C',last=col(selected.length+1);
    const formula=selected.length?`IF((COUNTIF(${first}${row}:${last}${row},"КЕЛДІ")+COUNTIF(${first}${row}:${last}${row},"КЕЛМЕДІ"))=0,0,COUNTIF(${first}${row}:${last}${row},"КЕЛДІ")/(COUNTIF(${first}${row}:${last}${row},"КЕЛДІ")+COUNTIF(${first}${row}:${last}${row},"КЕЛМЕДІ")))`:undefined;
    matrix.push([i+1,st.name||`${i+1} студент`,...values,percentage(rateValue,formula)]);
  });
  const log=[['КҮНІ','№','СТУДЕНТ','КЕЛДІ МЕ?','НАҚТЫ БЕЛГІ / ТҮСІНДІРМЕ','КЕЛГЕН УАҚЫТЫ']];
  const lateLog=[['КҮНІ','СТУДЕНТ','КЕЛГЕН УАҚЫТЫ','БЕЛГІСІ']];
  selected.forEach(date=>students.forEach((st,i)=>{
    const original=diary.attendance?.[date]?.[st.id];
    const result=attendance(original);
    const time=original==='late' ? String(diary.lateTimes?.[date]?.[st.id]||'') : '';
    log.push([fmtDate(date),i+1,st.name||`${i+1} студент`,c(result,result==='КЕЛДІ'?'came':result==='КЕЛМЕДІ'?'absent':'unknown'),note(original),time]);
    if(original==='late')lateLog.push([fmtDate(date),st.name||`${i+1} студент`,time,'Кешікті']);
  }));
  return workbook([
    {name:'Жалпы есеп',rows:overview,widths:[36,44]},
    {name:'Студенттер',rows:people,widths:[9,37,16,18,19,23,18],filter:true},
    {name:'Күндер',rows:byDay,widths:[17,17,18,19,23,18],filter:true},
    {name:'Қатысу кестесі',rows:matrix,widths:[9,37,...selected.map(()=>20),18],filter:selected.length>0,freezeTwo:true},
    {name:'Толық журнал',rows:log,widths:[20,9,34,20,30,21],filter:true},
    {name:'Кешігулер',rows:lateLog,widths:[20,35,22,19],filter:true}
  ]);
}
export function downloadGroupWorkbook(item,start,end){
  const blob=createGroupWorkbook(item,start,end);
  const group=String(item.summary.group||'top').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').trim().slice(0,50)||'top';
  const name=`Smart_Starosta_${group}_${start||'all'}_${end||'all'}_v9_4.xlsx`;
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;
  document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  return name;
}

/** Original diary's single-day export: real .xlsx with a wide, text-formatted date column. */
export function createDailyWorkbook(diary, date, lang='kk') {
  const people=Array.isArray(diary?.students)?diary.students:[];
  const att=diary?.attendance?.[date]||{};
  const fmt=fmtDate(date);
  const locale={
    kk:['Күні','Топ','Студент','Қатысу','Келген уақыты','Нақты белгі','Қатысты','Кешікті','Келмеді','Себепті келмеді','Белгі жоқ'],
    ru:['Дата','Группа','Студент','Посещение','Время прихода','Статус','Пришёл','Опоздал','Отсутствовал','Уважительная причина','Нет отметки'],
    en:['Date','Group','Student','Attendance','Arrival time','Detailed status','Present','Late','Absent','Excused','Unmarked']
  }[lang]||null;
  const h=locale||['Күні','Топ','Студент','Қатысу','Келген уақыты','Нақты белгі','Қатысты','Кешікті','Келмеді','Себепті келмеді','Белгі жоқ'];
  const rows=[[...h.slice(0,6)]];
  const totals={came:0,absent:0,unknown:0};
  people.forEach((p,i)=>{
    const code=att[p.id];
    const isCame=code==='present'||code==='late', isAbsent=code==='absent'||code==='excused';
    const index=code==='present'?6:code==='late'?7:code==='absent'?8:code==='excused'?9:10;
    if(isCame)totals.came++;else if(isAbsent)totals.absent++;else totals.unknown++;
    const label=isCame?h[6]:isAbsent?h[8]:h[10];
    const time=code==='late'?String(diary?.lateTimes?.[date]?.[p.id]||''):'';
    rows.push([fmt,String(diary.group||''),String(p.name||`${i+1} студент`),c(label,isCame?'came':isAbsent?'absent':'unknown'),time,h[index]]);
  });
  const markedCount=totals.came+totals.absent;
  const stats=[[h[0],fmt],[h[1],String(diary.group||'')],['КЕЛДІ / PRESENT',totals.came],['КЕЛМЕДІ / ABSENT',totals.absent],['БЕЛГІ ЖОҚ / UNMARKED',totals.unknown],['ҚАТЫСУ / RATE',markedCount ? percentage(totals.came/markedCount) : '—']];
  return workbook([
    {name:'Күндік журнал',rows,widths:[22,23,38,21,22,31],filter:true},
    {name:'Қорытынды',rows:stats,widths:[30,31]}
  ]);
}
export function downloadDailyWorkbook(diary, date, lang='kk') {
  const blob=createDailyWorkbook(diary,date,lang);
  const safe=String(diary?.group||'top').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,45);
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`Smart_Starosta_${safe}_${date}_kundik.xlsx`;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
