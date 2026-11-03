import {activeRecord} from './current-book-brief.js';
export const KNOWLEDGE_STATES={knows:'Knows',suspects:'Suspects',false_belief:'Believes something false',possesses_unread:'Possesses unread evidence'};
const snapshot=(event,fields)=>Object.fromEntries(fields.map(k=>[k,k==='sourceRevision'&&!event?.sourceId?null:event?.[k]??null]));
export function knowledgeSources(data,eventId,factEventId,characterId){
 const event=data.events?.find(e=>e.id===eventId&&activeRecord(e)),fact=data.events?.find(e=>e.id===factEventId&&activeRecord(e)),character=data.characters?.find(c=>c.id===characterId&&activeRecord(c));
 if(!event||!fact||(characterId!=='reader'&&!character))return null;
 return {event:snapshot(event,['id','summary','order','date','year','sourceId','sourceRevision']),fact:snapshot(fact,['id','summary','truth','setup','outcome','sourceId','sourceRevision']),characterId};
}
export const knowledgeCandidate=r=>r.proposedRevision||r;
export function knowledgeSourceState(data,eventId,r){const current=knowledgeSources(data,eventId,r.factEventId,r.characterId);return !current?'Source unavailable':!r.sourceSnapshot?'Source snapshot required':JSON.stringify(current)!==JSON.stringify(r.sourceSnapshot)?'Source changed':'Current source';}
export function saveKnowledge(data,{id,eventId,characterId,factEventId,state,statement,sourceNote},{writer,sourceRevision,bookId,branchId,at=new Date().toISOString()}){
 if(!Number.isInteger(sourceRevision))throw Error('A current planning revision is required.');
 const sourceSnapshot=knowledgeSources(data,eventId,factEventId,characterId);
 if(!sourceSnapshot)throw Error('The event, fact source or character is unavailable.');
 if(!Object.hasOwn(KNOWLEDGE_STATES,state)||!String(statement||'').trim()||!String(sourceNote||'').trim())throw Error('Choose a knowledge state and record the statement and its evidence.');
 if(String(statement).length>4000||String(sourceNote).length>4000)throw Error('Keep the statement and evidence below 4000 characters each.');
 const event=data.events.find(e=>e.id===eventId),fact=data.events.find(e=>e.id===factEventId),rows=event.knowledgeRecords||[],old=rows.find(r=>r.id===id);
 if(id&&!old)throw Error('This knowledge record changed. Reopen the current event.');
 if(rows.some(r=>r.id!==id&&[r,knowledgeCandidate(r)].some(v=>v.characterId===characterId&&v.factEventId===factEventId)))throw Error('This character already has a record for that fact at this event. Edit it instead.');
 const d=structuredClone(data),target=d.events.find(e=>e.id===eventId);
 const record={...Object.fromEntries(['readingOrder','storyTime','certainty'].filter(k=>knowledgeCandidate(old||{})[k]!==undefined).map(k=>[k,knowledgeCandidate(old||{})[k]])),id:old?.id||crypto.randomUUID(),eventId,characterId,factEventId,state,statement:String(statement).trim(),sourceNote:String(sourceNote).trim(),status:'proposal',bookId:bookId||null,branchId:branchId||null,sourceRevision,updatedBy:writer,updatedAt:at,sourceSnapshot,sourceFactRevision:fact.revision??null,sourceFactTruth:fact.truth||'',scope:'Proposed planning knowledge; not evidence of saved chapter prose'};
 const next=old?.status==='approved'?{...old,proposedRevision:record}:{...old,...record};
 target.knowledgeRecords=old?rows.map(r=>r.id===id?next:r):[...rows,next];return d;
}
export function reviewKnowledge(data,{eventId,id,decision,note,expected},{bookId,branchId,sourceRevision,writer,at=new Date().toISOString()}){
 const old=data.events?.find(e=>e.id===eventId&&activeRecord(e))?.knowledgeRecords?.find(r=>r.id===id);
 if(!old||JSON.stringify(old)!==JSON.stringify(expected))throw Error('Knowledge proposal changed. Reopen its review.');
 if(!Number.isInteger(sourceRevision)||!String(note||'').trim()||String(note).length>4000)throw Error('Record your review reason and use a current revision.');
 if(!['approved','deferred','rejected'].includes(decision))throw Error('Unknown review decision.');
 const candidate=knowledgeCandidate(old);
 if(candidate.status==='approved'||candidate.status==='rejected')throw Error('Create a new proposal before reviewing this record again.');
 if(candidate.bookId!==bookId||candidate.branchId!==branchId)throw Error('Proposal belongs to another book or path. Refresh it through Edit proposal.');
 if(decision==='approved'&&knowledgeSourceState(data,eventId,candidate)!=='Current source')throw Error('Source changed or unavailable. Refresh the proposal and review it again.');
 const d=structuredClone(data),event=d.events.find(e=>e.id===eventId),review={decision,note:String(note).trim(),sourceRevision,writer,at,sourceSnapshot:candidate.sourceSnapshot,scope:'Planning knowledge only; no chapter approval'};
 let next;
 if(old.proposedRevision&&decision!=='approved'){next={...old,reviewHistory:[...(old.reviewHistory||[]),review]};if(decision==='rejected')delete next.proposedRevision;else next.proposedRevision={...candidate,status:'deferred',review};}
 else {next={...candidate,status:decision,review,reviewHistory:[...(old.reviewHistory||[]),review],...(old.status==='approved'?{previousApproved:[...(old.previousApproved||[]),{...old,proposedRevision:undefined}]}:{})};}
 event.knowledgeRecords=event.knowledgeRecords.map(r=>r.id===id?next:r);return d;
}
export function knowledgeRows(data,{characterId='',eventId='',chapterId='',status='',readingOrder=''}={}){
 const events=(data.events||[]).filter(activeRecord),chars=(data.characters||[]).filter(activeRecord);
 return events.filter(e=>(!eventId||e.id===eventId)&&(!chapterId||e.sourceId===chapterId)).slice().sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)).map(e=>({id:e.id,title:e.title,order:e.order,date:e.dateLabel||e.date||'',chapterId:e.sourceId,reader:e.readerKnows||'',hidden:e.truth||'',legacy:e.knowledge||'',characters:(e.knowledgeRecords||[]).filter(r=>(readingOrder===''||((r.readingOrder??e.order)!=null&&Number(r.readingOrder??e.order)<=Number(readingOrder)))&&(!characterId||r.characterId===characterId||r.proposedRevision?.characterId===characterId)&&(!status||r.status===status||r.proposedRevision?.status===status)).map(r=>{const c=chars.find(c=>c.id===r.characterId),fact=events.find(f=>f.id===r.factEventId),sourceState=knowledgeSourceState(data,e.id,r);return {...r,name:r.characterId==='reader'?'Reader':c?.name||'Unavailable character',factTitle:fact?.title||'Unavailable fact source',unavailable:(r.characterId!=='reader'&&!c)||!fact,stale:sourceState!=='Current source',sourceState};})})).filter(e=>!characterId&&!status&&readingOrder===''||e.characters.length);
}
