import {decisionEvidence,same} from './planning-evidence.js';
import {activeRecord} from './current-book-brief.js';
export function reviewQueue(data){
 const latest=new Map();for(const r of data.workshop?.eventReviews||[])latest.set(r.eventId,r);
 const stale=[...latest.values()].filter(r=>!r.evidence||!same(r.evidence,eventReviewEvidence(data,r.eventId))).map(r=>r.eventId);
 const ids=[...new Set([...(data.workshop?.reviewEventIds||[]),...stale])];
 return ids.map(id=>{const event=(data.events||[]).find(e=>e.id===id&&activeRecord(e));const trigger=(data.workshop?.eventReviewTriggers||[]).find(r=>r.eventId===id);return {id,event,trigger,reason:stale.includes(id)?latest.get(id)?.evidence?'Previously reviewed event or connected sources changed. Recheck the current connections.':'Earlier review has no source snapshot. Recheck the current connections.':trigger?trigger.reason:(data.currentUpdate?.dependencies?.eventIds||[]).includes(id)?data.currentUpdate.note:'A recorded connection was marked for review; the exact earlier cause is not available here.'};});
}
export function completeEventReview(data,{id,note,sourceRevision,eventSnapshot,writer,at=new Date().toISOString()}){
 if(!Number.isInteger(sourceRevision)||!String(note||'').trim())throw Error('Record what you checked and why no further change is needed.');
 const row=reviewQueue(data).find(r=>r.id===id);if(!row?.event)throw Error('This event is missing, retired or no longer awaiting review.');
 if(JSON.stringify(row.event)!==JSON.stringify(eventSnapshot))throw Error('The event changed. Reopen its review.');
 const d=structuredClone(data);d.workshop.reviewEventIds=(d.workshop.reviewEventIds||[]).filter(x=>x!==id);
 d.workshop.eventReviews=[...(d.workshop.eventReviews||[]),{id:crypto.randomUUID(),eventId:id,sourceRevision,eventRevision:row.event.revision??null,evidence:eventReviewEvidence(data,id),note:String(note).trim(),writer,at,status:'reviewed-no-further-change',scope:'Planning event only; no chapter approval'}];return d;
}

export function eventReviewEvidence(data,id){
 const ids=new Set([id]);let more=true;const links=(data.links||[]).filter(activeRecord);
 while(more){more=false;for(const l of links)if(ids.has(l.from)||ids.has(l.to))for(const key of ['from','to'])if(!ids.has(l[key])){ids.add(l[key]);more=true;}}
 return decisionEvidence(data,[...ids],false);
}
