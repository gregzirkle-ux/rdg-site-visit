/* v18: one restore for full backups and project recovery files, with keep or replace for projects
   already on the phone; report photo compression stays inside the email budget. */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8'),cloud=fs.readFileSync(path.join(root,'cloud.js'),'utf8');
const stores=['visits','photos','meta','projects'];let dbdata,choice=null,asked=[];
const context={console,Blob,File,Date,Map,Set,Uint8Array,atob,structuredClone,STORES:stores,NOTE_KEYS:['note','tag','location','sheet','owner','due','itemId','omit'],
 document:{getElementById:()=>({})},navigator:{},confirm:()=>true,alert(){},dataEpoch:0,selectedProject:null,loadState:async()=>{},measure:async()=>({w:1,h:1}),
 askChoice:async(title,text,options)=>{asked.push({title,options:options.map(o=>o.value)});return choice;},
 read:async n=>structuredClone(dbdata[n]),blobData:async b=>'data:'+b.type+';base64,'+Buffer.from(await b.arrayBuffer()).toString('base64')};
context.transaction=async(names,mode,work)=>{const copy=structuredClone(dbdata);let error;const tx={abort(){error=new Error('aborted')},objectStore:n=>({getAll(){const q={result:structuredClone(copy[n])};queueMicrotask(()=>q.onsuccess?.());return q},put(r){const i=copy[n].findIndex(x=>x.id===r.id);if(i<0)copy[n].push(r);else copy[n][i]=r;},delete(id){copy[n]=copy[n].filter(r=>r.id!==id);}})};
 const result=work(tx);await new Promise(setImmediate);await new Promise(setImmediate);if(error)throw error;if(mode==='readwrite')dbdata=copy;return typeof result==='function'?result():result;};
vm.createContext(context);vm.runInContext(cloud,context);vm.runInContext(app.slice(app.indexOf('function validateBackup('),app.indexOf('let dataEpoch=')),context);
const now=Date.now(),jpeg=new Blob(['jpeg-bytes'],{type:'image/jpeg'});
const visit=(id,pid,num,name)=>({id,projectId:pid,num,schema:9,date:now,project:name,projNum:'',attendees:'',preparedBy:'',weather:'',temp:'',closed:true,itemSeq:0,items:[]});
const phone={projects:[{id:1,name:'Alpha',number:'A1',key:'number:a1'}],visits:[visit(1,1,1,'Alpha'),visit(2,1,2,'Alpha')],photos:[{id:1,visitId:1,ts:now,blob:jpeg}],meta:[{id:1,note:'phone'}]};
const backupData={projects:[{id:1,name:'Alpha',number:'A1',key:'number:a1'},{id:2,name:'Bravo',number:'B2',key:'number:b2'}],
 visits:[visit(1,1,1,'Alpha'),visit(2,2,1,'Bravo'),visit(3,2,2,'Bravo')],photos:[{id:1,visitId:1,ts:now,blob:jpeg},{id:2,visitId:2,ts:now,blob:jpeg},{id:3,visitId:3,ts:now,blob:jpeg}],meta:[{id:1,note:'file'},{id:2,note:'b'},{id:3,note:'b'}]};
(async()=>{
 for(const p of backupData.photos){p.data=await context.blobData(p.blob);delete p.blob;}
 const file={text:async()=>JSON.stringify({format:'rdg-sitevisit-backup',version:2,createdAt:new Date().toISOString(),data:backupData})};
 // Empty phone: everything is added after one confirmation.
 dbdata={projects:[],visits:[],photos:[],meta:[]};choice='go';await context.restoreProjectFile(file);
 assert.equal(dbdata.projects.length,2);assert.equal(dbdata.visits.length,3);assert.equal(dbdata.photos.length,3);assert.equal(asked[0].options.join(),'go,');
 assert(dbdata.visits.every(v=>dbdata.projects.some(p=>p.id===v.projectId)),'every visit belongs to a restored project');
 assert(dbdata.photos.every(p=>dbdata.visits.some(v=>v.id===p.visitId)),'every photo belongs to a restored visit');
 // Phone already has Alpha. Keep: only Bravo is added and Alpha stays as it was.
 dbdata=structuredClone(phone);choice='keep';asked=[];await context.restoreProjectFile(file);
 assert.equal(asked[0].options.join(),'keep,replace,');assert.equal(dbdata.projects.length,2);
 const alpha=dbdata.projects.find(p=>p.key==='number:a1');assert.equal(dbdata.visits.filter(v=>v.projectId===alpha.id).length,2,'phone copy of Alpha kept');
 assert(dbdata.meta.some(m=>m.note==='phone'));assert(!dbdata.meta.some(m=>m.note==='file'));
 // Replace: Alpha comes from the file, Bravo added, nothing duplicated.
 dbdata=structuredClone(phone);choice='replace';await context.restoreProjectFile(file);
 const a2=dbdata.projects.find(p=>p.key==='number:a1');assert.equal(dbdata.projects.length,2);assert.equal(dbdata.visits.filter(v=>v.projectId===a2.id).length,1,'file copy of Alpha');
 assert(!dbdata.meta.some(m=>m.note==='phone'));assert.equal(dbdata.visits.length,3);assert.equal(new Set(dbdata.visits.map(v=>v.id)).size,3);
 // Cancel changes nothing; a file that is not a backup is rejected clearly.
 const before=JSON.stringify(dbdata);choice=null;await context.restoreProjectFile(file);assert.equal(JSON.stringify(dbdata),before);
 await assert.rejects(context.restoreProjectFile({text:async()=>'{"hello":1}'}),/not a Site Visit backup/);
 await assert.rejects(context.restoreProjectFile({text:async()=>'not json'}),/not a Site Visit backup/);
 // Report email budget: tiers step down only as far as needed.
 const rc={console,Blob,Uint8Array,Date,Map,Set,Promise,structuredClone,window:{},fetch:async()=>({ok:false})};rc.window.docx=require(path.join(root,'docx.umd.js'));
 rc.window.SVReportDecode=async(b,t)=>({buf:new ArrayBuffer(Math.round(500000*Math.pow(t.px/1800,2))),nw:4032,nh:3024});vm.createContext(rc);
 for(const f of ['photo-order.js','report.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),rc);
 const run=async n=>{await rc.window.SVReport.buildReport({num:1,date:now,items:[],project:'P',projNum:'1'},Array.from({length:n},(_,i)=>({id:i+1,ts:i,note:'',tag:'',location:'',omit:'',blob:new Blob(['x'])})));return rc.window.SVReport.lastStats;};
 assert.equal((await run(12)).px,1800,'small visits keep full report quality');
 const mid=await run(40);assert(mid.px<1800&&mid.photoBytes<=rc.window.SVReport.REPORT_BUDGET,'larger visits are resized to fit');
 const big=await run(70);assert(big.photoBytes<=rc.window.SVReport.REPORT_BUDGET&&big.fitsEmail,'70 photos still fit email');
 console.log('PASS: full backup restore into an empty phone, keep or replace for matching projects, cancel, clear rejection of other files, report photo sizing inside the email budget.');
})().catch(e=>{console.error(e);process.exitCode=1});
