/* v17 photo order by location: plan, export names, CSV order and the real Word report. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),zlib=require('zlib');
const root=path.resolve(__dirname,'..'),docx=require(path.join(root,'docx.umd.js'));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const ctx={window:{docx,SVReportDecode:async()=>({buf:png.buffer.slice(png.byteOffset,png.byteOffset+png.length),nw:4032,nh:3024})},Blob,File,Date,Uint8Array,Uint32Array,TextEncoder,fetch:async()=>({ok:false}),
 dateInput:ts=>new Date(ts).toISOString().slice(0,10)};
vm.createContext(ctx);for(const f of ['photo-order.js','report.js','cloud.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
function documentXml(buf){let i=buf.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));const n=buf.readUInt16LE(i+10);let p=buf.readUInt32LE(i+16);
 for(let k=0;k<n;k++){const method=buf.readUInt16LE(p+10),csize=buf.readUInt32LE(p+20),nl=buf.readUInt16LE(p+28),el=buf.readUInt16LE(p+30),cl=buf.readUInt16LE(p+32),off=buf.readUInt32LE(p+42),name=buf.toString('utf8',p+46,p+46+nl);
  if(name==='word/document.xml'){const ln=buf.readUInt16LE(off+26),le=buf.readUInt16LE(off+28),data=buf.subarray(off+30+ln+le,off+30+ln+le+csize);return (method?zlib.inflateRawSync(data):data).toString('utf8');}p+=46+nl+el+cl;}
 throw new Error('document.xml missing');}
const same=(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m);
const text=xml=>[...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m=>m[1]);
const t0=Date.UTC(2026,9,1,14);
// Walk: Room 204, then General, Exterior North, back to room 204 (other case), a safety photo, an extra.
const walk=[['Room 204','First in 204'],['','No location'],['Exterior North','North wall'],['room 204','Back in 204'],['Exterior North','Guard rail','Safety'],['Roof','Left out',null,'1'],['','Second general']];
const recs=walk.map(([location,note,tag,omit],i)=>({id:i+1,ts:t0+i*60000,note,tag:tag||'',location,sheet:i===2?'A2.01':'',owner:'',due:'',omit:omit||'',blob:new Blob(['p'+i],{type:'image/jpeg'})}));
const visit={project:'Order Test',projNum:'T17',num:3,date:t0,closed:false,revision:0,items:[],distribution:'File',reportOrder:'location'};
(async()=>{
 // Plan: General first, then locations by first visit, oldest first within each, one number sequence.
 const plan=ctx.photoPlan(visit,recs);
 same(plan.groups.map(g=>g.label),['General','Room 204','Exterior North']);
 same(plan.ordered.map(r=>r.id),[2,7,1,4,3,5]);
 same(plan.ordered.map(r=>plan.numbers.get(r.id)),[1,2,3,4,5,6]);
 same(plan.extras.map(r=>r.id),[6]);assert.equal(plan.numbers.has(6),false,'left-out photo has no number');
 assert.equal(plan.headings,true);
 // Old issued visits keep the v16 order: safety first, numbered by time.
 const old=ctx.photoPlan({...visit,reportOrder:undefined,closed:true},recs);
 assert.equal(old.mode,'time');same(old.ordered.map(r=>r.id),[5,1,2,3,4,7]);assert.equal(old.numbers.get(5),5);assert.equal(old.headings,false);
 assert.equal(ctx.reportOrderOf({closed:false}),'location');assert.equal(ctx.reportOrderOf({closed:true}),'time');assert.equal(ctx.reportOrderOf({closed:true,reportOrder:'location'}),'location');
 assert.equal(ctx.photoLocation({area:'Legacy area'}),'Legacy area','v16 area is read as location');assert.equal(ctx.photoLocation({location:'',area:'Old'}),'Old');
 // Wheel order: numbered names by their number, then the rest alphabetically.
 same(ctx.sortLocations(['Lobby','Room 101','Exterior North','Room 9','Level 2','level 2B','Stair 2']),['Level 2','level 2B','Stair 2','Room 9','Room 101','Exterior North','Lobby']);
 same(ctx.sortLocations(['B','a','Unit 10.5','Unit 10']),['Unit 10','Unit 10.5','a','B']);
 // No locations at all: one General group and no headings, like v16.
 const plain=ctx.photoPlan(visit,recs.map(r=>({...r,location:''})));assert.equal(plain.headings,false);same(plain.ordered.map(r=>r.id),[1,2,3,4,5,7]);
 // Gallery keeps left-out photos inside their location.
 same(ctx.galleryGroups(visit,recs).map(g=>g.label),['General','Room 204','Exterior North','Roof']);
 // Export names follow the report order and carry the location.
 const set=ctx.photoExportSet(visit,recs);
 same(set.map(e=>e.name),['T17_SVR-003_2026-10-01_Obs-001_General.jpg','T17_SVR-003_2026-10-01_Obs-002_General.jpg','T17_SVR-003_2026-10-01_Obs-003_Room-204.jpg','T17_SVR-003_2026-10-01_Obs-004_Room-204.jpg','T17_SVR-003_2026-10-01_Obs-005_Exterior-North.jpg','T17_SVR-003_2026-10-01_Obs-006_Exterior-North.jpg','T17_SVR-003_2026-10-01_Extra-01_Roof.jpg']);
 assert.equal(new Set(set.map(e=>e.name)).size,set.length,'names are unique');
 assert.equal(ctx.locationStem('Level 2 / Mech: Room?'),'Level-2-Mech-Room');
 // Real Word report: headings in visit order, continuous numbers, location not repeated under its heading.
 for(const layout of ['compact','large']){
  const xml=documentXml(Buffer.from(await (await ctx.window.SVReport.buildReport({...visit,reportLayout:layout},recs)).arrayBuffer()));const words=text(xml);
  const at=s=>words.findIndex(w=>w===s);
  assert(at('GENERAL')>0&&at('GENERAL')<at('ROOM 204')&&at('ROOM 204')<at('EXTERIOR NORTH'),'headings in order for '+layout);
  const obs=words.filter(w=>/^OBSERVATION \d{3}/.test(w)).map(w=>w.slice(12,15));same(obs,['001','002','003','004','005','006']);
  assert(words.indexOf('Second general')<words.indexOf('First in 204'),'General photos print first');
  assert(!words.includes('Left out'),'photo left out of the report stays out');
  assert(!words.includes('ROOF'),'no heading for a location with only left-out photos');
  assert(words.includes('A2.01')&&!words.some(w=>w.includes('Exterior North   |')),'only sheet/room repeats under a heading');
  assert(words.some(w=>w.includes('Safety photo observations: 006.')),'safety summary uses the new number');
  assert.equal((xml.match(/<w:drawing>/g)||[]).length,6);
 }
 const plainXml=documentXml(Buffer.from(await (await ctx.window.SVReport.buildReport(visit,recs.map(r=>({...r,location:''})))).arrayBuffer()));
 assert(!text(plainXml).includes('GENERAL'),'no headings when nothing has a location');
 // Forty photos, no words, no locations: still exports.
 const forty=Array.from({length:40},(_,i)=>({id:i+1,ts:t0+i*1000,note:'',tag:'',location:'',sheet:'',owner:'',due:'',omit:'',blob:new Blob([String(i)])}));
 const fortyXml=documentXml(Buffer.from(await (await ctx.window.SVReport.buildReport(visit,forty)).arrayBuffer()));
 assert.equal((fortyXml.match(/<w:drawing>/g)||[]).length,40);assert(text(fortyXml).includes('OBSERVATION 040'));
 if(process.argv[2]){fs.mkdirSync(process.argv[2],{recursive:true});for(const layout of ['compact','large'])fs.writeFileSync(path.join(process.argv[2],'location-'+layout+'.docx'),Buffer.from(await (await ctx.window.SVReport.buildReport({...visit,reportLayout:layout},recs)).arrayBuffer()));}
 console.log('PASS: location groups in first-visited order, General first, oldest first within a group, continuous numbering, left-out photos, case-insensitive locations, legacy v16 order kept, v16 area read as location, gallery groups, export filenames with location, Word headings in both layouts, safety summary numbers, 40 photos with no words.');
})().catch(e=>{console.error(e);process.exitCode=1});
