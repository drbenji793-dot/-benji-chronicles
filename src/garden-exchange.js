import {eventChangeFields,eventImpact} from './story-connections.js';
import {currentPlanning,currentBookBrief} from './current-book-brief.js';
import {appearsIn} from './dsl-master.js';
const fields={life:['name','role','biography','ageNote','appearance','voice','desire','fear','beliefs','past','secret','relationships','arc','current','lifeStatus'],event:['title','summary','outcome','characters','location','dateLabel','notes','goal','knowledge','readerKnows','cause','themeTags',...eventChangeFields.map(([key])=>key)],story:['summary','hypothesis']};
export function reviewPackage({book,branch,chapters},question=''){
 if(!branch)throw Error('Create the book workspace first.');
 return {format:'benji-garden-review',version:1,timezone:'UTC',exportedAt:new Date().toISOString(),book:{id:book.id,title:book.title,language:book.language},branch:{id:branch.id,name:branch.name,revision:branch.revision},request:question,currentBookBrief:currentBookBrief({book,branch,chapters}),planning:currentPlanning(branch.data),chapters:structuredClone(chapters||[]),instructions:'Read currentBookBrief first. Proposed and unclassified records are not approvals. Review this book using only the supplied records. Distinguish recorded facts from suggestions. Follow the author request. Return an explanation and a downloadable JSON proposal matching responseTemplate. Preserve bookId, branchId and baseRevision. Each change edits one allowed field on an existing record. Copy the exact original field value into before; use null for missing fields. Put the replacement string in after. Include a reason. Do not invent IDs, delete records, or rewrite manuscript text in this proposal. Chapter revisions may be discussed separately. Return only supported changes, not a replacement world. An empty changes array means no proposed edits. Import requires author review and approval.',allowedFields:fields,responseTemplate:{format:'benji-garden-proposal',version:1,bookId:book.id,branchId:branch.id,baseRevision:branch.revision,changes:[]},changeExample:{kind:'life',id:'COPY_EXISTING_CHARACTER_ID',field:'biography',before:'COPY_EXACT_CURRENT_VALUE_OR_NULL',after:'Proposed replacement',reason:'Explain why'}};
}
function record(data,c){return c.kind==='story'?data:(c.kind==='life'?data.characters:data.events)?.find(r=>r.id===c.id&&!r.archived);}
export function validateProposal(p,context){
 if(!p||p.format!=='benji-garden-proposal'||p.version!==1)throw Error('Choose a Benji Garden proposal JSON returned by GPT, not the original export.');
 if(p.bookId!==context.book.id||p.branchId!==context.branch.id)throw Error('This proposal belongs to another book or branch. Open the matching Garden.');
 if(p.baseRevision!==context.branch.revision)throw Error('The book changed after this export. Export the latest version and ask GPT to revise its proposal.');
 if(!Array.isArray(p.changes)||p.changes.length>500)throw Error('A proposal must contain at most 500 field changes.');
 const seen=new Set();
 for(const c of p.changes){
  if(!c||!Object.hasOwn(fields,c.kind)||!fields[c.kind].includes(c.field))throw Error('The proposal contains an unsupported field. Manuscript changes require a separate chapter review.');
  if(c.kind!=='story'&&typeof c.id!=='string')throw Error('A record ID is missing.');
  const r=record(context.branch.data,c);if(!r)throw Error('A proposed record does not exist in this book.');
  const key=JSON.stringify([c.kind,c.kind==='story'?'':c.id,c.field]);if(seen.has(key))throw Error('The same field appears twice. Ask GPT for one final proposal per field.');seen.add(key);
  if(typeof c.after!=='string'||c.after.length>100000||typeof c.reason!=='string'||c.reason.length>10000)throw Error('Each change needs replacement text and a reason within the size limit.');
  if(JSON.stringify(r[c.field]??null)!==JSON.stringify(c.before))throw Error('An original value does not match the saved book. Export again before reviewing.');
  if(['name','title'].includes(c.field)&&!c.after.trim())throw Error('Names and event titles cannot be empty.');
  if(c.field==='current'&&!['','good','evil','between','apart'].includes(c.after))throw Error('Invalid relationship to the currents.');
  if(c.field==='lifeStatus'&&!['living','ended'].includes(c.after))throw Error('Invalid life status.');
 }
 return p.changes;
}
export function proposalImpact(data,c){
 const events=c.kind==='life'?(data.events||[]).filter(e=>{const r=record(data,c);return appearsIn(e,r?.name,r?.aliases);}):c.kind==='event'?(data.events||[]).filter(e=>e.id===c.id):[];
 const ids=new Set(events.map(e=>e.id));let changed=true;while(changed){changed=false;for(const link of data.links||[]){if(ids.has(link.from)&&!ids.has(link.to)){ids.add(link.to);changed=true;}}}
 return (data.events||[]).filter(e=>ids.has(e.id)&&!e.archived).map(e=>({id:e.id,title:e.title,chapter:e.sourceChapter||null}));
}
export function applyProposal(p,context,indices){
 validateProposal(p,context);const selected=[...new Set(indices)];if(!selected.length)throw Error('Select at least one change to approve.');
 const d=structuredClone(context.branch.data),affected=new Set();
 for(const i of selected){if(!Number.isInteger(i)||i<0||i>=p.changes.length)throw Error('Invalid selection.');const c=p.changes[i],r=record(d,c);proposalImpact(context.branch.data,c).forEach(e=>affected.add(e.id));
  if(c.kind==='life'&&c.field==='name'&&r.name!==c.after)r.aliases=[...new Set([...(Array.isArray(r.aliases)?r.aliases:[]),r.name].filter(Boolean))];
  r[c.field]=c.after;
 }
 d.workshop={...d.workshop,reviewEventIds:[...new Set([...(d.workshop?.reviewEventIds||[]),...affected])],synopsisNeedsReview:!selected.some(i=>p.changes[i].kind==='story'&&p.changes[i].field==='summary')};
 d.garden={...d.garden,lastImport:{at:new Date().toISOString(),baseRevision:p.baseRevision,approvedChanges:selected.map(i=>p.changes[i])}};
 return d;
}
const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function focusedReview(context,request,scope={kind:'book'}){
 const p=reviewPackage(context,request);p.scope=scope;
 if(scope.kind==='book')return p;
 const d=p.planning;let ids=new Set();
 if(scope.kind==='event'){if(!(d.events||[]).some(e=>e.id===scope.id))throw Error('Event no longer available.');ids.add(scope.id);eventImpact(d,scope.id).forEach(x=>ids.add(x.event.id));}
 if(scope.kind==='character'){const c=(d.characters||[]).find(c=>c.id===scope.id);if(!c)throw Error('Character no longer available.');(d.events||[]).filter(e=>appearsIn(e,c.name,c.aliases)).forEach(e=>ids.add(e.id));}
 if(scope.kind==='page'){p.scope={...scope,note:'Current saved page, including its relevant context'};if(scope.tab==='storyline')(d.events||[]).forEach(e=>ids.add(e.id));else if(scope.tab==='characters')(d.events||[]).forEach(e=>ids.add(e.id));}
 const selected=[...ids];for(const l of d.links||[])if(selected.includes(l.from)||selected.includes(l.to)){ids.add(l.from);ids.add(l.to);}
 d.events=(d.events||[]).filter(e=>ids.has(e.id));d.characters=(d.characters||[]).filter(c=>c.id===scope.id||d.events.some(e=>appearsIn(e,c.name,c.aliases))||(scope.kind==='page'&&scope.tab==='characters'));
 d.links=(d.links||[]).filter(l=>ids.has(l.from)&&ids.has(l.to));const people=new Set(d.characters.map(c=>c.id));d.relationships=(d.relationships||[]).filter(r=>people.has(r.from)||people.has(r.to));
 const chapters=new Set(d.events.map(e=>Number(e.sourceChapter)).filter(Number.isFinite));p.chapters=p.chapters.filter(c=>chapters.has(Number(c.chapter_number)));delete d.storyDraft;
 p.instructions+=' Focus on the selected scope. Review linked causes and consequences, changes in knowledge and relationships, and later chapters. Identify affected records and explain why. Context outside this export may be missing: flag it and do not claim a complete review of the whole story.';
 return p;
}
export function readableReview(p){
 const section=(title,rows)=>'<section><h2>'+h(title)+'</h2>'+rows.map(r=>'<article><h3 dir="auto">'+h(r.name||r.title||r.id)+'</h3>'+Object.entries(r).filter(([k,v])=>typeof v==='string'&&!['id','name','title'].includes(k)).map(([k,v])=>'<p><b>'+h(k)+':</b> <span dir="auto">'+h(v)+'</span></p>').join('')+'</article>').join('')+'</section>';
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Story Review</title><style>body{max-width:820px;margin:auto;padding:20px;background:#f5eee2;color:#263f34;font:16px/1.65 system-ui}article{border-top:1px solid #c6b79f;padding:12px 0}p{white-space:pre-wrap;overflow-wrap:anywhere}details{font-size:12px;background:#ddd8;padding:8px;border-radius:6px}</style><h1 dir="auto">'+h(p.book.title)+'</h1><details><summary>Current</summary><p>Revision '+h(p.branch.revision)+' · '+h(p.exportedAt)+' · UTC</p></details><h2>Review instructions</h2><p>'+h(p.request)+'</p><p>'+h(p.instructions)+'</p><h2>Story brief</h2><p dir="auto">'+h(p.planning.summary||'')+'</p>'+section('Characters',p.planning.characters||[])+section('Events',p.planning.events||[])+section('Relationships',p.planning.relationships||[])+'<h2>Machine readable review package</h2><p>The embedded JSON contains source revisions, current guidance and the proposal format. Return a proposal JSON for Import for Review.</p><script id="review-data" type="application/json">'+JSON.stringify(p).replace(/</g,'\\u003c')+'</script></html>';
}
export function gardenExchange(ctx){
 const context=()=>({book:ctx.book(),branch:ctx.branch(),chapters:ctx.chapters?.()||[]});
 function exportForGPT(scope={kind:'book'}){
  if(scope?.type)scope={kind:'book'};
  const m=ctx.modal('Export for GPT','<p>Download a readable HTML review file to open or share with GPT.</p><label>What would you like GPT to work on?<textarea data-request rows="3" placeholder="Revise the selected material. Check causes, consequences and later chapters. List affected records and missing context; preserve unrelated text."></textarea></label><p>The file includes private author notes and secrets recorded in this book.</p><button data-download>Download Review Package</button><p data-result role="status"></p>');if(!m)return;
  m.querySelector('[data-download]').onclick=async()=>{try{await ctx.loadPlanning?.();await ctx.loadChapters?.();const p=focusedReview(context(),m.querySelector('[data-request]').value,scope);ctx.download(readableReview(p),'Story_Review_v'+p.branch.revision+'.html','text/html;charset=utf-8');m.querySelector('[data-result]').textContent='HTML prepared. Share it with GPT, then import its proposal JSON for review.';}catch(e){m.querySelector('[data-result]').textContent=e.message;}};
 }
 function importForReview(){
  const m=ctx.modal('Import for Review','<p>Choose the proposal JSON returned by GPT. Reading a file makes no changes to the book.</p><input data-file type="file" accept=".json,application/json"><p data-result role="status"></p><div data-review></div>');if(!m)return;
  const status=m.querySelector('[data-result]'),review=m.querySelector('[data-review]');let pending=false;
  m.querySelector('[data-file]').onchange=async e=>{if(pending)return;review.innerHTML='';status.textContent='Reading proposal…';const file=e.target.files?.[0];if(!file){status.textContent='';return;}try{if(file.size>8*1024*1024)throw Error('Choose a proposal smaller than 8 MB.');const p=JSON.parse(await file.text()),snapshot=context();const changes=validateProposal(p,snapshot);if(!m.isConnected)return;status.textContent=changes.length+' proposed changes. Select only the changes you approve.';
   review.innerHTML=changes.map((c,i)=>{const r=record(snapshot.branch.data,c),impact=proposalImpact(snapshot.branch.data,c);return '<section style="border-top:1px solid #b7a58c;padding:16px 0"><label><input type="checkbox" data-change="'+i+'"> '+h(r.name||r.title||'Story')+' · '+h(c.field)+'</label><details open><summary>Before and proposed text</summary><strong>Before</strong><p dir="auto" style="white-space:pre-wrap">'+h(c.before??'Not recorded')+'</p><strong>Proposed</strong><p dir="auto" style="white-space:pre-wrap">'+h(c.after)+'</p></details><p dir="auto">'+h(c.reason)+'</p><details><summary>'+impact.length+' connected events to review</summary>'+impact.map(x=>'<p dir="auto">'+h(x.title)+(x.chapter?' · Chapter '+h(x.chapter):'')+'</p>').join('')+'<p>These are recorded links, not an automatic judgment of narrative consequences.</p></details></section>';}).join('')+(changes.length?'<p>Approval updates selected planning fields. Chapter prose and published Storyline are unchanged. Previous values remain in revision history.</p><button data-approve disabled>Approve Selected Changes</button>':'');
   const approve=review.querySelector('[data-approve]');if(!approve)return;const selections=()=>[...review.querySelectorAll('[data-change]:checked')].map(x=>Number(x.dataset.change));review.onchange=()=>{approve.disabled=pending||!selections().length;};approve.onclick=async()=>{if(pending)return;pending=true;approve.disabled=true;m.querySelector('[data-file]').disabled=true;try{const d=applyProposal(p,context(),selections());await ctx.save(d,'Approve GPT Garden proposal');ctx.close();ctx.render();}catch(err){status.textContent=err.message;}finally{pending=false;if(m.isConnected){approve.disabled=!selections().length;m.querySelector('[data-file]').disabled=false;}}};
  }catch(err){status.textContent=err.message;review.innerHTML='';}};
 }
 return {exportForGPT,importForReview};
}
