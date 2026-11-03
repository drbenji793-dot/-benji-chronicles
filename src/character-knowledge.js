import {activeRecord} from './current-book-brief.js';
export const KNOWLEDGE_STATES={knows:'Knows',suspects:'Suspects',false_belief:'Believes something false',possesses_unread:'Possesses unread evidence'};
export function saveKnowledge(data,{id,eventId,characterId,factEventId,state,statement,sourceNote},{writer,sourceRevision,at=new Date().toISOString()}){
 if(!Number.isInteger(sourceRevision))throw Error('A current planning revision is required.');
 const event=data.events?.find(e=>e.id===eventId&&activeRecord(e)),fact=data.events?.find(e=>e.id===factEventId&&activeRecord(e));
 if(!event||!fact||!data.characters?.some(c=>c.id===characterId&&activeRecord(c)))throw Error('The event, fact source or character is unavailable.');
 if(!Object.hasOwn(KNOWLEDGE_STATES,state)||!String(statement||'').trim()||!String(sourceNote||'').trim())throw Error('Choose a knowledge state and record the statement and its evidence.');
 if(String(statement).length>4000||String(sourceNote).length>4000)throw Error('Keep the statement and evidence below 4000 characters each.');
 const rows=event.knowledgeRecords||[],old=rows.find(r=>r.id===id);
 if(id&&!old)throw Error('This knowledge record changed. Reopen the current event.');
 if(rows.some(r=>r.id!==id&&r.characterId===characterId&&r.factEventId===factEventId))throw Error('This character already has a record for that fact at this event. Edit it instead.');
 const d=structuredClone(data),target=d.events.find(e=>e.id===eventId);
 const record={...old,id:old?.id||crypto.randomUUID(),eventId,characterId,factEventId,state,statement:String(statement).trim(),sourceNote:String(sourceNote).trim(),status:'proposal',sourceRevision,updatedBy:writer,updatedAt:at,sourceFactRevision:fact.revision??null,sourceFactTruth:fact.truth||'',scope:'Proposed planning knowledge; not evidence of saved chapter prose'};
 target.knowledgeRecords=old?rows.map(r=>r.id===id?record:r):[...rows,record];return d;
}
export function knowledgeRows(data){
 const events=(data.events||[]).filter(activeRecord),chars=(data.characters||[]).filter(activeRecord);
 return events.slice().sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)).map(e=>({id:e.id,title:e.title,order:e.order,date:e.dateLabel||e.date||'',reader:e.readerKnows||'',hidden:e.truth||'',legacy:e.knowledge||'',characters:(e.knowledgeRecords||[]).map(r=>{const c=chars.find(c=>c.id===r.characterId),fact=events.find(f=>f.id===r.factEventId);return {...r,name:c?.name||'Unavailable character',factTitle:fact?.title||'Unavailable fact source',unavailable:!c||!fact,stale:!!fact&&(fact.truth||'')!==r.sourceFactTruth};})}));
}
