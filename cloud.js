'use strict';
// Manual file handoff only. A successful share is never treated as cloud verification.
let cloudSession = null;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
function fileStem(value) {
  return String(value || 'Project').normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/g, '').slice(0, 90) || 'Project';
}
function visitStem(v) { return fileStem(v.projNum || v.project) + '_SVR-' + String(v.num).padStart(3, '0') + (v.revision?'-R'+v.revision:'') + '_' + dateInput(v.date); }
function photoExt(r) { return r.blob?.type === 'image/png' ? '.png' : r.blob?.type === 'image/webp' ? '.webp' : '.jpg'; }
function locationStem(name) { return fileStem(name || 'General').replace(/[\s-]+/g, '-').slice(0, 40).replace(/[-.]+$/g, '') || 'General'; }
/* One ordered list of a visit's photos with their export names, used by the ZIP, the photo
   index and Save photos (and any later upload target). Report photos come first in report
   order with their observation numbers; photos left out of the report follow as Extra. */
function photoExportSet(v, photos) {
  const plan = photoPlan(v, photos);let extra = 0;
  return [...plan.ordered.map(r => ({ rec: r, obs: plan.numbers.get(r.id), tag: '_Obs-' + String(plan.numbers.get(r.id)).padStart(3, '0') })),
          ...plan.extras.map(r => ({ rec: r, obs: '', tag: '_Extra-' + String(++extra).padStart(2, '0') }))]
    .map(e => { const k = locationKey(photoLocation(e.rec)), location = k ? plan.labels.get(k) : '';
      return { rec: e.rec, obs: e.obs, inReport: e.obs !== '', location, name: visitStem(v) + e.tag + '_' + locationStem(location) + photoExt(e.rec) }; });
}
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
async function dataSnapshot(projectId) {
  const data = await transaction(STORES, 'readonly', tx => {
    const qs = STORES.map(n => tx.objectStore(n).getAll());
    return () => Object.fromEntries(STORES.map((n, i) => [n, qs[i].result]));
  });
  data.projects = data.projects.filter(p => p.id === projectId);
  data.visits = data.visits.filter(v => v.projectId === projectId);
  const ids = new Set(data.visits.map(v => v.id));
  data.photos = data.photos.filter(p => ids.has(p.visitId));
  const photos = new Set(data.photos.map(p => p.id));
  data.meta = data.meta.filter(m => photos.has(m.id));
  return data;
}
async function projectRecoveryFile(data, stamp) {
  for (const p of data.photos) {
    if (p.blob?.size) { p.data = await blobData(p.blob); delete p.archived; }
    else if (p.archived === true) p.data = null;
    else throw new Error('A photo is unreadable. Recovery file was not created.');
    delete p.blob;
  }
  const name = fileStem(data.projects[0].number || data.projects[0].name) + '_Project-Recovery_' + stamp + '.json';
  return new File([JSON.stringify({format: 'rdg-sitevisit-project', version: 2, createdAt: new Date().toISOString(), data})], name, {type:'application/json'});
}
/* v19 data package: a ZIP with backup.json and the photos as separate files. A JSON file with every
   photo written out as text grew too large for the phone's memory on big visits (the v18 crash),
   so photos are never converted to text here. */
async function dataPackage(format, data, name, onStep) {
  const entries = [], photos = [];
  for (const p of data.photos) {
    const out = {...p}; delete out.blob;
    if (p.blob?.size) { out.path = 'photos/' + p.id + photoExt(p); out.mime = p.blob.type || 'image/jpeg'; delete out.archived; entries.push({path: out.path, blob: p.blob}); }
    else if (p.archived === true) out.data = null;
    else throw new Error('A saved photo is unreadable. The file was not created.');
    photos.push(out);
  }
  const counts = {projects: data.projects.length, visits: data.visits.length, photos: entries.length};
  const json = new Blob([JSON.stringify({format, version: 3, createdAt: new Date().toISOString(), counts, data: {...data, photos}})], {type: 'application/json'});
  const all = [{path: 'backup.json', blob: json}, ...(entries.length ? [{path: 'photos/', blob: new Blob()}] : []), ...entries];
  return {file: await makeVisitZip(all, name, onStep), counts};
}
async function projectRecoveryZip(data, stamp) {
  const name = fileStem(data.projects[0].number || data.projects[0].name) + '_Project-Recovery_' + stamp + '.zip';
  return (await dataPackage('rdg-sitevisit-project', data, name)).file;
}
async function isZipFile(file) {
  if (typeof file?.slice !== 'function' || file.size < 4) return false;
  const b = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
}
/* Reads a backup ZIP, a recovery ZIP, or a whole visit package (its Recovery file is used). */
async function readDataPackage(file, notBackup) {
  const zip = await readZip(file);
  const json = await zip.open('backup.json');
  if (!json) {
    const inner = [...zip.entries.keys()].find(n => /(^|\/)Recovery\/[^/]+\.(zip|json)$/i.test(n));
    if (!inner) throw new Error(notBackup);
    const blob = await zip.open(inner);
    if (/\.zip$/i.test(inner)) return readDataPackage(blob, notBackup);
    try { return JSON.parse(await blob.text()); } catch { throw new Error(notBackup); }
  }
  let raw; try { raw = JSON.parse(await json.text()); } catch { throw new Error(notBackup); }
  if (raw?.version === 3) for (const p of raw.data?.photos || []) {
    if (p.archived === true) continue;
    if (typeof p.path !== 'string' || !zip.entries.has(p.path)) throw new Error('A photo is missing from this file. Nothing on this phone was changed.');
    p.blob = await zip.open(p.path, p.mime || 'image/jpeg');
  }
  return raw;
}
/* Quick check that a photo from a ZIP starts like a JPEG, PNG or WebP, without decoding it. */
async function looksLikeImage(blob) {
  if (!blob?.size || typeof blob.slice !== 'function') return false;
  const b = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  return (b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50) || (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45);
}
function saveFileButton(files, label, status) {
  const button = document.createElement('button'); button.className = 'ghost'; button.textContent = label;
  // Call share directly from the tap. Preparing files inside the handler can lose iOS user activation.
  button.onclick = () => {
    if (button.disabled) return;
    try {
      if (navigator.canShare?.({files})) {
        button.disabled = true;
        navigator.share({files}).then(() => {
          status.textContent = 'Files handed to the selected app. Check your destination and upload status in Files; this app cannot verify cloud storage.';
        }).catch(e => { if (e.name !== 'AbortError') status.textContent = 'Sharing failed: ' + e.message + '. Open Other save options for Download ZIP.'; })
          .finally(() => { button.disabled = false; });
      } else if (files.length === 1) {
        download(files[0], files[0].name);
        status.textContent = 'Download requested. Move the file from Downloads to your cloud folder and check it there.';
      } else status.textContent = 'This browser cannot share this batch. Save the files individually below.';
    } catch (e) { button.disabled = false; status.textContent = 'Could not share: ' + e.message + '. Open Other save options for Download ZIP.'; }
  };
  return button;
}
async function openCloud() {
  await captureTask; stopCamera();
  if (!visit) return;
  cloudSession = null; $('#cloudFiles').replaceChildren(); $('#cloudChecked').disabled = true;
  setCard('#cloudChecked','I checked my saved files','check','Records that this package is safely stored'); setCard('#cloudDone','Back to the visit','arrow');
  $('#cloudConfirmed').textContent = ''; $('#cloudTitle').textContent = visit.project + ' · ' + svr(visit.num);
  $('#cloudStatus').textContent = 'Preparing the package on this phone…'; $('#cloudSheet').classList.add('open');
  try {
    const snapshot = await dataSnapshot(visit.projectId);
    const v = snapshot.visits.find(v => v.id === visit.id);
    if (!v) throw new Error('This visit is no longer available.');
    const meta = new Map(snapshot.meta.map(m => [m.id, m]));
    const photos = snapshot.photos.filter(p => p.visitId === v.id).map(p => joinMeta(p, meta.get(p.id))).filter(p => !p.excluded);
    const missing = photos.filter(p => !p.blob?.size).length;
    if(missing)throw new Error('This visit has photos removed from the phone. Use its saved ZIP or restore the project recovery file before creating another complete archive.');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const issued=v.closed&&!v.editing?v.history?.at(-1):null;
    const report = new File([issued?.reportData?reportBlob(issued.reportData):await window.SVReport.buildReport(clone(v), photos)], window.SVReport.reportFileName(v), {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    const set = photoExportSet(v, photos);
    const imageFiles = set.map(e => new File([e.rec.blob], e.name, {type:e.rec.blob.type}));
    const lines = [['Filename','Observation','In report','Location','Photo time','Sheet / room','Tag','Note','Owner','Due','On this phone'], ...set.map(({rec:p,name,obs,location}) => [name,obs,p.omit?'No':'Yes',location||'General',new Date(p.ts).toISOString(),p.sheet,p.tag,p.note,p.owner,p.due,'Yes'])];
    const index = new File(['\uFEFF'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n')], visitStem(v)+'_Photo-Index.csv', {type:'text/csv'});
    // This copy holds only the selected project, including history required by recurring items.
    const recovery = await projectRecoveryZip(snapshot, stamp);
    const folder = 'SVR-' + String(v.num).padStart(3, '0') + (v.revision?'-R'+v.revision:'');
    $('#cloudStatus').textContent = 'Packing the complete visit ZIP…';
    const archive = await makeVisitZip(visitArchiveEntries(folder, report, imageFiles, index, recovery), visitStem(v)+(v.closed&&!v.editing?'':'_DRAFT')+'.zip');
    const card = document.createElement('article'); card.className = 'itemcard';
    const heading = document.createElement('h3'); heading.textContent = archive.name + ' · ' + (archive.size / 1048576).toFixed(1) + ' MB';
    const contents = document.createElement('p'); contents.textContent = 'Inside: the Word report, ' + imageFiles.length + ' original photos, a photo index and a recovery file.';
    const shareable = (() => { try { return !!navigator.canShare?.({files:[archive]}); } catch { return false; } })();
    const save = saveFileButton([archive], 'Save ZIP to Files', $('#cloudStatus'));
    save.className = 'tile cta'; setCard(save, shareable ? 'Share or Save ZIP' : 'Download ZIP', 'folder', shareable ? 'Save to Files, then OneDrive and the project folder' : 'Saves to Downloads. Upload it from your cloud app.');
    const fallback = document.createElement('button'); fallback.className = 'tile'; setCard(fallback, 'Download ZIP', 'folder', 'Saves to Downloads instead');
    const alternatives=document.createElement('details'),summary=document.createElement('summary');alternatives.className='more';summary.textContent='Other options';const altTiles=document.createElement('div');altTiles.className='tiles';altTiles.append(fallback);alternatives.append(summary,altTiles);
    fallback.onclick = () => { download(archive, archive.name); $('#cloudStatus').textContent = 'Download requested. Move the ZIP to your project folder at your preferred destination and check the upload finishes.'; };
    const choices=document.createElement('div');choices.className='tiles';choices.append(save);card.className='readycard';card.append(heading, contents, choices, alternatives); $('#cloudFiles').append(card);
    cloudSession = {visitId:v.id, preparedAt:Date.now(), missing:0, closed:v.closed&&!v.editing};
    $('#cloudChecked').disabled = !v.closed||!!v.editing;
    $('#cloudStatus').textContent = (v.closed&&!v.editing ? 'Ready to save.' : 'Draft package. For the final record, mark the report issued and save the package again.');

  } catch(e) { $('#cloudStatus').textContent = 'Could not prepare files: '+e.message; }
}
function protectedPhotoIds(visits) {
  const latest = new Map();
  for (const v of visits) if (!latest.has(v.projectId) || latest.get(v.projectId).id < v.id) latest.set(v.projectId,v);
  const protectedIds = new Set();
  for (const v of latest.values()) for (const item of v.items || []) if(item.status !== 'Closed')
    for (const id of [item.photoId,...(item.followupPhotoIds||[])]) if(id != null) protectedIds.add(id);
  return protectedIds;
}
function cleanupPlan(visits, photos, now=Date.now()) {
  const protectedIds = protectedPhotoIds(visits);
  return visits.filter(v=>v.closed && !v.editing && now-(v.completedAt||v.date)>=RETENTION_MS).map(v=>{
    const available = photos.filter(p=>p.visitId===v.id && p.blob?.size);
    return {visit:v, removable:available.filter(p=>!protectedIds.has(p.id)), retained:available.filter(p=>protectedIds.has(p.id))};
  }).filter(row=>row.removable.length);
}
async function storagePlan() { return cleanupPlan(await allV(), await read('photos')); }
async function paintCleanupNotice() {
  const plan=await storagePlan(); $('#cleanupNotice').hidden=!plan.length;
  $('#cleanupCount').textContent=plan.length+' completed visit(s) are over 30 days old. Review their photo storage when you are ready.';
}
async function openCleanup() {
  const list=$('#cleanupList');list.replaceChildren(); const plan=await storagePlan();
  if(!plan.length){const p=document.createElement('p');p.textContent='No removable photos in completed visits older than 30 days. Photos supporting open items are kept.';list.append(p);}
  for(const row of plan){
    const card=document.createElement('article');card.className='itemcard';const h=document.createElement('h3');h.textContent=row.visit.project+' · '+svr(row.visit.num);
    const p=document.createElement('p');const bytes=row.removable.reduce((n,p)=>n+p.blob.size,0);
    p.textContent=row.removable.length+' photos · '+(bytes/1048576).toFixed(1)+' MB removable. '+row.retained.length+' photos retained for open items.';
    const note=document.createElement('p');note.className='auto';note.textContent=row.visit.cloudCheckedAt?'You confirmed cloud files on '+new Date(row.visit.cloudCheckedAt).toLocaleDateString()+'.':'Cloud files have not been confirmed in this app.';
    const save=document.createElement('button');save.className='ghost';save.textContent='Save / review files first';save.onclick=safe(async()=>{$('#cleanupSheet').classList.remove('open');await openPast(row.visit);await openCloud();});
    const remove=document.createElement('button');remove.className='danger';remove.textContent='Remove local photos';remove.onclick=safe(async()=>{
      if(!confirm('Remove local photos for '+row.visit.project+' · '+svr(row.visit.num)+'?\n\nOnly continue if you checked that the report, individual photos and project recovery file are safely stored in your cloud or server. The app cannot verify this. Open-item evidence and visit history will stay.'))return;
      await removeLocalPhotos(row.visit.id); await loadState();await openCleanup();
    });card.append(h,p,note,save,remove);list.append(card);
  }$('#cleanupSheet').classList.add('open');
}
async function removeLocalPhotos(visitId) {
  // Recompute dependencies inside the same transaction as removal.
  const result = await transaction(['visits','photos'],'readwrite',tx=>{
    const vs=tx.objectStore('visits').getAll(), ps=tx.objectStore('photos').getAll(); let loaded=0;
    const ready=()=>{if(++loaded!==2)return;const row=cleanupPlan(vs.result,ps.result).find(r=>r.visit.id===visitId);if(!row)return;
      for(const photo of row.removable){const next={...photo,archived:true,removedAt:Date.now()};delete next.blob;tx.objectStore('photos').put(next);}
      tx.objectStore('visits').put({...row.visit,localPhotosRemovedAt:Date.now()});
    };vs.onsuccess=ready;ps.onsuccess=ready;
  });
  if (typeof dropThumbs === 'function') dropThumbs((await read('photos')).filter(p => p.visitId === visitId && !p.blob).map(p => p.id));
  return result;
}
function remapProjectCopy(data, existing) {
  const source=data.projects[0], old=existing.projects.find(p=>p.key===source.key);
  const nextId=name=>existing[name].reduce((n,r)=>Math.max(n,r.id),0)+1;
  const projectId=old?.id||nextId('projects');let vi=nextId('visits'),pi=nextId('photos');
  const vmap=new Map([...data.visits].sort((a,b)=>a.id-b.id).map(v=>[v.id,vi++]));
  const pmap=new Map(data.photos.map(p=>[p.id,pi++])),items=new Map();
  const mapItems=list=>(list||[]).map(i=>{
    if(!items.has(i.id))items.set(i.id,'restored:'+vmap.get(i.originVisitId)+':'+items.size);
    return {...i,id:items.get(i.id),originVisitId:vmap.get(i.originVisitId),photoId:i.photoId==null?null:pmap.get(i.photoId),followupPhotoIds:i.followupPhotoIds.map(id=>pmap.get(id))};
  });
  const visits=data.visits.map(v=>{
    const r={...v,id:vmap.get(v.id),projectId,items:mapItems(v.items)};
    if(v.legacyReportItems)r.legacyReportItems=mapItems(v.legacyReportItems);
    if(v.history)r.history=v.history.map(h=>({...h,visit:{...h.visit,id:vmap.get(h.visit.id),projectId,items:mapItems(h.visit.items),...(h.visit.legacyReportItems?{legacyReportItems:mapItems(h.visit.legacyReportItems)}:{})},photos:h.photos.map(p=>({...p,id:pmap.get(p.id),visitId:vmap.get(p.visitId),itemId:items.get(p.itemId)||''}))}));
    delete r.cloudCheckedAt;delete r.photosSavedIds;delete r.photosSavedAt;return r;
  });
  return {oldProjectId:old?.id,projects:[{...source,id:projectId}],visits,
    photos:data.photos.map(p=>({...p,id:pmap.get(p.id),visitId:vmap.get(p.visitId)})),
    meta:data.meta.map(m=>({...m,id:pmap.get(m.id),itemId:items.get(m.itemId)||''}))};
}
/* One restore for both kinds of file: a full backup (every project) or the project recovery
   file inside a visit package. Projects not on this phone are added. For a project already
   here the user picks which copy to keep. Nothing else on the phone is touched. */
function splitProjects(data) {
  return data.projects.map(p => {
    const visits = data.visits.filter(v => v.projectId === p.id), vids = new Set(visits.map(v => v.id));
    const photos = data.photos.filter(x => vids.has(x.visitId)), pids = new Set(photos.map(x => x.id));
    return { projects: [p], visits, photos, meta: data.meta.filter(m => pids.has(m.id)) };
  });
}
async function chooseRestore(title, text, options) {
  if (typeof askChoice === 'function' && typeof document !== 'undefined' && document.getElementById?.('choiceSheet')) return askChoice(title, text, options);
  // Fallback without the choice sheet: OK takes the first non-cancel option that changes data.
  const act = options.find(o => o.value === 'go' || o.value === 'replace');
  return confirm(title + '\n\n' + text) ? act.value : null;
}
async function applyProjectCopies(parts) {
  let firstId = null;
  await transaction(STORES, 'readwrite', tx => {
    const qs = STORES.map(n => tx.objectStore(n).getAll()); let count = 0;
    qs.forEach(q => { q.onsuccess = () => { if (++count !== STORES.length) return;
      try {
        const existing = Object.fromEntries(STORES.map((n, i) => [n, qs[i].result]));
        for (const part of parts) {
          const mapped = remapProjectCopy(part, existing);
          if (mapped.oldProjectId) {
            const ids = new Set(existing.visits.filter(v => v.projectId === mapped.oldProjectId).map(v => v.id));
            const gone = new Set(existing.photos.filter(p => ids.has(p.visitId)).map(p => p.id));
            gone.forEach(id => { tx.objectStore('photos').delete(id); tx.objectStore('meta').delete(id); });
            ids.forEach(id => tx.objectStore('visits').delete(id));
            existing.visits = existing.visits.filter(v => !ids.has(v.id));
            existing.photos = existing.photos.filter(p => !gone.has(p.id)); existing.meta = existing.meta.filter(m => !gone.has(m.id));
            existing.projects = existing.projects.filter(p => p.id !== mapped.oldProjectId);
          }
          for (const n of STORES) mapped[n].forEach(r => { tx.objectStore(n).put(r); existing[n].push(r); });
          if (firstId == null) firstId = mapped.projects[0].id;
        }
      } catch (e) { tx.abort(); }
    }; });
  });
  return firstId;
}
async function restoreProjectFile(file) {
  const notBackup = 'This file is not a Site Visit backup. Choose the backup file (RDG-Site-Visit-Backup, ending in .zip or .json), a visit package ZIP, or the Recovery file inside one.';
  let raw;
  if (await isZipFile(file)) { try { raw = await readDataPackage(file, notBackup); } catch (e) { throw new Error(/ZIP|missing|recompressed|incomplete/.test(e.message) ? e.message : notBackup); } }
  else { try { raw = JSON.parse(await file.text()); } catch { throw new Error(notBackup); } }
  const full = raw?.format === 'rdg-sitevisit-backup', single = raw?.format === 'rdg-sitevisit-project';
  if (!full && !single) throw new Error(notBackup);
  if (single && (![2, 3].includes(raw.version) || raw.data?.projects?.length !== 1)) throw new Error('This recovery file is from an older version of the app and cannot be opened here.');
  const data = validateBackup({...raw, format: 'rdg-sitevisit-backup'});
  // Text backups are decoded to check every photo; ZIP photos were never converted, so a header check is enough.
  for (const p of data.photos) if (p.blob && !(raw.version === 3 ? await looksLikeImage(p.blob) : await measure(p.blob))) throw new Error('A photo in this file cannot be opened. Nothing on this phone was changed.');
  const here = new Set((await read('projects')).map(p => p.key));
  const parts = splitProjects(data), matching = parts.filter(x => here.has(x.projects[0].key)), fresh = parts.filter(x => !here.has(x.projects[0].key));
  const n = (k, w) => k + ' ' + w + (k === 1 ? '' : 's');
  const when = raw.createdAt ? ' from ' + new Date(raw.createdAt).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'}) : '';
  const summary = (full ? 'Backup' : 'Recovery file') + when + ': ' + n(parts.length, 'project') + ', ' + n(data.visits.length, 'visit') + ', ' + n(data.photos.filter(p => p.blob).length, 'photo') + '.';
  let apply;
  if (!matching.length) {
    const go = await chooseRestore('Restore this file?', summary + ' Everything in it is added to this phone. Nothing already here is removed.',
      [{label: 'Restore', value: 'go', primary: true, icon: 'restore'}, {label: 'Cancel', value: null}]);
    if (go !== 'go') return;
    apply = fresh;
  } else {
    const names = matching.map(x => x.projects[0].name).join(', ');
    const pick = await chooseRestore(matching.length === 1 ? 'This project is already here' : 'These projects are already here',
      summary + ' Already on this phone: ' + names + '. Which copy do you want to keep?',
      [{label: 'Keep the copy on this phone', value: 'keep', primary: true, icon: 'check', sub: fresh.length ? 'Adds only the other ' + n(fresh.length, 'project') : 'Nothing will change'},
       {label: 'Use the copy in the file', value: 'replace', icon: 'restore', sub: 'Replaces this phone\'s copy, including any newer work on it'},
       {label: 'Cancel', value: null}]);
    if (!pick) return;
    apply = pick === 'replace' ? parts : fresh;
    if (!apply.length) { alert('Nothing changed. Every project in this file is already on this phone.'); return; }
  }
  if (typeof busyShow === 'function') busyShow('Restoring ' + n(apply.length, 'project'));
  dataEpoch++;
  const restoredId = await applyProjectCopies(apply);
  // The file itself is a backup kept off the phone, so count it as the last backup here.
  if (full && raw.createdAt && typeof stored === 'function' && !stored('lastBackup', null)) remember('lastBackup', {at: Date.parse(raw.createdAt) || Date.now()});
  selectedProject = restoredId; await loadState();
  alert('Restored ' + n(apply.length, 'project') + '. ' + (apply.length < parts.length ? 'Projects you kept on this phone were not changed.' : 'Other projects on this phone were not changed.'));
}
function wireCloudUI() {
  on('#galCloud',openCloud);on('#doneCloud',openCloud);
  on('#cloudClose',()=>{$('#cloudSheet').classList.remove('open');$('#cloudFiles').replaceChildren();cloudSession=null;});
  on('#cloudChecked',async()=>{
    if(!cloudSession||cloudSession.missing||!cloudSession.closed)return;
    if(!confirm('Have you checked that the report, photos and project recovery file are saved in your cloud, with no upload pending? This records your confirmation only.'))return;
    const v=await read('visits',cloudSession.visitId);if(!v)return;v.cloudCheckedAt=Date.now();await putV(v);if(visit?.id===v.id)visit=v;
    $('#cloudConfirmed').textContent='Confirmed by you on '+new Date(v.cloudCheckedAt).toLocaleString()+'. Nothing was removed from this phone.';
  });
  on('#reviewCleanup',openCleanup);on('#manageStorage',openCleanup);on('#cleanupClose',()=>$('#cleanupSheet').classList.remove('open'));
}

/* ---------- v19: delete a past report ----------
   Reports are deleted only when no other report depends on them. A later report that carries
   items first noted in this one keeps those items' history (and evidence photos) through it. */
function visitDependents(visits, id) {
  const target = visits.find(v => v.id === id);
  if (!target) return [];
  const refers = v => [...(v.items || []), ...(v.legacyReportItems || []), ...(v.history || []).flatMap(h => h.visit?.items || [])].some(i => i.originVisitId === id);
  return visits.filter(v => v.id !== id && v.projectId === target.projectId && refers(v));
}
async function deleteVisit(id) {
  let removed = null, blockedBy = null;
  await transaction(['visits', 'photos', 'meta'], 'readwrite', tx => {
    const vq = tx.objectStore('visits').getAll(), pq = tx.objectStore('photos').index('visitId').getAll(id);let loaded = 0;
    const ready = () => { if (++loaded !== 2) return;
      const deps = visitDependents(vq.result, id);
      if (deps.length) { blockedBy = deps; return; }
      for (const p of pq.result) { tx.objectStore('photos').delete(p.id); tx.objectStore('meta').delete(p.id); }
      tx.objectStore('visits').delete(id); removed = pq.result.map(p => p.id);
    };
    vq.onsuccess = ready; pq.onsuccess = ready;
  });
  if (blockedBy) throw new Error('This report cannot be deleted because ' + blockedBy.map(visitLabel).join(', ') + ' carries items first noted in it. Delete the later report first, or keep both.');
  if (removed && typeof dropThumbs === 'function') dropThumbs(removed);
  return removed;
}

/* ---------- v19: share a project setup or its room names ----------
   The share is a link with the setup in the part after #, so it works by text or email with no
   server. Nothing else (visits, photos, reports, contact details of the sender) is included. */
const SHARE_FORMAT = 'rdg-sv-share';
function b64urlEncode(text) { const bytes = new TextEncoder().encode(text); let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64urlDecode(code) { let s = code.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0))); }
const shareStr = v => typeof v === 'string' ? v.trim().slice(0, 300) : '';
function sharePayload(project, kind) {
  const p = {name: project.name, number: project.number || ''};
  if (kind === 'project') for (const k of ['address', 'client', 'contact', 'phone', 'email']) if (project[k]) p[k] = project[k];
  return {f: SHARE_FORMAT, v: 1, kind, project: p, rooms: [...(project.locations || [])]};
}
function shareBase() { const href = (typeof location !== 'undefined' && location.href) || ''; return href.split('#')[0].split('?')[0]; }
function shareLink(payload) { return shareBase() + '#share=' + b64urlEncode(JSON.stringify(payload)); }
function shareMessage(payload) {
  const n = payload.rooms.length, rooms = n + (n === 1 ? ' room' : ' rooms');
  const what = payload.kind === 'project' ? 'Project setup for ' + payload.project.name + ' (' + rooms + ')' : 'Room names for ' + payload.project.name + ' (' + rooms + ')';
  return 'RDG Site Visit: ' + what + '.\n\nTap to add it:\n' + shareLink(payload) + '\n\nUsing Site Visit from your home screen? Copy this message, open the app, and tap Add shared project.';
}
/* Accepts the whole message, the link, or just the code. Returns a cleaned payload or throws. */
function parseShare(text) {
  const m = String(text || '').match(/share=([A-Za-z0-9_-]+)/) || String(text || '').trim().match(/^([A-Za-z0-9_-]{16,})$/);
  if (!m) throw new Error('No shared project found. Paste the whole message or link your coworker sent.');
  let raw; try { raw = JSON.parse(b64urlDecode(m[1])); } catch { throw new Error('This share link is incomplete. Ask your coworker to send it again, or copy the whole link.'); }
  if (raw?.f !== SHARE_FORMAT || raw.v !== 1 || !['project', 'rooms'].includes(raw.kind) || !raw.project || !shareStr(raw.project.name)) throw new Error('This is not a Site Visit share link.');
  const project = {name: shareStr(raw.project.name), number: shareStr(raw.project.number)};
  if (raw.kind === 'project') for (const k of ['address', 'client', 'contact', 'phone', 'email']) project[k] = shareStr(raw.project[k]);
  const rooms = [];
  for (const r of Array.isArray(raw.rooms) ? raw.rooms : []) { const name = shareStr(r).slice(0, 120); if (name && !rooms.some(x => locationKey(x) === locationKey(name))) rooms.push(name); }
  return {kind: raw.kind, project, rooms: rooms.slice(0, 2000)};
}
function projectKeyFor(p) { return p.number ? 'number:' + p.number.toLowerCase() : 'name:' + p.name.toLowerCase(); }
/* Rooms are added to a project's saved list; names already there are kept as they are. */
function mergeRooms(list, rooms) {
  const out = [...(list || [])];let added = 0;
  for (const r of rooms) if (!out.some(x => locationKey(x) === locationKey(r))) { out.push(r); added++; }
  return {list: out, added, already: rooms.length - added};
}
/* Asks where the share goes, then saves it. Returns a summary, or null when canceled. */
async function importShared(share) {
  const all = await read('projects'), key = projectKeyFor(share.project), match = all.find(p => p.key === key);
  const n = share.rooms.length, rooms = n + (n === 1 ? ' room' : ' rooms'), label = p => p.name + (p.number ? ' · ' + p.number : '');
  let target = null, create = false;
  if (share.kind === 'project') {
    const pick = await askChoice(match ? 'You already have this project' : 'Add this project?',
      match ? label(match) + ' is already on this phone. Add the shared ' + rooms + ' to it? Its details stay as they are; empty fields are filled in.' : label(share.project) + (share.project.address ? ', ' + share.project.address : '') + ', with ' + rooms + '.',
      [{label: match ? 'Add the rooms to ' + match.name : 'Add project', value: 'go', primary: true, icon: 'plus'}, {label: 'Cancel', value: null}]);
    if (pick !== 'go') return null;
    if (match) target = match; else create = true;
  } else {
    if (!n) throw new Error('This share has no room names in it.');
    const sorted = [...all].sort((a, b) => Number(b.key === key) - Number(a.key === key) || Number(b.id === selectedProject) - Number(a.id === selectedProject) || a.name.localeCompare(b.name));
    const options = sorted.map(p => ({label: 'Add to ' + p.name, value: 'p' + p.id, icon: 'plus', primary: p.key === key || (!match && p.id === selectedProject), sub: (p.number ? 'No. ' + p.number + ' · ' : '') + (p.locations || []).length + ' rooms now'}));
    if (!match) options.push({label: 'New project: ' + share.project.name, value: 'new', icon: 'plus', sub: 'Creates the project with these rooms'});
    options.push({label: 'Cancel', value: null});
    const pick = await askChoice('Add ' + rooms + '?', 'Room names shared from ' + label(share.project) + '. Which project should they go in?', options);
    if (!pick) return null;
    if (pick === 'new') create = true; else target = all.find(p => 'p' + p.id === pick);
  }
  if (create) {
    const record = {name: share.project.name, number: share.project.number, key, locations: [...share.rooms]};
    for (const k of ['address', 'client', 'contact', 'phone', 'email']) record[k] = share.project[k] || '';
    const id = await put('projects', record);
    return {projectId: id, text: 'Added ' + share.project.name + ' with ' + rooms + '.'};
  }
  const merged = mergeRooms(target.locations, share.rooms), next = {...target, locations: merged.list};
  if (share.kind === 'project') for (const k of ['address', 'client', 'contact', 'phone', 'email']) if (!next[k] && share.project[k]) next[k] = share.project[k];
  await put('projects', next);
  return {projectId: target.id, text: 'Added ' + merged.added + (merged.added === 1 ? ' room' : ' rooms') + ' to ' + target.name + '.' + (merged.already ? ' ' + merged.already + ' were already there.' : '')};
}
