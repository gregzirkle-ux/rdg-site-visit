'use strict';
/* Workflow state is saved on each visit; issued versions never read later metadata. */
let captureComment=false,galleryFromReview=false,projectEditing=false,profileFirstUse=false,notesFromFinish=false,notesFromSetup=false;
const FLOW_ICONS={
 camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="3"/>',
 arrow:'<path d="M4 12h16M14 6l6 6-6 6"/>',check:'<circle cx="12" cy="12" r="9"/><path d="M7 12l3 3 7-7"/>',
 edit:'<path d="M14 4l6 6M4 20l2-7L17 2l5 5-11 11z"/>',notes:'<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',folder:'<path d="M3 5h7l2 3h9v12H3z"/>',
 photos:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 8"/>',
 share:'<path d="M12 16V3M7 8l5-5 5 5M4 13v8h16v-8"/>',mail:'<path d="M3 5h18v14H3z"/><path d="M3 6l9 7 9-7"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/>',
 backup:'<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z"/><path d="M12 15V9M9.5 11.5L12 9l2.5 2.5"/>',
 restore:'<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z"/><path d="M12 9v6M9.5 12.5L12 15l2.5-2.5"/>',
 storage:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8"/><circle cx="12" cy="16" r="1.2"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v3h3M4 13a8 8 0 0 0 14.6 4.5M20 20v-3h-3"/>',
 history:'<path d="M3 3v6h6M3.5 13a9 9 0 1 0 1.8-6.6L3 9M12 7v5l3 2"/>',home:'<path d="M3 11l9-8 9 8M6 9v12h12V9"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 layout:'<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M10 10v10"/>',items:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',
 flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',download:'<path d="M12 3v13M7 11l5 5 5-5M4 21h16"/>'};
function setCard(selector,label,icon='notes',sub=''){
 const el=typeof selector==='string'?$(selector):selector;
 el.replaceChildren();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [k,v] of Object.entries({width:'24',height:'24',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);
 svg.innerHTML=FLOW_ICONS[icon]||FLOW_ICONS.notes;
 const title=document.createElement('span');title.textContent=label;el.append(svg,title);
 if(sub){const text=document.createElement('span');text.className='sub';text.textContent=sub;el.append(text);}
}
function visitLabel(v){return 'SVR-'+String(v.num).padStart(3,'0')+(v.revision?'-R'+v.revision:'');}
function userProfile(){const p={name:'',phone:'',email:'',...stored('userProfile',{})};return {...p,company:p.company||'Redline Design Group',officePhone:p.officePhone||'704-377-2990'};}
async function fillVisitContact(){if(!visit||isReadonly())return;const p=userProfile(),next=clone(visit);let changed=false;for(const [key,source] of [['preparedBy','name'],['preparedCompany','company'],['preparedPhone','phone'],['preparedEmail','email'],['preparedOfficePhone','officePhone']])if(!next[key]&&p[source]){next[key]=p[source];changed=true;}if(changed)await persistVisit(next);}
function openProfile(first=false){profileFirstUse=first;const p=userProfile();for(const key of ['Name','Company','Phone','Email','OfficePhone'])$('#profile'+key).value=p[key==='OfficePhone'?'officePhone':key.toLowerCase()];$('#profileClose').textContent=first?'Later':'Back';$('#profileStatus').textContent='';$('#profileIntro').textContent=first?'Welcome. Enter your details once and they fill in Prepared By on every report. They stay on this phone only.':'These fill in Prepared By on every new report. Each report keeps its own copy, so changes here do not alter past reports.';$('#profileSheet').classList.add('open');}
function openProjectForm(edit){projectEditing=edit;const p=edit?currentProject():null;$('#projectName').value=p?.name||'';$('#projectNumber').value=p?.number||'';$('#projectFormTitle').textContent=edit?'Edit Project Details':'New Project';for(const k of ['Address','Client','Contact','Phone','Email'])$('#project'+k).value=p?.[k.toLowerCase()]||'';$('#projectHelp').textContent=edit?'Changes apply to future visits. Existing visits retain their recorded project information.':'Create a project to keep its visits and open items together.';$('#projectSheet').classList.add('open');}
function showSetup(){stopCamera();$('#setupProject').textContent=visit.project+(visit.projNum?' · '+visit.projNum:'');$('#setupTitle').textContent=visitLabel(visit)+' · '+new Date(visit.date).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
 const open=visit.items.filter(i=>i.status!=='Closed').length;
 setCard('#setupContinue','Start taking photos','camera','Comments are optional after each photo');
 setCard('#setupItems','Open items',open?'flag':'items',open?open+' carried from the last visit · mark them still open or closed':'None carried from the last visit');$('#setupItems').classList.toggle('attn',open>0);
 setCard('#setupInfo','Visit information','info',visit.attendees?'Present: '+visit.attendees:'Who you walked with, distribution, weather');
 setCard('#setupNotes','General notes','edit',visit.generalNotes?'Notes entered':'Overall summary for page one');
 $('#setupSheet').classList.add('open');}
function hideWorkSheets(){for(const id of ['#existingSheet','#setupSheet','#reviewSheet','#gal','#done','#notesSheet','#itemsSheet','#issueSheet','#historySheet','#saveReminder'])$(id).classList.remove('open');}
async function returnCamera(){editable();await captureTask;hideWorkSheets();captureComment=false;galleryFromReview=false;reviewing=false;paintLocation();paintProj();await refreshCount();$('#start').classList.add('hide');fetchWeather(visit.id);await startCam();}
async function openCaptured(id){captureComment=true;await openDet(id);}
async function finishWalk(){await captureTask;editable();stopCamera();const next=clone(visit);next.walkFinishedAt=next.walkFinishedAt||Date.now();await persistVisit(next);await openReview();openNotes(true);}
async function refreshReviewIfOpen(){if($('#reviewSheet').classList.contains('open'))await openReview();}
async function openReview(){
 await captureTask;await fillVisitContact();stopCamera();captureComment=false;galleryFromReview=true;
 for(const id of ['#gal','#setupSheet','#done'])$(id).classList.remove('open');
 const photos=await visitPhotos(),unreviewed=visit.items.filter(i=>i.status==='Not reviewed').length,open=visit.items.filter(i=>i.status!=='Closed').length;
 const inReport=photos.filter(p=>!p.omit).length,comments=photos.filter(p=>!!p.note).length;
 $('#reviewProject').textContent=visit.project+(visit.projNum?' · '+visit.projNum:'');$('#reviewTitle').textContent=visitLabel(visit)+' · '+new Date(visit.date).toLocaleDateString();
 const pill=visit.editing?'Working edits':visit.issuedAt?'Issued':visit.closed?'Complete':'Draft';$('#reviewPill').textContent=pill;$('#reviewPill').className='pill '+pill.toLowerCase().replace(/\s+/g,'');
 $('#reviewStatus').textContent=(visit.editing?'Your edits are saved on this phone. Finalize or discard them when ready.':visit.issuedAt?'Issued '+new Date(visit.issuedAt).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+'. Reopen with Edit visit for corrections or a revision.':visit.closed?'Previously completed report.':'Saved on this phone. Three steps to wrap up.')+(visit.localPhotosRemovedAt?' Some original photos were removed from this phone; restore the recovery file to edit or rebuild the package.':'');
 setCard('#reviewPhotos','Photos and comments','camera',photos.length?inReport+' of '+photos.length+(photos.length===1?' photo':' photos')+' in the report · '+comments+(comments===1?' comment':' comments'):'No photos yet');
 setCard('#reviewInfo','Visit information','info',visit.attendees?'Present: '+visit.attendees:'Add who you walked with, distribution, weather');
 setCard('#reviewItems','Open items',unreviewed?'flag':'items',open?open+' open'+(unreviewed?' · '+unreviewed+' not reviewed yet':''):'None open');$('#reviewItems').classList.toggle('attn',unreviewed>0&&!isReadonly());
 setCard('#reviewNotes','General notes','edit',visit.generalNotes?'Entered · '+visit.generalNotes.slice(0,60)+(visit.generalNotes.length>60?'…':''):'Optional summary for page one');
 setCard('#reviewLayout','Report layout','layout',layoutName(visit.reportLayout));$('#reviewLayout').hidden=isReadonly();
 setCard('#reviewShare',isReadonly()?'Send the report':'Build and send the report','share',isReadonly()?'Email it, send a link, or save the package':'Issue it, then email it or send a link');
 setCard('#reviewCamera','Take more photos','camera');setCard('#reviewEdit','Edit visit','edit','Make corrections or a revision');setCard('#reviewHistory','Report history','history','Every issued copy, exactly as sent');setCard('#reviewHome','Back to Start','home');
 $('#reviewEdit').hidden=!isReadonly();$('#reviewCamera').hidden=isReadonly();
 $('#stepSend').querySelector?.('b')&&($('#stepSend').querySelector('b').textContent=isReadonly()?'Send':'Issue and send');
 $('#reviewHistory').hidden=!(visit.history?.length);
 $('#reviewWord').textContent='';
 preparePhotoSave(photos);$('#savePhotosNote').textContent='';
 $('#reviewSheet').classList.add('open');
}
/* v17 Save photos. Files are prepared when Review & Share opens so the tap can call
   navigator.share directly; iOS and Android both need the share call inside the tap.
   Photo bytes are only read here, never rewritten. Chrome takes at most 10 files and
   about 50 MB per share, so the batch shrinks when the device reports a lower limit. */
let photoSave=null;
const SHARE_BYTES=45*1048576;
function preparePhotoSave(photos){
 const all=photoExportSet(visit,photos.filter(p=>p.blob?.size)).map(e=>({id:e.rec.id,file:new File([e.rec.blob],e.name,{type:e.rec.blob.type||'image/jpeg'})}));
 photoSave={visitId:visit.id,total:all.length,ids:all.map(e=>e.id),all,queue:[],next:0,busy:false};
 queuePhotos();paintPhotoSave();
}
/* Unsaved photos only; when every photo is already saved, all of them again. */
function queuePhotos(){const saved=new Set(visit.photosSavedIds||[]),unsaved=photoSave.all.filter(e=>!saved.has(e.id));photoSave.queue=unsaved.length?unsaved:photoSave.all;photoSave.next=0;}
function unsavedPhotos(){if(!photoSave||photoSave.visitId!==visit?.id)return 0;const saved=new Set(visit.photosSavedIds||[]);return photoSave.ids.filter(id=>!saved.has(id)).length;}
function paintPhotoSave(){
 if(!photoSave)return;const {total,queue,next}=photoSave,left=unsavedPhotos();
 const [label,sub]=!total?['Save Photos','No photos in this visit yet']
  :next>0&&next<queue.length?['Save Next Batch',next+' of '+queue.length+' photos saved']
  :!left?['Photos Saved',total+(total===1?' photo':' photos')+' handed off · tap to save again']
  :left<total?['Save '+left+(left===1?' New Photo':' New Photos'),(total-left)+' of '+total+' already saved']
  :['Save Photos',total+(total===1?' photo':' photos')+' at full quality'];
 for(const id of ['#reviewSavePhotos','#reminderSave'])setCard(id,id==='#reminderSave'&&label==='Photos Saved'?'Save Again':label,'photos',sub);
 $('#reviewSavePhotos').disabled=!total;
 $('#stepPhotos').classList?.toggle('done',!!total&&!left);$('#reviewSavePhotos').classList.toggle('saved',!!total&&!left);
}
function nextPhotoBatch(){
 const rest=photoSave.queue.slice(photoSave.next),max=stored('photoBatchMax',20);
 for(const size of [20,10,5,1].filter(n=>n<=max)){
  const batch=[];let bytes=0;
  for(const e of rest){if(batch.length>=size||(size<=10&&batch.length&&bytes+e.file.size>SHARE_BYTES))break;batch.push(e);bytes+=e.file.size;}
  try{if(navigator.canShare?.({files:batch.map(e=>e.file)}))return batch;}catch{}
 }
 return null;
}
async function markPhotosSaved(ids){const next=clone(visit);next.photosSavedIds=[...new Set([...(next.photosSavedIds||[]),...ids])];next.photosSavedAt=Date.now();await putV(next);if(visit?.id===next.id)visit=next;}
function downloadFiles(files){files.forEach((f,i)=>setTimeout(()=>download(f,f.name),i*700));}
/* Called straight from a tap. onDone runs once every photo in the queue has been handed off. */
function savePhotosTap(note,onDone){
 if(!photoSave||photoSave.visitId!==visit?.id||photoSave.busy)return;
 if(!photoSave.total){note.textContent='No photos to save yet.';return;}
 if(photoSave.next>=photoSave.queue.length)queuePhotos();
 const batch=nextPhotoBatch();
 if(!batch){
  const rest=photoSave.queue.slice(photoSave.next);downloadFiles(rest.map(e=>e.file));photoSave.next=photoSave.queue.length;
  note.textContent='Downloading '+rest.length+' photos one at a time. If the browser asks, allow multiple downloads. They go to your Downloads folder.';
  markPhotosSaved(rest.map(e=>e.id)).then(()=>{paintPhotoSave();onDone?.();}).catch(showError);return;
 }
 photoSave.busy=true;$('#reviewSavePhotos').disabled=true;$('#reminderSave').disabled=true;
 const finish=()=>{photoSave.busy=false;$('#reviewSavePhotos').disabled=false;$('#reminderSave').disabled=false;paintPhotoSave();};
 try{
  navigator.share({files:batch.map(e=>e.file)}).then(async()=>{
   photoSave.next+=batch.length;await markPhotosSaved(batch.map(e=>e.id));
   const done=photoSave.next>=photoSave.queue.length;
   note.textContent=done?'All '+photoSave.queue.length+' photos handed to the app you chose. Check they arrived there; this app cannot confirm it.':photoSave.next+' of '+photoSave.queue.length+' photos handed off. Tap Save Next Batch for the rest.';
   finish();if(done)onDone?.();
  }).catch(e=>{
   if(e?.name==='AbortError')note.textContent='Canceled. Nothing was lost. Tap again when ready.';
   else{remember('photoBatchMax',batch.length>10?10:Math.max(1,Math.floor(batch.length/2)));note.textContent='This phone takes fewer photos at a time. Tap again to save a smaller batch.';}
   finish();
  });
 }catch(e){finish();note.textContent='Could not open sharing: '+e.message;}
}
/* Leaving Review & Share ends the visit for now. Remind once if photos were not saved. */
function needsPhotoReminder(){return !!photoSave&&!openedReadonly&&unsavedPhotos()>0;}
async function leaveReview(){if(needsPhotoReminder()){$('#reminderNote').textContent=unsavedPhotos()+(unsavedPhotos()===1?' photo is':' photos are')+' only on this phone.';paintPhotoSave();$('#saveReminder').classList.add('open');return;}await backToStart();}
/* Word and ZIP files cannot be shared on some devices (Chrome on Android only shares
   images, PDF, text and media). There the report downloads and Open Email starts the message. */
function wordShareable(){try{return !!readyBlob&&!!navigator.canShare?.({files:[new File([readyBlob],readyName,{type:readyBlob.type})]});}catch{return false;}}
function reportFits(){return !!readyBlob&&readyBlob.size<=(window.SVReport.EMAIL_LIMIT||15*1048576);}
function paintReportShare(){const ok=wordShareable(),fits=reportFits(),stats=window.SVReport.lastStats;
 const size=readyBlob?fmtMB(readyBlob.size):'';
 $('#reportSize').className='sizebar '+(fits?'fits':'big');
 $('#reportSize').textContent=fits?size+' · small enough to email'+(stats&&stats.tier>0&&stats.photos?' (photos sized to fit)':''):size+' · too large for most email. Send a link instead.';
 setCard('#doneShare',ok?'Email Report':'Download Report',ok?'mail':'download',ok?(fits?'Share menu: choose Mail or Outlook':'Over the email limit; it may bounce'):'Saves the Word file to Downloads');
 setCard('#sendLink',fits?'Send as a link instead':'Send as a link','link',fits?'Save to OneDrive, iCloud or Google Drive and email the link':'Save it to your cloud and email the link. Three quick steps.');
 $('#doneShare').classList.toggle('cta',fits);$('#sendLink').classList.toggle('cta',!fits);
 const send=$('#doneShare').parentNode;if(send&&send.insertBefore)(fits?send.insertBefore($('#doneShare'),$('#sendLink')):send.insertBefore($('#sendLink'),$('#doneShare')));
 setCard('#doneEmail','Open Email','mail','Then attach the report from Downloads');$('#doneEmail').hidden=ok||!fits;
 setCard('#doneCloud','Save Visit Package','folder','Report, original photos and recovery file in one ZIP');
 setCard('#doneSave','Download Report','download','Saves the Word file to Downloads');setCard('#doneStart','Back to Start','home');}
function reportDownloaded(){download(readyBlob,readyName);$('#doneEmail').hidden=!reportFits();$('#doneNote').textContent='Report saved to Downloads. '+(reportFits()?'Tap Open Email, then attach '+readyName+' with the paperclip.':'Upload it to Google Drive or OneDrive, then use Send as a link.');}
/* Large reports: save to the user's own cloud, paste the share link, and the email is written for them. */
function openLink(){const fits=reportFits(),ok=wordShareable();
 $('#linkIntro').textContent=(fits?'The report is '+fmtMB(readyBlob.size)+'. ':'The report is '+fmtMB(readyBlob.size)+', too large for most email. ')+'Put it in your cloud and email a link instead. Anyone with the link can download it.';
 setCard('#linkSave',ok?'Save report to your cloud':'Download the report',ok?'backup':'download',ok?'Opens the share menu':'Then upload it in your Google Drive or OneDrive app');
 setCard('#linkEmail','Open email with the link','mail','Subject and message written for you');
 $('#linkSaveNote').textContent='';$('#linkNote').textContent='';$('#linkSheet').classList.add('open');}
function linkSaveTap(){if(!readyBlob)return;const file=new File([readyBlob],readyName,{type:readyBlob.type});
 if(!canShareFile(file)){download(readyBlob,readyName);$('#linkSaveNote').textContent='Saved to Downloads. Open Google Drive or OneDrive and upload '+readyName+'.';return;}
 $('#linkSave').disabled=true;
 try{navigator.share({files:[file]}).then(()=>{$('#linkSaveNote').textContent='Handed to the app you chose. Next, open it there and copy a share link.';}).catch(e=>{$('#linkSaveNote').textContent=e?.name==='AbortError'?'Canceled. Tap again when ready.':'Could not share: '+(e?.message||'unknown');}).finally(()=>{$('#linkSave').disabled=false;});}
 catch(e){$('#linkSave').disabled=false;$('#linkSaveNote').textContent='Could not open the share menu: '+e.message;}}
function linkEmailTap(){const link=$('#linkInput').value.trim();
 if(!/^https?:\/\/\S+$/i.test(link)){$('#linkNote').textContent='Paste the share link first. It starts with https://';$('#linkInput').focus();return;}
 const subject=visit.project+' · '+visitLabel(visit)+' Site Visit Report';
 const body='Hello,\n\nThe site visit report for '+visit.project+(visit.projNum?' ('+visit.projNum+')':'')+', '+visitLabel(visit)+' from '+new Date(visit.date).toLocaleDateString([],{month:'long',day:'numeric',year:'numeric'})+', is ready. It is too large to attach, so you can download it here:\n\n'+link+'\n\nThank you,\n'+(visit.preparedBy||'');
 location.href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);$('#linkNote').textContent='Your email app should open with the link in the message.';}
function openNotes(fromFinish=false){notesFromSetup=$('#setupSheet').classList.contains('open');notesFromFinish=fromFinish;$('#visitNotes').value=visit.generalNotes||'';$('#visitNotes').disabled=isReadonly();$('#notesSave').hidden=isReadonly();$('#notesSkip').hidden=isReadonly();setCard('#notesSave','Save notes','check');setCard('#notesSkip',fromFinish?'Skip for now':'Back','arrow',fromFinish?'You can add notes later from Review':'');$('#notesSheet').classList.add('open');}
async function leaveNotes(){if(!isReadonly()&&$('#visitNotes').value!==(visit.generalNotes||'')){const next=clone(visit);next.generalNotes=$('#visitNotes').value.trim();await persistVisit(next);}$('#notesSheet').classList.remove('open');if(notesFromSetup)showSetup();else await openReview();}
function snapshotVisit(v){const out=clone(v);for(const k of ['history','editing','cloudCheckedAt','localPhotosRemovedAt','currentLocation','photosSavedIds','photosSavedAt'])delete out[k];return out;}
function snapshotPhoto(r){const out={id:r.id,visitId:r.visitId,ts:r.ts};for(const k of NOTE_KEYS)out[k]=r[k]||'';return out;}
function reportBlob(data){const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));return new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});}
async function prepareCurrentReport(onProgress){
 await fillVisitContact();
 const latest=visit.history?.at(-1);
 if(isReadonly()&&latest?.reportData){readyBlob=reportBlob(latest.reportData);readyName=latest.filename;return;}
 const photos=await visitPhotos();if(photos.some(p=>!p.blob?.size))throw new Error('Original photos are archived. Open Report History for an issued Word copy, or restore the project recovery file to rebuild this report.');
 readyBlob=await window.SVReport.buildReport(clone(visit),photos,{onProgress});readyName=window.SVReport.reportFileName(visit);
}
async function preservedVersion(v,photos,kind,reason=''){
 const b=await window.SVReport.buildReport(clone(v),photos,{onProgress:typeof busyProgress==='function'?busyProgress:null});
 return {revision:v.revision||0,issuedAt:v.issuedAt||Date.now(),savedAt:Date.now(),kind,reason,visit:snapshotVisit(v),photos:photos.map(snapshotPhoto),filename:window.SVReport.reportFileName(v),reportData:await blobData(b)};
}
function majorEditReasons(baseline,v,photos){
 if(!baseline)return [];
 const reasons=[],before=baseline.photos,byId=new Map(before.map(p=>[p.id,p]));
 const shown=list=>JSON.stringify(list.filter(p=>!p.omit).map(p=>p.id).sort((a,b)=>a-b));
 if(shown(before)!==shown(photos))reasons.push('Photos added to or removed from the report');
 if(photos.some(p=>{const old=byId.get(p.id);return old&&['tag','owner','due'].some(k=>(old[k]||'')!==(p[k]||''));}))reasons.push('Photo type, responsibility, or due date changed');
 const oldItems=baseline.visit.items||[],newItems=v.items||[],oldMap=new Map(oldItems.map(i=>[i.id,i]));
 if(oldItems.length!==newItems.length||newItems.some(i=>!oldMap.has(i.id)))reasons.push('Tracked items added or removed');
 if(newItems.some(i=>{const old=oldMap.get(i.id);return old&&['status','owner','due','tag'].some(k=>(old[k]||'')!==(i[k]||''));}))reasons.push('Item status, responsibility, due date, or type changed');
 if(['project','projNum','date'].some(k=>baseline.visit[k]!==v[k]))reasons.push('Project or visit date changed');
 return reasons;
}
async function beginIssuedEdits(){
 const other=(await allV()).find(v=>v.projectId===visit.projectId&&v.id!==visit.id&&(!v.closed||v.editing));
 if(other)throw new Error('Finish or issue '+visitLabel(other)+' before editing this issued visit.');
 const photos=await visitPhotos();if(photos.some(p=>!p.blob?.size))throw new Error('Restore this project’s recovery file before editing archived photos. Issued Word copies remain available in Report History.');
 const next=clone(visit);next.history=next.history||[];openedReadonly=false;
 if(!next.history.length){next.revision=next.revision||0;next.issuedAt=next.completedAt||Date.now();next.history.push(await preservedVersion(next,photos,'Legacy completed report'));}
 delete next.legacyReportItems;next.editing=true;delete next.cloudCheckedAt;await persistVisit(next);reviewing=false;await openReview();
}
async function openIssue(){
 editable();await captureTask;const reasons=visit.editing?majorEditReasons(visit.history.at(-1),visit,await visitPhotos()):[];
 $('#issueReason').value='';$('#issueReason').hidden=!visit.editing;document.querySelector('label[for="issueReason"]').hidden=!visit.editing;
 $('#issueOriginal').hidden=!!visit.editing;$('#issueEdits').hidden=!visit.editing;$('#issueRevision').hidden=!visit.editing;$('#issueCancelEdits').hidden=!visit.editing;
 $('#issueEdits').disabled=!!reasons.length;
 setCard('#issueOriginal','Mark issued','check','Keeps an exact copy and completes this visit');setCard('#issueEdits','Save edits','check',reasons.length?'Not available: these changes need a revision':'Small corrections. Keeps the report number');
 setCard('#issueRevision','Create revision','history','Adds R1, R2 and keeps the original');setCard('#issueCancelEdits','Discard working edits','trash','Restores the last issued version');
 $('#issueRevision').classList.toggle('cta',!!visit.editing);$('#issueEdits').classList.remove('cta');
 $('#issueHelp').textContent=visit.editing?(reasons.length?'A revision is required:\n'+reasons.join('\n')+'\nThe existing issued report will be preserved.':'Save Edits is for small corrections. Create a revision for changes in meaning, scope, or conclusions, even if only a few words changed. Both choices preserve the previous issued copy.'):'Marking issued preserves a Word copy and completes this visit. You can still reopen it for corrections or a revision. Sharing and saving are separate steps.';
 $('#issueSheet').classList.add('open');
}
async function issueReport(mode){
 await fillVisitContact();editable();await captureTask;const photos=await visitPhotos();if(photos.some(p=>!p.blob?.size))throw new Error('Restore the project recovery file before issuing a report with archived photos.');
 const reasons=visit.editing?majorEditReasons(visit.history.at(-1),visit,photos):[];
 if(mode==='edits'&&reasons.length)throw new Error('These changes require a revision.');
 const reason=$('#issueReason').value.trim();if(mode==='revision'&&!reason)throw new Error('Enter a short revision reason.');
 if(mode==='edits'&&!confirm('Are these small corrections only, with no change to the report’s meaning or conclusions? Choose Cancel to create a revision.'))return;
 const unreviewed=visit.items.filter(i=>i.status==='Not reviewed').length;
 if(unreviewed&&!confirm(unreviewed+' items remain not reviewed. Issue the report with this status shown?'))return;
 $('#busyText').textContent='Preserving issued report';$('#busyClose').style.display='none';$('#busyWrap').classList.add('show');
 try{
  const next=clone(visit);next.revision=mode==='revision'?Math.max(next.revision||0,...(next.history||[]).map(h=>h.revision||0))+1:next.revision||0;
  next.revisionReason=mode==='revision'?reason:next.revisionReason||'';next.correctionReason=mode==='edits'?reason:'';
  next.reportOrder=reportOrderOf(next);next.closed=true;next.editing=false;next.issuedAt=Date.now();next.completedAt=next.completedAt||next.issuedAt;delete next.cloudCheckedAt;
  next.history=next.history||[];const h=await preservedVersion(next,photos,mode==='revision'?'Revision':mode==='edits'?'Correction':'Original issue',reason);next.history.push(h);
  await persistVisit(next);readyBlob=reportBlob(h.reportData);readyName=h.filename;reviewing=true;$('#issueSheet').classList.remove('open');await buildReport();
 }finally{$('#busyWrap').classList.remove('show');}
}
async function discardWorkingEdits(){
 if(!visit.editing)return;if(!confirm('Discard all working edits and restore the last issued report?'))return;
 const history=clone(visit.history),baseline=history.at(-1),next={...clone(baseline.visit),history,editing:false};
 for(const k of ['currentLocation','photosSavedIds','photosSavedAt'])if(visit[k]!==undefined)next[k]=clone(visit[k]);
 const ids=new Set(baseline.photos.map(p=>p.id));
 // Photo records stay untouched; restored notes and the excluded flag are written to meta only.
 await transaction(['visits','photos','meta'],'readwrite',tx=>{
  tx.objectStore('visits').put(next);const q=tx.objectStore('photos').index('visitId').getAll(visit.id);
  q.onsuccess=()=>q.result.filter(p=>!ids.has(p.id)).forEach(p=>{const mq=tx.objectStore('meta').get(p.id);mq.onsuccess=()=>tx.objectStore('meta').put({...(mq.result||{}),id:p.id,excluded:'1'});});
  for(const p of baseline.photos){const m={id:p.id,excluded:''};for(const k of NOTE_KEYS)m[k]=k==='location'?photoLocation(p):p[k]||'';tx.objectStore('meta').put(m);}
 });visit=next;readyBlob=null;$('#issueSheet').classList.remove('open');await buildReport();
}
async function showHistory(){
 $('#historyList').replaceChildren();for(const h of [...(visit.history||[])].reverse()){
  const card=document.createElement('article');card.className='card history-card';const title=document.createElement('b');title.textContent=visitLabel({...visit,revision:h.revision})+' · '+h.kind;
  const description=document.createElement('p');description.className='auto';description.textContent=new Date(h.savedAt||h.issuedAt).toLocaleString()+(h.reason?' · '+h.reason:'');
  const button=document.createElement('button');button.className='ghost';button.textContent='Download Issued Word Copy';button.onclick=()=>download(reportBlob(h.reportData),h.filename);
  card.append(title,description,button);$('#historyList').append(card);
 }$('#historySheet').classList.add('open');
}
function validateReportHistory(v,maps){
 if(!Array.isArray(v.history))throw new Error('Invalid report history.');
 for(const h of v.history){
  if(!h||!Number.isInteger(h.revision)||h.revision<0||!Number.isFinite(h.issuedAt)||typeof h.filename!=='string'||typeof h.reportData!=='string'||!/^data:application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document;base64,[A-Za-z0-9+/]+=*$/.test(h.reportData)||!h.visit||h.visit.id!==v.id||h.visit.projectId!==v.projectId||h.visit.num!==v.num||!Array.isArray(h.photos)||!Array.isArray(h.visit.items))throw new Error('Invalid issued report snapshot.');
  if(new Set(h.photos.map(p=>p.id)).size!==h.photos.length)throw new Error('Duplicate snapshot photo.');
  for(const p of h.photos)if(maps.photos.get(p.id)?.visitId!==v.id)throw new Error('Issued report references a missing photo.');
  for(const it of h.visit.items){if(maps.visits.get(it.originVisitId)?.projectId!==v.projectId)throw new Error('Invalid issued item history.');for(const id of [it.photoId,...(it.followupPhotoIds||[])].filter(x=>x!=null))if(maps.visits.get(maps.photos.get(id)?.visitId)?.projectId!==v.projectId)throw new Error('Invalid issued item photo.');}
 }
 if(v.editing&&!v.history.length)throw new Error('Working edits need an issued baseline.');
}
const LAYOUT_NAMES={compact:'Photo left, comment right',large:'Large photos, fitted to shape'};
function layoutName(key){return LAYOUT_NAMES[key]||LAYOUT_NAMES.compact;}
function openLayout(){const current=visit.reportLayout in LAYOUT_NAMES?visit.reportLayout:'compact';
 for(const key of Object.keys(LAYOUT_NAMES))$('#layout_'+key).classList.toggle('picked',key===current);$('#layoutSheet').classList.add('open');}
async function pickLayout(key){editable();const next=clone(visit);next.reportLayout=key;await persistVisit(next);remember('reportLayout',key);$('#layoutSheet').classList.remove('open');await openReview();}
function wireWorkflow(){
 on('#reviewLayout',openLayout);on('#layoutBack',()=>$('#layoutSheet').classList.remove('open'));
 on('#layout_compact',()=>pickLayout('compact'));on('#layout_large',()=>pickLayout('large'));
 on('#profileBtn',()=>openProfile());on('#profileClose',()=>$('#profileSheet').classList.remove('open'));
 $('#profileForm').onsubmit=e=>{e.preventDefault();return safe(async()=>{const p={};for(const key of ['Name','Company','Phone','Email','OfficePhone'])p[key==='OfficePhone'?'officePhone':key.toLowerCase()]=$('#profile'+key).value.trim();if(!p.name)throw new Error('Enter your name.');p.company=p.company||'Redline Design Group';p.officePhone=p.officePhone||'704-377-2990';remember('userProfile',p);remember('preparedBy',p.name);$('#profileSheet').classList.remove('open');if(typeof paintStatic==='function')paintStatic();})()};
 on('#projectClose',()=>$('#projectSheet').classList.remove('open'));
 $('#projectForm').onsubmit=e=>{e.preventDefault();return safe(async()=>{const name=$('#projectName').value.trim(),number=$('#projectNumber').value.trim();if(!name)throw new Error('Enter a project name.');const key=number?'number:'+number.toLowerCase():'name:'+name.toLowerCase(),old=projectEditing?currentProject():null;
 if(projects.some(p=>p.key===key&&p.id!==old?.id))throw new Error('That project already exists. Select it on Start.');const details={};for(const k of ['Address','Client','Contact','Phone','Email'])details[k.toLowerCase()]=$('#project'+k).value.trim();selectedProject=await put('projects',{...(old||{}),name,number,key,...details});$('#projectSheet').classList.remove('open');await loadState();})()};
 on('#existingBtn',async()=>{await loadState();$('#existingProject').textContent=currentProject()?(currentProject().name+(currentProject().number?' · '+currentProject().number:'')):'Select a project on Start.';$('#existingSheet').classList.add('open');});on('#existingBack',()=>$('#existingSheet').classList.remove('open'));on('#setupNotes',()=>openNotes());on('#setupItems',()=>openItems(true));on('#setupInfo',openVisitInfo);on('#setupBack',backToStart);on('#setupContinue',async()=>{$('#setupSheet').classList.remove('open');await returnCamera();});
 on('#reviewBack',leaveReview);on('#reviewHome',leaveReview);on('#doneStart',leaveReview);
 $('#reviewSavePhotos').onclick=()=>savePhotosTap($('#savePhotosNote'));
 $('#reminderSave').onclick=()=>savePhotosTap($('#reminderNote'),safe(backToStart));
 on('#reminderSkip',backToStart);on('#reviewInfo',openVisitInfo);on('#reviewPhotos',async()=>{galleryFromReview=true;await openGal();});on('#reviewItems',()=>openItems(false));on('#reviewNotes',()=>openNotes());on('#reviewCamera',returnCamera);
 on('#reviewShare',buildReport);on('#reviewIssue',openIssue);on('#reviewEdit',beginIssuedEdits);on('#reviewHistory',showHistory);
 on('#notesSave',leaveNotes);on('#notesBack',leaveNotes);on('#notesSkip',leaveNotes);
 on('#issueBack',()=>$('#issueSheet').classList.remove('open'));on('#issueOriginal',()=>issueReport('original'));on('#issueEdits',()=>issueReport('edits'));on('#issueRevision',()=>issueReport('revision'));on('#issueCancelEdits',discardWorkingEdits);
 on('#historyBack',()=>$('#historySheet').classList.remove('open'));
 on('#captureNext',()=>$('#detSave').click());on('#captureSkip',()=>$('#detClose').click());
 on('#doneClose',async()=>{$('#done').classList.remove('open');await openReview();});
 // Invoke native sharing directly from the gesture, after the report has been prepared.
 $('#doneShare').onclick=()=>{
  if(!readyBlob){$('#doneNote').textContent='The report changed. Go Back, then tap Build and send the report again.';return;}
  const file=new File([readyBlob],readyName,{type:readyBlob.type});
  if(!navigator.canShare?.({files:[file]})){reportDownloaded();return;}
  $('#doneShare').disabled=true;
  try{navigator.share({files:[file],title:readyName}).then(()=>{$('#doneNote').textContent='Report handed to the app you chose; send it from there. Next, save the visit package to the project folder.';$('#doneCloud').focus();}).catch(e=>{if(e.name==='AbortError')$('#doneNote').textContent='Sharing canceled. Nothing was lost. Try again when ready.';else reportDownloaded();}).finally(()=>$('#doneShare').disabled=false);}catch(e){$('#doneShare').disabled=false;showError(e);}
 };
 $('#doneEmail').onclick=()=>{if(!visit)return;const subject=visit.project+' · '+visitLabel(visit)+' Site Visit Report';
  location.href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent('Please find the attached site visit report, '+readyName+'.');};
 on('#cloudDone',async()=>{$('#cloudSheet').classList.remove('open');await openReview();});
 on('#sendLink',openLink);on('#linkBack',()=>$('#linkSheet').classList.remove('open'));
 $('#linkSave').onclick=linkSaveTap;$('#linkEmail').onclick=linkEmailTap;
 $('#linkPaste').onclick=()=>{try{navigator.clipboard?.readText?.().then(t=>{$('#linkInput').value=(t||'').trim();$('#linkNote').textContent='';}).catch(()=>{$('#linkNote').textContent='Press and hold in the box, then tap Paste.';});}catch{$('#linkNote').textContent='Press and hold in the box, then tap Paste.';}};
}
