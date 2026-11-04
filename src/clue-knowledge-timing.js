import {activeRecord} from './current-book-brief.js';

// Only compares explicitly saved knowledge timing metadata.
// Absence of a record never proves a character has no knowledge.
export function clueKnowledgeTimingNotices(data,event){
 const out=[],events=(data.events||[]).filter(activeRecord);
 const order=Number(event.order);
 for(const knowledge of event.knowledgeRecords||[]){
  if(knowledge.status!=='approved'||knowledge.state!=='knows')continue;
  const at=knowledge.readingOrder??event.order;
  if(at==null||!Number.isFinite(Number(at))||event.order==null||!Number.isFinite(order)){
   out.push({code:'knowledge-order-unknown:'+knowledge.id,reason:'Approved knowledge has no comparable reading order. Verify when it was acquired; this does not prove a contradiction.'});
   continue;
  }
  if(Number(at)>order)out.push({code:'knowledge-after-event:'+knowledge.id,reason:'Approved knowledge acquisition is recorded after its linked event order. Review whether this timing is intentional or the metadata needs correction.'});
 }
 // An explicit knowledge requirement is a review candidate, not an inferred plot fact.
 for(const requirement of event.requiredKnowledge||[]){
  const acquisitions=events.flatMap(e=>(e.knowledgeRecords||[])
   .filter(k=>k.characterId===requirement.characterId&&k.factEventId===requirement.factEventId&&k.status==='approved'&&k.state==='knows')
   .map(k=>({event:e,knowledge:k})));
  if(!acquisitions.length){
   out.push({code:'required-knowledge-not-recorded:'+requirement.characterId+':'+requirement.factEventId,
    reason:'This scene explicitly requires knowledge, but no matching approved acquisition record was found. This is a source gap, not proof of impossible action.'});
   continue;
  }
  const times=acquisitions.map(a=>a.knowledge.readingOrder??a.event.order);
  if(event.order==null||!Number.isFinite(order)||times.some(t=>t==null||!Number.isFinite(Number(t)))){
   out.push({code:'required-knowledge-time-unknown:'+requirement.characterId+':'+requirement.factEventId,
    reason:'A matching approved knowledge source exists, but acquisition and action order cannot be compared. Verify timing separately.'});
  }else if(times.every(t=>Number(t)>order)){
   out.push({code:'required-knowledge-late:'+requirement.characterId+':'+requirement.factEventId,
    reason:'All matching approved knowledge acquisitions are ordered after the action. Review chronology before changing the story.'});
  }
 }
 return out;
}
