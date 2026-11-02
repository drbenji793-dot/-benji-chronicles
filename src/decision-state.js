import {questionState} from './question-lifecycle.js';
import {activeRecord} from './current-book-brief.js';
export function questionGroups(data){
 const groups={open:[],pending:[],deferred:[]};
 for(const q of (data.workshop?.questions||[]).filter(activeRecord)){
  if(['applied','resolved','rejected'].includes(q.status))continue;
  if(questionState(q)==='deferred'){groups.deferred.push(q);continue;}
  groups[['answered','approved'].includes(questionState(q))?'pending':'open'].push(q);
 }
 return groups;
}
