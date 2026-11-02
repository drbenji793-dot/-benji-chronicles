import {activeRecord} from './current-book-brief.js';
export function questionGroups(data){
 const groups={open:[],pending:[],deferred:[]};
 for(const q of (data.workshop?.questions||[]).filter(activeRecord)){
  if(['applied','resolved','rejected'].includes(q.status))continue;
  if(q.status==='deferred'){groups.deferred.push(q);continue;}
  const hasAnswer=!!String(q.answer||'').trim()||(q.selectedAnswers||[]).length;
  groups[hasAnswer||q.status==='answered'?'pending':'open'].push(q);
 }
 return groups;
}
