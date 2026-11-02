import {activeRecord} from './current-book-brief.js';
export function reviewQueue(data){
 const ids=[...new Set(data.workshop?.reviewEventIds||[])];
 return ids.map(id=>{const event=(data.events||[]).find(e=>e.id===id&&activeRecord(e));return {id,event,reason:(data.currentUpdate?.dependencies?.eventIds||[]).includes(id)?data.currentUpdate.note:'A recorded connection was marked for review; the exact earlier cause is not available here.'};});
}
export function completeEventReview(data,{id,note,sourceRevision,eventSnapshot,writer,at=new Date().toISOString()}){
 if(!Number.isInteger(sourceRevision)||!String(note||'').trim())throw Error('Record what you checked and why no further change is needed.');
 const row=reviewQueue(data).find(r=>r.id===id);if(!row?.event)throw Error('This event is missing, retired or no longer awaiting review.');
 if(JSON.stringify(row.event)!==JSON.stringify(eventSnapshot))throw Error('The event changed. Reopen its review.');
 const d=structuredClone(data);d.workshop.reviewEventIds=d.workshop.reviewEventIds.filter(x=>x!==id);
 d.workshop.eventReviews=[...(d.workshop.eventReviews||[]),{id:crypto.randomUUID(),eventId:id,sourceRevision,eventRevision:row.event.revision??null,note:String(note).trim(),writer,at,status:'reviewed-no-further-change',scope:'Planning event only; no chapter approval'}];return d;
}
