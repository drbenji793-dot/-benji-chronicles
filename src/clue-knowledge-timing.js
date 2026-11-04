import {activeRecord} from './current-book-brief.js';

// Only compare explicitly recorded approved knowledge and story reading order.
// Missing evidence means a review question, never an assertion of a plot error.
export function clueKnowledgeTimingNotices(data,event){
 const out=[],events=(data.events||[]).filter(activeRecord);
 const order=event.order==null?null:Number(event.order);
 for(const knowledge of event.knowledgeRecords||[]){
  if(knowledge.status!=='approved'||knowledge.state!=='knows')continue;
  const at=knowledge.readingOrder??event.order;
  if(at==null||!Number.isFinite(Number(at))||order===null||!Number.isFinite(order)){
   out.push({code:'knowledge-order-unknown:'+knowledge.id,reason:'Approved knowledge has no comparable reading order. Verify acquisition timing.'});
  }else if(Number(at)>order){
   out.push({code:'knowledge-after-event:'+knowledge.id,reason:'Approved knowledge acquisition is recorded after the linked event order. Check whether intentional.'});
  }
 }
 for(const requirement of event.requiredKnowledge||[]){
  const acquisitions=events.flatMap(e=>(e.knowledgeRecords||[]).filter(k=>
   k.characterId===requirement.characterId&&k.factEventId===requirement.factEventId&&
   k.status==='approved'&&k.state==='knows').map(k=>({event:e,knowledge:k})));
  const key=requirement.characterId+':'+requirement.factEventId;
  if(!acquisitions.length){
   out.push({code:'required-knowledge-not-recorded:'+key,reason:'This action explicitly requires a fact, but no approved acquisition record was found. This is a source gap, not proof of impossible knowledge.'});
   continue;
  }
  const times=acquisitions.map(a=>a.knowledge.readingOrder??a.event.order);
  if(order===null||!Number.isFinite(order)||times.some(t=>t==null||!Number.isFinite(Number(t)))){
   out.push({code:'required-knowledge-time-unknown:'+key,reason:'Approved acquisition exists but timing is not comparable. Review separately.'});
  }else if(times.every(t=>Number(t)>order)){
   out.push({code:'required-knowledge-late:'+key,reason:'Every approved acquisition is ordered after the action. Check the chronology and intentional mystery before editing.'});
  }
 }
 return out;
}
