import {structuredEvidence} from './structured-changes.js';
import {activeRecord} from './current-book-brief.js';
import {decisionEvidence,same} from './planning-evidence.js';
import {reviewQueue} from './planning-review.js';
export {decisionEvidence,eventEvidence} from './planning-evidence.js';
export function applicationReview(data,q,{bookId,branchId}={}){
 const a=q?.application;if(!a||!a.evidence)return {ready:false,reason:'This older application has no verification snapshot. Propose a linked revision if further work is needed.'};
 if((bookId&&bookId!==a.bookId)||(branchId&&branchId!==a.branchId))return {ready:false,reason:'Application belongs to another book or path.'};
 const current=decisionEvidence(data,a.evidenceEventIds||a.eventIds||[],a.summaryChanged);
 if(!same(a.evidence,current))return {ready:false,stale:true,reason:'Affected planning sources changed. Review the current records and propose a linked revision if the decision must change.'};
 if(current.events.some(e=>e.content.missing))return {ready:false,reason:'An affected event is unavailable.'};
 if(a.recordEvidence&&!same(a.recordEvidence,structuredEvidence(data,a.recordClaims||[])))return {ready:false,stale:true,reason:'Affected character or place sources changed. Review current records before verifying.'};
 const pending=reviewQueue(data).map(r=>r.id).filter(id=>current.events.some(e=>e.id===id)||(a.recordReviewIds||[]).includes(id));
 if(pending.length)return {ready:false,reason:pending.length+' connected event checks remain.',pending};
 return {ready:true,reason:q.status==='resolved'?'Planning application verified.':'Planning matches the applied snapshot. Record your continuity review to verify it.'};
}
export function verifyDecisionApplication(data,id,{bookId,branchId,sourceRevision,note,writer,at=new Date().toISOString()}){
 const q=data.workshop?.questions?.find(q=>q.id===id&&activeRecord(q));
 if(!q||q.status!=='applied')throw Error('Only an applied decision can be verified.');
 if(!Number.isInteger(sourceRevision)||sourceRevision<q.application?.resultingRevision)throw Error('Reload the saved application before verifying it.');
 if(!String(note||'').trim())throw Error('Record what you checked across the affected events.');
 const check=applicationReview(data,q,{bookId,branchId});if(!check.ready)throw Error(check.reason);
 const d=structuredClone(data),next=d.workshop.questions.find(q=>q.id===id);next.status='resolved';next.verification={bookId,branchId,sourceRevision,note:String(note).trim(),writer,at,scope:'Planning records and recorded connections only; manuscript and publication approval are separate'};return d;
}
