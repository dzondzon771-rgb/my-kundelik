/** Smart Starosta v10 — ONLY one worksheet: ТОЛЫҚ ЖУРНАЛ.
 * Browser-only OOXML generator, no external XLSX library or server upload.
 * Every saved attendance day has one row per student. Only КЕЛДІ / КЕЛМЕДІ / БЕЛГІ ЖОҚ.
 * Group percent is calculated from the actual exported rows, not stale summary totals.
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
  const {rows,widths,filter=false,filterEnd=rows.length,freezeTwo=false}=def;
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
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="21"/><cols>${cols}</cols><sheetData>${data}</sheetData>${filter&&filterEnd>1?`<autoFilter ref="A1:${col(count-1)}${filterEnd}"/>`:''}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.3" footer="0.3"/></worksheet>`;
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

/**
 * Creates exactly one worksheet. The visible journal is the source of truth:
 *   came / (came + absent). Missing marks never count as absences.
 * A late student counts as present; an excused absence counts as absent.
 * Reasons are intentionally not exposed in this simplified administrator export.
 */
export function createGroupWorkbook(item, start, end) {
  const summary = item?.summary || {};
  const diary = item?.data || {};
  const sourceStudents = Array.isArray(summary.studentsStats) && summary.studentsStats.length
    ? summary.studentsStats
    : (Array.isArray(diary.students) ? diary.students : []);
  const students = sourceStudents.map((student, i) => ({
    id: String(student.id ?? ''),
    name: String(student.name || `${i + 1} студент`)
  }));
  // The dashboard passes already date-filtered summary.dates. Do not include
  // additional dates from the unfiltered diary or silently change the range.
  const dates = (Array.isArray(summary.dates) ? summary.dates : [])
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .filter(date => (!start || date >= start) && (!end || date <= end))
    .sort();

  const journal = [[
    'КҮНІ', '№', 'СТУДЕНТ', 'ҚАТЫСУ', 'ТОП'
  ]];
  let totalCame = 0, totalAbsent = 0, totalUnknown = 0;
  for (const date of dates) {
    const entries = diary.attendance?.[date] || {};
    students.forEach((student, index) => {
      const value = attendance(entries[student.id]);
      if (value === 'КЕЛДІ') totalCame++;
      else if (value === 'КЕЛМЕДІ') totalAbsent++;
      else totalUnknown++;
      journal.push([
        fmtDate(date), index + 1, student.name,
        c(value, value === 'КЕЛДІ' ? 'came' : value === 'КЕЛМЕДІ' ? 'absent' : 'unknown'),
        String(summary.group || diary.group || 'Топ көрсетілмеген')
      ]);
    });
  }

  // Put the summary BELOW the filterable journal, never in a second tab.
  // This also removes the blank colored top-row artifact of the old export.
  const recordEnd = journal.length;
  if (recordEnd === 1) {
    journal.push(['Таңдалған кезеңде қатысу туралы жазба жоқ']);
  }
  journal.push([]);
  journal.push([c('ҚОРЫТЫНДЫ', 'strong')]);
  const cameRow = journal.length + 1;
  journal.push([c('КЕЛДІ', 'key'), c(totalCame, 'number',
    recordEnd > 1 ? `COUNTIF(D2:D${recordEnd},"КЕЛДІ")` : undefined)]);
  const absentRow = journal.length + 1;
  journal.push([c('КЕЛМЕДІ', 'key'), c(totalAbsent, 'number',
    recordEnd > 1 ? `COUNTIF(D2:D${recordEnd},"КЕЛМЕДІ")` : undefined)]);
  journal.push([c('БЕЛГІ ЖОҚ', 'key'), c(totalUnknown, 'number',
    recordEnd > 1 ? `COUNTIF(D2:D${recordEnd},"БЕЛГІ ЖОҚ")` : undefined)]);
  const markedCount = totalCame + totalAbsent;
  const percent = markedCount ? totalCame / markedCount : null;
  journal.push([c('ҚАТЫСУ ПАЙЫЗЫ', 'key'), markedCount
    ? percentage(percent, `IF(B${cameRow}+B${absentRow}=0,0,B${cameRow}/(B${cameRow}+B${absentRow}))`)
    : c('—', 'plain')]);
  journal.push([c('ЕСЕПТЕУ ТӘРТІБІ', 'key'), 'КЕЛДІ / (КЕЛДІ + КЕЛМЕДІ) × 100']);

  return workbook([{ name: 'Толық журнал', rows: journal,
    widths: [22, 13, 36, 23, 27], filter: true,
    filterEnd: recordEnd, freezeTwo: false }]);
}
export function downloadGroupWorkbook(item, start, end) {
  const blob = createGroupWorkbook(item, start, end);
  const group = String(item?.summary?.group || 'top')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim().slice(0, 50) || 'top';
  const filename = `Smart_Starosta_${group}_${start || 'all'}_${end || 'all'}_Tolyk_Zhurnal_v10.xlsx`;
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return filename;
}
