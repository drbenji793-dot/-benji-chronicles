import {activeRecord} from './current-book-brief.js';
import {protectedDecision} from './question-lifecycle.js';
import {same} from './planning-evidence.js';

// Detect collisions with recorded approval scope, not semantic contradictions in prose.
export function approvalConflicts(data,{questionId,changes=[],summary}={}){
 const current=(data.workshop?.questions||[]).find(q=>q.id===questionId&&activeRecord(q));
 const conflicts=[];
 for(const q of (data.workshop?.questions||[]).filter(activeRecord)){
  if(!protectedDecision(q)||q.id===questionId||q.id===current?.revisesQuestionId)continue;
  for(const change of changes){
   const event=(data.events||[]).find(e=>e.id===change.id&&activeRecord(e));
   const altered=Object.keys(change.fields||{}).filter(k=>!same(event?.[k],change.fields[k]));
   if(!altered.length)continue;
   const claims=q.application?.fieldClaims?.find(c=>c.id===change.id);
   const linked=(q.application?.eventIds||q.eventIds||[]).includes(change.id);
   const keys=claims?altered.filter(k=>Object.hasOwn(claims.fields,k)):linked?altered:[];
   if(keys.length)conflicts.push({questionId:q.id,title:q.title||q.id,eventId:change.id,fields:keys,reason:claims?'Changes fields governed by an applied decision.':'Overlaps a protected decision whose exact field scope was not recorded.'});
  }
  if(summary!==undefined&&summary!==data.summary&&q.application?.summaryChanged)conflicts.push({questionId:q.id,title:q.title||q.id,fields:['summary'],reason:'Changes a synopsis governed by an applied decision.'});
 }
 return conflicts;
}
export function assertNoApprovalConflicts(data,proposal){
 const conflicts=approvalConflicts(data,proposal);
 if(conflicts.length)throw Error('Conflicting approval scope: '+[...new Set(conflicts.map(c=>c.title+' ('+c.fields.join(', ')+')'))].join('; ')+'. Open the protected decision and propose a linked revision. No changes were applied.');
}
