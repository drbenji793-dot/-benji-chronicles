import {clueAudit} from './clue-audit.js';
import {clueProposalImpact,clueProposalImpactHTML} from './clue-impact-preview.js';
import {publicationMetadataPath,publicationMetadata} from './publication-source.js';
import {clueProvenance} from './clue-provenance.js';
import {synopsisAuthorityAudit,synopsisAuthorityHTML} from './synopsis-authority.js';
import {sourceInventory} from './source-inventory.js';
import {KNOWLEDGE_STATES} from './character-knowledge.js';
import {escapeHTML as h} from './dsl-engine.js';
import {technicalPanel} from './revision-stamp.js';
import {handoffCSS} from './handoff-format.js';
import {activeRecord} from './current-book-brief.js';
import {toolProposalReview,clueRecords,clueNotices,knowledgeAt,synopsisSections,selectedSynopsis,makeToolProposal,storeToolProposal,reviewToolProposal,verifyToolProposal,addSynopsisSection,sourcePackage} from './source-tools.js';

const labels={truth:'Underlying truth',belief:'Apparent reader belief',setup:'Setup evidence',outcome:'Consequence'};
const btn=(text,attr)=>'<button type="button" '+attr+'>'+text+'</button>';
const p=text=>'<p dir="auto" style="white-space:pre-wrap;overflow-wrap:anywhere">'+h(text||'Not recorded')+'</p>';
export function sourceAuditHTML(audit){
 if(!audit)return '<p>Source classifications were not included in this older review package.</p>';
 const labels={
  'Approved planning metadata':'Recorded approvals',
  'Proposal only':'Proposals, not accepted facts',
  'Recorded conflict':'Conflicting source records',
  'Unresolved or pending':'Open and pending decisions',
  'Written source, planning approval unknown':'Written references, approval unverified',
  'Unclassified':'Unclassified source records'
 };
 return '<details data-source-export-audit><summary>Source classifications ('+(audit.entries||[]).length+' current)</summary>'+
  '<p>Recorded source status only. A review export never establishes manuscript approval. Superseded records are excluded from ordinary source lists.</p>'+
  Object.entries(labels).map(([key,label])=>{
   const entries=audit.groups?.[key]||[];
   return '<details><summary>'+h(label)+' ('+entries.length+')</summary>'+
    entries.map(entry=>'<p dir="auto">'+h(entry.kind)+' · '+h(entry.id||'No ID')+' · r'+h(entry.revision??'Unknown')+' · '+h(entry.recordedStatus||'Status not recorded')+'</p>').join('')+
    (!entries.length?'<p>None recorded</p>':'')+'</details>';
  }).join('')+
  '<details><summary>Retired records excluded</summary>'+
  Object.entries(audit.retiredCounts||{}).map(([kind,total])=>'<p>'+h(kind)+': '+h(total)+'</p>').join('')+
  '</details></details>';
}
export function sourceReviewHTML(pkg){
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Source review</title><style>'+handoffCSS+'</style><body><h1>'+ (pkg.kind==='clue'?'Twists &amp; Clues':'Synopsis')+'</h1><p>'+h(pkg.audience)+' · '+h(pkg.scope)+' · '+h(pkg.view)+'</p>'+pkg.targets.map(t=>'<section><h2 dir="auto">'+h(t.title||t.id)+'</h2>'+p(t.text||t.summary)+(pkg.kind==='clue'?Object.entries(labels).map(([k,label])=>'<h3>'+label+'</h3>'+p(t[k])).join(''):'')+'<p>Status: '+h(t.status||'Unclassified')+'</p><details><summary>Linked sources and review data</summary><pre>'+h(JSON.stringify(t,null,2))+'</pre></details></section>').join('')+(!pkg.targets.length?'<p>No synopsis or clue records saved for this selection. Nothing has been inferred from unwritten plans.</p>':'')+sourceAuditHTML(pkg.sourceAudit)+'<details><summary>Current context and pending decisions</summary><pre>'+h(JSON.stringify({sources:pkg.sources,pendingReviews:pkg.pendingReviews},null,2))+'</pre></details><details><summary>Review instructions</summary>'+p(pkg.instructions)+'</details>'+technicalPanel('<p>Book '+h(pkg.bookId)+' · Path '+h(pkg.branchId)+' · Source r'+h(pkg.baseRevision)+'</p><p>Exported '+h(pkg.exportedAt)+'</p><p>Source modification times remain in individual records. Export time does not replace them.</p>')+'</body></html>';
}
export function sourceToolsUI(c){
 let view='short',scope='plan',character='',order='',eventFilter='',openedRequest=false,publicationInfo=null,publicationLoadStarted=false;
 const context=()=>({bookId:c.bookId,branchId:c.branch().id,baseRevision:c.branch().revision,writer:c.writer()});
 const active=k=>(c.model()[k]||[]).filter(activeRecord);
 const eventOptions=()=>({'':'Not recorded',...Object.fromEntries(active('events').map(e=>[e.id,e.title]))});
 const chapterOptions=()=>({'':'Not recorded',...Object.fromEntries(c.chapters().filter(activeRecord).map(x=>[x.id,x.title||'Chapter '+x.chapter_number]))});
 const end=()=>'<p class="dsl-form-status" role="status"></p><button type="submit">Save proposal</button>';
 const link=(kind,id)=>{const row=active(kind).find(x=>x.id===id);return '<a dir="auto" href="'+h(c.route('dsl',{dslview:kind==='characters'?'characters':'reading',focuskind:kind==='characters'?'character':'event',focusid:id}))+'">'+h(row?.name||row?.title||'Unavailable source')+'</a>';};
 function toolbar(kind){return '<div class="dsl-inline">'+btn('Export HTML','data-tool-export="'+kind+'"')+btn('Share HTML','data-tool-share="'+kind+'"')+btn('Review package','data-tool-package="'+kind+'"')+btn('Import proposal','data-tool-import="'+kind+'"')+'</div><p class="dsl-help">Writer workspace. Exports contain spoilers. Imported comments remain proposals until reviewed.</p>';}
 function proposals(kind){
  const rows=(c.model().workshop?.toolProposals||[]).filter(x=>x.kind===kind&&x.bookId===c.bookId&&x.branchId===c.branch().id);
  const pending=x=>['proposed','deferred'].includes(x.status)||(x.status==='approved'&&(x.verification?.status!=='verified'||!toolProposalReview(c.model(),x,{chapters:c.chapters()}).ready));
  return '<details><summary>Change proposals ('+rows.filter(pending).length+')</summary>'+rows.map(x=>{
   const check=x.status==='approved'?toolProposalReview(c.model(),x,{chapters:c.chapters()}):null;
   const actions=['proposed','deferred'].includes(x.status)?btn('Review change','data-tool-review="'+h(x.id)+'"'):x.status==='approved'&&pending(x)?btn(check?.stale?'Review changed sources':'Verify saved change','data-tool-verify="'+h(x.id)+'"'):'';
   return '<details><summary dir="auto">'+h(x.reason)+' · '+h(x.status)+'</summary><p>Proposed by '+h(x.author)+'</p>'+actions+'<p>'+h(check?.reason||'Not applied')+'</p>'+(x.verification?.note?p(x.verification.note):'')+'</details>';
  }).join('')+'</details>';
 }
 function chapterSource(e){if(!e.sourceId)return '<p>No saved chapter linked. Planned placement is not prose evidence.</p>';const chapter=c.chapters().find(x=>x.id===e.sourceId);if(!chapter)return '<p>Linked chapter unavailable.</p>';const href=c.chapterLink?.(chapter.chapter_number);return '<p>Saved chapter: '+(href?'<a dir="auto" href="'+h(href)+'">'+h(chapter.title||'Chapter '+chapter.chapter_number)+'</a>':h(chapter.title||chapter.id))+' · r'+h(chapter.revision)+' · Linked at r'+h(e.sourceRevision??'Unknown')+'</p>';}
 function sourceInventoryHTML(){
  const audit=sourceInventory(c.model()),n=audit.counts;
  return '<details data-source-inventory><summary>Current source inventory ('+n.active+' active · '+n.retired+' retired)</summary><p>Read only. These labels reflect recorded status and type, not inferred literary approval. Classified Twists: '+n.classifiedTwists+' · Other active events: '+n.otherActive+' · Conflicts: '+n.conflicts+' · Unclassified: '+n.unclassified+'.</p>'+
   audit.rows.map(row=>'<details><summary dir="auto">'+h(row.title)+' · '+h(row.classification)+'</summary><p>Event type: '+h(row.type||'Not recorded')+' · Recorded status: '+h(row.status||'Not recorded')+' · Revision: '+h(row.revision??'Not recorded')+'</p><p>'+h(row.inTwists?(row.retired?'Retired from Twists view':'Included in Twists filter'):'Not in Twists filter')+'</p>'+row.warnings.map(w=>'<p>'+h(w)+'</p>').join('')+(row.id&&!row.retired?link('events',row.id):'')+'</details>').join('')+'</details>';
 }
 function plannedChapter(id,label){
  if(!id)return '<p>'+label+': Not planned</p>';
  const chapter=c.chapters().find(x=>x.id===id&&activeRecord(x));
  if(!chapter)return '<p>'+label+': Saved chapter unavailable. Review source before approval.</p>';
  const href=c.chapterLink?.(chapter.chapter_number);
  return '<p>'+label+' (planned, not evidence in saved prose): '+(href?'<a dir="auto" href="'+h(href)+'">'+h(chapter.title||'Chapter '+chapter.chapter_number)+'</a>':h(chapter.title||chapter.id))+' · r'+h(chapter.revision??'Unknown')+'</p>';
 }
 function clueMetadataHTML(e){
  const meta=clueProvenance(c.model(),e);
  return '<details data-clue-metadata><summary>Record details</summary>'+
   '<p>Stable ID: '+h(meta.id||'Not recorded')+' · Classification: '+h(meta.type)+'</p>'+
   '<p>Recorded status: '+h(meta.savedStatus)+' · Record state: '+h(meta.recordStatus)+' · Proposal review: '+h(meta.proposalReview)+'</p>'+
   '<p>Linked chapter revision: '+h(meta.sourceRevision??'Not recorded')+' · Record revision: '+h(meta.savedRevision??'Not recorded')+'</p>'+
   '<p>Modified by: '+h(meta.modifiedBy||'Not recorded')+' · Modified at: '+h(meta.modifiedAt||'Not recorded')+'</p>'+
   '<p>Replacement: '+h(meta.replacementState)+'</p>'+
   (meta.replacementId?'<p>Replacement ID: '+h(meta.replacementId)+'</p>':'')+
   (meta.replacementTitle?'<p>Current replacement: '+link('events',meta.replacementId)+'</p>':'')+
   '<p>Links are planning evidence only. A replacement never automatically retires the original or alters manuscript prose.</p></details>';
 }
 function requiredKnowledgeHTML(event){
  const rows=event.requiredKnowledge||[];
  return '<details data-required-knowledge><summary>Knowledge required for this scene ('+rows.length+')</summary>'+
    '<p>Requirements are explicit planning records, not inferred character thoughts or manuscript proof.</p>'+
    rows.map(row=>{
     const holder=row.characterId==='reader'?'Reader':active('characters').find(c=>c.id===row.characterId)?.name||'Unavailable holder';
     const fact=active('events').find(e=>e.id===row.factEventId)?.title||'Unavailable fact';
     return '<p dir="auto">'+h(holder)+' · '+h(fact)+' · '+h(row.note)+'</p>';
    }).join('')+(!rows.length?'<p>No required knowledge links recorded.</p>':'')+'</details>';
 }
 function cluesHTML(){const d=c.model(),facts=clueRecords(d),audit=new Map(clueAudit(d,c.chapters()).rows.map(r=>[r.event.id,r]));return '<h2>Twists &amp; Clues</h2>'+toolbar('clue')+'<p>'+facts.length+' classified records. '+active('events').filter(x=>!['twist','clue','secret'].includes(x.type)).length+' other events remain unclassified for this tool.</p>'+btn('Classify an existing event','data-tool-classify')+sourceInventoryHTML()+facts.map(e=>'<details class="dsl-event" data-node="'+h(e.id)+'"><summary dir="auto">'+h(e.title)+' · '+h(e.type)+' · '+h(e.status||'Unclassified')+'</summary>'+Object.entries(labels).map(([k,label])=>'<strong>'+label+'</strong>'+p(e[k])).join('')+'<p>Setup: '+(e.setupEventId?link('events',e.setupEventId):'Not linked')+' · Reinforcement: '+(e.reinforcementEventId?link('events',e.reinforcementEventId):'Not linked')+' · Reveal: '+(e.revealEventId?link('events',e.revealEventId):'Not linked')+'</p><p>'+(e.characterIds||[]).map(id=>link('characters',id)).join(' · ')+'</p>'+chapterSource(e)+plannedChapter(e.setupChapterId,'Setup chapter')+plannedChapter(e.revealChapterId,'Reveal chapter')+clueMetadataHTML(e)+requiredKnowledgeHTML(e)+btn('Review required knowledge','data-tool-required="'+h(e.id)+'"')+btn('Edit proposal','data-tool-clue="'+h(e.id)+'"')+btn('Knowledge','data-tool-knowledge="'+h(e.id)+'"')+btn('Export card','data-tool-card="'+h(e.id)+'"')+'<details><summary>Source review · '+h(audit.get(e.id).review.label)+'</summary><p>Event revision '+h(e.revision??'Not recorded')+'</p>'+audit.get(e.id).notices.map(n=>p(n.text)+'<small>'+h(n.kind)+' · '+h(n.confidence)+'</small>').join('')+(audit.get(e.id).review.review?p(audit.get(e.id).review.review.note):'')+(audit.get(e.id).notices.length?btn('Review notices','data-review-clue="'+h(e.id)+'"'):'<p>No notices from these metadata checks.</p>')+'<p>Metadata notices are not proven story errors. Record intentional gaps with a review reason.</p></details>'+(e.knowledge?'<details><summary>Unattributed legacy knowledge note</summary>'+p(e.knowledge)+'<p>This note is not assigned to any character automatically.</p></details>':'')+'</details>').join('')+(!facts.length?'<p>No classified clues yet. Classifying an event requires a reviewed proposal. No story facts are invented to fill this page.</p>':'')+(c.knowledgeHTML?c.knowledgeHTML():knowledgeHTML())+legacyKnowledgeHTML()+proposals('clue');}
 function legacyKnowledgeHTML(){return '<details><summary>Event knowledge and source inventory</summary><p>General notes remain unattributed. Existing knowledge records retain their recorded state.</p>'+active('events').map(e=>'<details><summary dir="auto">'+h(e.title)+' · '+h(e.type||'Unclassified')+' · '+h(e.status||'Unclassified')+'</summary>'+p(e.knowledge)+p(e.readerKnows)+btn('Edit event knowledge','data-knowledge-add="'+h(e.id)+'"')+'</details>').join('')+'</details>';}
 function knowledgeHTML(){const records=knowledgeAt(c.model(),{characterId:character||undefined,eventId:eventFilter||undefined,readingOrder:order===''?Infinity:Number(order)});return '<details><summary>Who knows what ('+records.length+')</summary><div class="dsl-inline">'+c.select('holder','Holder',{'':'Everyone',reader:'Reader',...Object.fromEntries(active('characters').map(x=>[x.id,x.name]))},character).replace('name="holder"','data-knowledge-holder')+c.field('order','Known by reading order; blank means all',order,'number').replace('name="order"','data-knowledge-order')+c.select('eventFilter','Acquisition event',{'':'All events',...Object.fromEntries(active('events').map(e=>[e.id,e.title]))},eventFilter).replace('name="eventFilter"','data-knowledge-filter-event')+'</div>'+records.map(k=>'<article data-knowledge-event="'+h(k.eventId)+'">'+p(k.holder+' · '+k.factTitle+' · '+(KNOWLEDGE_STATES[k.state]||k.state)+' · '+(k.status||'Unclassified')+(k.stale?' · Source changed':''))+p('Evidence: '+k.evidence)+p('Certainty: '+k.certainty+' · Reading order: '+(k.readingOrder??'Unknown')+' · Story time: '+(k.storyTime||'Unknown'))+link('events',k.eventId)+btn('Edit knowledge proposal','data-knowledge-edit="'+h(k.id)+'" data-knowledge-parent="'+h(k.eventId)+'"')+'</article>').join('')+(!records.length?'<p>No attributed knowledge at this selection. Unknown timing is excluded from a bounded reading order.</p>':'')+'</details>';}
 function synopsisSourceMapContent(){
  const audit=synopsisAuthorityAudit(c.model(),{...context(),revision:c.branch().revision,publishedRevision:publicationInfo?.branchRevision,publishedBranchId:publicationInfo?.branchId,publicationRecordRevision:publicationInfo?.recordRevision,publishedAt:publicationInfo?.publishedAt,view,scope,chapters:c.chapters()});
  const href=(kind,id)=>kind==='chapters'||kind==='chapter'?(c.chapterLink?.(c.chapters().find(x=>x.id===id)?.chapter_number)||null):
   kind==='findings'?c.route('critique',{focuskind:'finding',focusid:id}):
   c.route('dsl',{dslview:['characters','character'].includes(kind)?'characters':['questions','question','decision','decisions'].includes(kind)?'decisions':'reading',focuskind:['characters','character'].includes(kind)?'character':['questions','question','decision','decisions'].includes(kind)?'question':'event',focusid:id});
  return synopsisAuthorityHTML(audit,{href});
 }
 function synopsisSourceMapHTML(){return '<div data-synopsis-source-map>'+synopsisSourceMapContent()+'</div>';}
 function synopsisHTML(){const sections=selectedSynopsis(c.model(),{view,scope,chapters:c.chapters()});return '<h2>Synopsis</h2><div class="dsl-inline">'+c.select('view','View',{short:'Short synopsis',full:'Full synopsis',chapters:'By chapter'},view).replace('name="view"','data-synopsis-view')+c.select('scope','Sources',{plan:'Story plan',manuscript:'Saved manuscript'},scope).replace('name="scope"','data-synopsis-scope')+'</div>'+toolbar('synopsis')+btn('Add section','data-tool-section')+synopsisSourceMapHTML()+sections.map(s=>'<article><h3 dir="auto">'+h(s.title||({summary:'Short synopsis',full:'Full synopsis'}[s.id])||s.id)+'</h3>'+p(s.text)+'<p>'+h(s.status)+' · '+h(s.review.state)+'</p>'+(!s.id.startsWith('outline:')?btn('Edit proposal','data-tool-synopsis="'+h(s.id)+'"'):'<p>Chapter plan source. Use the chapter plan editor for these original records.</p>')+'<details><summary>Sources and changes</summary>'+(s.sources||[]).map(x=>p(x.kind+' · '+x.id+' · r'+(x.revision??'unknown'))).join('')+s.review.differences.map(x=>'<p>'+h(x.reason)+' · '+h(x.id)+'</p><details><summary>Before and current source</summary><pre>'+h(JSON.stringify({before:x.snapshot,current:x.current},null,2))+'</pre></details>').join('')+'</details></article>').join('')+(!sections.length?'<p>No saved synopsis for this scope and view. Add a section and link its sources. Planned events are not substituted for saved manuscript.</p>':'')+proposals('synopsis');}
 function sourceFields(selected=[]){return '<details open><summary>Linked sources</summary><p>Choose only sources that support this proposal.</p>'+['events','characters','decisions','questions','chapters'].map(kind=>{const rs=kind==='chapters'?c.chapters():kind==='questions'?(c.model().workshop?.questions||[]).filter(activeRecord):active(kind);return '<details><summary>'+h(kind)+'</summary>'+rs.map(r=>'<label><input type="checkbox" name="source" value="'+h(kind+':'+r.id)+'" '+(selected.some(x=>x.kind===kind&&x.id===r.id)?'checked':'')+'> <span dir="auto">'+h(r.name||r.title||r.id)+'</span></label>').join('')+'</details>';}).join('')+'</details>';}
 const refs=f=>f.getAll('source').map(v=>{const split=v.indexOf(':');return {kind:v.slice(0,split),id:v.slice(split+1)};});
 function saveForm(m,kind,targetId,values){const source=context();c.submit(m.querySelector('form'),f=>{if(c.branch().revision!==source.baseRevision)throw Error('Source changed. Reopen this editor.');return storeToolProposal(c.model(),makeToolProposal(c.model(),{...source,kind,targetId,values:values(f),sourceRefs:refs(f),reason:String(f.get('reason')),author:c.writer()},source,c.chapters()));},'Save '+kind+' source proposal');}
 function editClue(id){const e=active('events').find(x=>x.id===id);if(!e)return;const m=c.modal('Propose clue changes','<form>'+c.select('type','Classification',{twist:'Twist',clue:'Clue',secret:'Secret'},['twist','clue','secret'].includes(e.type)?e.type:'clue')+Object.entries(labels).map(([k,label])=>c.area(k,label,e[k]||'')).join('')+['setup','reinforcement','reveal'].map(k=>c.select(k+'EventId',k[0].toUpperCase()+k.slice(1)+' event',eventOptions(),e[k+'EventId']||'')).join('')+'<details><summary>Record replacement link</summary><p>Optional planning link. This does not retire a source automatically.</p>'+c.select('replacementEventId','Current replacement event',eventOptions(),e.replacementEventId||'')+'</details>'+'<details><summary>Planned chapter placement</summary><p>Planning references do not prove the clue appears in saved prose.</p>'+c.select('setupChapterId','Planned setup chapter',chapterOptions(),e.setupChapterId||'')+c.select('revealChapterId','Planned reveal chapter',chapterOptions(),e.revealChapterId||'')+'</details><details><summary>Linked characters</summary>'+active('characters').map(x=>'<label><input type="checkbox" name="character" value="'+h(x.id)+'" '+((e.characterIds||[]).includes(x.id)?'checked':'')+'> '+h(x.name)+'</label>').join('')+'</details>'+sourceFields([{kind:'events',id}])+c.area('reason','Reason and unresolved choices','')+end()+'</form>');if(m)saveForm(m,'clue',id,f=>({...Object.fromEntries([...Object.keys(labels),'type','setupEventId','reinforcementEventId','revealEventId','setupChapterId','revealChapterId','replacementEventId'].map(k=>[k,String(f.get(k))])),characterIds:f.getAll('character')}));}
 function requiredKnowledgeEditor(id){
  const e=active('events').find(x=>x.id===id);if(!e)return;
  const existing=e.requiredKnowledge||[];
  const removeOptions={'':'Choose an existing link',...Object.fromEntries(existing.map((r,i)=>[String(i),(r.characterId==='reader'?'Reader':active('characters').find(c=>c.id===r.characterId)?.name||r.characterId)+' · '+(active('events').find(f=>f.id===r.factEventId)?.title||r.factEventId)]))};
  const m=c.modal('Review required knowledge','<form>'+
   '<p>Record an explicit source backed fact needed for an action. This does not establish character knowledge by itself. Changes remain proposals until reviewed.</p>'+
   c.select('mode','Action',{add:'Add prerequisite',remove:'Propose retiring prerequisite'},'add')+
   '<details><summary>Existing requirements</summary>'+existing.map(r=>'<p dir="auto">'+h(r.characterId)+' · '+h(r.factEventId)+' · '+h(r.note)+'</p>').join('')+'</details>'+
   c.select('removeIndex','Requirement to retire',removeOptions,'')+
   c.select('holder','Who needs the fact?',{reader:'Reader',...Object.fromEntries(active('characters').map(c=>[c.id,c.name]))},'reader')+
   c.select('fact','Which fact event?',eventOptions(),'')+
   c.area('note','Evidence for this requirement','',2)+sourceFields([{kind:'events',id}])+
   c.area('reason','Reason for source proposal','',2)+end()+'</form>');
  if(!m)return;
  saveForm(m,'clue',id,form=>{
   const next=structuredClone(existing);
   if(form.get('mode')==='remove'){
    const index=Number(form.get('removeIndex'));
    if(form.get('removeIndex')===''||!Number.isInteger(index)||index<0||index>=next.length)throw Error('Choose a current prerequisite to retire through review.');
    next.splice(index,1);
   }else next.push({characterId:String(form.get('holder')||''),factEventId:String(form.get('fact')||''),note:String(form.get('note')||'').trim()});
   return {requiredKnowledge:next};
  });
 }
 function editKnowledge(id){const e=active('events').find(x=>x.id===id);if(!e)return;const m=c.modal('Add attributed knowledge','<form><p>Possessing an unread document does not mean knowing its contents. Existing knowledge entries are preserved.</p>'+c.select('holder','Holder',{reader:'Reader',...Object.fromEntries(active('characters').map(x=>[x.id,x.name]))},'reader')+c.select('state','Knowledge state',{knows:'Knows',suspects:'Suspects',false_belief:'False belief',possesses_unread:'Possesses unread'},'knows')+c.select('event','Acquisition event',eventOptions(),'')+c.field('readingOrder','First reading order; blank means unknown','','number')+c.field('storyTime','Story time; blank means unknown','')+c.field('certainty','Certainty','')+c.area('evidence','Evidence and source','')+sourceFields([{kind:'events',id}])+c.area('reason','Reason','')+end()+'</form>');if(m){const source=context();c.submit(m.querySelector('form'),f=>{
 if(c.branch().revision!==source.baseRevision)throw Error('Planning changed. Reopen the knowledge form.');
 const eventId=String(f.get('event')),target=active('events').find(x=>x.id===eventId);if(!target)throw Error('Choose the acquisition event.');
 const characterId=String(f.get('holder'));if((target.knowledgeRecords||[]).some(k=>k.characterId===characterId&&k.factEventId===id))throw Error('This holder already has this fact at the acquisition event. Edit the existing record in event knowledge.');
 const record={id:crypto.randomUUID(),characterId,factEventId:id,state:String(f.get('state')),eventId,readingOrder:f.get('readingOrder')===''?null:Number(f.get('readingOrder')),storyTime:String(f.get('storyTime')),certainty:String(f.get('certainty')),statement:String(f.get('evidence')),sourceNote:String(f.get('evidence')),sourceFactRevision:e.revision??null,sourceFactTruth:e.truth||'',status:'approved',sourceRevision:source.baseRevision};
 const sourceRefs=refs(f);for(const sid of [id,eventId])if(!sourceRefs.some(r=>r.kind==='events'&&r.id===sid))sourceRefs.push({kind:'events',id:sid});
 return storeToolProposal(c.model(),makeToolProposal(c.model(),{...source,kind:'clue',targetId:eventId,author:c.writer(),reason:String(f.get('reason')),sourceRefs,values:{knowledgeRecords:[...(target.knowledgeRecords||[]),record]}},source,c.chapters()));
 },'Propose attributed knowledge');}}
 function editSynopsis(id){const s=synopsisSections(c.model()).find(x=>x.id===id);if(!s)return;const m=c.modal('Propose synopsis update','<form>'+c.area('text','Proposed text',s.text,12)+sourceFields(s.sources)+c.area('reason','Reason and critique findings','')+end()+'</form>');if(m)saveForm(m,'synopsis',id,f=>({text:String(f.get('text'))}));}
 function review(id){const proposal=c.model().workshop?.toolProposals?.find(x=>x.id===id);if(!proposal)return;const source=context();const m=c.modal('Review proposed change','<form><p>Author: '+h(proposal.author)+' · '+h(proposal.status)+'</p>'+p(proposal.reason)+(proposal.kind==='clue'?(()=>{try{return clueProposalImpactHTML(clueProposalImpact(c.model(),proposal,c.chapters()),{href:(kind,id)=>c.route('dsl',{dslview:kind==='characters'?'characters':kind==='questions'?'decisions':'reading',focuskind:kind==='characters'?'character':kind==='questions'?'question':'event',focusid:id})});}catch(error){return '<p role="alert">'+h(error.message)+' Refresh this proposal before approval.</p>';}})():'')+'<details><summary>Current source snapshot</summary><pre>'+h(JSON.stringify(proposal.before,null,2))+'</pre></details><details><summary>Proposed fields in JSON</summary><pre>'+h(JSON.stringify(proposal.values,null,2))+'</pre></details><p>Approval applies only these planning fields. Publication remains separate. A changed source blocks application.</p>'+c.select('action','Decision',{deferred:'Defer',rejected:'Reject',approved:'Approve and apply'},'deferred')+c.area('note','Review evidence and remaining continuity checks','')+end()+'</form>');if(m)c.submit(m.querySelector('form'),f=>{if(c.branch().revision!==source.baseRevision)throw Error('Planning changed. Reopen review.');return reviewToolProposal(c.model(),id,f.get('action'),source,c.chapters(),f.get('note'));},'Review source proposal');}
 function verify(id){
  const source=context(),proposal=c.model().workshop?.toolProposals?.find(x=>x.id===id);if(!proposal)return;
  const check=toolProposalReview(c.model(),proposal,{chapters:c.chapters()});
  if(!check.ready){const m=c.modal('Review changed sources',p(check.reason)+'<p>The earlier approval and verification remain in history. Prepare a new proposal from the current record.</p>'+btn('Prepare current proposal','data-tool-refresh'));if(m)m.querySelector('[data-tool-refresh]').onclick=()=>proposal.kind==='clue'?editClue(proposal.targetId):editSynopsis(proposal.targetId);return;}
  const m=c.modal('Verify saved change','<form><p>Check the saved fields and their connected views. This records verification evidence; it does not certify literary correctness.</p>'+c.area('note','What did you verify?','')+end()+'</form>');if(m)c.submit(m.querySelector('form'),f=>{if(c.branch().revision!==source.baseRevision)throw Error('Planning changed. Reopen verification.');return verifyToolProposal(c.model(),id,source,f.get('note'),c.chapters());},'Verify saved planning change');
 }
 function exportFile(kind,json=false,targetId){const pkg=sourcePackage(c.model(),context(),{kind,targetId,view,scope,chapters:c.chapters()});c.download(json?JSON.stringify(pkg,null,2):sourceReviewHTML(pkg),kind==='clue'?'Clues_Review_v001.'+(json?'json':'html'):'Synopsis_Review_v001.'+(json?'json':'html'),json?'application/json':'text/html;charset=utf-8');}
 async function shareFile(kind){try{const pkg=sourcePackage(c.model(),context(),{kind,view,scope,chapters:c.chapters()}),file=new File([sourceReviewHTML(pkg)],kind==='clue'?'Clues_Review_v001.html':'Synopsis_Review_v001.html',{type:'text/html'});if(!navigator.canShare?.({files:[file]})||!navigator.share){c.status?.('Sharing is unavailable in this browser. Use Export HTML.');return;}await navigator.share({files:[file],title:kind==='clue'?'Twists and Clues':'Synopsis'});c.status?.('Share completed. Check the destination you selected.');}catch(error){c.status?.(error.name==='AbortError'?'Sharing cancelled.':'Sharing failed. Use Export HTML.');}}
 function importFile(kind){const source=context(),m=c.modal('Import attributed proposal','<form><p>Use the current review package. Wrong book, path or revision is rejected. Imported content cannot supply approval.</p><input type="file" accept=".json,application/json" data-tool-file>'+c.area('payload','Proposal JSON','',8)+end()+'</form>');if(!m)return;m.querySelector('[data-tool-file]').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>2000000){m.querySelector('.dsl-form-status').textContent='Proposal exceeds 2 MB.';return;}m.querySelector('[name=payload]').value=await f.text();};c.submit(m.querySelector('form'),f=>{if(c.branch().revision!==source.baseRevision)throw Error('Planning changed. Export a fresh package.');const input=JSON.parse(f.get('payload'));if(input.kind!==kind)throw Error('Wrong proposal type.');return storeToolProposal(c.model(),makeToolProposal(c.model(),input,source,c.chapters()));},'Import attributed source proposal');}
 function loadPublication(root){
  if(!c.api||publicationLoadStarted||!root.querySelector('[data-synopsis-source-map]'))return;
  publicationLoadStarted=true;
  const branchId=c.branch()?.id,bookAtLoad=c.bookId;
  Promise.resolve().then(()=>c.api(publicationMetadataPath(bookAtLoad))).then(rows=>{
   if(c.bookId!==bookAtLoad||c.branch()?.id!==branchId)return;
   publicationInfo=publicationMetadata(rows);
   const panel=root.querySelector('[data-synopsis-source-map]');
   if(panel)panel.innerHTML=synopsisSourceMapContent();
  }).catch(()=>{publicationInfo=null;});
 }
 function bind(root){
  loadPublication(root);
  const requested=typeof location==='undefined'?null:new URLSearchParams(location.hash.slice(1)).get('toolproposal');
  if(requested&&!openedRequest){openedRequest=true;const p=c.model().workshop?.toolProposals?.find(x=>x.id===requested);if(p)queueMicrotask(()=>p.status==='approved'?verify(requested):review(requested));}
  root.querySelectorAll('[data-tool-clue]').forEach(b=>b.onclick=()=>editClue(b.dataset.toolClue));root.querySelectorAll('[data-tool-knowledge]').forEach(b=>b.onclick=()=>editKnowledge(b.dataset.toolKnowledge));root.querySelectorAll('[data-tool-required]').forEach(b=>b.onclick=()=>requiredKnowledgeEditor(b.dataset.toolRequired));root.querySelectorAll('[data-tool-synopsis]').forEach(b=>b.onclick=()=>editSynopsis(b.dataset.toolSynopsis));
  root.querySelectorAll('[data-tool-review]').forEach(b=>b.onclick=()=>review(b.dataset.toolReview));root.querySelectorAll('[data-tool-verify]').forEach(b=>b.onclick=()=>verify(b.dataset.toolVerify));root.querySelectorAll('[data-tool-export]').forEach(b=>b.onclick=()=>exportFile(b.dataset.toolExport));root.querySelectorAll('[data-tool-package]').forEach(b=>b.onclick=()=>exportFile(b.dataset.toolPackage,true));root.querySelectorAll('[data-tool-card]').forEach(b=>b.onclick=()=>exportFile('clue',false,b.dataset.toolCard));root.querySelectorAll('[data-tool-share]').forEach(b=>b.onclick=()=>shareFile(b.dataset.toolShare));root.querySelectorAll('[data-tool-import]').forEach(b=>b.onclick=()=>importFile(b.dataset.toolImport));
  root.querySelector('[data-tool-classify]')?.addEventListener('click',()=>{const m=c.modal('Choose an existing event',c.select('event','Event',eventOptions(),'')+btn('Prepare classification','data-classify-next'));if(m)m.querySelector('[data-classify-next]').onclick=()=>editClue(m.querySelector('select').value);});
  root.querySelector('[data-tool-section]')?.addEventListener('click',()=>{const m=c.modal('Add synopsis section','<form>'+c.field('title','Section title','')+'<p>Scope: '+h(scope)+' · View: '+h(view)+'. The new section starts empty and unapproved.</p>'+end()+'</form>');if(m)c.submit(m.querySelector('form'),f=>addSynopsisSection(c.model(),{title:f.get('title'),scope,view}),'Add empty synopsis section');});
  for(const [attr,set] of [['data-synopsis-view',v=>view=v],['data-synopsis-scope',v=>scope=v],['data-knowledge-holder',v=>character=v],['data-knowledge-order',v=>order=v],['data-knowledge-filter-event',v=>eventFilter=v]])root.querySelector('['+attr+']')?.addEventListener('change',e=>{set(e.target.value);c.render();});
 }
 return {cluesHTML,synopsisHTML,knowledgeHTML,bind};
}
