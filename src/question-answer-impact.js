import {activeRecord} from './current-book-brief.js';
import {protectedDecision,questionState,questionSourcesChanged} from './question-lifecycle.js';
import {savedStoryBrief} from './story-brief.js';
import {escapeHTML as h} from './dsl-engine.js';

export function questionAnswerImpact(data,q,{chapters=[]}={}){
 const hasCommon=(left,right)=>(left||[]).some(id=>(right||[]).includes(id));
 const protectedRows=(data.workshop?.questions||[]).filter(activeRecord).filter(row=>row.id!==q.id&&protectedDecision(row)&&(
  row.id===q.revisesQuestionId||
  hasCommon(row.eventIds,q.eventIds)||
  hasCommon(row.characterIds,q.characterIds)
 )).map(row=>({id:row.id,title:row.title||row.id,status:questionState(row),answer:row.answer||'Not recorded',
  linkedBy:row.id===q.revisesQuestionId?'Explicit linked revision':'Shared event or character source'}));
 const referenced=[
  ...(q.eventIds||[]).map(id=>({kind:'event',id,exists:(data.events||[]).some(r=>r.id===id&&activeRecord(r))})),
  ...(q.characterIds||[]).map(id=>({kind:'character',id,exists:(data.characters||[]).some(r=>r.id===id&&activeRecord(r))})),
  ...(q.sourceChapterId?[{kind:'chapter',id:q.sourceChapterId,exists:chapters.some(r=>r.id===q.sourceChapterId&&activeRecord(r))}]:[])
 ];
 const previous=q.answerHistory?.at(-1)||null;
 const olderAnswer=previous?.answer??q.previousAnswer??'';
 const currentAnswer=q.answer||'';
 const changedFromEarlier=!!olderAnswer&&olderAnswer!==currentAnswer;
 const stale=questionSourcesChanged(data,q)||referenced.some(r=>!r.exists);
 return {
  id:q.id,title:q.title||q.id,
  currentAnswer,earlierAnswer:olderAnswer,changedFromEarlier,
  status:questionState(q),protected:protectedDecision(q),
  protectedRows,linkedSources:referenced,stale,
  storyBrief:savedStoryBrief(data),
  note:q.note||'',
  warnings:[
   ...(stale?['Some selected sources changed or are unavailable. Reopen the current evidence.']:[]),
   ...(protectedRows.length?['Related protected decisions must be reviewed before applying a connected change. Shared source does not prove contradiction.']:[])
  ]
 };
}

export function questionAnswerImpactHTML(impact,{href=()=>null}={}){
 const action=(kind,id,title)=>{
  const url=href(kind,id);
  return url?'<a href="'+h(url)+'" dir="auto">'+h(title)+'</a>':h(title);
 };
 return '<details data-question-answer-impact><summary>Saved and proposed answer impact'+(impact.protectedRows.length?' · '+impact.protectedRows.length+' protected links':'')+'</summary>'+
  '<p>Question status: '+h(impact.status)+' · Answer remains a planning choice until separately approved and applied.</p>'+
  '<div class="dsl-diff"><div><strong>Earlier recorded answer</strong><p dir="auto">'+h(impact.earlierAnswer||'Not recorded')+'</p></div>'+
  '<div><strong>Current saved answer</strong><p dir="auto">'+h(impact.currentAnswer||'Not recorded')+'</p></div></div>'+
  '<p>'+h(impact.changedFromEarlier?'An answer change is recorded in history.':'No earlier different answer is recorded.')+'</p>'+
  '<details><summary>Protected related decisions ('+impact.protectedRows.length+')</summary>'+
  impact.protectedRows.map(r=>'<p dir="auto">'+action('question',r.id,r.title)+' · '+h(r.status)+' · '+h(r.linkedBy)+
   '<span dir="auto"> · '+h(r.answer)+'</span></p>').join('')+
  (!impact.protectedRows.length?'<p>No explicitly linked protected decision recorded. This is not proof of no conflict.</p>':'')+'</details>'+
  '<details><summary>Current linked sources ('+impact.linkedSources.length+')</summary>'+
  impact.linkedSources.map(r=>'<p>'+action(r.kind,r.id,r.id)+' · '+h(r.kind)+' · '+(r.exists?'Current record':'Unavailable')+'</p>').join('')+
  (!impact.linkedSources.length?'<p>No explicit record links. Review the question source scope before applying an answer.</p>':'')+'</details>'+
  '<details><summary>Current saved Story Brief</summary><p dir="auto" style="white-space:pre-wrap;overflow-wrap:anywhere">'+h(impact.storyBrief)+'</p></details>'+
  impact.warnings.map(w=>'<p>'+h(w)+'</p>').join('')+
  '<p>This is a comparison and source check, not automatic approval, canon replacement or manuscript editing.</p></details>';
}
