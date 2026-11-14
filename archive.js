'use strict';
// Standard ZIP (STORE method). JPEGs and DOCX are already compressed.
// Blob parts avoid building another full in-memory copy of all photo bytes.
const zipCRC = Uint32Array.from({length:256}, (_, n) => {
  let c=n; for(let k=0;k<8;k++) c=(c&1)?0xedb88320^(c>>>1):c>>>1; return c>>>0;
});
/* CRC in 4 MB slices, so a large photo or a nested backup is never read into memory whole. */
async function zipCrc(blob) {
  let crc=0xffffffff;const step=4*1048576;
  for(let at=0;at<blob.size;at+=step){
    const bytes=new Uint8Array(await blob.slice(at,Math.min(blob.size,at+step)).arrayBuffer());
    for(let i=0;i<bytes.length;i++)crc=zipCRC[(crc^bytes[i])&255]^(crc>>>8);
  }
  return (crc^0xffffffff)>>>0;
}
async function makeVisitZip(entries, name, onStep) {
  if(entries.length>65535) throw new Error('Too many files for one visit archive.');
  const local=[],central=[],names=new Set(),encoder=new TextEncoder(); let offset=0,centralSize=0;
  const now=new Date(),year=Math.max(1980,Math.min(2107,now.getFullYear()));
  const date=((year-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  const time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
  for(const entry of entries) {
    if(!entry.path || entry.path.startsWith('/') || entry.path.includes('\\') || entry.path.split('/').some(p=>p==='.'||p==='..') || names.has(entry.path)) throw new Error('Invalid archive filename.');
    names.add(entry.path);const filename=encoder.encode(entry.path),blob=entry.blob;
    if(filename.length>65535 || !blob || blob.size>=0xffffffff || offset+30+filename.length+blob.size>=0xffffffff) throw new Error('This archive is too large to package on this device.');
    const crc=await zipCrc(blob);
    const header=new Uint8Array(30),h=new DataView(header.buffer);
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);
    h.setUint16(10,time,true);h.setUint16(12,date,true);h.setUint32(14,crc,true);
    h.setUint32(18,blob.size,true);h.setUint32(22,blob.size,true);h.setUint16(26,filename.length,true);
    local.push(header,filename,blob);
    const record=new Uint8Array(46),c=new DataView(record.buffer);
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);
    c.setUint16(12,time,true);c.setUint16(14,date,true);c.setUint32(16,crc,true);
    c.setUint32(20,blob.size,true);c.setUint32(24,blob.size,true);c.setUint16(28,filename.length,true);
    c.setUint32(38,entry.path.endsWith('/')?0x10:0,true);c.setUint32(42,offset,true);
    central.push(record,filename);centralSize+=record.length+filename.length;
    offset+=header.length+filename.length+blob.size;
    onStep?.(local.length/3,entries.length);
  }
  if(offset+centralSize+22>=0xffffffff)throw new Error('This archive is too large to package on this device.');
  const end=new Uint8Array(22),e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);
  e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
  return new File([...local,...central,end],name,{type:'application/zip'});
}
function visitArchiveEntries(folder,report,photos,index,recovery) {
  const entries=[{path:folder+'/',blob:new Blob()}];
  for(const dir of ['Report','Photos','Photo-Index','Recovery'])entries.push({path:folder+'/'+dir+'/',blob:new Blob()});
  for(const [dir,files] of [['Report',[report]],['Photos',photos],['Photo-Index',[index]],['Recovery',[recovery]]])
    for(const file of files) entries.push({path:folder+'/'+dir+'/'+file.name,blob:file});
  return entries;
}
/* v19 reader for the app's own ZIP files (backups, recovery files, visit packages). Entries are
   returned as slices of the original file, so photos are not read into memory. A ZIP that another
   program recompressed is opened too where the browser can inflate it. */
async function readZip(blob) {
  const tailLen=Math.min(blob.size,65557),tail=new DataView(await blob.slice(blob.size-tailLen).arrayBuffer());
  let end=-1;for(let i=tailLen-22;i>=0;i--)if(tail.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)throw new Error('This is not a ZIP file.');
  const count=tail.getUint16(end+10,true),size=tail.getUint32(end+12,true),start=tail.getUint32(end+16,true);
  if(start+size>blob.size)throw new Error('This ZIP file is incomplete. It may not have finished downloading.');
  const cd=new DataView(await blob.slice(start,start+size).arrayBuffer()),decoder=new TextDecoder(),entries=new Map();let p=0;
  for(let k=0;k<count;k++){
    if(p+46>cd.byteLength||cd.getUint32(p,true)!==0x02014b50)throw new Error('This ZIP file is damaged.');
    const nl=cd.getUint16(p+28,true),el=cd.getUint16(p+30,true),cl=cd.getUint16(p+32,true);
    const name=decoder.decode(new Uint8Array(cd.buffer,cd.byteOffset+p+46,nl));
    entries.set(name,{name,method:cd.getUint16(p+10,true),csize:cd.getUint32(p+20,true),size:cd.getUint32(p+24,true),offset:cd.getUint32(p+42,true)});
    p+=46+nl+el+cl;
  }
  async function open(name,type=''){
    const e=entries.get(name);if(!e)return null;
    const h=new DataView(await blob.slice(e.offset,e.offset+30).arrayBuffer());
    if(h.byteLength<30||h.getUint32(0,true)!==0x04034b50)throw new Error('This ZIP file is damaged.');
    const at=e.offset+30+h.getUint16(26,true)+h.getUint16(28,true),raw=blob.slice(at,at+e.csize,type);
    if(e.method===0)return raw;
    if(e.method===8&&typeof DecompressionStream==='function'){
      const out=await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
      return type?new Blob([out],{type}):out;
    }
    throw new Error('This ZIP file was recompressed by another program and cannot be opened here. Use the original file.');
  }
  return {entries,open};
}
