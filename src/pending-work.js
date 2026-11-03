import {synopsisReviewState} from './synopsis-review.js';
import {clueAudit} from './clue-audit.js';
import {findingContinuityState} from './finding-continuity.js';
import {toolProposalReview} from './source-tools.js';
import {applicationReview} from './decision-verification.js';
import {activeRecord} from './current-book-brief.js';
import {questionState,questionLabel} from './question-lifecycle.js';
import {reviewQueue} from './planning-review.js';
import {escapeHTML as h} from './dsl-engine.js';

// A projection of current records, never another saved copy of those records.
export function pendingWork(data={}, {bookId,branchId,chapters}={}){
 const rows=[],seen=new Set();
 const add=row=>{if(!row.id||seen.has(row.key))return;seen.add(row.key);rows.push(row);};
 for(const q of (data.workshop?.questions||[]).filter(activeRecord)){
  const state=questionState(q);if(['applied','resolved'].includes(state)){const check=applicationReview(data,q,{bookId,branchId});if(state==='applied'||check.stale)add({key:'question:'+q.id,id:q.id,kind:'question',group:'Application verification',title:q.title||'Decision',state:check.stale?'Sources changed':'Applied · verification pending',action:'Review application',view:'decisions',priority:check.stale?0:2});continue;}if(['rejected','deferred'].includes(state))continue;
  add({key:'question:'+q.id,id:q.id,kind:'question',group:['answered','approved'].includes(state)?'Answers awaiting application':'Decisions needed',title:q.title||q.prompt||'Question',state:questionLabel(q),action:['answered','approved'].includes(state)?'Review impact':'Open question',view:'decisions',priority:state==='conflict'?0:2});
 }
 for(const p of data.workshop?.responseProposals||[])if(p.status==='proposed'&&(!bookId||p.bookId===bookId)&&(!branchId||p.branchId===branchId))add({key:'response:'+p.id,id:p.id,kind:'response',group:'Response proposals',title:p.title,state:'Imported response awaiting review',action:'Review imported responses',view:'decisions',priority:2});
 for(const r of reviewQueue(data))add({key:'event:'+r.id,id:r.id,kind:'event',group:'Connected events',title:r.event?.title||'Unavailable event',state:r.event?'Needs review':'Source unavailable',action:'Review connections',view:'decisions',reason:r.reason,trigger:r.trigger,priority:r.event?2:1});
 for(const p of data.workshop?.toolProposals||[]){
  if((bookId&&p.bookId!==bookId)||(branchId&&p.branchId!==branchId)||p.status==='rejected'||p.status==='deferred')continue;
  const review=p.status==='approved'?toolProposalReview(data,p,{chapters}):null;
  if(p.verification?.status==='verified'&&review?.ready)continue;
  add({key:'tool:'+p.id,id:p.id,kind:'tool',group:'Source proposals',title:p.reason,state:review?.stale?'Sources changed':review&&!review.ready?review.reason:p.status==='approved'?'Saved change awaiting verification':'Proposal awaiting review',action:p.status==='approved'?'Verify saved change':'Review proposal',view:p.kind==='clue'?'twists':'synopsis',priority:review?.stale?0:2});
 }
 for(const f of (data.editorialFindings||[]).filter(activeRecord)){
  if((bookId&&f.bookId!==bookId)||(branchId&&f.branchId!==branchId)||['rejected','deferred'].includes(f.status))continue;
  const continuity=findingContinuityState(data,f,chapters);
  if(['resolved','obsolete'].includes(f.status)&&!continuity.stale&&continuity.checked)continue;
  const verifiedSource=f.continuity?.chapterRevision??(f.repairs||[]).filter(r=>r.status==='verified'&&r.verification?.chapterId===f.chapterId).map(r=>r.verification.chapterRevision).sort((a,b)=>b-a)[0]??f.chapterRevision;
  const stale=continuity.stale||Array.isArray(chapters)&&!chapters.some(c=>c.id===f.chapterId&&c.revision===verifiedSource);
  const repairs=f.repairs||[],verified=repairs.some(r=>r.status==='verified'),approved=repairs.some(r=>r.status==='approved'),proposed=repairs.some(r=>r.status==='proposed');
  add({key:'finding:'+f.id,id:f.id,kind:'finding',group:'Review findings',title:f.title||'Finding',state:stale?'Source changed':verified?'Continuity check needed':approved?'Approved repair awaiting verification':proposed?'Repair awaiting decision':f.status==='accepted'?'Prepare repair proposal':f.status==='clarification'?'Needs clarification':'Finding awaiting review',action:'Open finding',view:'critique',priority:stale?0:f.severity==='Critical'?0:f.severity==='Major'?1:3});
 }
 for(const view of Object.keys(data.synopsisReviews||{})){const check=synopsisReviewState(data,view,{bookId,branchId,chapters});if(['Needs review','Source scope mismatch'].includes(check.status))add({key:'synopsis:'+view,id:view,kind:'synopsisReview',group:'Story sources',title:view+' synopsis',state:check.status,action:'Review synopsis sources',view:'synopsis',priority:1});}
 for(const row of clueAudit(data,chapters||[]).rows){if(!row.review.review||!row.notices.length||!row.review.pending)continue;add({key:'clue:'+row.event.id,id:row.event.id,kind:'clue',group:'Clue source reviews',title:row.event.title||'Clue',state:row.review.label,action:'Review source notices',view:'twists',priority:row.review.stale?0:2});}
 if(data.workshop?.synopsisNeedsReview)add({key:'synopsis:current',id:'current',kind:'synopsis',group:'Story sources',title:'Synopsis',state:'Needs source review',action:'Review synopsis',view:'synopsis',priority:2});
 return rows.sort((a,b)=>a.priority-b.priority||a.key.localeCompare(b.key));
}
export function pendingWorkHTML(data, {route,...scope}){
 const rows=pendingWork(data,scope),groups=new Map();
 for(const row of rows){if(!groups.has(row.group))groups.set(row.group,[]);groups.get(row.group).push(row);}
 const href=row=>row.kind==='synopsisReview'?route('brief',{synopsisview:row.id}):row.kind==='finding'?route('critique',{focuskind:'finding',focusid:row.id}):route('dsl',{dslview:row.view,...(row.kind==='question'?{focuskind:'question',focusid:row.id}:row.kind==='event'?{reviewevent:row.id}:row.kind==='tool'?{toolproposal:row.id}:row.kind==='response'?{responseproposal:row.id}: {})});
 return '<details class="pending-work" data-pending-work><summary>Pending work ('+rows.length+')</summary><p class="muted">Current records from this planning path. Open an item to review its source and next action.</p>'+[...groups].map(([label,items])=>'<section><h4>'+h(label)+' ('+items.length+')</h4><ul>'+items.map(row=>'<li data-pending-key="'+h(row.key)+'"><a '+(row.kind==='event'?'data-review-event="'+h(row.id)+'" ':'')+'href="'+h(href(row))+'"><span dir="auto">'+h(row.title)+'</span></a><small>'+h(row.state)+' · '+h(row.action)+'</small>'+(row.kind==='event'?'<p>'+h(row.reason)+'</p>'+(row.trigger?'<details><summary>'+h(row.trigger.relationship)+'</summary><p>Changed from source revision '+h(row.trigger.sourceRevision)+' to '+h(row.trigger.resultingRevision)+'</p><p>Trigger events: '+h(row.trigger.triggerEventIds.join(', ')||'None')+'</p><p>Trigger records: '+h(row.trigger.triggerRecords.map(r=>r.kind+': '+r.id).join(', ')||'None')+'</p><p>Recorded connections identify what to check; they do not establish a story error.</p></details>':''):'')+'</li>').join('')+'</ul></section>').join('')+(!rows.length?'<p>No pending items recorded in these categories. This is not a story approval.</p>':'')+'<p class="muted">Deferred and completed records remain in their own workspaces. Counts describe stored states, not editorial correctness.</p></details>';
}

export async function loadPendingWork(api,bookId,branch){
 const rows=await api('chronicles_dsl_branches?book_id=eq.'+encodeURIComponent(bookId)+'&id=eq.'+encodeURIComponent(branch.id)+'&revision=eq.'+branch.revision+'&select=workshop:data->workshop,events:data->events,links:data->links,summary:data->summary,rules:data->rules,characters:data->characters,places:data->places,decisions:data->decisions,synopsisSections:data->synopsisSections,synopsisMeta:data->synopsisMeta,synopsisReviews:data->synopsisReviews,storyBrief:data->storyBrief,storyDraft:data->storyDraft,currentStory:data->currentStory,editorialFindings:data->editorialFindings&limit=1');
 if(!rows[0])throw Error('Planning changed. Reopen this page before loading pending work.');
 return rows[0].data||rows[0];
}
