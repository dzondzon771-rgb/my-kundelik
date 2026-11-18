/**
 * Smart Starosta v8 — private, dependency-free Excel (.xlsx) exporter.
 * No data leaves the browser while building the workbook.
 * It creates an Office Open XML workbook using stored ZIP entries.
 */
const te = new TextEncoder();
const ST = {present:'Қатысты', late:'Кешікті', excused:'Себепті', absent:'Келмеді'};
const xml = val => String(val ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
const letter = n => {let s=''; for(let x=n+1;x;x=Math.floor((x-1)/26)) s=String.fromCharCode(65+(x-1)%26)+s;return s;};
const statusLabel = status => ST[status] || 'Белгіленбеді';
const formatDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8)}.${s.slice(5,7)}.${s.slice(0,4)}` : s;

function worksheet(rows, widths, filter=false, pctCols=[]) {
  const maxC = Math.max(1,...rows.map(r=>r.length));
  const header = rows.map((r,i) => `<row r="${i+1}"${i===0?' ht="30" customHeight="1"':''}>${r.map((v,c)=>{
    if(v===null || v===undefined || v==='')return '';
    const ref=letter(c)+(i+1);
    const style=i===0 ? 1 : pctCols.includes(c) && typeof v==='number' ? 3 : typeof v==='number' ? 2 : 0;
    return typeof v === 'number' && Number.isFinite(v)
      ? `<c r="${ref}" s="${style}"><v>${v}</v></c>`
      : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const widthXml = widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${Math.max(8,Math.min(44,w))}" customWidth="1"/>`).join('');
  const last=letter(maxC-1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="19"/><cols>${widthXml}</cols><sheetData>${header}</sheetData>${filter && rows.length>1?`<autoFilter ref="A1:${last}${rows.length}"/>`:''}</worksheet>`;
}

const crcTable = (()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[i]=c>>>0;}return t;})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function putU16(view, offset, val){view.setUint16(offset,val,true);}
function putU32(view, offset, val){view.setUint32(offset,val,true);}
function zipStored(files) {
  const parts=[];const central=[];let offset=0;let centralSize=0;
  for(const [name,source] of files){
    const filename=te.encode(name), data=te.encode(source), crc=crc32(data);
    const local=new Uint8Array(30+filename.length);const l=new DataView(local.buffer);
    putU32(l,0,0x04034b50);putU16(l,4,20);putU16(l,6,0x0800);putU16(l,8,0);
    putU32(l,14,crc);putU32(l,18,data.length);putU32(l,22,data.length);putU16(l,26,filename.length);
    local.set(filename,30);parts.push(local,data);
    const dir=new Uint8Array(46+filename.length);const d=new DataView(dir.buffer);
    putU32(d,0,0x02014b50);putU16(d,4,20);putU16(d,6,20);putU16(d,8,0x0800);
    putU32(d,16,crc);putU32(d,20,data.length);putU32(d,24,data.length);putU16(d,28,filename.length);
    putU32(d,42,offset);dir.set(filename,46);central.push(dir);centralSize+=dir.length;
    offset+=local.length+data.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  putU32(v,0,0x06054b50);putU16(v,8,files.length);putU16(v,10,files.length);
  putU32(v,12,centralSize);putU32(v,16,offset);
  return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function makeWorkbook(sheets) {
  const pkg=[
    ['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml',`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts><fonts count="2"><font><sz val="11"/><color rgb="FF263F32"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF27664F"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]
  ];
  for(let i=0;i<sheets.length;i++)pkg.push([`xl/worksheets/sheet${i+1}.xml`,worksheet(sheets[i].rows,sheets[i].widths,sheets[i].filter,sheets[i].pctCols||[])]);
  return zipStored(pkg);
}
export function createGroupWorkbook(item, start, end) {
  const {summary:s,data} = item;
  const pct=stat => {const marked=stat.present+stat.late+stat.excused+stat.absent;return marked?(stat.present+stat.late)/marked:null;};
  const rangeText=(start||end)?`${start?formatDate(start):'Басынан'} — ${end?formatDate(end):'Соңына дейін'}`:'Барлық күндер';
  const overview=[['Көрсеткіш','Мәлімет'],['Топ',s.group],['Топ старостасы',s.leader],['Кезең',rangeText],['Студенттер саны',s.students.length],['Белгі қойылған күндер',s.dates.length],['Қатысты',s.totals.present],['Кешікті',s.totals.late],['Себепті',s.totals.excused],['Келмеді',s.totals.absent],['Белгіленбеді',s.totals.unmarked],['Қатысу үлесі',pct(s.totals)??'—'],['Есеп түрі','Тек қарауға арналған бөлім меңгерушісінің есебі']];
  const people=[['№','Студент','Қатысты','Кешікті','Себепті','Келмеді','Белгіленбеді','Барлық белгі','Қатысу үлесі']];
  s.studentsStats.forEach((student,i)=>people.push([i+1,student.name,student.present,student.late,student.excused,student.absent,student.unmarked,student.present+student.late+student.excused+student.absent,pct(student)??'—']));
  const days=[['Күні','Қатысты','Кешікті','Себепті','Келмеді','Белгіленбеді','Қатысу үлесі']];
  s.days.forEach(day=>days.push([formatDate(day.date),day.present,day.late,day.excused,day.absent,day.unmarked,pct(day)??'—']));
  // Matrix: for each student show the exact status on every selected day.
  const matrixDates=s.dates.slice(0,16382);
  const journal=[['№','Студент',...matrixDates.map(formatDate)]];
  s.studentsStats.forEach((student,i)=> journal.push([i+1,student.name,...matrixDates.map(date=>{
    const entry=data?.attendance?.[date] || {};
    return statusLabel(entry[student.id]);
  })]));
  return makeWorkbook([
    {name:'Жалпы есеп',rows:overview,widths:[29,45],pctCols:[1]},
    {name:'Студенттер',rows:people,widths:[9,35,14,14,14,14,18,17,19],filter:true,pctCols:[8]},
    {name:'Күндер',rows:days,widths:[19,15,15,15,15,19,19],filter:true,pctCols:[6]},
    {name:'Қатысу журналы',rows:journal,widths:[9,35,...matrixDates.map(()=>18)],filter:matrixDates.length>0}
  ]);
}
export function downloadGroupWorkbook(item, start, end) {
  const blob=createGroupWorkbook(item,start,end);
  const safeGroup=String(item.summary.group||'top').replace(/[\\/:*?"<>|\x00-\x1F]/g,'_').trim().slice(0,55)||'top';
  const filename=`Smart_Starosta_${safeGroup}_${start||'all'}_${end||'all'}.xlsx`;
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  return filename;
}
