const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),zlib=require('zlib');
const root=path.resolve(__dirname,'..'),docx=require(path.join(root,'docx.umd.js'));
// 1x1 PNG stands in for photos; the decode hook supplies each photo's true shape.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const shapes=new Map();
const ctx={window:{docx,SVReportDecode:async blob=>({buf:png.buffer.slice(png.byteOffset,png.byteOffset+png.length),...shapes.get(blob)})},Blob,File,Date,Uint8Array,Uint32Array,TextEncoder,fetch:async()=>({ok:false})};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'report.js'),'utf8'),ctx);
function documentXml(buf){ // minimal zip reader for word/document.xml
 let i=buf.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));const n=buf.readUInt16LE(i+10);let p=buf.readUInt32LE(i+16);
 for(let k=0;k<n;k++){const method=buf.readUInt16LE(p+10),csize=buf.readUInt32LE(p+20),nl=buf.readUInt16LE(p+28),el=buf.readUInt16LE(p+30),cl=buf.readUInt16LE(p+32),off=buf.readUInt32LE(p+42),name=buf.toString('utf8',p+46,p+46+nl);
  if(name==='word/document.xml'){const ln=buf.readUInt16LE(off+26),le=buf.readUInt16LE(off+28),data=buf.subarray(off+30+ln+le,off+30+ln+le+csize);return (method?zlib.inflateRawSync(data):data).toString('utf8');}p+=46+nl+el+cl;}
 throw new Error('document.xml missing');}
(async()=>{
 const dims=[[4032,3024],[3024,4032],[3024,4032],[4032,3024],[3024,4032],[4032,2268]];
 const recs=dims.map(([nw,nh],i)=>{const blob=new Blob([String(i)]);shapes.set(blob,{nw,nh});return {id:i+1,ts:Date.UTC(2026,8,18,14,i),note:i===2?'Left out of the report':'Note '+(i+1),tag:i===4?'Safety':'',area:'Level 1',sheet:'',owner:'',due:'',omit:i===2?'1':'',blob};});
 const base={project:'Layout Test',projNum:'T02',num:1,date:Date.UTC(2026,8,18),closed:false,revision:0,items:[],distribution:'File'};
 for(const layout of ['compact','large',undefined]){
  const xml=documentXml(Buffer.from(await (await ctx.window.SVReport.buildReport({...base,reportLayout:layout},recs)).arrayBuffer()));
  assert.equal((xml.match(/<w:drawing>/g)||[]).length,5,'five included photos for '+layout);
  assert(!xml.includes('Left out of the report'),'omitted photo stays out');
  assert(!xml.includes('NaN'),'image sizes are numeric');
  assert(xml.indexOf('LIMITATIONS')<xml.indexOf('PHOTO OBSERVATIONS'),'summary page precedes photo pages');
  for(const m of xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/g)){const w=m[1]/914400,h=m[2]/914400;assert(w<=4.6&&h<=3.45,'photo fits its box');}
 }
 const none=documentXml(Buffer.from(await (await ctx.window.SVReport.buildReport(base,recs.map(r=>({...r,omit:'1'})))).arrayBuffer()));
 assert(none.includes('No photographs selected for this report.'));
 assert.deepEqual(Object.keys(ctx.window.SVReport.layouts),['compact','large']);
 console.log('PASS: compact and large layouts, landscape/portrait/wide photo fitting, omitted photos excluded, summary before photos, no photos selected message.');
})().catch(e=>{console.error(e);process.exitCode=1});
