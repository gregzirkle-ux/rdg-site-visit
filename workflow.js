'use strict';
/* Workflow state is saved on each visit; issued versions never read later metadata. */
let captureComment=false,galleryFromReview=false,projectEditing=false,profileFirstUse=false,notesFromFinish=false;
const FLOW_ICONS={
 camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="3"/>',
 arrow:'<path d="M4 12h16M14 6l6 6-6 6"/>',check:'<circle cx="12" cy="12" r="9"/><path d="M7 12l3 3 7-7"/>',
 edit:'<path d="M14 4l6 6M4 20l2-7L17 2l5 5-11 11z"/>',notes:'<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',folder:'<path d="M3 5h7l2 3h9v12H3z"/>'};
function setCard(selector,label,icon='notes',sub=''){
 const el=typeof selector==='string'?$(selector):selector;
 el.replaceChildren();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [k,v] of Object.entries({width:'24',height:'24',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);
 svg.innerHTML=FLOW_ICONS[icon]||FLOW_ICONS.notes;
 const title=document.createElement('span');title.textContent=label;el.append(svg,title);
 if(sub){const text=document.createElement('span');text.className='sub';text.textContent=sub;el.append(text);}
}
function visitLabel(v){return 'SVR-'+String(v.num).padStart(3,'0')+(v.revision?'-R'+v.revision:'');}
function userProfile(){return {name:'',company:'Redline Design Group',phone:'',email:'',...stored('userProfile',{})};}
function openProfile(first=false){profileFirstUse=first;const p=userProfile();for(const key of ['Name','Company','Phone','Email'])$('#profile'+key).value=p[key.toLowerCase()];$('#profileClose').textContent=first?'Later':'Back';$('#profileStatus').textContent='';$('#profileSheet').classList.add('open');}
function openProjectForm(edit){projectEditing=edit;const p=edit?currentProject():null;$('#projectName').value=p?.name||'';$('#projectNumber').value=p?.number||'';$('#projectFormTitle').textContent=edit?'Edit Project Details':'New Project';for(const k of ['Address','Client','Contact','Phone','Email'])$('#project'+k).value=p?.[k.toLowerCase()]||'';$('#projectHelp').textContent=edit?'Changes apply to future visits. Existing visits retain their recorded project information.':'Create a project to keep its visits and open items together.';$('#projectSheet').classList.add('open');}
function showSetup(){stopCamera();$('#setupTitle').textContent=visit.project+' · '+visitLabel(visit);setCard('#setupItems','Open Items','notes',visit.items.filter(i=>i.status!=='Closed').length+' carried-forward items · Review now or later');$('#setupSheet').classList.add('open');}
function hideWorkSheets(){for(const id of ['#existingSheet','#setupSheet','#reviewSheet','#gal','#done','#notesSheet','#itemsSheet','#issueSheet','#historySheet'])$(id).classList.remove('open');}
async function returnCamera(){editable();await captureTask;hideWorkSheets();captureComment=false;galleryFromReview=false;reviewing=false;const a=stored('areas:'+visit.projectId,{area:'',recent:[]});area=a.area;recent=a.recent;paintArea();paintProj();await refreshCount();$('#start').classList.add('hide');fetchWeather(visit.id);await startCam();}
async function openCaptured(id){captureComment=true;await openDet(id,count);}
async function finishWalk(){await captureTask;editable();stopCamera();const next=clone(visit);next.walkFinishedAt=next.walkFinishedAt||Date.now();await persistVisit(next);await openReview();openNotes(true);}
async function refreshReviewIfOpen(){if($('#reviewSheet').classList.contains('open'))await openReview();}
async function openReview(){
 await captureTask;stopCamera();captureComment=false;galleryFromReview=true;
 for(const id of ['#gal','#setupSheet','#done'])$(id).classList.remove('open');
 const photos=await visitPhotos(),unreviewed=visit.items.filter(i=>i.status==='Not reviewed').length;
 $('#reviewProject').textContent=visit.project+(visit.projNum?' · '+visit.projNum:'');$('#reviewTitle').textContent=visitLabel(visit)+' · '+new Date(visit.date).toLocaleDateString();
 $('#reviewStatus').textContent=(visit.editing?'Working edits saved on this device. Finalize or discard them below.':visit.issuedAt?'Issued '+new Date(visit.issuedAt).toLocaleString():visit.closed?'Previously completed report.':'Draft saved on this device. Mark issued when the report is ready.')+(unreviewed?' '+unreviewed+' open item(s) not reviewed.':'')+(visit.localPhotosRemovedAt?' Some original photos are archived; restore recovery data to edit or create a full package.':'');
 setCard('#reviewInfo','Visit Information','info',visit.attendees?'Details entered':'Date, attendees, weather');
 setCard('#reviewPhotos','Photos & Comments','camera',photos.length+' photos · '+photos.filter(p=>!!p.note).length+' comments');
 setCard('#reviewItems','Open Items','notes',visit.items.filter(i=>i.status!=='Closed').length+' open'+(unreviewed?' · '+unreviewed+' not reviewed':''));
 setCard('#reviewNotes','Additional Notes','edit',visit.generalNotes?'Notes entered':'Optional summary');
 $('#reviewEdit').hidden=!isReadonly();$('#reviewCamera').hidden=isReadonly();$('#reviewIssue').hidden=isReadonly();
 setCard('#reviewIssue',visit.editing?'Finalize Edits':'Mark Issued','check',visit.editing?'Save edits or create revision':'Preserve this report');
 $('#reviewHistory').hidden=!(visit.history?.length);
 $('#reviewWord').textContent='Word edits stay in Word. Save your finished document in the visit folder after editing.';
 $('#reviewSheet').classList.add('open');
}
function openNotes(fromFinish=false){notesFromFinish=fromFinish;$('#visitNotes').value=visit.generalNotes||'';$('#visitNotes').disabled=isReadonly();$('#notesSave').hidden=isReadonly();$('#notesSkip').hidden=isReadonly();setCard('#notesSkip',fromFinish?'Skip for Now':'Back to Visit','arrow');$('#notesSheet').classList.add('open');}
async function leaveNotes(){if(!isReadonly()&&$('#visitNotes').value!==(visit.generalNotes||'')){const next=clone(visit);next.generalNotes=$('#visitNotes').value.trim();await persistVisit(next);}$('#notesSheet').classList.remove('open');await openReview();}
function snapshotVisit(v){const out=clone(v);delete out.history;delete out.editing;delete out.cloudCheckedAt;delete out.localPhotosRemovedAt;return out;}
function snapshotPhoto(r){const out={id:r.id,visitId:r.visitId,ts:r.ts};for(const k of NOTE_KEYS)out[k]=r[k]||'';return out;}
function reportBlob(data){const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));return new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});}
async function prepareCurrentReport(){
 const latest=visit.history?.at(-1);
 if(isReadonly()&&latest?.reportData){readyBlob=reportBlob(latest.reportData);readyName=latest.filename;return;}
 const photos=await visitPhotos();if(photos.some(p=>!p.blob?.size))throw new Error('Original photos are archived. Open Report History for an issued Word copy, or restore the project recovery file to rebuild this report.');
 readyBlob=await window.SVReport.buildReport(clone(visit),photos);readyName=window.SVReport.reportFileName(visit);
}
async function preservedVersion(v,photos,kind,reason=''){
 const b=await window.SVReport.buildReport(clone(v),photos);
 return {revision:v.revision||0,issuedAt:v.issuedAt||Date.now(),savedAt:Date.now(),kind,reason,visit:snapshotVisit(v),photos:photos.map(snapshotPhoto),filename:window.SVReport.reportFileName(v),reportData:await blobData(b)};
}
function majorEditReasons(baseline,v,photos){
 if(!baseline)return [];
 const reasons=[],before=baseline.photos,byId=new Map(before.map(p=>[p.id,p]));
 if(JSON.stringify(before.map(p=>p.id).sort((a,b)=>a-b))!==JSON.stringify(photos.map(p=>p.id).sort((a,b)=>a-b)))reasons.push('Photos added or removed');
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
 const next=clone(visit);next.history=next.history||[];
 if(!next.history.length){next.revision=next.revision||0;next.issuedAt=next.completedAt||Date.now();next.history.push(await preservedVersion(next,photos,'Legacy completed report'));}
 delete next.legacyReportItems;next.editing=true;delete next.cloudCheckedAt;await persistVisit(next);reviewing=false;await openReview();
}
async function openIssue(){
 editable();await captureTask;const reasons=visit.editing?majorEditReasons(visit.history.at(-1),visit,await visitPhotos()):[];
 $('#issueReason').value='';$('#issueReason').hidden=!visit.editing;document.querySelector('label[for="issueReason"]').hidden=!visit.editing;
 $('#issueOriginal').hidden=!!visit.editing;$('#issueEdits').hidden=!visit.editing;$('#issueRevision').hidden=!visit.editing;$('#issueCancelEdits').hidden=!visit.editing;
 $('#issueEdits').disabled=!!reasons.length;
 $('#issueHelp').textContent=visit.editing?(reasons.length?'A revision is required:\n'+reasons.join('\n')+'\nThe existing issued report will be preserved.':'Save Edits is for small corrections. Create a revision for changes in meaning, scope, or conclusions, even if only a few words changed. Both choices preserve the previous issued copy.'):'Marking issued preserves a Word copy and completes this visit. You can still reopen it for corrections or a revision. Sharing and saving are separate steps.';
 $('#issueSheet').classList.add('open');
}
async function issueReport(mode){
 editable();await captureTask;const photos=await visitPhotos();if(photos.some(p=>!p.blob?.size))throw new Error('Restore the project recovery file before issuing a report with archived photos.');
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
  next.closed=true;next.editing=false;next.issuedAt=Date.now();next.completedAt=next.completedAt||next.issuedAt;delete next.cloudCheckedAt;
  next.history=next.history||[];const h=await preservedVersion(next,photos,mode==='revision'?'Revision':mode==='edits'?'Correction':'Original issue',reason);next.history.push(h);
  await persistVisit(next);readyBlob=reportBlob(h.reportData);readyName=h.filename;reviewing=true;$('#issueSheet').classList.remove('open');await openReview();
 }finally{$('#busyWrap').classList.remove('show');}
}
async function discardWorkingEdits(){
 if(!visit.editing)return;if(!confirm('Discard all working edits and restore the last issued report?'))return;
 const history=clone(visit.history),baseline=history.at(-1),next={...clone(baseline.visit),history,editing:false};
 const ids=new Set(baseline.photos.map(p=>p.id));
 await transaction(['visits','photos','meta'],'readwrite',tx=>{
  tx.objectStore('visits').put(next);const q=tx.objectStore('photos').index('visitId').getAll(visit.id);
  q.onsuccess=()=>q.result.forEach(p=>tx.objectStore('photos').put({...p,excluded:!ids.has(p.id)}));
  for(const p of baseline.photos){const m={id:p.id};for(const k of NOTE_KEYS)m[k]=p[k]||'';tx.objectStore('meta').put(m);}
 });visit=next;readyBlob=null;$('#issueSheet').classList.remove('open');await openReview();
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
function wireWorkflow(){
 on('#profileBtn',()=>openProfile());on('#profileClose',()=>$('#profileSheet').classList.remove('open'));
 $('#profileForm').onsubmit=e=>{e.preventDefault();return safe(async()=>{const p={};for(const key of ['Name','Company','Phone','Email'])p[key.toLowerCase()]=$('#profile'+key).value.trim();if(!p.name)throw new Error('Enter your name.');remember('userProfile',p);remember('preparedBy',p.name);$('#profileSheet').classList.remove('open');})()};
 on('#projectClose',()=>$('#projectSheet').classList.remove('open'));
 $('#projectForm').onsubmit=e=>{e.preventDefault();return safe(async()=>{const name=$('#projectName').value.trim(),number=$('#projectNumber').value.trim();if(!name)throw new Error('Enter a project name.');const key=number?'number:'+number.toLowerCase():'name:'+name.toLowerCase(),old=projectEditing?currentProject():null;
 if(projects.some(p=>p.key===key&&p.id!==old?.id))throw new Error('That project already exists. Select it on Start.');const details={};for(const k of ['Address','Client','Contact','Phone','Email'])details[k.toLowerCase()]=$('#project'+k).value.trim();selectedProject=await put('projects',{...(old||{}),name,number,key,...details});$('#projectSheet').classList.remove('open');await loadState();})()};
 on('#existingBtn',async()=>{await loadState();$('#existingProject').textContent=currentProject()?.name||'Select a project on Start.';$('#existingSheet').classList.add('open');});on('#existingBack',()=>$('#existingSheet').classList.remove('open'));on('#setupItems',()=>openItems(true));on('#setupInfo',openVisitInfo);on('#setupBack',backToStart);on('#setupContinue',async()=>{$('#setupSheet').classList.remove('open');await returnCamera();});
 on('#reviewBack',backToStart);on('#reviewHome',backToStart);on('#reviewInfo',openVisitInfo);on('#reviewPhotos',async()=>{galleryFromReview=true;await openGal();});on('#reviewItems',()=>openItems(false));on('#reviewNotes',()=>openNotes());on('#reviewCamera',returnCamera);
 on('#reviewShare',buildReport);on('#reviewIssue',openIssue);on('#reviewEdit',beginIssuedEdits);on('#reviewHistory',showHistory);
 on('#notesSave',leaveNotes);on('#notesBack',leaveNotes);on('#notesSkip',leaveNotes);
 on('#issueBack',()=>$('#issueSheet').classList.remove('open'));on('#issueOriginal',()=>issueReport('original'));on('#issueEdits',()=>issueReport('edits'));on('#issueRevision',()=>issueReport('revision'));on('#issueCancelEdits',discardWorkingEdits);
 on('#historyBack',()=>$('#historySheet').classList.remove('open'));
 on('#captureNext',()=>$('#detSave').click());on('#captureSkip',()=>$('#detClose').click());
 on('#doneClose',async()=>{$('#done').classList.remove('open');await openReview();});
 // Invoke native sharing directly from the gesture, after the report has been prepared.
 $('#doneShare').onclick=()=>{
  if(!readyBlob){$('#doneNote').textContent='The report changed. Go Back, then choose Share and Save to prepare the latest copy.';return;}
  const file=new File([readyBlob],readyName,{type:readyBlob.type});
  if(!navigator.canShare?.({files:[file]})){download(readyBlob,readyName);$('#doneNote').textContent='Report download requested. Attach it in your email app, then choose Save Visit Package.';return;}
  $('#doneShare').disabled=true;
  try{navigator.share({files:[file],title:readyName}).then(()=>{$('#doneNote').textContent='Report handed to your selected app. Sending is handled there. Next: Save Visit Package.';$('#doneCloud').focus();}).catch(e=>{$('#doneNote').textContent=e.name==='AbortError'?'Sharing canceled. You can try again or save without emailing.':'Could not share. Use Download Report, then attach it in your email app.';}).finally(()=>$('#doneShare').disabled=false);}catch(e){$('#doneShare').disabled=false;showError(e);}
 };
 on('#cloudDone',async()=>{$('#cloudSheet').classList.remove('open');await openReview();});
}
