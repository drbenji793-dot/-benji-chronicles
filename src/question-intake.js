import {activeRecord} from './current-book-brief.js';


const trim=value=>String(value??'').trim();
const isProtected=q=>['approved','applied','resolved'].includes(q.status);

// Source validity is checked only for newly created manual questions.
// Preexisting questions and already approved choices remain unchanged.
export function questionIntakeReview(data,draft,{chapters=[]}={}){
 const events=new Set((data.events||[]).filter(activeRecord).map(e=>e.id));
 const characters=new Set((data.characters||[]).filter(activeRecord).map(e=>e.id));
 const currentChapters=new Set(chapters.filter(activeRecord).map(e=>e.id));
 const findings=new Set((data.editorialFindings||[]).filter(activeRecord).map(e=>e.id));
 const links=[
  ...(draft.eventIds||[]).map(id=>({kind:'event',id,present:events.has(id)})),
  ...(draft.characterIds||[]).map(id=>({kind:'character',id,present:characters.has(id)})),
  ...(draft.sourceChapterId?[{kind:'chapter',id:draft.sourceChapterId,present:currentChapters.has(draft.sourceChapterId)}]:[]),
  ...(draft.sourceFindingId?[{kind:'finding',id:draft.sourceFindingId,present:findings.has(draft.sourceFindingId)}]:[])
 ];
 const sourceScope=draft.sourceScope||'linked';
 const briefAvailable=!!trim(data.summary)||!!trim(data.storyBrief?.text);
 const issues=[];
 if(!['linked','brief'].includes(sourceScope))issues.push('Choose a current source scope.');
 if(!trim(draft.title))issues.push('Provide the exact missing question.');
 if(!trim(draft.note))issues.push('Explain the missing decision, contradiction or meaningful choice and its consequences.');
 if(!['Missing decision','Author preference','Factual inconsistency'].includes(draft.decisionKind))issues.push('Choose the decision type.');
 if(sourceScope==='linked'&&!links.length)issues.push('Link an existing event, character, saved chapter or critique finding. For a book wide question explicitly select Story Brief.');
 if(sourceScope==='brief'&&!briefAvailable)issues.push('A book wide question requires a saved Story Brief or summary.');
 for(const link of links.filter(l=>!l.present))issues.push('Linked '+link.kind+' source is unavailable: '+link.id);
 const related=(data.workshop?.questions||[]).filter(activeRecord).filter(q=>q.id!==draft.id&&isProtected(q)&&(
  (q.eventIds||[]).some(id=>(draft.eventIds||[]).includes(id))||
  (q.characterIds||[]).some(id=>(draft.characterIds||[]).includes(id))||
  q.id===draft.revisesQuestionId)).map(q=>({id:q.id,title:q.title||q.id,status:q.status}));
 return {ready:issues.length===0,issues,links,sourceScope,related,briefAvailable};
}

export function requireQuestionIntake(data,draft,context={}){
 const result=questionIntakeReview(data,draft,context);
 if(!result.ready)throw Error(result.issues.join(' '));
 return result;
}
