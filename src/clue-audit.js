import {eventEvidence,same} from './planning-evidence.js';
import {clueKnowledgeTimingNotices} from './clue-knowledge-timing.js';
import {activeRecord} from './current-book-brief.js';
const clueTypes=new Set(['twist','clue','secret']);
export const isClue=e=>clueTypes.has(e.type);
export function clueAudit(data,chapters=[]){
 const all=data.events||[],events=all.filter(activeRecord),byId=new Map(events.map(e=>[e.id,e])),byChapter=new Map(chapters.map(c=>[c.id,c]));
 return {retired:all.length-events.length,rows:events.map(e=>{
 const notices=[];const add=(code,text)=>notices.push({code,text,kind:'Recorded source check',confidence:'Deterministic metadata check'});
 if(isClue(e))for(const notice of clueNotices(data,e,chapters))add(notice.code,notice.reason);
 if(e.sourceId){const c=byChapter.get(e.sourceId);if(!c)add('chapter-missing','Linked chapter is unavailable in this source load.');else if(c.revision!==e.sourceRevision)add('chapter-stale','Saved chapter revision differs from the linked revision.');}
 for(const link of (data.links||[]).filter(activeRecord).filter(l=>l.from===e.id||l.to===e.id))if(!byId.has(link.from)||!byId.has(link.to))add('link:'+link.id,'A recorded connection points to an unavailable event.');
 const status=['accepted','approved'].includes(e.status)?'Approved plan':['proposal','proposed'].includes(e.status)?'Proposal':e.status==='question'?'Open question':e.status==='conflict'?'Conflict':e.status==='written'?'Written source, planning approval not inferred':'Unclassified';
 return {event:e,status,review:clueReviewState(data,e.id,chapters),visible:isClue(e)||e.type==='decision'||e.status==='question',notices};})};
}

// Reviews acknowledge metadata notices; they never approve or rewrite story facts.
export const CLUE_REVIEW_STATES={unchanged:'Reviewed unchanged',proposal:'Proposal needed',deferred:'Deferred',clarification:'Needs clarification'};
export function clueReviewEvidence(data,eventId,chapters=[]){
 const event=(data.events||[]).find(e=>e.id===eventId&&activeRecord(e));
 if(!event)return {missing:true,eventId};
 const links=(data.links||[]).filter(activeRecord).filter(l=>l.from===eventId||l.to===eventId);
 const ids=new Set([eventId,event.setupEventId,event.reinforcementEventId,event.revealEventId,event.replacementEventId,...(event.requiredKnowledge||[]).map(k=>k.factEventId),...(event.knowledgeRecords||[]).flatMap(k=>[k.eventId,k.factEventId]),...links.flatMap(l=>[l.from,l.to])].filter(Boolean));
 const events=[...ids].sort().map(id=>(data.events||[]).find(e=>e.id===id&&activeRecord(e))||{id,missing:true});
 const characters=[...new Set(events.flatMap(e=>[...(e.characterIds||[]),...(e.requiredKnowledge||[]).map(k=>k.characterId),...(e.knowledgeRecords||[]).map(k=>k.characterId).filter(id=>id&&id!=='reader')]))].sort().map(id=>(data.characters||[]).find(c=>c.id===id&&activeRecord(c))||{id,missing:true});
 const sources=[...new Set([...events.map(e=>e.sourceId),event.setupChapterId,event.revealChapterId].filter(Boolean))].sort().map(id=>{const c=chapters.find(c=>c.id===id);return c?{id,revision:c.revision??null,title:c.title??''}:{id,missing:true};});
 return {events:events.map(eventEvidence),links:links.map(eventEvidence).sort((a,b)=>String(a.id).localeCompare(String(b.id))),characters:characters.map(eventEvidence),chapters:sources};
}
export function clueReviewState(data,eventId,chapters=[]){
 const review=(data.workshop?.clueReviews||[]).filter(r=>r.eventId===eventId).at(-1);
 if(!review)return {review:null,stale:false,pending:true,label:'Not reviewed'};
 const stale=!same(review.evidence,clueReviewEvidence(data,eventId,chapters));
 return {review,stale,pending:stale||!['unchanged','deferred'].includes(review.decision),label:stale?'Sources changed; review again':CLUE_REVIEW_STATES[review.decision]||'Not reviewed'};
}
export function reviewClue(data,{eventId,decision,note,expected},context,chapters=[]){
 if(!Object.hasOwn(CLUE_REVIEW_STATES,decision)||!String(note||'').trim())throw Error('Choose a review outcome and record a reason.');
 if(!context.bookId||!context.branchId||!Number.isInteger(context.sourceRevision))throw Error('Review requires a book, path and source revision.');
 const evidence=clueReviewEvidence(data,eventId,chapters);
 if(evidence.missing||!same(expected,evidence))throw Error('Clue sources changed or are unavailable. Reopen the review.');
 if(!clueAudit(data,chapters).rows.find(r=>r.event.id===eventId)?.notices.length)throw Error('No current source notices need review.');
 const out=structuredClone(data);out.workshop={...(out.workshop||{}),clueReviews:[...(out.workshop?.clueReviews||[]),{id:crypto.randomUUID(),eventId,decision,note:String(note).trim(),...context,at:new Date().toISOString(),evidence}]};return out;
}

const auditSource=(data,ref)=>(data[ref.kind]||[]).find(r=>r.id===ref.id&&activeRecord(r));
export function clueNotices(data,event,chapters=[]){
 const issues=[];const add=(code,reason)=>issues.push({code,reason,kind:'Metadata check',confidence:'Deterministic',sourceId:event.id,sourceRevision:event.revision??null});
 if(!event.truth?.trim())add('truth','Underlying truth is not recorded.');
 for(const item of clueKnowledgeTimingNotices(data,event))add(item.code,item.reason);
 if(!event.setup?.trim()&&!event.setupEventId)add('setup','No setup is recorded. This does not prove the story lacks setup.');
 if(!event.revealEventId)add('payoff','No reveal event is linked. An intentional mystery may remain unresolved.');
 for(const key of ['setupEventId','reinforcementEventId','revealEventId'])if(event[key]&&!auditSource(data,{kind:'events',id:event[key]}))add(key,'Linked '+key.replace('EventId','')+' event is unavailable.');
 if(event.replacementEventId&&!auditSource(data,{kind:'events',id:event.replacementEventId}))add('replacementEventId','The recorded replacement event is unavailable. This does not authorize retiring the original.');
 const setup=auditSource(data,{kind:'events',id:event.setupEventId}),reveal=auditSource(data,{kind:'events',id:event.revealEventId});
 if(setup&&reveal&&Number(setup.order)>Number(reveal.order))add('order','Setup follows reveal in reading order. Check whether this is intentional.');
 const byChapter=new Map(chapters.map(c=>[c.id,c]));
 for(const key of ['setupChapterId','revealChapterId'])if(event[key]&&chapters.length&&!byChapter.has(event[key]))add(key,'Planned chapter placement is unavailable in the saved chapter list.');
 const plannedSetup=byChapter.get(event.setupChapterId),plannedReveal=byChapter.get(event.revealChapterId);
 if(plannedSetup&&plannedReveal&&Number.isFinite(Number(plannedSetup.chapter_number))&&Number.isFinite(Number(plannedReveal.chapter_number))&&Number(plannedSetup.chapter_number)>Number(plannedReveal.chapter_number))add('planned-chapter-order','Planned setup follows the reveal in chapter order. This can be intentional; review before changing either.');
  for(const id of event.characterIds||[])if(!auditSource(data,{kind:'characters',id}))add('character:'+id,'Linked character is unavailable.');
 for(const k of event.knowledgeRecords||[]){
  if(k.characterId!=='reader'&&!auditSource(data,{kind:'characters',id:k.characterId}))add('holder:'+k.id,'Knowledge holder is unavailable.');
  if(!auditSource(data,{kind:'events',id:k.eventId}))add('acquisition:'+k.id,'Knowledge acquisition event is unavailable.');
 }
 return issues;
}
