import {activeRecord} from './current-book-brief.js';
// Compare content, not save stamps. Stamping a review must not invalidate its evidence.
const metadata=new Set(['revision','updatedAt','updatedBy','savedAt','timezone','sourceBranchRevision','supersedesRevision','changeNote','sourceRevision']);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export const eventEvidence=e=>canonical(Object.fromEntries(Object.entries(e).filter(([k])=>!metadata.has(k)||(k==='sourceRevision'&&e.sourceId))));
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function decisionEvidence(data,eventIds,summaryChanged){
 const ids=new Set(eventIds),links=(data.links||[]).filter(activeRecord);let more=true;
 while(more){more=false;for(const l of links)if(ids.has(l.from)&&!ids.has(l.to)){ids.add(l.to);more=true;}}
 return {schema:1,events:[...ids].sort().map(id=>({id,content:eventEvidence((data.events||[]).find(e=>e.id===id&&activeRecord(e))||{id,missing:true})})),links:links.filter(l=>ids.has(l.from)||ids.has(l.to)).map(eventEvidence).sort((a,b)=>String(a.id).localeCompare(String(b.id))),...(summaryChanged?{summary:data.summary}:{})};
}
export function applicationReview(data,q,{bookId,branchId}={}){
 const a=q?.application;if(!a||!a.evidence)return {ready:false,reason:'This older application has no verification snapshot. Propose a linked revision if further work is needed.'};
 if((bookId&&bookId!==a.bookId)||(branchId&&branchId!==a.branchId))return {ready:false,reason:'Application belongs to another book or path.'};
 const current=decisionEvidence(data,a.eventIds||[],a.summaryChanged);
 if(!same(a.evidence,current))return {ready:false,stale:true,reason:'Affected planning sources changed. Review the current records and propose a linked revision if the decision must change.'};
 if(current.events.some(e=>e.content.missing))return {ready:false,reason:'An affected event is unavailable.'};
 const pending=(data.workshop?.reviewEventIds||[]).filter(id=>current.events.some(e=>e.id===id));
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
