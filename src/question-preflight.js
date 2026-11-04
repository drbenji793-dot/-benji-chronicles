import {activeRecord} from './current-book-brief.js';
import {questionState,protectedDecision,questionSourcesChanged} from './question-lifecycle.js';
import {savedStoryBrief} from './story-brief.js';
import {questionChapterEvidence} from './question-chapter-evidence.js';
import {escapeHTML as h} from './dsl-engine.js';

const nameKey=v=>String(v||'').normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase();
export function questionPreflight(data={},ctx={}){
 const {bookId=null,branchId=null,baseRevision=null,language='Unrecorded',chapters=[],question={}}=ctx;
 const events=(data.events||[]).filter(activeRecord),characters=(data.characters||[]).filter(activeRecord);
 const questions=(data.workshop?.questions||[]).filter(activeRecord),decisions=(data.decisions||[]).filter(activeRecord);
 const rows=[
  ...(question.eventIds||[]).map(id=>({kind:'event',id,record:events.find(e=>e.id===id)})),
  ...(question.characterIds||[]).map(id=>({kind:'character',id,record:characters.find(c=>c.id===id)}))
 ];
 const chapter=questionChapterEvidence(question,chapters);
 if(chapter.id)rows.push({kind:'chapter',id:chapter.id,record:chapter.chapter});
 const links=rows.map(({kind,id,record})=>({kind,id,title:record?.name||record?.title||id,
  revision:record?.revision??null,status:record?.status||record?.recordStatus||'Unclassified',
  missing:!record}));
 const normalizedTitle=nameKey(question.title);
 const duplicates=normalizedTitle?questions.filter(q=>q.id!==question.id&&nameKey(q.title)===normalizedTitle).map(q=>({
  id:q.id,title:q.title,status:questionState(q),protected:protectedDecision(q)
 })):[];
 const related=questions.filter(q=>q.id!==question.id&&protectedDecision(q)&&(
  q.id===question.revisesQuestionId||
  (q.eventIds||[]).some(id=>(question.eventIds||[]).includes(id))||
  (q.characterIds||[]).some(id=>(question.characterIds||[]).includes(id))
 )).map(q=>({id:q.id,title:q.title,status:questionState(q)}));
 const approvedDecisions=[
  ...questions.filter(protectedDecision).map(q=>({id:q.id,title:q.title,status:questionState(q),kind:'question'})),
  ...decisions.filter(d=>['approved','accepted','applied','resolved'].includes(d.status)).map(d=>({id:d.id,title:d.title||d.name||d.prompt||d.id,status:d.status,kind:'decision'}))
 ];
 const warnings=[
  ...(!links.length&&!question.sourceFindingId?['No explicit event, character, chapter or critique source linked. Select relevant evidence before treating a question as grounded.']:[]),
  ...(links.some(l=>l.missing)?['Some linked sources are no longer available.']:[]),
  ...(duplicates.length?['A question with this title already exists. Review its current answer and revision before creating another.']:[]),
  ...(related.length?['Protected related decisions exist. A new answer cannot silently replace them.']:[]),
  ...(questionSourcesChanged(data,question)?['Linked event or character snapshot changed since this question was reviewed.']:[]),
  ...(chapter.state==='Linked chapter revision changed'?['Saved chapter source revision changed. Reopen chapter evidence before application.']:[])
 ];
 return {bookId,branchId,revision:baseRevision,language,brief:savedStoryBrief(data),
  activeEventCount:events.length,activeCharacterCount:characters.length,activeChapterCount:chapters.filter(activeRecord).length,
  linked:links,chapter,duplicates,related,approvedDecisions,warnings,
  sourceAvailable:!links.some(l=>l.missing),status:questionState(question)};
}

export function questionPreflightHTML(info,{href=()=>null}={}){
 const link=(kind,id,title)=>{const url=href(kind,id);return url?'<a href="'+h(url)+'" dir="auto">'+h(title)+'</a>':h(title);};
 return '<details data-question-preflight><summary>Current book and question source check</summary>'+
  '<p>Book '+h(info.bookId||'Not recorded')+' · Path '+h(info.branchId||'Not recorded')+' · Planning r'+h(info.revision??'Unknown')+' · Language '+h(info.language)+'</p>'+
  '<p>Current records: '+info.activeEventCount+' events, '+info.activeCharacterCount+' characters, '+info.activeChapterCount+' loaded chapter sources.</p>'+
  '<details><summary>Current Story Brief · saved planning only</summary><p dir="auto" style="white-space:pre-wrap;overflow-wrap:anywhere">'+h(info.brief)+'</p></details>'+
  '<details><summary>Linked source records ('+info.linked.length+')</summary>'+
   info.linked.map(s=>'<p>'+link(s.kind,s.id,s.title)+' · '+h(s.kind)+' · r'+h(s.revision??'Unknown')+' · '+h(s.missing?'Unavailable':s.status)+'</p>').join('')+
   (!info.linked.length?'<p>No specific source selected yet.</p>':'')+'</details>'+
  '<details><summary>Protected decisions ('+info.approvedDecisions.length+')</summary>'+
   info.approvedDecisions.map(s=>'<p>'+link(s.kind,s.id,s.title)+' · '+h(s.status)+'</p>').join('')+
   (!info.approvedDecisions.length?'<p>No explicitly approved decisions recorded in the current planning list.</p>':'')+'</details>'+
  info.duplicates.map(q=>'<p>Existing question: '+link('question',q.id,q.title)+' · '+h(q.status)+(q.protected?' · Protected':'')+'</p>').join('')+
  info.related.map(q=>'<p>Related protected decision: '+link('question',q.id,q.title)+' · '+h(q.status)+'</p>').join('')+
  info.warnings.map(w=>'<p>'+h(w)+'</p>').join('')+
  '<p>This is a current source snapshot for manual author questions. It does not generate questions, approve options or edit manuscript text.</p></details>';
}
