/* v17 assembled-app flow with a simulated camera, database and share sheet. No browser or network. */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),els=new Map(),local=new Map();let errors=[],photoRewrites=0,downloads=[],shares=[];
const t0=Date.UTC(2026,9,20,14);
// A v16 database: one issued visit, one walk in progress with an area, and the v16 sticky area list.
let data={projects:[{id:1,name:'Legacy',number:'L1',key:'number:l1'}],
 visits:[{id:1,schema:9,projectId:1,num:1,date:t0-7*864e5,project:'Legacy',projNum:'L1',attendees:'',preparedBy:'Tester',weather:'',temp:'',closed:true,issuedAt:t0-7*864e5,itemSeq:0,items:[],history:[],revision:0},
  {id:2,schema:9,projectId:1,num:2,date:t0,project:'Legacy',projNum:'L1',attendees:'',preparedBy:'Tester',weather:'Clear',temp:'70 F',closed:false,itemSeq:0,items:[],history:[],revision:0,generalNotes:''}],
 photos:[{id:1,visitId:2,ts:t0,blob:new Blob(['v16 photo'],{type:'image/jpeg'})}],
 meta:[{id:1,note:'',tag:'',area:'Level 2',sheet:'',owner:'',due:'',itemId:'',omit:''}]};
local.set('areas:1',JSON.stringify({area:'Level 2',recent:['Level 2','Roof']}));local.set('userProfile',JSON.stringify({name:'Tester'}));
function el(key=''){if(els.has(key)&&key)return els.get(key);const classes=new Set(),handlers={};const e={key,value:'',hidden:false,disabled:false,style:{},children:[],querySelector(s){return this.children.find(c=>'.'+c.className===s)||null},textContent:'',srcObject:null,videoWidth:640,videoHeight:480,readyState:4,paused:false,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},addEventListener:(n,f)=>handlers[n]=f,replaceChildren(){this.children=[]},append(...xs){this.children.push(...xs)},appendChild(x){this.children.push(x)},add(x){this.children.push(x)},setAttribute(){},focus(){},blur(){},remove(){},play:async()=>{},getContext:()=>({drawImage(){}}),toBlob(fn,type){fn(new Blob(['photo'],{type}))},click(){(this.onclick||handlers.click)?.({target:this,preventDefault(){},stopPropagation(){}})}};if(key)els.set(key,e);return e;}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/\bid="([^"]+)"/g))el('#'+m[1]);const sheetIds=[...html.matchAll(/<section class="sheet[^\"]*" id="([^"]+)"/g)].map(m=>'#'+m[1]);
function query(s){if(s==='.sheet.open')return sheetIds.map(el).find(e=>e.classList.contains('open'))||null;return el(s)}
const track={readyState:'live',stop(){},getCapabilities:()=>({}),applyConstraints:async()=>{}};
const nav={mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track],getVideoTracks:()=>[track]})}};
const loc={href:'',reload(){}};
const ctx={console,Blob,File,URL,Uint8Array,Uint32Array,TextEncoder,Date,Map,Set,Promise,structuredClone,atob,Option:class{constructor(text,value){this.text=text;this.value=value}},document:{querySelector:query,querySelectorAll:s=>s==='.sheet,.areasheet,.scrim'?sheetIds.map(el):[],createElement:()=>el(),createElementNS:()=>el(),addEventListener(){},body:el()},navigator:nav,localStorage:{getItem:k=>local.get(k),setItem:(k,v)=>local.set(k,v)},window:{},setInterval(){},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:f=>f(),confirm:()=>true,alert:m=>errors.push(m),location:loc,FileReader:class{readAsDataURL(b){b.arrayBuffer().then(a=>{this.result='data:'+b.type+';base64,'+Buffer.from(a).toString('base64');this.onload()})}}};
ctx.fakeTransaction=async(names,mode,work)=>{const copy=structuredClone(data),pending=[];let aborted=false;const req=result=>{const q={result};pending.push(q);return q};const tx={abort:()=>aborted=true,objectStore:n=>{const write=r=>{const next=structuredClone(r);if(!next.id)next.id=Math.max(0,...copy[n].map(x=>x.id))+1;const idx=copy[n].findIndex(x=>x.id===next.id);if(idx<0)copy[n].push(next);else{if(n==='photos')photoRewrites++;copy[n][idx]=next;}return req(next.id)};return {getAll:()=>req(structuredClone(copy[n])),get:id=>req(structuredClone(copy[n].find(r=>r.id===id))),put:write,add:write,delete:id=>copy[n]=copy[n].filter(r=>r.id!==id),clear:()=>copy[n]=[],index:k=>({getAll:id=>req(structuredClone(copy[n].filter(r=>r[k]===id))),count:id=>req(copy[n].filter(r=>r[k]===id).length)})}}};const result=work(tx);while(pending.length)pending.shift().onsuccess?.();if(aborted)throw new Error('Transaction aborted');if(mode==='readwrite')data=copy;return typeof result==='function'?result():result};
ctx.window.docx=require(path.join(root,'docx.umd.js'));vm.createContext(ctx);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
ctx.window.SVReportDecode=async()=>({buf:png.buffer.slice(png.byteOffset,png.byteOffset+png.length),nw:4032,nh:3024});ctx.fetch=async()=>({ok:false});
for(const file of ['photo-order.js','report.js','archive.js','cloud.js','workflow.js','app.js']){let src=fs.readFileSync(path.join(root,file),'utf8');if(file==='app.js')src=src.slice(0,src.indexOf('// One editor tab'));vm.runInContext(src,ctx);}
vm.runInContext('transaction=fakeTransaction;download=(b,n)=>__downloads.push(n);',Object.assign(ctx,{__downloads:downloads}));
const watchdog=setTimeout(()=>{console.error('FAIL: v17 flow stalled');process.exit(1)},20000);
const run=s=>vm.runInContext('(async()=>{'+s+'})()',ctx),settle=()=>new Promise(r=>setTimeout(r,30));
const click=async id=>{await el(id).click();await settle();await run('await actionQueue;');if(errors.length)throw new Error(errors.join('\n'));};
const meta=id=>data.meta.find(m=>m.id===id),v2=()=>data.visits.find(v=>v.id===2),proj=()=>data.projects[0];
const shoot=async()=>{await run('shoot();await captureTask;');assert(el('#det').classList.contains('open'),'comment screen opens after each photo');await click('#captureSkip');};
const pickRow=async label=>{const row=el('#locationList').children.find(r=>r.children[0].textContent===label);assert(row,'picker row '+label);await row.children[0].click();await settle();await run('await actionQueue;');};
(async()=>{
 const photosBefore=JSON.stringify(data.photos.map(p=>({...p,blob:undefined})));
 await run('await migrate();await loadState();');
 // 1f migration: area becomes location, saved list and current location carried, issued visit keeps old order.
 assert.equal(meta(1).location,'Level 2');assert.equal(proj().locations.join('|'),'Level 2|Roof');
 assert.equal(v2().currentLocation,'Level 2');assert.equal(v2().reportOrder,'location');assert.equal(data.visits[0].reportOrder,'time');
 assert.equal(JSON.stringify(data.photos.map(p=>({...p,blob:undefined}))),photosBefore,'migration leaves photo records alone');
 // 1a-d sticky location.
 await click('#resumeBtn');await click('#setupContinue');assert.equal(el('#locationBtn').textContent,'Level 2');
 await shoot();assert.equal(meta(2).location,'Level 2');
 await click('#locationBtn');assert(el('#locationSheet').classList.contains('open'));assert.equal(el('#locationList').children[0].children[0].textContent,'General (no location)');
 el('#locationInput').value='Room 204';await click('#locationAdd');assert(!el('#locationSheet').classList.contains('open'),'selecting returns to the camera');
 assert.equal(v2().currentLocation,'Room 204');assert.equal(el('#locationBtn').textContent,'Room 204');assert.equal(proj().locations[0],'Room 204','most recently used first');
 await shoot();await shoot();assert.equal(meta(3).location,'Room 204');assert.equal(meta(4).location,'Room 204','location stays set for every new photo');
 // 2: change one photo from its comment screen; the sticky location does not change.
 await run('shoot();await captureTask;');await click('#detLocation');assert.equal(el('#locationTitle').textContent,'Location for this photo');await pickRow('Roof');
 assert.equal(meta(5).location,'Roof');assert.equal(v2().currentLocation,'Room 204');assert.equal(el('#detLocation').textContent,'Roof');await click('#captureSkip');assert.equal(meta(5).location,'Roof','skip keeps the picked location');
 // 1e: remove an entry from the saved list.
 await click('#locationBtn');const roofRow=el('#locationList').children.find(r=>r.children[0].textContent==='Roof');await roofRow.children[1].click();await settle();await run('await actionQueue;');
 assert(!proj().locations.includes('Roof'));assert.equal(meta(5).location,'Roof','removing from the list leaves photos alone');await pickRow('Room 204');
 // 1c: survives pause and resume.
 await click('#pauseBtn');assert(!el('#start').classList.contains('hide'));await click('#resumeBtn');await click('#setupContinue');assert.equal(el('#locationBtn').textContent,'Room 204');
 // 2: change one photo from the gallery.
 await click('#thumb');const heads=el('#grid').children.filter(c=>c.className==='ghead').map(c=>c.textContent);assert.equal(heads.join('|'),'Level 2 · 2|Room 204 · 2|Roof · 1');
 const cell=el('#grid').children.find(c=>c.className==='cellwrap'&&c.children[2].textContent==='Roof');cell.children[2].click();await pickRow('General (no location)');
 assert.equal(meta(5).location,'');assert.equal(v2().currentLocation,'Room 204');assert(el('#grid').children.some(c=>c.className==='ghead'&&c.textContent==='General · 1'),'gallery regrouped');
 await click('#galClose');
 // More photos so Save photos needs two batches on a device that takes 10 at a time.
 for(let i=0;i<7;i++)await shoot();assert.equal(data.photos.length,12);
 await click('#finishBtn');await click('#notesSkip');assert(el('#reviewSheet').classList.contains('open'));
 assert(el('#reviewSavePhotos').children.some(c=>c.textContent==='Save Photos'));
 nav.canShare=({files})=>files.every(f=>f.type.startsWith('image/'))&&files.length<=10;nav.share=async d=>{shares.push(d.files.map(f=>f.name));};
 await click('#reviewSavePhotos');assert.equal(shares.length,1);assert.equal(shares[0].length,10);assert(shares[0][0].includes('_Obs-001_General'),'same order and names as the ZIP');
 assert(el('#reviewSavePhotos').children.some(c=>c.textContent==='Save Next Batch'));assert(el('#savePhotosNote').textContent.includes('10 of 12'));
 await click('#reviewSavePhotos');assert.equal(shares[1].length,2);assert.equal(v2().photosSavedIds.length,12);assert(el('#reviewSavePhotos').children.some(c=>c.textContent==='Photos Saved'));
 assert.equal(new Set(shares.flat()).size,12,'every photo once, full original files');
 // 4d: a new photo after saving brings the reminder back; Save on the reminder sends only the new one, then goes to Start.
 await click('#reviewCamera');await shoot();await run('await openReview();');
 assert(el('#reviewSavePhotos').children.some(c=>c.textContent==='Save 1 New Photo'));
 await click('#reviewBack');assert(el('#saveReminder').classList.contains('open'),'reminder when photos are not saved');
 await click('#reminderSave');assert.equal(shares[2].length,1);assert(!el('#start').classList.contains('hide'),'Save on the reminder then ends the visit');
 // 4c: no file sharing at all falls back to individual downloads.
 await click('#resumeBtn');nav.canShare=()=>false;await run('visit.photosSavedIds=[];preparePhotoSave(await visitPhotos());');downloads.length=0;
 await click('#reviewSavePhotos');assert(el('#savePhotosNote').textContent.includes('Downloading 13 photos'));
 // Android: Word cannot be shared, so it downloads and Open Email starts the message.
 nav.canShare=({files})=>files.every(f=>f.type.startsWith('image/'));downloads.length=0;
 await click('#reviewShare');assert(el('#done').classList.contains('open'));assert.equal(el('#doneEmail').hidden,false);assert(el('#doneShare').children.some(c=>c.textContent==='Download Report'));
 await click('#doneShare');assert.equal(downloads.length,1);assert(downloads[0].endsWith('.docx'));assert(el('#doneNote').textContent.includes('Downloads'));
 await click('#doneEmail');assert(loc.href.startsWith('mailto:?subject='));assert(decodeURIComponent(loc.href).includes('SVR-002 Site Visit Report'));
 // ZIP: Android downloads it; the photo index follows the report order and has a Location column.
 await click('#doneCloud');assert(el('#cloudFiles').children[0].children[2].children[0].children.some(c=>c.textContent==='Download ZIP'));
 // iPhone path still shares Word directly.
 nav.canShare=()=>true;nav.share=async()=>{};await click('#doneClose');await click('#reviewShare');assert.equal(el('#doneEmail').hidden,true);assert(el('#doneShare').children.some(c=>c.textContent==='Share Report'));
 // Issue, then a new visit starts with no location and in location order.
 await click('#doneClose');await click('#reviewIssue');await click('#issueOriginal');assert.equal(v2().reportOrder,'location');await click('#doneStart');
 await click('#startBtn');const v3=data.visits.find(v=>v.num===3);assert.equal(v3.currentLocation,'');assert.equal(v3.reportOrder,'location');await click('#setupContinue');assert.equal(el('#locationBtn').textContent,'Set location');
 assert.equal(proj().locations[0],'Room 204','saved list kept for the project');
 assert.equal(photoRewrites,0,'photo records are written once and never rewritten');assert.equal(errors.length,0);
 clearTimeout(watchdog);console.log('PASS: v16 area and sticky list migrated without touching photos; location chip and picker; add, select, remove; sticky across photos, pause and resume; per-photo change from comment screen and gallery without changing the current location; gallery groups; Save photos in batches of 10 with progress and saved tracking; only new photos after saving; reminder with Save and Skip; download fallback; Android Word download plus Open Email; Android ZIP download; iPhone Word share; new visit starts on Set location; no photo record rewritten.');
})().catch(e=>{clearTimeout(watchdog);console.error(e);process.exitCode=1});
