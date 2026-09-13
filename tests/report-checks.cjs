const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),docx=require(path.join(root,'docx.umd.js'));
const ctx={window:{docx},Blob,File,Date,Uint8Array,Uint32Array,TextEncoder,fetch:async()=>({ok:false})};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'report.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(root,'archive.js'),'utf8'),ctx);
(async()=>{
 const visit={project:'Test Project',projNum:'T01',num:2,date:Date.UTC(2026,8,13,12),closed:true,revision:1,issuedAt:Date.UTC(2026,8,13,14),revisionReason:'Updated safety observation',preparedBy:'Test Architect',preparedCompany:'Redline Design Group',preparedPhone:'555-0100',preparedEmail:'architect@example.com',generalNotes:'Summary of site conditions.',attendees:'Test Team',weather:'Clear',temp:'72 F',distribution:'Owner, Contractor, File',items:[{id:'item:1:1',ref:'001.01',firstVisitNum:1,firstNoted:Date.UTC(2026,8,1),note:'Install temporary guard',status:'Still open',tag:'Safety',owner:'GC',due:'2026-09-20'}]};
 const report=await ctx.window.SVReport.buildReport(visit,[]);assert(report.size>1000);const name=ctx.window.SVReport.reportFileName(visit);assert.equal(name,'T01_SVR-002-R1_2026-09-13.docx');assert(ctx.window.SVReport.reportFileName({...visit,editing:true}).includes('DRAFT'));
 const file=new File([report],name,{type:report.type});const archive=await ctx.makeVisitZip(ctx.visitArchiveEntries('SVR-002-R1',file,[],new File(['Filename,Observation\n'],'Index.csv'),new File(['{}'],'Recovery.json')),'T01_SVR-002-R1.zip');
 if(process.argv[2]){fs.mkdirSync(process.argv[2],{recursive:true});fs.writeFileSync(path.join(process.argv[2],name),Buffer.from(await report.arrayBuffer()));fs.writeFileSync(path.join(process.argv[2],archive.name),Buffer.from(await archive.arrayBuffer()));}
 console.log('PASS: real Word generation with profile, summary, safety item, revision metadata; unified report name; draft suffix; real revision ZIP creation.');
})().catch(e=>{console.error(e);process.exitCode=1});
