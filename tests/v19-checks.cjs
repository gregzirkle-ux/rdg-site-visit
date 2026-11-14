/* v19: room sort, search, rename and delete; gallery thumbnails; ZIP backups and restore; photo ZIP and
   larger batches; report size heads-up; no-signal notes; swipe to delete past reports; share and receive
   a project setup or room names. Assembled app with a simulated database, share sheet and clipboard. */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),zlib=require('zlib');
const root=path.resolve(__dirname,'..'),els=new Map(),local=new Map();
let alerts=[],errors=[],shares=[],copied=[],asked=[],choices=[];
const t0=Date.UTC(2026,10,10,14),jpegBytes=n=>Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.from('photo '+n)]);
const jpeg=n=>new Blob([jpegBytes(n)],{type:'image/jpeg'});
const visitRec=(id,num,extra={})=>({id,schema:9,projectId:1,num,date:t0-(10-num)*864e5,project:'Alpha',projNum:'A1',attendees:'',preparedBy:'Tester',weather:'',temp:'',closed:true,issuedAt:t0,itemSeq:0,items:[],history:[],revision:0,reportOrder:'location',...extra});
// One issued visit and one walk in progress, two photos in Lobby, an item in Lobby, and 67 more photos.
let data={projects:[{id:1,name:'Alpha',number:'A1',key:'number:a1',locations:['Room 9','Lobby','Room 101','Attic']}],
 visits:[visitRec(1,1),visitRec(2,2,{closed:false,issuedAt:undefined,currentLocation:'Lobby',generalNotes:'',itemSeq:1,
  items:[{id:'item:2:1',ref:'002.01',originVisitId:2,firstVisitNum:2,firstNoted:t0,note:'Base missing',owner:'',due:'',area:'Lobby',status:'New',update:'',photoId:null,followupPhotoIds:[]}]})],
 photos:[],meta:[]};
for(let i=1;i<=69;i++){data.photos.push({id:i,visitId:2,ts:t0+i*1000,blob:jpeg(i)});data.meta.push({id:i,note:i<3?'Lobby photo':'',tag:'',location:i<3?'Lobby':'Room 9',sheet:'',owner:'',due:'',itemId:'',omit:'',excluded:''});}
local.set('userProfile',JSON.stringify({name:'Tester'}));
function el(key=''){if(els.has(key)&&key)return els.get(key);const classes=new Set(),handlers={};const e={key,value:'',hidden:false,disabled:false,style:{},children:[],querySelector(s){return this.children.find(c=>'.'+c.className===s)||null},textContent:'',srcObject:null,videoWidth:640,videoHeight:480,readyState:4,paused:false,scrollTop:0,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},addEventListener:(n,f)=>handlers[n]=f,replaceChildren(){this.children=[]},append(...xs){this.children.push(...xs)},appendChild(x){this.children.push(x)},add(x){this.children.push(x)},setAttribute(){},focus(){},blur(){},remove(){},play:async()=>{},getContext:()=>({drawImage(){}}),toBlob(fn,type){fn(new Blob(['photo'],{type}))},click(){(this.onclick||handlers.click)?.({target:this,preventDefault(){},stopPropagation(){}})}};if(key)els.set(key,e);return e;}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/\bid="([^"]+)"/g))el('#'+m[1]);const sheetIds=[...html.matchAll(/<section class="sheet[^\"]*" id="([^"]+)"/g)].map(m=>'#'+m[1]);
function query(s){if(s==='.sheet.open')return sheetIds.map(el).find(e=>e.classList.contains('open'))||null;return el(s)}
const track={readyState:'live',stop(){},getCapabilities:()=>({}),applyConstraints:async()=>{}};
const nav={userAgent:'Android Chrome',onLine:true,mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track],getVideoTracks:()=>[track]})},
 canShare:()=>true,share:o=>{shares.push(o);return Promise.resolve();},clipboard:{writeText:async t=>{copied.push(t);},readText:async()=>copied.at(-1)||''}};
const loc={href:'https://site.example/app/',hash:'',pathname:'/app/',search:'',reload(){}};
const ctx={console,Blob,File,URL,Uint8Array,Uint32Array,TextEncoder,TextDecoder,Response,DecompressionStream,Date,Map,Set,Promise,structuredClone,atob,btoa,Option:class{constructor(text,value){this.text=text;this.value=value}},
 document:{querySelector:query,querySelectorAll:s=>s==='.sheet,.areasheet,.scrim'?sheetIds.map(el):[],createElement:()=>el(),createElementNS:()=>el(),addEventListener(){},body:el()},
 navigator:nav,localStorage:{getItem:k=>local.get(k),setItem:(k,v)=>local.set(k,v)},window:{},history:{replaceState(a,b,u){loc.hash='';loc.replaced=u;}},
 setInterval(){},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:f=>f(),confirm:()=>true,alert:m=>alerts.push(m),location:loc,
 FileReader:class{readAsDataURL(b){b.arrayBuffer().then(a=>{this.result='data:'+b.type+';base64,'+Buffer.from(a).toString('base64');this.onload()})}}};
ctx.fakeTransaction=async(names,mode,work)=>{const copy=structuredClone(data),pending=[];let aborted=false;const req=result=>{const q={result};pending.push(q);return q};const tx={abort:()=>aborted=true,objectStore:n=>{const write=r=>{const next=structuredClone(r);if(!next.id)next.id=Math.max(0,...copy[n].map(x=>x.id))+1;const idx=copy[n].findIndex(x=>x.id===next.id);if(idx<0)copy[n].push(next);else copy[n][idx]=next;return req(next.id)};return {getAll:()=>req(structuredClone(copy[n])),get:id=>req(structuredClone(copy[n].find(r=>r.id===id))),put:write,add:write,delete:id=>copy[n]=copy[n].filter(r=>r.id!==id),clear:()=>copy[n]=[],count:()=>req(copy[n].length),index:k=>({getAll:id=>req(structuredClone(copy[n].filter(r=>r[k]===id))),count:id=>req(copy[n].filter(r=>r[k]===id).length)})}}};const result=work(tx);while(pending.length)pending.shift().onsuccess?.();if(aborted)throw new Error('Transaction aborted');if(mode==='readwrite')data=copy;return typeof result==='function'?result():result};
ctx.window.docx=require(path.join(root,'docx.umd.js'));vm.createContext(ctx);
for(const file of ['photo-order.js','report.js','archive.js','cloud.js','workflow.js','app.js']){let src=fs.readFileSync(path.join(root,file),'utf8');if(file==='app.js')src=src.slice(0,src.indexOf('// One editor tab'));vm.runInContext(src,ctx);}
Object.assign(ctx,{__errors:errors,__asked:asked,__choices:choices,__downloads:[]});
vm.runInContext('transaction=fakeTransaction;download=(b,n)=>__downloads.push(n);showError=e=>__errors.push(e&&e.message||String(e));askChoice=async(title,text,options)=>{__asked.push({title,text,options:options.map(o=>o.value)});return __choices.shift()??null;};',ctx);
const watchdog=setTimeout(()=>{console.error('FAIL: v19 checks stalled');process.exit(1)},30000);
const run=s=>vm.runInContext('(async()=>{'+s+'})()',ctx),settle=()=>new Promise(r=>setTimeout(r,20));
const click=async id=>{await (typeof id==='string'?el(id):id).click();await settle();await run('await actionQueue;');if(errors.length)throw new Error(errors.join('\n'));};
const same=(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m);
const wheel=()=>el('#locationWheel').children.map(b=>b.textContent);
const spinTo=label=>{const i=wheel().indexOf(label);assert(i>=0,'wheel row '+label);el('#locationWheel').scrollTop=i*44;};
const meta=id=>data.meta.find(m=>m.id===id),v2=()=>data.visits.find(v=>v.id===2),proj=id=>data.projects.find(p=>p.id===(id||1));
(async()=>{
 // ---------- pure helpers ----------
 same(ctx.sortLocations(['Lobby','Room 101','Room 9','attic'],'alpha'),['attic','Lobby','Room 9','Room 101'],'A to Z, numbers in natural order');
 same(ctx.sortLocations(['b','a','c'],'recent'),['b','a','c'],'recent keeps saved order');
 same(ctx.sortLocations(['Lobby','Room 101','Room 9']),['Room 9','Room 101','Lobby'],'default is still by number');
 same(ctx.filterLocations(['Room 204','Mech Room 2','Lobby','2nd Floor Room'],'room 2'),['Room 204','Mech Room 2','2nd Floor Room'],'every word matches, any order, any case');
 same(ctx.filterLocations(['A','B'],'  '),['A','B']);
 same(ctx.renameInList(['A','Room 204','B'],'room 204','Room 205'),['A','Room 205','B'],'rename keeps position');
 same(ctx.renameInList(['A','B'],'A','b'),['b'],'renaming onto an existing name merges');

 // ---------- ZIP writer and reader ----------
 const bigBuf=Buffer.alloc(9*1048576+3,7),big=new Blob([bigBuf]),steps=[];
 const zip=await ctx.makeVisitZip([{path:'a/',blob:new Blob()},{path:'a/big.bin',blob:big},{path:'a/note.txt',blob:new Blob(['héllo'])}],'t.zip',(i,n)=>steps.push(i+'/'+n));
 same(steps,['1/3','2/3','3/3'],'progress per entry');
 assert.equal(await ctx.zipCrc(big),zlib.crc32(bigBuf),'chunked CRC matches');
 const read=await ctx.readZip(zip);assert.equal(await (await read.open('a/note.txt')).text(),'héllo');assert.equal((await read.open('a/big.bin')).size,big.size);assert.equal(await read.open('missing'),null);
 const zbuf=Buffer.from(await zip.arrayBuffer()),cd=zbuf.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
 assert.equal(zbuf.readUInt32LE(cd+16),zlib.crc32(Buffer.alloc(0)),'directory entry CRC');
 await assert.rejects(ctx.readZip(new Blob(['not a zip at all'])),/not a ZIP/);
 // A ZIP recompressed by another program (deflate) still opens.
 const body=zlib.deflateRawSync(Buffer.from('{"x":1}')),name=Buffer.from('backup.json'),lh=Buffer.alloc(30),ch=Buffer.alloc(46),eo=Buffer.alloc(22);
 lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(8,8);lh.writeUInt32LE(body.length,18);lh.writeUInt32LE(7,22);lh.writeUInt16LE(name.length,26);
 ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(8,10);ch.writeUInt32LE(body.length,20);ch.writeUInt32LE(7,24);ch.writeUInt16LE(name.length,28);
 eo.writeUInt32LE(0x06054b50,0);eo.writeUInt16LE(1,8);eo.writeUInt16LE(1,10);eo.writeUInt32LE(46+name.length,12);eo.writeUInt32LE(30+name.length+body.length,16);
 const deflated=await ctx.readZip(new Blob([lh,name,body,ch,name,eo]));assert.equal(await (await deflated.open('backup.json')).text(),'{"x":1}');

 // ---------- ZIP backup and restore ----------
 const saved=structuredClone(data);
 data.photos.push({id:70,visitId:1,ts:t0-5,archived:true});data.meta.push({id:70,note:'archived'});
 const backup=await run('return makeBackupFile();');assert(backup.file.name.endsWith('.zip'));assert.equal(backup.counts.photos,69);
 const inside=await ctx.readZip(backup.file);assert(inside.entries.has('backup.json')&&inside.entries.has('photos/1.jpg'));
 const json=await (await inside.open('backup.json')).text();assert(!json.includes('base64'),'photos are files in the ZIP, not text');assert.equal(JSON.parse(json).version,3);
 data={projects:[],visits:[],photos:[],meta:[]};Object.assign(ctx,{__file:backup.file});await run('await restoreProjectFile(__file);');
 assert.equal(data.projects.length,1);assert.equal(data.visits.length,2);assert.equal(data.photos.length,70);
 assert.equal(Buffer.from(await data.photos.find(p=>p.ts===t0+5000).blob.arrayBuffer()).toString(),jpegBytes(5).toString(),'photo bytes restored exactly');
 assert(data.photos.some(p=>p.archived===true&&!p.blob),'archived photo stays archived');same(data.projects[0].locations,['Room 9','Lobby','Room 101','Attic'],'saved rooms restored');
 // A whole visit package ZIP restores from its Recovery file.
 data=structuredClone(saved);
 const recovery=await run('return projectRecoveryZip(await dataSnapshot(1),"stamp");');assert(recovery.name.endsWith('.zip'));
 const pkg=await ctx.makeVisitZip(ctx.visitArchiveEntries('SVR-002',new File(['w'],'r.docx'),[],new File(['i'],'i.csv'),recovery),'A1_SVR-002.zip');
 Object.assign(ctx,{__file:pkg});data.meta.find(m=>m.id===3).note='changed on phone';await run('await restoreProjectFile(__file);');
 assert.equal(data.projects.length,1);assert.equal(data.visits.length,2,'no duplicate visits');assert.equal(data.meta.find(m=>m.note==='changed on phone'),undefined,'file copy replaced the phone copy');
 // A damaged ZIP with a missing photo changes nothing.
 const broken=await ctx.makeVisitZip([{path:'backup.json',blob:await inside.open('backup.json')}],'broken.zip');const before=JSON.stringify(data);
 Object.assign(ctx,{__file:broken});await assert.rejects(run('await restoreProjectFile(__file);'),/missing/);assert.equal(JSON.stringify(data),before);
 data=structuredClone(saved);asked.length=0;

 // ---------- room sheet: sort, search, rename, delete ----------
 await run('await loadState();');await click('#resumeBtn');await click('#setupContinue');assert.equal(el('#locationBtn').textContent,'Lobby');
 await click('#locationBtn');same(wheel(),['General (no location)','Room 9','Room 101','Attic','Lobby'],'opens sorted by number');assert(el('#locSortNumber').classList.contains('on'));
 await click('#locSortAlpha');same(wheel(),['General (no location)','Attic','Lobby','Room 9','Room 101']);assert.equal(local.get('locationSort'),'"alpha"');
 await click('#locSortRecent');same(wheel(),['General (no location)','Room 9','Lobby','Room 101','Attic'],'most recently added or used first');
 el('#locationInput').value='room';await run('drawLocations();');same(wheel(),['Room 9','Room 101'],'search filters the wheel');assert.equal(el('#locationEmpty').hidden,true);
 el('#locationInput').value='zz';await run('drawLocations();');same(wheel(),[]);assert.equal(el('#locationEmpty').hidden,false);assert(el('#locationUse').disabled);
 el('#locationInput').value='101';await run('drawLocations();');await click('#locationDone');assert.equal(v2().currentLocation,'Room 101','Done with a search uses the match, not a new name');
 assert.equal(proj().locations.filter(x=>x==='101').length,0);
 await click('#locationBtn');spinTo('Lobby');await click('#locationRename');assert.equal(el('#locationInput').value,'Lobby');assert.equal(el('#locationAdd').textContent,'Save');
 el('#locationInput').value='Main Lobby';await click('#locationAdd');
 assert(proj().locations.includes('Main Lobby')&&!proj().locations.includes('Lobby'),'saved list renamed');
 assert.equal(meta(1).location,'Main Lobby');assert.equal(meta(2).location,'Main Lobby','photos in this visit follow the rename');assert.equal(meta(3).location,'Room 9','other photos untouched');
 assert.equal(v2().items[0].area,'Main Lobby','items follow the rename');assert(el('#locationHelp').textContent.includes('2 photos'));
 assert.equal(data.photos.length,69,'no photo record rewritten or removed');
 spinTo('Attic');await click('#locationRemove');assert(!proj().locations.includes('Attic'),'delete from saved list');
 await click('#locationDone');

 // ---------- report size heads-up at 70 photos ----------
 await run('shoot();await captureTask;');assert(el('#captureHint').textContent.includes('70 photos'),'heads-up on the 70th photo');assert(el('#captureHint').classList.contains('warnline'));
 await click('#captureSkip');await run('shoot();await captureTask;');assert(!el('#captureHint').textContent.includes('photos.'),'only once per visit');await click('#captureSkip');

 // ---------- gallery keeps the grid shape and scroll position ----------
 await click('#thumb');const cells=el('#grid').children.filter(c=>c.className==='cellwrap'||c.className==='cellwrap out');assert.equal(cells.length,71);assert.equal(cells[0].children.length,3);
 el('#gal').scrollTop=640;await cells[5].children[1].click();await run('await actionQueue;');assert.equal(el('#gal').scrollTop,640,'leaving a photo out keeps your place');await click('#galClose');

 // ---------- review: bigger batches, all photos in one ZIP, size line ----------
 await click('#finishBtn');await click('#notesSkip');assert(el('#reviewSheet').classList.contains('open'));
 assert(el('#reviewShare').children.some(c=>String(c.textContent).includes('may be too large to email')),'review warns before building');
 assert.equal(await run('return nextPhotoBatch().length;'),50,'tries 50 photos per share');
 await click('#reviewPhotoZip');assert.equal(el('#photoZipReady').hidden,false);assert(el('#photoZipName').textContent.includes('_Photos.zip'));
 const photoZip=await run('return photoZip.file;'),pz=await ctx.readZip(photoZip);assert.equal([...pz.entries.keys()].filter(n=>n.endsWith('.jpg')).length,71);
 shares.length=0;el('#photoZipSave').onclick();assert.equal(shares.length,1,'share opens straight from the tap');await settle();await run('await actionQueue;');
 assert.equal(v2().photosSavedIds.length,71,'every photo counts as saved');

 // ---------- no signal ----------
 nav.onLine=false;await run('paintOnline();');assert.equal(el('#offlineStart').hidden,false);assert.equal(el('#offlineCam').hidden,false);assert.equal(el('#offlineDet').hidden,false);
 nav.onLine=true;await run('paintOnline();');assert.equal(el('#offlineStart').hidden,true);

 // ---------- past reports: tap opens, swipe Delete asks twice ----------
 await click('#reviewHome');await click('#existingBtn');assert.equal(el('#pastHint').hidden,false);
 const rows=()=>el('#pastList').children;assert.equal(rows().length,2);assert.equal(rows()[0].className,'swiperow');
 await click(rows()[1]);assert(el('#reviewSheet').classList.contains('open'),'tapping a row opens the report');await click('#reviewHome');await click('#existingBtn');
 // Visit 1 carries no items forward, so it can go. First answer Back up first, then Delete.
 choices.push('backup');await click(rows()[1].children[0]);assert(el('#backupSheet').classList.contains('open'));assert.equal(data.visits.length,2,'backup first deletes nothing');
 assert(asked.at(-1).text.includes('cannot be undone'));same(asked.at(-1).options,['backup','delete',null]);await click('#backupClose');
 choices.push(null);await click(rows()[1].children[0]);assert.equal(data.visits.length,2,'cancel deletes nothing');
 choices.push('delete');await click(rows()[1].children[0]);assert.equal(data.visits.length,1);assert.equal(data.visits[0].id,2);
 // A report whose items are carried into a later one cannot be deleted.
 data.visits.push({...structuredClone(v2()),id:3,num:3,closed:false,photosSavedIds:[]});data.visits[0].closed=true;data.visits[0].issuedAt=t0;await run('await loadState();');
 await click(rows()[1].children[0]);assert.equal(asked.at(-1).title,'Cannot delete SVR-002');assert.equal(data.visits.length,2);
 await assert.rejects(run('await deleteVisit(2);'),/carries items/);
 await run('await deleteVisit(3);');await run('await deleteVisit(2);');assert.equal(data.visits.length,0);assert.equal(data.photos.length,0);assert.equal(data.meta.length,0,'photos and comments go with the report');
 await click('#existingBack');

 // ---------- share a project setup or room names ----------
 await run('await loadState();');await click('#editProject');assert.equal(el('#projectShareBox').hidden,false);assert.equal(el('#shareRooms').disabled,false);
 Object.assign(data.projects[0],{address:'1 Main St',client:'Owner Co',contact:'',phone:'555',email:'o@example.com'});await run('await loadState();');
 shares.length=0;el('#shareProject').onclick();assert.equal(shares.length,1,'share opens straight from the tap');
 const projectMsg=shares[0].text;assert(projectMsg.startsWith('RDG Site Visit: Project setup for Alpha (3 rooms)'));assert(projectMsg.includes('https://site.example/app/#share='));
 el('#shareRooms').onclick();const roomsMsg=shares[1].text;const roomsShare=ctx.parseShare(roomsMsg);assert.equal(roomsShare.kind,'rooms');assert.equal(roomsShare.project.address,undefined,'room share carries no project details');
 const projShare=ctx.parseShare(projectMsg);assert.equal(projShare.project.address,'1 Main St');same(projShare.rooms,['Room 101','Room 9','Main Lobby']);
 assert.equal(ctx.parseShare(projectMsg.match(/share=[\w-]+/)[0].slice(6)).project.name,'Alpha','a bare code works');
 assert.throws(()=>ctx.parseShare('hello there'),/No shared project/);assert.throws(()=>ctx.parseShare('share=abcdefgh'),/incomplete|not a Site Visit/);
 const unicode=ctx.parseShare(ctx.shareMessage(ctx.sharePayload({name:'Café Tower',number:'',locations:['Salle 1','Café','café']},'rooms')));same(unicode.rooms,['Salle 1','Café'],'unicode, duplicates dropped');
 // Sharing falls back to the clipboard where the share menu is missing.
 const realShare=nav.share;delete nav.share;copied.length=0;el('#shareRooms').onclick();await settle();assert.equal(copied.length,1);assert(el('#shareNote').textContent.startsWith('Copied'));nav.share=realShare;
 await click('#projectClose');

 // ---------- receive: new project, merge into an existing one, rooms into a picked project ----------
 const bravo=ctx.shareMessage(ctx.sharePayload({name:'Bravo Clinic',number:'B2',address:'9 Oak',client:'Clinic',locations:['Exam 1','Exam 2','Lobby']},'project'));
 await click('#receiveBtn');assert(el('#receiveSheet').classList.contains('open'));copied.push(bravo);await el('#receivePaste').onclick();await settle();assert.equal(el('#receiveInput').value,bravo);
 choices.push('go');alerts.length=0;await click('#receiveAdd');const b=data.projects.find(p=>p.key==='number:b2');
 assert(b&&b.address==='9 Oak');same(b.locations,['Exam 1','Exam 2','Lobby']);assert.equal(alerts[0],'Added Bravo Clinic with 3 rooms.');assert.equal(el('#selectedProjectName').textContent,'Bravo Clinic');
 const bravoMore=ctx.shareMessage(ctx.sharePayload({name:'Bravo Clinic',number:'B2',contact:'Pat',address:'other',locations:['Exam 2','Exam 3']},'project'));
 data.projects.find(p=>p.key==='number:b2').contact='';await run('await loadState();');
 await click('#receiveBtn');el('#receiveInput').value=bravoMore;choices.push('go');alerts.length=0;await click('#receiveAdd');const b2=data.projects.find(p=>p.key==='number:b2');
 same(b2.locations,['Exam 1','Exam 2','Lobby','Exam 3']);assert.equal(b2.address,'9 Oak','existing details are not overwritten');assert.equal(b2.contact,'Pat','empty fields are filled');
 assert.equal(alerts[0],'Added 1 room to Bravo Clinic. 1 were already there.');assert.equal(data.projects.length,2,'no duplicate project');
 await click('#receiveBtn');el('#receiveInput').value=roomsMsg;choices.push('p'+b2.id);alerts.length=0;await click('#receiveAdd');
 assert(asked.at(-1).options.includes('p1')&&asked.at(-1).options.includes('p'+b2.id));assert(data.projects.find(p=>p.id===b2.id).locations.includes('Main Lobby'),'rooms went into the picked project');
 await click('#receiveBtn');el('#receiveInput').value='nothing useful';await el('#receiveAdd').click();await settle();await run('await actionQueue;');assert(errors.pop().includes('No shared project'));

 // ---------- opening a share link ----------
 const charlie=ctx.shareMessage(ctx.sharePayload({name:'Charlie Lab',number:'C3',locations:['Lab 1']},'project'));
 loc.hash='#'+charlie.match(/share=[\w-]+/)[0];choices.push('go');alerts.length=0;await run('await openShareLink();');
 assert(data.projects.some(p=>p.key==='number:c3'),'link adds the project on Android');assert.equal(loc.hash,'','link is cleared after use');assert.equal(loc.replaced,'/app/');
 // iPhone Safari: offer to copy the link for the home screen app instead.
 nav.userAgent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';const delta=ctx.shareMessage(ctx.sharePayload({name:'Delta',number:'D4',locations:['Hall']},'project'));
 loc.hash='#'+delta.match(/share=[\w-]+/)[0];copied.length=0;choices.push('copy');await run('await openShareLink();');
 same(asked.at(-1).options,['copy','here',null]);assert(copied[0].startsWith('https://site.example/app/#share='));assert(!data.projects.some(p=>p.key==='number:d4'),'nothing added in Safari');
 nav.standalone=true;loc.hash='#'+delta.match(/share=[\w-]+/)[0];choices.push('go');await run('await openShareLink();');assert(data.projects.some(p=>p.key==='number:d4'),'home screen app adds it directly');

 assert.equal(errors.length,0,errors.join('\n'));clearTimeout(watchdog);
 console.log('PASS: room sort (number, A to Z, recent), search, Done uses the match, rename moves this visit\'s photos and items, delete from list; chunked ZIP CRC, reader, deflated ZIP; ZIP backup with photos as files, restore, archived photos, visit package restore, missing photo rejected; size heads-up once at 70; gallery shape and scroll kept; 50 photo batches; all photos in one ZIP marks them saved; no-signal notes; past reports open on tap, swipe Delete offers backup first then deletes, dependent reports protected; share project or rooms by link with clipboard fallback; receive new, merge, pick project; share links on Android, iPhone Safari and home screen app.');
})().catch(e=>{console.error(e);process.exitCode=1;process.exit(1);});
