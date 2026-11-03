import {activeRecord} from './current-book-brief.js';
import {questionState,protectedDecision} from './question-lifecycle.js';

const asText=value=>String(value??'');
const safe=value=>asText(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

// A comparison of the CURRENT SAVED plan and a CANDIDATE plan only.
export function connectedChangePreview(before,after,{eventChanges=[],recordChanges=[],questionId}={}){
 const eventIds=new Set(eventChanges.map(c=>c.id).filter(Boolean));
 const characterIds=new Set(recordChanges.filter(c=>c.kind==='characters').map(c=>c.id).filter(Boolean));
 const related=(q)=>q.id===questionId||(q.eventIds||[]).some(id=>eventIds.has(id))||(q.characterIds||[]).some(id=>characterIds.has(id));
 const beforeQuestions=(before.workshop?.questions||[]).filter(activeRecord).filter(q=>protectedDecision(q)&&related(q));
 const afterQuestions=new Map((after.workshop?.questions||[]).map(q=>[q.id,q]));
 const decisions=beforeQuestions.map(q=>{
  const next=afterQuestions.get(q.id);
  const changed=!!next&&(q.answer!==next.answer||questionState(q)!==questionState(next));
  return {id:q.id,title:q.title||q.id,status:questionState(q),before:q.answer||'',after:next?.answer??q.answer??'',changed,source:'Protected author question'};
 });
 const beforeFacts=(before.decisions||[]).filter(activeRecord).filter(d=>['approved','applied','resolved'].includes(d.status)&&related(d));
 const afterFacts=new Map((after.decisions||[]).map(d=>[d.id,d]));
 for(const d of beforeFacts){
  const next=afterFacts.get(d.id),oldText=d.text??d.summary??d.answer??'',newText=next?.text??next?.summary??next?.answer??oldText;
  decisions.push({id:d.id,title:d.title||d.name||d.id,status:d.status,before:oldText,after:newText,changed:oldText!==newText,source:'Protected recorded decision'});
 }
 const reviewChapters=new Set();
 const changedEvents=eventIds.size?[...(before.events||[]),...(after.events||[])].filter(e=>eventIds.has(e.id)):[];
 for(const e of changedEvents){
  for(const id of [e.sourceId,e.sourceChapterId,...(e.chapterIds||[])])if(id)reviewChapters.add(id);
 }
 return {
  bookBrief:{before:before.summary||'',after:after.summary||'',changed:(before.summary||'')!==(after.summary||'')},
  decisions,
  proseReview:[...reviewChapters].map(id=>({id,reason:'Linked planning change requires a separate saved manuscript review'})),
  unlinkedEventCount:[...eventIds].filter(id=>!changedEvents.some(e=>e.id===id&&[e.sourceId,e.sourceChapterId,...(e.chapterIds||[])].some(Boolean))).length,
  changedEvents:eventIds.size,
  changedRecords:recordChanges.length,
  protectedConflict:decisions.some(d=>d.changed)
 };
}

export function connectedChangePreviewHTML(preview){
 const b=preview.bookBrief;
 return '<details data-change-brief-review><summary>Current and proposed Story Brief</summary>'+
  '<div class="dsl-diff"><div><strong>Before</strong><p dir="auto">'+safe(b.before)+'</p></div><div><strong>Proposed</strong><p dir="auto">'+safe(b.after)+'</p></div></div>'+
  '<p>Story Brief '+(b.changed?'change proposed, not approved':'unchanged')+'.</p></details>'+
  '<details data-change-decisions><summary>Connected protected decisions ('+preview.decisions.length+')</summary>'+
  preview.decisions.map(d=>'<article><strong dir="auto">'+safe(d.title)+'</strong><p>'+safe(d.source)+' · '+safe(d.status)+'</p>'+
   '<div class="dsl-diff"><div><strong>Current answer</strong><p dir="auto">'+safe(d.before)+'</p></div>'+
   '<div><strong>Proposed answer</strong><p dir="auto">'+safe(d.after)+'</p></div></div>'+
   '<p>'+(d.changed?'Protected decision differs: revise through a separate approved decision workflow.':'Protected decision preserved.')+'</p></article>').join('')+
  (!preview.decisions.length?'<p>No explicitly linked protected decision was identified; this does not establish that no conflicts exist.</p>':'')+'</details>'+
  '<details data-change-prose-review><summary>Separate manuscript review ('+preview.proseReview.length+' linked chapters)</summary>'+
  '<p>No chapter text is changed by this planning preview. Chapter references require independent source checks before prose edits.</p>'+
  preview.proseReview.map(row=>'<p>Chapter ID: '+safe(row.id)+' · '+safe(row.reason)+'</p>').join('')+
  (preview.unlinkedEventCount?'<p>'+preview.unlinkedEventCount+' affected event records lack an explicit saved chapter link. Review their placement separately.</p>':'')+
  '</details>';
}
