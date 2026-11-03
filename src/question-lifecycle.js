import {eventEvidence,same} from './planning-evidence.js';
import {activeRecord} from './current-book-brief.js';
export const isDeferral=value=>/^(أؤجل القرار|defer|deferred)$/i.test(String(value||'').trim());
export const questionState=q=>{
 if(['conflict','applied','resolved','rejected','approved'].includes(q.status))return q.status;
 if(q.status==='deferred'||isDeferral(q.answer))return 'deferred';
 return String(q.answer||'').trim()||q.status==='answered'?'answered':'open';
};
export const protectedDecision=q=>['approved','applied','resolved'].includes(questionState(q));
export const questionLabel=q=>({open:'Open',answered:'Answer saved',approved:'Approved · pending application',deferred:'Deferred',conflict:'Conflict',applied:'Applied',resolved:'Resolved',rejected:'Rejected'}[questionState(q)]);
export function replaceQuestion(data,id,transform,{allowCreate=false,sourceContext}={}){
 const d=structuredClone(data),rows=d.workshop?.questions||[],index=rows.findIndex(q=>q.id===id);
 if(index<0&&!allowCreate)throw Error('This question is no longer available. Reload the current source.');
 if(index>=0&&!activeRecord(rows[index]))throw Error('This question has been retired. Open the current decision.');
 const next=transform(index<0?null:rows[index]);if(!next||next.id!==id)throw Error('Question identity must be preserved.');
 if(index<0)rows.push(next);else rows[index]=next;
 d.workshop={...(d.workshop||{}),questions:rows};return d;
}
// A factual preview only: relat���q�^